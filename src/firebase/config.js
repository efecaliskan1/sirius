import { initializeApp } from 'firebase/app';
import { getToken, initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import {
    getAuth,
    initializeAuth,
    indexedDBLocalPersistence,
    browserLocalPersistence,
    inMemoryPersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'sirius-a56cf';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

const isNativePlatform = Capacitor.isNativePlatform();

// CRITICAL FIX for Capacitor iOS Google Sign-In:
// On native (Capacitor WKWebView), the default getAuth() resolves to
// in-memory persistence, which causes signInWithCredential() to hang
// for ~50 seconds (or until the user taps the screen) after a native
// Google Sign-In flow returns. The Firebase JS SDK requires that
// initializeAuth be called BEFORE any other Firebase Auth call when
// running in a non-browser environment. Switching to
// indexedDBLocalPersistence (with localStorage and memory as fallbacks)
// eliminates the hang and lets the credential exchange resolve
// immediately.
//
// Refs:
//   https://github.com/firebase/firebase-js-sdk/issues/2700
//   https://github.com/capawesome-team/capacitor-firebase/blob/main/packages/authentication/docs/firebase-js-sdk.md
let auth;

if (isNativePlatform) {
    try {
        auth = initializeAuth(app, {
            persistence: [
                indexedDBLocalPersistence,
                browserLocalPersistence,
                inMemoryPersistence,
            ],
        });
    } catch (error) {
        // initializeAuth throws if it has already been called for this
        // FirebaseApp (can happen with HMR / fast refresh). Fall back to
        // getAuth so the existing instance is reused.
        console.warn('initializeAuth fell back to getAuth:', error?.message);
        auth = getAuth(app);
    }
} else {
    auth = getAuth(app);
}

const db = getFirestore(app);
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;

let appCheck = null;
let appCheckWarmupPromise = null;

function initializeAppCheckIfNeeded() {
    if (appCheck || typeof window === 'undefined' || !appCheckSiteKey || isNativePlatform) {
        return appCheck;
    }

    try {
        appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(appCheckSiteKey),
            isTokenAutoRefreshEnabled: true,
        });
    } catch (error) {
        console.error('Firebase App Check initialization failed', error);
    }

    return appCheck;
}

function delay(ms) {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
    });
}

async function fetchAppCheckToken(forceRefresh = false) {
    if (!appCheck || typeof window === 'undefined') {
        return null;
    }

    return getToken(appCheck, forceRefresh);
}

export function primeAppCheckToken() {
    if (typeof window === 'undefined') {
        return Promise.resolve(null);
    }

    initializeAppCheckIfNeeded();

    if (!appCheck) {
        return Promise.resolve(null);
    }

    if (!appCheckWarmupPromise) {
        appCheckWarmupPromise = (async () => {
            try {
                return await fetchAppCheckToken(false);
            } finally {
                appCheckWarmupPromise = null;
            }
        })();
    }

    return appCheckWarmupPromise;
}

export async function ensureAppCheckToken(forceRefresh = false) {
    if (typeof window === 'undefined') {
        return null;
    }

    initializeAppCheckIfNeeded();

    if (!appCheck) {
        return null;
    }

    try {
        await primeAppCheckToken();
        return await fetchAppCheckToken(forceRefresh);
    } catch (error) {
        try {
            await delay(900);
            return await fetchAppCheckToken(true);
        } catch (retryError) {
            console.error('Failed to fetch App Check token', retryError);
            const tokenError = new Error('app-check/token-unavailable');
            tokenError.code = 'app-check/token-unavailable';
            tokenError.cause = retryError;
            throw tokenError;
        }
    }
}

export async function ensureFreshAppCheckToken() {
    try {
        return await ensureAppCheckToken(true);
    } catch (error) {
        const tokenError = new Error('app-check/token-unavailable');
        tokenError.code = 'app-check/token-unavailable';
        tokenError.cause = error;
        throw tokenError;
    }
}

export { app, auth, db, appCheck };
