import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  trend?: "up-good" | "down-good"; // up-good: higher is better; down-good: lower is better
  className?: string;
  "data-testid"?: string;
}

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  loading,
  trend = "up-good",
  className,
  "data-testid": testId,
}: KpiCardProps) {
  const hasDelta = delta != null;
  const isPositive = trend === "up-good" ? (delta ?? 0) >= 0 : (delta ?? 0) <= 0;
  const isNeutral = delta === 0;

  return (
    <Card
      className={cn("relative overflow-hidden border-card-border bg-card", className)}
      data-testid={testId}
    >
      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {label}
              </p>
              {icon && (
                <span className="text-muted-foreground opacity-60">{icon}</span>
              )}
            </div>

            <p
              className="text-xl font-bold tabular-nums text-foreground leading-tight"
              data-testid={testId ? `${testId}-value` : undefined}
            >
              {value}
            </p>

            {hasDelta && (
              <div
                className={cn(
                  "flex items-center gap-1 mt-1.5 text-xs font-medium",
                  isNeutral
                    ? "text-muted-foreground"
                    : isPositive
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {!isNeutral &&
                  (isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  ))}
                <span className="tabular-nums">
                  {delta! > 0 ? "+" : ""}
                  {deltaLabel ?? `${delta!.toFixed(1)}%`}
                </span>
                <span className="text-muted-foreground font-normal">vs last week</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
