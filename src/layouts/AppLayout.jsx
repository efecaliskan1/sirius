import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomTabBar from '../components/Layout/BottomTabBar';
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

// Theme picker has been removed; the app now uses the single 'calm'
// brutalist theme.
const FORCED_THEME = 'calm';

export default function AppLayout() {
    const user = useAuthStore((s) => s.user);
    const courses = useAppStore((s) => s.courses);
    const scheduleEntries = useAppStore((s) => s.scheduleEntries);
    const flushCloudStudySync = useAppStore((s) => s.flushCloudStudySync);
    const safeCourses = Array.isArray(courses) ? courses : [];
    const safeScheduleEntries = Array.isArray(scheduleEntries) ? scheduleEntries : [];
    const locale = useLocale();
    const scheduleCopy = SCHEDULE_NOTIFICATION_COPY[locale] || SCHEDULE_NOTIFICATION_COPY.en;
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

    // Apply the forced calm theme on mount.
    useEffect(() => {
        const theme = THEMES.find((t) => t.key === FORCED_THEME);
        const root = document.documentElement;
        root.setAttribute('data-theme', FORCED_THEME);
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
                // All --bb-* tokens flow through directly so brutalist
                // styles in index.css pick them up automatically.
                if (key.startsWith('--bb-')) {
                    root.style.setProperty(key, value);
                }
            });
        }
    }, []);

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
        ? { settings: 'Ayarlar', language: 'Dil' }
        : { settings: 'Settings', language: 'Language' };

    return (
        <div
            className="relative min-h-screen"
            style={{ backgroundColor: 'var(--bb-paper)' }}
        >
            <AudioEngine />
            <FocusOverlay />

            {/* Top bar — sade brutalist, page title + locale + settings */}
            <header
                className="sticky top-0 z-20 px-4 py-3"
                style={{
                    background: 'var(--bb-paper)',
                    borderBottom: '2px solid var(--bb-ink)',
                }}
            >
                <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
                    <div>
                        <p
                            className="text-[9px] font-bold uppercase tracking-[0.24em]"
                            style={{ color: 'var(--bb-ink)', opacity: 0.55 }}
                        >
                            Sirius
                        </p>
                        <h1
                            className="display-heading text-[18px] mt-0.5"
                            style={{ color: 'var(--bb-ink)' }}
                        >
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
                                className="text-[11px] font-bold uppercase tracking-wider"
                                style={{
                                    border: '2px solid var(--bb-ink)',
                                    borderRadius: '999px',
                                    background: 'var(--bb-card)',
                                    color: 'var(--bb-ink)',
                                    padding: '5px 12px',
                                    boxShadow: '2px 2px 0 var(--bb-shadow)',
                                    cursor: 'pointer',
                                }}
                            >
                                {locale.toUpperCase()}
                            </button>
                            {showLocaleMenu && (
                                <div
                                    onClick={(event) => event.stopPropagation()}
                                    className="absolute right-0 top-full z-30 mt-2"
                                    style={{
                                        width: '160px',
                                        border: '2.5px solid var(--bb-ink)',
                                        borderRadius: '14px',
                                        background: 'var(--bb-card)',
                                        boxShadow: '4px 4px 0 var(--bb-shadow)',
                                        padding: '6px',
                                    }}
                                >
                                    {SUPPORTED_LOCALES.map((option) => (
                                        <button
                                            key={option.key}
                                            type="button"
                                            onClick={() => handleLocaleChange(option.key)}
                                            className="flex w-full items-center justify-between text-[12px] font-bold"
                                            style={locale === option.key
                                                ? {
                                                    background: 'var(--bb-accent-1)',
                                                    border: '2px solid var(--bb-ink)',
                                                    borderRadius: '10px',
                                                    color: 'var(--bb-ink)',
                                                    padding: '8px 12px',
                                                    margin: '2px 0',
                                                }
                                                : {
                                                    color: 'var(--bb-ink)',
                                                    padding: '8px 12px',
                                                    margin: '2px 0',
                                                    border: '2px solid transparent',
                                                    background: 'none',
                                                    cursor: 'pointer',
                                                }}
                                        >
                                            <span>{option.label}</span>
                                            <span className="text-[10px] opacity-60">{option.shortLabel}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {supportsPageSettings && (
                            <button
                                type="button"
                                onClick={handleOpenPageSettings}
                                aria-label={settingsCopy.settings}
                                className="inline-flex items-center justify-center"
                                style={{
                                    width: '34px',
                                    height: '34px',
                                    border: '2px solid var(--bb-ink)',
                                    borderRadius: '999px',
                                    background: 'var(--bb-card)',
                                    color: 'var(--bb-ink)',
                                    boxShadow: '2px 2px 0 var(--bb-shadow)',
                                    cursor: 'pointer',
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 1v6m0 10v6M4.22 4.22l4.24 4.24m7.07 7.07l4.24 4.24M1 12h6m10 0h6M4.22 19.78l4.24-4.24m7.07-7.07l4.24-4.24" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main content area, padded for the bottom tab bar */}
            <main
                className="px-4 pt-4"
                style={{
                    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 110px)',
                }}
            >
                <div className="mx-auto w-full max-w-[1400px]">
                    <Outlet />
                </div>
            </main>

            <BottomTabBar />
            <Toast />
        </div>
    );
}
