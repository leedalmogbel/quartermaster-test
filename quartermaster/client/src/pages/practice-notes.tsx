import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StickyNote, User, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePractice } from "@/App";
import type { PracticeNote } from "@shared/schema";

export default function PracticeNotes() {
  const { practiceId } = usePractice();
  const { toast } = useToast();
  const [noteText, setNoteText] = useState("");
  const [createdBy, setCreatedBy] = useState("");

  const { data: notes, isLoading } = useQuery<PracticeNote[]>({
    queryKey: ["/api/practices", practiceId, "notes"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/practices/${practiceId}/notes`);
      return res.json();
    },
  });

  const { mutate: saveNote, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/practices/${practiceId}/notes`, {
        noteText,
        createdBy: createdBy || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/practices", practiceId, "notes"] });
      setNoteText("");
      toast({ title: "Note saved", description: "Practice note has been added." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save note.", variant: "destructive" });
    },
  });

  function formatTimestamp(iso: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <div>
        <h1 className="text-xl font-bold text-foreground">Practice Notes</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {notes ? `${notes.length} note${notes.length !== 1 ? "s" : ""}` : "Loading..."}
        </p>
      </div>

      {/* New Note Form */}
      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">Add a Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="created-by" className="text-xs text-muted-foreground">Your Name or Email</Label>
            <input
              id="created-by"
              type="text"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="e.g. advisor@quartermastertax.com"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note-text" className="text-xs text-muted-foreground">Note</Label>
            <Textarea
              id="note-text"
              placeholder="e.g. Dr. Chen prefers email contact. Renewal due June 2026."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
            />
          </div>
          <Button
            onClick={() => saveNote()}
            disabled={isPending || !noteText.trim()}
            size="sm"
          >
            {isPending ? "Saving..." : "Save Note"}
          </Button>
        </CardContent>
      </Card>

      {/* Notes List */}
      <Card className="border-card-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">All Notes</CardTitle>
        </CardHeader>
        {isLoading ? (
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </CardContent>
        ) : !notes?.length ? (
          <CardContent className="py-12 text-center">
            <StickyNote className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No notes yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first note above.</p>
          </CardContent>
        ) : (
          <CardContent className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-md border border-border p-4 space-y-2"
              >
                <p className="text-sm text-foreground whitespace-pre-wrap">{note.noteText}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {note.createdBy && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {note.createdBy}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(note.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
