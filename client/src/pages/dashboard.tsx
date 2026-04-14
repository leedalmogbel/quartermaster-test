import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  DollarSign,
  Percent,
  BarChart3,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckSquare,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/kpi-card";
import { usePractice } from "@/App";
import type { WeeklyReport, MarketingDataRow, ActionItem, Forecast } from "@shared/schema";
import { formatCurrency, formatPercent, formatRoas } from "@/lib/utils";
import { Link } from "wouter";

function priorityLabel(p: number) {
  if (p === 1) return { label: "High", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
  if (p === 2) return { label: "Medium", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  return { label: "Low", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === "number" && entry.name?.includes("Revenue")
              ? formatCurrency(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { practiceId } = usePractice();

  const { data: reports, isLoading: reportsLoading } = useQuery<WeeklyReport[]>({
    queryKey: ["/api/practices", practiceId, "reports"],
    queryFn: async () => {
      const res = await fetch(`/api/practices/${practiceId}/reports`);
      if (!res.ok) throw new Error("Failed to load reports");
      return res.json();
    },
  });

  const { data: latestMarketing, isLoading: mktLoading } = useQuery<MarketingDataRow>({
    queryKey: ["/api/practices", practiceId, "marketing", "latest"],
    queryFn: async () => {
      const res = await fetch(`/api/practices/${practiceId}/marketing/latest`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: marketingHistory } = useQuery<MarketingDataRow[]>({
    queryKey: ["/api/practices", practiceId, "marketing"],
    queryFn: async () => {
      const res = await fetch(`/api/practices/${practiceId}/marketing`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: forecast } = useQuery<Forecast>({
    queryKey: ["/api/practices", practiceId, "forecast"],
    queryFn: async () => {
      const res = await fetch(`/api/practices/${practiceId}/forecast`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: actions } = useQuery<ActionItem[]>({
    queryKey: ["/api/practices", practiceId, "actions"],
    queryFn: async () => {
      const res = await fetch(`/api/practices/${practiceId}/actions`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const sortedReports = reports ? [...reports].sort((a, b) => a.weekEnding.localeCompare(b.weekEnding)) : [];
  const latest = sortedReports[sortedReports.length - 1];
  const prior = sortedReports[sortedReports.length - 2];

  const last8Reports = sortedReports.slice(-8);

  // Revenue trend data
  const revenueData = last8Reports.map((r) => ({
    week: r.weekEnding.slice(5), // MM-DD
    Revenue: r.revenue,
    "Net Income": r.netIncome,
  }));

  // ROAS comparison data
  const roasData = (marketingHistory ?? []).slice(-8).map((m) => ({
    week: m.weekEnding.slice(5),
    "Google ROAS": m.googleRoas ?? 0,
    "FB ROAS": m.fbRoas ?? 0,
  }));

  const openActions = actions?.filter((a) => a.status === "open") ?? [];

  // Compute deltas
  const revDelta = latest && prior ? ((latest.revenue - prior.revenue) / prior.revenue) * 100 : null;
  const colDelta = latest && prior ? latest.collectionRate - prior.collectionRate : null;
  const marginDelta = latest && prior ? latest.netMargin - prior.netMargin : null;

  const totalRoas = latestMarketing
    ? (() => {
        const gRev = (latestMarketing.googleRoas ?? 0) * (latestMarketing.googleSpend ?? 0);
        const fRev = (latestMarketing.fbRoas ?? 0) * (latestMarketing.fbSpend ?? 0);
        const totalSpend = (latestMarketing.googleSpend ?? 0) + (latestMarketing.fbSpend ?? 0);
        return totalSpend > 0 ? (gRev + fRev) / totalSpend : 0;
      })()
    : null;

  const isLoading = reportsLoading;

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {latest ? `Week ending ${latest.weekEnding}` : "Loading..."}
          </p>
        </div>
        {latest && (
          <Badge variant="outline" className="text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block mr-1.5" />
            Live data
          </Badge>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Weekly Revenue"
          value={isLoading ? "—" : formatCurrency(latest?.revenue)}
          delta={revDelta}
          deltaLabel={revDelta != null ? `${revDelta > 0 ? "+" : ""}${revDelta.toFixed(1)}%` : undefined}
          icon={<DollarSign className="h-4 w-4" />}
          loading={isLoading}
          trend="up-good"
          data-testid="kpi-revenue"
        />
        <KpiCard
          label="Collection Rate"
          value={isLoading ? "—" : formatPercent(latest?.collectionRate)}
          delta={colDelta}
          deltaLabel={colDelta != null ? `${colDelta > 0 ? "+" : ""}${colDelta.toFixed(1)}pp` : undefined}
          icon={<Percent className="h-4 w-4" />}
          loading={isLoading}
          trend="up-good"
          data-testid="kpi-collection-rate"
        />
        <KpiCard
          label="Blended ROAS"
          value={mktLoading ? "—" : totalRoas != null ? formatRoas(totalRoas) : "—"}
          icon={<BarChart3 className="h-4 w-4" />}
          loading={mktLoading}
          trend="up-good"
          data-testid="kpi-roas"
        />
        <KpiCard
          label="90-Day Forecast"
          value={forecast ? formatCurrency(forecast.base90day) : "—"}
          icon={<Target className="h-4 w-4" />}
          loading={isLoading}
          trend="up-good"
          data-testid="kpi-forecast"
        />
        <KpiCard
          label="Net Margin"
          value={isLoading ? "—" : formatPercent(latest?.netMargin)}
          delta={marginDelta}
          deltaLabel={marginDelta != null ? `${marginDelta > 0 ? "+" : ""}${marginDelta.toFixed(1)}pp` : undefined}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={isLoading}
          trend="up-good"
          data-testid="kpi-net-margin"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue Trend — Last 8 Weeks</CardTitle>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={revenueData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    className="text-muted-foreground"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="Revenue"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Net Income"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="4 2"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ROAS Comparison */}
        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Marketing ROAS — Google vs Facebook</CardTitle>
          </CardHeader>
          <CardContent>
            {mktLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={roasData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}x`} />
                  <Tooltip
                    formatter={(v: number) => `${v.toFixed(2)}x`}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Google ROAS" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="FB ROAS" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Open Action Items */}
      <Card className="border-card-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Open Action Items
            {openActions.length > 0 && (
              <Badge className="text-[10px] h-4 min-w-4 px-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
                {openActions.length}
              </Badge>
            )}
          </CardTitle>
          <Link href="/actions">
            <a className="text-xs text-primary hover:underline font-medium">View all →</a>
          </Link>
        </CardHeader>
        <CardContent>
          {!actions ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : openActions.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <CheckSquare className="h-4 w-4 text-green-500" />
              All action items are complete — great work!
            </div>
          ) : (
            <div className="divide-y divide-border">
              {openActions.slice(0, 5).map((item) => {
                const { label, className } = priorityLabel(item.priority);
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 py-2.5"
                    data-testid={`action-item-${item.id}`}
                  >
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 mt-0.5 ${className}`}>
                      {label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                      {item.dueDate && (
                        <>
                          <Clock className="h-3 w-3" />
                          {item.dueDate}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
