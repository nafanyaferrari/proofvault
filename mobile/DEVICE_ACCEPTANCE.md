# ProofVault mobile device acceptance

## Automated checks completed

- TypeScript compilation passes for the Expo workspace.
- Expo dependency compatibility passes for SDK 56.
- Metro produces Android and iOS Hermes bundles.
- Shared valuation, completeness, backup, and export tests pass.
- The Vite production build remains green.

## Real-device checks

Run these on one current iPhone and one current Android device before a store build:

1. Fresh install opens the seeded inventory from SQLite.
2. Open the drill and take an item photo. Deny permission once, then grant it and retry.
3. Choose a library photo, close the app, reopen it, and confirm both images remain visible.
4. Find comparable values, choose “Use this value,” restart, and confirm the estimate persists.
5. Enable App Lock. Background and reopen the app; confirm authentication is required.
6. Cancel authentication and confirm inventory stays hidden, then unlock successfully.
7. Confirm VoiceOver/TalkBack announces cards, photo buttons, App Lock, and valuation actions.

Face ID requires an Expo development build rather than Expo Go. Camera, file persistence, and biometric behavior must be tested on physical devices; successful native bundles cannot prove hardware behavior.
