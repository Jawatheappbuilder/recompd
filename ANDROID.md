# RECOMP'D Android app

This repository is prepared for a native Android shell using Capacitor.

## First native build

1. Run `npm install` to update the lockfile with the Capacitor packages.
2. Run `npm run android:add` once to generate the `android/` project.
3. Run `npm run android:sync` after web/native configuration changes.
4. Run `npm run android:open` to open the project in Android Studio.
5. Replace the generated Android launcher/adaptive icon assets with the approved RECOMP'D R + barbell artwork.
6. Build an Android App Bundle (AAB) in Android Studio for Play Console testing/release.

The native shell currently loads the production RECOMP'D deployment at https://recompd.vercel.app so the existing Lovable Cloud authentication/data backend continues to be used.
