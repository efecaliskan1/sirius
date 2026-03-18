import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import useAppStore from '../../store/appStore';
import { getLevelFromXP } from '../../utils/rewardEngine';
import { THEMES } from '../../utils/constants';

const navItems = [
    {
        to: '/', label: 'Home', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
        )
    },
    {
        to: '/schedule', label: 'Schedule', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        )
    },
    {
        to: '/tasks', label: 'Tasks', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
        )
    },
    {
        to: '/pomodoro', label: 'Pomodoro', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        )
    },
    {
        to: '/stats', label: 'Stats', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
        )
    },
    {
        to: '/leaderboard', label: 'Leaderboard', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15l-3 3m0 0l-3-3m3 3V3m0 0L4.5 7.5M12 3l4.5 4.5" /><path d="M20 21H4" /><circle cx="12" cy="7" r="4" /></svg> // just a placeholder/trophy-ish icon
        )
    },
    {
        to: '/rewards', label: 'Rewards', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>
        )
    },
];

export default function Sidebar() {
    const user = useAuthStore((s) => s.user);
    const logout = useAuthStore((s) => s.logout);
    const updateUser = useAuthStore((s) => s.updateUser);
    const levelInfo = getLevelFromXP(user?.xp || 0);
    const [showThemes, setShowThemes] = useState(false);

    const isDark = (user?.theme || 'calm') === 'dark';
    const currentTheme = THEMES.find((t) => t.key === (user?.theme || 'calm'));

    return (
        <aside className="w-[240px] h-screen sidebar-themed backdrop-blur-sm border-r border-opacity-70 flex flex-col fixed left-0 top-0 z-30 box-border transition-colors duration-300"
            style={{
                borderRightWidth: '1.5px',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E0E7FF',
                boxShadow: isDark ? '1px 0 20px rgba(0,0,0,0.2)' : '1px 0 10px rgba(0,0,0,0.01)',
            }}>
            <div className="px-5 pt-5 pb-2">
                <div
                    className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${isDark ? 'bg-white/[0.03]' : 'bg-white/70'} border`}
                    style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(224,231,255,0.9)' }}
                >
                    <div className="w-12 h-12 rounded-[20px] bg-gradient-to-br from-white via-sky-50 to-blue-100/80 p-1.5 shadow-[0_14px_30px_rgba(59,130,246,0.16)]">
                        <img src="/sirius-logo.svg" alt="Sirius logo" className="w-full h-full object-contain scale-[1.08]" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[15px] font-bold leading-tight" style={{ color: 'var(--theme-text, #1E293B)' }}>Sirius</p>
                        <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--theme-text-secondary, #64748B)' }}>Study smarter</p>
                    </div>
                </div>
            </div>

            {/* Profile */}
            <div className="px-5 pt-4 pb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-semibold text-sm ${isDark ? 'shadow-lg shadow-black/30' : 'shadow-md shadow-black/10'}`} style={{ background: 'var(--theme-primary, #4F46E5)' }}>
                        {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[16px] font-bold truncate leading-tight" style={{ color: 'var(--theme-text, #1E293B)' }}>{user?.name || 'Student'}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] font-medium" style={{ color: 'var(--theme-primary, #4F46E5)' }}>Lvl {levelInfo.level}</span>
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
                                <span>{item.label}</span>
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
                        <span>{currentTheme?.name || 'Theme'}</span>
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
                                                ? `theme-picker-active ${isDark ? 'bg-indigo-500/12 text-indigo-300' : 'bg-blue-50 text-blue-600'}`
                                                : `${isDark ? 'text-white/60 hover:bg-white/5' : 'hover:bg-slate-50 text-slate-600'}`
                                                }`}
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

                <div className={`px-3 py-2 rounded-xl flex items-center gap-2 coins-streak-bar ${isDark
                    ? ''
                    : 'bg-gradient-to-r from-amber-50 to-orange-50'
                    }`}>
                    <span className="text-sm">🪙</span>
                    <span className={`text-xs font-medium ${isDark ? 'text-amber-300/80' : 'text-amber-700'}`}>{user?.coinBalance || 0} coins</span>
                    <span className={`mx-1 ${isDark ? 'text-white/15' : 'text-slate-300'}`}>·</span>
                    <span className="text-sm">🔥</span>
                    <span className={`text-xs font-medium ${isDark ? 'text-orange-300/80' : 'text-orange-700'}`}>{user?.streakCount || 0}</span>
                </div>
                <button
                    onClick={logout}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 w-full ${isDark
                        ? 'text-white/30 hover:bg-red-500/10 hover:text-red-400'
                        : 'text-slate-400 hover:bg-red-50 hover:text-red-500'
                        }`}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    <span>Log out</span>
                </button>
            </div>
        </aside>
    );
}
