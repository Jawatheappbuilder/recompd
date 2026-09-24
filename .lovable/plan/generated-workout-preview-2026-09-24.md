# Generated Workout Preview

## Build
- Add a dedicated generated-workout preview under Build, preserving the current app shell, bottom navigation, tokens, typography, spacing language, and compact mobile layout.
- Pass the selected muscles and exercise count from Generate into the preview, then create a balanced, naturally interleaved workout from the existing local exercise library.
- Keep exercise classification internal: ordering will favor larger movements first, but the interface will never show “Compound” or “Isolation.”

## Preview interactions
- Show a compact title, exercise count, and back/edit control above dense exercise cards containing only name, muscle, equipment, sets, and reps.
- Add touch-capable drag handles for reordering, compact set steppers, a subtle remove action, and a rep-range bottom sheet.
- Add a Replace bottom sheet that prioritizes the same muscle and changes only the selected exercise.
- Add an exercise-library bottom sheet with search plus muscle and equipment filters; choosing an exercise appends it and closes the sheet.
- Add a secondary Regenerate action using the original selection and a primary START WORKOUT action that preserves the edited workout locally before opening the existing Workout screen.

## Validation
- Confirm balanced generation, replace/add/remove/reorder/set/rep interactions, navigation, and preserved preview state.
- Verify the flow at the current phone size and a wider desktop size, with no horizontal overflow and a clean build/runtime state.

## Technical details
- Use a new TanStack route file for the preview and route search values for selected muscles/count.
- Keep preview state client-side and mock-only; no authentication, payments, cloud storage, or active-workout redesign.
- Use the existing Button, Card, Drawer, Lucide icons, semantic styling tokens, and exercise data; add a touch-safe sortable dependency only if needed.
- Add unique metadata for the new preview route.
