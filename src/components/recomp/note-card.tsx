import { Check, ChevronDown, ChevronUp, GripVertical, NotebookPen, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type HTMLAttributes } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import type { WorkoutNote } from "@/data/exercises";
import { useCloudData } from "@/lib/cloud-data";
import { cn } from "@/lib/utils";

const presets: WorkoutNote[] = [
  { title: "Mobility warm-up", body: "Slow and controlled. 30–45 seconds each.", checklist: ["Cat-cow", "World's greatest stretch", "Hip 90/90", "Thoracic rotations", "Band pull-aparts"].map((text, i) => ({ id: `p${i}`, text })) },
  { title: "Physio routine", body: "Follow your physio's prescription. Stop if anything feels sharp.", checklist: [] },
];

/** Previously used notes from saved, scheduled and completed workouts, plus starter routines. */
export function useNoteLibrary() {
  const data = useCloudData();
  return useMemo(() => {
    const seen = new Set<string>(); const out: WorkoutNote[] = [];
    const add = (note: WorkoutNote | undefined) => {
      if (!note) return; const id = `${note.title.trim().toLowerCase()}|${note.body.trim()}`;
      if (seen.has(id)) return; seen.add(id); out.push({ title: note.title, body: note.body, checklist: note.checklist.map((c) => ({ ...c })) });
    };
    for (const s of data?.saved ?? []) s.exercises.forEach((e) => add(e.note));
    for (const s of data?.scheduled ?? []) s.exercises.forEach((e) => add(e.note));
    // Session-only notes are private and should not silently become reusable templates.
    presets.forEach(add);
    return out;
  }, [data]);
}

type CardProps = {
  note: WorkoutNote; checked?: string[] | undefined; onToggleCheck?: ((id: string) => void) | undefined;
  onEdit?: (() => void) | undefined; onDelete?: (() => void) | undefined;
  handle?: HTMLAttributes<HTMLButtonElement> | undefined; dragging?: boolean | undefined; defaultCollapsed?: boolean | undefined;
};

export function NoteCard({ note, checked, onToggleCheck, onEdit, onDelete, handle, dragging, defaultCollapsed = false }: CardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const done = checked?.length ?? 0;
  return <Card className={cn("border-dashed border-primary/30 bg-card p-3", dragging && "border-primary opacity-90")}>
    <div className="flex items-start gap-2">
      {handle && <button type="button" aria-label={`Reorder note ${note.title}`} className="-ml-1 grid min-h-9 w-7 shrink-0 touch-none place-items-center text-muted-foreground" {...handle}><GripVertical className="size-4" /></button>}
      <NotebookPen className="mt-2 size-4 shrink-0 text-primary" />
      <button type="button" onClick={() => setCollapsed((c) => !c)} className="min-h-9 min-w-0 flex-1 text-left">
        <span className="block break-words text-sm font-extrabold leading-snug">{note.title || "Note"}</span>
        {note.checklist.length > 0 && <span className="text-[0.68rem] font-semibold text-muted-foreground">{checked ? `${done}/${note.checklist.length} done` : `${note.checklist.length} items`}</span>}
      </button>
      {onEdit && <button type="button" aria-label="Edit note" onClick={onEdit} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-accent"><Pencil className="size-4" /></button>}
      {onDelete && <button type="button" aria-label="Delete note" onClick={() => { if (window.confirm("Delete this note?")) onDelete(); }} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-destructive"><Trash2 className="size-4" /></button>}
      <button type="button" aria-label={collapsed ? "Expand note" : "Collapse note"} onClick={() => setCollapsed((c) => !c)} className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground">{collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}</button>
    </div>
    {!collapsed && <div className="mt-1 space-y-2 pl-6">
      {note.body && <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{note.body}</p>}
      {note.checklist.length > 0 && <ul className="space-y-1">{note.checklist.map((item) => {
        const on = !!checked?.includes(item.id);
        return <li key={item.id}>{onToggleCheck
          ? <button type="button" onClick={() => onToggleCheck(item.id)} className="flex min-h-9 w-full items-center gap-2 text-left text-sm">
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border", on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary")}>{on && <Check className="size-3.5" />}</span>
              <span className={cn("min-w-0 break-words", on && "text-muted-foreground line-through")}>{item.text}</span>
            </button>
          : <span className="flex items-center gap-2 text-sm"><span className={cn("grid size-5 shrink-0 place-items-center rounded-md border", on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary")}>{on && <Check className="size-3.5" />}</span><span className={cn("min-w-0 break-words", on && "text-muted-foreground line-through")}>{item.text}</span></span>}</li>;
      })}</ul>}
    </div>}
  </Card>;
}

const blank = (): WorkoutNote => ({ title: "", body: "", checklist: [] });
let rowSeq = 0;
const rowId = () => `c${Date.now().toString(36)}${rowSeq++}`;

/** Create or edit a note; new notes can start from a previously used one. */
export function NoteSheet({ open, initial, onOpenChange, onSave }: { open: boolean; initial?: WorkoutNote | undefined; onOpenChange: (open: boolean) => void; onSave: (note: WorkoutNote) => void }) {
  return <Drawer open={open} onOpenChange={onOpenChange}>
    <DrawerContent className="mx-auto max-h-[88dvh] max-w-[430px] rounded-t-2xl bg-popover">
      <DrawerHeader className="pb-2 text-left"><DrawerTitle>{initial ? "Edit note" : "Add note"}</DrawerTitle></DrawerHeader>
      {open && <NoteForm initial={initial} onSave={(note) => { onSave(note); onOpenChange(false); }} />}
    </DrawerContent>
  </Drawer>;
}

function NoteForm({ initial, onSave }: { initial?: WorkoutNote | undefined; onSave: (note: WorkoutNote) => void }) {
  const [note, setNote] = useState<WorkoutNote>(() => initial ? structuredClone(initial) : blank());
  const library = useNoteLibrary();
  useEffect(() => { setNote(initial ? structuredClone(initial) : blank()); }, [initial]);
  const field = "w-full rounded-xl border border-border bg-secondary px-3 text-sm outline-none focus:border-primary";
  const setRow = (id: string, text: string) => setNote((n) => ({ ...n, checklist: n.checklist.map((c) => c.id === id ? { ...c, text } : c) }));
  const save = () => onSave({ title: note.title.trim() || "Note", body: note.body.trim(), checklist: note.checklist.filter((c) => c.text.trim()).map((c) => ({ ...c, text: c.text.trim() })) });
  return <div className="min-h-0 space-y-2 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
    {!initial && library.length > 0 && <div>
      <div className="mb-1 text-[0.68rem] font-extrabold uppercase tracking-wide text-muted-foreground">Reuse a note</div>
      <div className="flex flex-wrap gap-1.5">{library.map((item, i) => <button key={i} type="button" onClick={() => setNote({ ...structuredClone(item), checklist: item.checklist.map((c) => ({ id: rowId(), text: c.text })) })} className="max-w-full truncate rounded-full border border-primary/20 bg-primary/[0.06] px-3 py-1.5 text-xs font-bold text-primary">{item.title}</button>)}</div>
    </div>}
    <input value={note.title} onChange={(e) => setNote({ ...note, title: e.target.value })} placeholder="Title" aria-label="Note title" className={cn(field, "h-11 font-bold")} />
    <textarea value={note.body} onChange={(e) => setNote({ ...note, body: e.target.value })} placeholder="Instructions" aria-label="Note instructions" rows={4} className={cn(field, "py-2.5")} />
    <div className="space-y-1.5">
      {note.checklist.map((row) => <div key={row.id} className="flex items-center gap-1.5">
        <input value={row.text} onChange={(e) => setRow(row.id, e.target.value)} placeholder="Checklist item" aria-label="Checklist item" className={cn(field, "h-10 flex-1")} />
        <button type="button" aria-label="Remove item" onClick={() => setNote((n) => ({ ...n, checklist: n.checklist.filter((c) => c.id !== row.id) }))} className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
      </div>)}
      <Button variant="ghost" size="sm" className="text-primary" onClick={() => setNote((n) => ({ ...n, checklist: [...n.checklist, { id: rowId(), text: "" }] }))}><Plus />Add checklist item</Button>
    </div>
    <Button variant="primary" className="w-full" onClick={save}>Save note</Button>
  </div>;
}
