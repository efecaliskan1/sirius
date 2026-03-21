import { create } from 'zustand';
import { auth, db, ensureAppCheckToken } from '../firebase/config';
import { 
    browserSessionPersistence,
    createUserWithEmailAndPassword, 
    getRedirectResult,
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
    serverTimestamp,
    updateDoc 
} from 'firebase/firestore';
import {
    createAuthError,
    isPasswordAuthUser,
    normalizeEmail,
    normalizeName,
} from '../utils/auth';
import { getDisplayName, getWeekKey } from '../utils/social';

const STORAGE_KEY = 'sirius_auth_session';
let presenceIntervalId = null;
let visibilityCleanup = null;

function getAuthStorage() {
    if (typeof window === 'undefined') return null;

    try {
        return window.sessionStorage;
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
        xp: user.xp || 0,
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
        lastActiveDate: '',
        lastSeenAt: null,
        weeklyGoalMinutes: 900,
        dashboardWidgets: null,
        theme: 'calm',
    };
}

function createPublicProfile(user) {
    return {
        displayName: getDisplayName(user),
        theme: user?.theme || 'calm',
        photoURL: user?.profilePhoto || '',
        streakCount: user?.streakCount || 0,
        xp: user?.xp || 0,
        totalFocusMinutes: user?.totalFocusMinutes || 0,
        weeklyFocusMinutes: user?.weeklyFocusMinutes || 0,
        weeklyFocusWeekKey: user?.weeklyFocusWeekKey || getWeekKey(),
        lastActiveDate: user?.lastActiveDate || '',
        lastSeenAt: serverTimestamp(),
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

async function ensureFirestoreReady() {
    await ensureAppCheckToken();
}

const useAuthStore = create((set, get) => ({
    user: loadAuthFromStorage(),
    isAuthenticated: !!loadAuthFromStorage(),
    isLoading: true,

    syncPublicProfile: async (userData, extra = {}) => {
        if (!userData?.id) return;

        await ensureFirestoreReady();
        await setDoc(
            doc(db, 'publicProfiles', userData.id),
            {
                userId: userData.id,
                ...createPublicProfile(userData),
                ...extra,
            },
            { merge: true }
        );
    },

    setPresence: async (updates = {}) => {
        const currentUser = get().user;
        if (!currentUser?.id) return;

        await ensureFirestoreReady();
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
        await ensureFirestoreReady();
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
                id: firebaseUser.uid,
                email: firebaseUser.email,
                name: firebaseUser.displayName || 'Student',
                ...userData
            };
        }

        const newUser = buildDefaultUser(firebaseUser);
        await setDoc(userRef, newUser);
        await get().syncPublicProfile(newUser);
        return newUser;
    },

    // Initialize listener
    init: () => {
        setPersistence(auth, browserSessionPersistence).catch((error) => {
            console.error('Failed to apply session auth persistence', error);
        });

        getRedirectResult(auth).catch((error) => {
            console.error('Google redirect sign-in failed', error);
        });

        onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    if (isPasswordAuthUser(firebaseUser) && !firebaseUser.emailVerified) {
                        saveAuthToLocal(null);
                        set({ user: null, isAuthenticated: false, isLoading: false });
                        return;
                    }

                    const finalUser = await get().ensureUserDocument(firebaseUser);
                    
                    saveAuthToLocal(finalUser);
                    set({ user: finalUser, isAuthenticated: true, isLoading: false });
                    get().startPresenceTracking();
                } else {
                    clearPresenceTracking();
                    saveAuthToLocal(null);
                    set({ user: null, isAuthenticated: false, isLoading: false });
                }
            } catch (error) {
                console.error('Failed to initialize auth state', error);
                saveAuthToLocal(null);
                set({ user: null, isAuthenticated: false, isLoading: false });
            }
        }, (error) => {
            console.error('Auth state listener failed', error);
            saveAuthToLocal(null);
            set({ user: null, isAuthenticated: false, isLoading: false });
        });
    },

    login: async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);

        if (isPasswordAuthUser(result.user) && !result.user.emailVerified) {
            await signOut(auth);
            throw createAuthError('auth/email-not-verified');
        }

        const finalUser = await get().ensureUserDocument(result.user);
        
        saveAuthToLocal(finalUser);
        set({ user: finalUser, isAuthenticated: true });
        await get().syncPublicProfile(finalUser);
        get().startPresenceTracking();
        return finalUser;
    },

    loginWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        try {
            const result = await signInWithPopup(auth, provider);
            const finalUser = await get().ensureUserDocument(result.user);
            saveAuthToLocal(finalUser);
            set({ user: finalUser, isAuthenticated: true });
            await get().syncPublicProfile(finalUser);
            get().startPresenceTracking();
            return { user: finalUser, redirecting: false };
        } catch (error) {
            if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
                await signInWithRedirect(auth, provider);
                return { user: null, redirecting: true };
            }

            throw error;
        }
    },

    signup: async (name, email, password) => {
        const cleanName = normalizeName(name);
        const cleanEmail = normalizeEmail(email);
        const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const newUser = {
            ...buildDefaultUser(result.user),
            name: cleanName,
            email: cleanEmail,
        };

        await ensureFirestoreReady();
        
        await Promise.all([
            updateProfile(result.user, { displayName: cleanName }),
            sendEmailVerification(result.user),
            setDoc(doc(db, 'users', result.user.uid), newUser),
            get().syncPublicProfile(newUser),
        ]);

        await signOut(auth);
        saveAuthToLocal(null);
        set({ user: null, isAuthenticated: false });
        return { email: cleanEmail, requiresEmailVerification: true };
    },

    logout: async () => {
        await get().stopPresenceTracking();
        await signOut(auth);
        saveAuthToLocal(null);
        set({ user: null, isAuthenticated: false });
    },

    updateUser: async (updates) => {
        const currentUser = get().user;
        if (!currentUser) return;

        const updatedUser = { ...currentUser, ...updates };
        set({ user: updatedUser });
        saveAuthToLocal(updatedUser);

        if (auth.currentUser) {
            await ensureFirestoreReady();
            await updateDoc(doc(db, 'users', currentUser.id), updates);
            await get().syncPublicProfile(updatedUser);
        }
    },
}));

export default useAuthStore;
