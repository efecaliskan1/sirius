# Sirius Security Notes

This project is a client-side React application deployed on Vercel and backed by Firebase.

## Fixed in repository

- Added a strict `vercel.json` security header policy:
  - `Content-Security-Policy`
  - `X-Frame-Options`
  - `Strict-Transport-Security`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `X-Content-Type-Options`
  - additional hardening headers
- Set `public: false` in `vercel.json` so deployments are not created as publicly exposed source/log deployments.
- Explicitly disabled production sourcemaps in `vite.config.js`.
- Removed tracked environment-file usage from future commits by ignoring `.env*` and adding `.env.example`.
- Added `robots.txt` and `sitemap.xml`.
- Added optional Firebase App Check bootstrap using `VITE_FIREBASE_APPCHECK_SITE_KEY`.
- Added lightweight client-side throttling for repeated login/signup attempts.
- Replaced the remote Pomodoro completion sound with a local Web Audio chime.
- Switched the mirrored auth snapshot from `localStorage` to `sessionStorage` and reduced the stored fields.
- Forced Firebase auth persistence to browser-session scope instead of long-lived browser persistence.
- Added field-level Firestore validation for `/users/{userId}` so protected values such as `coinBalance`, `xp`, `streakCount`, and focus totals can no longer be arbitrarily overwritten through generic profile updates.
- Added input length limits and numeric clamping for the main user-editable fields, including `displayName`, notes, task titles, course titles, and `weeklyGoalMinutes`.
- Switched public profile visibility to opt-in and tightened `publicProfiles` reads to `publicProfileEnabled == true` or document owner only.

## Confirmed in hosting / Firebase panels

These were completed outside the repo and are no longer outstanding:

- Firebase App Check is registered with a reCAPTCHA v3 provider.
- Firestore App Check enforcement is enabled.
- Vercel Deployment Protection / Preview Protection is enabled.
- The Firebase browser API key is restricted to approved website origins.
- The original tracked `.env` file was removed from git history.

## Requires manual action outside the repo

These items cannot be fully solved by code alone and must be completed in the hosting / Firebase panels:

### 1. Publish updated Firestore rules

The repository now contains stricter field-level validation in `firestore.rules`, but Firebase does not apply those changes until they are published from the Firestore Rules panel or deployed through Firebase CLI.

This repo now includes `firebase.json` and `.firebaserc`, so the deploy command is:

```bash
firebase deploy --only firestore:rules
```

### 2. Source / log exposure in historical deployments

`public: false` protects new deployments. Old deployments or previously published build logs may still exist in Vercel and should be reviewed or removed manually.

### 3. Server-side rate limiting

This repo does not currently ship a custom backend or API routes. If you later add server endpoints, add true server-side rate limiting there as well. Client throttling alone is not sufficient for hostile traffic.

### 4. Vercel technology fingerprinting

Some platform-level response fingerprints may still be visible on Vercel and are not fully removable from application code.

### 5. Client-side storage findings

This app still stores study data such as tasks, sessions, and schedule entries in browser storage because it is designed as a client-heavy app. The most sensitive mirrored auth snapshot was reduced and moved to session storage, but a full fix for browser-storage findings would require moving more user data to Firebase/server-backed storage.

### 6. CSS attribute CSP tradeoff

The current CSP keeps `style-src-attr 'unsafe-inline'` because the UI still relies on many inline style attributes for dynamic theming and motion. Removing it completely would require a broader refactor to CSS variables / class-based styling across the app.

### 7. CSRF findings

Classic CSRF mainly applies to cookie-authenticated state-changing server endpoints. This app currently relies on Firebase client auth rather than custom cookie-authenticated form endpoints, so scanner tools may over-report this item. Session-only auth persistence and App Check were added as extra hardening, but if you add server APIs later, include true CSRF tokens or same-site cookie protections there.
