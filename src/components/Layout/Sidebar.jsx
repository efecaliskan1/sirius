import { useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { useLocale } from '../../utils/i18n';
import { getLevelFromXP } from '../../utils/rewardEngine';

const NAV_ITEMS = [
    {
        to: '/',
        labelKey: 'home',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
        ),
    },
    {
        to: '/courses',
        labelKey: 'courses',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
        ),
    },
    {
        to: '/pomodoro',
        labelKey: 'focus',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <polyline points="12 6 12 12 16 14" />
            </svg>
        ),
    },
    {
        to: '/tasks',
        labelKey: 'tasks',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
        ),
    },
    {
        to: '/schedule',
        labelKey: 'schedule',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
        ),
    },
    {
        to: '/stats',
        labelKey: 'stats',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
        ),
    },
    {
        to: '/leaderboard',
        labelKey: 'leaderboard',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 21h8" />
                <path d="M12 17v4" />
                <path d="M7 4h10v5a5 5 0 01-10 0V4z" />
                <path d="M17 6h2a2 2 0 010 4h-2" />
                <path d="M7 6H5a2 2 0 100 4h2" />
            </svg>
        ),
    },
    {
        to: '/rewards',
        labelKey: 'rewards',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
            </svg>
        ),
    },
];

const SIDEBAR_COPY = {
    en: {
        home: 'Home',
        courses: 'Courses',
        focus: 'Focus',
        tasks: 'Tasks',
        schedule: 'Schedule',
        stats: 'Stats',
        leaderboard: 'Leaderboard',
        rewards: 'Rewards',
        student: 'Student',
        level: 'Level',
        coins: 'coins',
        logout: 'Log out',
        changePhoto: 'Change profile photo',
    },
    tr: {
        home: 'Ana Sayfa',
        courses: 'Dersler',
        focus: 'Odak',
        tasks: 'Görevler',
        schedule: 'Takvim',
        stats: 'İstatistikler',
        leaderboard: 'Sıralama',
        rewards: 'Ödüller',
        student: 'Öğrenci',
        level: 'Seviye',
        coins: 'jeton',
        logout: 'Çıkış yap',
        changePhoto: 'Profil fotoğrafını değiştir',
    },
};

export default function Sidebar() {
    const user = useAuthStore((s) => s.user);
    const updateUser = useAuthStore((s) => s.updateUser);
    const logout = useAuthStore((s) => s.logout);
    const locale = useLocale();
    const copy = SIDEBAR_COPY[locale] || SIDEBAR_COPY.en;
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const levelInfo = getLevelFromXP(user?.xp || 0);

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
        try {
            await logout();
        } catch (_err) {
            // ignore
        }
        navigate('/login');
    };

    const initial = (typeof user?.name === 'string' && user.name.trim()
        ? user.name.charAt(0).toUpperCase()
        : 'S');

    return (
        <aside
            className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30 flex-col"
            style={{
                width: '240px',
                background: 'var(--bb-card)',
                borderRight: 'var(--bb-border-w) solid var(--bb-ink)',
                padding: '24px 16px 16px',
            }}
        >
            {/* Logo */}
            <div className="mb-7 px-3">
                <p
                    className="text-[10px] font-bold uppercase tracking-[0.28em]"
                    style={{ color: 'var(--bb-ink)', opacity: 0.55 }}
                >
                    Sirius
                </p>
                <h1
                    className="display-heading text-[26px] mt-1"
                    style={{ color: 'var(--bb-ink)', letterSpacing: '-1.5px' }}
                >
                    SIRIUS
                </h1>
            </div>

            {/* Nav */}
            <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className="block"
                    >
                        {({ isActive }) => (
                            <span
                                className="flex items-center gap-3 transition-all"
                                style={isActive ? {
                                    background: 'var(--bb-accent-1)',
                                    border: '2px solid var(--bb-ink)',
                                    borderRadius: '12px',
                                    boxShadow: '2px 2px 0 var(--bb-shadow)',
                                    padding: '8px 12px',
                                    color: 'var(--bb-ink)',
                                    fontWeight: 800,
                                    fontSize: '13px',
                                } : {
                                    border: '2px solid transparent',
                                    borderRadius: '12px',
                                    padding: '8px 12px',
                                    color: 'var(--bb-ink)',
                                    opacity: 0.7,
                                    fontWeight: 600,
                                    fontSize: '13px',
                                }}
                            >
                                {item.icon}
                                <span className="uppercase tracking-wider">
                                    {copy[item.labelKey]}
                                </span>
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Profile card */}
            <div
                className="mt-4 p-3"
                style={{
                    border: '2.5px solid var(--bb-ink)',
                    borderRadius: '14px',
                    background: 'var(--bb-paper)',
                    boxShadow: '3px 3px 0 var(--bb-shadow)',
                }}
            >
                <div className="flex items-center gap-3 mb-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title={copy.changePhoto}
                        aria-label={copy.changePhoto}
                        className="relative flex-shrink-0"
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            border: '2px solid var(--bb-ink)',
                            background: 'var(--bb-accent-1)',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            padding: 0,
                        }}
                    >
                        {user?.profilePhoto ? (
                            <img src={user.profilePhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    height: '100%',
                                    fontSize: '15px',
                                    fontWeight: 900,
                                    color: 'var(--bb-ink)',
                                }}
                            >
                                {initial}
                            </span>
                        )}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        style={{ display: 'none' }}
                        onChange={handleAvatarUpload}
                    />
                    <div className="flex-1 min-w-0">
                        <p
                            className="text-[12px] font-extrabold truncate"
                            style={{ color: 'var(--bb-ink)' }}
                        >
                            {user?.name || copy.student}
                        </p>
                        <p
                            className="text-[10px] font-bold uppercase tracking-wider mt-0.5"
                            style={{ color: 'var(--bb-ink)', opacity: 0.6 }}
                        >
                            {copy.level} {levelInfo.level} · {user?.coinBalance || 0} {copy.coins}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-[10px] font-bold uppercase tracking-wider py-2"
                    style={{
                        border: '2px solid var(--bb-ink)',
                        borderRadius: '10px',
                        background: 'var(--bb-card)',
                        color: 'var(--bb-ink)',
                        cursor: 'pointer',
                    }}
                >
                    {copy.logout}
                </button>
            </div>
        </aside>
    );
}
