/**
 * Google Ads Integration
 * 
 * Pulls campaign performance data from Google Ads API.
 * 
 * SETUP REQUIRED:
 * 1. Go to https://console.cloud.google.com
 * 2. Enable Google Ads API
 * 3. Create OAuth2 credentials (Web Application type)
 * 4. Set redirect URI to: https://your-domain.com/api/google-ads/callback
 * 5. Apply for a Google Ads API Developer Token at:
 *    https://developers.google.com/google-ads/api/docs/get-started/dev-token
 * 
 * ENV VARS NEEDED:
 *   GOOGLE_ADS_CLIENT_ID=your_client_id
 *   GOOGLE_ADS_CLIENT_SECRET=your_client_secret
 *   GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
 *   GOOGLE_ADS_REDIRECT_URI=https://your-domain.com/api/google-ads/callback
 */

import type { Express, Request, Response } from "express";

interface GoogleAdsTokens {
  [practiceId: string]: {
    accessToken: string;
    refreshToken: string;
    customerId: string; // Google Ads customer/account ID
    expiresAt: number;
  };
}

const gaTokens: GoogleAdsTokens = {};

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ADS_API = "https://googleads.googleapis.com/v17";

export function registerGoogleAdsRoutes(app: Express) {
  // OAuth flow
  app.get("/api/google-ads/connect/:practiceId", (req: Request, res: Response) => {
    const { practiceId } = req.params;
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_ADS_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return res.status(500).json({ error: "Google Ads not configured" });
    }

    const authUrl = `${GOOGLE_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/adwords&access_type=offline&prompt=consent&state=${practiceId}`;
    res.json({ authUrl });
  });

  // OAuth callback
  app.get("/api/google-ads/callback", async (req: Request, res: Response) => {
    const { code, state: practiceId } = req.query;

    try {
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
          client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
          redirect_uri: process.env.GOOGLE_ADS_REDIRECT_URI!,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenRes.json() as any;

      // Get the customer ID (first accessible account)
      const customerId = await getFirstCustomerId(tokens.access_token);

      gaTokens[practiceId as string] = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        customerId,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      };

      res.redirect("/#/settings?gads=connected");
    } catch (error) {
      console.error("Google Ads OAuth error:", error);
      res.redirect("/#/settings?gads=error");
    }
  });

  // Get campaign performance for last 7 days
  app.get("/api/google-ads/:practiceId/performance", async (req: Request, res: Response) => {
    try {
      const { practiceId } = req.params;
      const tokenData = gaTokens[practiceId];
      if (!tokenData) return res.status(400).json({ error: "Google Ads not connected" });

      const accessToken = await refreshIfNeeded(practiceId);

      // GAQL query for last 7 days campaign metrics
      const query = `
        SELECT
          campaign.name,
          metrics.clicks,
          metrics.impressions,
          metrics.cost_micros,
          metrics.conversions,
          metrics.cost_per_conversion
        FROM campaign
        WHERE segments.date DURING LAST_7_DAYS
        AND campaign.status = 'ENABLED'
        ORDER BY metrics.cost_micros DESC
      `;

      const searchRes = await fetch(
        `${GOOGLE_ADS_API}/customers/${tokenData.customerId}/googleAds:searchStream`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        }
      );

      const data = await searchRes.json() as any;

      // Parse into our format
      let totalSpend = 0;
      let totalClicks = 0;
      let totalConversions = 0;

      const campaigns = (data[0]?.results || []).map((r: any) => {
        const spend = (r.metrics.costMicros || 0) / 1_000_000;
        totalSpend += spend;
        totalClicks += r.metrics.clicks || 0;
        totalConversions += r.metrics.conversions || 0;

        return {
          name: r.campaign.name,
          clicks: r.metrics.clicks || 0,
          impressions: r.metrics.impressions || 0,
          spend: spend,
          conversions: r.metrics.conversions || 0,
          costPerConversion: r.metrics.costPerConversion || 0,
        };
      });

      res.json({
        totalSpend,
        totalClicks,
        totalConversions,
        campaigns,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Connection status
  app.get("/api/google-ads/:practiceId/status", (req: Request, res: Response) => {
    const connected = !!gaTokens[req.params.practiceId];
    res.json({ connected });
  });
}

async function refreshIfNeeded(practiceId: string): Promise<string> {
  const tokenData = gaTokens[practiceId];
  if (Date.now() < tokenData.expiresAt - 60000) return tokenData.accessToken;

  const refreshRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: tokenData.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await refreshRes.json() as any;
  tokenData.accessToken = tokens.access_token;
  tokenData.expiresAt = Date.now() + tokens.expires_in * 1000;
  return tokens.access_token;
}

async function getFirstCustomerId(accessToken: string): Promise<string> {
  const res = await fetch(`${GOOGLE_ADS_API}/customers:listAccessibleCustomers`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    },
  });
  const data = await res.json() as any;
  // Returns "customers/1234567890" format, extract the number
  const firstCustomer = data.resourceNames?.[0] || "";
  return firstCustomer.replace("customers/", "");
}
