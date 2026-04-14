import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckSquare, Clock, User, AlertTriangle, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePractice } from "@/App";
import type { ActionItem } from "@shared/schema";
import { cn } from "@/lib/utils";

type Status = "open" | "in_progress" | "completed";

const PRIORITY_CONFIG = {
  1: {
    label: "High",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  2: {
    label: "Medium",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  3: {
    label: "Low",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
} as const;

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  open: {
    label: "Open",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300 border-gray-200 dark:border-gray-700",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  },
};

function priorityLabel(p: number) {
  return PRIORITY_CONFIG[p as 1 | 2 | 3] ?? PRIORITY_CONFIG[3];
}

interface ActionRowProps {
  item: ActionItem;
  onStatusChange: (id: number, status: Status) => void;
  isPending: boolean;
}

function ActionRow({ item, onStatusChange, isPending }: ActionRowProps) {
  const { label: prioLabel, className: prioClass } = priorityLabel(item.priority);
  const statusConfig = STATUS_CONFIG[item.status as Status] ?? STATUS_CONFIG.open;

  return (
    <tr
      className={cn(
        "border-b border-border hover:bg-muted/20 transition-colors",
        item.status === "completed" && "opacity-60"
      )}
      data-testid={`action-row-${item.id}`}
    >
      <td className="px-4 py-3">
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border", prioClass)}>
          {prioLabel}
        </span>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className={cn("text-sm font-medium text-foreground", item.status === "completed" && "line-through")}>{item.title}</p>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">{item.description}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {item.owner ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {item.owner}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {item.dueDate ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
            <Clock className="h-3 w-3" />
            {item.dueDate}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Select
          value={item.status ?? "open"}
          onValueChange={(v) => onStatusChange(item.id, v as Status)}
          disabled={isPending}
        >
          <SelectTrigger
            className="h-7 w-32 text-xs border-0 bg-transparent p-0 focus:ring-0 gap-1"
            data-testid={`status-select-${item.id}`}
          >
            <Badge variant="outline" className={cn("text-[10px] font-semibold cursor-pointer", statusConfig.className)}>
              {statusConfig.label}
            </Badge>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </td>
    </tr>
  );
}

export default function ActionItems() {
  const { practiceId } = usePractice();
  const { toast } = useToast();

  const { data: actions, isLoading } = useQuery<ActionItem[]>({
    queryKey: ["/api/practices", practiceId, "actions"],
    queryFn: async () => {
      const res = await fetch(`/api/practices/${practiceId}/actions`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: Status }) => {
      const res = await apiRequest("PATCH", `/api/actions/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practices", practiceId, "actions"] });
      toast({ title: "Status updated", description: "Action item status has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const open = actions?.filter((a) => a.status === "open") ?? [];
  const inProgress = actions?.filter((a) => a.status === "in_progress") ?? [];
  const completed = actions?.filter((a) => a.status === "completed") ?? [];

  const sorted = [
    ...inProgress.sort((a, b) => a.priority - b.priority),
    ...open.sort((a, b) => a.priority - b.priority),
    ...completed.sort((a, b) => a.priority - b.priority),
  ];

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Action Items</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {actions ? `${actions.length} total — ${open.length} open, ${inProgress.length} in progress, ${completed.length} completed` : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {open.length > 0 && (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {open.length} Open
            </Badge>
          )}
          {completed.length > 0 && (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              {completed.length} Done
            </Badge>
          )}
        </div>
      </div>

      <Card className="border-card-border">
        {isLoading ? (
          <CardContent className="py-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </CardContent>
        ) : !sorted.length ? (
          <CardContent className="py-12 text-center">
            <CheckSquare className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">No action items found for this practice.</p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="actions-table">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Priority</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32">Owner</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Due Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-36">Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <ActionRow
                    key={item.id}
                    item={item}
                    onStatusChange={(id, status) => updateStatus({ id, status })}
                    isPending={isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
