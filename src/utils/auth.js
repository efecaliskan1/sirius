const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const RATE_LIMIT_STORAGE_PREFIX = 'sirius_auth_rate_limit_';

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

export function normalizeEmail(email) {
    return email.trim().toLowerCase();
}

export function normalizeName(name) {
    return name.trim().replace(/\s+/g, ' ');
}

export function validateEmail(email) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        return 'Email address is required.';
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
        return 'Enter a valid email address.';
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
            return 'This email is already registered. Try signing in instead.';
        case 'auth/unauthorized-domain':
            return 'Google sign-in is blocked for this domain. Add your live site domain to Firebase Authorized domains.';
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
            return 'Access was blocked by a security check. Refresh the page and try again.';
        default:
            return 'Something went wrong. Please try again.';
    }
}
