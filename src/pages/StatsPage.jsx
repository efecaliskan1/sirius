import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import { getSessionStats, getWeeklyStats, getHeatmapData, getWeeklyTrend } from '../utils/rewardEngine';
import { formatDateTimeInTurkey, formatDateWithOptions, minutesToDisplay } from '../utils/helpers';
import { useLocale } from '../utils/i18n';

const STATS_COPY = {
    en: {
        title: 'Statistics',
        subtitle: 'Track your study progress',
        statLabels: {
            thisWeek: 'This Week',
            averageSession: 'Average Session',
            totalFocus: 'Total Focus',
            totalSessions: 'Total Sessions',
            bestDay: 'Best Day',
            currentStreak: 'Current Streak',
        },
        studyActivity: 'Study Activity',
        time: 'Time',
        sessions: 'Sessions',
        main: 'Main',
        less: 'Less',
        more: 'More',
        weekly: 'This Week',
        weeklyEmpty: 'Complete sessions to see data',
        weeklyTrend: 'Weekly Trend',
        weeklyTrendEmpty: 'Study over multiple weeks to see trends',
        focusMinutes: 'Focus',
        studyTime: 'Study Time',
        focusByCourse: 'Focus by Course',
        mostStudied: 'Most Studied',
        total: 'total',
        minuteUnit: 'min',
        unknownCourse: 'Unknown course',
        timeline: 'Study Timeline',
        focusSession: 'Focus Session',
        noActivityYet: 'No activity yet. Complete a session to see your timeline.',
    },
    tr: {
        title: 'İstatistikler',
        subtitle: 'Çalışma ilerlemeni takip et',
        statLabels: {
            thisWeek: 'Bu hafta',
            averageSession: 'Ortalama oturum',
            totalFocus: 'Toplam odak',
            totalSessions: 'Toplam oturum',
            bestDay: 'En iyi gün',
            currentStreak: 'Güncel seri',
        },
        studyActivity: 'Çalışma Etkinliği',
        time: 'Süre',
        sessions: 'Oturum',
        main: 'Ana ders',
        less: 'Az',
        more: 'Çok',
        weekly: 'Bu Hafta',
        weeklyEmpty: 'Verileri görmek için birkaç oturum tamamla',
        weeklyTrend: 'Haftalık Trend',
        weeklyTrendEmpty: 'Trendi görmek için birkaç hafta düzenli çalış',
        focusMinutes: 'Odak',
        studyTime: 'Çalışma süresi',
        focusByCourse: 'Derslere Göre Odak',
        mostStudied: 'En çok çalışılan',
        total: 'toplam',
        minuteUnit: 'dk',
        unknownCourse: 'Bilinmeyen ders',
        timeline: 'Çalışma Zaman Çizelgesi',
        focusSession: 'Odak Oturumu',
        noActivityYet: 'Henüz etkinlik yok. Zaman çizelgesini görmek için bir oturum tamamla.',
    },
};

export default function StatsPage() {
    const user = useAuthStore((s) => s.user);
    const courses = useAppStore((s) => s.courses);
    const sessions = useAppStore((s) => s.sessions);
    const locale = useLocale();
    const copy = STATS_COPY[locale] || STATS_COPY.en;
    const themeKey = user?.theme || 'calm';
    const isDark = themeKey === 'dark';
    const isBarbie = themeKey === 'barbie';
    const heatmapColors = isDark
        ? ['rgba(255,255,255,0.05)', 'rgba(129,140,248,0.25)', '#6366f1', '#60a5fa', '#c084fc']
        : isBarbie
            ? ['#fff1f7', '#fbcfe8', '#f9a8d4', '#ec4899', '#be185d']
            : ['#f1f5f9', '#c7d2fe', '#818cf8', '#6366f1', '#4338ca'];
    const chartGridColor = isDark ? 'rgba(148,163,184,0.12)' : isBarbie ? 'rgba(225,29,114,0.12)' : '#f1f5f9';
    const chartTickColor = isDark ? 'rgba(226,232,240,0.6)' : isBarbie ? '#9d174d' : '#94a3b8';
    const tooltipStyle = {
        backgroundColor: isDark ? 'rgba(15,23,42,0.96)' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : isBarbie ? 'rgba(225,29,114,0.12)' : '#e2e8f0'}`,
        color: isDark ? '#f8fafc' : '#0f172a',
        borderRadius: '14px',
        fontSize: '12px',
        boxShadow: isDark ? '0 14px 34px rgba(2,6,23,0.44)' : '0 4px 12px rgba(0,0,0,0.06)',
    };
    const safeSessions = Array.isArray(sessions) ? sessions : [];
    const safeCourses = Array.isArray(courses) ? courses : [];
    const userSessions = safeSessions.filter((s) => s?.userId === user?.id);
    const userCourses = safeCourses.filter((c) => c?.userId === user?.id);
    const stats = getSessionStats(userSessions, userCourses);
    const weeklyStats = getWeeklyStats(userSessions);
    const heatmapData = useMemo(() => getHeatmapData(userSessions, 12), [userSessions]);
    const weeklyTrend = useMemo(() => getWeeklyTrend(userSessions, 8), [userSessions]);
    const weeklyTotal = weeklyStats.reduce((sum, d) => sum + d.minutes, 0);
    const mostStudiedCourseInitial = typeof stats.mostStudiedCourse?.courseName === 'string' && stats.mostStudiedCourse.courseName.trim()
        ? stats.mostStudiedCourse.courseName.charAt(0)
        : copy.unknownCourse.charAt(0);

    const avgSessionLength = stats.totalSessions > 0 ? Math.round(stats.totalMinutes / stats.totalSessions) : 0;
    const bestDay = heatmapData.reduce((max, d) => d.minutes > max.minutes ? d : max, heatmapData[0] || { date: '-', minutes: 0 });

    const timelineSessions = useMemo(() => {
        return [...userSessions]
            .filter((s) => s.completed)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 15);
    }, [userSessions]);

    const statCards = [
        { label: copy.statLabels.thisWeek, value: minutesToDisplay(weeklyTotal), icon: '📅', accent: '#4F6EF7' },
        { label: copy.statLabels.averageSession, value: `${avgSessionLength}m`, icon: '⏱️', accent: '#8B5CF6' },
        { label: copy.statLabels.totalFocus, value: minutesToDisplay(stats.totalMinutes), icon: '🧠', accent: '#2563EB' },
        { label: copy.statLabels.totalSessions, value: stats.totalSessions, icon: '🍅', accent: '#F97316' },
        { label: copy.statLabels.bestDay, value: bestDay.minutes > 0 ? formatDateWithOptions(bestDay.date, { weekday: 'short' }, locale) : '-', icon: '🌟', accent: '#F59E0B' },
        { label: copy.statLabels.currentStreak, value: `${user?.streakCount || 0}d`, icon: '🔥', accent: '#EF4444' },
    ];
    const statCardBackground = isDark
        ? 'linear-gradient(180deg, rgba(21,30,49,0.98), rgba(10,17,31,0.98))'
        : isBarbie
            ? 'linear-gradient(180deg, #fff8fc 0%, #fff1f7 100%)'
            : 'var(--theme-surface-card, #ffffff)';
    const statCardBorder = isDark
        ? 'rgba(99,102,241,0.16)'
        : isBarbie
            ? 'rgba(225,29,114,0.14)'
            : 'var(--theme-border-light, #eef2ff)';
    const statCardShadow = isDark
        ? '0 18px 32px rgba(2,6,23,0.26)'
        : isBarbie
            ? '0 18px 32px rgba(225,29,114,0.12)'
            : '0 12px 24px rgba(79,110,247,0.08)';
    const timelineCardBackground = isDark
        ? 'linear-gradient(180deg, rgba(18,28,46,0.98), rgba(9,15,29,0.98))'
        : 'var(--theme-surface-card, #ffffff)';
    const timelineCardBorder = isDark
        ? 'rgba(99,102,241,0.22)'
        : 'var(--theme-border-light, #eef2ff)';
    const timelineNoteBackground = isDark
        ? 'rgba(30,41,59,0.46)'
        : 'var(--theme-surface, #f8fafc)';
    const timelineNoteBorder = isDark
        ? 'rgba(99,102,241,0.14)'
        : 'var(--theme-border-light, #eef2ff)';
    const elevatedDarkCardStyle = isDark
        ? {
            background: 'linear-gradient(180deg, rgba(18,28,46,0.98), rgba(9,15,29,0.98))',
            borderColor: 'rgba(99,102,241,0.16)',
            boxShadow: '0 18px 36px rgba(2,6,23,0.30)',
        }
        : undefined;

    // Group heatmap into weeks
    const heatmapWeeks = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
        heatmapWeeks.push(heatmapData.slice(i, i + 7));
    }
    const lastWeekIndex = heatmapWeeks.length - 1;

    // Course focus time as bar list (not pie chart)
    const courseData = Object.entries(stats.courseFocusTime)
        .map(([courseId, minutes]) => {
            const course = userCourses.find((c) => c.id === courseId);
            return { name: course?.courseName || copy.unknownCourse, minutes, color: course?.color || '#94a3b8', icon: course?.icon || '📚' };
        })
        .sort((a, b) => b.minutes - a.minutes);

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-text, #1e293b)' }}>{copy.title}</h1>
                <p className="text-sm mt-0.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{copy.subtitle}</p>
            </div>

            {/* Summary Cards */}
            <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-3">
                {statCards.map((card, i) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="rounded-2xl border p-4"
                        style={{
                            background: statCardBackground,
                            borderColor: statCardBorder,
                            boxShadow: statCardShadow,
                        }}
                    >
                        <div
                            className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl text-lg"
                            style={{
                                backgroundColor: `${card.accent}${isDark ? '24' : '18'}`,
                                boxShadow: `0 10px 20px ${card.accent}${isDark ? '26' : '12'}`,
                            }}
                        >
                            {card.icon}
                        </div>
                        <div className="text-xl font-bold" style={{ color: 'var(--theme-text, #1e293b)' }}>{card.value}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{card.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Study Heatmap */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="card mb-6 relative overflow-visible"
            >
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--theme-text, #1e293b)' }}>{copy.studyActivity}</h3>
                <div className="relative overflow-x-auto overflow-y-visible pt-16 pb-10">
                    <div className="flex gap-[3px] min-w-fit">
                        {heatmapWeeks.map((week, wi) => (
                            <div key={wi} className="flex flex-col gap-[3px] relative">
                                {week.map((day, di) => {
                                    const shouldOpenBelow = di < 3;
                                    const alignLeft = wi < 2;
                                    const alignRight = wi > lastWeekIndex - 2;

                                    return (
                                    <div
                                        key={day.date}
                                        className="heatmap-cell relative group z-0 hover:z-40"
                                        style={{ backgroundColor: heatmapColors[day.level] }}
                                    >
                                        <div className={`absolute z-50 w-max max-w-[220px] rounded-lg px-3 py-2 text-[11px] opacity-0 invisible shadow-xl transition-all group-hover:visible group-hover:opacity-100 pointer-events-none ${
                                            shouldOpenBelow ? 'top-full mt-2' : 'bottom-full mb-2'
                                        } ${
                                            alignLeft ? 'left-0 translate-x-0' : alignRight ? 'right-0 translate-x-0' : 'left-1/2 -translate-x-1/2'
                                        }`} style={{ backgroundColor: isDark ? '#0f172a' : '#1e293b', color: '#ffffff' }}>
                                            <div className="mb-1 border-b pb-1 font-semibold" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#334155' }}>{day.date}</div>
                                            <div className="flex justify-between gap-4 mb-0.5">
                                                <span className="text-slate-300">{copy.time}:</span>
                                                <span className="font-medium">{minutesToDisplay(day.minutes)}</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-slate-300">{copy.sessions}:</span>
                                                <span className="font-medium">{day.sessionsCount || 0}</span>
                                            </div>
                                            {day.mainCourseId && (
                                                <div className="mt-1 pt-1 border-t border-slate-700 font-medium" style={{ color: userCourses.find(c => c.id === day.mainCourseId)?.color || '#94a3b8' }}>
                                                    {copy.main}: {userCourses.find(c => c.id === day.mainCourseId)?.courseName}
                                                </div>
                                            )}
                                            <div className={`absolute border-[5px] border-transparent ${
                                                shouldOpenBelow ? 'bottom-full border-b-slate-800' : 'top-full border-t-slate-800'
                                            } ${
                                                alignLeft ? 'left-3' : alignRight ? 'right-3' : 'left-1/2 -translate-x-1/2'
                                            }`}></div>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-1.5">
                        <span className="text-[10px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{copy.less}</span>
                        {heatmapColors.map((color, i) => (
                            <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                        ))}
                        <span className="text-[10px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{copy.more}</span>
                    </div>
                </div>
            </motion.div>

            <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
                {/* Weekly Chart */}
                <div className="card" style={elevatedDarkCardStyle}>
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--theme-text, #1e293b)' }}>{copy.weekly}</h3>
                    {weeklyTotal > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={weeklyStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                                <XAxis dataKey="day" tick={{ fontSize: 11, fill: chartTickColor }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: chartTickColor }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    formatter={(value) => [`${value} ${copy.minuteUnit}`, copy.focusMinutes]}
                                />
                                <Bar dataKey="minutes" fill="#4F6EF7" radius={[6, 6, 0, 0]} maxBarSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-[200px] items-center justify-center text-xs" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                            {copy.weeklyEmpty}
                        </div>
                    )}
                </div>

                {/* Weekly Trend */}
                <div className="card" style={elevatedDarkCardStyle}>
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--theme-text, #1e293b)' }}>{copy.weeklyTrend}</h3>
                    {weeklyTrend.some((w) => w.minutes > 0) ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={weeklyTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                                <XAxis dataKey="week" tick={{ fontSize: 11, fill: chartTickColor }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: chartTickColor }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    formatter={(value) => [`${value} ${copy.minuteUnit}`, copy.studyTime]}
                                />
                                <Line type="monotone" dataKey="minutes" stroke="#7C6CF3" strokeWidth={2.5} dot={{ fill: '#7C6CF3', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-[200px] items-center justify-center text-xs" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>
                            {copy.weeklyTrendEmpty}
                        </div>
                    )}
                </div>
            </div>

            {/* Course Focus List (replaces pie chart) */}
            {courseData.length > 0 && (
                <div className="card" style={elevatedDarkCardStyle}>
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--theme-text, #1e293b)' }}>{copy.focusByCourse}</h3>
                    <div className="space-y-3">
                        {courseData.map((item, i) => {
                            const maxMinutes = courseData[0]?.minutes || 1;
                            const barWidth = Math.max(8, (item.minutes / maxMinutes) * 100);
                            return (
                                <motion.div
                                    key={item.name}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + i * 0.05 }}
                                    className="flex items-center gap-3"
                                >
                                    <span className="text-sm w-5 text-center">{item.icon}</span>
                                    <span className="text-xs font-medium w-24 truncate" style={{ color: 'var(--theme-text, #1e293b)' }}>{item.name}</span>
                                    <div className="flex-1 h-5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--theme-surface-dark, #eef1f6)' }}>
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: item.color }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${barWidth}%` }}
                                            transition={{ duration: 0.6, delay: 0.2 + i * 0.05 }}
                                        />
                                    </div>
                                    <span className="text-xs font-semibold w-12 text-right" style={{ color: 'var(--theme-text, #1e293b)' }}>{minutesToDisplay(item.minutes)}</span>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Most Studied */}
            {stats.mostStudiedCourse && (
                <div className="card flex items-center gap-4 mt-5" style={elevatedDarkCardStyle}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                        style={{ backgroundColor: stats.mostStudiedCourse.color }}>
                        {stats.mostStudiedCourse.icon || mostStudiedCourseInitial}
                    </div>
                    <div>
                        <div className="text-xs mb-0.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{copy.mostStudied}</div>
                        <div className="font-semibold" style={{ color: 'var(--theme-text, #1e293b)' }}>{stats.mostStudiedCourse.courseName}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{minutesToDisplay(stats.courseFocusTime[stats.mostStudiedCourse.id])} {copy.total}</div>
                    </div>
                </div>
            )}

            {/* Study Timeline */}
            <div
                className="card mt-6"
                style={isDark
                    ? {
                        background: 'linear-gradient(180deg, rgba(20,28,47,0.98), rgba(9,15,29,0.98))',
                        borderColor: 'rgba(99,102,241,0.16)',
                        boxShadow: '0 18px 36px rgba(2,6,23,0.34)',
                    }
                    : undefined}
            >
                <h3 className="text-sm font-semibold mb-6" style={{ color: 'var(--theme-text, #1e293b)' }}>{copy.timeline}</h3>
                {timelineSessions.length > 0 ? (
                    <div className="space-y-4">
                        {timelineSessions.map((s, i) => {
                            const course = userCourses.find(c => c.id === s.courseId);
                            const dateStr = formatDateTimeInTurkey(s.createdAt, { month: 'short', day: 'numeric' }, locale);
                            const timeStr = formatDateTimeInTurkey(s.createdAt, { hour: '2-digit', minute: '2-digit' }, locale);
                            return (
                                <motion.div
                                    key={s.id}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex gap-4 relative"
                                >
                                    {i !== timelineSessions.length - 1 && (
                                        <div className="absolute top-8 bottom-[-24px] left-[15px] w-[2px]" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : isBarbie ? 'rgba(225,29,114,0.12)' : '#f1f5f9' }} />
                                    )}
                                    <div
                                        className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-white shrink-0 z-10 text-[13px] shadow-md border-[3px]"
                                        style={{
                                            backgroundColor: course?.color || '#94a3b8',
                                            borderColor: isDark ? 'rgba(15,23,42,0.92)' : '#ffffff',
                                        }}
                                    >
                                        {course?.icon || '⏱️'}
                                    </div>
                                    <div
                                        className="flex-1 rounded-2xl p-4 mb-2"
                                        style={{
                                            background: timelineCardBackground,
                                            border: `1px solid ${timelineCardBorder}`,
                                            boxShadow: isDark ? '0 18px 36px rgba(2,6,23,0.28)' : 'none',
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-semibold text-[13px]" style={{ color: 'var(--theme-text, #1e293b)' }}>{course?.courseName || copy.focusSession}</div>
                                            <div className="text-[11px] font-medium" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{dateStr} · {timeStr}</div>
                                        </div>
                                        <div className="text-[12px] font-medium" style={{ color: isDark ? 'rgba(226,232,240,0.84)' : 'var(--theme-text-secondary, #64748b)' }}>{s.actualMinutes}{copy.minuteUnit}</div>
                                        {s.note && (
                                            <div
                                                className="mt-3 rounded-xl p-3 text-[13px] leading-relaxed shadow-sm"
                                                style={{
                                                    backgroundColor: timelineNoteBackground,
                                                    border: `1px solid ${timelineNoteBorder}`,
                                                    color: isDark ? 'rgba(226,232,240,0.84)' : 'var(--theme-text-secondary, #64748b)',
                                                }}
                                            >
                                                {s.note}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-sm" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{copy.noActivityYet}</div>
                )}
            </div>
        </div>
    );
}
