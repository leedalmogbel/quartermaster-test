import { db } from "./storage";
import { practices, weeklyReports, marketingData, cfoScripts, forecasts, actionItems, benchmarks, users } from "@shared/schema";

export function seedDatabase() {
  // Check if data exists
  const existing = db.select().from(practices).all();
  if (existing.length > 0) return;

  // Create practices
  const p1 = db.insert(practices).values({
    name: "Summit Spine & Wellness",
    email: "dr.chen@summitspine.com",
    practiceType: "General Chiropractic",
    planTier: "growth",
    qbConnected: true,
    googleAdsConnected: true,
    fbConnected: true,
    keyIssues: "AR aging over 60 days trending up. Google Ads CPC rising.",
  }).returning().get();

  const p2 = db.insert(practices).values({
    name: "Peak Performance Chiro",
    email: "dr.martinez@peakchiro.com",
    practiceType: "Sports Chiropractic",
    planTier: "enterprise",
    qbConnected: true,
    googleAdsConnected: true,
    fbConnected: true,
    keyIssues: "Capacity at 92%. Consider associate hire.",
  }).returning().get();

  const p3 = db.insert(practices).values({
    name: "Family First Chiropractic",
    email: "dr.johnson@familyfirstchiro.com",
    practiceType: "Family Chiropractic",
    planTier: "starter",
    qbConnected: true,
    googleAdsConnected: false,
    fbConnected: true,
    keyIssues: "Low collection rate. Need to address insurance follow-up process.",
  }).returning().get();

  // Create admin user
  db.insert(users).values({
    email: "admin@quartermaster.com",
    password: "admin123",
    role: "admin",
    name: "Quartermaster Admin",
  }).run();

  // Weekly reports for Summit Spine (8 weeks)
  const weeks = [
    "2026-04-06","2026-03-30","2026-03-23","2026-03-16",
    "2026-03-09","2026-03-02","2026-02-23","2026-02-16"
  ];
  const summitRevenues = [48500,46200,47800,44900,45600,43200,42800,41500];
  const summitExpenses = [24250,23560,24370,23400,23700,22900,22600,22100];

  weeks.forEach((w, i) => {
    const rev = summitRevenues[i];
    const exp = summitExpenses[i];
    db.insert(weeklyReports).values({
      practiceId: p1.id, weekEnding: w, revenue: rev,
      totalExpenses: exp, netIncome: rev - exp,
      collectionRate: 94.2 - i * 0.3, overheadPct: (exp/rev)*100,
      netMargin: ((rev-exp)/rev)*100, arCurrent: 12400 + i*800,
      ar60Plus: 4200 + i*300, cashPosition: 67500 - i*2000,
      capacityPct: 78 + i*1.5, revenuePerVisit: 185 + (i % 3) * 5,
      staffCostPct: 32 - i*0.2,
    }).run();

    db.insert(marketingData).values({
      practiceId: p1.id, weekEnding: w,
      googleSpend: 1200 + i*50, googleClicks: 340 + i*10,
      googleConversions: 28 - i, googlePatients: 14 - Math.floor(i/2),
      googleRoas: 4.2 - i*0.1,
      fbSpend: 800 + i*30, fbClicks: 220 + i*15,
      fbConversions: 18 - i, fbPatients: 9 - Math.floor(i/3),
      fbRoas: 3.6 - i*0.15,
    }).run();
  });

  // Weekly reports for Peak Performance (8 weeks)
  const peakRevenues = [62400,59800,61200,58500,57200,55800,54300,53100];
  const peakExpenses = [28080,27510,28160,27200,26680,26100,25510,25000];

  weeks.forEach((w, i) => {
    const rev = peakRevenues[i];
    const exp = peakExpenses[i];
    db.insert(weeklyReports).values({
      practiceId: p2.id, weekEnding: w, revenue: rev,
      totalExpenses: exp, netIncome: rev - exp,
      collectionRate: 97.1 - i * 0.2, overheadPct: (exp/rev)*100,
      netMargin: ((rev-exp)/rev)*100, arCurrent: 8200 + i*400,
      ar60Plus: 1800 + i*150, cashPosition: 94200 - i*3000,
      capacityPct: 92 - i*1, revenuePerVisit: 210 + (i % 3) * 8,
      staffCostPct: 30 - i*0.15,
    }).run();

    db.insert(marketingData).values({
      practiceId: p2.id, weekEnding: w,
      googleSpend: 2400 + i*80, googleClicks: 580 + i*20,
      googleConversions: 42 - i*2, googlePatients: 22 - i,
      googleRoas: 5.1 - i*0.12,
      fbSpend: 1600 + i*60, fbClicks: 390 + i*10,
      fbConversions: 30 - i, fbPatients: 16 - Math.floor(i/2),
      fbRoas: 4.2 - i*0.1,
    }).run();
  });

  // Weekly reports for Family First (8 weeks)
  const familyRevenues = [28600,27400,28100,26800,27200,25900,25400,24800];
  const familyExpenses = [16588,16166,16779,16214,16320,15799,15494,15128];

  weeks.forEach((w, i) => {
    const rev = familyRevenues[i];
    const exp = familyExpenses[i];
    db.insert(weeklyReports).values({
      practiceId: p3.id, weekEnding: w, revenue: rev,
      totalExpenses: exp, netIncome: rev - exp,
      collectionRate: 88.5 - i * 0.4, overheadPct: (exp/rev)*100,
      netMargin: ((rev-exp)/rev)*100, arCurrent: 18600 + i*1200,
      ar60Plus: 8400 + i*600, cashPosition: 32100 - i*1500,
      capacityPct: 62 + i*2, revenuePerVisit: 155 + (i % 3) * 4,
      staffCostPct: 35 + i*0.3,
    }).run();

    db.insert(marketingData).values({
      practiceId: p3.id, weekEnding: w,
      googleSpend: 0, googleClicks: 0,
      googleConversions: 0, googlePatients: 0, googleRoas: 0,
      fbSpend: 500 + i*20, fbClicks: 140 + i*8,
      fbConversions: 10 - Math.floor(i/2), fbPatients: 5 - Math.floor(i/3),
      fbRoas: 2.8 - i*0.1,
    }).run();
  });

  // CFO Scripts for Summit Spine
  db.insert(cfoScripts).values({
    practiceId: p1.id, weekEnding: "2026-04-06",
    generatedAt: "2026-04-06T08:00:00Z",
    scriptFull: "Complete 6-step CFO script for Summit Spine & Wellness...",
    step1: JSON.stringify({
      title: "Practice Snapshot & Wins",
      duration: "5 min",
      advisorNote: "Summit had a strong week — revenue hit $48,500, up 5% from last week. Lead with the win before diving into areas for improvement.",
      talkingPoints: [
        "Weekly revenue of $48,500 is the highest in 8 weeks",
        "Collection rate at 94.2% — just under the 95% benchmark",
        "Net margin of 50.0% continues above the 45% healthy range",
        "Cash position strong at $67,500"
      ],
      questions: ["What drove the revenue increase this week?", "Any new patient volume changes?"]
    }),
    step2: JSON.stringify({
      title: "Perfect P&L Deep Dive",
      duration: "10 min",
      advisorNote: "Overhead is well controlled at 50%. The key concern is AR aging — $4,200 over 60 days is creeping up and needs attention before it becomes a collection problem.",
      talkingPoints: [
        "Overhead at 50.0% of revenue — within the 45-55% healthy range",
        "Staff costs at 32.0% of collections — within the 30-35% target",
        "AR over 60 days has grown $300 week-over-week to $4,200",
        "Revenue per visit at $185 — healthy range ($165-220)"
      ],
      questions: ["Which payers are contributing to the 60+ day AR?", "Is the billing team following up on aged claims?"]
    }),
    step3: JSON.stringify({
      title: "Marketing Attribution Review",
      duration: "8 min",
      advisorNote: "Google Ads ROAS of 4.2x is solid but declining from 4.3x last week. Facebook at 3.6x. Combined marketing is generating 23 new patients this week.",
      talkingPoints: [
        "Google Ads: $1,200 spend → 14 patients → 4.2x ROAS",
        "Facebook: $800 spend → 9 patients → 3.6x ROAS",
        "Total marketing spend: $2,000 for 23 new patients",
        "Cost per patient acquisition: $87 (below $120 target)"
      ],
      questions: ["Are Google Ads conversions turning into scheduled appointments?", "Which Facebook campaigns perform best?"]
    }),
    step4: JSON.stringify({
      title: "Forecasting & Scenario Planning",
      duration: "7 min",
      advisorNote: "90-day base case projects $615K in revenue. Optimistic scenario with improved collection rate reaches $680K. Conservative holds at $560K if current trends continue.",
      talkingPoints: [
        "Base case 90-day forecast: $615,000",
        "Optimistic (95%+ collection): $680,000",
        "Conservative (current trajectory): $560,000",
        "R&D tax credit estimate: $18,500 (OBBBA framework)"
      ],
      questions: ["Any planned investments that would shift the forecast?", "Are there seasonal factors to consider?"]
    }),
    step5: JSON.stringify({
      title: "Action Items & Priorities",
      duration: "8 min",
      advisorNote: "Three priorities this week: (1) Address the AR aging, (2) Optimize Google Ads as CPC rises, (3) Document staff scheduling efficiency.",
      talkingPoints: [
        "Priority 1: Contact top 5 payers with 60+ day claims — target $2,000 recovery",
        "Priority 2: Review Google Ads keywords — pause underperforming campaigns",
        "Priority 3: Staff schedule optimization — aim for 82% capacity utilization"
      ],
      questions: ["Who will own each action item?", "What's the timeline for AR follow-up?"]
    }),
    step6: JSON.stringify({
      title: "Wrap-Up & Next Steps",
      duration: "2 min",
      advisorNote: "Strong week overall. The AR situation is the only yellow flag. If addressed this week, Summit is tracking toward the optimistic forecast scenario.",
      talkingPoints: [
        "Summary: Revenue up, margins healthy, marketing ROI strong",
        "Key risk: AR aging needs immediate attention",
        "Next meeting: Review AR recovery results and Q2 projections",
        "Monday Morning Brief will be emailed to all stakeholders"
      ],
      questions: ["Any questions before we close?", "Same time next week?"]
    }),
  }).run();

  // Forecasts
  const cashflow13weeks = Array.from({length: 13}, (_, i) => ({
    week: `Week ${i + 1}`,
    projected_revenue: 48000 + Math.round(Math.random() * 4000),
    projected_expenses: 24000 + Math.round(Math.random() * 2000),
    net_cash: 0,
    cumulative: 0,
  }));
  cashflow13weeks.forEach((w, i) => {
    w.net_cash = w.projected_revenue - w.projected_expenses;
    w.cumulative = (i > 0 ? cashflow13weeks[i-1].cumulative : 67500) + w.net_cash;
  });

  db.insert(forecasts).values({
    practiceId: p1.id, date: "2026-04-06",
    base90day: 615000, optimistic90day: 680000, conservative90day: 560000,
    cashflowJson: JSON.stringify(cashflow13weeks),
  }).run();

  db.insert(forecasts).values({
    practiceId: p2.id, date: "2026-04-06",
    base90day: 795000, optimistic90day: 870000, conservative90day: 720000,
    cashflowJson: JSON.stringify(cashflow13weeks.map(w => ({
      ...w,
      projected_revenue: w.projected_revenue * 1.3,
      projected_expenses: w.projected_expenses * 1.15,
      net_cash: w.projected_revenue * 1.3 - w.projected_expenses * 1.15,
    }))),
  }).run();

  db.insert(forecasts).values({
    practiceId: p3.id, date: "2026-04-06",
    base90day: 365000, optimistic90day: 410000, conservative90day: 320000,
    cashflowJson: JSON.stringify(cashflow13weeks.map(w => ({
      ...w,
      projected_revenue: w.projected_revenue * 0.6,
      projected_expenses: w.projected_expenses * 0.68,
      net_cash: w.projected_revenue * 0.6 - w.projected_expenses * 0.68,
    }))),
  }).run();

  // Action Items for Summit
  db.insert(actionItems).values([
    { practiceId: p1.id, weekEnding: "2026-04-06", priority: 1, title: "Follow up on 60+ day AR claims", description: "Contact top 5 payers with aged claims over 60 days. Target: recover $2,000 this week.", owner: "Billing Team", dueDate: "2026-04-10", status: "open" },
    { practiceId: p1.id, weekEnding: "2026-04-06", priority: 2, title: "Optimize Google Ads campaigns", description: "Review keyword performance. Pause campaigns with CPC above $8. Reallocate budget to top converters.", owner: "Marketing", dueDate: "2026-04-11", status: "in_progress" },
    { practiceId: p1.id, weekEnding: "2026-04-06", priority: 3, title: "Staff scheduling review", description: "Analyze appointment utilization by time slot. Target 82% capacity utilization.", owner: "Dr. Chen", dueDate: "2026-04-13", status: "open" },
    { practiceId: p1.id, weekEnding: "2026-03-30", priority: 1, title: "Update insurance fee schedules", description: "Review and update fee schedules for top 3 insurance payers.", owner: "Dr. Chen", dueDate: "2026-04-04", status: "completed" },
  ]).run();

  // Action Items for Peak Performance
  db.insert(actionItems).values([
    { practiceId: p2.id, weekEnding: "2026-04-06", priority: 1, title: "Associate hire financial model", description: "Build P&L projection for adding an associate doctor at 30-35% of collections.", owner: "Dr. Martinez", dueDate: "2026-04-12", status: "open" },
    { practiceId: p2.id, weekEnding: "2026-04-06", priority: 2, title: "Expand Google Ads to new markets", description: "Research adjacent zip codes for expansion. Budget: $500/month test.", owner: "Marketing", dueDate: "2026-04-15", status: "open" },
  ]).run();

  // Action Items for Family First
  db.insert(actionItems).values([
    { practiceId: p3.id, weekEnding: "2026-04-06", priority: 1, title: "Implement collection rate improvement plan", description: "Set up automated payment reminders. Train front desk on point-of-service collections.", owner: "Office Manager", dueDate: "2026-04-10", status: "open" },
    { practiceId: p3.id, weekEnding: "2026-04-06", priority: 2, title: "Set up Google Ads account", description: "Create Google Ads account and initial campaigns targeting family chiropractic keywords.", owner: "Dr. Johnson", dueDate: "2026-04-18", status: "open" },
  ]).run();

  // Benchmarks
  db.insert(benchmarks).values([
    { metric: "collection_rate", target: 95, min: 90, max: 100, label: "Collection Rate %" },
    { metric: "overhead_pct", target: 50, min: 45, max: 55, label: "Overhead %" },
    { metric: "net_margin", target: 50, min: 40, max: 60, label: "Net Margin %" },
    { metric: "roas", target: 3.0, min: 2.0, max: 6.0, label: "Marketing ROAS" },
    { metric: "revenue_per_visit", target: 190, min: 165, max: 220, label: "Revenue Per Visit" },
    { metric: "capacity_pct", target: 85, min: 70, max: 95, label: "Capacity %" },
    { metric: "staff_cost_pct", target: 32, min: 30, max: 35, label: "Staff Cost %" },
    { metric: "ar_60_plus_pct", target: 5, min: 0, max: 10, label: "AR 60+ Days %" },
  ]).run();

  console.log("Database seeded with demo data for 3 practices.");
}
