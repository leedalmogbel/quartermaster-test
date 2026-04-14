import { useQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Clock, Lightbulb, MessageCircle, HelpCircle, FlaskConical, DollarSign } from "lucide-react";
import { usePractice } from "@/App";
import type { CfoScript, RdActivity, TaxPlanning } from "@shared/schema";

interface ScriptStep {
  title: string;
  duration: string;
  advisorNote: string;
  talkingPoints: string[];
  questions: string[];
}

function parseStep(json: string | null | undefined): ScriptStep | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ScriptStep;
  } catch {
    return null;
  }
}

const STEP_COLORS = [
  "bg-amber-500",
  "bg-primary",
  "bg-blue-500",
  "bg-purple-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-indigo-500",
];

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(val);
}

function parseJsonArray<T>(json: string | null | undefined): T[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface Strategy {
  id: string;
  name: string;
  savings: number;
  priority: "high" | "medium" | "low";
}

interface Step7AccordionProps {
  rdData: RdActivity | null | undefined;
  taxData: TaxPlanning | null | undefined;
}

function Step7Accordion({ rdData, taxData }: Step7AccordionProps) {
  const checkedActivities = parseJsonArray<string>(rdData?.checkedActivities);
  const strategies = parseJsonArray<Strategy>(taxData?.strategiesJson);
  const highStrategies = strategies.filter((s) => s.priority === "high");
  const hasRd = rdData && (rdData.totalCredit ?? 0) > 0;
  const hasTax = taxData && (taxData.estimatedSavings ?? 0) > 0;

  const ACTIVITY_LABELS: Record<string, string> = {
    new_treatment_protocols: "Developing new treatment protocols or care pathways",
    laser_therapy_protocols: "Testing and refining low-level laser therapy protocols",
    soft_tissue_techniques: "Developing new soft tissue manipulation techniques",
    outcome_tracking: "Systematic clinical outcome tracking and analysis",
    rehab_protocols: "Designing new rehabilitation exercise protocols",
    equipment_testing: "Testing and calibrating new diagnostic or treatment equipment",
    software_development: "Developing practice management or patient outcome software",
    imaging_analysis: "Developing new imaging analysis or documentation protocols",
    staff_training_rd: "Creating new staff training programs tied to clinical protocols",
    patient_education: "Developing new patient education materials or programs",
    workflow_improvement: "Systematic workflow improvement and testing",
    case_studies: "Documenting and publishing case studies or clinical research",
    clinical_trials: "Participating in or conducting clinical trials",
    cpd_research: "Structured CPD/CE research applied to practice improvement",
  };

  return (
    <AccordionItem value="step-7" className="border-border" data-testid="script-step-7">
      <AccordionTrigger className="hover:no-underline group">
        <div className="flex items-center gap-3 flex-1 text-left">
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold text-white shrink-0 bg-indigo-500">
            7
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-foreground">R&amp;D &amp; Tax Planning Opportunities</span>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0 mr-2 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            10 min
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pl-10 pr-2 pb-4 space-y-4">
          {/* Advisor Note */}
          <div className="flex gap-2.5 p-3 rounded-lg bg-indigo-50 border border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-800">
            <Lightbulb className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide mb-1">
                Advisor Note
              </p>
              <p className="text-sm text-indigo-800 dark:text-indigo-300">
                This step is your highest-value differentiator. Most chiropractors have never heard that they qualify for R&amp;D credits. Presenting this creates immediate perceived value and justifies your fee.
              </p>
            </div>
          </div>

          {!hasRd && !hasTax ? (
            <div className="p-4 rounded-lg bg-muted/30 border border-border text-center">
              <FlaskConical className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Complete the R&amp;D Identifier and Tax Planning pages to populate this section.
              </p>
            </div>
          ) : (
            <>
              {/* R&D Section */}
              {hasRd && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <FlaskConical className="h-3.5 w-3.5 text-indigo-500" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      R&amp;D Credit Identified
                    </p>
                    <span className="ml-auto text-sm font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(rdData.totalCredit ?? 0)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-2">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">Talking point: </span>
                      Based on our R&amp;D analysis, your practice qualifies for an estimated{" "}
                      <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(rdData.totalCredit ?? 0)}</span>{" "}
                      federal tax credit. This is a dollar-for-dollar credit — not a deduction.
                    </p>
                    {checkedActivities.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">Qualifying activities documented:</p>
                        <ul className="space-y-1">
                          {checkedActivities.map((id) => (
                            <li key={id} className="flex gap-2 text-xs text-foreground">
                              <span className="text-indigo-500 mt-0.5 shrink-0">•</span>
                              <span>{ACTIVITY_LABELS[id] ?? id}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tax Planning Section */}
              {hasTax && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <DollarSign className="h-3.5 w-3.5 text-green-500" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Tax Strategies
                    </p>
                  </div>
                  <ul className="space-y-2 mb-3">
                    {highStrategies.map((strategy) => (
                      <li key={strategy.id} className="flex justify-between gap-2 text-sm text-foreground">
                        <span className="flex gap-2">
                          <span className="text-green-500 mt-0.5 shrink-0">•</span>
                          <span>{strategy.name}</span>
                        </span>
                        <span className="font-semibold text-green-600 dark:text-green-400 tabular-nums shrink-0">
                          {formatCurrency(strategy.savings)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/10 dark:border-green-800">
                    <p className="text-sm font-bold text-green-700 dark:text-green-400">
                      Total Estimated Annual Savings: {formatCurrency(taxData.estimatedSavings ?? 0)}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Key Questions */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Key Questions
              </p>
            </div>
            <ul className="space-y-1.5 ml-1">
              {[
                "Have you ever claimed an R&D tax credit before?",
                "When was your last comprehensive tax strategy review?",
                "Are you currently using an S-Corp structure?",
              ].map((q, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/80 italic">
                  <span className="text-blue-500 not-italic mt-0.5 shrink-0">?</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

interface StepAccordionProps {
  stepNumber: number;
  stepJson: string | null | undefined;
}

function StepAccordion({ stepNumber, stepJson }: StepAccordionProps) {
  const step = parseStep(stepJson);

  if (!step) {
    return (
      <AccordionItem value={`step-${stepNumber}`} className="border-border">
        <AccordionTrigger className="text-sm text-muted-foreground hover:no-underline">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold text-white ${STEP_COLORS[(stepNumber - 1) % STEP_COLORS.length]}`}>
              {stepNumber}
            </span>
            Step {stepNumber} — No data
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <p className="text-sm text-muted-foreground px-9 pb-3">
            Script data for this step is not available.
          </p>
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <AccordionItem
      value={`step-${stepNumber}`}
      className="border-border"
      data-testid={`script-step-${stepNumber}`}
    >
      <AccordionTrigger className="hover:no-underline group">
        <div className="flex items-center gap-3 flex-1 text-left">
          <span className={`inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold text-white shrink-0 ${STEP_COLORS[(stepNumber - 1) % STEP_COLORS.length]}`}>
            {stepNumber}
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-foreground">{step.title}</span>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0 mr-2 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {step.duration}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pl-10 pr-2 pb-4 space-y-4">
          {/* Advisor Note */}
          {step.advisorNote && (
            <div className="flex gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-800">
              <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
                  Advisor Note
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300">{step.advisorNote}</p>
              </div>
            </div>
          )}

          {/* Talking Points */}
          {step.talkingPoints?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Talking Points
                </p>
              </div>
              <ul className="space-y-1.5 ml-1">
                {step.talkingPoints.map((point, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="text-primary mt-0.5 shrink-0">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Questions */}
          {step.questions?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Key Questions
                </p>
              </div>
              <ul className="space-y-1.5 ml-1">
                {step.questions.map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/80 italic">
                    <span className="text-blue-500 not-italic mt-0.5 shrink-0">?</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function CfoScript() {
  const { practiceId } = usePractice();

  const { data: script, isLoading } = useQuery<CfoScript>({
    queryKey: ["/api/practices", practiceId, "scripts", "latest"],
    queryFn: async () => {
      const res = await fetch(`/api/practices/${practiceId}/scripts/latest`);
      if (!res.ok) throw new Error("No script");
      return res.json();
    },
  });

  const { data: rdData } = useQuery<RdActivity>({
    queryKey: ["/api/practices", practiceId, "rd", 2025],
    queryFn: async () => {
      const res = await fetch(`/api/practices/${practiceId}/rd/2025`);
      if (res.status === 404) return null as any;
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    retry: false,
  });

  const { data: taxData } = useQuery<TaxPlanning>({
    queryKey: ["/api/practices", practiceId, "tax-planning", 2025],
    queryFn: async () => {
      const res = await fetch(`/api/practices/${practiceId}/tax-planning/2025`);
      if (res.status === 404) return null as any;
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">CFO Script</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {script
              ? `Week ending ${script.weekEnding} · Generated ${script.generatedAt ?? "recently"}`
              : "No script available"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <Badge variant="outline" className="text-xs">
            7 Steps
          </Badge>
        </div>
      </div>

      {!script ? (
        <Card className="border-card-border">
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">
              No CFO script has been generated for this practice yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Script header card */}
          <Card className="border-card-border bg-primary/5 border-primary/30">
            <CardContent className="py-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Weekly CFO Advisory Call Script</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Use this script to guide your client through their weekly financial review
                  </p>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">
                  Week of {script.weekEnding}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Steps Accordion */}
          <Card className="border-card-border">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-semibold">Script Steps</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <Accordion type="multiple" defaultValue={["step-1"]} className="w-full">
                {[
                  script.step1,
                  script.step2,
                  script.step3,
                  script.step4,
                  script.step5,
                  script.step6,
                ].map((stepJson, idx) => (
                  <StepAccordion
                    key={idx + 1}
                    stepNumber={idx + 1}
                    stepJson={stepJson}
                  />
                ))}
                <Step7Accordion rdData={rdData} taxData={taxData} />
              </Accordion>
            </CardContent>
          </Card>

          {/* Full script (collapsed by default) */}
          {script.scriptFull && (
            <Card className="border-card-border">
              <CardHeader className="pb-0">
                <CardTitle className="text-sm font-semibold">Full Script Text</CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <Accordion type="single" collapsible>
                  <AccordionItem value="full-script" className="border-0">
                    <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline py-1">
                      Show full script
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="mt-2 p-4 rounded-lg bg-muted/30 border border-border">
                        <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                          {script.scriptFull}
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
