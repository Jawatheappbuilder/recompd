import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/recomp/core";
import { LogWeightSheet } from "@/components/recomp/progress/bodyweight";
import { InlineEmpty, SubHeader } from "@/components/recomp/progress/progress-widgets";
import { deleteBodyweight, formatDay, formatKg, formatTime, useTrainingData, type BodyweightEntry } from "@/lib/training-data";

export const Route = createFileRoute("/progress/bodyweight")({
  head: () => ({ meta: [{ title: "Bodyweight History — RECOMP'D" }, { name: "description", content: "Every bodyweight entry you've logged, with edit and delete." }, { property: "og:title", content: "Bodyweight History — RECOMP'D" }, { property: "og:description", content: "Every bodyweight entry you've logged, with edit and delete." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: BodyweightPage,
});

function BodyweightPage() {
  const data = useTrainingData();
  const [editing, setEditing] = useState<BodyweightEntry | undefined>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [removing, setRemoving] = useState<BodyweightEntry | null>(null);
  const entries = data ? [...data.bodyweight].reverse() : [];
  return (
    <Screen>
      <SubHeader title="Bodyweight" subtitle={data ? `${entries.length} entries` : undefined} action={<Button variant="surface" size="icon" className="size-10" aria-label="Log weight" onClick={() => { setEditing(undefined); setSheetOpen(true); }}><Plus /></Button>} />
      {data && <Card className="divide-y divide-border px-4">
        {entries.length ? entries.map((entry) => (
          <div key={entry.id} className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1">
            <div><div className="text-sm font-extrabold tabular-nums">{formatKg(entry.kg)}</div><div className="text-[0.7rem] text-muted-foreground">{formatDay(entry.loggedAt)} · {formatTime(entry.loggedAt)}</div></div>
            <Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label="Edit entry" onClick={() => { setEditing(entry); setSheetOpen(true); }}><Pencil /></Button>
            <Button variant="ghost" size="icon" className="size-9 text-muted-foreground" aria-label="Delete entry" onClick={() => setRemoving(entry)}><Trash2 /></Button>
          </div>
        )) : <InlineEmpty>No weight logged yet</InlineEmpty>}
      </Card>}
      <LogWeightSheet open={sheetOpen} onOpenChange={setSheetOpen} entry={editing} />
      <AlertDialog open={!!removing} onOpenChange={(open) => { if (!open) setRemoving(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete this entry?</AlertDialogTitle><AlertDialogDescription>{removing ? `${formatKg(removing.kg)} on ${formatDay(removing.loggedAt)}` : ""}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (removing) deleteBodyweight(removing.id); setRemoving(null); }}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  );
}
