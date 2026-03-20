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

## Requires manual action outside the repo

These items cannot be fully solved by code alone and must be completed in the hosting / Firebase panels:

### 1. Rotate current environment values if needed

`.env` had already been tracked before this hardening pass. Even though Firebase web config values are typically public identifiers rather than server secrets, you should still:

- move production values to Vercel Environment Variables
- remove `.env` from future commits
- rotate any value you consider sensitive

### 2. Enable Firebase App Check in the console

The code now supports App Check, but you must still:

- create a reCAPTCHA v3 key
- add it as `VITE_FIREBASE_APPCHECK_SITE_KEY`
- enforce App Check for Firebase products you use

### 3. Protect Vercel preview deployments

Preview deployment access rules are controlled from Vercel project settings. Turn on Deployment Protection / Preview Protection there if you do not want branch previews to be openly reachable.

### 4. Source / log exposure in historical deployments

`public: false` protects new deployments. Old deployments or previously published build logs may still exist in Vercel and should be reviewed or removed manually.

### 5. Server-side rate limiting

This repo does not currently ship a custom backend or API routes. If you later add server endpoints, add true server-side rate limiting there as well. Client throttling alone is not sufficient for hostile traffic.

### 6. Vercel technology fingerprinting

Some platform-level response fingerprints may still be visible on Vercel and are not fully removable from application code.

### 7. Client-side storage findings

This app still stores study data such as tasks, sessions, and schedule entries in browser storage because it is designed as a client-heavy app. The most sensitive mirrored auth snapshot was reduced and moved to session storage, but a full fix for browser-storage findings would require moving more user data to Firebase/server-backed storage.

### 8. CSRF findings

Classic CSRF mainly applies to cookie-authenticated state-changing server endpoints. This app currently relies on Firebase client auth rather than custom cookie-authenticated form endpoints, so scanner tools may over-report this item. Session-only auth persistence and App Check were added as extra hardening, but if you add server APIs later, include true CSRF tokens or same-site cookie protections there.
