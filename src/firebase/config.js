import { initializeApp } from 'firebase/app';
import { getToken, initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;

let appCheck = null;

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

export async function ensureAppCheckToken(forceRefresh = false) {
    if (!appCheck || typeof window === 'undefined') {
        return null;
    }

    try {
        return await getToken(appCheck, forceRefresh);
    } catch (error) {
        console.error('Failed to fetch App Check token', error);
        const tokenError = new Error('app-check/token-unavailable');
        tokenError.code = 'app-check/token-unavailable';
        tokenError.cause = error;
        throw tokenError;
    }
}

export { app, auth, db, appCheck };
