# Implement RECOMP'D Light Mode

## Theme foundation
- Preserve the current dark tokens unchanged and add a warm antique-white light token set with cream surfaces, warm borders, charcoal text, muted secondary text, pastel athletic red accents, blush selected states, and restrained depth.
- Add one theme controller that applies `light` or `dark` at the document level, resolves `system` from the browser preference, and responds when that preference changes.
- Apply the saved local preference before the app renders to prevent a wrong-theme flash; keep the existing account profile as the persisted source so choices sync across sessions and devices.

## Appearance controls
- Enable the existing Light option in Settings.
- Make System, Dark, and Light update the app immediately and continue using the existing settings save flow.

## App-wide translation
- Keep layouts and component structure unchanged while translating all semantic surfaces, borders, inputs, sheets, dialogs, navigation, selected controls, progress indicators, charts, active-workout states, and authentication/onboarding screens through the shared tokens.
- Preserve destructive/error meaning independently from the red theme accent.
- Keep the workout share image’s existing dark green branded rendering untouched.

## Validation
- Check Light, Dark, and System in the live app at common mobile widths.
- Verify sheets, forms, workout states, charts, and navigation have no dark-only remnants in Light mode.
- Confirm changing appearance leaves workout and account data unchanged and the project remains error-free.

## Technical details
- Use Tailwind v4 semantic variables in `src/styles.css`; component code continues consuming roles such as `background`, `card`, `popover`, `primary`, `accent`, `border`, `track`, and `nav`.
- Resolve initial theme in the document shell using the same local preference key as the existing settings model, then keep it synchronized in React after account preferences load.
