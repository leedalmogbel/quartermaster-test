/**
 * QuickBooks Online Integration
 * 
 * Handles OAuth2 flow and data retrieval from QuickBooks Online.
 * 
 * SETUP REQUIRED:
 * 1. Go to https://developer.intuit.com
 * 2. Create an app (Production mode)
 * 3. Set redirect URI to: https://your-domain.com/api/quickbooks/callback
 * 4. Copy Client ID and Client Secret to your .env file
 * 
 * ENV VARS NEEDED:
 *   QB_CLIENT_ID=your_client_id
 *   QB_CLIENT_SECRET=your_client_secret  
 *   QB_REDIRECT_URI=https://your-domain.com/api/quickbooks/callback
 *   QB_ENVIRONMENT=production  (or "sandbox" for testing)
 */

import type { Express, Request, Response } from "express";

// QuickBooks OAuth token storage (in production, store in DB)
interface QBTokens {
  [practiceId: string]: {
    accessToken: string;
    refreshToken: string;
    realmId: string;
    expiresAt: number;
  };
}

const qbTokens: QBTokens = {};

const QB_BASE_URL = process.env.QB_ENVIRONMENT === "sandbox"
  ? "https://sandbox-quickbooks.api.intuit.com"
  : "https://quickbooks.api.intuit.com";

const QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

export function registerQuickBooksRoutes(app: Express) {
  // Step 1: Start OAuth flow — redirect user to QuickBooks
  app.get("/api/quickbooks/connect/:practiceId", (req: Request, res: Response) => {
    const { practiceId } = req.params;
    const clientId = process.env.QB_CLIENT_ID;
    const redirectUri = process.env.QB_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return res.status(500).json({ error: "QuickBooks not configured. Set QB_CLIENT_ID and QB_REDIRECT_URI." });
    }

    const authUrl = `${QB_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=com.intuit.quickbooks.accounting&state=${practiceId}`;
    res.json({ authUrl });
  });

  // Step 2: OAuth callback — exchange code for tokens
  app.get("/api/quickbooks/callback", async (req: Request, res: Response) => {
    const { code, state: practiceId, realmId } = req.query;
    const clientId = process.env.QB_CLIENT_ID!;
    const clientSecret = process.env.QB_CLIENT_SECRET!;
    const redirectUri = process.env.QB_REDIRECT_URI!;

    try {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const tokenRes = await fetch(QB_TOKEN_URL, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: redirectUri,
        }),
      });

      const tokens = await tokenRes.json() as any;

      qbTokens[practiceId as string] = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        realmId: realmId as string,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      };

      // Redirect back to the app
      res.redirect("/#/settings?qb=connected");
    } catch (error) {
      console.error("QuickBooks OAuth error:", error);
      res.redirect("/#/settings?qb=error");
    }
  });

  // Step 3: Refresh token if expired
  async function refreshTokenIfNeeded(practiceId: string): Promise<string> {
    const tokenData = qbTokens[practiceId];
    if (!tokenData) throw new Error("QuickBooks not connected for this practice");

    if (Date.now() < tokenData.expiresAt - 60000) {
      return tokenData.accessToken; // Still valid
    }

    const clientId = process.env.QB_CLIENT_ID!;
    const clientSecret = process.env.QB_CLIENT_SECRET!;
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const refreshRes = await fetch(QB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokenData.refreshToken,
      }),
    });

    const newTokens = await refreshRes.json() as any;
    tokenData.accessToken = newTokens.access_token;
    tokenData.refreshToken = newTokens.refresh_token;
    tokenData.expiresAt = Date.now() + newTokens.expires_in * 1000;

    return tokenData.accessToken;
  }

  // Helper: Make authenticated QB API call
  async function qbApiCall(practiceId: string, endpoint: string): Promise<any> {
    const accessToken = await refreshTokenIfNeeded(practiceId);
    const { realmId } = qbTokens[practiceId];

    const res = await fetch(`${QB_BASE_URL}/v3/company/${realmId}/${endpoint}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
      },
    });

    if (!res.ok) throw new Error(`QB API error: ${res.status} ${await res.text()}`);
    return res.json();
  }

  // Pull Profit & Loss report
  app.get("/api/quickbooks/:practiceId/pnl", async (req: Request, res: Response) => {
    try {
      const { practiceId } = req.params;
      const startDate = req.query.start || getWeekStart();
      const endDate = req.query.end || getWeekEnd();

      const report = await qbApiCall(
        practiceId,
        `reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}&minorversion=65`
      );

      // Parse QB report into our weekly report format
      const parsed = parseQBProfitAndLoss(report);
      res.json(parsed);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Pull Accounts Receivable aging
  app.get("/api/quickbooks/:practiceId/ar-aging", async (req: Request, res: Response) => {
    try {
      const { practiceId } = req.params;
      const report = await qbApiCall(
        practiceId,
        `reports/AgedReceivableDetail?minorversion=65`
      );
      const parsed = parseARAging(report);
      res.json(parsed);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Pull balance sheet (cash position)
  app.get("/api/quickbooks/:practiceId/balance-sheet", async (req: Request, res: Response) => {
    try {
      const { practiceId } = req.params;
      const report = await qbApiCall(
        practiceId,
        `reports/BalanceSheet?minorversion=65`
      );
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Connection status check
  app.get("/api/quickbooks/:practiceId/status", (req: Request, res: Response) => {
    const { practiceId } = req.params;
    const connected = !!qbTokens[practiceId];
    res.json({ connected, realmId: connected ? qbTokens[practiceId].realmId : null });
  });
}

// ---- HELPER FUNCTIONS ----

function getWeekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // Sunday
  return d.toISOString().split("T")[0];
}

function getWeekEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() + (6 - d.getDay())); // Saturday
  return d.toISOString().split("T")[0];
}

function parseQBProfitAndLoss(report: any) {
  // QuickBooks P&L report structure: report.Rows.Row[]
  // Each row has ColData[0] = label, ColData[1] = value
  const rows = report?.QueryResponse?.Rows?.Row || report?.Rows?.Row || [];

  let revenue = 0;
  let totalExpenses = 0;
  let netIncome = 0;

  for (const row of rows) {
    const label = row?.ColData?.[0]?.value || row?.Summary?.ColData?.[0]?.value || "";
    const value = parseFloat(row?.ColData?.[1]?.value || row?.Summary?.ColData?.[1]?.value || "0");

    if (label.toLowerCase().includes("total income")) revenue = value;
    if (label.toLowerCase().includes("total expenses")) totalExpenses = value;
    if (label.toLowerCase().includes("net income") || label.toLowerCase().includes("net operating income")) netIncome = value;
  }

  return {
    revenue,
    totalExpenses,
    netIncome,
    overheadPct: revenue > 0 ? (totalExpenses / revenue) * 100 : 0,
    netMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0,
  };
}

function parseARAging(report: any) {
  const rows = report?.QueryResponse?.Rows?.Row || report?.Rows?.Row || [];
  let arCurrent = 0;
  let ar60Plus = 0;

  for (const row of rows) {
    const label = row?.ColData?.[0]?.value || "";
    const value = parseFloat(row?.ColData?.[1]?.value || "0");

    if (label.includes("Current") || label.includes("1-30")) {
      arCurrent += value;
    } else if (label.includes("61-90") || label.includes("91+") || label.includes(">90")) {
      ar60Plus += value;
    }
  }

  return { arCurrent, ar60Plus };
}
