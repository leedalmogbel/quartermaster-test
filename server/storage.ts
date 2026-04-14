import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and } from "drizzle-orm";
import {
  users, practices, weeklyReports, marketingData, cfoScripts, forecasts, actionItems, benchmarks,
  rdActivities, taxPlanning, auditLogs,
  type User, type InsertUser,
  type Practice, type InsertPractice,
  type WeeklyReport, type InsertWeeklyReport,
  type MarketingDataRow, type InsertMarketingData,
  type CfoScript, type InsertCfoScript,
  type Forecast, type InsertForecast,
  type ActionItem, type InsertActionItem,
  type Benchmark, type InsertBenchmark,
  type RdActivity, type InsertRdActivity,
  type TaxPlanning, type InsertTaxPlanning,
  type AuditLog, type InsertAuditLog,
} from "@shared/schema";

const sqlite = new Database("data.db");
export const db = drizzle(sqlite);

// Bootstrap all tables if they don't exist (avoids needing drizzle-kit push)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client',
    practice_id INTEGER,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS practices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    practice_type TEXT DEFAULT 'General Chiropractic',
    plan_tier TEXT DEFAULT 'starter',
    qb_connected INTEGER DEFAULT 0,
    google_ads_connected INTEGER DEFAULT 0,
    fb_connected INTEGER DEFAULT 0,
    key_issues TEXT
  );
  CREATE TABLE IF NOT EXISTS weekly_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    practice_id INTEGER NOT NULL,
    week_ending TEXT NOT NULL,
    revenue REAL NOT NULL,
    total_expenses REAL NOT NULL,
    net_income REAL NOT NULL,
    collection_rate REAL NOT NULL,
    overhead_pct REAL NOT NULL,
    net_margin REAL NOT NULL,
    ar_current REAL DEFAULT 0,
    ar_60_plus REAL DEFAULT 0,
    cash_position REAL DEFAULT 0,
    capacity_pct REAL DEFAULT 0,
    revenue_per_visit REAL DEFAULT 0,
    staff_cost_pct REAL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS marketing_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    practice_id INTEGER NOT NULL,
    week_ending TEXT NOT NULL,
    google_spend REAL DEFAULT 0,
    google_clicks INTEGER DEFAULT 0,
    google_conversions INTEGER DEFAULT 0,
    google_patients INTEGER DEFAULT 0,
    google_roas REAL DEFAULT 0,
    fb_spend REAL DEFAULT 0,
    fb_clicks INTEGER DEFAULT 0,
    fb_conversions INTEGER DEFAULT 0,
    fb_patients INTEGER DEFAULT 0,
    fb_roas REAL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS cfo_scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    practice_id INTEGER NOT NULL,
    week_ending TEXT NOT NULL,
    script_full TEXT,
    step1 TEXT,
    step2 TEXT,
    step3 TEXT,
    step4 TEXT,
    step5 TEXT,
    step6 TEXT,
    generated_at TEXT
  );
  CREATE TABLE IF NOT EXISTS forecasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    practice_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    base_90day REAL NOT NULL,
    optimistic_90day REAL NOT NULL,
    conservative_90day REAL NOT NULL,
    cashflow_json TEXT
  );
  CREATE TABLE IF NOT EXISTS action_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    practice_id INTEGER NOT NULL,
    week_ending TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    description TEXT,
    owner TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'open'
  );
  CREATE TABLE IF NOT EXISTS benchmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric TEXT NOT NULL,
    target REAL NOT NULL,
    min REAL,
    max REAL,
    label TEXT
  );
  CREATE TABLE IF NOT EXISTS rd_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    practice_id INTEGER NOT NULL,
    tax_year INTEGER NOT NULL,
    checked_activities TEXT NOT NULL DEFAULT '[]',
    qre_wages REAL DEFAULT 0,
    qre_supplies REAL DEFAULT 0,
    qre_contractors REAL DEFAULT 0,
    total_qre REAL DEFAULT 0,
    estimated_credit REAL DEFAULT 0,
    state_credit REAL DEFAULT 0,
    total_credit REAL DEFAULT 0,
    annual_gross_revenue REAL DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'draft',
    updated_at TEXT
  );
  CREATE TABLE IF NOT EXISTS tax_planning (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    practice_id INTEGER NOT NULL,
    tax_year INTEGER NOT NULL,
    plan_tier TEXT NOT NULL DEFAULT 'lite',
    annual_collections REAL DEFAULT 0,
    annual_gross_revenue REAL DEFAULT 0,
    entity_type TEXT DEFAULT 'S-Corp',
    strategies_json TEXT DEFAULT '[]',
    estimated_savings REAL DEFAULT 0,
    roth_conversion_amount REAL DEFAULT 0,
    roth_conversion_savings REAL DEFAULT 0,
    qbi_deduction REAL DEFAULT 0,
    augusta_rule_days INTEGER DEFAULT 0,
    augusta_rule_savings REAL DEFAULT 0,
    notes TEXT,
    advisor_notes TEXT,
    status TEXT DEFAULT 'draft',
    updated_at TEXT
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export interface IStorage {
  // Users
  getUser(id: number): User | undefined;
  getUserByEmail(email: string): User | undefined;
  createUser(user: InsertUser): User;
  updateUserPassword(userId: number, hashedPassword: string): void;
  // Audit Logs
  createAuditLog(log: InsertAuditLog): AuditLog;
  getAuditLogs(limit?: number): AuditLog[];
  // Practices
  getAllPractices(): Practice[];
  getPractice(id: number): Practice | undefined;
  createPractice(practice: InsertPractice): Practice;
  // Weekly Reports
  getWeeklyReports(practiceId: number): WeeklyReport[];
  getLatestWeeklyReport(practiceId: number): WeeklyReport | undefined;
  createWeeklyReport(report: InsertWeeklyReport): WeeklyReport;
  // Marketing Data
  getMarketingData(practiceId: number): MarketingDataRow[];
  getLatestMarketingData(practiceId: number): MarketingDataRow | undefined;
  createMarketingData(data: InsertMarketingData): MarketingDataRow;
  // CFO Scripts
  getCfoScripts(practiceId: number): CfoScript[];
  getLatestCfoScript(practiceId: number): CfoScript | undefined;
  createCfoScript(script: InsertCfoScript): CfoScript;
  // Forecasts
  getLatestForecast(practiceId: number): Forecast | undefined;
  createForecast(forecast: InsertForecast): Forecast;
  // Action Items
  getActionItems(practiceId: number): ActionItem[];
  updateActionItemStatus(id: number, status: string): ActionItem | undefined;
  createActionItem(item: InsertActionItem): ActionItem;
  // Benchmarks
  getAllBenchmarks(): Benchmark[];
  createBenchmark(benchmark: InsertBenchmark): Benchmark;
  // R&D
  getRdActivity(practiceId: number, taxYear: number): RdActivity | undefined;
  upsertRdActivity(data: InsertRdActivity): RdActivity;
  // Tax Planning
  getTaxPlanning(practiceId: number, taxYear: number): TaxPlanning | undefined;
  upsertTaxPlanning(data: InsertTaxPlanning): TaxPlanning;
}

export class DatabaseStorage implements IStorage {
  updateUserPassword(userId: number, hashedPassword: string): void {
    db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId)).run();
  }
  createAuditLog(log: InsertAuditLog): AuditLog {
    return db.insert(auditLogs).values(log).returning().get();
  }
  getAuditLogs(limit: number = 100): AuditLog[] {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit).all();
  }
  getUser(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }
  getUserByEmail(email: string): User | undefined {
    return db.select().from(users).where(eq(users.email, email)).get();
  }
  createUser(user: InsertUser): User {
    return db.insert(users).values(user).returning().get();
  }
  getAllPractices(): Practice[] {
    return db.select().from(practices).all();
  }
  getPractice(id: number): Practice | undefined {
    return db.select().from(practices).where(eq(practices.id, id)).get();
  }
  createPractice(practice: InsertPractice): Practice {
    return db.insert(practices).values(practice).returning().get();
  }
  getWeeklyReports(practiceId: number): WeeklyReport[] {
    return db.select().from(weeklyReports).where(eq(weeklyReports.practiceId, practiceId)).all();
  }
  getLatestWeeklyReport(practiceId: number): WeeklyReport | undefined {
    return db.select().from(weeklyReports).where(eq(weeklyReports.practiceId, practiceId)).orderBy(desc(weeklyReports.weekEnding)).get();
  }
  createWeeklyReport(report: InsertWeeklyReport): WeeklyReport {
    return db.insert(weeklyReports).values(report).returning().get();
  }
  getMarketingData(practiceId: number): MarketingDataRow[] {
    return db.select().from(marketingData).where(eq(marketingData.practiceId, practiceId)).all();
  }
  getLatestMarketingData(practiceId: number): MarketingDataRow | undefined {
    return db.select().from(marketingData).where(eq(marketingData.practiceId, practiceId)).orderBy(desc(marketingData.weekEnding)).get();
  }
  createMarketingData(data: InsertMarketingData): MarketingDataRow {
    return db.insert(marketingData).values(data).returning().get();
  }
  getCfoScripts(practiceId: number): CfoScript[] {
    return db.select().from(cfoScripts).where(eq(cfoScripts.practiceId, practiceId)).all();
  }
  getLatestCfoScript(practiceId: number): CfoScript | undefined {
    return db.select().from(cfoScripts).where(eq(cfoScripts.practiceId, practiceId)).orderBy(desc(cfoScripts.weekEnding)).get();
  }
  createCfoScript(script: InsertCfoScript): CfoScript {
    return db.insert(cfoScripts).values(script).returning().get();
  }
  getLatestForecast(practiceId: number): Forecast | undefined {
    return db.select().from(forecasts).where(eq(forecasts.practiceId, practiceId)).orderBy(desc(forecasts.date)).get();
  }
  createForecast(forecast: InsertForecast): Forecast {
    return db.insert(forecasts).values(forecast).returning().get();
  }
  getActionItems(practiceId: number): ActionItem[] {
    return db.select().from(actionItems).where(eq(actionItems.practiceId, practiceId)).all();
  }
  updateActionItemStatus(id: number, status: string): ActionItem | undefined {
    return db.update(actionItems).set({ status: status as any }).where(eq(actionItems.id, id)).returning().get();
  }
  createActionItem(item: InsertActionItem): ActionItem {
    return db.insert(actionItems).values(item).returning().get();
  }
  getAllBenchmarks(): Benchmark[] {
    return db.select().from(benchmarks).all();
  }
  createBenchmark(benchmark: InsertBenchmark): Benchmark {
    return db.insert(benchmarks).values(benchmark).returning().get();
  }
  getRdActivity(practiceId: number, taxYear: number): RdActivity | undefined {
    return db.select().from(rdActivities)
      .where(and(eq(rdActivities.practiceId, practiceId), eq(rdActivities.taxYear, taxYear)))
      .get();
  }
  upsertRdActivity(data: InsertRdActivity): RdActivity {
    const existing = this.getRdActivity(data.practiceId, data.taxYear);
    if (existing) {
      return db.update(rdActivities).set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(rdActivities.id, existing.id)).returning().get();
    }
    return db.insert(rdActivities).values({ ...data, updatedAt: new Date().toISOString() }).returning().get();
  }
  getTaxPlanning(practiceId: number, taxYear: number): TaxPlanning | undefined {
    return db.select().from(taxPlanning)
      .where(and(eq(taxPlanning.practiceId, practiceId), eq(taxPlanning.taxYear, taxYear)))
      .get();
  }
  upsertTaxPlanning(data: InsertTaxPlanning): TaxPlanning {
    const existing = this.getTaxPlanning(data.practiceId, data.taxYear);
    if (existing) {
      return db.update(taxPlanning).set({ ...data, updatedAt: new Date().toISOString() })
        .where(eq(taxPlanning.id, existing.id)).returning().get();
    }
    return db.insert(taxPlanning).values({ ...data, updatedAt: new Date().toISOString() }).returning().get();
  }
}

export const storage = new DatabaseStorage();
