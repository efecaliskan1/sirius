import { Capacitor } from '@capacitor/core';

export const NATIVE_GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID || '';
export const NATIVE_GOOGLE_IOS_CLIENT_ID = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID || '';

export function getNativePlatform() {
    return Capacitor.getPlatform();
}

export function isNativePlatform() {
    return Capacitor.isNativePlatform();
}

export function getReversedGoogleClientId(clientId) {
    if (typeof clientId !== 'string' || !clientId.endsWith('.apps.googleusercontent.com')) {
        return '';
    }

    return `com.googleusercontent.apps.${clientId.replace('.apps.googleusercontent.com', '')}`;
}

export function isNativeGoogleConfigured() {
    if (!isNativePlatform()) {
        return true;
    }

    // serverClientID (web client ID) her platformda gerekli - Firebase idToken dogrulamasi icin
    if (!NATIVE_GOOGLE_WEB_CLIENT_ID) {
        return false;
    }

    const platform = getNativePlatform();

    if (platform === 'ios') {
        return Boolean(NATIVE_GOOGLE_IOS_CLIENT_ID && NATIVE_GOOGLE_WEB_CLIENT_ID);
    }

    return true;
}
