const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

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
        default:
            return 'Something went wrong. Please try again.';
    }
}
