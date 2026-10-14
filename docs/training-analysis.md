# Progress training analysis

Progress replaces the highest-muscle-relative workload graph with Muscle Coverage,
Training Balance and a dynamic Training Insight. The rest of Progress (summary,
calendar, history, records and bodyweight) continues using the existing components.

## Effective sets and period handling

- Only recorded completed strength working sets count. Exclude warm-ups, unfinished
  imported sets, cardio, notes and invalid/zero rep entries. Timed strength holds,
  stored as seconds in the reps field, still count.
- Primary muscle = 1 effective set; supporting muscle = 0.5. The ordered saved
  muscle list is authoritative and deduplicated. Older primary-only or missing
  metadata is enriched from the exercise library where the primary agrees.
  Custom exercises use their saved muscles; unknown exercises do not crash.
- Secondary credit is configured via `DEFAULT_SECONDARY_CREDIT` or the selector's
  `secondaryCredit` option (0–1). It is an estimate, not an effort measurement.
- The selected period uses the existing durations: 28 / 91 / 182 / 365 days.
  Effective sets divided by days/7 gives the weekly average, including inactive
  weeks. Exclude workouts beyond the current end time. No recency weighting is
  secretly applied: last-7-day credit and last-trained date are separate details.
- Supersets, tri-sets and circuits contribute their recorded sets once. Circuit
  rounds are not multiplied a second time. Analysis reads history without writes
  or a database migration.

## Suggested weekly target ranges

These are app reference ranges, not universal prescriptions. The muscle-building
column uses the ranges from the redesign discussion. Strength and general-fitness
columns are implementation defaults; all ranges live in `WEEKLY_MUSCLE_TARGETS`.

| Muscle | Muscle building | Strength | General fitness |
| --- | --- | --- | --- |
| Chest | 8–14 | 6–10 | 4–8 |
| Back | 10–16 | 6–12 | 6–10 |
| Shoulders | 8–14 | 6–10 | 4–8 |
| Biceps / Triceps | 6–12 | 4–8 | 3–6 |
| Quads | 8–14 | 6–10 | 4–8 |
| Hamstrings / Glutes | 6–12 | 4–8 | 3–6 |
| Calves / Core | 4–10 | 3–6 | 2–6 |

`Get stronger` takes priority over `Build muscle`, matching existing rep/rest goal
priority. No selected goal defaults to muscle building. Other goals use general
fitness. Weekly workout frequency does not change the muscle ranges.

Zero = Not trained; 0 < average < minimum = Lightly trained; minimum through
maximum inclusive = Well trained; greater than maximum = Above target. Above
target is descriptive, not a reward or a diagnosis of overtraining. Calculations
use full precision; displayed effective-set values are rounded to one decimal.

## Balance and contributions

Upper/lower compares summed effective sets for the upper five muscle groups and
lower four, excluding core. Push/pull compares primary upper-body working sets;
chest/triceps presses and shoulder work are push, back/biceps and rear-delt/face
pulls are pull. Lower-body and core sets are excluded. Secondary muscle credit is
not counted again in the movement split. Empty denominators show dashes; recorded
splits always add to 100%. Neither split has a prescribed 50/50 ideal.

Tap any muscle for weekly direct/indirect credit, period totals, the last 7 days,
last-trained date and each exercise's working sets × credit = effective sets.
Repeated instances aggregate by exercise ID and role; session counts deduplicate
the same workout. Drawer values are derived from the current analysis so changes
to periods, goals or history cannot leave stale breakdowns.

## Verification

With Node 22.6+ and dependencies installed:

```sh
node --experimental-strip-types --test tests/training-analysis.test.ts
npx eslint src/lib/training-analysis.ts src/components/recomp/progress/training-analysis.tsx
npm run build
```

`vercel.json` enables automatic preview deployments for
`feat/progress-muscle-coverage-balance`, following approval to preview PR #115.
The PR stays unmerged. Other branches retain Vercel's default deployment behaviour.

Mobile smoke checks: explore the app's demo, open Progress, switch all four periods,
tap a compound-trained muscle and a zero-work muscle, open/close the explanation,
change goals in training settings, check light/dark themes and 320–430px widths.
Confirm calendar/history/records/bodyweight navigation still works. New-account,
cardio-only and older-period empty states must not invent training or percentages.
