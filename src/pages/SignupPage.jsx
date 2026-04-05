import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import { INPUT_LIMITS } from '../utils/constants';
import {
    clearAuthAttemptWindow,
    getAuthErrorMessage,
    normalizeEmail,
    reserveAuthAttempt,
    validateSignupForm,
} from '../utils/auth';
import { persistLocale, SUPPORTED_LOCALES, useLocale } from '../utils/i18n';

const SIGNUP_COPY = {
    en: {
        title: 'SIRIUS',
        subtitle: 'Amber Intelligence',
        intro: 'Create your study space',
        google: 'Sign up with Google',
        divider: 'or',
        fullName: 'Full Name',
        fullNamePlaceholder: 'Alex Student',
        email: 'Email',
        emailPlaceholder: 'name@gmail.com',
        password: 'Password',
        passwordHint: 'Use at least 8 characters with a letter and a number.',
        confirmPassword: 'Confirm Password',
        creating: 'Creating...',
        cta: 'Continue with Email',
        alreadyHaveAccount: 'Already have an account?',
        signIn: 'Sign in',
        verificationNotice: 'We sent a verification link to {email}. Verify your email before signing in and check spam if needed.',
    },
    tr: {
        title: 'SIRIUS',
        subtitle: 'Amber Intelligence',
        intro: 'Çalışma alanını oluştur',
        google: 'Google ile kaydol',
        divider: 'veya',
        fullName: 'Ad soyad',
        fullNamePlaceholder: 'Efe Çalışkan',
        email: 'Email',
        emailPlaceholder: 'name@gmail.com',
        password: 'Şifre',
        passwordHint: 'En az 8 karakter kullan ve bir harf ile bir rakam ekle.',
        confirmPassword: 'Şifreyi doğrula',
        creating: 'Oluşturuluyor...',
        cta: 'E-posta ile devam et',
        alreadyHaveAccount: 'Zaten hesabın var mı?',
        signIn: 'Giriş yap',
        verificationNotice: '{email} adresine doğrulama bağlantısı gönderdik. Spam klasörünü de kontrol edip giriş yapmadan önce e-postanı doğrula.',
    },
};

const fieldClassName = 'w-full rounded-[22px] border border-[#ffffff1f] bg-[#ffffff0f] px-5 py-4 text-[15px] text-[#fff8f0] outline-none transition placeholder:text-[#b9c0d2]/52 focus:border-[#d8ab73] focus:bg-[#ffffff14] focus:shadow-[0_0_0_3px_rgba(216,171,115,0.18)]';

export default function SignupPage() {
    const signup = useAuthStore((s) => s.signup);
    const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
    const authError = useAuthStore((s) => s.authError);
    const clearAuthError = useAuthStore((s) => s.clearAuthError);
    const navigate = useNavigate();
    const locale = useLocale();
    const copy = SIGNUP_COPY[locale] || SIGNUP_COPY.en;
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (authError) {
            setError(getAuthErrorMessage({ code: authError }));
            clearAuthError();
        }
    }, [authError, clearAuthError]);

    const handleLocaleChange = (nextLocale) => {
        persistLocale(nextLocale);
    };

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

        const rateLimitMessage = reserveAuthAttempt('signup-password');
        if (rateLimitMessage) {
            setError(rateLimitMessage);
            return;
        }

        setIsLoading(true);
        try {
            const result = await signup(name, normalizedEmail, password);
            clearAuthAttemptWindow('signup-password');
            navigate('/login', {
                replace: true,
                state: {
                    email: result.email,
                    notice: copy.verificationNotice.replace('{email}', result.email),
                },
            });
        } catch (err) {
            setError(getAuthErrorMessage(err));
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        const rateLimitMessage = reserveAuthAttempt('signup-google');
        if (rateLimitMessage) {
            setError(rateLimitMessage);
            return;
        }
        setIsLoading(true);
        try {
            const result = await loginWithGoogle();
            if (result?.redirecting) {
                return;
            }
            clearAuthAttemptWindow('signup-google');
            navigate('/');
        } catch (err) {
            setError(getAuthErrorMessage(err));
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen overflow-hidden bg-[#070b16] text-white">
            <img
                src="/Landing_Page_Background_TvSqWAeI.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[68%_center]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,7,15,0.72)_0%,rgba(4,7,15,0.44)_32%,rgba(4,7,15,0.18)_54%,rgba(4,7,15,0.28)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,7,15,0.16)_0%,rgba(4,7,15,0.28)_42%,rgba(4,7,15,0.42)_100%)]" />

            <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-[450px] text-center"
                >
                    <div className="mb-6 flex justify-center">
                        <div className="inline-flex rounded-full border border-white/12 bg-[#0c1425]/72 p-1 shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                            {SUPPORTED_LOCALES.map((option) => {
                                const isActive = locale === option.key;
                                return (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => handleLocaleChange(option.key)}
                                        className={`rounded-full px-4 py-2 text-xs font-semibold tracking-[0.24em] transition ${
                                            isActive
                                                ? 'bg-white text-[#101827] shadow-[0_8px_20px_rgba(255,255,255,0.18)]'
                                                : 'text-white/72 hover:text-white'
                                        }`}
                                    >
                                        {option.shortLabel}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mb-10">
                        <motion.h1
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08, duration: 0.5 }}
                            className="text-[72px] font-medium uppercase leading-none tracking-[0.03em] text-[#fff7ed] sm:text-[94px]"
                            style={{ fontFamily: 'Georgia, \"Times New Roman\", serif', textShadow: '0 8px 30px rgba(255,242,218,0.14)' }}
                        >
                            {copy.title}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.14, duration: 0.45 }}
                            className="mt-3 text-[15px] font-medium tracking-[0.28em] text-[#d9ae72] sm:text-[17px]"
                        >
                            {copy.subtitle}
                        </motion.p>
                        <p className="mt-6 text-sm font-medium text-white/76">{copy.intro}</p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.4 }}
                        className="rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(15,20,34,0.62),rgba(10,14,25,0.74))] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
                    >
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="flex w-full items-center justify-center gap-3 rounded-[999px] border border-white/16 bg-[rgba(255,255,255,0.96)] px-5 py-4 text-[16px] font-medium text-[#111827] shadow-[0_16px_30px_rgba(7,10,18,0.24)] transition hover:translate-y-[-1px] hover:bg-white disabled:opacity-60"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            {copy.google}
                        </button>

                        <div className="my-4 flex items-center gap-3">
                            <div className="h-px flex-1 bg-white/10"></div>
                            <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/40">{copy.divider}</span>
                            <div className="h-px flex-1 bg-white/10"></div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-[22px] border border-red-300/20 bg-red-400/10 px-4 py-3 text-left text-xs leading-5 text-red-100"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <div>
                                <label htmlFor="name" className="mb-2 block text-left text-[12px] font-medium uppercase tracking-[0.22em] text-[#d0b48b]">{copy.fullName}</label>
                                <input
                                    id="name"
                                    name="name"
                                    autoComplete="name"
                                    className={fieldClassName}
                                    value={name}
                                    onChange={(e) => setName(e.target.value.slice(0, INPUT_LIMITS.fullName))}
                                    placeholder={copy.fullNamePlaceholder}
                                    maxLength={INPUT_LIMITS.fullName}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="mb-2 block text-left text-[12px] font-medium uppercase tracking-[0.22em] text-[#d0b48b]">{copy.email}</label>
                                <input
                                    id="email"
                                    name="email"
                                    autoComplete="email"
                                    className={fieldClassName}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value.slice(0, INPUT_LIMITS.email))}
                                    placeholder={copy.emailPlaceholder}
                                    maxLength={INPUT_LIMITS.email}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="mb-2 block text-left text-[12px] font-medium uppercase tracking-[0.22em] text-[#d0b48b]">{copy.password}</label>
                                <input
                                    id="password"
                                    name="password"
                                    autoComplete="new-password"
                                    className={fieldClassName}
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value.slice(0, INPUT_LIMITS.password))}
                                    placeholder="*****"
                                    maxLength={INPUT_LIMITS.password}
                                    required
                                />
                                <p className="mt-1.5 text-left text-[11px] text-white/48">{copy.passwordHint}</p>
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="mb-2 block text-left text-[12px] font-medium uppercase tracking-[0.22em] text-[#d0b48b]">{copy.confirmPassword}</label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    autoComplete="new-password"
                                    className={fieldClassName}
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value.slice(0, INPUT_LIMITS.password))}
                                    placeholder="*****"
                                    maxLength={INPUT_LIMITS.password}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex w-full items-center justify-center gap-3 rounded-[999px] border border-[#6f4420] bg-[linear-gradient(180deg,#5f3818_0%,#2f1908_100%)] px-5 py-4 text-[16px] font-medium text-[#fff8ef] shadow-[0_16px_30px_rgba(17,10,2,0.35)] transition hover:translate-y-[-1px] hover:shadow-[0_18px_34px_rgba(17,10,2,0.42)] disabled:opacity-70"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                                        {copy.creating}
                                    </span>
                                ) : (
                                    copy.cta
                                )}
                            </button>
                        </form>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-6 text-center text-sm text-white/56"
                    >
                        {copy.alreadyHaveAccount}{' '}
                        <Link to="/login" className="font-medium text-[#f4c88d] transition-colors hover:text-[#ffd8a5]">{copy.signIn}</Link>
                    </motion.p>
                </motion.div>
            </div>
        </div>
    );
}
