import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePractice } from "@/App";
import type { Practice, WeeklyReport, MarketingDataRow } from "@shared/schema";
import { formatCurrency, formatPercent, formatRoas } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PracticeSummary extends Practice {
  latestReport: WeeklyReport | null;
  latestMarketing: MarketingDataRow | null;
  openActions: number;
}

function PlanBadge({ tier }: { tier: string | null }) {
  const config = {
    enterprise: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200",
    growth: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200",
    starter: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200",
  } as Record<string, string>;

  return (
    <Badge variant="outline" className={cn("text-[10px] capitalize", config[tier ?? "starter"])}>
      {tier ?? "starter"}
    </Badge>
  );
}

export default function Admin() {
  const { setPracticeId } = usePractice();

  const { data: summaries, isLoading } = useQuery<PracticeSummary[]>({
    queryKey: ["/api/admin/summary"],
  });

  const totalPractices = summaries?.length ?? 0;
  const totalOpenActions = summaries?.reduce((s, p) => s + p.openActions, 0) ?? 0;
  const avgMargin = summaries?.length
    ? summaries.reduce((s, p) => s + (p.latestReport?.netMargin ?? 0), 0) / summaries.length
    : 0;
  const totalRevenue = summaries?.reduce((s, p) => s + (p.latestReport?.revenue ?? 0), 0) ?? 0;

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">All Clients</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? "Loading..." : `${totalPractices} practices across the platform`}
        </p>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-card-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Practices</p>
            <p className="text-xl font-bold tabular-nums">{isLoading ? "—" : totalPractices}</p>
          </CardContent>
        </Card>
        <Card className="border-card-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Revenue (wk)</p>
            <p className="text-xl font-bold tabular-nums">{isLoading ? "—" : formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-card-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg Net Margin</p>
            <p className="text-xl font-bold tabular-nums">{isLoading ? "—" : formatPercent(avgMargin)}</p>
          </CardContent>
        </Card>
        <Card className="border-card-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Open Actions</p>
            <p className={cn("text-xl font-bold tabular-nums", totalOpenActions > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400")}>
              {isLoading ? "—" : totalOpenActions}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Practices Table */}
      <Card className="border-card-border">
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4" />
            Practice Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="admin-practices-table">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Practice</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Coll. Rate</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Margin</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ROAS</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Open Actions</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Integrations</th>
                  </tr>
                </thead>
                <tbody>
                  {(summaries ?? []).map((practice) => {
                    const r = practice.latestReport;
                    const m = practice.latestMarketing;
                    const blendedRoas = m
                      ? (() => {
                          const gRev = (m.googleRoas ?? 0) * (m.googleSpend ?? 0);
                          const fRev = (m.fbRoas ?? 0) * (m.fbSpend ?? 0);
                          const total = (m.googleSpend ?? 0) + (m.fbSpend ?? 0);
                          return total > 0 ? (gRev + fRev) / total : null;
                        })()
                      : null;

                    return (
                      <tr
                        key={practice.id}
                        className="border-b border-border hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => setPracticeId(practice.id)}
                        data-testid={`practice-row-${practice.id}`}
                        title="Click to view this practice"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
                              {practice.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{practice.practiceType}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <PlanBadge tier={practice.planTier} />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {r ? (
                            <span className="text-sm font-semibold">{formatCurrency(r.revenue)}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {r ? (
                            <span className={cn("text-sm font-semibold", r.collectionRate >= 95 ? "text-green-600 dark:text-green-400" : r.collectionRate >= 90 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
                              {formatPercent(r.collectionRate)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {r ? (
                            <span className={cn("text-sm font-semibold", r.netMargin >= 20 ? "text-green-600 dark:text-green-400" : r.netMargin >= 10 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
                              {formatPercent(r.netMargin)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {blendedRoas != null ? (
                            <span className={cn("text-sm font-semibold", blendedRoas >= 3 ? "text-green-600 dark:text-green-400" : blendedRoas >= 2 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
                              {formatRoas(blendedRoas)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {practice.openActions > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3" />
                              {practice.openActions}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3" />
                              0
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <div title="QuickBooks">
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", practice.qbConnected ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground")}>
                                QB
                              </span>
                            </div>
                            <div title="Google Ads">
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", practice.googleAdsConnected ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-muted text-muted-foreground")}>
                                G
                              </span>
                            </div>
                            <div title="Facebook Ads">
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", practice.fbConnected ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-muted text-muted-foreground")}>
                                FB
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
