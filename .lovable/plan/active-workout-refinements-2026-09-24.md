# Active Workout Refinements

## Build
- Preserve the existing Active Workout structure and styling while reducing the current card background to a subtle tint with its green outline retained.
- Add a compact rest-duration cue and selector with 30–180 second options, and precisely center the countdown inside the existing timer circle.
- Restrict superset choices to eligible unfinished exercises and alternate paired exercises set-by-set, resting only after both halves of each round.
- Expand the completed summary with clear completion wording and compact completed-set details for exercises actually performed, omitting meaningless bodyweight loads.

## Validation
- Verify normal and superset set completion, exercise switching, rest timing, eligible superset filtering, persistence, early-finish summaries, sharing, and mobile/desktop layout.
- Confirm existing set entry, collapsed cards, menus, Start this exercise, navigation, and classification-free interface remain unchanged.

## Technical details
- Keep the current local workout state model and existing sheets, cards, timers, and actions; modify only the Active Workout presentation and transition logic.
- Use completed set indices to determine the next superset half and round without reordering unrelated exercises or discarding entered data.
