/**
 * Claude AI CFO Script Generator
 * 
 * Uses Claude to generate weekly CFO advisory scripts based on financial data.
 * 
 * SETUP REQUIRED:
 * 1. Go to https://console.anthropic.com
 * 2. Create an API key
 * 3. Add to .env: ANTHROPIC_API_KEY=sk-ant-...
 * 
 * Cost: ~$0.10-0.25 per script generation (Claude 3.5 Sonnet)
 */

import type { Express, Request, Response } from "express";
import { storage } from "../storage";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface FinancialSnapshot {
  practiceName: string;
  weekEnding: string;
  revenue: number;
  totalExpenses: number;
  netIncome: number;
  collectionRate: number;
  overheadPct: number;
  netMargin: number;
  arCurrent: number;
  ar60Plus: number;
  cashPosition: number;
  capacityPct: number;
  revenuePerVisit: number;
  staffCostPct: number;
  googleRoas?: number;
  fbRoas?: number;
  googleSpend?: number;
  fbSpend?: number;
  googlePatients?: number;
  fbPatients?: number;
  priorWeekRevenue?: number;
  priorWeekCollectionRate?: number;
  priorWeekNetMargin?: number;
}

function buildCFOPrompt(data: FinancialSnapshot): string {
  return `You are a fractional CFO advisor for chiropractic practices. Generate a detailed 6-step weekly CFO advisory call script based on the following financial data.

PRACTICE: ${data.practiceName}
WEEK ENDING: ${data.weekEnding}

FINANCIAL DATA:
- Weekly Revenue: $${data.revenue.toLocaleString()}${data.priorWeekRevenue ? ` (prior week: $${data.priorWeekRevenue.toLocaleString()})` : ""}
- Total Expenses: $${data.totalExpenses.toLocaleString()}
- Net Income: $${data.netIncome.toLocaleString()}
- Collection Rate: ${data.collectionRate.toFixed(1)}%${data.priorWeekCollectionRate ? ` (prior: ${data.priorWeekCollectionRate.toFixed(1)}%)` : ""}
- Overhead %: ${data.overheadPct.toFixed(1)}%
- Net Margin: ${data.netMargin.toFixed(1)}%${data.priorWeekNetMargin ? ` (prior: ${data.priorWeekNetMargin.toFixed(1)}%)` : ""}
- AR Current: $${data.arCurrent.toLocaleString()}
- AR 60+ Days: $${data.ar60Plus.toLocaleString()}
- Cash Position: $${data.cashPosition.toLocaleString()}
- Capacity Utilization: ${data.capacityPct.toFixed(1)}%
- Revenue Per Visit: $${data.revenuePerVisit.toFixed(0)}
- Staff Cost %: ${data.staffCostPct.toFixed(1)}%

MARKETING DATA:
- Google Ads ROAS: ${data.googleRoas?.toFixed(2) || "N/A"}x (Spend: $${data.googleSpend?.toLocaleString() || "0"}, New Patients: ${data.googlePatients || 0})
- Facebook ROAS: ${data.fbRoas?.toFixed(2) || "N/A"}x (Spend: $${data.fbSpend?.toLocaleString() || "0"}, New Patients: ${data.fbPatients || 0})

CHIROPRACTIC BENCHMARKS:
- Collection Rate target: 95%+
- Overhead target: 45-55% of revenue
- Net Margin target: 40-60%
- ROAS target: 3.0x+
- Revenue Per Visit: $165-220
- Capacity target: 80-90%
- Staff Cost: 30-35% of collections
- AR 60+ Days: <5% of total AR

RESPOND IN THIS EXACT JSON FORMAT (no markdown, no code fences, just raw JSON):
{
  "step1": {
    "title": "Practice Snapshot & Wins",
    "duration": "5 min",
    "advisorNote": "Brief advisor-to-advisor note about the week's highlights and what to lead with",
    "talkingPoints": ["Point 1 with specific numbers", "Point 2", "Point 3", "Point 4"],
    "questions": ["Question to ask the client", "Question 2"]
  },
  "step2": {
    "title": "Perfect P&L Deep Dive",
    "duration": "10 min",
    "advisorNote": "Note about P&L findings",
    "talkingPoints": ["Point 1", "Point 2", "Point 3", "Point 4"],
    "questions": ["Question 1", "Question 2"]
  },
  "step3": {
    "title": "Marketing Attribution Review",
    "duration": "8 min",
    "advisorNote": "Note about marketing performance",
    "talkingPoints": ["Point 1", "Point 2", "Point 3", "Point 4"],
    "questions": ["Question 1", "Question 2"]
  },
  "step4": {
    "title": "Forecasting & Scenario Planning",
    "duration": "7 min",
    "advisorNote": "Note about projections",
    "talkingPoints": ["Point 1", "Point 2", "Point 3"],
    "questions": ["Question 1", "Question 2"]
  },
  "step5": {
    "title": "Action Items & Priorities",
    "duration": "8 min",
    "advisorNote": "Note about top priorities",
    "talkingPoints": ["Priority 1 with specifics", "Priority 2", "Priority 3"],
    "questions": ["Question 1", "Question 2"]
  },
  "step6": {
    "title": "Wrap-Up & Next Steps",
    "duration": "2 min",
    "advisorNote": "Closing summary",
    "talkingPoints": ["Summary point 1", "Key risk", "Next meeting topic"],
    "questions": ["Question 1"]
  }
}

IMPORTANT RULES:
- Use specific dollar amounts and percentages from the data
- Compare to benchmarks and flag any metrics outside healthy ranges
- Be actionable — don't just report numbers, tell the advisor what to DO about them
- Each talking point should be a complete sentence
- Advisor notes should be written advisor-to-advisor (not to the client)
- If marketing data shows declining ROAS, recommend specific optimizations
- If AR 60+ is growing, recommend specific recovery actions`;
}

export function registerClaudeCFORoutes(app: Express) {
  // Generate a new CFO script
  app.post("/api/practices/:id/scripts/generate", async (req: Request, res: Response) => {
    const practiceId = parseInt(req.params.id);
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ 
        error: "Claude API not configured. Set ANTHROPIC_API_KEY in your .env file.",
        setup: "Get your API key at https://console.anthropic.com"
      });
    }

    try {
      // Get practice info
      const practice = storage.getPractice(practiceId);
      if (!practice) return res.status(404).json({ error: "Practice not found" });

      // Get latest financial data
      const latestReport = storage.getLatestWeeklyReport(practiceId);
      if (!latestReport) return res.status(400).json({ error: "No financial data available" });

      // Get all reports to find prior week
      const allReports = storage.getWeeklyReports(practiceId);
      const priorReport = allReports.length > 1 ? allReports[1] : undefined;

      // Get latest marketing data
      const latestMarketing = storage.getLatestMarketingData(practiceId);

      // Build the data snapshot
      const snapshot: FinancialSnapshot = {
        practiceName: practice.name,
        weekEnding: latestReport.weekEnding,
        revenue: latestReport.revenue,
        totalExpenses: latestReport.totalExpenses,
        netIncome: latestReport.netIncome,
        collectionRate: latestReport.collectionRate,
        overheadPct: latestReport.overheadPct,
        netMargin: latestReport.netMargin,
        arCurrent: latestReport.arCurrent || 0,
        ar60Plus: latestReport.ar60Plus || 0,
        cashPosition: latestReport.cashPosition || 0,
        capacityPct: latestReport.capacityPct || 0,
        revenuePerVisit: latestReport.revenuePerVisit || 0,
        staffCostPct: latestReport.staffCostPct || 0,
        googleRoas: latestMarketing?.googleRoas || undefined,
        fbRoas: latestMarketing?.fbRoas || undefined,
        googleSpend: latestMarketing?.googleSpend || undefined,
        fbSpend: latestMarketing?.fbSpend || undefined,
        googlePatients: latestMarketing?.googlePatients || undefined,
        fbPatients: latestMarketing?.fbPatients || undefined,
        priorWeekRevenue: priorReport?.revenue,
        priorWeekCollectionRate: priorReport?.collectionRate,
        priorWeekNetMargin: priorReport?.netMargin,
      };

      // Call Claude API
      const claudeRes = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [{
            role: "user",
            content: buildCFOPrompt(snapshot),
          }],
        }),
      });

      if (!claudeRes.ok) {
        const errBody = await claudeRes.text();
        throw new Error(`Claude API error ${claudeRes.status}: ${errBody}`);
      }

      const claudeData = await claudeRes.json() as any;
      const scriptText = claudeData.content[0].text;

      // Parse the JSON response
      let scriptJson: any;
      try {
        scriptJson = JSON.parse(scriptText);
      } catch {
        // If Claude wrapped it in markdown, extract the JSON
        const jsonMatch = scriptText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          scriptJson = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Failed to parse Claude response as JSON");
        }
      }

      // Save to database
      const savedScript = storage.createCfoScript({
        practiceId,
        weekEnding: latestReport.weekEnding,
        scriptFull: scriptText,
        step1: JSON.stringify(scriptJson.step1),
        step2: JSON.stringify(scriptJson.step2),
        step3: JSON.stringify(scriptJson.step3),
        step4: JSON.stringify(scriptJson.step4),
        step5: JSON.stringify(scriptJson.step5),
        step6: JSON.stringify(scriptJson.step6),
        generatedAt: new Date().toISOString(),
      });

      res.json(savedScript);
    } catch (error: any) {
      console.error("CFO script generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });
}
