/**
 * Facebook/Meta Ads Integration
 * 
 * Pulls campaign performance data from Meta Marketing API.
 * 
 * SETUP REQUIRED:
 * 1. Go to https://developers.facebook.com
 * 2. Create an app (Business type)
 * 3. Add "Marketing API" product
 * 4. Set redirect URI to: https://your-domain.com/api/facebook-ads/callback
 * 
 * ENV VARS NEEDED:
 *   FB_APP_ID=your_app_id
 *   FB_APP_SECRET=your_app_secret
 *   FB_REDIRECT_URI=https://your-domain.com/api/facebook-ads/callback
 */

import type { Express, Request, Response } from "express";

interface FBTokens {
  [practiceId: string]: {
    accessToken: string;
    adAccountId: string;
    expiresAt: number;
  };
}

const fbTokens: FBTokens = {};
const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";

export function registerFacebookAdsRoutes(app: Express) {
  // OAuth flow
  app.get("/api/facebook-ads/connect/:practiceId", (req: Request, res: Response) => {
    const { practiceId } = req.params;
    const appId = process.env.FB_APP_ID;
    const redirectUri = process.env.FB_REDIRECT_URI;

    if (!appId || !redirectUri) {
      return res.status(500).json({ error: "Facebook Ads not configured" });
    }

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=ads_read,ads_management&state=${practiceId}`;
    res.json({ authUrl });
  });

  // OAuth callback
  app.get("/api/facebook-ads/callback", async (req: Request, res: Response) => {
    const { code, state: practiceId } = req.query;

    try {
      // Exchange code for access token
      const tokenRes = await fetch(
        `${FB_GRAPH_URL}/oauth/access_token?client_id=${process.env.FB_APP_ID}&client_secret=${process.env.FB_APP_SECRET}&code=${code}&redirect_uri=${process.env.FB_REDIRECT_URI}`
      );
      const tokenData = await tokenRes.json() as any;

      // Exchange for long-lived token (60 days)
      const longTokenRes = await fetch(
        `${FB_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FB_APP_ID}&client_secret=${process.env.FB_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
      );
      const longToken = await longTokenRes.json() as any;

      // Get ad accounts
      const accountsRes = await fetch(
        `${FB_GRAPH_URL}/me/adaccounts?fields=id,name,account_status&access_token=${longToken.access_token}`
      );
      const accounts = await accountsRes.json() as any;
      const firstAccount = accounts.data?.[0];

      if (!firstAccount) {
        return res.redirect("/#/settings?fb=no_account");
      }

      fbTokens[practiceId as string] = {
        accessToken: longToken.access_token,
        adAccountId: firstAccount.id, // "act_XXXXXXX" format
        expiresAt: Date.now() + (longToken.expires_in || 5184000) * 1000,
      };

      res.redirect("/#/settings?fb=connected");
    } catch (error) {
      console.error("Facebook OAuth error:", error);
      res.redirect("/#/settings?fb=error");
    }
  });

  // Get campaign performance (last 7 days)
  app.get("/api/facebook-ads/:practiceId/performance", async (req: Request, res: Response) => {
    try {
      const { practiceId } = req.params;
      const tokenData = fbTokens[practiceId];
      if (!tokenData) return res.status(400).json({ error: "Facebook Ads not connected" });

      // Get campaign insights
      const insightsRes = await fetch(
        `${FB_GRAPH_URL}/${tokenData.adAccountId}/insights?` +
        `fields=campaign_name,spend,clicks,impressions,actions,cost_per_action_type` +
        `&date_preset=last_7d` +
        `&level=campaign` +
        `&access_token=${tokenData.accessToken}`
      );

      const insightsData = await insightsRes.json() as any;

      let totalSpend = 0;
      let totalClicks = 0;
      let totalConversions = 0;

      const campaigns = (insightsData.data || []).map((campaign: any) => {
        const spend = parseFloat(campaign.spend || "0");
        const clicks = parseInt(campaign.clicks || "0");
        // Look for lead or purchase actions
        const actions = campaign.actions || [];
        const leads = actions.find((a: any) => a.action_type === "lead")?.value || 0;
        const purchases = actions.find((a: any) => a.action_type === "purchase")?.value || 0;
        const conversions = parseInt(leads) + parseInt(purchases);

        totalSpend += spend;
        totalClicks += clicks;
        totalConversions += conversions;

        return {
          name: campaign.campaign_name,
          spend,
          clicks,
          impressions: parseInt(campaign.impressions || "0"),
          conversions,
          costPerConversion: conversions > 0 ? spend / conversions : 0,
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
  app.get("/api/facebook-ads/:practiceId/status", (req: Request, res: Response) => {
    const connected = !!fbTokens[req.params.practiceId];
    res.json({ connected });
  });
}
