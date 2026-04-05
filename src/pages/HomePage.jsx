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
        <div className="w-full max-w-[1600px] space-y-8">
            {/* Greeting + Motivation */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <h1
                            className="text-[32px] tracking-tight"
                            style={{ color: 'var(--theme-text, #111827)' }}
                        >
                            {getGreeting(locale)},{' '}
                            <span className="font-extrabold">
                                {firstName}
                            </span>
                        </h1>
                        <p
                            className="font-medium text-[15px] mt-1"
                            style={{ color: 'var(--theme-text-muted, #94A3B8)' }}
                        >
                            {todayFormatted}
                        </p>
                    </div>
                </div>

                {/* Motivation Card */}
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`mt-4 px-5 py-4 rounded-2xl motivation-card-dark ${isDark ? 'border border-indigo-500/15' : 'border'}`}
                    style={isDark
                        ? { background: 'rgba(99, 102, 241, 0.08)' }
                        : {
                            background: isBarbie
                                ? 'linear-gradient(135deg, rgba(255, 244, 250, 1) 0%, rgba(249, 168, 212, 0.24) 100%)'
                                : 'linear-gradient(90deg, rgba(239,246,255,1) 0%, rgba(238,242,255,1) 50%, rgba(245,243,255,1) 100%)',
                            borderColor: isBarbie ? 'rgba(225, 29, 114, 0.12)' : 'rgba(129, 140, 248, 0.18)',
                        }}
                >
                    <div className="flex items-center gap-3">
                        <div className="text-2xl animate-float">{companion.emoji}</div>
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--theme-text, #334155)' }}>{localizedMotivationMessage}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>{localizedCompanionSubtitle}</p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Overview Cards */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {overviewCards.map((card, i) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.06 }}
                        className={`card overview-stat-card !p-4 !border-transparent shadow-sm`}
                        style={isDark ? {} : { border: '1px solid var(--theme-border-light)' }}
                    >
                        <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm mb-2 stat-icon-wrap`}
                            style={{
                                background: isDark ? 'rgba(255,255,255,0.06)' : 'var(--theme-surface-hover, #F8FAFC)',
                                color: card.iconColor
                            }}
                        >
                            {card.icon}
                        </div>
                        <div className="text-xl font-bold leading-none mb-1 mt-3" style={{ color: 'var(--theme-text, #111827)' }}>{card.value}</div>
                        <div className="text-[11.5px] font-medium" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>{card.label}</div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.22fr)_minmax(340px,0.78fr)]">
                {/* Left Column: 2/3 */}
                <div className="space-y-6">
                    {/* Header Top Elements */}
                    <div className={`grid gap-5 ${suggestion && suggestion.type !== 'new' ? 'xl:grid-cols-2' : 'grid-cols-1'}`}>
                        <div className="card relative overflow-hidden flex flex-col justify-center h-full">
                            <div
                                className="absolute top-0 left-0 w-2 h-full rounded-l-2xl"
                                style={{
                                    background: isDark
                                        ? 'linear-gradient(180deg, rgba(99, 102, 241, 0.6) 0%, rgba(168, 85, 247, 0.6) 100%)'
                                        : isBarbie
                                            ? 'linear-gradient(180deg, rgba(225, 29, 114, 0.72) 0%, rgba(236, 72, 153, 0.42) 100%)'
                                            : 'linear-gradient(180deg, rgba(129, 140, 248, 0.7) 0%, rgba(196, 181, 253, 0.9) 100%)',
                                }}
                            ></div>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 pl-3" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>{copy.quoteOfTheDay}</h3>
                            <p className="italic font-medium leading-relaxed pl-3" style={{ color: 'var(--theme-text-secondary, #64748B)' }}>
                                "{localizedQuoteText}" — {dailyQuote.author}
                            </p>
                        </div>

                        {/* Smart Suggestion */}
                        {suggestion && suggestion.type !== 'new' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, rotate: -2 }}
                                animate={{ opacity: 1, scale: 1, rotate: 1 }}
                                className={`card flex gap-4 items-center p-5 transform transition-transform hover:rotate-0 h-full ${isDark ? 'border border-amber-500/15' : 'border'}`}
                                style={isDark
                                    ? { background: 'rgba(245, 158, 11, 0.06)' }
                                    : {
                                        background: isBarbie
                                            ? 'linear-gradient(135deg, rgba(255, 244, 250, 1) 0%, rgba(249, 168, 212, 0.26) 100%)'
                                            : 'linear-gradient(135deg, rgba(255,251,235,1) 0%, rgba(255,237,213,1) 100%)',
                                        borderColor: isBarbie ? 'rgba(225, 29, 114, 0.14)' : 'rgba(251, 146, 60, 0.18)',
                                    }}
                            >
                                <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="animate-float"
                                    style={{ color: isDark ? '#FBBF24' : (isBarbie ? 'var(--theme-primary, #E11D74)' : '#D97706') }}
                                ><line x1="12" y1="2" x2="12" y2="7" /><path d="M12 7l4 4-2 7H10l-2-7 4-4z" /></svg>
                                <div className="flex-1">
                                    <h3 className="text-[16px] font-bold mb-0.5" style={{ color: isDark ? '#FBBF24' : (isBarbie ? 'var(--theme-primary, #E11D74)' : '#78350F') }}>{copy.smartSuggestion}</h3>
                                    <p className="text-[13px] font-medium leading-snug" style={{ color: isDark ? 'rgba(251, 191, 36, 0.7)' : (isBarbie ? 'var(--theme-text-secondary, #A61B64)' : 'rgba(120, 53, 15, 0.8)') }}>{localizedSuggestionMessage}</p>
                                </div>
                                {suggestion.courseId && (
                                    <button
                                        onClick={() => navigate(`/pomodoro?courseId=${suggestion.courseId}`)}
                                        className="text-white rounded-lg px-4 py-2 text-[12px] font-semibold transition-opacity hover:opacity-90 shadow-sm"
                                        style={{ background: isBarbie ? 'linear-gradient(135deg, #E11D74 0%, #EC4899 100%)' : 'rgba(217, 119, 6, 0.9)' }}
                                    >
                                        {copy.focus}
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* Today's Tasks */}
                    {isWidgetEnabled('today-tasks') && (
                        <div className="card">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-[18px] font-bold flex items-center gap-2" style={{ color: 'var(--theme-text, #111827)' }}>
                                    📝 {copy.todayTasks}
                                </h2>
                                <Link to="/tasks" className="text-[13px] font-semibold transition-opacity hover:opacity-80" style={{ color: 'var(--theme-primary, #4F46E5)' }}>{copy.viewAll}</Link>
                            </div>
                            <div className="space-y-2">
                                {todayTasks.length === 0 ? (
                                    <div className={`py-6 px-5 rounded-2xl text-center empty-state-card ${isDark
                                        ? 'border border-dashed'
                                        : 'bg-gray-50/50 border border-gray-100'
                                        }`}>
                                        <p className="text-[14px] font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8' }}>{copy.noTasks}</p>
                                        <button
                                            onClick={() => navigate('/tasks')}
                                            className={`mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${isDark
                                                ? 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/20'
                                                : ''
                                                }`}
                                            style={isDark ? undefined : {
                                                background: 'var(--theme-primary-bg, #EEF2FF)',
                                                color: 'var(--theme-primary, #4F46E5)',
                                                border: '1px solid var(--theme-border-light, #E0E7FF)',
                                            }}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                            {copy.addTask}
                                        </button>
                                    </div>
                                ) : (
                                    todayTasks.slice(0, 5).map((task, i) => {
                                        const course = getCourse(task.courseId);
                                        return (
                                            <motion.div
                                                key={task.id}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 + i * 0.04 }}
                                                className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-colors dark-sub-card ${isDark
                                                    ? 'hover:bg-white/5'
                                                    : 'bg-gray-50/50 border border-gray-100 hover:bg-gray-100/50'
                                                    }`}
                                            >
                                                <button
                                                    onClick={() => toggleTask(task.id)}
                                                    className={`w-[18px] h-[18px] rounded-full border-2 flex-shrink-0 transition-colors ${isDark
                                                        ? 'border-white/20 hover:border-indigo-400'
                                                        : 'border-slate-300 hover:border-blue-500'
                                                        }`}
                                                />
                                                <span className="text-[14px] font-medium flex-1 truncate" style={{ color: 'var(--theme-text, #334155)' }}>{task.title}</span>
                                                {course && (
                                                    <span className="badge text-[11px]" style={{ backgroundColor: course.color + (isDark ? '20' : '15'), color: isDark ? course.color + 'CC' : course.color }}>
                                                        {course.courseName}
                                                    </span>
                                                )}
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Today's Schedule */}
                    {isWidgetEnabled('schedule-preview') && (
                        <div className="card">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-[18px] font-bold flex items-center gap-2" style={{ color: 'var(--theme-text, #111827)' }}>
                                    📅 {copy.todaySchedule}
                                </h2>
                                <Link to="/schedule" className="text-[13px] font-semibold transition-opacity hover:opacity-80" style={{ color: 'var(--theme-primary, #4F46E5)' }}>{copy.viewSchedule}</Link>
                            </div>
                            {todaySchedule.length === 0 ? (
                                <div className={`text-center py-8 rounded-2xl empty-state-card ${isDark
                                    ? 'border border-dashed'
                                    : 'bg-gray-50/50 border border-dashed border-gray-200'
                                    }`}>
                                    <p className="text-[13px] font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8' }}>{copy.noSchedule}</p>
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {todaySchedule.slice(0, 4).map((entry) => {
                                        const course = getCourse(entry.courseId);
                                        return (
                                            <div
                                                key={entry.id}
                                                className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-colors cursor-pointer dark-sub-card ${isDark
                                                    ? 'hover:bg-white/5'
                                                    : 'bg-gray-50/50 border border-gray-100 hover:bg-gray-100/50'
                                                    }`}
                                            >
                                                <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: course?.color || '#94a3b8' }}></div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[13px] font-bold truncate mb-0.5" style={{ color: 'var(--theme-text, #334155)' }}>{course?.courseName || copy.viewCourseFallback}</div>
                                                    <div className="text-[12px] font-medium" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>{formatTime24(entry.startTime)} - {formatTime24(entry.endTime)}</div>
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
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`card shadow-sm p-5 mt-5 ${isDark ? 'border border-indigo-500/10' : 'border'}`}
                            style={isDark
                                ? { background: 'rgba(99, 102, 241, 0.06)' }
                                : {
                                    background: isBarbie
                                        ? 'linear-gradient(135deg, rgba(255, 249, 252, 1) 0%, rgba(253, 230, 241, 0.92) 100%)'
                                        : 'linear-gradient(90deg, rgba(248,250,252,1) 0%, rgba(239,246,255,1) 100%)',
                                    borderColor: isBarbie ? 'rgba(225, 29, 114, 0.1)' : 'rgba(226,232,240,1)',
                                }}
                        >
                            <h3 className="text-[18px] font-bold mb-1" style={{ color: 'var(--theme-text, #111827)' }}>{copy.dailyReflection}</h3>
                            <p className="text-[13px] mb-4" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>{copy.dailyReflectionPrompt}</p>
                            <div className="flex gap-3">
                                {[
                                    { label: copy.productive, emoji: '🙂', value: 'productive' },
                                    { label: copy.average, emoji: '😐', value: 'average' },
                                    { label: copy.lowFocus, emoji: '😴', value: 'low focus' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => handleReflection(opt.value)}
                                        className={`flex-1 py-2 px-3 rounded-xl text-[13px] font-medium transition-colors shadow-sm flex items-center justify-center gap-2 ${isDark
                                            ? 'bg-white/5 hover:bg-white/10 border border-white/6'
                                            : ''
                                            }`}
                                        style={isDark ? { color: 'var(--theme-text, #E2E8F0)' } : {
                                            background: isBarbie ? 'rgba(255, 255, 255, 0.92)' : '#FFFFFF',
                                            color: 'var(--theme-text, #334155)',
                                            border: `1px solid ${isBarbie ? 'rgba(225, 29, 114, 0.12)' : 'rgba(226, 232, 240, 0.8)'}`,
                                        }}
                                    >
                                        <span className="text-lg">{opt.emoji}</span> {opt.label}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Right Column: 1/3 */}
                <div className="space-y-5">
                    {/* Quick Focus */}
                    {isWidgetEnabled('quick-focus') && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.25 }}
                            className={`rounded-2xl p-5 text-white quick-focus-card shadow-lg shadow-black/5`}
                            style={{ background: 'var(--theme-primary, #4F46E5)' }}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div>
                                    <h3 className="font-bold text-[16px]">{copy.quickFocus}</h3>
                                    <p className="text-white/80 text-[12px] font-medium mt-0.5">{copy.quickFocusSubtitle}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/pomodoro')}
                                className="bg-white/20 hover:bg-white/30 text-white text-[13px] font-semibold px-4 py-2.5 rounded-2xl transition-all w-full backdrop-blur-md shadow-sm border border-white/10 flex items-center justify-center gap-2"
                            >
                                <span className="animate-float">⏱️</span> {copy.startSession}
                            </button>
                        </motion.div>
                    )}

                    {/* Global Study Room */}
                    {isWidgetEnabled('global-study-room') && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className={`rounded-2xl p-5 border ${isDark
                                ? 'bg-indigo-900/10 border-indigo-500/15'
                                : 'border'
                                }`}
                            style={{
                                background: (activeThemeKey === 'latte')
                                    ? 'radial-gradient(circle at center, #FFF8F0 0%, #EFE5DD 100%)'
                                    : (isBarbie)
                                        ? 'radial-gradient(circle at center, rgba(255, 247, 251, 1) 0%, rgba(249, 168, 212, 0.24) 100%)'
                                    : (isDark ? 'rgba(99, 102, 241, 0.04)' : undefined)
                            }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[15px] font-bold flex items-center gap-2" style={{ color: 'var(--theme-text, #111827)' }}>
                                    🌍 {copy.globalStudyRoom}
                                </h3>
                                <span className="flex items-center gap-1.5" style={{ color: activeThemeKey === 'nature' ? '#22c55e' : (isDark ? '#818CF8' : 'var(--theme-primary, #4F46E5)') }}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]"></span>
                                    <span className="text-[11px] font-bold uppercase tracking-wider">{copy.live}</span>
                                </span>
                            </div>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="text-[28px] font-extrabold tracking-tight leading-none" style={{ color: 'var(--theme-text, #111827)' }}>
                                        {focusingUsers.length || studyRoomUsers.length}
                                    </div>
                                    <div className="text-[13px] font-medium leading-tight" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>
                                        {roomCountLines[0]}<br />{roomCountLines[1]}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[12px] font-medium"
                                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.62)', color: 'var(--theme-text-muted, #94A3B8)' }}>
                                    <span>{isPublicPresenceEnabled ? copy.publicPresenceOn : copy.publicPresenceOff}</span>
                                    <button
                                        onClick={() => updateUser({ publicProfileEnabled: !isPublicPresenceEnabled })}
                                        className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition-colors"
                                        style={{
                                            color: 'var(--theme-primary, #4F46E5)',
                                            backgroundColor: isDark ? 'rgba(99, 102, 241, 0.14)' : 'rgba(255,255,255,0.88)',
                                            border: `1px solid ${isBarbie ? 'rgba(225, 29, 114, 0.18)' : 'rgba(99,102,241,0.18)'}`,
                                        }}
                                    >
                                        {isPublicPresenceEnabled ? copy.disablePublicPresence : copy.enablePublicPresence}
                                    </button>
                                </div>
                                {displayedStudyRoomUsers.length > 0 ? (
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        {displayedStudyRoomUsers.map((member) => (
                                            <div
                                                key={member.id}
                                                className="h-7 px-2.5 rounded-full bg-white/50 flex items-center justify-center text-[11px] font-semibold shadow-sm border border-black/5 overflow-hidden"
                                                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'white', color: 'var(--theme-text, #111827)' }}
                                            >
                                                {(typeof member.displayName === 'string' && member.displayName.trim()
                                                    ? member.displayName
                                                    : 'Student').split(' ')[0]}
                                            </div>
                                        ))}
                                        {studyRoomUsers.length > displayedStudyRoomUsers.length && (
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'var(--theme-primary-bg, #E2E8F0)', color: isDark ? '#94A3B8' : 'var(--theme-text-secondary, #64748B)' }}>
                                                +{studyRoomUsers.length - displayedStudyRoomUsers.length}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="rounded-xl px-3 py-2 text-[12px] font-medium" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)', color: 'var(--theme-text-muted, #94A3B8)' }}>
                                        {copy.nobodyActive}
                                    </div>
                                )}
                                {roomHeadline && (
                                    <div className="text-[12px] leading-relaxed" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>
                                        {roomHeadline}
                                    </div>
                                )}
                                <button
                                    onClick={() => navigate('/pomodoro?mode=deep')}
                                    className={`mt-2 w-full py-2.5 rounded-xl text-[13px] font-bold transition-colors shadow-sm`}
                                    style={{
                                        color: 'var(--theme-primary, #4F46E5)',
                                        background: 'var(--theme-primary-bg, white)',
                                        border: '1px solid var(--theme-primary, #EEF2FF)'
                                    }}
                                >
                                    {copy.joinStudyRoom}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Weekly Goal — gradient bar matching Quick Focus */}
                    {isWidgetEnabled('weekly-goal') && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.12 }}
                            className="card card-interactive"
                            onClick={() => { setGoalInput(Math.round(weeklyGoal / 60).toString()); setShowGoalModal(true); }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[16px] font-bold flex items-center gap-2" style={{ color: 'var(--theme-text, #111827)' }}>
                                    🎯 {copy.weeklyGoal}
                                </h3>
                                <span
                                    className="text-[12px] px-2.5 py-1 rounded-lg font-bold"
                                    style={{
                                        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : 'var(--theme-primary-bg, #EEF2FF)',
                                        color: 'var(--theme-primary, #6366F1)'
                                    }}
                                >
                                    {Math.round(weeklyProgress)}%
                                </span>
                            </div>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-[24px] font-extrabold leading-none tracking-tight" style={{ color: 'var(--theme-text, #111827)' }}>
                                        {Math.floor(weeklyMinutes / 60)}h {weeklyMinutes % 60}m
                                    </span>
                                    <span className="text-[13px] font-medium" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>/ {Math.floor(weeklyGoal / 60)}h {copy.goalSuffix}</span>
                                </div>
                                <div className="w-full h-3 rounded-full overflow-hidden weekly-goal-bar" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'var(--theme-primary-bg, #EEF2FF)' }}>
                                    <motion.div
                                        className="h-full rounded-full weekly-goal-fill"
                                        style={{ background: isDark ? undefined : `linear-gradient(90deg, var(--theme-primary, #4F46E5) 0%, ${isBarbie ? '#F472B6' : 'var(--theme-primary, #4F46E5)'} 100%)` }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${weeklyProgress}%` }}
                                        transition={{ duration: 1, delay: 0.3 }}
                                    >
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Rewards / Streak */}
                    {isWidgetEnabled('streak-status') && (
                        <div className="card">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-[16px] font-bold flex items-center gap-2" style={{ color: 'var(--theme-text, #111827)' }}>
                                    ✨ {copy.yourSky}
                                </h3>
                                <Link to="/rewards" className="text-[13px] font-semibold transition-opacity hover:opacity-80" style={{ color: 'var(--theme-primary, #4F46E5)' }}>{copy.details}</Link>
                            </div>

                            <YourSkyScene
                                compact
                                sessionsCompleted={stats.totalSessions}
                                streak={user?.streakCount || 0}
                                totalMinutes={stats.totalMinutes}
                                className="mb-4"
                            />

                            {/* Streak Protection */}
                            {user?.streakCount > 0 && !user?.streakProtected && (
                                <button
                                    onClick={handleProtectStreak}
                                    className={`w-full mt-4 py-3 px-4 rounded-xl text-[13px] font-bold flex items-center justify-between transition-all shadow-sm streak-protect-btn ${isDark
                                        ? 'text-orange-300 border'
                                        : ''
                                        }`}
                                    style={isDark ? undefined : {
                                        background: isBarbie ? 'rgba(253, 230, 241, 0.88)' : 'rgba(255, 247, 237, 1)',
                                        border: `1px solid ${isBarbie ? 'rgba(225, 29, 114, 0.14)' : 'rgba(251, 146, 60, 0.18)'}`,
                                        color: isBarbie ? 'var(--theme-primary, #E11D74)' : '#C2410C',
                                    }}
                                >
                                    <span className="flex items-center gap-2"><span className="text-lg">🛡️</span> {copy.protectStreak}</span>
                                    <span
                                        className={`px-2 py-0.5 rounded ${isDark ? 'bg-orange-500/15 text-orange-300' : ''}`}
                                        style={isDark ? undefined : {
                                            background: isBarbie ? 'rgba(225, 29, 114, 0.12)' : 'rgba(254, 215, 170, 0.8)',
                                            color: isBarbie ? 'var(--theme-primary, #E11D74)' : '#9A3412',
                                        }}
                                    >50 {locale === 'tr' ? 'jeton' : 'coins'}</span>
                                </button>
                            )}
                            {user?.streakProtected && (
                                <div className={`w-full mt-4 py-3 px-4 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 shadow-sm ${isDark
                                    ? 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-300'
                                    : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                                    }`}>
                                    <span className="text-lg">✨</span> {copy.streakProtected}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Weekly Goal Modal */}
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

            {/* Widget Customization Modal */}
            <Modal
                isOpen={showWidgetModal}
                onClose={() => setShowWidgetModal(false)}
                title={copy.customizeDashboardModal}
                panelClassName="!max-w-[620px] !rounded-[32px] !border !px-6 !pb-6 !pt-7"
                titleClassName="!text-[20px] !font-bold tracking-tight"
                closeButtonClassName="rounded-full p-2 hover:bg-white/5"
            >
                <div
                    className="space-y-6"
                    style={{
                        color: 'var(--theme-text, #F8FAFC)',
                    }}
                >
                    <p className="text-[15px] leading-7" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>
                        {copy.customizeDashboardDescription}
                    </p>
                    <div className="space-y-3">
                    {(widgets || DEFAULT_WIDGETS).map((widget) => (
                        <label
                            key={widget.id}
                            className="flex items-center gap-4 rounded-2xl px-4 py-4 transition-colors cursor-pointer"
                            style={{
                                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(148, 163, 184, 0.12)',
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={widget.enabled}
                                onChange={() => toggleWidget(widget.id)}
                                className="h-5 w-5 rounded-md accent-indigo-400"
                            />
                            <span className="text-[17px] font-medium" style={{ color: 'var(--theme-text, #F8FAFC)' }}>
                                {copy.widgetNames[widget.id] || widget.name}
                            </span>
                        </label>
                    ))}
                    </div>
                    <button
                        onClick={() => setShowWidgetModal(false)}
                        className="w-full justify-center rounded-[22px] px-6 py-4 text-[17px] font-semibold text-white shadow-lg transition hover:opacity-95"
                        style={{
                            background: 'linear-gradient(135deg, #5B6EE8 0%, #7C63F5 100%)',
                            boxShadow: '0 18px 36px rgba(99, 102, 241, 0.22)',
                        }}
                    >
                        {copy.done}
                    </button>
                </div>
            </Modal>
        </div>
    );
}
