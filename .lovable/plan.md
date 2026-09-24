# Active Workout Experience

## Build
- Replace the empty Workout screen with a persistent local active-workout experience when a workout has been started, while retaining the empty state when none exists.
- Keep the existing RECOMP'D shell, bottom navigation, typography, colors, spacing, and compact mobile-first layout unchanged.
- Split the experience into focused components for the workout header, exercise cards, set rows, rest timer, action sheets, and completed summary.

## Training flow
- Show one clearly highlighted current exercise, compact upcoming cards, and collapsed green-tinted completed cards with a single visible set-progress count.
- Support quick weight and rep entry, rep steppers, add/remove sets, intelligent weight carry-forward, optional prior-performance snippets, adjustable rest duration, and automatic completion/collapse.
- Let users inspect one upcoming exercise without changing order, then deliberately promote it with “Start this exercise” while preserving all entered data.
- Start a large dismissible rest countdown after each completed set, with a persistent minimized timer and add/subtract/skip controls.

## Workout editing
- Add compact exercise actions for replacement, superset pairing/removal, and confirmed exercise removal.
- Reuse the existing exercise library picker for adding exercises and the same local exercise data for replacement choices.
- Preserve active progress locally across navigation and restore it when returning to Workout.

## Completion
- Add compact finish confirmation when work remains, then preserve the completed workout locally and show a concise summary with duration, completed exercises, sets, volume, genuine PRs, and a Share Workout action.
- Ensure long workout names wrap instead of truncating.

## Validation
- Verify set editing and carry-forward, current/upcoming/completed transitions, look-ahead behavior, rest timing, supersets, replacement, add/remove flows, persistence, finish confirmation, summary sharing, and Start Workout handoff.
- Check the experience at 390px and desktop widths for touch usability, compactness, no horizontal overflow, clean runtime behavior, and no visible exercise classification labels.

## Technical details
- Use local/session storage only, with versioned workout state types kept separate from presentation so cloud persistence can replace it later.
- Keep the existing `/workout` route and existing generated-preview storage handoff; no authentication, cloud sync, notifications, social feed, or unrelated screen changes.
