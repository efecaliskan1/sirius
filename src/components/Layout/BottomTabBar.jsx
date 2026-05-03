import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import { useLocale } from '../../utils/i18n';
import { getLevelFromXP } from '../../utils/rewardEngine';

const TAB_COPY = {
    en: {
        home: 'Home',
        focus: 'Focus',
        tasks: 'Tasks',
        schedule: 'Schedule',
        more: 'More',
        // More-menu items
        moreTitle: 'More',
        courses: 'Courses',
        stats: 'Stats',
        leaderboard: 'Leaderboard',
        rewards: 'Rewards',
        profile: 'Profile',
        logout: 'Log out',
        student: 'Student',
        level: 'Level',
        coins: 'coins',
    },
    tr: {
        home: 'Ana Sayfa',
        focus: 'Odak',
        tasks: 'Görevler',
        schedule: 'Takvim',
        more: 'Daha',
        moreTitle: 'Daha Fazla',
        courses: 'Dersler',
        stats: 'İstatistikler',
        leaderboard: 'Sıralama',
        rewards: 'Ödüller',
        profile: 'Profil',
        logout: 'Çıkış yap',
        student: 'Öğrenci',
        level: 'Seviye',
        coins: 'jeton',
    },
};

// Five main tabs
const TABS = [
    {
        to: '/',
        labelKey: 'home',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
        ),
    },
    {
        to: '/pomodoro',
        labelKey: 'focus',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
        ),
    },
    {
        to: '/tasks',
        labelKey: 'tasks',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
        ),
    },
    {
        to: '/schedule',
        labelKey: 'schedule',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
        ),
    },
];

// Items inside the More sheet
const MORE_ITEMS = [
    {
        to: '/courses',
        labelKey: 'courses',
        accent: 'var(--bb-accent-3)',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
        ),
    },
    {
        to: '/stats',
        labelKey: 'stats',
        accent: 'var(--bb-accent-2)',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
        ),
    },
    {
        to: '/leaderboard',
        labelKey: 'leaderboard',
        accent: 'var(--bb-accent-4)',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 21h8" /><path d="M12 17v4" />
                <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
                <path d="M17 6h2a2 2 0 010 4h-2" />
                <path d="M7 6H5a2 2 0 100 4h2" />
            </svg>
        ),
    },
    {
        to: '/rewards',
        labelKey: 'rewards',
        accent: 'var(--bb-accent-1)',
        icon: (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
            </svg>
        ),
    },
];

export default function BottomTabBar() {
    const [showMore, setShowMore] = useState(false);
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const updateUser = useAuthStore((s) => s.updateUser);
    const locale = useLocale();
    const copy = TAB_COPY[locale] || TAB_COPY.en;
    const navigate = useNavigate();
    const levelInfo = getLevelFromXP(user?.xp || 0);

    const fileInputRef = (() => {
        // We re-use a closure-stable ref-ish container via a module-level
        // reference to keep the component simple.
        return null;
    })();

    const handleAvatarUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            event.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result !== 'string') return;
            const img = new Image();
            img.onload = () => {
                try {
                    const SIZE = 256;
                    const canvas = document.createElement('canvas');
                    canvas.width = SIZE;
                    canvas.height = SIZE;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    const minSide = Math.min(img.width, img.height);
                    const sx = (img.width - minSide) / 2;
                    const sy = (img.height - minSide) / 2;
                    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, SIZE, SIZE);
                    const compressed = canvas.toDataURL('image/jpeg', 0.85);
                    updateUser({ profilePhoto: compressed });
                } catch (_err) {
                    // ignore
                }
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const handleLogout = async () => {
        setShowMore(false);
        try {
            await logout();
        } catch (_err) {
            // ignore
        }
        navigate('/login');
    };

    return (
        <>
            {/* Bottom tab bar — fixed */}
            <nav
                className="fixed left-0 right-0 z-30"
                style={{
                    bottom: 'max(env(safe-area-inset-bottom), 12px)',
                    paddingLeft: 'max(env(safe-area-inset-left), 12px)',
                    paddingRight: 'max(env(safe-area-inset-right), 12px)',
                }}
            >
                <div
                    className="mx-auto flex items-center justify-around"
                    style={{
                        maxWidth: '460px',
                        background: 'var(--bb-card)',
                        border: 'var(--bb-border-w) solid var(--bb-ink)',
                        borderRadius: '22px',
                        padding: '8px 6px',
                        boxShadow: '4px 4px 0 var(--bb-shadow)',
                    }}
                >
                    {TABS.map((tab) => (
                        <NavLink
                            key={tab.to}
                            to={tab.to}
                            end={tab.to === '/'}
                            className="flex-1 flex justify-center"
                        >
                            {({ isActive }) => (
                                <span
                                    className="flex flex-col items-center gap-0.5 transition-all"
                                    style={isActive ? {
                                        background: 'var(--bb-accent-1)',
                                        border: '2px solid var(--bb-ink)',
                                        borderRadius: '14px',
                                        boxShadow: '2px 2px 0 var(--bb-shadow)',
                                        padding: '6px 10px',
                                        color: 'var(--bb-ink)',
                                    } : {
                                        padding: '6px 10px',
                                        color: 'var(--bb-ink)',
                                        opacity: 0.55,
                                    }}
                                >
                                    {tab.icon}
                                    <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">
                                        {copy[tab.labelKey]}
                                    </span>
                                </span>
                            )}
                        </NavLink>
                    ))}
                    {/* More tab */}
                    <button
                        type="button"
                        onClick={() => setShowMore(true)}
                        className="flex-1 flex justify-center"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        <span
                            className="flex flex-col items-center gap-0.5"
                            style={{
                                padding: '6px 10px',
                                color: 'var(--bb-ink)',
                                opacity: showMore ? 1 : 0.55,
                            }}
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="5" cy="12" r="1.5" />
                                <circle cx="12" cy="12" r="1.5" />
                                <circle cx="19" cy="12" r="1.5" />
                            </svg>
                            <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">
                                {copy.more}
                            </span>
                        </span>
                    </button>
                </div>
            </nav>

            {/* More sheet */}
            <AnimatePresence>
                {showMore && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowMore(false)}
                            className="fixed inset-0 z-40"
                            style={{ background: 'rgba(26,26,26,0.5)' }}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                            className="fixed left-0 right-0 z-50"
                            style={{
                                bottom: 0,
                                background: 'var(--bb-paper)',
                                borderTop: 'var(--bb-border-w) solid var(--bb-ink)',
                                borderTopLeftRadius: '28px',
                                borderTopRightRadius: '28px',
                                padding: '16px 20px max(env(safe-area-inset-bottom), 28px)',
                                maxHeight: '80vh',
                                overflowY: 'auto',
                            }}
                        >
                            {/* Drag handle */}
                            <div
                                className="mx-auto mb-4"
                                style={{
                                    width: '48px',
                                    height: '5px',
                                    borderRadius: '999px',
                                    background: 'var(--bb-ink)',
                                    opacity: 0.3,
                                }}
                            />

                            {/* Profile card */}
                            <div
                                className="card flex items-center gap-3 mb-4"
                                style={{ background: 'var(--bb-card)' }}
                            >
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('avatar-upload-input')?.click()}
                                    className="relative flex-shrink-0"
                                    style={{
                                        width: '52px',
                                        height: '52px',
                                        borderRadius: '14px',
                                        border: '2.5px solid var(--bb-ink)',
                                        background: 'var(--bb-accent-1)',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        padding: 0,
                                    }}
                                    aria-label={locale === 'tr' ? 'Profil fotoğrafını değiştir' : 'Change profile photo'}
                                >
                                    {user?.profilePhoto ? (
                                        <img src={user.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '100%',
                                            height: '100%',
                                            fontSize: '20px',
                                            fontWeight: 900,
                                            color: 'var(--bb-ink)',
                                        }}>
                                            {(typeof user?.name === 'string' && user.name.trim()
                                                ? user.name.charAt(0).toUpperCase()
                                                : 'S')}
                                        </span>
                                    )}
                                </button>
                                <input
                                    id="avatar-upload-input"
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    style={{ display: 'none' }}
                                    onChange={handleAvatarUpload}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[15px] font-extrabold truncate" style={{ color: 'var(--bb-ink)' }}>
                                        {user?.name || copy.student}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span
                                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                                            style={{
                                                borderRadius: '999px',
                                                border: '2px solid var(--bb-ink)',
                                                background: 'var(--bb-accent-1)',
                                                color: 'var(--bb-ink)',
                                            }}
                                        >
                                            {copy.level} {levelInfo.level}
                                        </span>
                                        <span className="text-[11px] font-bold" style={{ color: 'var(--bb-ink)', opacity: 0.65 }}>
                                            {user?.coinBalance || 0} {copy.coins}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* More items grid */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {MORE_ITEMS.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setShowMore(false)}
                                        className="card card-interactive flex items-center gap-3"
                                        style={{ background: item.accent, padding: '14px' }}
                                    >
                                        <span
                                            className="flex-shrink-0 flex items-center justify-center"
                                            style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '12px',
                                                border: '2px solid var(--bb-ink)',
                                                background: 'var(--bb-card)',
                                                color: 'var(--bb-ink)',
                                            }}
                                        >
                                            {item.icon}
                                        </span>
                                        <span className="text-[13px] font-extrabold uppercase" style={{ color: 'var(--bb-ink)' }}>
                                            {copy[item.labelKey]}
                                        </span>
                                    </NavLink>
                                ))}
                            </div>

                            {/* Logout */}
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="btn-secondary w-full justify-center"
                                style={{ background: 'var(--bb-card)' }}
                            >
                                {copy.logout}
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
