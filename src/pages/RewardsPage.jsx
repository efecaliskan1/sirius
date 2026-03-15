import { motion } from 'framer-motion';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import { BADGE_DEFINITIONS, COMPANION_STAGES } from '../utils/constants';
import { getSessionStats, getLevelFromXP, getCompanionStage } from '../utils/rewardEngine';
import { minutesToDisplay } from '../utils/helpers';

export default function RewardsPage() {
    const user = useAuthStore((s) => s.user);
    const courses = useAppStore((s) => s.courses);
    const sessions = useAppStore((s) => s.sessions);
    const badges = useAppStore((s) => s.badges);

    const userSessions = sessions.filter((s) => s.userId === user?.id);
    const userCourses = courses.filter((c) => c.userId === user?.id);
    const userBadges = badges.filter((b) => b.userId === user?.id);
    const stats = getSessionStats(userSessions, userCourses);
    const unlockedKeys = userBadges.map((b) => b.badgeKey);

    const levelInfo = getLevelFromXP(user?.xp || 0);
    const companion = getCompanionStage(levelInfo.level);

    return (
        <div className="max-w-3xl mx-auto">
            {/* Profile + Level Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card mb-6 overflow-hidden"
            >
                <div className="flex items-center gap-5">
                    <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-200/50 w-[72px] h-[72px]">
                        {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-[#111827]">{user?.name || 'Student'}</h2>
                        <p className="text-xs text-slate-400">{user?.email}</p>

                        {/* Level Bar */}
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-blue-500">Level {levelInfo.level}</span>
                                <span className="text-[10px] text-slate-400">{user?.xp || 0} / {levelInfo.nextThreshold} XP</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${levelInfo.progress}%` }}
                                    transition={{ duration: 1 }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm">🪙</span>
                        <span className="text-sm font-semibold text-slate-500">{user?.coinBalance || 0}</span>
                        <span className="text-[10px] text-slate-400">coins</span>
                    </div>
                    <div className="w-px h-4 bg-slate-100"></div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm">🔥</span>
                        <span className="text-sm font-semibold text-slate-500">{user?.streakCount || 0}</span>
                        <span className="text-[10px] text-slate-400">day streak</span>
                    </div>
                    <div className="w-px h-4 bg-slate-100"></div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm">🍅</span>
                        <span className="text-sm font-semibold text-slate-500">{stats.totalSessions}</span>
                        <span className="text-[10px] text-slate-400">sessions</span>
                    </div>
                    <div className="w-px h-4 bg-slate-100"></div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm">⏱️</span>
                        <span className="text-sm font-semibold text-slate-500">{minutesToDisplay(stats.totalMinutes)}</span>
                        <span className="text-[10px] text-slate-400">focused</span>
                    </div>
                </div>
            </motion.div>

            {/* Study Companion */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card mb-6 text-center"
            >
                <h3 className="text-sm font-semibold text-slate-500 mb-4">Study Companion</h3>

                <div className="flex items-center justify-center gap-4 mb-4">
                    {COMPANION_STAGES.map((stage, i) => {
                        const isActive = stage.minLevel <= levelInfo.level;
                        const isCurrent = stage.name === companion.name;
                        return (
                            <motion.div
                                key={stage.name}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.15 + i * 0.05 }}
                                className={`text-center ${!isActive ? 'opacity-25 grayscale' : ''}`}
                            >
                                <div className={`text-3xl mb-1 ${isCurrent ? 'animate-float' : ''}`}>
                                    {stage.emoji}
                                </div>
                                <div className={`text-[10px] font-medium ${isCurrent ? 'text-blue-500' : 'text-slate-400'}`}>
                                    {stage.name}
                                </div>
                                {isCurrent && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-1.5 h-1.5 bg-blue-400 rounded-full mx-auto mt-1"
                                    />
                                )}
                            </motion.div>
                        );
                    })}
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl px-4 py-3">
                    <div className="text-4xl mb-1 animate-float">{companion.emoji}</div>
                    <div className="text-sm font-semibold text-slate-500">{companion.name}</div>
                    <div className="text-xs text-slate-400">{companion.description}</div>
                </div>
            </motion.div>

            {/* Badges */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
            >
                <h2 className="text-sm font-semibold text-slate-500 mb-4">Badges</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {BADGE_DEFINITIONS.map((badge, i) => {
                        const isUnlocked = unlockedKeys.includes(badge.badgeKey);
                        return (
                            <motion.div
                                key={badge.badgeKey}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.25 + i * 0.04 }}
                                className={`card text-center ${!isUnlocked ? 'opacity-30 grayscale' : ''}`}
                            >
                                <div className="text-2xl mb-1.5">{badge.icon}</div>
                                <div className="text-xs font-semibold text-[#111827]">{badge.badgeName}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{badge.description}</div>
                                {isUnlocked && (
                                    <div className="mt-2">
                                        <span className="badge bg-slate-50 text-emerald-600 text-[9px]">Unlocked ✓</span>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </motion.div>

            {/* Reward Summary */}
            <div className="card">
                <h3 className="text-sm font-semibold text-slate-500 mb-3">Reward Summary</h3>
                <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                        <div className="text-2xl font-bold text-amber-600">{user?.coinBalance || 0}</div>
                        <div className="text-[10px] text-amber-700 mt-1">Total Coins</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                        <div className="text-2xl font-bold text-blue-600">{unlockedKeys.length}</div>
                        <div className="text-[10px] text-blue-700 mt-1">Badges Earned</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl">
                        <div className="text-2xl font-bold text-purple-600">Level {levelInfo.level}</div>
                        <div className="text-[10px] text-purple-700 mt-1">Current Level</div>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center text-xs text-slate-300">
                🎨 Avatar customization & reward shop coming soon
            </div>
        </div>
    );
}
