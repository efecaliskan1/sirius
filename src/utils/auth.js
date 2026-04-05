import { INPUT_LIMITS } from './constants';
import { normalizeVisibleText } from './text';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const RATE_LIMIT_STORAGE_PREFIX = 'sirius_auth_rate_limit_';
const SCHEDULE_NOTIFICATION_STORAGE_PREFIX = 'sirius_schedule_notification';
const LEGACY_AUTH_STORAGE_KEYS = ['studywithme_auth', 'studywithme_users'];
const LOGOUT_LOCAL_STORAGE_KEYS = ['studywithme_pomodoro_settings'];
const LOGOUT_SESSION_STORAGE_KEYS = ['sirius_pomodoro_runtime'];

function getRateLimitStorageKey(action) {
    return `${RATE_LIMIT_STORAGE_PREFIX}${action}`;
}

function loadRateLimitState(action) {
    if (typeof window === 'undefined') return { attempts: [], blockedUntil: 0 };

    try {
        return JSON.parse(localStorage.getItem(getRateLimitStorageKey(action)) || '{"attempts":[],"blockedUntil":0}');
    } catch {
        return { attempts: [], blockedUntil: 0 };
    }
}

function saveRateLimitState(action, state) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(getRateLimitStorageKey(action), JSON.stringify(state));
}

export function reserveAuthAttempt(action, config = {}) {
    const {
        maxAttempts = 5,
        windowMs = 10 * 60 * 1000,
        cooldownMs = 2 * 60 * 1000,
    } = config;

    const now = Date.now();
    const state = loadRateLimitState(action);

    if (state.blockedUntil && state.blockedUntil > now) {
        return `Too many attempts from this browser. Please wait ${Math.ceil((state.blockedUntil - now) / 1000)} seconds and try again.`;
    }

    const attempts = (state.attempts || []).filter((timestamp) => now - timestamp < windowMs);
    attempts.push(now);

    const nextState = {
        attempts,
        blockedUntil: attempts.length >= maxAttempts ? now + cooldownMs : 0,
    };

    saveRateLimitState(action, nextState);

    if (nextState.blockedUntil > now) {
        return `Too many attempts from this browser. Please wait ${Math.ceil(cooldownMs / 1000)} seconds and try again.`;
    }

    return '';
}

export function clearAuthAttemptWindow(action) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(getRateLimitStorageKey(action));
}

export function clearLegacyAuthStorage() {
    if (typeof window === 'undefined') return;

    for (const key of LEGACY_AUTH_STORAGE_KEYS) {
        localStorage.removeItem(key);
    }
}

export function clearClientLogoutStorage() {
    if (typeof window === 'undefined') return;

    const localKeys = [];

    try {
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (key) {
                localKeys.push(key);
            }
        }
    } catch {
        return;
    }

    for (const key of localKeys) {
        if (
            key.startsWith(SCHEDULE_NOTIFICATION_STORAGE_PREFIX) ||
            key.startsWith(RATE_LIMIT_STORAGE_PREFIX) ||
            LOGOUT_LOCAL_STORAGE_KEYS.includes(key) ||
            LEGACY_AUTH_STORAGE_KEYS.includes(key)
        ) {
            localStorage.removeItem(key);
        }
    }

    try {
        for (const key of LOGOUT_SESSION_STORAGE_KEYS) {
            window.sessionStorage?.removeItem(key);
        }
    } catch {
        // Ignore session storage cleanup failures.
    }
}

export function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

export function normalizeName(name) {
    return normalizeVisibleText(name, INPUT_LIMITS.fullName);
}

export function validateEmail(email) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        return 'Email address is required.';
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
        return 'Enter a valid email address.';
    }

    if (normalizedEmail.length > INPUT_LIMITS.email) {
        return `Email address must be ${INPUT_LIMITS.email} characters or fewer.`;
    }

    return '';
}

export function validatePassword(password) {
    if (!password) {
        return 'Password is required.';
    }

    if (password.length < 8) {
        return 'Password must be at least 8 characters.';
    }

    if (password.length > INPUT_LIMITS.password) {
        return `Password must be ${INPUT_LIMITS.password} characters or fewer.`;
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        return 'Password must include at least one letter and one number.';
    }

    return '';
}

export function validateName(name) {
    const normalizedName = normalizeName(name);

    if (!normalizedName) {
        return 'Full name is required.';
    }

    if (normalizedName.length < 2) {
        return 'Full name must be at least 2 characters.';
    }

    if (normalizedName.length > INPUT_LIMITS.fullName) {
        return `Full name must be ${INPUT_LIMITS.fullName} characters or fewer.`;
    }

    return '';
}

export function validateSignupForm({ name, email, password, confirmPassword }) {
    return (
        validateName(name) ||
        validateEmail(email) ||
        validatePassword(password) ||
        (password !== confirmPassword ? 'Passwords do not match.' : '')
    );
}

export function validateLoginForm({ email, password }) {
    return validateEmail(email) || (!password ? 'Password is required.' : '');
}

export function isPasswordAuthUser(user) {
    return user?.providerData?.some((provider) => provider.providerId === 'password');
}

export function createAuthError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
}

export function getAuthErrorMessage(error) {
    switch (error?.code) {
        case 'auth/email-not-verified':
            return 'Verify your email before signing in. Check your inbox for the confirmation link.';
        case 'auth/email-already-in-use':
            return 'We could not create your account with these details. Please try again or use the sign-in flow if you already have access.';
        case 'auth/unauthorized-domain':
            return 'Google sign-in is blocked for this domain. Add your live site domain to Firebase Authorized domains.';
        case 'auth/operation-not-allowed':
            return 'Google sign-in is not enabled in Firebase Authentication.';
        case 'auth/web-storage-unsupported':
            return 'This browser blocks required sign-in storage. Disable strict privacy blocking or try another browser.';
        case 'auth/invalid-email':
            return 'Enter a valid email address.';
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Email or password is incorrect.';
        case 'auth/popup-blocked':
            return 'Popup was blocked by the browser. We will redirect you to Google instead.';
        case 'auth/cancelled-popup-request':
            return 'Google sign-in was interrupted. Please try again.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please wait a bit and try again.';
        case 'auth/popup-closed-by-user':
            return 'Google sign-in was cancelled before it finished.';
        case 'auth/network-request-failed':
            return 'Network error. Check your connection and try again.';
        case 'app-check/token-unavailable':
            return 'Security verification did not finish. Refresh the page and try Google sign-in again in a few seconds.';
        case 'permission-denied':
        case 'failed-precondition':
            return 'Security verification is still loading. Wait a few seconds and try again.';
        default:
            return 'Something went wrong. Please try again.';
    }
}
