# RECOMP'D Welcome and Onboarding

## Build
- Add focused Welcome, Create Account, Log In, Forgot Password, About You, and Training Setup routes using the existing RECOMP'D components and tokens.
- Hide the existing app navigation only during welcome/account/onboarding routes; leave all established app screens and navigation unchanged.
- Add a subtle progress indicator, preserved back-navigation state, password visibility controls, and mobile-friendly validated inputs.

## Shared data
- Extend the existing versioned user-preferences model with training goals and onboarding completion; About You and Training Setup write directly to that same model used by Settings.
- Keep email and password as transient account-form state only; do not persist credentials or simulate authentication.
- Mark onboarding complete only from Start training, then enter the existing Home screen.

## First launch and testing
- Route incomplete first launches into Welcome while completed users continue directly into the existing app.
- Add an unobtrusive Restart onboarding action inside Settings for preview/testing.
- Keep Forgot Password, email confirmation, and account connection clearly unavailable until real authentication is added.

## Validation
- Verify field validation, show/hide password, retained values when moving backward, preference integration with Settings, first-launch/completed routing, reset behavior, mobile keyboard layouts, overflow, and build/runtime health.
