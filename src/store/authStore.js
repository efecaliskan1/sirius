import { create } from 'zustand';
import { auth, db, ensureAppCheckToken } from '../firebase/config';
import { 
    browserLocalPersistence,
    createUserWithEmailAndPassword, 
    getRedirectResult,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    sendEmailVerification,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
} from 'firebase/auth';
import { 
    doc, 
    setDoc, 
    getDoc, 
    runTransaction,
    serverTimestamp,
    updateDoc 
} from 'firebase/firestore';
import {
    clearClientLogoutStorage,
    createAuthError,
    isPasswordAuthUser,
    normalizeEmail,
    normalizeName,
} from '../utils/auth';
import { normalizeVisibleText } from '../utils/text';
import {
    DEFAULT_WIDGETS,
    MAX_SESSION_REWARD_MINUTES,
    MIN_FOCUS_SESSION_MINUTES,
    STREAK_PROTECTION_COST,
    THEMES,
    WEEKLY_GOAL_MINUTES_MAX,
    WEEKLY_GOAL_MINUTES_MIN,
} from '../utils/constants';
import { getDateKeyInTurkey } from '../utils/helpers';
import { calculateCoins, calculateXP } from '../utils/rewardEngine';
import { getDisplayName, getWeekKey, timestampToMillis } from '../utils/social';
import useAppStore from './appStore';

const STORAGE_KEY = 'sirius_auth_session';
const INITIAL_CACHED_USER = loadAuthFromStorage();
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const THEME_KEYS = new Set(THEMES.map((theme) => theme.key));
const SAFE_PROFILE_UPDATE_FIELDS = new Set([
    'theme',
    'weeklyGoalMinutes',
    'dashboardWidgets',
    'publicProfileEnabled',
    'dailyReflections',
]);
let presenceIntervalId = null;
let visibilityCleanup = null;
const APP_CHECK_RETRY_CODES = new Set([
    'app-check/token-unavailable',
    'permission-denied',
    'failed-precondition',
]);
const USER_ACTIONABLE_AUTH_CODES = new Set([
    'auth/unauthorized-domain',
    'auth/operation-not-allowed',
    'auth/web-storage-unsupported',
    'auth/invalid-api-key',
    'auth/app-not-authorized',
]);

function getAuthStorage() {
    if (typeof window === 'undefined') return null;

    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

function loadAuthFromStorage() {
    const storage = getAuthStorage();

    if (!storage) {
        return null;
    }

    try {
        return JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
    } catch {
        return null;
    }
}

function sanitizeUserForStorage(user) {
    if (!user) return null;

    return {
        id: user.id,
        name: user.name,
        profilePhoto: user.profilePhoto || '',
        theme: user.theme || 'calm',
        streakCount: user.streakCount || 0,
        coinBalance: user.coinBalance || 0,
        xp: user.xp || 0,
        totalFocusMinutes: user.totalFocusMinutes || 0,
        weeklyFocusMinutes: user.weeklyFocusMinutes || 0,
        weeklyFocusWeekKey: user.weeklyFocusWeekKey || getWeekKey(),
        dailyFocusMinutes: user.dailyFocusMinutes || 0,
        dailySessionsCount: user.dailySessionsCount || 0,
        dailyDateKey: user.dailyDateKey || getDateKeyInTurkey(new Date()),
        lastActiveDate: user.lastActiveDate || '',
        lastRewardedAt: user.lastRewardedAt || '',
        weeklyGoalMinutes: user.weeklyGoalMinutes || 900,
        publicProfileEnabled: Boolean(user.publicProfileEnabled),
    };
}

function saveAuthToLocal(user) {
    const storage = getAuthStorage();

    if (!storage) {
        return;
    }

    if (user) {
        storage.setItem(STORAGE_KEY, JSON.stringify(sanitizeUserForStorage(user)));
    } else {
        storage.removeItem(STORAGE_KEY);
    }
}

function buildDefaultUser(firebaseUser) {
    return {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'Student',
        email: firebaseUser.email,
        profilePhoto: firebaseUser.photoURL || '',
        createdAt: new Date().toISOString(),
        streakCount: 0,
        coinBalance: 0,
        xp: 0,
        totalFocusMinutes: 0,
        weeklyFocusMinutes: 0,
        weeklyFocusWeekKey: getWeekKey(),
        dailyFocusMinutes: 0,
        dailySessionsCount: 0,
        dailyDateKey: getDateKeyInTurkey(new Date()),
        lastActiveDate: '',
        lastRewardedAt: null,
        lastSeenAt: null,
        weeklyGoalMinutes: 900,
        dashboardWidgets: null,
        theme: 'calm',
        publicProfileEnabled: false,
        streakProtected: false,
        dailyReflections: {},
    };
}

function createPublicProfile(user) {
    const isPublicProfileEnabled = Boolean(user?.publicProfileEnabled);

    return {
        publicProfileEnabled: isPublicProfileEnabled,
        displayName: getDisplayName(user),
        theme: user?.theme || 'calm',
        photoURL: user?.profilePhoto || '',
        streakCount: user?.streakCount || 0,
        xp: user?.xp || 0,
        totalFocusMinutes: user?.totalFocusMinutes || 0,
        weeklyFocusMinutes: user?.weeklyFocusMinutes || 0,
        weeklyFocusWeekKey: user?.weeklyFocusWeekKey || getWeekKey(),
        lastActiveDate: resolveLastActiveDate(user),
        lastSeenAt: isPublicProfileEnabled ? serverTimestamp() : null,
        focusingNow: false,
        currentSessionTitle: '',
        updatedAt: serverTimestamp(),
    };
}

function clearPresenceTracking() {
    if (presenceIntervalId) {
        window.clearInterval(presenceIntervalId);
        presenceIntervalId = null;
    }
    if (visibilityCleanup) {
        visibilityCleanup();
        visibilityCleanup = null;
    }
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function isAppCheckRetryableError(error) {
    return APP_CHECK_RETRY_CODES.has(error?.code);
}

function isDateKey(value) {
    return typeof value === 'string' && DATE_KEY_PATTERN.test(value);
}

function resolveLastActiveDate(userLike) {
    const rewardedAtMs = timestampToMillis(userLike?.lastRewardedAt);
    const todayKey = getDateKeyInTurkey(new Date());

    if (rewardedAtMs > 0) {
        const rewardedDateKey = getDateKeyInTurkey(new Date(rewardedAtMs));
        return rewardedDateKey > todayKey ? todayKey : rewardedDateKey;
    }

    if (!isDateKey(userLike?.lastActiveDate)) {
        return '';
    }

    return userLike.lastActiveDate > todayKey ? '' : userLike.lastActiveDate;
}

function buildRewardedUser(baseUser, {
    safeMinutes,
    rewardCoins,
    rewardXp,
    safeSessionDate,
    safeWeekKey,
    now,
}) {
    const previousActiveDate = resolveLastActiveDate(baseUser);
    let nextStreak = baseUser.streakCount || 0;

    if (previousActiveDate !== safeSessionDate) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = getDateKeyInTurkey(yesterday);

        if (previousActiveDate === yesterdayKey || !previousActiveDate) {
            nextStreak += 1;
        } else {
            nextStreak = 1;
        }
    }

    const nextWeeklyFocusMinutes = baseUser.weeklyFocusWeekKey === safeWeekKey
        ? (baseUser.weeklyFocusMinutes || 0) + safeMinutes
        : safeMinutes;
    const currentDailyDateKey = isDateKey(baseUser?.dailyDateKey) ? baseUser.dailyDateKey : '';
    const nextDailyFocusMinutes = currentDailyDateKey === safeSessionDate
        ? (baseUser.dailyFocusMinutes || 0) + safeMinutes
        : safeMinutes;
    const nextDailySessionsCount = currentDailyDateKey === safeSessionDate
        ? (baseUser.dailySessionsCount || 0) + 1
        : 1;

    return {
        ...baseUser,
        coinBalance: (baseUser.coinBalance || 0) + rewardCoins,
        xp: (baseUser.xp || 0) + rewardXp,
        streakCount: nextStreak,
        lastActiveDate: safeSessionDate,
        lastRewardedAt: now.toISOString(),
        totalFocusMinutes: (baseUser.totalFocusMinutes || 0) + safeMinutes,
        weeklyFocusMinutes: nextWeeklyFocusMinutes,
        weeklyFocusWeekKey: safeWeekKey,
        dailyFocusMinutes: nextDailyFocusMinutes,
        dailySessionsCount: nextDailySessionsCount,
        dailyDateKey: safeSessionDate,
    };
}

function extractRewardSnapshot(userLike) {
    const resolvedLastActiveDate = resolveLastActiveDate(userLike);
    const todayKey = getDateKeyInTurkey(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = getDateKeyInTurkey(yesterday);
    const rawStreakCount = Number(userLike?.streakCount || 0);
    const streakCount = resolvedLastActiveDate === todayKey || resolvedLastActiveDate === yesterdayKey
        ? rawStreakCount
        : 0;
    const dailyDateKey = isDateKey(userLike?.dailyDateKey) ? userLike.dailyDateKey : todayKey;
    const isCurrentDay = dailyDateKey === todayKey;

    return {
        coinBalance: Number(userLike?.coinBalance || 0),
        xp: Number(userLike?.xp || 0),
        streakCount,
        totalFocusMinutes: Number(userLike?.totalFocusMinutes || 0),
        weeklyFocusMinutes: Number(userLike?.weeklyFocusMinutes || 0),
        weeklyFocusWeekKey: isDateKey(userLike?.weeklyFocusWeekKey) ? userLike.weeklyFocusWeekKey : getWeekKey(),
        dailyFocusMinutes: isCurrentDay ? Number(userLike?.dailyFocusMinutes || 0) : 0,
        dailySessionsCount: isCurrentDay ? Number(userLike?.dailySessionsCount || 0) : 0,
        dailyDateKey: todayKey,
        lastActiveDate: resolvedLastActiveDate,
        lastRewardedAt: userLike?.lastRewardedAt || '',
    };
}

function reconcileUserWithRewardState(userLike, rewardState) {
    if (!userLike) {
        return userLike;
    }

    const currentWeekKey = getWeekKey();
    const safeRewardState = extractRewardSnapshot(rewardState);
    const safeUser = extractRewardSnapshot(userLike);

    return {
        ...userLike,
        coinBalance: Math.max(safeUser.coinBalance, safeRewardState.coinBalance),
        xp: Math.max(safeUser.xp, safeRewardState.xp),
        streakCount: Math.max(safeUser.streakCount, safeRewardState.streakCount),
        totalFocusMinutes: Math.max(safeUser.totalFocusMinutes, safeRewardState.totalFocusMinutes),
        weeklyFocusMinutes: Math.max(
            safeUser.weeklyFocusWeekKey === currentWeekKey ? safeUser.weeklyFocusMinutes : 0,
            safeRewardState.weeklyFocusWeekKey === currentWeekKey ? safeRewardState.weeklyFocusMinutes : 0
        ),
        weeklyFocusWeekKey: currentWeekKey,
        dailyFocusMinutes: Math.max(safeUser.dailyFocusMinutes, safeRewardState.dailyFocusMinutes),
        dailySessionsCount: Math.max(safeUser.dailySessionsCount, safeRewardState.dailySessionsCount),
        dailyDateKey: todayKey,
        lastActiveDate: resolveLastActiveDate({
            ...userLike,
            lastActiveDate: safeRewardState.lastActiveDate || safeUser.lastActiveDate || '',
            lastRewardedAt: safeRewardState.lastRewardedAt || safeUser.lastRewardedAt || null,
        }),
        lastRewardedAt: safeRewardState.lastRewardedAt || safeUser.lastRewardedAt || null,
    };
}

async function syncRecoveredRewardStateIfNeeded(originalUser, reconciledUser) {
    if (!auth.currentUser || !originalUser || !reconciledUser) {
        return;
    }

    const hasRewardDiff =
        (originalUser.coinBalance || 0) !== (reconciledUser.coinBalance || 0) ||
        (originalUser.xp || 0) !== (reconciledUser.xp || 0) ||
        (originalUser.streakCount || 0) !== (reconciledUser.streakCount || 0) ||
        (originalUser.totalFocusMinutes || 0) !== (reconciledUser.totalFocusMinutes || 0) ||
        (originalUser.weeklyFocusMinutes || 0) !== (reconciledUser.weeklyFocusMinutes || 0) ||
        (originalUser.weeklyFocusWeekKey || '') !== (reconciledUser.weeklyFocusWeekKey || '') ||
        (originalUser.dailyFocusMinutes || 0) !== (reconciledUser.dailyFocusMinutes || 0) ||
        (originalUser.dailySessionsCount || 0) !== (reconciledUser.dailySessionsCount || 0) ||
        (originalUser.dailyDateKey || '') !== (reconciledUser.dailyDateKey || '') ||
        (originalUser.lastActiveDate || '') !== (reconciledUser.lastActiveDate || '');

    if (!hasRewardDiff) {
        return;
    }

    try {
        await updateDoc(doc(db, 'users', reconciledUser.id), {
            coinBalance: reconciledUser.coinBalance || 0,
            xp: reconciledUser.xp || 0,
            streakCount: reconciledUser.streakCount || 0,
            totalFocusMinutes: reconciledUser.totalFocusMinutes || 0,
            weeklyFocusMinutes: reconciledUser.weeklyFocusMinutes || 0,
            weeklyFocusWeekKey: reconciledUser.weeklyFocusWeekKey || getWeekKey(),
            dailyFocusMinutes: reconciledUser.dailyFocusMinutes || 0,
            dailySessionsCount: reconciledUser.dailySessionsCount || 0,
            dailyDateKey: reconciledUser.dailyDateKey || getDateKeyInTurkey(new Date()),
            lastActiveDate: reconciledUser.lastActiveDate || '',
        });
    } catch (error) {
        console.error('Failed to sync recovered reward state', error);
    }
}

async function sendVerificationEmailWithFallback(user) {
    await sendEmailVerification(user);
}

async function sendPasswordResetWithFallback(email) {
    await sendPasswordResetEmail(auth, email);
}

function sanitizeWeeklyGoalMinutes(value, fallback = 900) {
    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue)) {
        return fallback;
    }

    return clampNumber(Math.round(parsedValue), WEEKLY_GOAL_MINUTES_MIN, WEEKLY_GOAL_MINUTES_MAX);
}

function sanitizeDashboardWidgets(widgets, fallback = null) {
    if (!Array.isArray(widgets)) {
        return fallback;
    }

    return DEFAULT_WIDGETS.map((widget) => {
        const incomingWidget = widgets.find((item) => item?.id === widget.id);

        return {
            id: widget.id,
            name: widget.name,
            enabled: typeof incomingWidget?.enabled === 'boolean' ? incomingWidget.enabled : widget.enabled,
        };
    });
}

function sanitizeDailyReflections(reflections, fallback = {}) {
    if (!isPlainObject(reflections)) {
        return fallback;
    }

    return Object.entries(reflections).reduce((result, [dateKey, rating]) => {
        const parsedRating = Number(rating);

        if (isDateKey(dateKey) && Number.isInteger(parsedRating) && parsedRating >= 1 && parsedRating <= 5) {
            result[dateKey] = parsedRating;
        }

        return result;
    }, {});
}

function sanitizeProfileUpdates(updates, currentUser) {
    const sanitized = {};

    for (const [key, value] of Object.entries(updates || {})) {
        if (!SAFE_PROFILE_UPDATE_FIELDS.has(key)) {
            continue;
        }

        if (key === 'theme') {
            if (typeof value === 'string' && THEME_KEYS.has(value)) {
                sanitized.theme = value;
            }
            continue;
        }

        if (key === 'weeklyGoalMinutes') {
            sanitized.weeklyGoalMinutes = sanitizeWeeklyGoalMinutes(
                value,
                currentUser?.weeklyGoalMinutes || 900
            );
            continue;
        }

        if (key === 'dashboardWidgets') {
            sanitized.dashboardWidgets = sanitizeDashboardWidgets(
                value,
                currentUser?.dashboardWidgets || null
            );
            continue;
        }

        if (key === 'publicProfileEnabled') {
            sanitized.publicProfileEnabled = Boolean(value);
            continue;
        }

        if (key === 'dailyReflections') {
            sanitized.dailyReflections = sanitizeDailyReflections(
                value,
                currentUser?.dailyReflections || {}
            );
        }
    }

    return sanitized;
}

async function ensureFirestoreReady() {
    let lastError = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
            await ensureAppCheckToken(attempt > 0);
            return;
        } catch (error) {
            if (!isAppCheckRetryableError(error)) {
                throw error;
            }

            lastError = error;
            await delay(500 * (attempt + 1));
        }
    }

    throw lastError;
}

async function withFirestoreAppCheckRetry(operation) {
    let lastError = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
            await ensureFirestoreReady();
            return await operation();
        } catch (error) {
            if (!isAppCheckRetryableError(error)) {
                throw error;
            }

            lastError = error;
            await delay(500 * (attempt + 1));
        }
    }

    throw lastError;
}

async function ensureAuthReady() {
    let lastError = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
            await ensureAppCheckToken(attempt > 0);
            return;
        } catch (error) {
            if (!isAppCheckRetryableError(error)) {
                throw error;
            }

            lastError = error;
            await delay(700 * (attempt + 1));
        }
    }

    throw lastError;
}

async function warmAuthSecurityCheck() {
    try {
        await ensureAuthReady();
    } catch (error) {
        console.warn('Proceeding before App Check token finished loading for auth flow', error);
    }
}

function buildFallbackAuthenticatedUser(firebaseUser) {
    const fallbackUser = buildDefaultUser(firebaseUser);
    return {
        ...fallbackUser,
        name: firebaseUser.displayName || fallbackUser.name,
        profilePhoto: firebaseUser.photoURL || '',
        email: firebaseUser.email,
    };
}

const useAuthStore = create((set, get) => ({
    user: INITIAL_CACHED_USER,
    isAuthenticated: !!INITIAL_CACHED_USER,
    isLoading: true,
    authError: '',

    clearAuthError: () => set({ authError: '' }),

    syncPublicProfile: async (userData, extra = {}) => {
        if (!userData?.id) return;

        const publicProfileEnabled = extra.publicProfileEnabled ?? userData.publicProfileEnabled ?? false;
        const profilePayload = {
            userId: userData.id,
            ...createPublicProfile({ ...userData, publicProfileEnabled }),
            ...extra,
        };

        profilePayload.displayName = normalizeVisibleText(profilePayload.displayName, 80, 'Student');
        profilePayload.currentSessionTitle = normalizeVisibleText(profilePayload.currentSessionTitle, 120, '');

        if (!publicProfileEnabled) {
            profilePayload.publicProfileEnabled = false;
            profilePayload.lastSeenAt = null;
            profilePayload.focusingNow = false;
            profilePayload.currentSessionTitle = '';
        }

        await withFirestoreAppCheckRetry(async () => {
            await setDoc(
                doc(db, 'publicProfiles', userData.id),
                profilePayload,
                { merge: true }
            );
        });
    },

    setPresence: async (updates = {}) => {
        const currentUser = get().user;
        if (!currentUser?.id) return;

        if (!currentUser.publicProfileEnabled) {
            await get().syncPublicProfile(currentUser, { publicProfileEnabled: false });
            return;
        }
        await get().syncPublicProfile(currentUser, {
            lastSeenAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            ...updates,
        });
    },

    startPresenceTracking: () => {
        const currentUser = get().user;
        if (!currentUser?.id || typeof window === 'undefined') return;

        clearPresenceTracking();

        if (!currentUser.publicProfileEnabled) {
            get().syncPublicProfile(currentUser, { publicProfileEnabled: false }).catch((error) => {
                console.error('Failed to disable public presence', error);
            });
            return;
        }

        get().setPresence({ focusingNow: false }).catch((error) => {
            console.error('Failed to initialize presence', error);
        });

        presenceIntervalId = window.setInterval(() => {
            if (!document.hidden) {
                get().setPresence().catch((error) => {
                    console.error('Presence heartbeat failed', error);
                });
            }
        }, 60000);

        const handleVisibility = () => {
            get().setPresence({ focusingNow: document.hidden ? false : undefined }).catch((error) => {
                console.error('Visibility presence update failed', error);
            });
        };

        document.addEventListener('visibilitychange', handleVisibility);
        visibilityCleanup = () => document.removeEventListener('visibilitychange', handleVisibility);
    },

    stopPresenceTracking: async () => {
        clearPresenceTracking();
        const currentUser = get().user;
        if (!currentUser?.id) return;
        await get().syncPublicProfile(currentUser, {
            focusingNow: false,
            currentSessionTitle: '',
            updatedAt: serverTimestamp(),
        });
    },

    ensureUserDocument: async (firebaseUser) => {
        return withFirestoreAppCheckRetry(async () => {
            const userRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const normalizedUser = {
                    ...buildDefaultUser(firebaseUser),
                    ...userData,
                    id: firebaseUser.uid,
                    email: firebaseUser.email,
                    name: userData.name || firebaseUser.displayName || 'Student',
                    profilePhoto: userData.profilePhoto || firebaseUser.photoURL || '',
                    theme: THEME_KEYS.has(userData.theme) ? userData.theme : 'calm',
                    weeklyGoalMinutes: sanitizeWeeklyGoalMinutes(userData.weeklyGoalMinutes, 900),
                    dashboardWidgets: sanitizeDashboardWidgets(userData.dashboardWidgets, null),
                    publicProfileEnabled: Boolean(userData.publicProfileEnabled),
                    streakProtected: Boolean(userData.streakProtected),
                    dailyReflections: sanitizeDailyReflections(userData.dailyReflections, {}),
                    lastRewardedAt: userData.lastRewardedAt || null,
                };
                normalizedUser.lastActiveDate = resolveLastActiveDate(normalizedUser);

                const requiresNormalization =
                    !THEME_KEYS.has(userData.theme) ||
                    sanitizeWeeklyGoalMinutes(userData.weeklyGoalMinutes, 900) !== userData.weeklyGoalMinutes ||
                    !Object.prototype.hasOwnProperty.call(userData, 'dashboardWidgets') ||
                    (userData.dashboardWidgets !== null && !Array.isArray(userData.dashboardWidgets)) ||
                    !Object.prototype.hasOwnProperty.call(userData, 'streakProtected') ||
                    !Object.prototype.hasOwnProperty.call(userData, 'dailyReflections') ||
                    !isPlainObject(userData.dailyReflections);

                if (requiresNormalization) {
                    await setDoc(userRef, {
                        theme: normalizedUser.theme,
                        weeklyGoalMinutes: normalizedUser.weeklyGoalMinutes,
                        dashboardWidgets: normalizedUser.dashboardWidgets,
                        publicProfileEnabled: normalizedUser.publicProfileEnabled,
                        streakProtected: normalizedUser.streakProtected,
                        dailyReflections: normalizedUser.dailyReflections,
                    }, { merge: true });
                }

                return normalizedUser;
            }

            const newUser = buildDefaultUser(firebaseUser);
            await setDoc(userRef, newUser);
            await get().syncPublicProfile(newUser);
            return newUser;
        });
    },

    // Initialize listener
    init: () => {
        const cachedUser = loadAuthFromStorage();

        if (cachedUser?.id) {
            useAppStore.getState().hydratePersistedStudyData(cachedUser.id)
                .then(() => {
                    const reconciledCachedUser = reconcileUserWithRewardState(
                        cachedUser,
                        useAppStore.getState().rewardState
                    );
                    useAppStore.getState().saveRewardStateSnapshot(extractRewardSnapshot(reconciledCachedUser));
                    saveAuthToLocal(reconciledCachedUser);
                    set({
                        user: reconciledCachedUser,
                        isAuthenticated: true,
                        isLoading: false,
                        authError: '',
                    });
                })
                .catch((error) => {
                    console.error('Failed to hydrate cached study data on init', error);
                    set({
                        user: cachedUser,
                        isAuthenticated: true,
                        isLoading: false,
                        authError: '',
                    });
                });
        }

        setPersistence(auth, browserLocalPersistence).catch((error) => {
            console.error('Failed to apply persistent auth state', error);
        });

        getRedirectResult(auth).catch((error) => {
            console.error('Google redirect sign-in failed', error);
            if (USER_ACTIONABLE_AUTH_CODES.has(error?.code)) {
                set({ authError: error.code, isLoading: false });
                return;
            }
            set({ isLoading: false });
        });

        onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    if (isPasswordAuthUser(firebaseUser) && !firebaseUser.emailVerified) {
                        useAppStore.getState().resetInMemoryStudyData();
                        saveAuthToLocal(null);
                        set({ user: null, isAuthenticated: false, isLoading: false });
                        return;
                    }

                    try {
                        const finalUser = await get().ensureUserDocument(firebaseUser);
                        const appStore = useAppStore.getState();
                        await appStore.hydratePersistedStudyData(finalUser.id);
                        const reconciledUser = reconcileUserWithRewardState(finalUser, useAppStore.getState().rewardState);
                        useAppStore.getState().saveRewardStateSnapshot(extractRewardSnapshot(reconciledUser));
                        await syncRecoveredRewardStateIfNeeded(finalUser, reconciledUser);
                        saveAuthToLocal(reconciledUser);
                        set({ user: reconciledUser, isAuthenticated: true, isLoading: false, authError: '' });
                        get().startPresenceTracking();
                    } catch (bootstrapError) {
                        console.error('Auth bootstrap fallback activated', bootstrapError);
                        const fallbackUser = buildFallbackAuthenticatedUser(firebaseUser);
                        try {
                            await useAppStore.getState().hydratePersistedStudyData(fallbackUser.id);
                        } catch (hydrateError) {
                            console.error('Fallback study data hydration failed', hydrateError);
                        }
                        const recoveredFallbackUser = reconcileUserWithRewardState(
                            fallbackUser,
                            useAppStore.getState().rewardState
                        );
                        useAppStore.getState().saveRewardStateSnapshot(extractRewardSnapshot(recoveredFallbackUser));
                        saveAuthToLocal(recoveredFallbackUser);
                        set({ user: recoveredFallbackUser, isAuthenticated: true, isLoading: false, authError: '' });
                    }
                } else {
                    clearPresenceTracking();
                    useAppStore.getState().resetInMemoryStudyData();
                    saveAuthToLocal(null);
                    set({ user: null, isAuthenticated: false, isLoading: false });
                }
            } catch (error) {
                console.error('Failed to initialize auth state', error);
                useAppStore.getState().resetInMemoryStudyData();
                saveAuthToLocal(null);
                set({ user: null, isAuthenticated: false, isLoading: false });
            }
        }, (error) => {
            console.error('Auth state listener failed', error);
            useAppStore.getState().resetInMemoryStudyData();
            saveAuthToLocal(null);
            set({ user: null, isAuthenticated: false, isLoading: false });
        });
    },

    login: async (email, password) => {
        await setPersistence(auth, browserLocalPersistence);
        const result = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);

        if (isPasswordAuthUser(result.user) && !result.user.emailVerified) {
            await signOut(auth);
            throw createAuthError('auth/email-not-verified');
        }

        const finalUser = await get().ensureUserDocument(result.user);
        const appStore = useAppStore.getState();
        await appStore.hydratePersistedStudyData(finalUser.id);
        const reconciledUser = reconcileUserWithRewardState(finalUser, useAppStore.getState().rewardState);
        useAppStore.getState().saveRewardStateSnapshot(extractRewardSnapshot(reconciledUser));
        await syncRecoveredRewardStateIfNeeded(finalUser, reconciledUser);
        saveAuthToLocal(reconciledUser);
        set({ user: reconciledUser, isAuthenticated: true, authError: '' });
        await get().syncPublicProfile(reconciledUser);
        get().startPresenceTracking();
        return reconciledUser;
    },

    loginWithGoogle: async () => {
        await setPersistence(auth, browserLocalPersistence);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        try {
            const result = await signInWithPopup(auth, provider);
            const fallbackUser = buildFallbackAuthenticatedUser(result.user);
            saveAuthToLocal(fallbackUser);
            set({ user: fallbackUser, isAuthenticated: true, authError: '' });
            return { user: fallbackUser, redirecting: false };
        } catch (error) {
            const shouldFallbackToRedirect = new Set([
                'auth/popup-blocked',
                'auth/cancelled-popup-request',
                'auth/popup-closed-by-user',
                'auth/internal-error',
                'auth/network-request-failed',
                'auth/argument-error',
                'auth/operation-not-supported-in-this-environment',
                'auth/account-exists-with-different-credential',
            ]);
            const shouldNotRedirect = new Set([
                'auth/unauthorized-domain',
                'auth/operation-not-allowed',
                'auth/web-storage-unsupported',
                'auth/invalid-api-key',
                'auth/app-not-authorized',
            ]);

            if (!shouldNotRedirect.has(error?.code) && (shouldFallbackToRedirect.has(error?.code) || isAppCheckRetryableError(error))) {
                await signInWithRedirect(auth, provider);
                return { user: null, redirecting: true };
            }

            throw error;
        }
    },

    signup: async (name, email, password) => {
        await setPersistence(auth, browserLocalPersistence);
        const cleanName = normalizeName(name);
        const cleanEmail = normalizeEmail(email);
        const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        auth.languageCode = typeof document !== 'undefined' && document.documentElement.lang === 'tr' ? 'tr' : 'en';
        const newUser = {
            ...buildDefaultUser(result.user),
            name: cleanName,
            email: cleanEmail,
        };

        await updateProfile(result.user, { displayName: cleanName });
        await sendVerificationEmailWithFallback(result.user);

        try {
            await withFirestoreAppCheckRetry(async () => {
                await setDoc(doc(db, 'users', result.user.uid), newUser);
                await get().syncPublicProfile(newUser);
            });
        } catch (error) {
            console.error('Signup completed but user bootstrap is waiting on Firestore/App Check', error);
        }

        await signOut(auth);
        saveAuthToLocal(null);
        set({ user: null, isAuthenticated: false, authError: '' });
        return { email: cleanEmail, requiresEmailVerification: true };
    },

    requestPasswordReset: async (email) => {
        const cleanEmail = normalizeEmail(email);
        try {
            auth.languageCode = typeof document !== 'undefined' && document.documentElement.lang === 'tr' ? 'tr' : 'en';
            await sendPasswordResetWithFallback(cleanEmail);
        } catch (error) {
            if (error?.code !== 'auth/user-not-found') {
                throw error;
            }
        }
        return {
            email: cleanEmail,
            notice: 'If an account exists for this email, a password reset link has been sent.',
        };
    },

    logout: async () => {
        await useAppStore.getState().flushCloudStudySync();
        await get().stopPresenceTracking();
        await signOut(auth);
        saveAuthToLocal(null);
        clearClientLogoutStorage();
        useAppStore.getState().resetInMemoryStudyData();
        set({ user: null, isAuthenticated: false, authError: '' });
    },

    updateUser: async (updates) => {
        const currentUser = get().user;
        if (!currentUser) return;

        const sanitizedUpdates = sanitizeProfileUpdates(updates, currentUser);
        if (Object.keys(sanitizedUpdates).length === 0) return;

        const updatedUser = { ...currentUser, ...sanitizedUpdates };
        set({ user: updatedUser });
        saveAuthToLocal(updatedUser);

        if (auth.currentUser) {
            await ensureFirestoreReady();
            await updateDoc(doc(db, 'users', currentUser.id), sanitizedUpdates);
            await get().syncPublicProfile(updatedUser);

            if (Object.prototype.hasOwnProperty.call(sanitizedUpdates, 'publicProfileEnabled')) {
                if (sanitizedUpdates.publicProfileEnabled) {
                    get().startPresenceTracking();
                } else {
                    await get().stopPresenceTracking();
                }
            }
        }
    },

    purchaseStreakProtection: async () => {
        const currentUser = get().user;
        if (!currentUser) return currentUser;

        if (auth.currentUser) {
            await ensureFirestoreReady();
            const userRef = doc(db, 'users', currentUser.id);
            const protectedUser = await runTransaction(db, async (transaction) => {
                const userSnapshot = await transaction.get(userRef);
                const userData = userSnapshot.exists() ? userSnapshot.data() : {};
                const transactionUser = {
                    ...buildDefaultUser(auth.currentUser),
                    ...userData,
                    ...currentUser,
                    id: currentUser.id,
                    email: currentUser.email || auth.currentUser.email,
                    lastActiveDate: resolveLastActiveDate({
                        ...userData,
                        ...currentUser,
                    }),
                };

                const currentCoins = Number(transactionUser.coinBalance || 0);
                if (currentCoins < STREAK_PROTECTION_COST || transactionUser.streakProtected) {
                    return transactionUser;
                }

                const nextUser = {
                    ...transactionUser,
                    coinBalance: currentCoins - STREAK_PROTECTION_COST,
                    streakProtected: true,
                };

                transaction.update(userRef, {
                    coinBalance: nextUser.coinBalance,
                    streakProtected: true,
                });

                return nextUser;
            });

            set({ user: protectedUser });
            saveAuthToLocal(protectedUser);
            useAppStore.getState().saveRewardStateSnapshot(extractRewardSnapshot(protectedUser));
            await get().syncPublicProfile(protectedUser);
            return protectedUser;
        }

        return currentUser;
    },

    applyFocusSessionRewards: async ({ actualMinutes, sessionDate, weekKey }) => {
        const currentUser = get().user;
        if (!currentUser) return currentUser;

        const safeMinutes = clampNumber(
            Math.round(Number(actualMinutes) || 0),
            MIN_FOCUS_SESSION_MINUTES,
            MAX_SESSION_REWARD_MINUTES
        );
        const now = new Date();
        const safeSessionDate = isDateKey(sessionDate) ? sessionDate : getDateKeyInTurkey(now);
        const safeWeekKey = isDateKey(weekKey) ? weekKey : getWeekKey(now);
        const rewardCoins = calculateCoins(safeMinutes);
        const rewardXp = calculateXP('session', safeMinutes);

        if (auth.currentUser) {
            await ensureFirestoreReady();
            const userRef = doc(db, 'users', currentUser.id);
            try {
                const rewardedUser = await runTransaction(db, async (transaction) => {
                    const userSnapshot = await transaction.get(userRef);
                    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
                    const transactionUser = {
                        ...buildDefaultUser(auth.currentUser),
                        ...userData,
                        ...currentUser,
                        id: currentUser.id,
                        email: currentUser.email || auth.currentUser.email,
                    };
                    const nextUser = buildRewardedUser(transactionUser, {
                        safeMinutes,
                        rewardCoins,
                        rewardXp,
                        safeSessionDate,
                        safeWeekKey,
                        now,
                    });

                    transaction.update(userRef, {
                        coinBalance: nextUser.coinBalance,
                        xp: nextUser.xp,
                        streakCount: nextUser.streakCount,
                        lastActiveDate: nextUser.lastActiveDate,
                        totalFocusMinutes: nextUser.totalFocusMinutes,
                        weeklyFocusMinutes: nextUser.weeklyFocusMinutes,
                        weeklyFocusWeekKey: nextUser.weeklyFocusWeekKey,
                        dailyFocusMinutes: nextUser.dailyFocusMinutes,
                        dailySessionsCount: nextUser.dailySessionsCount,
                        dailyDateKey: nextUser.dailyDateKey,
                        lastRewardedAt: serverTimestamp(),
                    });

                    return nextUser;
                });

                set({ user: rewardedUser });
                saveAuthToLocal(rewardedUser);
                useAppStore.getState().saveRewardStateSnapshot(extractRewardSnapshot(rewardedUser));
                await get().syncPublicProfile(rewardedUser);
                return rewardedUser;
            } catch (error) {
                console.error('Reward transaction failed, retrying with direct update', error);

                const fallbackRewardedUser = buildRewardedUser(currentUser, {
                    safeMinutes,
                    rewardCoins,
                    rewardXp,
                    safeSessionDate,
                    safeWeekKey,
                    now,
                });

                try {
                    await updateDoc(userRef, {
                        coinBalance: fallbackRewardedUser.coinBalance,
                        xp: fallbackRewardedUser.xp,
                        streakCount: fallbackRewardedUser.streakCount,
                        lastActiveDate: fallbackRewardedUser.lastActiveDate,
                        totalFocusMinutes: fallbackRewardedUser.totalFocusMinutes,
                        weeklyFocusMinutes: fallbackRewardedUser.weeklyFocusMinutes,
                        weeklyFocusWeekKey: fallbackRewardedUser.weeklyFocusWeekKey,
                        dailyFocusMinutes: fallbackRewardedUser.dailyFocusMinutes,
                        dailySessionsCount: fallbackRewardedUser.dailySessionsCount,
                        dailyDateKey: fallbackRewardedUser.dailyDateKey,
                        lastRewardedAt: serverTimestamp(),
                    });
                } catch (directUpdateError) {
                    console.error('Direct reward update also failed, keeping local reward state', directUpdateError);
                }

                set({ user: fallbackRewardedUser });
                saveAuthToLocal(fallbackRewardedUser);
                useAppStore.getState().saveRewardStateSnapshot(extractRewardSnapshot(fallbackRewardedUser));
                get().syncPublicProfile(fallbackRewardedUser).catch((syncError) => {
                    console.error('Failed to sync public profile after local reward fallback', syncError);
                });
                return fallbackRewardedUser;
            }
        }

        const fallbackRewardedUser = buildRewardedUser(currentUser, {
            safeMinutes,
            rewardCoins,
            rewardXp,
            safeSessionDate,
            safeWeekKey,
            now,
        });

        set({ user: fallbackRewardedUser });
        saveAuthToLocal(fallbackRewardedUser);
        useAppStore.getState().saveRewardStateSnapshot(extractRewardSnapshot(fallbackRewardedUser));
        return fallbackRewardedUser;
    },
}));

export default useAuthStore;
