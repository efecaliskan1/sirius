import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar';
import Toast from '../components/UI/Toast';
import AudioEngine from '../components/UI/AudioEngine';
import FocusOverlay from '../components/UI/FocusOverlay';
import useAuthStore from '../store/authStore';
import useAppStore from '../store/appStore';
import { THEMES } from '../utils/constants';
import { formatTime24, getToday } from '../utils/helpers';
import { persistLocale, SUPPORTED_LOCALES, useLocale } from '../utils/i18n';
import {
    buildTurkeyDateTime,
    hasSeenScheduleNotification,
    isBrowserNotificationSupported,
    markScheduleNotificationSeen,
    showBrowserNotification,
} from '../utils/notifications';

const SCHEDULE_NOTIFICATION_COPY = {
    en: {
        title: 'Schedule reminder',
        courseFallback: 'Course',
        eventFallback: 'Event',
        blockTypes: {
            class: 'Class',
            study: 'Study session',
            exam: 'Exam',
            other: 'Event',
            custom: 'Custom session',
        },
        body: '{time} - {label} is starting now.',
    },
    tr: {
        title: 'Takvim hatırlatması',
        courseFallback: 'Ders',
        eventFallback: 'Etkinlik',
        blockTypes: {
            class: 'Ders',
            study: 'Çalışma oturumu',
            exam: 'Sınav',
            other: 'Etkinlik',
            custom: 'Özel oturum',
        },
        body: '{time} itibarıyla {label} başlıyor.',
    },
};

export const PAGE_SETTINGS_EVENT = 'sirius:open-page-settings';

function fillTemplate(template, values = {}) {
    return Object.entries(values).reduce(
        (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
        template
    );
}

function getScheduleEntryLabel(entry, courses, copy) {
    if (entry.blockType === 'class' || !entry.blockType) {
        return courses.find((course) => course.id === entry.courseId)?.courseName || copy.courseFallback;
    }

    if (entry.blockType === 'custom' && entry.customLabel) {
        return entry.customLabel;
    }

    return copy.blockTypes[entry.blockType] || copy.eventFallback;
}

export default function AppLayout() {
    const user = useAuthStore((s) => s.user);
    const courses = useAppStore((s) => s.courses);
    const scheduleEntries = useAppStore((s) => s.scheduleEntries);
    const flushCloudStudySync = useAppStore((s) => s.flushCloudStudySync);
    const safeCourses = Array.isArray(courses) ? courses : [];
    const safeScheduleEntries = Array.isArray(scheduleEntries) ? scheduleEntries : [];
    const themeKey = user?.theme || 'calm';
    const locale = useLocale();
    const scheduleCopy = SCHEDULE_NOTIFICATION_COPY[locale] || SCHEDULE_NOTIFICATION_COPY.en;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showLocaleMenu, setShowLocaleMenu] = useState(false);
    const location = useLocation();
    const supportsPageSettings = location.pathname === '/';

    const mobileTitle = useMemo(() => {
        if (location.pathname.startsWith('/schedule')) return locale === 'tr' ? 'Takvim' : 'Schedule';
        if (location.pathname.startsWith('/tasks')) return locale === 'tr' ? 'Görevler' : 'Tasks';
        if (location.pathname.startsWith('/courses')) return locale === 'tr' ? 'Dersler' : 'Courses';
        if (location.pathname.startsWith('/course/')) return locale === 'tr' ? 'Ders' : 'Course';
        if (location.pathname.startsWith('/pomodoro')) return 'Pomodoro';
        if (location.pathname.startsWith('/stats')) return locale === 'tr' ? 'İstatistikler' : 'Stats';
        if (location.pathname.startsWith('/leaderboard')) return locale === 'tr' ? 'Liderlik' : 'Leaderboard';
        if (location.pathname.startsWith('/rewards')) return locale === 'tr' ? 'Ödüller' : 'Rewards';
        return 'Sirius';
    }, [locale, location.pathname]);

    // Apply theme CSS variables + data-theme attribute
    useEffect(() => {
        const theme = THEMES.find((t) => t.key === themeKey);
        const root = document.documentElement;
        // Set data-theme for CSS selector targeting
        root.setAttribute('data-theme', themeKey);
        if (theme) {
            const varMap = {
                '--color-surface': '--theme-surface',
                '--color-surface-card': '--theme-card',
                '--color-surface-hover': '--theme-surface-hover',
                '--color-surface-dark': '--theme-surface-dark',
                '--color-border': '--theme-border',
                '--color-border-light': '--theme-border-light',
                '--color-text': '--theme-text',
                '--color-text-secondary': '--theme-text-secondary',
                '--color-text-muted': '--theme-text-muted',
                '--color-sidebar': '--theme-sidebar',
                '--color-primary': '--theme-primary',
                '--color-primary-bg': '--theme-primary-bg',
            };
            Object.entries(theme.vars).forEach(([key, value]) => {
                if (varMap[key]) {
                    root.style.setProperty(varMap[key], value);
                }
                if (key === '--sidebar-bg' || key === '--sidebar-border') {
                    root.style.setProperty(key, value);
                }
            });
        }
    }, [themeKey]);

    useEffect(() => {
        if (!user?.id || !isBrowserNotificationSupported() || Notification.permission !== 'granted') {
            return undefined;
        }

        const checkDueScheduleEntries = () => {
            const todayKey = getToday();
            const now = Date.now();

            safeScheduleEntries
                .filter((entry) => entry.userId === user.id && entry.date === todayKey)
                .forEach((entry) => {
                    const scheduledTime = buildTurkeyDateTime(entry.date, entry.startTime).getTime();
                    const isDueNow = now >= scheduledTime && now - scheduledTime <= 90000;

                    if (!isDueNow || hasSeenScheduleNotification(entry)) {
                        return;
                    }

                    const entryLabel = getScheduleEntryLabel(entry, safeCourses, scheduleCopy);
                    const body = fillTemplate(scheduleCopy.body, {
                        time: formatTime24(entry.startTime),
                        label: entryLabel,
                    });

                    showBrowserNotification(scheduleCopy.title, {
                        body,
                        tag: `schedule-${entry.id}`,
                    });
                    markScheduleNotificationSeen(entry);
                });
        };

        checkDueScheduleEntries();
        const intervalId = window.setInterval(checkDueScheduleEntries, 30000);

        return () => window.clearInterval(intervalId);
    }, [locale, safeCourses, safeScheduleEntries, scheduleCopy, user?.id]);

    useEffect(() => {
        if (!showLocaleMenu) {
            return undefined;
        }

        const handleCloseMenus = () => {
            setShowLocaleMenu(false);
        };

        window.addEventListener('click', handleCloseMenus);
        return () => window.removeEventListener('click', handleCloseMenus);
    }, [showLocaleMenu]);

    useEffect(() => {
        const flushOnBackground = () => {
            if (document.visibilityState === 'hidden') {
                void flushCloudStudySync();
            }
        };

        const flushOnPageHide = () => {
            void flushCloudStudySync();
        };

        document.addEventListener('visibilitychange', flushOnBackground);
        window.addEventListener('pagehide', flushOnPageHide);

        return () => {
            document.removeEventListener('visibilitychange', flushOnBackground);
            window.removeEventListener('pagehide', flushOnPageHide);
        };
    }, [flushCloudStudySync]);

    const handleLocaleChange = (nextLocale) => {
        persistLocale(nextLocale);
        setShowLocaleMenu(false);
    };

    const handleOpenPageSettings = () => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(PAGE_SETTINGS_EVENT, { detail: { pathname: location.pathname } }));
        }
    };

    const settingsCopy = locale === 'tr'
        ? {
            settings: 'Ayarlar',
            language: 'Dil',
          }
        : {
            settings: 'Settings',
            language: 'Language',
          };

    return (
        <div className="relative min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--theme-surface, #F8FAFC)' }}>
            <AudioEngine />
            <FocusOverlay />
            <div className="hidden lg:block">
                <Sidebar />
            </div>
            <button
                type="button"
                aria-label={locale === 'tr' ? 'Navigasyonu aç' : 'Open navigation'}
                onClick={() => setIsSidebarOpen(true)}
                className="fixed left-4 top-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-white/90 text-slate-700 shadow-lg backdrop-blur lg:hidden"
                style={{
                    borderColor: 'var(--theme-border-light, #E2E8F0)',
                    background: themeKey === 'dark' ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255,255,255,0.92)',
                    color: 'var(--theme-text, #111827)',
                }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
            </button>
            <div className={`fixed inset-0 z-40 bg-slate-950/45 transition-opacity lg:hidden ${isSidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setIsSidebarOpen(false)} />
            <Sidebar mobile isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="flex min-h-screen flex-col lg:pl-[240px]">
                <header className="sticky top-0 z-20 border-b px-4 py-4 backdrop-blur lg:hidden" style={{
                    borderColor: 'var(--theme-border-light, #E2E8F0)',
                    background: themeKey === 'dark' ? 'rgba(15, 23, 42, 0.78)' : 'rgba(248, 250, 252, 0.82)',
                }}>
                    <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 pl-14">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--theme-primary, #4F46E5)' }}>
                                Sirius
                            </p>
                            <h1 className="mt-1 text-base font-bold" style={{ color: 'var(--theme-text, #111827)' }}>
                                {mobileTitle}
                            </h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setShowLocaleMenu((open) => !open);
                                    }}
                                    className="rounded-full px-3 py-1 text-[11px] font-semibold"
                                    style={{
                                        background: 'var(--theme-primary-bg, #EEF2FF)',
                                        color: 'var(--theme-primary, #4F46E5)',
                                    }}
                                >
                                    {locale.toUpperCase()}
                                </button>
                                {showLocaleMenu && (
                                    <div
                                        onClick={(event) => event.stopPropagation()}
                                        className="absolute right-0 top-full z-30 mt-2 w-36 rounded-2xl border p-2 shadow-xl"
                                        style={{
                                            borderColor: 'var(--theme-border-light, #E2E8F0)',
                                            background: themeKey === 'dark' ? 'rgba(15,23,42,0.97)' : '#ffffff',
                                        }}
                                    >
                                        {SUPPORTED_LOCALES.map((option) => (
                                            <button
                                                key={option.key}
                                                type="button"
                                                onClick={() => handleLocaleChange(option.key)}
                                                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition"
                                                style={locale === option.key
                                                    ? { background: 'var(--theme-primary-bg, #EEF2FF)', color: 'var(--theme-primary, #4F46E5)' }
                                                    : { color: 'var(--theme-text-secondary, #64748B)' }}
                                            >
                                                <span>{option.shortLabel}</span>
                                                <span>{option.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {supportsPageSettings && (
                                <button
                                    type="button"
                                    onClick={handleOpenPageSettings}
                                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition"
                                    style={{
                                        borderColor: 'var(--theme-border-light, #E2E8F0)',
                                        background: themeKey === 'dark' ? 'rgba(15,23,42,0.82)' : 'rgba(255,255,255,0.86)',
                                        color: 'var(--theme-text-secondary, #64748B)',
                                    }}
                                >
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="opacity-70">
                                        <path d="M12 3.75v3.4M12 16.85v3.4M4.85 4.85l2.4 2.4M16.75 16.75l2.4 2.4M3.75 12h3.4M16.85 12h3.4M4.85 19.15l2.4-2.4M16.75 7.25l2.4-2.4" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                    {settingsCopy.settings}
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 px-4 pb-10 pt-24 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
                    <div className="mx-auto w-full max-w-[1600px]">
                        <div className="mb-6 hidden items-center justify-end gap-2 lg:flex">
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setShowLocaleMenu((open) => !open);
                                    }}
                                    className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition"
                                    style={{
                                        borderColor: 'var(--theme-border-light, #E2E8F0)',
                                        background: themeKey === 'dark' ? 'rgba(15,23,42,0.82)' : 'rgba(255,255,255,0.86)',
                                        color: 'var(--theme-text-secondary, #64748B)',
                                    }}
                                >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14.5 14.5 0 014 9 14.5 14.5 0 01-4 9 14.5 14.5 0 01-4-9 14.5 14.5 0 014-9z" /></svg>
                                    <span>{settingsCopy.language}</span>
                                    <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: 'var(--theme-primary-bg, #EEF2FF)', color: 'var(--theme-primary, #4F46E5)' }}>
                                        {locale.toUpperCase()}
                                    </span>
                                </button>
                                {showLocaleMenu && (
                                    <div
                                        onClick={(event) => event.stopPropagation()}
                                        className="absolute right-0 top-full z-30 mt-2 w-44 rounded-2xl border p-2 shadow-xl"
                                        style={{
                                            borderColor: 'var(--theme-border-light, #E2E8F0)',
                                            background: themeKey === 'dark' ? 'rgba(15,23,42,0.97)' : '#ffffff',
                                        }}
                                    >
                                        {SUPPORTED_LOCALES.map((option) => (
                                            <button
                                                key={option.key}
                                                type="button"
                                                onClick={() => handleLocaleChange(option.key)}
                                                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition"
                                                style={locale === option.key
                                                    ? { background: 'var(--theme-primary-bg, #EEF2FF)', color: 'var(--theme-primary, #4F46E5)' }
                                                    : { color: 'var(--theme-text-secondary, #64748B)' }}
                                            >
                                                <span>{option.label}</span>
                                                <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{option.shortLabel}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {supportsPageSettings && (
                                <button
                                    type="button"
                                    onClick={handleOpenPageSettings}
                                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition"
                                    style={{
                                        borderColor: 'var(--theme-border-light, #E2E8F0)',
                                        background: themeKey === 'dark' ? 'rgba(15,23,42,0.82)' : 'rgba(255,255,255,0.86)',
                                        color: 'var(--theme-text-secondary, #64748B)',
                                    }}
                                >
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="opacity-70">
                                        <path d="M12 3.75v3.4M12 16.85v3.4M4.85 4.85l2.4 2.4M16.75 16.75l2.4 2.4M3.75 12h3.4M16.85 12h3.4M4.85 19.15l2.4-2.4M16.75 7.25l2.4-2.4" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                    {settingsCopy.settings}
                                </button>
                            )}
                        </div>
                        <Outlet />
                    </div>
                </main>
            </div>
            <Toast />
        </div>
    );
}
