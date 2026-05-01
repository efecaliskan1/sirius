import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import { INPUT_LIMITS } from '../utils/constants';
import {
    clearAuthAttemptWindow,
    getAuthErrorMessage,
    normalizeEmail,
    reserveAuthAttempt,
    validateLoginForm,
    validateEmail,
} from '../utils/auth';
import { persistLocale, SUPPORTED_LOCALES, useLocale } from '../utils/i18n';
import { isNativeGoogleConfigured, isNativePlatform as isNativeAppPlatform } from '../utils/nativeGoogleAuth';

const LOGIN_COPY = {
    en: {
        title: 'SIRIUS',
        subtitle: 'Amber Intelligence',
        emailLabel: 'Email',
        emailPlaceholder: 'name@gmail.com',
        passwordLabel: 'Password',
        continueWithEmail: 'Continue with Email',
        continueWithGoogle: 'Continue with Google',
        mobileGoogleNotice: 'Google sign-in for the native app still needs the mobile client IDs. For now, continue with email and password.',
        divider: 'or',
        newHere: 'New here?',
        createAccount: 'Create your study space',
        forgotPassword: 'Forgot password?',
        resetPasswordNotice: 'If an account exists for this email, a password reset link has been sent. Check spam as well.',
        signingIn: 'Signing in...',
    },
    tr: {
        title: 'SIRIUS',
        subtitle: 'Amber Intelligence',
        emailLabel: 'Email',
        emailPlaceholder: 'Email',
        passwordLabel: 'Şifre',
        continueWithEmail: 'E-posta ile devam et',
        continueWithGoogle: 'Google ile devam et',
        mobileGoogleNotice: 'Mobil Google girisi icin client ID ayarlari eksik. Simdilik e-posta ve sifre ile devam et.',
        divider: 'veya',
        newHere: 'İlk kez burada mısın?',
        createAccount: 'Çalışma alanını oluştur',
        forgotPassword: 'Şifremi unuttum',
        resetPasswordNotice: 'Bu e-posta ile eşleşen bir hesap varsa, şifre sıfırlama bağlantısı gönderildi. Spam klasörünü de kontrol et.',
        signingIn: 'Giriş yapılıyor...',
    },
};

export default function LoginPage() {
    const isNativePlatform = isNativeAppPlatform();
    const canUseGoogleSignIn = !isNativePlatform || isNativeGoogleConfigured();
    const login = useAuthStore((s) => s.login);
    const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
    const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
    const authError = useAuthStore((s) => s.authError);
    const clearAuthError = useAuthStore((s) => s.clearAuthError);
    const location = useLocation();
    const navigate = useNavigate();
    const locale = useLocale();
    const copy = LOGIN_COPY[locale] || LOGIN_COPY.en;
    const [email, setEmail] = useState(() => location.state?.email || '');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState(() => location.state?.notice || '');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (authError) {
            setError(getAuthErrorMessage({ code: authError }));
            clearAuthError();
        }
    }, [authError, clearAuthError]);

    useEffect(() => {
        setIsLoading(false);
    }, []);

    const handleLocaleChange = (nextLocale) => {
        persistLocale(nextLocale);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const normalizedEmail = normalizeEmail(email);
        setError('');
        setNotice('');
        const validationError = validateLoginForm({ email: normalizedEmail, password });

        if (validationError) {
            setError(validationError);
            return;
        }

        const rateLimitMessage = reserveAuthAttempt('login-password');
        if (rateLimitMessage) {
            setError(rateLimitMessage);
            return;
        }

        setIsLoading(true);
        try {
            await login(normalizedEmail, password);
            clearAuthAttemptWindow('login-password');
            navigate('/');
        } catch (err) {
            setError(getAuthErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setNotice('');
        const rateLimitMessage = reserveAuthAttempt('login-google');
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
            clearAuthAttemptWindow('login-google');
            navigate('/');
        } catch (err) {
            setError(getAuthErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        const normalizedEmail = normalizeEmail(email);
        setError('');
        setNotice('');

        const validationError = validateEmail(normalizedEmail);
        if (validationError) {
            setError(validationError);
            return;
        }

        const rateLimitMessage = reserveAuthAttempt('password-reset');
        if (rateLimitMessage) {
            setError(rateLimitMessage);
            return;
        }

        setIsLoading(true);
        try {
            await requestPasswordReset(normalizedEmail);
            clearAuthAttemptWindow('password-reset');
            setNotice(copy.resetPasswordNotice);
        } catch (err) {
            setError(getAuthErrorMessage(err));
        } finally {
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
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55 }}
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
                            style={{ fontFamily: 'Georgia, "Times New Roman", serif', textShadow: '0 8px 30px rgba(255,242,218,0.14)' }}
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
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.28, duration: 0.45 }}
                        className="rounded-[34px] border border-white/12 bg-[linear-gradient(180deg,rgba(15,20,34,0.62),rgba(10,14,25,0.74))] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl"
                    >
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {notice && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-[22px] border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-left text-xs leading-5 text-emerald-100"
                                >
                                    {notice}
                                </motion.div>
                            )}

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-[22px] border border-red-300/20 bg-red-400/10 px-4 py-3 text-left text-xs leading-5 text-red-100"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <div className="space-y-3 text-left">
                                <div>
                                    <label htmlFor="email" className="mb-2 block text-[12px] font-medium uppercase tracking-[0.22em] text-[#d0b48b]">
                                        {copy.emailLabel}
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        autoComplete="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value.slice(0, INPUT_LIMITS.email))}
                                        placeholder={copy.emailPlaceholder}
                                        maxLength={INPUT_LIMITS.email}
                                        required
                                        autoFocus
                                        className="w-full rounded-[22px] border border-[#ffffff1f] bg-[#ffffff0f] px-5 py-4 text-[15px] text-[#fff8f0] outline-none transition placeholder:text-[#b9c0d2]/52 focus:border-[#d8ab73] focus:bg-[#ffffff14] focus:shadow-[0_0_0_3px_rgba(216,171,115,0.18)]"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="password" className="mb-2 block text-[12px] font-medium uppercase tracking-[0.22em] text-[#d0b48b]">
                                        {copy.passwordLabel}
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        autoComplete="current-password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value.slice(0, INPUT_LIMITS.password))}
                                        placeholder="*****"
                                        maxLength={INPUT_LIMITS.password}
                                        required
                                        className="w-full rounded-[22px] border border-[#ffffff1f] bg-[#ffffff0f] px-5 py-4 text-[15px] text-[#fff8f0] outline-none transition placeholder:text-[#b9c0d2]/52 focus:border-[#d8ab73] focus:bg-[#ffffff14] focus:shadow-[0_0_0_3px_rgba(216,171,115,0.18)]"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex w-full items-center justify-center gap-3 rounded-[999px] border border-[#6f4420] bg-[linear-gradient(180deg,#5f3818_0%,#2f1908_100%)] px-5 py-4 text-[16px] font-medium text-[#fff8ef] shadow-[0_16px_30px_rgba(17,10,2,0.35)] transition hover:translate-y-[-1px] hover:shadow-[0_18px_34px_rgba(17,10,2,0.42)] disabled:opacity-70"
                            >
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                                        {copy.signingIn}
                                    </span>
                                ) : (
                                    <>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                                        {copy.continueWithEmail}
                                    </>
                                )}
                            </button>

                            <div className="my-2 flex items-center gap-4">
                                <div className="h-px flex-1 bg-white/10" />
                                <span className="text-[11px] uppercase tracking-[0.28em] text-[#c0c7d9]/52">{copy.divider}</span>
                                <div className="h-px flex-1 bg-white/10" />
                            </div>

                            {canUseGoogleSignIn && (
                                <button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    disabled={isLoading}
                                    className="flex w-full items-center justify-center gap-3 rounded-[999px] border border-white/70 bg-white px-5 py-4 text-[16px] font-medium text-[#1c2235] shadow-[0_18px_34px_rgba(255,255,255,0.12)] transition hover:translate-y-[-1px] hover:bg-[#fff7ef] hover:shadow-[0_20px_38px_rgba(255,255,255,0.16)] disabled:opacity-60"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    {copy.continueWithGoogle}
                                </button>
                            )}

                            {isNativePlatform && !canUseGoogleSignIn && (
                                <div className="rounded-[22px] border border-white/12 bg-white/6 px-4 py-3 text-left text-xs leading-5 text-white/68">
                                    {copy.mobileGoogleNotice}
                                </div>
                            )}

                            <div className="pt-1 text-center">
                                <button
                                    type="button"
                                    onClick={handlePasswordReset}
                                    disabled={isLoading}
                                    className="text-sm font-medium text-[#d7b27d] transition hover:text-[#f4d6a5] disabled:opacity-60"
                                >
                                    {copy.forgotPassword}
                                </button>
                            </div>
                        </form>
                    </motion.div>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.46 }}
                        className="mt-6 text-center text-sm text-[#cdd2e1]/72"
                    >
                        {copy.newHere}{' '}
                        <Link to="/signup" className="font-medium text-[#efc489] transition hover:text-[#ffe1b4]">
                            {copy.createAccount}
                        </Link>
                    </motion.p>
                </motion.div>
            </div>
        </div>
    );
}
