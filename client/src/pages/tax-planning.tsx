import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Receipt,
  TrendingUp,
  DollarSign,
  Lightbulb,
  Save,
  Info,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePractice } from "@/App";
import type { TaxPlanning as TaxPlanningType } from "@shared/schema";
import { cn } from "@/lib/utils";

const TAX_YEARS = [2025, 2024, 2023];

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

interface Strategy {
  id: string;
  name: string;
  savings: number;
  priority: "high" | "medium" | "low";
}

function parseStrategies(json: string | null | undefined): Strategy[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const PRIORITY_CONFIG = {
  high: { label: "High", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  low: { label: "Low", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
};

const STATUS_CONFIG = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300" },
  presented: { label: "Presented", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300" },
  implemented: { label: "Implemented", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300" },
};

const TIER_CONFIG = {
  lite: { label: "Tax Planning Lite", className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-300" },
  comprehensive: { label: "Comprehensive", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300" },
};

function getTierRecommendation(collections: number) {
  if (collections < 500000) {
    return {
      tier: "Tax Planning Lite",
      price: "$297/mo add-on",
      description: "Entity review, QBI deduction, basic retirement planning",
    };
  } else if (collections <= 1500000) {
    return {
      tier: "Tax Planning Comprehensive",
      price: "$597/mo add-on",
      description: "Full strategy: R&D credit, Augusta Rule, Roth conversion, cost segregation",
    };
  } else {
    return {
      tier: "Tax Planning Comprehensive + R&D Coaching",
      price: "$897/mo add-on",
      description: "Everything in Comprehensive plus dedicated R&D documentation coaching",
    };
  }
}

function StrategyTalkingPoint({ strategy, taxData }: { strategy: Strategy; taxData: TaxPlanningType }) {
  const collections = taxData.annualCollections ?? 0;

  const TALKING_POINTS: Record<string, string> = {
    s_corp_salary: `Based on your collections of ${formatCurrency(collections)}, your reasonable S-Corp compensation should be optimized to minimize self-employment tax. This saves you approximately ${formatCurrency(strategy.savings)} in SE taxes annually.`,
    qbi_deduction: `As a pass-through entity, you likely qualify for the Section 199A deduction — up to 20% of qualified business income. At your income level, that's approximately ${formatCurrency(taxData.qbiDeduction ?? 0)} in additional deductions, saving you ${formatCurrency(strategy.savings)}.`,
    rd_credit: `We identified qualifying R&D activities in your practice — new treatment protocols, equipment testing, and outcome tracking. Your estimated credit is ${formatCurrency(strategy.savings)}. This is a dollar-for-dollar reduction in your tax bill, not just a deduction.`,
    retirement: `A Solo 401(k) lets you contribute up to $69,000 per year (2025). At your income level, this could reduce your taxable income by ${formatCurrency(strategy.savings)} and generate meaningful tax savings. A Defined Benefit Plan can push this even higher.`,
    augusta_rule: `Under Section 280A, you can rent your personal residence to your practice for up to ${taxData.augustaRuleDays ?? 14} days per year, tax-free. At fair market rental rates, that's ${formatCurrency(taxData.augustaRuleSavings ?? 0)} in tax-free income to you personally.`,
    roth_conversion: `There's a Roth conversion opportunity this year. Converting ${formatCurrency(taxData.rothConversionAmount ?? 0)} now — while in a lower bracket — saves approximately ${formatCurrency(strategy.savings)} in future taxes by moving growth to a tax-free account.`,
    cost_segregation: `A cost segregation study on your building can accelerate depreciation, generating ${formatCurrency(strategy.savings)} in additional deductions. This is most valuable if you own your building or recently refinanced.`,
  };

  return (
    <div className="flex gap-2 text-sm text-foreground">
      <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <span>{TALKING_POINTS[strategy.id] ?? `Implementing this strategy could save approximately ${formatCurrency(strategy.savings)} annually.`}</span>
    </div>
  );
}

export default function TaxPlanningPage() {
  const { practiceId } = usePractice();
  const { toast } = useToast();

  const [taxYear, setTaxYear] = useState(2025);
  const [advisorNotes, setAdvisorNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"draft" | "presented" | "implemented">("draft");

  const { data: taxData, isLoading } = useQuery<TaxPlanningType>({
    queryKey: ["/api/practices", practiceId, "tax-planning", taxYear],
    queryFn: async () => {
      const res = await fetch(`/api/practices/${practiceId}/tax-planning/${taxYear}`);
      if (res.status === 404) return null as any;
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (taxData) {
      setAdvisorNotes(taxData.advisorNotes ?? "");
      setNotes(taxData.notes ?? "");
      setStatus((taxData.status as any) ?? "draft");
    } else {
      setAdvisorNotes("");
      setNotes("");
      setStatus("draft");
    }
  }, [taxData, taxYear]);

  const { mutate: saveTax, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const payload = {
        ...taxData,
        practiceId,
        taxYear,
        advisorNotes,
        notes,
        status,
        updatedAt: new Date().toISOString(),
      };
      const res = await apiRequest("POST", `/api/practices/${practiceId}/tax-planning`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practices", practiceId, "tax-planning", taxYear] });
      toast({ title: "Saved", description: "Tax planning notes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save tax planning data.", variant: "destructive" });
    },
  });

  const strategies = parseStrategies(taxData?.strategiesJson);
  const highStrategies = strategies.filter((s) => s.priority === "high");
  const collections = taxData?.annualCollections ?? 0;
  const tierRec = getTierRecommendation(collections);
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const planTierCfg = TIER_CONFIG[taxData?.planTier ?? "lite"] ?? TIER_CONFIG.lite;

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tax Planning</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Strategy identification and advisor coaching script
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={taxYear}
            onChange={(e) => setTaxYear(Number(e.target.value))}
            data-testid="select-tax-year-tp"
          >
            {TAX_YEARS.map((y) => (
              <option key={y} value={y}>{y} Tax Year</option>
            ))}
          </select>
          {taxData && (
            <Badge variant="outline" className={cn("text-xs", planTierCfg.className)}>
              {planTierCfg.label}
            </Badge>
          )}
          <Badge variant="outline" className={cn("text-xs", statusCfg.className)}>
            {statusCfg.label}
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !taxData ? (
        <Card className="border-card-border">
          <CardContent className="py-12 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-foreground">No tax planning data for {taxYear}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tax planning data will appear here once entered for this practice and year.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-card-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Annual Collections</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(taxData.annualCollections ?? 0)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{taxData.entityType ?? "S-Corp"}</p>
              </CardContent>
            </Card>
            <Card className="border-card-border bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800">
              <CardContent className="p-4">
                <p className="text-xs text-green-700 dark:text-green-400 uppercase tracking-wider mb-1">Estimated Tax Savings</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400 tabular-nums">
                  {formatCurrency(taxData.estimatedSavings ?? 0)}
                </p>
                <p className="text-[10px] text-green-600 dark:text-green-500 mt-0.5">Annual across all strategies</p>
              </CardContent>
            </Card>
            <Card className="border-card-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Strategies Identified</p>
                <p className="text-xl font-bold tabular-nums">{strategies.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{highStrategies.length} high priority</p>
              </CardContent>
            </Card>
            <Card className="border-card-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Plan Tier</p>
                <p className="text-sm font-bold">{planTierCfg.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{taxYear} tax year</p>
              </CardContent>
            </Card>
          </div>

          {/* Tier Recommendation */}
          {collections > 0 && (
            <div className="flex gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-800">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-0.5">
                  Recommended Add-On
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <span className="font-semibold">{tierRec.tier}</span>{" "}
                  <span className="font-bold text-amber-700 dark:text-amber-400">{tierRec.price}</span>
                  {" — "}{tierRec.description}
                </p>
              </div>
            </div>
          )}

          {/* Strategy Table */}
          {strategies.length > 0 && (
            <Card className="border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Tax Strategies Identified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table data-testid="strategy-table">
                    <TableHeader>
                      <TableRow className="bg-muted/40 border-b border-border">
                        <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Strategy</TableHead>
                        <TableHead className="text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Est. Annual Savings</TableHead>
                        <TableHead className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Priority</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {strategies.map((strategy) => {
                        const prioCfg = PRIORITY_CONFIG[strategy.priority] ?? PRIORITY_CONFIG.low;
                        return (
                          <TableRow key={strategy.id} className="border-b border-border hover:bg-muted/20 transition-colors" data-testid={`strategy-row-${strategy.id}`}>
                            <TableCell className="py-2.5">
                              <p className="text-sm font-medium text-foreground">{strategy.name}</p>
                            </TableCell>
                            <TableCell className="py-2.5 text-right tabular-nums">
                              <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(strategy.savings)}
                              </span>
                            </TableCell>
                            <TableCell className="py-2.5 text-center">
                              <Badge variant="outline" className={cn("text-[10px]", prioCfg.className)}>
                                {prioCfg.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Total row */}
                      <TableRow className="bg-muted/20 border-t-2 border-border">
                        <TableCell className="py-2.5">
                          <p className="text-sm font-semibold text-foreground">Total Estimated Savings</p>
                        </TableCell>
                        <TableCell className="py-2.5 text-right tabular-nums">
                          <span className="text-sm font-bold text-green-700 dark:text-green-400">
                            {formatCurrency(taxData.estimatedSavings ?? 0)}
                          </span>
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Advisor Coaching Script */}
          {highStrategies.length > 0 && (
            <Card className="border-card-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  CFO Advisor Coaching Script
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Talking points for presenting each high-priority strategy to the client
                </p>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" defaultValue={["high-strategies"]}>
                  <AccordionItem value="high-strategies" className="border-border">
                    <AccordionTrigger className="hover:no-underline text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-[10px]">
                          High Priority
                        </Badge>
                        <span className="text-sm font-semibold">{highStrategies.length} strategies</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {highStrategies.map((strategy) => (
                          <div key={strategy.id} className="pl-2 border-l-2 border-primary/30 space-y-1.5">
                            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                              {strategy.name}
                            </p>
                            <StrategyTalkingPoint strategy={strategy} taxData={taxData} />
                          </div>
                        ))}
                        <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/10 dark:border-green-800">
                          <p className="text-sm font-bold text-green-700 dark:text-green-400">
                            Total Estimated Annual Savings: {formatCurrency(taxData.estimatedSavings ?? 0)}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                            Across all identified strategies for {taxYear}
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {strategies.filter((s) => s.priority === "medium").length > 0 && (
                    <AccordionItem value="medium-strategies" className="border-border">
                      <AccordionTrigger className="hover:no-underline text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px]">
                            Medium Priority
                          </Badge>
                          <span className="text-sm font-semibold">
                            {strategies.filter((s) => s.priority === "medium").length} strategies
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {strategies.filter((s) => s.priority === "medium").map((strategy) => (
                            <div key={strategy.id} className="pl-2 border-l-2 border-amber-300 space-y-1.5">
                              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                                {strategy.name}
                              </p>
                              <StrategyTalkingPoint strategy={strategy} taxData={taxData} />
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {strategies.filter((s) => s.priority === "low").length > 0 && (
                    <AccordionItem value="low-strategies" className="border-border">
                      <AccordionTrigger className="hover:no-underline text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-0 text-[10px]">
                            Low Priority
                          </Badge>
                          <span className="text-sm font-semibold">
                            {strategies.filter((s) => s.priority === "low").length} strategies
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {strategies.filter((s) => s.priority === "low").map((strategy) => (
                            <div key={strategy.id} className="pl-2 border-l-2 border-gray-300 dark:border-gray-600 space-y-1.5">
                              <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                                {strategy.name}
                              </p>
                              <StrategyTalkingPoint strategy={strategy} taxData={taxData} />
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Advisor Notes */}
          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Advisor Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Private advisor notes (not visible to client)</p>
                <Textarea
                  value={advisorNotes}
                  onChange={(e) => setAdvisorNotes(e.target.value)}
                  onBlur={() => saveTax()}
                  placeholder="Notes for the advisor — client reception, follow-up items, observations..."
                  rows={3}
                  className="text-sm resize-none"
                  data-testid="textarea-advisor-notes"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Client-facing notes</p>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes to share with the client..."
                  rows={2}
                  className="text-sm resize-none"
                  data-testid="textarea-client-notes"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-muted-foreground shrink-0">Status</label>
                <select
                  className="text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  data-testid="select-tp-status"
                >
                  <option value="draft">Draft</option>
                  <option value="presented">Presented</option>
                  <option value="implemented">Implemented</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => saveTax()}
              disabled={isSaving}
              className="gap-2"
              data-testid="button-save-tax-planning"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Tax Planning"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
