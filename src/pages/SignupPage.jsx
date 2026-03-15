import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import {
    getAuthErrorMessage,
    normalizeEmail,
    validateSignupForm,
} from '../utils/auth';

export default function SignupPage() {
    const signup = useAuthStore((s) => s.signup);
    const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const normalizedEmail = normalizeEmail(email);
        const validationError = validateSignupForm({
            name,
            email: normalizedEmail,
            password,
            confirmPassword,
        });

        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);
        try {
            const result = await signup(name, normalizedEmail, password);
            navigate('/login', {
                replace: true,
                state: {
                    email: result.email,
                    notice: `We sent a verification link to ${result.email}. Verify your email before signing in.`,
                },
            });
        } catch (err) {
            setError(getAuthErrorMessage(err));
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setIsLoading(true);
        try {
            await loginWithGoogle();
            navigate('/');
        } catch (err) {
            setError(getAuthErrorMessage(err));
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #F5F7FB 0%, #E6F4EA 50%, #F0F4FF 100%)' }}>
            {/* Background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{ y: [0, -20, 0], x: [0, 15, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-[10%] left-[10%] w-64 h-64 rounded-full bg-emerald-400/10 blur-[80px]"
                />
                <motion.div
                    animate={{ y: [0, 20, 0], x: [0, -15, 0] }}
                    transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                    className="absolute bottom-[10%] right-[10%] w-80 h-80 rounded-full bg-blue-400/10 blur-[100px]"
                />
            </div>

            {/* Signup Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-[400px] z-10 px-6 relative"
            >
                {/* Branding */}
                <div className="mb-8">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                        className="flex items-center gap-2.5 mb-6"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center text-white text-lg shadow-lg shadow-emerald-200/50">
                            🎓
                        </div>
                        <span className="text-lg font-bold text-[#111827] tracking-tight">StudywithME</span>
                    </motion.div>

                    <h1 className="text-2xl font-bold text-[#111827] leading-tight">
                        Create your<br />
                        <span className="text-emerald-500">study space</span>
                    </h1>
                    <p className="text-sm text-slate-400 mt-1.5">Join thousands of students studying smarter</p>
                </div>

                {/* Signup Card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="bg-white/80 backdrop-blur-xl rounded-3xl p-7 shadow-xl shadow-slate-200/40 border border-white/60"
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Google Sign In (Mock) */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-[13px] flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Sign up with Google
                        </button>

                        <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-slate-100"></div>
                            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Or continue with email</span>
                            <div className="flex-1 h-px bg-slate-100"></div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-50 text-red-600 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                {error}
                            </motion.div>
                        )}
                        <div>
                            <label htmlFor="name" className="block text-[13px] font-medium text-slate-500 mb-1.5">Full Name</label>
                            <input
                                id="name"
                                name="name"
                                autoComplete="name"
                                className="input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Alex Student"
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-[13px] font-medium text-slate-500 mb-1.5">Email</label>
                            <input
                                id="email"
                                name="email"
                                autoComplete="email"
                                className="input"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@gmail.com"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-[13px] font-medium text-slate-500 mb-1.5">Password</label>
                            <input
                                id="password"
                                name="password"
                                autoComplete="new-password"
                                className="input"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                            <p className="mt-1.5 text-[11px] text-slate-400">Use at least 8 characters with a letter and a number.</p>
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-slate-500 mb-1.5">Confirm Password</label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                autoComplete="new-password"
                                className="input"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-70 disabled:transform-none mt-2"
                            style={{ background: 'linear-gradient(135deg, #10B981, #3B82F6)' }}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                                    Creating...
                                </span>
                            ) : (
                                'Start studying →'
                            )}
                        </button>
                    </form>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center text-sm text-slate-400 mt-6"
                >
                    Already have an account? <Link to="/login" className="text-blue-500 font-medium hover:text-blue-600 transition-colors">Sign in</Link>
                </motion.p>
            </motion.div>
        </div>
    );
}
