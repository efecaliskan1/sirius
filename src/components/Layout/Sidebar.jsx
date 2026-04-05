import { useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import { getLevelFromXP } from '../../utils/rewardEngine';
import { THEMES } from '../../utils/constants';
import { useLocale } from '../../utils/i18n';

const navItems = [
    {
        to: '/', labelKey: 'home', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
        )
    },
    {
        to: '/courses', labelKey: 'courses', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>
        )
    },
    {
        to: '/schedule', labelKey: 'schedule', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        )
    },
    {
        to: '/tasks', labelKey: 'tasks', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
        )
    },
    {
        to: '/pomodoro', labelKey: 'pomodoro', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        )
    },
    {
        to: '/stats', labelKey: 'stats', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
        )
    },
    {
        to: '/leaderboard', labelKey: 'leaderboard', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 01-10 0V4z" /><path d="M17 6h2a2 2 0 010 4h-2" /><path d="M7 6H5a2 2 0 100 4h2" /></svg>
        )
    },
    {
        to: '/rewards', labelKey: 'rewards', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>
        )
    },
];

const SIDEBAR_COPY = {
    en: {
        home: 'Home',
        courses: 'Courses',
        schedule: 'Schedule',
        tasks: 'Tasks',
        pomodoro: 'Pomodoro',
        stats: 'Stats',
        leaderboard: 'Leaderboard',
        rewards: 'Rewards',
        student: 'Student',
        level: 'Lvl',
        themeFallback: 'Theme',
        coins: 'coins',
        logout: 'Log out',
    },
    tr: {
        home: 'Ana sayfa',
        courses: 'Dersler',
        schedule: 'Takvim',
        tasks: 'Görevler',
        pomodoro: 'Pomodoro',
        stats: 'İstatistikler',
        leaderboard: 'Liderlik tablosu',
        rewards: 'Ödüller',
        student: 'Öğrenci',
        level: 'Seviye',
        themeFallback: 'Tema',
        coins: 'jeton',
        logout: 'Çıkış yap',
    },
};

export default function Sidebar({ mobile = false, isOpen = false, onClose = () => {} }) {
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const updateUser = useAuthStore((s) => s.updateUser);
    const levelInfo = getLevelFromXP(user?.xp || 0);
    const [showThemes, setShowThemes] = useState(false);
    const fileInputRef = useRef(null);
    const locale = useLocale();
    const copy = SIDEBAR_COPY[locale] || SIDEBAR_COPY.en;

    const isDark = (user?.theme || 'calm') === 'dark';
    const currentTheme = THEMES.find((t) => t.key === (user?.theme || 'calm'));

    const handleAvatarUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                updateUser({ profilePhoto: reader.result });
            }
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const shellClasses = mobile
        ? `fixed inset-y-0 left-0 z-50 w-[286px] max-w-[82vw] transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
        : 'fixed left-0 top-0 z-30 h-screen w-[240px]';

    return (
        <aside className={`${shellClasses} sidebar-themed box-border flex flex-col border-r border-opacity-70 backdrop-blur-sm transition-colors duration-300`}
            style={{
                borderRightWidth: '1.5px',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E0E7FF',
                boxShadow: isDark ? '1px 0 20px rgba(0,0,0,0.2)' : '1px 0 10px rgba(0,0,0,0.01)',
            }}>
            {/* Profile */}
            <div className="px-5 pt-6 pb-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`group relative h-11 w-11 overflow-hidden rounded-2xl ${isDark ? 'shadow-lg shadow-black/30' : 'shadow-md shadow-black/10'}`}
                            style={{ background: 'var(--theme-primary, #4F46E5)' }}
                            title={locale === 'tr' ? 'Profil fotoğrafını değiştir' : 'Change profile photo'}
                        >
                            {user?.profilePhoto ? (
                                <img src={user.profilePhoto} alt={user?.name || 'Profile'} className="h-full w-full object-cover" />
                            ) : (
                                <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                                    {(typeof user?.name === 'string' && user.name.trim()
                                        ? user.name.charAt(0).toUpperCase()
                                        : 'S')}
                                </span>
                            )}
                            <span className="absolute inset-x-1 bottom-1 rounded-full bg-black/55 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white opacity-0 transition-opacity group-hover:opacity-100">
                                {locale === 'tr' ? 'Foto' : 'Photo'}
                            </span>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleAvatarUpload}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-bold truncate leading-tight" style={{ color: 'var(--theme-text, #1E293B)' }}>{user?.name || copy.student}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] font-medium" style={{ color: 'var(--theme-primary, #4F46E5)' }}>{copy.level} {levelInfo.level}</span>
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--theme-primary-bg, #EEF2FF)' }}>
                                <motion.div
                                    className="h-full rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${levelInfo.progress}%` }}
                                    transition={{ duration: 0.8 }}
                                    style={{ background: 'var(--theme-primary, #4F46E5)' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-2 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        onClick={() => {
                            if (mobile) onClose();
                        }}
                        className={({ isActive }) =>
                            `flex items-center gap-3 py-2.5 text-[13px] transition-all duration-150 sidebar-nav-item ${isActive
                                ? `font-semibold border-l-[3px] px-[9px] rounded-r-xl rounded-l-none`
                                : `font-medium px-3 rounded-xl hover:bg-[var(--theme-surface-hover)] ${isDark
                                    ? 'text-white/50 hover:bg-white/5 hover:text-white/80'
                                    : 'hover:opacity-80'
                                }`
                            }`
                        }
                        style={({ isActive }) => isActive ? {
                            background: 'var(--theme-primary-bg, #EEF2FF)',
                            color: 'var(--theme-primary, #4F46E5)',
                            borderColor: 'var(--theme-primary, #6366F1)'
                        } : {
                            color: 'var(--theme-text-secondary, #64748B)'
                        }}
                    >
                        {({ isActive }) => (
                            <>
                                <span className={`nav-icon ${isActive ? 'opacity-100' : 'opacity-80'}`}
                                    style={{ color: isActive ? 'var(--theme-primary, #4F46E5)' : 'currentColor' }}
                                >
                                    {item.icon}
                                </span>
                                <span>{copy[item.labelKey]}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Bottom section */}
            <div className="px-3 pb-4 space-y-2">

                {/* Theme Picker Toggle */}
                <div className="relative">
                    <button
                        onClick={() => { setShowThemes(!showThemes); }}
                        className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                        style={{ color: 'var(--theme-text-secondary, #64748b)' }}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                        <span>{currentTheme?.name || copy.themeFallback}</span>
                    </button>

                    <AnimatePresence>
                        {showThemes && (
                            <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                className={`absolute bottom-full left-0 right-0 mb-1 rounded-xl border p-2 z-40 theme-picker-popup ${isDark
                                    ? 'border-white/6 shadow-2xl'
                                    : 'bg-white border-slate-100 shadow-xl'
                                    }`}
                                style={isDark ? { background: 'var(--theme-card, #1E293B)' } : {}}
                            >
                                {THEMES.map((theme) => {
                                    const isSelected = user?.theme === theme.key || (!user?.theme && theme.key === 'calm');
                                    return (
                                        <button
                                            key={theme.key}
                                            onClick={() => { updateUser({ theme: theme.key }); setShowThemes(false); }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all theme-picker-item ${isSelected
                                                ? `theme-picker-active ${isDark ? 'bg-indigo-500/12 text-indigo-300' : ''}`
                                                : `${isDark ? 'text-white/60 hover:bg-white/5' : 'hover:bg-slate-50 text-slate-600'}`
                                                }`}
                                            style={isSelected && !isDark ? {
                                                background: 'var(--theme-primary-bg, #EEF2FF)',
                                                color: 'var(--theme-primary, #4F46E5)',
                                            } : undefined}
                                        >
                                            <div className="flex gap-0.5">
                                                {theme.preview.map((color, i) => (
                                                    <div key={i} className={`w-3.5 h-3.5 rounded-full border shadow-sm ${isDark ? 'border-white/10' : 'border-white'}`} style={{ backgroundColor: color }} />
                                                ))}
                                            </div>
                                            <div>
                                                <div className="text-xs font-medium">{theme.name}</div>
                                                <div className={`text-[10px] ${isDark ? 'text-white/30' : 'text-slate-400'}`}>{theme.description}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div
                    className="px-3 py-2 rounded-xl flex items-center gap-2 coins-streak-bar"
                    style={isDark ? undefined : { background: 'linear-gradient(90deg, var(--theme-primary-bg, #EEF2FF) 0%, var(--theme-surface-hover, #F8FAFC) 100%)' }}
                >
                    <span className="text-sm">🪙</span>
                    <span className={`text-xs font-medium ${isDark ? 'text-amber-300/80' : ''}`} style={isDark ? undefined : { color: 'var(--theme-primary, #4F46E5)' }}>{user?.coinBalance || 0} {copy.coins}</span>
                    <span className={`mx-1 ${isDark ? 'text-white/15' : 'text-slate-300'}`}>·</span>
                    <span className="text-sm">🔥</span>
                    <span className={`text-xs font-medium ${isDark ? 'text-orange-300/80' : ''}`} style={isDark ? undefined : { color: 'var(--theme-text-secondary, #64748B)' }}>{user?.streakCount || 0}</span>
                </div>
                <button
                    onClick={() => {
                        logout();
                        if (mobile) onClose();
                    }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 w-full ${isDark
                        ? 'text-white/30 hover:bg-red-500/10 hover:text-red-400'
                        : 'text-slate-400 hover:bg-red-50 hover:text-red-500'
                        }`}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    <span>{copy.logout}</span>
                </button>
            </div>
        </aside>
    );
}
