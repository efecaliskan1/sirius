import { create } from 'zustand';
import { auth, db } from '../firebase/config';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    sendEmailVerification,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup
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

const useAuthStore = create((set, get) => ({
    user: JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'),
    isAuthenticated: !!localStorage.getItem(STORAGE_KEY),
    isLoading: true,

    // Initialize listener
    init: () => {
        onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                if (isPasswordAuthUser(firebaseUser) && !firebaseUser.emailVerified) {
                    saveAuthToLocal(null);
                    set({ user: null, isAuthenticated: false, isLoading: false });
                    return;
                }

                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                const userData = userDoc.exists() ? userDoc.data() : null;
                
                const finalUser = {
                    id: firebaseUser.uid,
                    email: firebaseUser.email,
                    name: firebaseUser.displayName || 'Student',
                    ...userData
                };
                
                saveAuthToLocal(finalUser);
                set({ user: finalUser, isAuthenticated: true, isLoading: false });
            } else {
                saveAuthToLocal(null);
                set({ user: null, isAuthenticated: false, isLoading: false });
            }
        });
    },

    login: async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);

        if (isPasswordAuthUser(result.user) && !result.user.emailVerified) {
            await signOut(auth);
            throw createAuthError('auth/email-not-verified');
        }

        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        const userData = userDoc.data();
        
        const finalUser = {
            id: result.user.uid,
            email: result.user.email,
            name: result.user.displayName || 'Student',
            ...userData
        };
        
        saveAuthToLocal(finalUser);
        set({ user: finalUser, isAuthenticated: true });
        return finalUser;
    },

    loginWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const finalUser = {
                id: user.uid,
                email: user.email,
                name: user.displayName,
                ...userData
            };
            saveAuthToLocal(finalUser);
            set({ user: finalUser, isAuthenticated: true });
            return finalUser;
        } else {
            // First time login - create record
            const newUser = {
                id: user.uid,
                name: user.displayName,
                email: user.email,
                profilePhoto: user.photoURL || '',
                createdAt: new Date().toISOString(),
                streakCount: 0,
                coinBalance: 0,
                xp: 0,
                lastActiveDate: '',
                weeklyGoalMinutes: 900,
                dashboardWidgets: null,
                theme: 'calm',
            };
            await setDoc(doc(db, 'users', user.uid), newUser);
            saveAuthToLocal(newUser);
            set({ user: newUser, isAuthenticated: true });
            return newUser;
        }
    },

    signup: async (name, email, password) => {
        const cleanName = normalizeName(name);
        const cleanEmail = normalizeEmail(email);
        const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(result.user, { displayName: cleanName });
        await sendEmailVerification(result.user);
        
        const newUser = {
            id: result.user.uid,
            name: cleanName,
            email: cleanEmail,
            profilePhoto: '',
            createdAt: new Date().toISOString(),
            streakCount: 0,
            coinBalance: 0,
            xp: 0,
            lastActiveDate: '',
            weeklyGoalMinutes: 900,
            dashboardWidgets: null,
            theme: 'calm',
        };

        await setDoc(doc(db, 'users', result.user.uid), newUser);

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
