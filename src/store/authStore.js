import { create } from 'zustand';
import { auth, db } from '../firebase/config';
import { 
    createUserWithEmailAndPassword, 
    getRedirectResult,
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
    updateDoc 
} from 'firebase/firestore';
import {
    createAuthError,
    isPasswordAuthUser,
    normalizeEmail,
    normalizeName,
} from '../utils/auth';

const STORAGE_KEY = 'studywithme_auth';

function saveAuthToLocal(user) {
    if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
        localStorage.removeItem(STORAGE_KEY);
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
        lastActiveDate: '',
        weeklyGoalMinutes: 900,
        dashboardWidgets: null,
        theme: 'calm',
    };
}

const useAuthStore = create((set, get) => ({
    user: JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'),
    isAuthenticated: !!localStorage.getItem(STORAGE_KEY),
    isLoading: true,

    ensureUserDocument: async (firebaseUser) => {
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
        return newUser;
    },

    // Initialize listener
    init: () => {
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
                } else {
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
        
        await Promise.all([
            updateProfile(result.user, { displayName: cleanName }),
            sendEmailVerification(result.user),
            setDoc(doc(db, 'users', result.user.uid), newUser),
        ]);

        await signOut(auth);
        saveAuthToLocal(null);
        set({ user: null, isAuthenticated: false });
        return { email: cleanEmail, requiresEmailVerification: true };
    },

    logout: async () => {
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
            await updateDoc(doc(db, 'users', currentUser.id), updates);
        }
    },
}));

export default useAuthStore;
