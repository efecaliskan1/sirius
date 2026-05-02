import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import YourSkyScene from '../components/rewards/YourSkyScene';
import Modal from '../components/UI/Modal';
import { PAGE_SETTINGS_EVENT } from '../layouts/AppLayout';
import {
    DEFAULT_WIDGETS,
    PHILOSOPHER_QUOTES,
    STREAK_PROTECTION_COST,
    WEEKLY_GOAL_MINUTES_MAX,
    WEEKLY_GOAL_MINUTES_MIN,
} from '../utils/constants';
import { formatDateWithOptions, formatTime24, getDateKeyInTurkey, getGreeting, getToday, minutesToDisplay } from '../utils/helpers';
import { getMotivationalMessage, getSessionStats, getLevelFromXP, getCompanionStage, getSmartSuggestion } from '../utils/rewardEngine';
import { db } from '../firebase/config';
import { isRecentlyActive, timestampToMillis } from '../utils/social';
import { fillCopy, HOME_COPY, useLocale } from '../utils/i18n';
import { getActiveRuntimeSnapshot, loadPomodoroRuntime } from '../utils/pomodoroRuntime';

export default function HomePage() {
    const user = useAuthStore((s) => s.user);
    const updateUser = useAuthStore((s) => s.updateUser);
    const purchaseStreakProtection = useAuthStore((s) => s.purchaseStreakProtection);
    const courses = useAppStore((s) => s.courses);
    const courseTopics = useAppStore((s) => s.courseTopics);
    const tasks = useAppStore((s) => s.tasks);
    const scheduleEntries = useAppStore((s) => s.scheduleEntries);
    const sessions = useAppStore((s) => s.sessions);
    const rewardState = useAppStore((s) => s.rewardState);
    const toggleTask = useAppStore((s) => s.toggleTask);
    const navigate = useNavigate();

    const [showWidgetModal, setShowWidgetModal] = useState(false);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [goalInput, setGoalInput] = useState('');
    const [studyRoomUsers, setStudyRoomUsers] = useState([]);
    const locale = useLocale();

    const activeThemeKey = user?.theme || 'calm';
    const isDark = activeThemeKey === 'dark';
    const isBarbie = activeThemeKey === 'barbie';
    const copy = HOME_COPY[locale] || HOME_COPY.en;

    const today = getToday();
    const todayFormatted = formatDateWithOptions(new Date(), { weekday: 'long', month: 'long', day: 'numeric' }, locale);

    const safeCourses = Array.isArray(courses) ? courses : [];
    const safeCourseTopics = Array.isArray(courseTopics) ? courseTopics : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeScheduleEntries = Array.isArray(scheduleEntries) ? scheduleEntries : [];
    const safeSessions = Array.isArray(sessions) ? sessions : [];
    const safeUserName = typeof user?.name === 'string' ? user.name : '';

    const userCourses = safeCourses.filter((c) => c?.userId === user?.id);
    const userTasks = safeTasks.filter((t) => t?.userId === user?.id);
    const userSessions = safeSessions.filter((s) => s?.userId === user?.id);
    const isPublicPresenceEnabled = Boolean(user?.publicProfileEnabled);
    const todayTasks = userTasks.filter((t) => t.dueDate === today && !t.completed);
    const todaySchedule = safeScheduleEntries
        .filter((e) => e?.userId === user?.id && e?.date === today)
        .sort((a, b) => (a?.startTime || '').localeCompare(b?.startTime || ''));
    const todaySessions = userSessions.filter((session) => {
        if (!session?.completed) {
            return false;
        }

        const sessionDateKey = session.sessionDateKey || (session.createdAt ? getDateKeyInTurkey(session.createdAt) : '');
        return sessionDateKey === today;
    });
    const activeRuntimeSession = getActiveRuntimeSnapshot(loadPomodoroRuntime(), user?.id, today);
    const completedTodayFocusMinutes = todaySessions.reduce(
        (sum, session) => sum + Number(session?.actualMinutes || session?.plannedMinutes || 0),
        0
    );
    const completedTodaySessionCount = todaySessions.length;
    const savedDailyFocusMinutes = rewardState?.dailyDateKey === today
        ? Number(rewardState?.dailyFocusMinutes || 0)
        : 0;
    const savedDailySessionsCount = rewardState?.dailyDateKey === today
        ? Number(rewardState?.dailySessionsCount || 0)
        : 0;
    const todayFocusMinutes = Math.max(savedDailyFocusMinutes, completedTodayFocusMinutes)
        + (activeRuntimeSession?.elapsedMinutes || 0);
    const todaySessionCount = Math.max(savedDailySessionsCount, completedTodaySessionCount)
        + (activeRuntimeSession?.countsAsSession ? 1 : 0);

    // Weekly goal calc
    const weekStart = new Date();
    const dow = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (dow === 0 ? 6 : dow - 1));
    const weekStartStr = getDateKeyInTurkey(weekStart);
    const weeklyMinutes = userSessions
        .filter((session) => {
            if (!session?.completed) {
                return false;
            }

            const sessionDateKey = session.sessionDateKey || (session.createdAt ? getDateKeyInTurkey(session.createdAt) : '');
            return Boolean(sessionDateKey) && sessionDateKey >= weekStartStr;
        })
        .reduce((sum, s) => sum + (s.actualMinutes || 0), 0);
    const weeklyGoal = user?.weeklyGoalMinutes || 900;
    const weeklyProgress = Math.min(100, (weeklyMinutes / weeklyGoal) * 100);

    const stats = getSessionStats(userSessions, userCourses);
    const motivationalMessage = useMemo(
        () => getMotivationalMessage(user?.streakCount || 0, stats.totalSessions, user?.lastActiveDate),
        [user?.streakCount, stats.totalSessions, user?.lastActiveDate]
    );

    const levelInfo = getLevelFromXP(user?.xp || 0);
    const companion = getCompanionStage(levelInfo.level);
    const localizedMotivationMessage = locale === 'tr'
        ? user?.streakCount
            ? `${user.streakCount} günlük serin harika gidiyor. Aynı ritmi koru.`
            : 'Bugün kendi çalışma düzenini biraz daha güçlendirmeye hazır mısın?'
        : motivationalMessage;
    const localizedCompanionSubtitle = locale === 'tr'
        ? `${companion.name} · Her odak oturumunda ilerlemen biraz daha görünür hale geliyor.`
        : fillCopy(copy.motivationSubtitle, { name: companion.name, description: companion.description });

    const suggestion = useMemo(() => getSmartSuggestion(userCourses, safeCourseTopics, userSessions, today), [safeCourseTopics, today, userCourses, userSessions]);
    const dailyQuote = useMemo(() => {
        const quoteIndex = today
            .split('')
            .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0) % PHILOSOPHER_QUOTES.length;

        return PHILOSOPHER_QUOTES[quoteIndex];
    }, [today]);
    const localizedQuoteText = locale === 'tr'
        ? (dailyQuote.trText || dailyQuote.text)
        : dailyQuote.text;
    const localizedSuggestionMessage = useMemo(() => {
        if (!suggestion) {
            return '';
        }

        const suggestionTemplates = copy.smartSuggestionMessages || {};
        const template = suggestionTemplates[suggestion.messageKey || suggestion.type];

        if (!template) {
            return suggestion.message;
        }

        return fillCopy(template, {
            course: suggestion.courseName || userCourses.find((course) => course.id === suggestion.courseId)?.courseName || copy.viewCourseFallback,
            days: suggestion.dayCount ?? 0,
        });
    }, [copy.smartSuggestionMessages, copy.viewCourseFallback, suggestion, userCourses]);

    useEffect(() => {
        const activeUsersQuery = query(
            collection(db, 'publicProfiles'),
            where('publicProfileEnabled', '==', true)
        );

        const unsubscribe = onSnapshot(
            activeUsersQuery,
            (snapshot) => {
                const users = snapshot.docs
                    .map((docSnapshot) => ({
                        id: docSnapshot.id,
                        ...docSnapshot.data(),
                    }))
                    .filter((member) => isRecentlyActive(member.lastSeenAt))
                    .sort((a, b) => {
                        if (Boolean(b.focusingNow) !== Boolean(a.focusingNow)) {
                            return Number(Boolean(b.focusingNow)) - Number(Boolean(a.focusingNow));
                        }
                        return timestampToMillis(b.lastSeenAt) - timestampToMillis(a.lastSeenAt);
                    });

                setStudyRoomUsers(users);
            },
            (error) => {
                console.error('Failed to load study room presence', error);
                setStudyRoomUsers([]);
            }
        );

        return unsubscribe;
    }, []);

    useEffect(() => {
        const handleOpenPageSettings = () => {
            setShowWidgetModal(true);
        };

        window.addEventListener(PAGE_SETTINGS_EVENT, handleOpenPageSettings);
        return () => window.removeEventListener(PAGE_SETTINGS_EVENT, handleOpenPageSettings);
    }, []);

    const handleProtectStreak = () => {
        if (user?.coinBalance >= STREAK_PROTECTION_COST) {
            purchaseStreakProtection();
        } else {
            alert(locale === 'tr'
                ? 'Serini korumak için yeterli jetonun yok. Birkaç oturum daha tamamlayınca birikir.'
                : 'Not enough coins to protect your streak! Keep studying to earn more.');
        }
    };

    const handleReflection = (rating) => {
        updateUser({
            dailyReflections: {
                ...(user?.dailyReflections || {}),
                [today]: rating
            }
        });
    };

    const widgets = Array.isArray(user?.dashboardWidgets) ? user.dashboardWidgets : DEFAULT_WIDGETS;
    const isWidgetEnabled = (id) => {
        const w = widgets.find((w) => w.id === id);
        return w ? w.enabled : true;
    };

    const getCourse = (courseId) => userCourses.find((c) => c.id === courseId);
    const focusingUsers = studyRoomUsers.filter((member) => member.focusingNow);
    const displayedStudyRoomUsers = focusingUsers.length > 0 ? focusingUsers.slice(0, 6) : studyRoomUsers.slice(0, 6);

    const handleSaveGoal = () => {
        const parsedHours = Number.parseInt(goalInput, 10);

        if (Number.isFinite(parsedHours)) {
            const mins = Math.min(
                WEEKLY_GOAL_MINUTES_MAX,
                Math.max(WEEKLY_GOAL_MINUTES_MIN, parsedHours * 60)
            );
            updateUser({ weeklyGoalMinutes: mins });
        }
        setShowGoalModal(false);
    };

    const toggleWidget = (widgetId) => {
        const updated = widgets.map((w) =>
            w.id === widgetId ? { ...w, enabled: !w.enabled } : w
        );
        updateUser({ dashboardWidgets: updated });
    };

    const firstName = safeUserName
        .replace(/[^\s]+@[^\s]+\.[^\s]+/g, '')
        .trim()
        .split(' ')
        .filter(Boolean)[0] || copy.student;
    const roomCountLines = focusingUsers.length > 0
        ? [copy.members, copy.focusingNow]
        : [copy.activeMembers, copy.onlineNow];
    const roomHeadline = displayedStudyRoomUsers.length > 0
        ? displayedStudyRoomUsers[0].focusingNow
            ? fillCopy(copy.isInSession, {
                name: typeof displayedStudyRoomUsers[0].displayName === 'string' && displayedStudyRoomUsers[0].displayName.trim()
                    ? displayedStudyRoomUsers[0].displayName
                    : copy.student,
                session: typeof displayedStudyRoomUsers[0].currentSessionTitle === 'string' && displayedStudyRoomUsers[0].currentSessionTitle.trim()
                    ? displayedStudyRoomUsers[0].currentSessionTitle
                    : (locale === 'tr' ? 'bir odak oturumu' : 'a focus session'),
            })
            : fillCopy(copy.isOnline, {
                name: typeof displayedStudyRoomUsers[0].displayName === 'string' && displayedStudyRoomUsers[0].displayName.trim()
                    ? displayedStudyRoomUsers[0].displayName
                    : copy.student
            })
        : null;

    // Overview card data
    const overviewCards = [
        { label: copy.sessionsToday, value: todaySessionCount, icon: '🍅', iconColor: '#F43F5E' },
        { label: copy.todaysTasksStat, value: todayTasks.length, icon: '✓', iconColor: '#10B981' },
        { label: copy.focusTime, value: minutesToDisplay(todayFocusMinutes), icon: '⏱', iconColor: '#6366F1' },
        { label: copy.streak, value: `${user?.streakCount || 0}d`, icon: '🔥', iconColor: '#F59E0B' },
    ];

    return (
        <div className="w-full max-w-[1400px] mx-auto pb-8 space-y-6">

            {/* ============ GREETING ROW ============ */}
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <p className="text-[13px] font-medium" style={{ color: 'var(--bb-ink)', opacity: 0.7 }}>
                        {getGreeting(locale)}
                    </p>
                    <h1
                        className="display-heading text-[32px] sm:text-[40px] mt-1"
                        style={{ color: 'var(--bb-ink)' }}
                    >
                        {firstName}
                    </h1>
                    <p
                        className="text-[12px] font-medium mt-1"
                        style={{ color: 'var(--bb-ink)', opacity: 0.55 }}
                    >
                        {todayFormatted}
                    </p>
                </div>

                {/* Floating sticker companion */}
                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: -8 }}
                    transition={{ delay: 0.15, type: 'spring' }}
                    className="hidden sm:flex flex-col items-center justify-center text-center"
                    style={{
                        width: '88px',
                        height: '88px',
                        borderRadius: '50%',
                        background: 'var(--bb-accent-1)',
                        border: 'var(--bb-border-w) solid var(--bb-ink)',
                        boxShadow: '4px 4px 0 var(--bb-shadow)',
                        color: 'var(--bb-ink)',
                    }}
                >
                    <span className="text-[28px] leading-none animate-float">{companion.emoji}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider mt-1">
                        {companion.label || 'lvl'}
                    </span>
                </motion.div>
            </motion.div>

            {/* ============ QUICK FOCUS CTA — big, sticker-style ============ */}
            {isWidgetEnabled('quick-focus') && (
                <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => navigate('/pomodoro')}
                    className="card card-interactive w-full text-left group"
                    style={{ background: 'var(--bb-accent-1)', cursor: 'pointer' }}
                >
                    <div className="flex items-center gap-4">
                        <div
                            className="flex-shrink-0 flex items-center justify-center"
                            style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '14px',
                                background: 'var(--bb-card)',
                                border: '2px solid var(--bb-ink)',
                                color: 'var(--bb-ink)',
                            }}
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--bb-ink)', opacity: 0.65 }}>
                                {copy.quickFocus}
                            </p>
                            <p className="text-[18px] font-extrabold leading-tight mt-0.5" style={{ color: 'var(--bb-ink)' }}>
                                {copy.startSession}
                            </p>
                        </div>
                        <span
                            className="hidden sm:inline-flex items-center justify-center"
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'var(--bb-card)',
                                border: '2px solid var(--bb-ink)',
                                color: 'var(--bb-ink)',
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                            </svg>
                        </span>
                    </div>
                </motion.button>
            )}

            {/* ============ TODAY'S STATS — 2x2 sticker grid ============ */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {overviewCards.map((card, i) => {
                    const accentBg = ['var(--bb-accent-2)', 'var(--bb-accent-3)', 'var(--bb-accent-4)', 'var(--bb-accent-1)'][i % 4];
                    return (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + i * 0.05 }}
                            className="card !p-4"
                            style={{ background: accentBg }}
                        >
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-2" style={{ color: 'var(--bb-ink)', opacity: 0.7 }}>
                                {card.label}
                            </p>
                            <p className="text-[26px] font-extrabold leading-none tracking-tight" style={{ color: 'var(--bb-ink)' }}>
                                {card.value}
                            </p>
                        </motion.div>
                    );
                })}
            </div>

            {/* ============ MAIN GRID — 2 columns on desktop ============ */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] gap-5">

                {/* ─── LEFT COLUMN ─── */}
                <div className="space-y-5">

                    {/* Smart Suggestion (sticker callout) */}
                    {suggestion && suggestion.type !== 'new' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, rotate: -1.5 }}
                            animate={{ opacity: 1, scale: 1, rotate: -1 }}
                            className="card flex gap-4 items-center"
                            style={{ background: 'var(--bb-accent-4)' }}
                        >
                            <div
                                className="flex items-center justify-center flex-shrink-0"
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    background: 'var(--bb-card)',
                                    border: '2px solid var(--bb-ink)',
                                    color: 'var(--bb-ink)',
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3v3M5.6 5.6l2.1 2.1M3 12h3M5.6 18.4l2.1-2.1M12 18v3M18.4 18.4l-2.1-2.1M21 12h-3M18.4 5.6l-2.1 2.1" /><circle cx="12" cy="12" r="4"/>
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] mb-1" style={{ color: 'var(--bb-ink)', opacity: 0.65 }}>
                                    {copy.smartSuggestion}
                                </p>
                                <p className="text-[14px] font-bold leading-snug" style={{ color: 'var(--bb-ink)' }}>
                                    {localizedSuggestionMessage}
                                </p>
                            </div>
                            {suggestion.courseId && (
                                <button
                                    onClick={() => navigate(`/pomodoro?courseId=${suggestion.courseId}`)}
                                    className="btn-primary flex-shrink-0"
                                    style={{ background: 'var(--bb-card)' }}
                                >
                                    {copy.focus}
                                </button>
                            )}
                        </motion.div>
                    )}

                    {/* Today's Tasks */}
                    {isWidgetEnabled('today-tasks') && (
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-[16px] font-extrabold uppercase tracking-tight" style={{ color: 'var(--bb-ink)' }}>
                                    {copy.todayTasks}
                                </h2>
                                <Link
                                    to="/tasks"
                                    className="text-[11px] font-bold uppercase tracking-wider underline-offset-2 hover:underline"
                                    style={{ color: 'var(--bb-ink)' }}
                                >
                                    {copy.viewAll} →
                                </Link>
                            </div>
                            {todayTasks.length === 0 ? (
                                <div
                                    className="empty-state-card text-center py-7 px-4"
                                    style={{
                                        borderRadius: '14px',
                                        border: '2.5px dashed var(--bb-ink)',
                                        background: 'var(--bb-paper)',
                                    }}
                                >
                                    <p className="text-[13px] font-bold mb-3" style={{ color: 'var(--bb-ink)', opacity: 0.7 }}>
                                        {copy.noTasks}
                                    </p>
                                    <button onClick={() => navigate('/tasks')} className="btn-primary">
                                        + {copy.addTask}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {todayTasks.slice(0, 5).map((task, i) => {
                                        const course = getCourse(task.courseId);
                                        return (
                                            <motion.div
                                                key={task.id}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.15 + i * 0.04 }}
                                                className="flex items-center gap-3 py-2.5 px-3"
                                                style={{
                                                    borderRadius: '12px',
                                                    border: '2px solid var(--bb-ink)',
                                                    background: 'var(--bb-paper)',
                                                }}
                                            >
                                                <button
                                                    onClick={() => toggleTask(task.id)}
                                                    aria-label="toggle task"
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        flexShrink: 0,
                                                        border: '2px solid var(--bb-ink)',
                                                        borderRadius: '6px',
                                                        background: 'var(--bb-card)',
                                                        cursor: 'pointer',
                                                    }}
                                                />
                                                <span className="text-[13px] font-bold flex-1 truncate" style={{ color: 'var(--bb-ink)' }}>
                                                    {task.title}
                                                </span>
                                                {course && (
                                                    <span
                                                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-1"
                                                        style={{
                                                            borderRadius: '999px',
                                                            border: '2px solid var(--bb-ink)',
                                                            background: course.color,
                                                            color: '#fff',
                                                        }}
                                                    >
                                                        {course.courseName}
                                                    </span>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Today's Schedule */}
                    {isWidgetEnabled('schedule-preview') && (
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-[16px] font-extrabold uppercase tracking-tight" style={{ color: 'var(--bb-ink)' }}>
                                    {copy.todaySchedule}
                                </h2>
                                <Link
                                    to="/schedule"
                                    className="text-[11px] font-bold uppercase tracking-wider underline-offset-2 hover:underline"
                                    style={{ color: 'var(--bb-ink)' }}
                                >
                                    {copy.viewSchedule} →
                                </Link>
                            </div>
                            {todaySchedule.length === 0 ? (
                                <div
                                    className="empty-state-card text-center py-7 px-4"
                                    style={{
                                        borderRadius: '14px',
                                        border: '2.5px dashed var(--bb-ink)',
                                        background: 'var(--bb-paper)',
                                    }}
                                >
                                    <p className="text-[13px] font-bold" style={{ color: 'var(--bb-ink)', opacity: 0.7 }}>
                                        {copy.noSchedule}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {todaySchedule.slice(0, 4).map((entry) => {
                                        const course = getCourse(entry.courseId);
                                        return (
                                            <div
                                                key={entry.id}
                                                className="flex items-center gap-3 py-2.5 px-3"
                                                style={{
                                                    borderRadius: '12px',
                                                    border: '2px solid var(--bb-ink)',
                                                    background: 'var(--bb-paper)',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: '6px',
                                                        height: '36px',
                                                        borderRadius: '3px',
                                                        flexShrink: 0,
                                                        background: course?.color || 'var(--bb-ink)',
                                                        border: '1.5px solid var(--bb-ink)',
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[13px] font-extrabold truncate" style={{ color: 'var(--bb-ink)' }}>
                                                        {course?.courseName || copy.viewCourseFallback}
                                                    </div>
                                                    <div className="text-[11px] font-bold mt-0.5" style={{ color: 'var(--bb-ink)', opacity: 0.6 }}>
                                                        {formatTime24(entry.startTime)} – {formatTime24(entry.endTime)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Daily Reflection */}
                    {todaySessions.length > 0 && !user?.dailyReflections?.[today] && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card"
                            style={{ background: 'var(--bb-accent-3)' }}
                        >
                            <h3 className="text-[16px] font-extrabold uppercase tracking-tight" style={{ color: 'var(--bb-ink)' }}>
                                {copy.dailyReflection}
                            </h3>
                            <p className="text-[12px] font-medium mt-1 mb-3" style={{ color: 'var(--bb-ink)', opacity: 0.7 }}>
                                {copy.dailyReflectionPrompt}
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: copy.productive, emoji: '🙂', value: 'productive' },
                                    { label: copy.average, emoji: '😐', value: 'average' },
                                    { label: copy.lowFocus, emoji: '😴', value: 'low focus' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => handleReflection(opt.value)}
                                        className="btn-secondary justify-center"
                                        style={{ flexDirection: 'column', padding: '0.625rem', fontSize: '11px' }}
                                    >
                                        <span className="text-[18px]" style={{ fontFamily: '"Apple Color Emoji","Segoe UI Emoji",emoji' }}>{opt.emoji}</span>
                                        <span className="font-bold uppercase tracking-wider mt-1">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* ─── RIGHT COLUMN ─── */}
                <div className="space-y-5">

                    {/* Weekly Goal */}
                    {isWidgetEnabled('weekly-goal') && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card card-interactive"
                            style={{ background: 'var(--bb-accent-2)' }}
                            onClick={() => { setGoalInput(Math.round(weeklyGoal / 60).toString()); setShowGoalModal(true); }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[14px] font-extrabold uppercase tracking-tight" style={{ color: 'var(--bb-ink)' }}>
                                    {copy.weeklyGoal}
                                </h3>
                                <span className="badge" style={{ background: 'var(--bb-card)' }}>
                                    {Math.round(weeklyProgress)}%
                                </span>
                            </div>
                            <p className="text-[24px] font-extrabold leading-none mb-1" style={{ color: 'var(--bb-ink)' }}>
                                {Math.floor(weeklyMinutes / 60)}h {weeklyMinutes % 60}m
                            </p>
                            <p className="text-[11px] font-bold mb-3" style={{ color: 'var(--bb-ink)', opacity: 0.7 }}>
                                / {Math.floor(weeklyGoal / 60)}h {copy.goalSuffix}
                            </p>
                            <div className="weekly-goal-bar w-full" style={{ height: '12px', borderRadius: '8px', background: 'var(--bb-card)', border: '2px solid var(--bb-ink)', overflow: 'hidden' }}>
                                <motion.div
                                    className="weekly-goal-fill h-full"
                                    style={{ background: 'var(--bb-ink)' }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${weeklyProgress}%` }}
                                    transition={{ duration: 1, delay: 0.3 }}
                                />
                            </div>
                        </motion.div>
                    )}

                    {/* Rewards / Sky */}
                    {isWidgetEnabled('streak-status') && (
                        <div className="card">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[14px] font-extrabold uppercase tracking-tight" style={{ color: 'var(--bb-ink)' }}>
                                    {copy.yourSky}
                                </h3>
                                <Link
                                    to="/rewards"
                                    className="text-[11px] font-bold uppercase tracking-wider underline-offset-2 hover:underline"
                                    style={{ color: 'var(--bb-ink)' }}
                                >
                                    {copy.details} →
                                </Link>
                            </div>
                            <YourSkyScene
                                compact
                                sessionsCompleted={stats.totalSessions}
                                streak={user?.streakCount || 0}
                                totalMinutes={stats.totalMinutes}
                                className="mb-3"
                            />
                            {user?.streakCount > 0 && !user?.streakProtected && (
                                <button
                                    onClick={handleProtectStreak}
                                    className="w-full flex items-center justify-between py-2.5 px-3 mt-2"
                                    style={{
                                        borderRadius: '12px',
                                        border: '2px solid var(--bb-ink)',
                                        background: 'var(--bb-accent-1)',
                                        color: 'var(--bb-ink)',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                    }}
                                >
                                    <span className="flex items-center gap-2">
                                        <span style={{ fontFamily: '"Apple Color Emoji","Segoe UI Emoji",emoji' }}>🛡️</span>
                                        {copy.protectStreak}
                                    </span>
                                    <span
                                        className="px-2 py-0.5"
                                        style={{
                                            borderRadius: '6px',
                                            border: '1.5px solid var(--bb-ink)',
                                            background: 'var(--bb-card)',
                                            fontSize: '10px',
                                        }}
                                    >
                                        50 {locale === 'tr' ? 'jeton' : 'coins'}
                                    </span>
                                </button>
                            )}
                            {user?.streakProtected && (
                                <div
                                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 mt-2"
                                    style={{
                                        borderRadius: '12px',
                                        border: '2px solid var(--bb-ink)',
                                        background: 'var(--bb-accent-2)',
                                        color: 'var(--bb-ink)',
                                        fontSize: '12px',
                                        fontWeight: '700',
                                    }}
                                >
                                    <span style={{ fontFamily: '"Apple Color Emoji","Segoe UI Emoji",emoji' }}>✨</span>
                                    {copy.streakProtected}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Global Study Room — sade brutalist */}
                    {isWidgetEnabled('global-study-room') && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[14px] font-extrabold uppercase tracking-tight" style={{ color: 'var(--bb-ink)' }}>
                                    {copy.globalStudyRoom}
                                </h3>
                                <span
                                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                                    style={{ color: 'var(--bb-ink)' }}
                                >
                                    <span
                                        className="animate-pulse"
                                        style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: 'var(--bb-accent-5)',
                                            border: '1.5px solid var(--bb-ink)',
                                        }}
                                    />
                                    {copy.live}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 mb-3">
                                <p className="text-[36px] font-extrabold leading-none tracking-tight" style={{ color: 'var(--bb-ink)' }}>
                                    {focusingUsers.length || studyRoomUsers.length}
                                </p>
                                <p className="text-[11px] font-bold leading-tight" style={{ color: 'var(--bb-ink)', opacity: 0.65 }}>
                                    {roomCountLines[0]}<br />{roomCountLines[1]}
                                </p>
                            </div>
                            {displayedStudyRoomUsers.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                                    {displayedStudyRoomUsers.map((member) => (
                                        <div
                                            key={member.id}
                                            className="px-2 py-1 text-[10px] font-bold"
                                            style={{
                                                borderRadius: '999px',
                                                border: '2px solid var(--bb-ink)',
                                                background: 'var(--bb-paper)',
                                                color: 'var(--bb-ink)',
                                            }}
                                        >
                                            {(typeof member.displayName === 'string' && member.displayName.trim()
                                                ? member.displayName
                                                : 'Student').split(' ')[0]}
                                        </div>
                                    ))}
                                    {studyRoomUsers.length > displayedStudyRoomUsers.length && (
                                        <div
                                            className="px-2 py-1 text-[10px] font-bold"
                                            style={{
                                                borderRadius: '999px',
                                                border: '2px solid var(--bb-ink)',
                                                background: 'var(--bb-accent-1)',
                                                color: 'var(--bb-ink)',
                                            }}
                                        >
                                            +{studyRoomUsers.length - displayedStudyRoomUsers.length}
                                        </div>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={() => navigate('/pomodoro?mode=deep')}
                                className="btn-primary w-full justify-center"
                            >
                                {copy.joinStudyRoom}
                            </button>
                            <button
                                onClick={() => updateUser({ publicProfileEnabled: !isPublicPresenceEnabled })}
                                className="text-[11px] font-bold uppercase tracking-wider w-full text-center mt-2 underline-offset-2 hover:underline"
                                style={{ color: 'var(--bb-ink)', opacity: 0.65, background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                            >
                                {isPublicPresenceEnabled ? copy.disablePublicPresence : copy.enablePublicPresence}
                            </button>
                        </motion.div>
                    )}

                    {/* Quote of the Day */}
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card"
                        style={{ background: 'var(--bb-paper)' }}
                    >
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--bb-ink)', opacity: 0.55 }}>
                            {copy.quoteOfTheDay}
                        </p>
                        <p className="text-[14px] font-medium italic leading-relaxed" style={{ color: 'var(--bb-ink)' }}>
                            "{localizedQuoteText}"
                        </p>
                        <p className="text-[11px] font-bold uppercase tracking-wider mt-2" style={{ color: 'var(--bb-ink)', opacity: 0.6 }}>
                            — {dailyQuote.author}
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* ============ MODALS ============ */}
            <Modal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)} title={copy.weeklyStudyGoal}>
                <div className="space-y-4">
                    <div>
                        <label className="label">{copy.hoursPerWeek}</label>
                        <input
                            type="number"
                            className="input"
                            value={goalInput}
                            onChange={(e) => setGoalInput(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                            placeholder="15"
                            min={WEEKLY_GOAL_MINUTES_MIN / 60}
                            max={WEEKLY_GOAL_MINUTES_MAX / 60}
                            maxLength={3}
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowGoalModal(false)} className="btn-secondary flex-1 justify-center">{copy.cancel}</button>
                        <button onClick={handleSaveGoal} className="btn-primary flex-1 justify-center">{copy.saveGoal}</button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showWidgetModal}
                onClose={() => setShowWidgetModal(false)}
                title={copy.customizeDashboardModal}
            >
                <div className="space-y-4">
                    <p className="text-[13px] font-medium" style={{ color: 'var(--bb-ink)', opacity: 0.7 }}>
                        {copy.customizeDashboardDescription}
                    </p>
                    <div className="space-y-2">
                        {(widgets || DEFAULT_WIDGETS).map((widget) => (
                            <label
                                key={widget.id}
                                className="flex items-center gap-3 px-3 py-3 cursor-pointer"
                                style={{
                                    borderRadius: '12px',
                                    border: '2px solid var(--bb-ink)',
                                    background: widget.enabled ? 'var(--bb-accent-1)' : 'var(--bb-paper)',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={widget.enabled}
                                    onChange={() => toggleWidget(widget.id)}
                                    style={{
                                        width: '18px',
                                        height: '18px',
                                        accentColor: 'var(--bb-ink)',
                                    }}
                                />
                                <span className="text-[14px] font-bold" style={{ color: 'var(--bb-ink)' }}>
                                    {copy.widgetNames[widget.id] || widget.name}
                                </span>
                            </label>
                        ))}
                    </div>
                    <button
                        onClick={() => setShowWidgetModal(false)}
                        className="btn-primary w-full justify-center"
                    >
                        {copy.done}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
