import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { usePractice } from "@/App";
import type { WeeklyReport, MarketingDataRow, Benchmark } from "@shared/schema";
import { formatCurrency, formatPercent, formatRoas } from "@/lib/utils";
import { cn } from "@/lib/utils";

function StatusBadge({ value, target, min, higherIsBetter = true }: {
  value: number;
  target: number;
  min?: number | null;
  higherIsBetter?: boolean;
}) {
  let status: "good" | "warn" | "bad";
  if (higherIsBetter) {
    status = value >= target ? "good" : min != null && value >= min ? "warn" : "bad";
  } else {
    status = value <= target ? "good" : min != null && value <= min ? "warn" : "bad";
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
      status === "good" && "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
      status === "warn" && "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
      status === "bad" && "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    )}>
      {status === "good" ? "✓ On Target" : status === "warn" ? "⚠ Near Target" : "✗ Below Target"}
    </span>
  );
}

function MetricRow({ label, value, formattedValue, target, formattedTarget, min, higherIsBetter = true, benchmark }: {
  label: string;
  value: number;
  formattedValue: string;
  target: number;
  formattedTarget: string;
  min?: number | null;
  higherIsBetter?: boolean;
  benchmark?: Benchmark;
}) {
  let colorClass: string;
  if (higherIsBetter) {
    colorClass = value >= target
      ? "text-green-600 dark:text-green-400"
      : min != null && value >= min
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";
  } else {
    colorClass = value <= target
      ? "text-green-600 dark:text-green-400"
      : min != null && value <= min
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";
  }

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {benchmark?.label && (
          <p className="text-xs text-muted-foreground mt-0.5">{benchmark.label}</p>
        )}
      </div>
      <div className="flex items-center gap-4 shrink-0 ml-4">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Actual</p>
          <p className={cn("text-sm font-bold tabular-nums", colorClass)}>{formattedValue}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Target</p>
          <p className="text-sm font-medium tabular-nums text-foreground">{formattedTarget}</p>
        </div>
        <StatusBadge value={value} target={target} min={min} higherIsBetter={higherIsBetter} />
      </div>
    </div>
  );
}

export default function PerfectPnL() {
  const { practiceId } = usePractice();

  const { data: latest, isLoading: reportLoading } = useQuery<WeeklyReport>({
    queryKey: ["/api/practices", practiceId, "reports", "latest"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/practices/${practiceId}/reports/latest`);
      return res.json();
    },
  });

  const { data: latestMkt, isLoading: mktLoading } = useQuery<MarketingDataRow>({
    queryKey: ["/api/practices", practiceId, "marketing", "latest"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/practices/${practiceId}/marketing/latest`);
      return res.json();
    },
  });

  const { data: benchmarks } = useQuery<Benchmark[]>({
    queryKey: ["/api/benchmarks"],
  });

  const getBenchmark = (metric: string) =>
    benchmarks?.find((b) => b.metric === metric);

  const isLoading = reportLoading || mktLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Perfect P&L</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {latest ? `Week ending ${latest.weekEnding}` : "No data"}
        </p>
      </div>

      <Tabs defaultValue="revenue" data-testid="pnl-tabs">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
          <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
          <TabsTrigger value="overhead" className="text-xs">Overhead</TabsTrigger>
          <TabsTrigger value="marketing" className="text-xs">Marketing ROI</TabsTrigger>
          <TabsTrigger value="staffing" className="text-xs">Staffing</TabsTrigger>
          <TabsTrigger value="profitability" className="text-xs">Profitability</TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs">Forecast</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="mt-4">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Revenue Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {!latest ? (
                <p className="text-sm text-muted-foreground">No report data available.</p>
              ) : (
                <div>
                  <MetricRow
                    label="Weekly Revenue"
                    value={latest.revenue}
                    formattedValue={formatCurrency(latest.revenue)}
                    target={getBenchmark("revenue")?.target ?? 50000}
                    formattedTarget={formatCurrency(getBenchmark("revenue")?.target ?? 50000)}
                    min={getBenchmark("revenue")?.min}
                    benchmark={getBenchmark("revenue")}
                  />
                  <MetricRow
                    label="Collection Rate"
                    value={latest.collectionRate}
                    formattedValue={formatPercent(latest.collectionRate)}
                    target={getBenchmark("collection_rate")?.target ?? 95}
                    formattedTarget={formatPercent(getBenchmark("collection_rate")?.target ?? 95)}
                    min={getBenchmark("collection_rate")?.min}
                    benchmark={getBenchmark("collection_rate")}
                  />
                  <MetricRow
                    label="Revenue Per Visit"
                    value={latest.revenuePerVisit ?? 0}
                    formattedValue={formatCurrency(latest.revenuePerVisit)}
                    target={getBenchmark("revenue_per_visit")?.target ?? 75}
                    formattedTarget={formatCurrency(getBenchmark("revenue_per_visit")?.target ?? 75)}
                    min={getBenchmark("revenue_per_visit")?.min}
                    benchmark={getBenchmark("revenue_per_visit")}
                  />
                  <MetricRow
                    label="Capacity Utilization"
                    value={latest.capacityPct ?? 0}
                    formattedValue={formatPercent(latest.capacityPct)}
                    target={getBenchmark("capacity_pct")?.target ?? 80}
                    formattedTarget={formatPercent(getBenchmark("capacity_pct")?.target ?? 80)}
                    min={getBenchmark("capacity_pct")?.min}
                    benchmark={getBenchmark("capacity_pct")}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overhead Tab */}
        <TabsContent value="overhead" className="mt-4">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Overhead Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {!latest ? (
                <p className="text-sm text-muted-foreground">No data.</p>
              ) : (
                <div>
                  <MetricRow
                    label="Overhead %"
                    value={latest.overheadPct}
                    formattedValue={formatPercent(latest.overheadPct)}
                    target={getBenchmark("overhead_pct")?.target ?? 60}
                    formattedTarget={formatPercent(getBenchmark("overhead_pct")?.target ?? 60)}
                    min={getBenchmark("overhead_pct")?.min}
                    higherIsBetter={false}
                    benchmark={getBenchmark("overhead_pct")}
                  />
                  <MetricRow
                    label="Total Expenses"
                    value={latest.totalExpenses}
                    formattedValue={formatCurrency(latest.totalExpenses)}
                    target={getBenchmark("total_expenses")?.target ?? 35000}
                    formattedTarget={formatCurrency(getBenchmark("total_expenses")?.target ?? 35000)}
                    min={getBenchmark("total_expenses")?.min}
                    higherIsBetter={false}
                    benchmark={getBenchmark("total_expenses")}
                  />
                  <div className="py-3 border-b border-border">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">Cash Position</p>
                      <p className="text-sm font-bold tabular-nums text-foreground">{formatCurrency(latest.cashPosition)}</p>
                    </div>
                  </div>
                  <div className="py-3 border-b border-border">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">AR Current</p>
                      </div>
                      <p className="text-sm font-bold tabular-nums text-foreground">{formatCurrency(latest.arCurrent)}</p>
                    </div>
                  </div>
                  <div className="py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">AR 60+ Days</p>
                        <p className="text-xs text-muted-foreground">Aged receivables</p>
                      </div>
                      <p className={cn(
                        "text-sm font-bold tabular-nums",
                        (latest.ar60Plus ?? 0) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                      )}>{formatCurrency(latest.ar60Plus)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketing ROI Tab */}
        <TabsContent value="marketing" className="mt-4">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Marketing ROI</CardTitle>
            </CardHeader>
            <CardContent>
              {!latestMkt ? (
                <p className="text-sm text-muted-foreground">No marketing data available.</p>
              ) : (
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Google */}
                    <div className="rounded-lg bg-muted/40 p-4 border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Google Ads</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Spend</span>
                          <span className="font-semibold tabular-nums">{formatCurrency(latestMkt.googleSpend)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Clicks</span>
                          <span className="font-semibold tabular-nums">{latestMkt.googleClicks?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Conversions</span>
                          <span className="font-semibold tabular-nums">{latestMkt.googleConversions}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">New Patients</span>
                          <span className="font-semibold tabular-nums">{latestMkt.googlePatients}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
                          <span className="font-semibold">ROAS</span>
                          <span className={cn("font-bold tabular-nums", (latestMkt.googleRoas ?? 0) >= 3 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
                            {formatRoas(latestMkt.googleRoas)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Facebook */}
                    <div className="rounded-lg bg-muted/40 p-4 border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Facebook Ads</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Spend</span>
                          <span className="font-semibold tabular-nums">{formatCurrency(latestMkt.fbSpend)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Clicks</span>
                          <span className="font-semibold tabular-nums">{latestMkt.fbClicks?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Conversions</span>
                          <span className="font-semibold tabular-nums">{latestMkt.fbConversions}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">New Patients</span>
                          <span className="font-semibold tabular-nums">{latestMkt.fbPatients}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
                          <span className="font-semibold">ROAS</span>
                          <span className={cn("font-bold tabular-nums", (latestMkt.fbRoas ?? 0) >= 3 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
                            {formatRoas(latestMkt.fbRoas)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <MetricRow
                    label="Total ROAS"
                    value={(() => {
                      const gRev = (latestMkt.googleRoas ?? 0) * (latestMkt.googleSpend ?? 0);
                      const fRev = (latestMkt.fbRoas ?? 0) * (latestMkt.fbSpend ?? 0);
                      const totalSpend = (latestMkt.googleSpend ?? 0) + (latestMkt.fbSpend ?? 0);
                      return totalSpend > 0 ? (gRev + fRev) / totalSpend : 0;
                    })()}
                    formattedValue={formatRoas((() => {
                      const gRev = (latestMkt.googleRoas ?? 0) * (latestMkt.googleSpend ?? 0);
                      const fRev = (latestMkt.fbRoas ?? 0) * (latestMkt.fbSpend ?? 0);
                      const totalSpend = (latestMkt.googleSpend ?? 0) + (latestMkt.fbSpend ?? 0);
                      return totalSpend > 0 ? (gRev + fRev) / totalSpend : 0;
                    })())}
                    target={getBenchmark("roas")?.target ?? 3}
                    formattedTarget={`${getBenchmark("roas")?.target ?? 3}x`}
                    min={getBenchmark("roas")?.min}
                    benchmark={getBenchmark("roas")}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staffing Tab */}
        <TabsContent value="staffing" className="mt-4">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Staffing Costs</CardTitle>
            </CardHeader>
            <CardContent>
              {!latest ? (
                <p className="text-sm text-muted-foreground">No data.</p>
              ) : (
                <div>
                  <MetricRow
                    label="Staff Cost %"
                    value={latest.staffCostPct ?? 0}
                    formattedValue={formatPercent(latest.staffCostPct)}
                    target={getBenchmark("staff_cost_pct")?.target ?? 20}
                    formattedTarget={formatPercent(getBenchmark("staff_cost_pct")?.target ?? 20)}
                    min={getBenchmark("staff_cost_pct")?.min}
                    higherIsBetter={false}
                    benchmark={getBenchmark("staff_cost_pct")}
                  />
                  <div className="py-3 border-b border-border">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">Estimated Staff Cost</p>
                      <p className="text-sm font-bold tabular-nums">
                        {formatCurrency((latest.staffCostPct ?? 0) / 100 * latest.revenue)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Benchmarks</p>
                    <ul className="space-y-1.5 text-sm">
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Industry best</span>
                        <span className="font-medium tabular-nums">≤ 18%</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Acceptable range</span>
                        <span className="font-medium tabular-nums">18% – 24%</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Needs attention</span>
                        <span className="font-medium tabular-nums">&gt; 24%</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profitability Tab */}
        <TabsContent value="profitability" className="mt-4">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Profitability</CardTitle>
            </CardHeader>
            <CardContent>
              {!latest ? (
                <p className="text-sm text-muted-foreground">No data.</p>
              ) : (
                <div>
                  <MetricRow
                    label="Net Margin"
                    value={latest.netMargin}
                    formattedValue={formatPercent(latest.netMargin)}
                    target={getBenchmark("net_margin")?.target ?? 20}
                    formattedTarget={formatPercent(getBenchmark("net_margin")?.target ?? 20)}
                    min={getBenchmark("net_margin")?.min}
                    benchmark={getBenchmark("net_margin")}
                  />
                  <MetricRow
                    label="Net Income"
                    value={latest.netIncome}
                    formattedValue={formatCurrency(latest.netIncome)}
                    target={getBenchmark("net_income")?.target ?? 10000}
                    formattedTarget={formatCurrency(getBenchmark("net_income")?.target ?? 10000)}
                    min={getBenchmark("net_income")?.min}
                    benchmark={getBenchmark("net_income")}
                  />
                  {/* P&L Summary */}
                  <div className="mt-4 rounded-lg border border-border overflow-hidden">
                    <div className="bg-muted/30 px-4 py-2.5 border-b border-border">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">P&L Summary</p>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Revenue</span>
                        <span className="font-semibold tabular-nums text-green-600 dark:text-green-400">{formatCurrency(latest.revenue)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Expenses</span>
                        <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">({formatCurrency(latest.totalExpenses)})</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t border-border pt-2 mt-2">
                        <span>Net Income</span>
                        <span className={cn("tabular-nums", latest.netIncome >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                          {formatCurrency(latest.netIncome)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="mt-4">
          <Card className="border-card-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Forecast Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View detailed forecasts on the{" "}
                <a href="#/forecast" className="text-primary underline">Forecasting page</a>.
              </p>
              {latest && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Run Rate (Annualized)</p>
                    <p className="text-xl font-bold tabular-nums text-foreground">
                      {formatCurrency(latest.revenue * 52)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Monthly Run Rate</p>
                    <p className="text-xl font-bold tabular-nums text-foreground">
                      {formatCurrency(latest.revenue * 4.33)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
