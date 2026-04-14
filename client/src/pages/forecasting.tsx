import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { usePractice } from "@/App";
import type { Forecast } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CashflowWeek {
  week: string | number;
  weekEnding?: string;
  openingBalance?: number;
  projected_revenue?: number;
  projected_expenses?: number;
  net_cash?: number;
  cumulative?: number;
  revenue?: number;
  expenses?: number;
  netCashflow?: number;
  closingBalance?: number;
  isForecast?: boolean;
}

interface ScenarioCardProps {
  label: string;
  value: number;
  baseValue: number;
  variant: "optimistic" | "base" | "conservative";
  description: string;
}

function ScenarioCard({ label, value, baseValue, variant, description }: ScenarioCardProps) {
  const delta = baseValue > 0 ? ((value - baseValue) / baseValue) * 100 : 0;
  const isBase = variant === "base";
  const isPositive = value >= baseValue;

  const borderClass = {
    optimistic: "border-green-400 dark:border-green-600",
    base: "border-primary",
    conservative: "border-amber-400 dark:border-amber-600",
  }[variant];

  const badgeClass = {
    optimistic: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200",
    base: "bg-primary/10 text-primary border-primary/30",
    conservative: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200",
  }[variant];

  return (
    <Card className={cn("border-2", borderClass)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{label}</CardTitle>
          <Badge variant="outline" className={cn("text-[10px] font-semibold", badgeClass)}>
            {variant.charAt(0).toUpperCase() + variant.slice(1)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-bold tabular-nums text-foreground">{formatCurrency(value)}</p>
        {!isBase && (
          <div className={cn("flex items-center gap-1 mt-1 text-xs font-medium", isPositive ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="tabular-nums">{delta > 0 ? "+" : ""}{delta.toFixed(1)}% vs base</span>
          </div>
        )}
        {isBase && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Minus className="h-3 w-3" />
            <span>Baseline scenario</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Forecasting() {
  const { practiceId } = usePractice();

  const { data: forecast, isLoading } = useQuery<Forecast>({
    queryKey: ["/api/practices", practiceId, "forecast"],
    queryFn: async () => {
      const res = await fetch(`/api/practices/${practiceId}/forecast`);
      if (!res.ok) throw new Error("No forecast");
      return res.json();
    },
  });

  const cashflow: CashflowWeek[] = (() => {
    if (!forecast?.cashflowJson) return [];
    try {
      return JSON.parse(forecast.cashflowJson);
    } catch {
      return [];
    }
  })();

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Forecasting</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {forecast ? `Updated ${forecast.date}` : "No forecast data available"}
        </p>
      </div>

      {!forecast ? (
        <Card className="border-card-border">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No forecast data has been generated yet.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Scenario Cards */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">90-Day Revenue Projections</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ScenarioCard
                label="Optimistic"
                value={forecast.optimistic90day}
                baseValue={forecast.base90day}
                variant="optimistic"
                description="Best-case: strong collections, high capacity, excellent ROAS"
              />
              <ScenarioCard
                label="Base Case"
                value={forecast.base90day}
                baseValue={forecast.base90day}
                variant="base"
                description="Most likely outcome based on current trends"
              />
              <ScenarioCard
                label="Conservative"
                value={forecast.conservative90day}
                baseValue={forecast.base90day}
                variant="conservative"
                description="Downside: reduced volume, seasonal dip, or increased costs"
              />
            </div>
          </div>

          {/* 13-Week Cash Flow Table */}
          {cashflow.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">13-Week Cash Flow Projection</h2>
              <Card className="border-card-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="cashflow-table">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Period</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expenses</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Cashflow</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cumulative</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashflow.map((row, idx) => {
                        // Support both data shapes
                        const revenue = row.revenue ?? row.projected_revenue ?? 0;
                        const expenses = row.expenses ?? row.projected_expenses ?? 0;
                        const net = row.netCashflow ?? row.net_cash ?? (revenue - expenses);
                        const cumulative = row.closingBalance ?? row.cumulative ?? 0;
                        const isForecast = row.isForecast ?? true;
                        const isNegative = net < 0;
                        const weekLabel = typeof row.week === "string" ? row.week : `Week ${row.week}`;

                        return (
                          <tr
                            key={idx}
                            className={cn(
                              "border-b border-border last:border-0 hover:bg-muted/20 transition-colors",
                              isForecast && "bg-amber-50/30 dark:bg-amber-900/5"
                            )}
                            data-testid={`cashflow-row-${idx + 1}`}
                          >
                            <td className="px-4 py-2.5 text-sm text-foreground font-medium">
                              {weekLabel}
                              {row.weekEnding && (
                                <span className="ml-2 text-xs text-muted-foreground">{row.weekEnding}</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-green-600 dark:text-green-400">
                              {formatCurrency(revenue)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-red-600 dark:text-red-400">
                              ({formatCurrency(expenses)})
                            </td>
                            <td className={cn(
                              "px-4 py-2.5 text-right tabular-nums font-semibold",
                              isForecast
                                ? "text-amber-600 dark:text-amber-400"
                                : isNegative
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            )}>
                              {isNegative ? `(${formatCurrency(Math.abs(net))})` : formatCurrency(net)}
                            </td>
                            <td className={cn(
                              "px-4 py-2.5 text-right tabular-nums font-semibold",
                              cumulative < 0 ? "text-red-600 dark:text-red-400" : "text-foreground"
                            )}>
                              {formatCurrency(cumulative)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {cashflow.length > 0 && (
                      <tfoot>
                        <tr className="bg-muted/40 border-t border-border font-bold">
                          <td className="px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
                            Total
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-green-600 dark:text-green-400">
                            {formatCurrency(cashflow.reduce((s, r) => s + (r.revenue ?? r.projected_revenue ?? 0), 0))}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-red-600 dark:text-red-400">
                            ({formatCurrency(cashflow.reduce((s, r) => s + (r.expenses ?? r.projected_expenses ?? 0), 0))})
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-amber-600 dark:text-amber-400">
                            {formatCurrency(cashflow.reduce((s, r) => s + (r.netCashflow ?? r.net_cash ?? 0), 0))}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-foreground">
                            {formatCurrency(cashflow[cashflow.length - 1]?.cumulative ?? cashflow[cashflow.length - 1]?.closingBalance ?? 0)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
