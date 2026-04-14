import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  FlaskConical,
  DollarSign,
  TrendingUp,
  Save,
  AlertCircle,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePractice } from "@/App";
import type { RdActivity } from "@shared/schema";
import { cn } from "@/lib/utils";

const CHIRO_RD_ACTIVITIES = [
  {
    category: "Clinical Treatment Development",
    activities: [
      { id: "new_treatment_protocols", label: "Developing new treatment protocols or care pathways", example: "e.g., combining ART with instrument-assisted mobilization in a new sequence" },
      { id: "laser_therapy_protocols", label: "Testing and refining low-level laser therapy protocols", example: "e.g., dosage, frequency, and application patterns for specific conditions" },
      { id: "soft_tissue_techniques", label: "Developing new soft tissue manipulation techniques", example: "e.g., proprietary adjusting sequences or hybrid technique development" },
      { id: "outcome_tracking", label: "Systematic clinical outcome tracking and analysis", example: "e.g., measuring treatment efficacy across patient cohorts to refine protocols" },
      { id: "rehab_protocols", label: "Designing new rehabilitation exercise protocols", example: "e.g., post-adjustment home exercise programs tested for outcomes" },
    ],
  },
  {
    category: "Technology & Equipment",
    activities: [
      { id: "equipment_testing", label: "Testing and calibrating new diagnostic or treatment equipment", example: "e.g., evaluating nerve conduction devices, decompression tables, or shockwave units" },
      { id: "software_development", label: "Developing practice management or patient outcome software", example: "e.g., custom intake forms, outcome dashboards, or patient communication tools" },
      { id: "imaging_analysis", label: "Developing new imaging analysis or documentation protocols", example: "e.g., standardized X-ray measurement systems or digital posture analysis methods" },
    ],
  },
  {
    category: "Business Process & Training",
    activities: [
      { id: "staff_training_rd", label: "Creating new staff training programs tied to clinical protocols", example: "e.g., CA training curriculum for new exam procedures" },
      { id: "patient_education", label: "Developing new patient education materials or programs", example: "e.g., condition-specific education series tested for patient compliance outcomes" },
      { id: "workflow_improvement", label: "Systematic workflow improvement and testing", example: "e.g., testing different patient flow models to improve throughput and outcomes" },
    ],
  },
  {
    category: "Research & Documentation",
    activities: [
      { id: "case_studies", label: "Documenting and publishing case studies or clinical research", example: "e.g., formal case study write-ups submitted to journals or presentations" },
      { id: "clinical_trials", label: "Participating in or conducting clinical trials", example: "e.g., IRB-approved studies involving treatment comparisons" },
      { id: "cpd_research", label: "Structured CPD/CE research applied to practice improvement", example: "e.g., implementing and testing a new technique learned at a conference" },
    ],
  },
];

const TAX_YEARS = [2025, 2024, 2023];

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

const STATUS_CONFIG = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300" },
  in_review: { label: "In Review", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300" },
  filed: { label: "Filed", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300" },
};

export default function RdIdentifier() {
  const { practiceId } = usePractice();
  const { toast } = useToast();

  const [taxYear, setTaxYear] = useState(2025);
  const [checkedActivities, setCheckedActivities] = useState<string[]>([]);
  const [qreWages, setQreWages] = useState(0);
  const [qreSupplies, setQreSupplies] = useState(0);
  const [qreContractors, setQreContractors] = useState(0);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"draft" | "in_review" | "filed">("draft");

  // Calculated values
  const totalQre = qreWages + qreSupplies + qreContractors * 0.65;
  const federalCredit = totalQre * 0.065;
  const stateCredit = totalQre * 0.02;
  const totalCredit = federalCredit + stateCredit;

  const { data: rdData, isLoading } = useQuery<RdActivity>({
    queryKey: ["/api/practices", practiceId, "rd", taxYear],
    queryFn: async () => {
      const res = await fetch(`/api/practices/${practiceId}/rd/${taxYear}`);
      if (res.status === 404) return null as any;
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    retry: false,
  });

  // Populate form when data loads
  useEffect(() => {
    if (rdData) {
      try {
        const parsed = JSON.parse(rdData.checkedActivities || "[]");
        setCheckedActivities(Array.isArray(parsed) ? parsed : []);
      } catch {
        setCheckedActivities([]);
      }
      setQreWages(rdData.qreWages ?? 0);
      setQreSupplies(rdData.qreSupplies ?? 0);
      setQreContractors(rdData.qreContractors ?? 0);
      setNotes(rdData.notes ?? "");
      setStatus((rdData.status as any) ?? "draft");
    } else {
      setCheckedActivities([]);
      setQreWages(0);
      setQreSupplies(0);
      setQreContractors(0);
      setNotes("");
      setStatus("draft");
    }
  }, [rdData, taxYear]);

  const { mutate: saveRd, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const payload = {
        practiceId,
        taxYear,
        checkedActivities: JSON.stringify(checkedActivities),
        qreWages,
        qreSupplies,
        qreContractors,
        totalQre,
        estimatedCredit: federalCredit,
        stateCredit,
        totalCredit,
        notes,
        status,
        updatedAt: new Date().toISOString(),
      };
      const res = await apiRequest("POST", `/api/practices/${practiceId}/rd`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practices", practiceId, "rd", taxYear] });
      toast({ title: "Saved", description: "R&D activity data has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save R&D data.", variant: "destructive" });
    },
  });

  const toggleActivity = (id: string) => {
    setCheckedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const categoryTabValue = (cat: string) =>
    cat.toLowerCase().replace(/[^a-z]+/g, "-");

  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">R&amp;D Tax Credit Identifier</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Section 41 qualifying research expenses — chiropractic
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={taxYear}
            onChange={(e) => setTaxYear(Number(e.target.value))}
            data-testid="select-tax-year"
          >
            {TAX_YEARS.map((y) => (
              <option key={y} value={y}>{y} Tax Year</option>
            ))}
          </select>
          <Badge variant="outline" className={cn("text-xs", statusCfg.className)}>
            {statusCfg.label}
          </Badge>
        </div>
      </div>

      {/* Credit Estimate KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-card-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total QRE</p>
            <p className="text-xl font-bold tabular-nums">{formatCurrency(totalQre)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Qualified research expenses</p>
          </CardContent>
        </Card>
        <Card className="border-card-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Federal Credit (~6.5%)</p>
            <p className={cn("text-xl font-bold tabular-nums", federalCredit > 0 ? "text-green-600 dark:text-green-400" : "")}>
              {formatCurrency(federalCredit)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Dollar-for-dollar tax reduction</p>
          </CardContent>
        </Card>
        <Card className="border-card-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">State Credit (~2%)</p>
            <p className={cn("text-xl font-bold tabular-nums", stateCredit > 0 ? "text-green-600 dark:text-green-400" : "")}>
              {formatCurrency(stateCredit)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Varies by state</p>
          </CardContent>
        </Card>
        <Card className="border-card-border bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800">
          <CardContent className="p-4">
            <p className="text-xs text-green-700 dark:text-green-400 uppercase tracking-wider mb-1">Total Credit</p>
            <p className={cn("text-xl font-bold tabular-nums", totalCredit > 0 ? "text-green-700 dark:text-green-400" : "text-muted-foreground")}>
              {formatCurrency(totalCredit)}
            </p>
            <p className="text-[10px] text-green-600 dark:text-green-500 mt-0.5">Federal + state estimate</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <>
          {/* Activity Checklist */}
          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                Qualifying R&amp;D Activity Checklist
                <Badge variant="outline" className="ml-auto text-[10px]">
                  {checkedActivities.length} selected
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Check all activities that apply to this practice. These document what qualifies — they don't calculate your credit.
              </p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={categoryTabValue(CHIRO_RD_ACTIVITIES[0].category)}>
                <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto mb-4">
                  {CHIRO_RD_ACTIVITIES.map((group) => (
                    <TabsTrigger
                      key={group.category}
                      value={categoryTabValue(group.category)}
                      className="text-xs py-1.5 px-2 whitespace-normal text-center leading-tight"
                    >
                      {group.category}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {CHIRO_RD_ACTIVITIES.map((group) => (
                  <TabsContent key={group.category} value={categoryTabValue(group.category)}>
                    <div className="space-y-3">
                      {group.activities.map((activity) => (
                        <div
                          key={activity.id}
                          className={cn(
                            "flex gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                            checkedActivities.includes(activity.id)
                              ? "bg-primary/5 border-primary/30"
                              : "border-border hover:bg-muted/30"
                          )}
                          onClick={() => toggleActivity(activity.id)}
                          data-testid={`activity-${activity.id}`}
                        >
                          <Checkbox
                            id={activity.id}
                            checked={checkedActivities.includes(activity.id)}
                            onCheckedChange={() => toggleActivity(activity.id)}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="min-w-0">
                            <Label
                              htmlFor={activity.id}
                              className="text-sm font-medium text-foreground cursor-pointer"
                            >
                              {activity.label}
                            </Label>
                            <p className="text-xs text-muted-foreground italic mt-0.5">{activity.example}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* QRE Dollar Entry */}
          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                Qualified Research Expenses (QRE)
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Enter dollar amounts for each QRE category. Credit is calculated automatically.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Wages allocated to R&amp;D activities ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={qreWages || ""}
                    onChange={(e) => setQreWages(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="text-sm"
                    data-testid="input-qre-wages"
                  />
                  <p className="text-[10px] text-muted-foreground">Estimate: hours spent × hourly rate</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Supplies consumed in R&amp;D ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={qreSupplies || ""}
                    onChange={(e) => setQreSupplies(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="text-sm"
                    data-testid="input-qre-supplies"
                  />
                  <p className="text-[10px] text-muted-foreground">Materials used in testing, not for patient treatment</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Contract research (65% rule applies) ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={qreContractors || ""}
                    onChange={(e) => setQreContractors(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="text-sm"
                    data-testid="input-qre-contractors"
                  />
                  <p className="text-[10px] text-muted-foreground">Outside researchers, labs, or consultants</p>
                </div>
              </div>

              {/* Credit breakdown */}
              {totalQre > 0 && (
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Credit Calculation</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Total QRE</p>
                      <p className="font-semibold tabular-nums">{formatCurrency(totalQre)}</p>
                      <p className="text-[10px] text-muted-foreground">Wages + Supplies + (Contractors × 0.65)</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Federal (×6.5%)</p>
                      <p className="font-semibold text-green-600 dark:text-green-400 tabular-nums">{formatCurrency(federalCredit)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">State (×2%)</p>
                      <p className="font-semibold text-green-600 dark:text-green-400 tabular-nums">{formatCurrency(stateCredit)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Credit</p>
                      <p className="font-bold text-green-700 dark:text-green-400 tabular-nums">{formatCurrency(totalCredit)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes & Status */}
          <Card className="border-card-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Documentation Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe the R&D activities, documentation methods, and any supporting evidence..."
                  rows={4}
                  className="text-sm resize-none"
                  data-testid="textarea-rd-notes"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-xs font-medium shrink-0">Status</Label>
                <select
                  className="text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  data-testid="select-rd-status"
                >
                  <option value="draft">Draft</option>
                  <option value="in_review">In Review</option>
                  <option value="filed">Filed</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => saveRd()}
              disabled={isSaving}
              className="gap-2"
              data-testid="button-save-rd"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save R&D Data"}
            </Button>
          </div>

          {/* Disclaimer */}
          <div className="flex gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-0.5">Disclaimer</p>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                This tool is for estimation purposes only. R&amp;D tax credit claims require proper documentation and should be reviewed by a qualified tax professional before filing.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
