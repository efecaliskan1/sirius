# Sirius

Sirius is a Vite + React study companion app with Firebase auth, scheduling, tasks, Pomodoro, rewards, and ambient audio.

## Web development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Mobile app setup

This project is now scaffolded for both Android and iOS with Capacitor.

Included:
- `android/` native Android project
- `ios/` native iOS project
- `capacitor.config.json`
- helper scripts in `package.json`

### Useful commands

```bash
npm run mobile:build
npm run cap:android
npm run cap:ios
```

`npm run mobile:build` does two things:
1. builds the web app into `dist/`
2. syncs the built files into the native Capacitor projects

## Store publishing checklist

### Android / Play Store

1. Run `npm run mobile:build`
2. Open Android Studio with:
   ```bash
   npm run cap:android
   ```
3. Set final app icon, splash, app name, and signing config
4. Create a release `AAB`
5. Upload to Google Play Console

### iOS / App Store

1. Run `npm run mobile:build`
2. Open Xcode with:
   ```bash
   npm run cap:ios
   ```
3. Set final bundle identifier, app icon, splash, signing team, and privacy strings
4. Archive and upload through Xcode
5. Submit in App Store Connect

## Important Firebase note for mobile

This repo is now wrapped for mobile, but Firebase auth and App Check still need device testing in the native shells.

Before store release, verify:
- email/password login
- Google sign-in on Android and iOS
- app resume after backgrounding
- audio playback behavior
- Firebase App Check behavior inside native webviews

If Google auth needs native-specific handling later, that can be added as the next step.
