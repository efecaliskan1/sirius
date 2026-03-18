import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import { getSessionStats, getWeeklyStats, getHeatmapData, getWeeklyTrend } from '../utils/rewardEngine';
import { formatDateTimeInTurkey, formatDateWithOptions, minutesToDisplay } from '../utils/helpers';

const HEATMAP_COLORS = ['#f1f5f9', '#c7d2fe', '#818cf8', '#6366f1', '#4338ca'];

export default function StatsPage() {
    const user = useAuthStore((s) => s.user);
    const courses = useAppStore((s) => s.courses);
    const sessions = useAppStore((s) => s.sessions);

    const userSessions = sessions.filter((s) => s.userId === user?.id);
    const userCourses = courses.filter((c) => c.userId === user?.id);
    const stats = getSessionStats(userSessions, userCourses);
    const weeklyStats = getWeeklyStats(userSessions);
    const heatmapData = useMemo(() => getHeatmapData(userSessions, 12), [userSessions]);
    const weeklyTrend = useMemo(() => getWeeklyTrend(userSessions, 8), [userSessions]);
    const weeklyTotal = weeklyStats.reduce((sum, d) => sum + d.minutes, 0);

    const avgSessionLength = stats.totalSessions > 0 ? Math.round(stats.totalMinutes / stats.totalSessions) : 0;
    const bestDay = heatmapData.reduce((max, d) => d.minutes > max.minutes ? d : max, heatmapData[0] || { date: '-', minutes: 0 });

    const timelineSessions = useMemo(() => {
        return [...userSessions]
            .filter((s) => s.completed)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 15);
    }, [userSessions]);

    const statCards = [
        { label: 'This Week', value: minutesToDisplay(weeklyTotal), icon: '📅', gradient: 'from-blue-50 to-indigo-50' },
        { label: 'Average Session', value: `${avgSessionLength}m`, icon: '⏱️', gradient: 'from-violet-50 to-fuchsia-50' },
        { label: 'Total Focus', value: minutesToDisplay(stats.totalMinutes), icon: '🧠', gradient: 'from-blue-50 to-indigo-50' },
        { label: 'Total Sessions', value: stats.totalSessions, icon: '🍅', gradient: 'from-rose-50 to-orange-50' },
        { label: 'Best Day', value: bestDay.minutes > 0 ? formatDateWithOptions(bestDay.date, { weekday: 'short' }) : '-', icon: '🌟', gradient: 'from-amber-50 to-yellow-50' },
        { label: 'Current Streak', value: `${user?.streakCount || 0}d`, icon: '🔥', gradient: 'from-orange-50 to-red-50' },
    ];

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
            return { name: course?.courseName || 'Unknown', minutes, color: course?.color || '#94a3b8', icon: course?.icon || '📚' };
        })
        .sort((a, b) => b.minutes - a.minutes);

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-text, #1e293b)' }}>Statistics</h1>
                <p className="text-sm mt-0.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Track your study progress</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mb-8">
                {statCards.map((card, i) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className={`rounded-2xl bg-gradient-to-br ${card.gradient} p-4 border border-white/60`}
                    >
                        <div className="text-lg mb-2">{card.icon}</div>
                        <div className="text-xl font-bold text-[#111827]">{card.value}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{card.label}</div>
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
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--theme-text, #1e293b)' }}>Study Activity</h3>
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
                                        style={{ backgroundColor: HEATMAP_COLORS[day.level] }}
                                    >
                                        <div className={`absolute w-max max-w-[220px] bg-slate-800 text-white text-[11px] py-2 px-3 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-xl ${
                                            shouldOpenBelow ? 'top-full mt-2' : 'bottom-full mb-2'
                                        } ${
                                            alignLeft ? 'left-0 translate-x-0' : alignRight ? 'right-0 translate-x-0' : 'left-1/2 -translate-x-1/2'
                                        }`}>
                                            <div className="font-semibold mb-1 border-b border-slate-700 pb-1">{day.date}</div>
                                            <div className="flex justify-between gap-4 mb-0.5">
                                                <span className="text-slate-400">Time:</span>
                                                <span className="font-medium">{minutesToDisplay(day.minutes)}</span>
                                            </div>
                                            <div className="flex justify-between gap-4">
                                                <span className="text-slate-400">Sessions:</span>
                                                <span className="font-medium">{day.sessionsCount || 0}</span>
                                            </div>
                                            {day.mainCourseId && (
                                                <div className="mt-1 pt-1 border-t border-slate-700 font-medium" style={{ color: userCourses.find(c => c.id === day.mainCourseId)?.color || '#94a3b8' }}>
                                                    Main: {userCourses.find(c => c.id === day.mainCourseId)?.courseName}
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
                    <div className="flex items-center gap-1.5 mt-3 justify-end">
                        <span className="text-[10px] text-slate-400">Less</span>
                        {HEATMAP_COLORS.map((color, i) => (
                            <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                        ))}
                        <span className="text-[10px] text-slate-400">More</span>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-5 mb-6">
                {/* Weekly Chart */}
                <div className="card">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--theme-text, #1e293b)' }}>This Week</h3>
                    {weeklyTotal > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={weeklyStats}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                                    formatter={(value) => [`${value} min`, 'Focus']}
                                />
                                <Bar dataKey="minutes" fill="#4F6EF7" radius={[6, 6, 0, 0]} maxBarSize={32} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[200px] text-slate-400 text-xs">
                            Complete sessions to see data
                        </div>
                    )}
                </div>

                {/* Weekly Trend */}
                <div className="card">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--theme-text, #1e293b)' }}>Weekly Trend</h3>
                    {weeklyTrend.some((w) => w.minutes > 0) ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={weeklyTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                                    formatter={(value) => [`${value} min`, 'Study Time']}
                                />
                                <Line type="monotone" dataKey="minutes" stroke="#7C6CF3" strokeWidth={2.5} dot={{ fill: '#7C6CF3', r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[200px] text-slate-400 text-xs">
                            Study over multiple weeks to see trends
                        </div>
                    )}
                </div>
            </div>

            {/* Course Focus List (replaces pie chart) */}
            {courseData.length > 0 && (
                <div className="card">
                    <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--theme-text, #1e293b)' }}>Focus by Course</h3>
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
                <div className="card flex items-center gap-4 mt-5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                        style={{ backgroundColor: stats.mostStudiedCourse.color }}>
                        {stats.mostStudiedCourse.icon || stats.mostStudiedCourse.courseName.charAt(0)}
                    </div>
                    <div>
                        <div className="text-xs mb-0.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Most Studied</div>
                        <div className="font-semibold" style={{ color: 'var(--theme-text, #1e293b)' }}>{stats.mostStudiedCourse.courseName}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{minutesToDisplay(stats.courseFocusTime[stats.mostStudiedCourse.id])} total</div>
                    </div>
                </div>
            )}

            {/* Study Timeline */}
            <div className="card mt-6">
                <h3 className="text-sm font-semibold mb-6" style={{ color: 'var(--theme-text, #1e293b)' }}>Study Timeline</h3>
                {timelineSessions.length > 0 ? (
                    <div className="space-y-4">
                        {timelineSessions.map((s, i) => {
                            const course = userCourses.find(c => c.id === s.courseId);
                            const dateStr = formatDateTimeInTurkey(s.createdAt, { month: 'short', day: 'numeric' });
                            const timeStr = formatDateTimeInTurkey(s.createdAt, { hour: '2-digit', minute: '2-digit' });
                            return (
                                <motion.div
                                    key={s.id}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex gap-4 relative"
                                >
                                    {i !== timelineSessions.length - 1 && (
                                        <div className="absolute top-8 bottom-[-24px] left-[15px] w-[2px] bg-slate-100" />
                                    )}
                                    <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-white shrink-0 z-10 text-[13px] shadow-md border-[3px] border-white" style={{ backgroundColor: course?.color || '#94a3b8' }}>
                                        {course?.icon || '⏱️'}
                                    </div>
                                    <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-2">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-semibold text-[#111827] text-[13px]">{course?.courseName || 'Focus Session'}</div>
                                            <div className="text-[11px] text-slate-400 font-medium">{dateStr} · {timeStr}</div>
                                        </div>
                                        <div className="text-[12px] text-slate-400 font-medium">{s.actualMinutes}m</div>
                                        {s.note && (
                                            <div className="mt-3 bg-white p-3 rounded-xl border border-slate-100 text-[13px] text-slate-500 leading-relaxed shadow-sm">
                                                {s.note}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400 text-sm">No activity yet. Complete a session to see your timeline.</div>
                )}
            </div>
        </div>
    );
}
