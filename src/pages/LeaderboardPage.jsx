import { useMemo } from 'react';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';

const MOCK_LEADERBOARD = [
    { id: '1', nickname: 'StudyMachine', weeklyMinutes: 1240 },
    { id: '2', nickname: 'FocusFlow', weeklyMinutes: 1120 },
    { id: '3', nickname: 'IvyLeagueBound', weeklyMinutes: 1085 },
    { id: '4', nickname: 'NightOwl_99', weeklyMinutes: 950 },
    { id: '5', nickname: 'Coffee&Code', weeklyMinutes: 880 },
    { id: '6', nickname: 'PomodoroKing', weeklyMinutes: 845 },
    { id: '7', nickname: 'FutureDoc', weeklyMinutes: 790 },
    { id: '8', nickname: 'ZenStudent', weeklyMinutes: 650 },
    { id: '9', nickname: 'AlwaysReading', weeklyMinutes: 520 },
    { id: '10', nickname: 'JustOneMoreChapter', weeklyMinutes: 480 },
];

export default function LeaderboardPage() {
    const user = useAuthStore(s => s.user);
    const isDark = (user?.theme || 'calm') === 'dark';

    // Mock the user's weekly minutes based on their level/xp so it seems somewhat realistic for this prototype
    const userWeeklyMinutes = 540; // Hardcoded mock for layout, ideally fetched from sessions
    const userNickname = user?.name?.split(' ')[0] || 'You';

    const fullLeaderboard = useMemo(() => {
        const board = [...MOCK_LEADERBOARD, { id: 'me', nickname: userNickname, weeklyMinutes: userWeeklyMinutes, isUser: true }];
        return board.sort((a, b) => b.weeklyMinutes - a.weeklyMinutes);
    }, [userNickname, userWeeklyMinutes]);

    const userRank = fullLeaderboard.findIndex(p => p.id === 'me') + 1;

    return (
        <div className="max-w-[800px] mx-auto pb-12">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <h1 className="text-[32px] font-extrabold tracking-tight" style={{ color: 'var(--theme-text, #111827)' }}>
                    Global Leaderboard
                </h1>
                <p className="font-medium text-[15px] mt-1" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>
                    Compare your weekly focus time with students worldwide
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`p-6 rounded-2xl mb-8 border ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'} shadow-sm`}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-[14px] font-bold uppercase tracking-wider mb-1" style={{ color: isDark ? '#A5B4FC' : '#4F46E5' }}>Your Rank</h2>
                        <div className="text-[28px] font-extrabold" style={{ color: 'var(--theme-text, #111827)' }}>
                            #{userRank} <span className="text-[18px] font-medium opacity-60">this week</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[14px] font-bold uppercase tracking-wider mb-1" style={{ color: isDark ? '#A5B4FC' : '#4F46E5' }}>Your Focus</div>
                        <div className="text-[24px] font-extrabold" style={{ color: 'var(--theme-text, #111827)' }}>
                            {Math.floor(userWeeklyMinutes / 60)}h {userWeeklyMinutes % 60}m
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className={`px-6 py-4 border-b flex items-center font-bold text-[13px] uppercase tracking-wider ${isDark ? 'border-white/10 text-white/50' : 'border-slate-100 text-slate-400'}`}>
                    <div className="w-16">Rank</div>
                    <div className="flex-1">Student</div>
                    <div className="text-right">Focus Time</div>
                </div>
                <div className="divide-y" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                    {fullLeaderboard.map((student, i) => {
                        const isTop3 = i < 3;
                        let rankDisplay = `#${i + 1}`;
                        if (i === 0) rankDisplay = '🥇';
                        else if (i === 1) rankDisplay = '🥈';
                        else if (i === 2) rankDisplay = '🥉';

                        return (
                            <motion.div
                                key={student.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.15 + i * 0.05 }}
                                className={`px-6 py-4 flex items-center transition-colors ${student.isUser
                                        ? (isDark ? 'bg-indigo-500/15' : 'bg-indigo-50/50')
                                        : (isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50')
                                    }`}
                            >
                                <div className={`w-16 font-bold ${isTop3 ? 'text-2xl drop-shadow-sm' : 'text-lg'} ${isDark ? 'text-white/60' : 'text-slate-400'}`}>
                                    {rankDisplay}
                                </div>
                                <div className="flex-1 flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] ${student.isUser
                                            ? (isDark ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-indigo-500 text-white shadow-md shadow-indigo-200')
                                            : (isDark ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-600')
                                        }`}>
                                        {student.nickname.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-[15px] flex items-center gap-2" style={{ color: 'var(--theme-text, #1E293B)' }}>
                                            {student.nickname}
                                            {student.isUser && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-500/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>You</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right font-bold text-[15px]" style={{ color: 'var(--theme-text-secondary, #64748B)' }}>
                                    {Math.floor(student.weeklyMinutes / 60)}h {student.weeklyMinutes % 60}m
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
