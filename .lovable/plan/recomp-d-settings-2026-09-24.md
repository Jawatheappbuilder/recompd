# RECOMP'D Settings

## Build
- Add a Settings route opened by the existing cog, with compact grouped rows and normal back navigation.
- Create one versioned local user-preferences model for profile, training, and theme values, ready for later account association.
- Add editable Profile, Training Preferences, Appearance, Account, Data, and About & Support sections without adding cloud or authentication behavior.
- Reuse the existing custom-exercise store for a dedicated management screen with multi-muscle editing and confirmed deletion.

## Behavior
- Persist profile and training preferences locally; expose weight units, default rest, weekly target, week start, and theme through one shared preferences hook.
- Keep the current dark theme active; show System and Dark as supported choices and Light as unavailable until a complete theme exists.
- Keep account, export, legal, and support entries honest: unavailable actions are clearly identified rather than simulated.
- Preserve all existing screens, bottom navigation, workout flows, and exercise classifications in internal data only.

## Validation
- Verify cog navigation, editing and persistence, custom-exercise edit/delete, confirmations, back navigation, mobile overflow, desktop framing, metadata, and build/runtime health.
