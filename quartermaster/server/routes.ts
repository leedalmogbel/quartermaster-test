import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import { registerQuickBooksRoutes } from "./integrations/quickbooks";
import { registerClaudeCFORoutes } from "./integrations/claude-cfo";
import { registerGoogleAdsRoutes } from "./integrations/google-ads";
import { registerFacebookAdsRoutes } from "./integrations/facebook-ads";
import { registerAuthRoutes } from "./integrations/auth";

function parseId(value: string): number | null {
  const id = parseInt(value);
  return isNaN(id) ? null : id;
}

export async function registerRoutes(server: Server, app: Express) {
  // Seed demo data on startup
  seedDatabase();

  // Register all integration routes
  registerQuickBooksRoutes(app);
  registerClaudeCFORoutes(app);
  registerGoogleAdsRoutes(app);
  registerFacebookAdsRoutes(app);
  const { authMiddleware } = registerAuthRoutes(app);

  // ===== CORE DATA API =====

  // Get all practices (admin)
  app.get("/api/practices", (_req, res) => {
    const practices = storage.getAllPractices();
    res.json(practices);
  });

  // Get single practice
  app.get("/api/practices/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid practice ID" });
    const practice = storage.getPractice(id);
    if (!practice) return res.status(404).json({ error: "Practice not found" });
    res.json(practice);
  });

  // Get weekly reports for a practice
  app.get("/api/practices/:id/reports", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid practice ID" });
    const reports = storage.getWeeklyReports(id);
    res.json(reports);
  });

  // Get latest weekly report
  app.get("/api/practices/:id/reports/latest", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid practice ID" });
    const report = storage.getLatestWeeklyReport(id);
    if (!report) return res.status(404).json({ error: "No reports found" });
    res.json(report);
  });

  // Get marketing data
  app.get("/api/practices/:id/marketing", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid practice ID" });
    const data = storage.getMarketingData(id);
    res.json(data);
  });

  // Get latest marketing data
  app.get("/api/practices/:id/marketing/latest", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid practice ID" });
    const data = storage.getLatestMarketingData(id);
    if (!data) return res.status(404).json({ error: "No marketing data found" });
    res.json(data);
  });

  // Get CFO scripts
  app.get("/api/practices/:id/scripts", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid practice ID" });
    const scripts = storage.getCfoScripts(id);
    res.json(scripts);
  });

  // Get latest CFO script
  app.get("/api/practices/:id/scripts/latest", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid practice ID" });
    const script = storage.getLatestCfoScript(id);
    if (!script) return res.status(404).json({ error: "No scripts found" });
    res.json(script);
  });

  // Get forecast
  app.get("/api/practices/:id/forecast", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid practice ID" });
    const forecast = storage.getLatestForecast(id);
    if (!forecast) return res.status(404).json({ error: "No forecast found" });
    res.json(forecast);
  });

  // Get action items
  app.get("/api/practices/:id/actions", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid practice ID" });
    const items = storage.getActionItems(id);
    res.json(items);
  });

  // Update action item status
  app.patch("/api/actions/:id", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid action item ID" });
    const { status } = req.body;
    const validStatuses = ["open", "in_progress", "completed"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be: open, in_progress, or completed" });
    }
    const item = storage.updateActionItemStatus(id, status);
    if (!item) return res.status(404).json({ error: "Action item not found" });
    res.json(item);
  });

  // Get practice notes (newest first)
  app.get("/api/practices/:id/notes", (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid practice ID" });
    const notes = storage.getPracticeNotes(id);
    res.json(notes);
  });

  // Create a practice note
  app.post("/api/practices/:id/notes", (req, res) => {
    const practiceId = parseId(req.params.id);
    if (!practiceId) return res.status(400).json({ error: "Invalid practice ID" });
    const { noteText, createdBy } = req.body;
    if (!noteText || !noteText.trim()) {
      return res.status(400).json({ error: "noteText is required" });
    }
    const note = storage.createPracticeNote({
      practiceId,
      noteText: noteText.trim(),
      createdBy: createdBy || null,
      createdAt: new Date().toISOString(),
    });
    res.json(note);
  });

  // Get benchmarks
  app.get("/api/benchmarks", (_req, res) => {
    const benchmarks = storage.getAllBenchmarks();
    res.json(benchmarks);
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
  app.get("/api/practices/:id/integrations", (_req, res) => {
    res.json({
      quickbooks: { configured: !!process.env.QB_CLIENT_ID },
      googleAds: { configured: !!process.env.GOOGLE_ADS_CLIENT_ID },
      facebookAds: { configured: !!process.env.FB_APP_ID },
      claude: { configured: !!process.env.ANTHROPIC_API_KEY },
    });
  });
}
