import { initializeApp } from 'firebase/app';
import { getToken, initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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
const auth = getAuth(app);
const db = getFirestore(app);
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;

let appCheck = null;
let appCheckWarmupPromise = null;

if (typeof window !== 'undefined' && appCheckSiteKey) {
    try {
        appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(appCheckSiteKey),
            isTokenAutoRefreshEnabled: true,
        });
    } catch (error) {
        console.error('Firebase App Check initialization failed', error);
    }
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
    if (!appCheck || typeof window === 'undefined') {
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
    if (!appCheck || typeof window === 'undefined') {
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

if (typeof window !== 'undefined' && appCheck) {
    window.setTimeout(() => {
        primeAppCheckToken().catch((error) => {
            console.error('Initial App Check warmup failed', error);
        });
    }, 0);
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
