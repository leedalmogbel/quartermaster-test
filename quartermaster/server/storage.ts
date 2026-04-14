import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc } from "drizzle-orm";
import {
  users, practices, weeklyReports, marketingData, cfoScripts, forecasts, actionItems, practiceNotes, benchmarks,
  type User, type InsertUser,
  type Practice, type InsertPractice,
  type WeeklyReport, type InsertWeeklyReport,
  type MarketingDataRow, type InsertMarketingData,
  type CfoScript, type InsertCfoScript,
  type Forecast, type InsertForecast,
  type ActionItem, type InsertActionItem,
  type PracticeNote, type InsertPracticeNote,
  type Benchmark, type InsertBenchmark,
} from "@shared/schema";

const sqlite = new Database("data.db");
export const db = drizzle(sqlite);

// Bootstrap practice_notes table if it doesn't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS practice_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    practice_id INTEGER NOT NULL,
    note_text TEXT NOT NULL,
    created_by TEXT,
    created_at TEXT
  );
`);

export interface IStorage {
  // Users
  getUser(id: number): User | undefined;
  getUserByEmail(email: string): User | undefined;
  createUser(user: InsertUser): User;
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
  // Practice Notes
  getPracticeNotes(practiceId: number): PracticeNote[];
  createPracticeNote(data: InsertPracticeNote): PracticeNote;
  // Benchmarks
  getAllBenchmarks(): Benchmark[];
  createBenchmark(benchmark: InsertBenchmark): Benchmark;
}

export class DatabaseStorage implements IStorage {
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
  getPracticeNotes(practiceId: number): PracticeNote[] {
    return db.select().from(practiceNotes).where(eq(practiceNotes.practiceId, practiceId)).orderBy(desc(practiceNotes.createdAt)).all();
  }
  createPracticeNote(data: InsertPracticeNote): PracticeNote {
    return db.insert(practiceNotes).values(data).returning().get();
  }
  getAllBenchmarks(): Benchmark[] {
    return db.select().from(benchmarks).all();
  }
  createBenchmark(benchmark: InsertBenchmark): Benchmark {
    return db.insert(benchmarks).values(benchmark).returning().get();
  }
}

export const storage = new DatabaseStorage();
