# RECOMP'D Focused Fine-Tuning Pass 1

## Goal
Deliver only the five requested improvements while preserving authentication, account-backed data, offline syncing, navigation, and the current visual system.

## Changes

### 1. Repair the empty Workout action
- Wire the existing empty-state **Start workout** button to `/build`.
- Keep the current active-workout restore path unchanged, so an existing local in-progress workout still resumes from the Workout tab.
- Verify the empty state after a fresh launch and after finishing, plus resume behavior with an active workout.

### 2. Expand the shared exercise library
- Grow the single built-in library to roughly 150–200 curated commercial-gym exercises across all ten existing muscle groups.
- Add realistic Barbell, Dumbbell, Cable, Smith Machine, Bodyweight, Plate-loaded Machine, and Pin-loaded Machine coverage without filler grip variants.
- Preserve stable exercise IDs and all existing exercises so saved workouts and history remain compatible.
- Enrich each exercise with ordered muscle metadata: primary muscle first, followed by genuine secondary muscles. Keep internal movement classification only where generation needs it; never expose Compound/Isolation labels.
- Update generation and replacement matching to consider both primary and secondary muscle metadata while still prioritizing a balanced muscle selection and larger movements first.
- Keep Build Your Own search, filters, custom exercises, replacements, saved workouts, and existing account persistence on the same library path.

### 3. Add cardio to the existing workout model
- Add Treadmill, Incline Treadmill, Stair Climber / StairMaster, Rower, Elliptical, and SkiErg as built-in exercises in the same picker/library.
- Extend the existing exercise and completed-set structures with a tracking mode and optional cardio fields. Existing strength records remain valid without migration.
- In Build Your Own, show cardio-appropriate setup instead of sets/reps configuration.
- In Active Workout, provide duration as the primary field and only relevant optional fields per activity: distance, speed or pace, incline, resistance/level, floors/steps, or pace/500m. No required optional metrics and no kg × reps controls.
- Preserve in-progress local resilience and serialize cardio metrics through the existing completed-workout JSON, cloud queue, saved workouts, and cross-device account flow. No new table or separate cardio subsystem.
- Format cardio entries correctly in completion summary, history/detail editing, exercise history, text sharing, and share-image rendering.
- Exclude cardio from strength PR/e1RM calculations and from muscle workload. Show cardio progress using meaningful duration/distance history where available.

### 4. Clarify Muscle Workload
- Rename visible **Training Priority** headings to **Muscle Workload** on Home and Progress.
- Rename status labels to **High workload**, **Moderate workload**, and **Low workload**.
- Show the selected period in the Progress heading and “Last 4 weeks” on Home where space permits.
- Retain the current bars and styling.
- Keep workload calculations based on completed work, giving full credit to the primary muscle and reduced credit to ordered secondary muscles from the richer metadata.

### 5. Prevent This Week overlap
- Change the top of the Home **This week** card to a two-column grid with a flexible, minimum-width-zero day/stat area and a fixed, non-shrinking ring column.
- Reserve the ring’s full current size rather than shrinking it, and allow large workout counts such as 12 to fit without crossing into adjacent content.
- Preserve the card’s current appearance and lower summary row.

## Technical details
- Use backward-compatible optional cardio properties in the existing `Exercise`, `WorkoutExercise`, active set, completed set, saved workout, and cloud JSON mappings.
- Keep historical strength rows and older saved workouts readable by normalizing missing fields to strength defaults.
- Continue storing completed exercise payloads in the existing `workout_exercises.sets` JSONB column; no database migration is expected.
- Centralize strength/cardio formatting helpers so Active Workout, History, Progress, and Sharing cannot disagree.
- Keep custom exercise storage compatible; existing custom strength exercises remain unchanged.

## Validation
- Run focused data/model tests for library size, unique IDs, all muscle/equipment coverage, generation balance, secondary-muscle workload credit, cardio serialization, cardio formatting, and PR exclusion.
- Test in the live app: empty Workout → Build, active workout resume, Generate, Build Your Own search/filter/custom exercise, Replace Exercise, cardio add/perform/save/history reopen, and share text/image.
- Check Home and Progress terminology with existing account data.
- Check Home **This week** at common narrow iPhone and Android widths, including a two-digit workout count, with no horizontal overflow or text/ring overlap.
- Confirm current authentication gates and account-backed reads/writes still run without browser or build errors.
