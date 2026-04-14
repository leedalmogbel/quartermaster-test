import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// Users table
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "client", "cfo"] }).notNull().default("client"),
  practiceId: integer("practice_id"),
  name: text("name").notNull(),
});

// Practices table
export const practices = sqliteTable("practices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  practiceType: text("practice_type").default("General Chiropractic"),
  planTier: text("plan_tier", { enum: ["starter", "growth", "enterprise"] }).default("starter"),
  qbConnected: integer("qb_connected", { mode: "boolean" }).default(false),
  googleAdsConnected: integer("google_ads_connected", { mode: "boolean" }).default(false),
  fbConnected: integer("fb_connected", { mode: "boolean" }).default(false),
  keyIssues: text("key_issues"),
});

// Weekly financial reports
export const weeklyReports = sqliteTable("weekly_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  practiceId: integer("practice_id").notNull(),
  weekEnding: text("week_ending").notNull(),
  revenue: real("revenue").notNull(),
  totalExpenses: real("total_expenses").notNull(),
  netIncome: real("net_income").notNull(),
  collectionRate: real("collection_rate").notNull(),
  overheadPct: real("overhead_pct").notNull(),
  netMargin: real("net_margin").notNull(),
  arCurrent: real("ar_current").default(0),
  ar60Plus: real("ar_60_plus").default(0),
  cashPosition: real("cash_position").default(0),
  capacityPct: real("capacity_pct").default(0),
  revenuePerVisit: real("revenue_per_visit").default(0),
  staffCostPct: real("staff_cost_pct").default(0),
});

// Marketing data
export const marketingData = sqliteTable("marketing_data", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  practiceId: integer("practice_id").notNull(),
  weekEnding: text("week_ending").notNull(),
  googleSpend: real("google_spend").default(0),
  googleClicks: integer("google_clicks").default(0),
  googleConversions: integer("google_conversions").default(0),
  googlePatients: integer("google_patients").default(0),
  googleRoas: real("google_roas").default(0),
  fbSpend: real("fb_spend").default(0),
  fbClicks: integer("fb_clicks").default(0),
  fbConversions: integer("fb_conversions").default(0),
  fbPatients: integer("fb_patients").default(0),
  fbRoas: real("fb_roas").default(0),
});

// CFO Scripts
export const cfoScripts = sqliteTable("cfo_scripts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  practiceId: integer("practice_id").notNull(),
  weekEnding: text("week_ending").notNull(),
  scriptFull: text("script_full"),
  step1: text("step1"),
  step2: text("step2"),
  step3: text("step3"),
  step4: text("step4"),
  step5: text("step5"),
  step6: text("step6"),
  generatedAt: text("generated_at"),
});

// Forecasts
export const forecasts = sqliteTable("forecasts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  practiceId: integer("practice_id").notNull(),
  date: text("date").notNull(),
  base90day: real("base_90day").notNull(),
  optimistic90day: real("optimistic_90day").notNull(),
  conservative90day: real("conservative_90day").notNull(),
  cashflowJson: text("cashflow_json"), // JSON string of 13-week cash flow
});

// Action Items
export const actionItems = sqliteTable("action_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  practiceId: integer("practice_id").notNull(),
  weekEnding: text("week_ending").notNull(),
  priority: integer("priority").notNull().default(1),
  title: text("title").notNull(),
  description: text("description"),
  owner: text("owner"),
  dueDate: text("due_date"),
  status: text("status", { enum: ["open", "in_progress", "completed"] }).default("open"),
});

// R&D Activities — tracks qualifying chiro R&D activities per IRS Section 41
export const rdActivities = sqliteTable("rd_activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  practiceId: integer("practice_id").notNull(),
  taxYear: integer("tax_year").notNull(),
  // Activity checklist (stored as JSON array of checked activity IDs)
  checkedActivities: text("checked_activities").notNull().default("[]"),
  // QRE (Qualified Research Expenses)
  qreWages: real("qre_wages").default(0),          // wages for R&D time
  qreSupplies: real("qre_supplies").default(0),    // supplies consumed in R&D
  qreContractors: real("qre_contractors").default(0), // 65% of contract research
  // Calculated fields
  totalQre: real("total_qre").default(0),
  estimatedCredit: real("estimated_credit").default(0), // ~6.5% of QRE (federal)
  stateCredit: real("state_credit").default(0),
  totalCredit: real("total_credit").default(0),
  // Gross receipts for base period calculation
  annualGrossRevenue: real("annual_gross_revenue").default(0),
  // Notes / documentation
  notes: text("notes"),
  status: text("status", { enum: ["draft", "in_review", "filed"] }).default("draft"),
  updatedAt: text("updated_at"),
});

// Tax Planning records
export const taxPlanning = sqliteTable("tax_planning", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  practiceId: integer("practice_id").notNull(),
  taxYear: integer("tax_year").notNull(),
  planTier: text("plan_tier", { enum: ["lite", "comprehensive"] }).notNull().default("lite"),
  // Revenue bands (drives tier recommendations)
  annualCollections: real("annual_collections").default(0),
  annualGrossRevenue: real("annual_gross_revenue").default(0),
  // Entity structure
  entityType: text("entity_type").default("S-Corp"), // LLC, S-Corp, PLLC, Solo
  // Key strategies identified (JSON array)
  strategiesJson: text("strategies_json").default("[]"),
  // Estimated annual tax savings
  estimatedSavings: real("estimated_savings").default(0),
  // Roth conversion opportunity
  rothConversionAmount: real("roth_conversion_amount").default(0),
  rothConversionSavings: real("roth_conversion_savings").default(0),
  // QBI deduction
  qbiDeduction: real("qbi_deduction").default(0),
  // Augusta rule days
  augustaRuleDays: integer("augusta_rule_days").default(0),
  augustaRuleSavings: real("augusta_rule_savings").default(0),
  // Notes
  notes: text("notes"),
  advisorNotes: text("advisor_notes"),
  status: text("status", { enum: ["draft", "presented", "implemented"] }).default("draft"),
  updatedAt: text("updated_at"),
});

// Benchmarks
export const benchmarks = sqliteTable("benchmarks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  metric: text("metric").notNull(),
  target: real("target").notNull(),
  min: real("min"),
  max: real("max"),
  label: text("label"),
});

// Audit Logs
export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id"),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id"),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ id: true });
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertPracticeSchema = createInsertSchema(practices).omit({ id: true });
export const insertWeeklyReportSchema = createInsertSchema(weeklyReports).omit({ id: true });
export const insertMarketingDataSchema = createInsertSchema(marketingData).omit({ id: true });
export const insertCfoScriptSchema = createInsertSchema(cfoScripts).omit({ id: true });
export const insertForecastSchema = createInsertSchema(forecasts).omit({ id: true });
export const insertActionItemSchema = createInsertSchema(actionItems).omit({ id: true });
export const insertBenchmarkSchema = createInsertSchema(benchmarks).omit({ id: true });
export const insertRdActivitySchema = createInsertSchema(rdActivities).omit({ id: true });
export const insertTaxPlanningSchema = createInsertSchema(taxPlanning).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Practice = typeof practices.$inferSelect;
export type InsertPractice = z.infer<typeof insertPracticeSchema>;
export type WeeklyReport = typeof weeklyReports.$inferSelect;
export type InsertWeeklyReport = z.infer<typeof insertWeeklyReportSchema>;
export type MarketingDataRow = typeof marketingData.$inferSelect;
export type InsertMarketingData = z.infer<typeof insertMarketingDataSchema>;
export type CfoScript = typeof cfoScripts.$inferSelect;
export type InsertCfoScript = z.infer<typeof insertCfoScriptSchema>;
export type Forecast = typeof forecasts.$inferSelect;
export type InsertForecast = z.infer<typeof insertForecastSchema>;
export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
export type Benchmark = typeof benchmarks.$inferSelect;
export type InsertBenchmark = z.infer<typeof insertBenchmarkSchema>;
export type RdActivity = typeof rdActivities.$inferSelect;
export type InsertRdActivity = z.infer<typeof insertRdActivitySchema>;
export type TaxPlanning = typeof taxPlanning.$inferSelect;
export type InsertTaxPlanning = z.infer<typeof insertTaxPlanningSchema>;
