import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Clock, Lightbulb, MessageCircle, HelpCircle } from "lucide-react";
import { usePractice } from "@/App";
import type { CfoScript } from "@shared/schema";

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
];

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
      const res = await apiRequest("GET", `/api/practices/${practiceId}/scripts/latest`);
      return res.json();
    },
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
            6 Steps
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
