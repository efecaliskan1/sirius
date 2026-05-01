# Sirius Mobile Release Checklist

This project is now scaffolded for native Android and iOS builds with Capacitor.

## What is already ready

- Capacitor installed
- Android project created in `android/`
- iOS project created in `ios/`
- Web build sync script added
- Capacitor doctor passes
- Source app icon saved in `mobile-assets/app-icon-source.png`
- App icon generated from `imagei.png`
- Native splash assets generated
- Android debug build passes
- Android release AAB build passes
- iOS simulator build passes
- iOS unsigned Release device build passes
- iOS startup no longer crashes on boot
- iOS now reaches the native login screen
- Native startup spinner no longer blocks unauthenticated users forever
- Native Google Sign-In plugin installed
- iOS Google Sign-In plist sync script added

## Commands

```bash
npm run mobile:build
npm run cap:android
npm run cap:ios
```

## Verified local outputs

- Android debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Android release AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- iOS Release app bundle: `~/Library/Developer/Xcode/DerivedData/.../Build/Products/Release-iphoneos/App.app`

The current Android AAB was produced locally to verify the release build pipeline. For Play Store publishing, configure release signing in Android Studio or Gradle before uploading a production build.

## Before Play Store upload

1. Run:
   ```bash
   npm run mobile:build
   ```
2. Open Android Studio:
   ```bash
   npm run cap:android
   ```
3. Set final:
   - release app name
   - signing config / keystore
   - version code and version name
4. Test:
   - email login
   - Google login
   - Pomodoro save flow
   - audio playback
   - app resume after background
5. Build release `AAB`
6. Upload to Play Console

## Before App Store upload

1. Run:
   ```bash
   npm run mobile:build
   ```
2. Open Xcode:
   ```bash
   npm run cap:ios
   ```
3. Set final:
   - signing team
   - bundle identifier
   - version and build number
   - privacy strings if any native capability is added later
4. Test on a real iPhone:
   - email login
   - Google login
   - Pomodoro save flow
   - audio playback
   - app restore after background
5. Archive build
6. Upload through Xcode / App Store Connect

## Important project-specific risks to test

- Native Google sign-in after client IDs are configured
- Firebase App Check behavior on device
- Session persistence after app relaunch
- Daily counters and reward persistence
- Ambient audio behavior after minimize / resume

## Current blocker for native Google sign-in

The code path is now wired, but these env values are still required:

- `VITE_GOOGLE_WEB_CLIENT_ID`
- `VITE_GOOGLE_IOS_CLIENT_ID`

`npm run mobile:build` now runs a sync step that writes the iOS Google client values into `ios/App/App/Info.plist` automatically when those env vars exist.

## Current native auth status

- Email and password flow works in native.
- Google sign-in still works on web.
- Native Google sign-in is prepared with a dedicated Capacitor-safe plugin flow and only needs the client IDs above to be tested end-to-end.

## Important note about the web version

Adding Capacitor does **not** break the web version by itself.

The web app still runs through:

```bash
npm run dev
npm run build
```

Capacitor only wraps the built web app into native shells.

The web version will only be affected if future changes add:
- native-only plugins without guards
- mobile-specific auth code that replaces the web flow
- platform conditionals implemented incorrectly
