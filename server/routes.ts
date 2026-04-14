import type { Express, Request } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { registerQuickBooksRoutes } from "./integrations/quickbooks";
import { registerClaudeCFORoutes } from "./integrations/claude-cfo";
import { registerGoogleAdsRoutes } from "./integrations/google-ads";
import { registerFacebookAdsRoutes } from "./integrations/facebook-ads";
import { registerAuthRoutes } from "./integrations/auth";

function auditLog(req: Request, action: string, resource: string, resourceId: string | null, details?: string) {
  try {
    storage.createAuditLog({
      userId: req.user?.id ?? null,
      action,
      resource,
      resourceId,
      details: details || null,
      ipAddress: req.ip || null,
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

export async function registerRoutes(server: Server, app: Express) {
  // Seed demo data on startup
  seedDatabase();

  // Register all integration routes
  registerQuickBooksRoutes(app);
  registerClaudeCFORoutes(app);
  registerGoogleAdsRoutes(app);
  registerFacebookAdsRoutes(app);
  const { authMiddleware, adminMiddleware } = registerAuthRoutes(app);

  // ===== CORE DATA API =====

  // Get all practices (admin)
  app.get("/api/practices", (_req, res) => {
    const practices = storage.getAllPractices();
    res.json(practices);
  });

  // Get single practice
  app.get("/api/practices/:id", (req, res) => {
    const practice = storage.getPractice(parseInt(req.params.id));
    if (!practice) return res.status(404).json({ error: "Practice not found" });
    res.json(practice);
  });

  // Get weekly reports for a practice
  app.get("/api/practices/:id/reports", (req, res) => {
    const reports = storage.getWeeklyReports(parseInt(req.params.id));
    res.json(reports);
  });

  // Get latest weekly report
  app.get("/api/practices/:id/reports/latest", (req, res) => {
    const report = storage.getLatestWeeklyReport(parseInt(req.params.id));
    if (!report) return res.status(404).json({ error: "No reports found" });
    res.json(report);
  });

  // Get marketing data
  app.get("/api/practices/:id/marketing", (req, res) => {
    const data = storage.getMarketingData(parseInt(req.params.id));
    res.json(data);
  });

  // Get latest marketing data
  app.get("/api/practices/:id/marketing/latest", (req, res) => {
    const data = storage.getLatestMarketingData(parseInt(req.params.id));
    if (!data) return res.status(404).json({ error: "No marketing data found" });
    res.json(data);
  });

  // Get CFO scripts
  app.get("/api/practices/:id/scripts", (req, res) => {
    const scripts = storage.getCfoScripts(parseInt(req.params.id));
    res.json(scripts);
  });

  // Get latest CFO script
  app.get("/api/practices/:id/scripts/latest", (req, res) => {
    const script = storage.getLatestCfoScript(parseInt(req.params.id));
    if (!script) return res.status(404).json({ error: "No scripts found" });
    res.json(script);
  });

  // Get forecast
  app.get("/api/practices/:id/forecast", (req, res) => {
    const forecast = storage.getLatestForecast(parseInt(req.params.id));
    if (!forecast) return res.status(404).json({ error: "No forecast found" });
    res.json(forecast);
  });

  // Get action items
  app.get("/api/practices/:id/actions", (req, res) => {
    const items = storage.getActionItems(parseInt(req.params.id));
    res.json(items);
  });

  // Update action item status
  app.patch("/api/actions/:id", (req, res) => {
    const { status } = req.body;
    const item = storage.updateActionItemStatus(parseInt(req.params.id), status);
    if (!item) return res.status(404).json({ error: "Action item not found" });
    auditLog(req, "ACTION_ITEM_UPDATED", "action_items", String(item.id), JSON.stringify({ status }));
    res.json(item);
  });

  // Get benchmarks
  app.get("/api/benchmarks", (_req, res) => {
    const benchmarks = storage.getAllBenchmarks();
    res.json(benchmarks);
  });

  // R&D Activities
  app.get("/api/practices/:id/rd/:year", (req, res) => {
    const practiceId = parseInt(req.params.id);
    const taxYear = parseInt(req.params.year);
    const rd = storage.getRdActivity(practiceId, taxYear);
    if (!rd) return res.status(404).json({ error: "No R&D data found" });
    res.json(rd);
  });

  app.post("/api/practices/:id/rd", (req, res) => {
    const practiceId = parseInt(req.params.id);
    const data = { ...req.body, practiceId };
    const rd = storage.upsertRdActivity(data);
    auditLog(req, "RD_ACTIVITY_SAVED", "rd_activities", String(rd.id));
    res.json(rd);
  });

  // Tax Planning
  app.get("/api/practices/:id/tax-planning/:year", (req, res) => {
    const practiceId = parseInt(req.params.id);
    const taxYear = parseInt(req.params.year);
    const tp = storage.getTaxPlanning(practiceId, taxYear);
    if (!tp) return res.status(404).json({ error: "No tax planning data found" });
    res.json(tp);
  });

  app.post("/api/practices/:id/tax-planning", (req, res) => {
    const practiceId = parseInt(req.params.id);
    const data = { ...req.body, practiceId };
    const tp = storage.upsertTaxPlanning(data);
    auditLog(req, "TAX_PLANNING_SAVED", "tax_planning", String(tp.id));
    res.json(tp);
  });

  // Admin audit logs
  app.get("/api/admin/audit-logs", authMiddleware, adminMiddleware, (req, res) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = storage.getAuditLogs(limit);
    res.json(logs);
  });

  // Admin dashboard summary
  app.get("/api/admin/summary", (_req, res) => {
    const practices = storage.getAllPractices();
    const summaries = practices.map(p => {
      const report = storage.getLatestWeeklyReport(p.id);
      const marketing = storage.getLatestMarketingData(p.id);
      const actions = storage.getActionItems(p.id);
      const openActions = actions.filter(a => a.status === "open").length;
      return {
        ...p,
        latestReport: report,
        latestMarketing: marketing,
        openActions,
      };
    });
    res.json(summaries);
  });

  // Integration status check (all integrations for a practice)
  app.get("/api/practices/:id/integrations", (req, res) => {
    res.json({
      quickbooks: { configured: !!process.env.QB_CLIENT_ID },
      googleAds: { configured: !!process.env.GOOGLE_ADS_CLIENT_ID },
      facebookAds: { configured: !!process.env.FB_APP_ID },
      claude: { configured: !!process.env.ANTHROPIC_API_KEY },
    });
  });
}
