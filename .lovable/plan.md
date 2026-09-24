# RECOMP'D Phase 1

## Build
- Create a mobile-first app shell capped to a phone-like width on larger screens, with safe-area spacing and persistent four-tab bottom navigation.
- Establish the supplied dark athletic design system, compact typography, semantic colors, restrained green accents, thin borders, and consistent card/button shapes.
- Build reusable UI pieces for the header, cards, progress ring, week tracker, training priority, workout summaries, builder controls, empty workout state, and progress overview.

## Screens
- **Home:** compact greeting, dominant Start Workout action, Plan Workout path, weekly progress, muscle priorities, recent workout, and bodyweight summary.
- **Build:** Generate / Build Your Own control with realistic placeholder selection and preview states, without generation logic.
- **Workout:** focused empty state with one prominent Start Workout action.
- **Progress:** compact mock-data structure for priorities, calendar, personal records, bodyweight, and workout history.

## Interaction and validation
- Make all four destinations navigable with clear selected states and large touch targets.
- Add subtle state transitions while respecting reduced-motion settings.
- Verify the app at the requested 390px phone viewport and a wider desktop viewport, including overflow, safe areas, and build/runtime health.

## Technical details
- Use TanStack Router routes, React, TypeScript, Tailwind CSS, semantic design tokens, reusable components, and Lucide icons.
- Keep mock data and presentation concerns separated so authentication and cloud persistence can be added later without restructuring this foundation.
- Add unique metadata for each content route.
