import { useRef, useState } from "react";
import { ChevronRight, Info, Lightbulb, X } from "lucide-react";
import type { Muscle } from "@/data/exercises";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SectionHeading } from "@/components/recomp/core";
import { formatDay } from "@/lib/training-data";
import {
  MUSCLE_COLOURS,
  formatEffectiveSets,
  type BalanceSplit,
  type CoverageStatus,
  type MuscleCoverage,
  type TrainingAnalysis,
} from "@/lib/training-analysis";
import { cn } from "@/lib/utils";

const statusStyles: Record<CoverageStatus, string> = {
  "Well trained": "text-emerald-700 dark:text-emerald-400",
  "Lightly trained": "text-amber-800 dark:text-amber-300",
  "Not trained": "text-muted-foreground",
  "Above target": "text-sky-700 dark:text-sky-300",
};

function CoverageBar({ row }: { row: MuscleCoverage }) {
  const colour = MUSCLE_COLOURS[row.muscle];
  // A little headroom makes above-target work visible; every muscle has its own scale.
  const scale = row.target.max * 1.25;
  const fill = Math.min((row.weeklySets / scale) * 100, 100);
  const min = (row.target.min / scale) * 100;
  const max = (row.target.max / scale) * 100;
  const directShare = row.effectiveSets ? (row.directSets / row.effectiveSets) * 100 : 0;
  return (
    <span
      role="progressbar"
      aria-label={`${row.muscle} muscle coverage`}
      aria-valuemin={0}
      aria-valuemax={scale}
      aria-valuenow={Math.min(row.weeklySets, scale)}
      aria-valuetext={`${formatEffectiveSets(row.weeklySets)} effective sets per week; suggested range ${row.target.min} to ${row.target.max}; ${row.status}`}
      className="relative block h-2.5 rounded-full bg-track/50"
    >
      <span
        aria-hidden
        className="absolute -inset-y-1 rounded-sm"
        style={{
          left: `${min}%`,
          width: `${max - min}%`,
          backgroundColor: `color-mix(in srgb, ${colour} 20%, transparent)`,
        }}
      />
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 motion-reduce:transition-none"
        style={{
          width: `${fill}%`,
          background: `linear-gradient(to right, ${colour} ${directShare}%, color-mix(in srgb, ${colour} 55%, var(--card)) ${directShare}%)`,
        }}
      />
      <span
        aria-hidden
        className="absolute -inset-y-0.5 w-px bg-foreground/25"
        style={{ left: `${min}%` }}
      />
      <span
        aria-hidden
        className="absolute -inset-y-0.5 w-px bg-foreground/25"
        style={{ left: `${max}%` }}
      />
    </span>
  );
}

export function TrainingAnalysisSection({
  analysis,
  periodLabel,
}: {
  analysis: TrainingAnalysis;
  periodLabel: string;
}) {
  const [selectedMuscle, setSelectedMuscle] = useState<Muscle | null>(null);
  const [showMethod, setShowMethod] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  // Derive the selected row again on a period/goal/history change; never retain stale totals.
  const selected = analysis.coverage.find((row) => row.muscle === selectedMuscle);
  return (
    <section className="space-y-4" aria-label="Training analysis">
      <div>
        <SectionHeading>Training analysis</SectionHeading>
        <Card className="overflow-hidden p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold">Muscle coverage</h3>
              <p className="mt-1 text-[0.65rem] text-muted-foreground">
                {periodLabel} · average effective sets / week
              </p>
            </div>
            <button
              type="button"
              aria-label="How muscle coverage is calculated"
              onClick={(event) => {
                opener.current = event.currentTarget;
                setShowMethod(true);
              }}
              className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Info className="size-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3 text-[0.6rem] text-muted-foreground">
            <span className="rounded-full bg-secondary px-2 py-1 font-semibold">
              {analysis.targetLabel} targets
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-3 rounded-sm bg-foreground/15" />
              Shaded band = target
            </span>
          </div>
          <div className="mt-1 divide-y divide-border/40">
            {analysis.coverage.map((row) => (
              <button
                key={row.muscle}
                type="button"
                aria-label={`${row.muscle}: ${row.status}. View exercise contributions`}
                aria-haspopup="dialog"
                onClick={(event) => {
                  opener.current = event.currentTarget;
                  setSelectedMuscle(row.muscle);
                }}
                className="grid min-h-[49px] w-full grid-cols-[6rem_minmax(0,1fr)_2.7rem_auto] items-center gap-2 rounded-lg py-2 text-left transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[0.7rem] font-bold">
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: MUSCLE_COLOURS[row.muscle] }}
                    />
                    {row.muscle}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-[0.59rem] font-semibold",
                      statusStyles[row.status],
                    )}
                  >
                    {row.status}
                  </span>
                </span>
                <span className="min-w-0 space-y-1.5">
                  <CoverageBar row={row} />
                  <span className="block text-[0.56rem] text-muted-foreground">
                    Target {row.target.min}–{row.target.max}
                  </span>
                </span>
                <span className="text-right text-sm font-extrabold tabular-nums">
                  {formatEffectiveSets(row.weeklySets)}
                </span>
                <ChevronRight aria-hidden className="size-3 text-muted-foreground/60" />
              </button>
            ))}
          </div>
          <p className="mt-2 text-[0.6rem] leading-relaxed text-muted-foreground">
            Direct + indirect work · tap a muscle for its breakdown
          </p>
        </Card>
      </div>
      <div>
        <SectionHeading>Training balance</SectionHeading>
        <div className="grid grid-cols-2 gap-2.5">
          <BalanceCard
            split={analysis.upperLower}
            colours={[MUSCLE_COLOURS.Back, MUSCLE_COLOURS.Triceps]}
          />
          <BalanceCard
            split={analysis.pushPull}
            colours={[MUSCLE_COLOURS.Chest, MUSCLE_COLOURS.Back]}
          />
        </div>
        <p className="mt-2 text-[0.6rem] leading-relaxed text-muted-foreground">
          Your training split for this period. 50/50 is not a required goal.
        </p>
      </div>
      <Card className="border-primary/15 bg-primary/[0.04] p-3.5">
        <div className="flex items-start gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Lightbulb aria-hidden className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[0.65rem] font-extrabold uppercase tracking-wider text-primary">
              Training insight
            </h3>
            <p className="mt-1.5 text-xs font-bold leading-snug">{analysis.insight.title}</p>
            <p className="mt-1 text-[0.68rem] leading-relaxed text-muted-foreground">
              {analysis.insight.body}
            </p>
          </div>
        </div>
      </Card>
      <Drawer
        open={selectedMuscle !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedMuscle(null);
        }}
      >
        <DrawerContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
          className="mx-auto max-h-[85dvh] max-w-[430px] rounded-t-2xl bg-popover"
        >
          {selected && (
            <MuscleBreakdown row={selected} analysis={analysis} periodLabel={periodLabel} />
          )}
        </DrawerContent>
      </Drawer>
      <Drawer open={showMethod} onOpenChange={setShowMethod}>
        <DrawerContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
          className="mx-auto max-h-[85dvh] max-w-[430px] rounded-t-2xl bg-popover"
        >
          <DrawerHeader className="text-left">
            <div className="flex items-center justify-between gap-2">
              <DrawerTitle>How training analysis works</DrawerTitle>
              <CloseDrawer />
            </div>
            <DrawerDescription>
              Suggested ranges for {analysis.targetLabel.toLowerCase()}.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-xs leading-relaxed text-muted-foreground">
            <p>
              <strong className="text-foreground">Effective sets.</strong> Each completed working
              set gives its primary muscle 1 set of credit and each supporting muscle{" "}
              {formatEffectiveSets(analysis.secondaryCredit)}. A bench press set counts as 1 for
              chest and {formatEffectiveSets(analysis.secondaryCredit)} for triceps and shoulders.
              Warm-ups, unfinished sets, notes and cardio are excluded.
            </p>
            <p>
              <strong className="text-foreground">Weekly averages.</strong> The selected period
              spans {formatEffectiveSets(analysis.weeks)} weeks. We divide effective sets by that
              whole period, including weeks with no recorded training. The last 7 days are shown
              separately in each muscle breakdown.
            </p>
            <p>
              <strong className="text-foreground">Muscle-specific targets.</strong> The shaded band
              shows each muscle’s suggested weekly range. Below it is lightly trained, within it is
              well trained, above it is above target; zero is not trained. Strength goals use lower
              volume ranges. If both muscle and strength goals are selected, strength takes
              priority, as it does for the app’s rep/rest defaults.
            </p>
            <p>
              <strong className="text-foreground">Balance.</strong> Upper/lower compares effective
              muscle sets, excluding core. Push/pull compares primary upper-body working sets,
              counting rear-delt pulls as pull. Lower-body and core work are excluded from
              push/pull. These percentages describe your split.
            </p>
            <p>
              Set credit and targets are estimates. They do not measure effort, technique, recovery
              or muscle growth. “Above target” does not mean better, and “not trained” means no
              credited work was recorded in this period.
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    </section>
  );
}

function CloseDrawer() {
  return (
    <DrawerClose asChild>
      <Button variant="ghost" size="icon" className="size-9 shrink-0" aria-label="Close">
        <X className="size-4" />
      </Button>
    </DrawerClose>
  );
}

function BalanceCard({ split, colours }: { split: BalanceSplit; colours: [string, string] }) {
  const hasData = split.firstPercent !== null;
  return (
    <Card className="min-w-0 p-3">
      <h3 className="text-[0.68rem] font-bold">
        {split.firstLabel} / {split.secondLabel}
      </h3>
      <div className="mt-2.5 flex justify-between gap-2">
        {[
          { label: split.firstLabel, percent: split.firstPercent, colour: colours[0] },
          { label: split.secondLabel, percent: split.secondPercent, colour: colours[1] },
        ].map((item) => (
          <div key={item.label}>
            <p className="text-xl font-extrabold leading-none tabular-nums">
              {item.percent === null ? (
                "—"
              ) : (
                <>
                  {item.percent}
                  <span className="text-xs">%</span>
                </>
              )}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[0.6rem] text-muted-foreground">
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ backgroundColor: item.colour }}
              />
              {item.label}
            </p>
          </div>
        ))}
      </div>
      <div
        role="img"
        aria-label={
          hasData
            ? `${split.firstLabel} ${split.firstPercent}%, ${split.secondLabel} ${split.secondPercent}%`
            : `No ${split.firstLabel.toLowerCase()} or ${split.secondLabel.toLowerCase()} sets in this period`
        }
        className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-track/50"
      >
        {hasData && (
          <>
            <span style={{ width: `${split.firstPercent}%`, backgroundColor: colours[0] }} />
            <span style={{ width: `${split.secondPercent}%`, backgroundColor: colours[1] }} />
          </>
        )}
      </div>
      <p className="mt-2 text-[0.6rem] font-semibold text-muted-foreground">{split.description}</p>
    </Card>
  );
}

function MuscleBreakdown({
  row,
  analysis,
  periodLabel,
}: {
  row: MuscleCoverage;
  analysis: TrainingAnalysis;
  periodLabel: string;
}) {
  return (
    <>
      <DrawerHeader className="text-left">
        <div className="flex items-center justify-between gap-2">
          <DrawerTitle className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ backgroundColor: MUSCLE_COLOURS[row.muscle] }}
            />
            {row.muscle} coverage
          </DrawerTitle>
          <CloseDrawer />
        </div>
        <DrawerDescription>
          {periodLabel} · {analysis.targetLabel} · target {row.target.min}–{row.target.max}{" "}
          effective sets / week
        </DrawerDescription>
      </DrawerHeader>
      <div
        data-vaul-no-drag
        className="space-y-4 overflow-y-auto px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <Card className="space-y-3 p-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-extrabold">
              {formatEffectiveSets(row.weeklySets)}{" "}
              <span className="text-xs font-medium text-muted-foreground">
                effective sets / week
              </span>
            </span>
            <span className={cn("text-[0.65rem] font-bold", statusStyles[row.status])}>
              {row.status}
            </span>
          </div>
          <CoverageBar row={row} />
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            {[
              { label: "Direct / week", value: row.directSets / analysis.weeks },
              { label: "Indirect / week", value: row.indirectSets / analysis.weeks },
              { label: "Last 7 days", value: row.recentSets },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-lg font-extrabold tabular-nums">
                  {formatEffectiveSets(item.value)}
                </p>
                <p className="text-[0.6rem] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[0.65rem] text-muted-foreground">
            {formatEffectiveSets(row.effectiveSets)} effective sets across{" "}
            {formatEffectiveSets(analysis.weeks)} weeks
            {row.lastAt !== null ? ` · last trained ${formatDay(row.lastAt)}` : ""}
          </p>
        </Card>
        <div>
          <h3 className="mb-2 text-xs font-extrabold">Exercise contributions</h3>
          <p className="mb-2 text-[0.65rem] text-muted-foreground">
            Working sets × muscle credit = effective sets for this period.
          </p>
          {row.contributions.length ? (
            <div className="divide-y divide-border">
              {row.contributions.map((item) => (
                <div
                  key={`${item.exerciseId}:${item.role}`}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-snug">{item.name}</p>
                    <p className="mt-1 text-[0.65rem] text-muted-foreground">
                      <span className="font-semibold">{item.role}</span> · {item.workingSets} ×{" "}
                      {formatEffectiveSets(item.credit)} = {formatEffectiveSets(item.effectiveSets)}{" "}
                      sets
                    </p>
                    <p className="mt-0.5 text-[0.6rem] text-muted-foreground">
                      {item.sessions} {item.sessions === 1 ? "session" : "sessions"} · last{" "}
                      {formatDay(item.lastAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-right text-sm font-extrabold tabular-nums">
                    {formatEffectiveSets(item.weeklySets)}
                    <span className="block text-[0.6rem] font-medium text-muted-foreground">
                      / week
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-secondary p-3 text-xs leading-relaxed text-muted-foreground">
              No direct or indirect working sets were recorded for {row.muscle.toLowerCase()} in
              this period.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
