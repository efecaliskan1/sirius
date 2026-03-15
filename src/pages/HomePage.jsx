import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Modal from '../components/UI/Modal';
import { COURSE_COLORS, COURSE_ICONS, DEFAULT_WIDGETS } from '../utils/constants';
import { getGreeting, getToday, formatDate, formatTime, minutesToDisplay } from '../utils/helpers';
import { getMotivationalMessage, getSessionStats, getLevelFromXP, getCompanionStage, getSmartSuggestion } from '../utils/rewardEngine';
import { db } from '../firebase/config';
import { isRecentlyActive, timestampToMillis } from '../utils/social';

export default function HomePage() {
    const user = useAuthStore((s) => s.user);
    const updateUser = useAuthStore((s) => s.updateUser);
    const courses = useAppStore((s) => s.courses);
    const courseTopics = useAppStore((s) => s.courseTopics);
    const tasks = useAppStore((s) => s.tasks);
    const scheduleEntries = useAppStore((s) => s.scheduleEntries);
    const sessions = useAppStore((s) => s.sessions);
    const addCourse = useAppStore((s) => s.addCourse);
    const updateCourse = useAppStore((s) => s.updateCourse);
    const deleteCourse = useAppStore((s) => s.deleteCourse);
    const toggleTask = useAppStore((s) => s.toggleTask);
    const setFocusMode = useAppStore((s) => s.setFocusMode);
    const navigate = useNavigate();

    const [showCourseModal, setShowCourseModal] = useState(false);
    const [showWidgetModal, setShowWidgetModal] = useState(false);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [courseForm, setCourseForm] = useState({ courseName: '', color: COURSE_COLORS[0], icon: '📚' });
    const [goalInput, setGoalInput] = useState('');
    const [studyRoomUsers, setStudyRoomUsers] = useState([]);

    const isDark = (user?.theme || 'calm') === 'dark';

    const today = getToday();
    const todayFormatted = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const userCourses = courses.filter((c) => c.userId === user?.id);
    const userTasks = tasks.filter((t) => t.userId === user?.id);
    const userSessions = sessions.filter((s) => s.userId === user?.id);
    const todayTasks = userTasks.filter((t) => t.dueDate === today && !t.completed);
    const todaySchedule = scheduleEntries
        .filter((e) => e.userId === user?.id && e.date === today)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const todaySessions = userSessions.filter(
        (s) => s.completed && s.createdAt?.startsWith(today)
    );
    const todayFocusMinutes = todaySessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0);

    // Weekly goal calc
    const weekStart = new Date();
    const dow = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (dow === 0 ? 6 : dow - 1));
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weeklyMinutes = userSessions
        .filter((s) => s.completed && s.createdAt && s.createdAt.split('T')[0] >= weekStartStr)
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

    const suggestion = useMemo(() => getSmartSuggestion(userCourses, courseTopics, userSessions, today), [userCourses, courseTopics, userSessions, today]);

    useEffect(() => {
        const activeUsersQuery = query(
            collection(db, 'publicProfiles'),
            orderBy('lastSeenAt', 'desc'),
            limit(24)
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

    const handleProtectStreak = () => {
        if (user?.coinBalance >= 50) {
            updateUser({ coinBalance: user.coinBalance - 50, streakProtected: true });
        } else {
            alert("Not enough coins to protect your streak! Keep studying to earn more.");
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

    const widgets = user?.dashboardWidgets || DEFAULT_WIDGETS;
    const isWidgetEnabled = (id) => {
        const w = widgets.find((w) => w.id === id);
        return w ? w.enabled : true;
    };

    const getCourse = (courseId) => userCourses.find((c) => c.id === courseId);
    const focusingUsers = studyRoomUsers.filter((member) => member.focusingNow);
    const displayedStudyRoomUsers = focusingUsers.length > 0 ? focusingUsers.slice(0, 6) : studyRoomUsers.slice(0, 6);

    const openAddCourseModal = () => {
        setEditingCourse(null);
        setCourseForm({ courseName: '', color: COURSE_COLORS[Math.floor(Math.random() * COURSE_COLORS.length)], icon: COURSE_ICONS[Math.floor(Math.random() * COURSE_ICONS.length)] });
        setShowCourseModal(true);
    };

    const openEditCourseModal = (course) => {
        setEditingCourse(course);
        setCourseForm({ courseName: course.courseName, color: course.color, icon: course.icon || '📚' });
        setShowCourseModal(true);
    };

    const handleCourseSubmit = (e) => {
        e.preventDefault();
        if (!courseForm.courseName.trim()) return;
        if (editingCourse) {
            updateCourse(editingCourse.id, courseForm);
        } else {
            addCourse({ ...courseForm, userId: user.id });
        }
        setShowCourseModal(false);
    };

    const handleDeleteCourse = () => {
        if (editingCourse) {
            deleteCourse(editingCourse.id);
            setShowCourseModal(false);
        }
    };

    const handleSaveGoal = () => {
        const mins = parseInt(goalInput) * 60;
        if (mins > 0) {
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

    // Overview card data
    const overviewCards = [
        { label: 'Sessions Today', value: todaySessions.length, icon: '🍅', iconColor: '#F43F5E' },
        { label: "Today's Tasks", value: todayTasks.length, icon: '✓', iconColor: '#10B981' },
        { label: 'Focus Time', value: minutesToDisplay(todayFocusMinutes), icon: '⏱', iconColor: '#6366F1' },
        { label: 'Streak', value: `${user?.streakCount || 0}d`, icon: '🔥', iconColor: '#F59E0B' },
    ];

    return (
        <div className="max-w-[960px]">
            {/* Greeting + Motivation */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <div className="flex items-start justify-between">
                    <div>
                        <h1
                            className="text-[32px] tracking-tight"
                            style={{ color: 'var(--theme-text, #111827)' }}
                        >
                            {getGreeting()},{' '}
                            <span className="font-extrabold">
                                {user?.name?.replace(/[^\s]+@[^\s]+\.[^\s]+/g, '').trim().split(' ')[0] || 'Student'}
                            </span>
                        </h1>
                        <p
                            className="font-medium text-[15px] mt-1"
                            style={{ color: 'var(--theme-text-muted, #94A3B8)' }}
                        >
                            {todayFormatted}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowWidgetModal(true)}
                        className="btn-ghost text-xs"
                        style={{ color: 'var(--theme-text-muted, #94A3B8)' }}
                        title="Customize dashboard"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                    </button>
                </div>

                {/* Motivation Card */}
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`mt-4 px-5 py-4 rounded-2xl motivation-card-dark ${isDark
                        ? 'border border-indigo-500/15'
                        : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-indigo-100/50'
                        }`}
                    style={isDark ? { background: 'rgba(99, 102, 241, 0.08)' } : {}}
                >
                    <div className="flex items-center gap-3">
                        <div className="text-2xl animate-float">{companion.emoji}</div>
                        <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--theme-text, #334155)' }}>{motivationalMessage}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>{companion.name} · {companion.description}</p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Overview Cards */}
            <div className="grid grid-cols-4 gap-3 mb-8">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: 2/3 */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Header Top Elements */}
                    <div className={`grid ${suggestion && suggestion.type !== 'new' ? 'grid-cols-2' : 'grid-cols-1'} gap-5`}>
                        <div className="card relative overflow-hidden flex flex-col justify-center h-full">
                            <div className={`absolute top-0 left-0 w-2 h-full rounded-l-2xl ${isDark ? 'bg-gradient-to-b from-indigo-500/60 to-purple-500/60' : 'bg-gradient-to-b from-indigo-300 to-purple-300'}`}></div>
                            <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 pl-3" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>Quote of the Day</h3>
                            <p className="italic font-medium leading-relaxed pl-3" style={{ color: 'var(--theme-text-secondary, #64748B)' }}>"The secret of getting ahead is getting started." — Mark Twain</p>
                        </div>

                        {/* Smart Suggestion */}
                        {suggestion && suggestion.type !== 'new' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, rotate: -2 }}
                                animate={{ opacity: 1, scale: 1, rotate: 1 }}
                                className={`card flex gap-4 items-center p-5 transform transition-transform hover:rotate-0 h-full ${isDark
                                    ? 'border border-amber-500/15'
                                    : 'bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100'
                                    }`}
                                style={isDark ? { background: 'rgba(245, 158, 11, 0.06)' } : {}}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`animate-float ${isDark ? 'text-amber-400' : 'text-amber-600'}`}><line x1="12" y1="2" x2="12" y2="7" /><path d="M12 7l4 4-2 7H10l-2-7 4-4z" /></svg>
                                <div className="flex-1">
                                    <h3 className="text-[16px] font-bold mb-0.5" style={{ color: isDark ? '#FBBF24' : '#78350F' }}>Smart Suggestion</h3>
                                    <p className="text-[13px] font-medium leading-snug" style={{ color: isDark ? 'rgba(251, 191, 36, 0.7)' : 'rgba(120, 53, 15, 0.8)' }}>{suggestion.message}</p>
                                </div>
                                {suggestion.courseId && (
                                    <button onClick={() => navigate(`/pomodoro?courseId=${suggestion.courseId}`)} className="bg-amber-600/90 text-white hover:bg-amber-700 rounded-lg px-4 py-2 text-[12px] font-semibold transition-colors shadow-sm">
                                        Focus
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
                                    📝 Today's Tasks
                                </h2>
                                <Link to="/tasks" className="text-[13px] text-blue-600 hover:text-blue-700 font-semibold transition-colors">View all →</Link>
                            </div>
                            <div className="space-y-2">
                                {todayTasks.length === 0 ? (
                                    <div className={`py-6 px-5 rounded-2xl text-center empty-state-card ${isDark
                                        ? 'border border-dashed'
                                        : 'bg-gray-50/50 border border-gray-100'
                                        }`}>
                                        <p className="text-[14px] font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8' }}>No tasks scheduled for today.</p>
                                        <button
                                            onClick={() => navigate('/tasks')}
                                            className={`mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${isDark
                                                ? 'bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/20'
                                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100'
                                                }`}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                            Add Task
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
                                    📅 Today's Schedule
                                </h2>
                                <Link to="/schedule" className="text-[13px] text-blue-600 hover:text-blue-700 font-semibold transition-colors">View schedule →</Link>
                            </div>
                            {todaySchedule.length === 0 ? (
                                <div className={`text-center py-8 rounded-2xl empty-state-card ${isDark
                                    ? 'border border-dashed'
                                    : 'bg-gray-50/50 border border-dashed border-gray-200'
                                    }`}>
                                    <p className="text-[13px] font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8' }}>No classes or sessions scheduled for today</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
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
                                                    <div className="text-[13px] font-bold truncate mb-0.5" style={{ color: 'var(--theme-text, #334155)' }}>{course?.courseName || 'Course'}</div>
                                                    <div className="text-[12px] font-medium" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>{formatTime(entry.startTime)} - {formatTime(entry.endTime)}</div>
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
                            className={`card shadow-sm p-5 mt-5 ${isDark
                                ? 'border border-indigo-500/10'
                                : 'border border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50'
                                }`}
                            style={isDark ? { background: 'rgba(99, 102, 241, 0.06)' } : {}}
                        >
                            <h3 className="text-[18px] font-bold mb-1" style={{ color: 'var(--theme-text, #111827)' }}>Daily Reflection</h3>
                            <p className="text-[13px] mb-4" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>How productive was your study session today?</p>
                            <div className="flex gap-3">
                                {[
                                    { label: 'Productive', emoji: '🙂', value: 'productive' },
                                    { label: 'Average', emoji: '😐', value: 'average' },
                                    { label: 'Low Focus', emoji: '😴', value: 'low focus' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => handleReflection(opt.value)}
                                        className={`flex-1 py-2 px-3 rounded-xl text-[13px] font-medium transition-colors shadow-sm flex items-center justify-center gap-2 ${isDark
                                            ? 'bg-white/5 hover:bg-white/10 border border-white/6'
                                            : 'bg-white hover:bg-purple-50 text-slate-700 border border-slate-100/50 hover:border-purple-200'
                                            }`}
                                        style={isDark ? { color: 'var(--theme-text, #E2E8F0)' } : {}}
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
                                    <h3 className="font-bold text-[16px]">Quick Focus</h3>
                                    <p className="text-white/80 text-[12px] font-medium mt-0.5">Start a 25m session</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setFocusMode(true, { title: 'Deep Focus Session' })}
                                className="bg-white/20 hover:bg-white/30 text-white text-[13px] font-semibold px-4 py-2.5 rounded-2xl transition-all w-full backdrop-blur-md shadow-sm border border-white/10 flex items-center justify-center gap-2"
                            >
                                <span className="animate-float">⏱️</span> Start Session →
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
                                : 'bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100'
                                }`}
                            style={{
                                background: (user?.theme === 'latte')
                                    ? 'radial-gradient(circle at center, #FFF8F0 0%, #EFE5DD 100%)'
                                    : (isDark ? 'rgba(99, 102, 241, 0.04)' : undefined)
                            }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[15px] font-bold flex items-center gap-2" style={{ color: 'var(--theme-text, #111827)' }}>
                                    🌍 Global Study Room
                                </h3>
                                <span className="flex items-center gap-1.5" style={{ color: user?.theme === 'nature' ? '#22c55e' : (isDark ? '#818CF8' : 'var(--theme-primary, #4F46E5)') }}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shadow-[0_0_8px_currentColor]"></span>
                                    <span className="text-[11px] font-bold uppercase tracking-wider">Live</span>
                                </span>
                            </div>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="text-[28px] font-extrabold tracking-tight leading-none" style={{ color: 'var(--theme-text, #111827)' }}>
                                        {focusingUsers.length || studyRoomUsers.length}
                                    </div>
                                    <div className="text-[13px] font-medium leading-tight" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>
                                        {focusingUsers.length > 0 ? (
                                            <>members<br />focusing now</>
                                        ) : (
                                            <>active members<br />online now</>
                                        )}
                                    </div>
                                </div>
                                {displayedStudyRoomUsers.length > 0 ? (
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        {displayedStudyRoomUsers.map((member) => (
                                            <div
                                                key={member.id}
                                                className="h-7 px-2.5 rounded-full bg-white/50 flex items-center justify-center text-[11px] font-semibold shadow-sm border border-black/5 overflow-hidden"
                                                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'white', color: 'var(--theme-text, #111827)' }}
                                            >
                                                {(member.displayName || 'Student').split(' ')[0]}
                                            </div>
                                        ))}
                                        {studyRoomUsers.length > displayedStudyRoomUsers.length && (
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', color: isDark ? '#94A3B8' : '#64748B' }}>
                                                +{studyRoomUsers.length - displayedStudyRoomUsers.length}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="rounded-xl px-3 py-2 text-[12px] font-medium" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)', color: 'var(--theme-text-muted, #94A3B8)' }}>
                                        Nobody is active yet. The room fills automatically as signed-in members use Sirius.
                                    </div>
                                )}
                                {displayedStudyRoomUsers.length > 0 && (
                                    <div className="text-[12px] leading-relaxed" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>
                                        {displayedStudyRoomUsers[0].displayName || 'A member'}
                                        {displayedStudyRoomUsers[0].focusingNow ? ` is in ${displayedStudyRoomUsers[0].currentSessionTitle || 'a focus session'}.` : ' is online right now.'}
                                    </div>
                                )}
                                <button
                                    onClick={() => setFocusMode(true, { title: 'Global Study Session' })}
                                    className={`mt-2 w-full py-2.5 rounded-xl text-[13px] font-bold transition-colors shadow-sm`}
                                    style={{
                                        color: 'var(--theme-primary, #4F46E5)',
                                        background: 'var(--theme-primary-bg, white)',
                                        border: '1px solid var(--theme-primary, #EEF2FF)'
                                    }}
                                >
                                    Join Study Room
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
                                    🎯 Weekly Goal
                                </h3>
                                <span
                                    className="text-[12px] px-2.5 py-1 rounded-lg font-bold"
                                    style={{
                                        backgroundColor: isDark ? 'rgba(99, 102, 241, 0.12)' : '#EEF2FF',
                                        color: '#6366F1'
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
                                    <span className="text-[13px] font-medium" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>/ {Math.floor(weeklyGoal / 60)}h goal</span>
                                </div>
                                <div className={`w-full h-3 rounded-full overflow-hidden weekly-goal-bar ${isDark ? '' : 'bg-slate-100'}`}>
                                    <motion.div
                                        className={`h-full rounded-full weekly-goal-fill ${isDark
                                            ? ''
                                            : 'bg-gradient-to-r from-indigo-400 to-blue-500'
                                            }`}
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
                                    ✨ Rewards Status
                                </h3>
                                <Link to="/rewards" className="text-[13px] text-blue-600 hover:text-blue-700 font-semibold transition-colors">Details →</Link>
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className={`flex items-center justify-between p-4 rounded-2xl dark-sub-card ${isDark
                                    ? ''
                                    : 'bg-slate-50 border border-slate-100'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isDark ? 'bg-amber-500/10' : 'bg-amber-50 text-amber-500 shadow-inner'}`}>
                                            🪙
                                        </div>
                                        <div>
                                            <div className="text-[12px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>Coins</div>
                                            <div className="text-[18px] font-bold leading-none" style={{ color: 'var(--theme-text, #111827)' }}>{user?.coinBalance || 0}</div>
                                        </div>
                                    </div>
                                    <div className={`w-px h-10 mx-2 ${isDark ? 'bg-white/6' : 'bg-slate-200'}`}></div>
                                    <div className="flex items-center gap-3 pr-2">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isDark ? 'bg-orange-500/10' : 'bg-orange-50 text-orange-500 shadow-inner'}`}>
                                            🔥
                                        </div>
                                        <div>
                                            <div className="text-[12px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>Streak</div>
                                            <div className="text-[18px] font-bold leading-none" style={{ color: 'var(--theme-text, #111827)' }}>{user?.streakCount || 0}d</div>
                                        </div>
                                    </div>
                                </div>

                                <div className={`flex items-center justify-between p-3 px-4 rounded-2xl reward-level-card ${isDark
                                    ? ''
                                    : 'bg-gradient-to-r from-green-50 to-emerald-50 border border-emerald-100/50'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl drop-shadow-sm">{companion.emoji}</div>
                                        <div>
                                            <div className="text-[13px] font-bold leading-tight" style={{ color: 'var(--theme-text, #334155)' }}>Level {levelInfo.level}</div>
                                            <div className="text-[12px] font-medium mt-0.5" style={{ color: isDark ? '#818CF8' : '#047857' }}>{companion.name}</div>
                                        </div>
                                    </div>
                                    <div className="text-right w-20">
                                        <div className="text-[12px] font-bold text-blue-600 mb-1.5">{Math.round(levelInfo.progress)}%</div>
                                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/6' : 'bg-blue-100 shadow-inner'}`}>
                                            <motion.div className="bg-blue-500 h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${levelInfo.progress}%` }}></motion.div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Streak Protection */}
                            {user?.streakCount > 0 && !user?.streakProtected && (
                                <button
                                    onClick={handleProtectStreak}
                                    className={`w-full mt-4 py-3 px-4 rounded-xl text-[13px] font-bold flex items-center justify-between transition-all shadow-sm streak-protect-btn ${isDark
                                        ? 'text-orange-300 border'
                                        : 'bg-orange-50 border border-orange-100 hover:border-orange-200 text-orange-700 hover:bg-orange-100/50'
                                        }`}
                                >
                                    <span className="flex items-center gap-2"><span className="text-lg">🛡️</span> Protect Streak</span>
                                    <span className={`px-2 py-0.5 rounded ${isDark ? 'bg-orange-500/15 text-orange-300' : 'bg-orange-200/60 text-orange-800'}`}>50 coins</span>
                                </button>
                            )}
                            {user?.streakProtected && (
                                <div className={`w-full mt-4 py-3 px-4 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 shadow-sm ${isDark
                                    ? 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-300'
                                    : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                                    }`}>
                                    <span className="text-lg">✨</span> Your streak is protected today
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Courses */}
            <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text-secondary, #475569)' }}>My Courses</h2>
                    <button onClick={openAddCourseModal} className="btn-ghost text-blue-500 !text-xs">
                        + Add Course
                    </button>
                </div>
                <div className="grid grid-cols-4 gap-3">
                    {userCourses.length === 0 ? (
                        <div className="col-span-4 card text-center py-10">
                            <div className="text-4xl mb-2">📚</div>
                            <p className="text-sm" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>Add your first course to get started</p>
                            <button onClick={openAddCourseModal} className="btn-primary mt-3 mx-auto">+ Add Course</button>
                        </div>
                    ) : (
                        userCourses.map((course, i) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.04 }}
                                className="card card-interactive flex items-center gap-3 group relative"
                                onClick={() => navigate(`/course/${course.id}`)}
                            >
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ backgroundColor: course.color + (isDark ? '20' : '18') }}>
                                    {course.icon || '📚'}
                                </div>
                                <span className="text-sm font-medium truncate flex-1" style={{ color: 'var(--theme-text, #334155)' }}>{course.courseName}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); openEditCourseModal(course); }}
                                    className="opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-all p-1"
                                    style={{ color: 'var(--theme-text-muted, #94A3B8)' }}
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </button>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Course Modal */}
            <Modal isOpen={showCourseModal} onClose={() => setShowCourseModal(false)} title={editingCourse ? 'Edit Course' : 'New Course'}>
                <form onSubmit={handleCourseSubmit} className="space-y-4">
                    <div>
                        <label className="label">Course Name</label>
                        <input
                            className="input"
                            value={courseForm.courseName}
                            onChange={(e) => setCourseForm({ ...courseForm, courseName: e.target.value })}
                            placeholder="e.g. Mathematics 101"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="label">Icon</label>
                        <div className="flex flex-wrap gap-1.5">
                            {COURSE_ICONS.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setCourseForm({ ...courseForm, icon })}
                                    className={`w-9 h-9 rounded-xl text-base flex items-center justify-center transition-all ${courseForm.icon === icon
                                        ? (isDark ? 'bg-indigo-500/15 ring-2 ring-indigo-400 scale-110' : 'bg-blue-50 ring-2 ring-blue-300 scale-110')
                                        : (isDark ? 'bg-white/5 hover:bg-white/10 hover:scale-105' : 'bg-gray-50 hover:bg-gray-100 hover:scale-105')
                                        }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="label">Color</label>
                        <div className="flex flex-wrap gap-2.5">
                            {COURSE_COLORS.map((color) => (
                                <button
                                    key={color.id}
                                    type="button"
                                    onClick={() => setCourseForm({ ...courseForm, color: color.color })}
                                    className={`w-8 h-8 rounded-xl transition-all ${courseForm.color === color.color ? 'ring-2 ring-offset-2 ring-blue-400 scale-110' : 'hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: color.color }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        {editingCourse && (
                            <button type="button" onClick={handleDeleteCourse} className="btn-ghost text-red-500 hover:bg-red-50">Delete</button>
                        )}
                        <div className="flex-1"></div>
                        <button type="button" onClick={() => setShowCourseModal(false)} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary">{editingCourse ? 'Save' : 'Add Course'}</button>
                    </div>
                </form>
            </Modal>

            {/* Weekly Goal Modal */}
            <Modal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)} title="Weekly Study Goal">
                <div className="space-y-4">
                    <div>
                        <label className="label">Hours per week</label>
                        <input
                            type="number"
                            className="input"
                            value={goalInput}
                            onChange={(e) => setGoalInput(e.target.value)}
                            placeholder="15"
                            min="1"
                            max="100"
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setShowGoalModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                        <button onClick={handleSaveGoal} className="btn-primary flex-1 justify-center">Save Goal</button>
                    </div>
                </div>
            </Modal>

            {/* Widget Customization Modal */}
            <Modal isOpen={showWidgetModal} onClose={() => setShowWidgetModal(false)} title="Customize Dashboard">
                <p className="text-sm mb-4" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>Choose which widgets appear on your home page.</p>
                <div className="space-y-2">
                    {(widgets || DEFAULT_WIDGETS).map((widget) => (
                        <label
                            key={widget.id}
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                        >
                            <input
                                type="checkbox"
                                checked={widget.enabled}
                                onChange={() => toggleWidget(widget.id)}
                                className="w-4 h-4 rounded accent-blue-500"
                            />
                            <span className="text-sm" style={{ color: 'var(--theme-text, #334155)' }}>{widget.name}</span>
                        </label>
                    ))}
                </div>
                <button onClick={() => setShowWidgetModal(false)} className="btn-primary w-full justify-center mt-4">Done</button>
            </Modal>
        </div>
    );
}
