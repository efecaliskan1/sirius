import { motion } from 'framer-motion';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import YourSkyScene, { getSkySummary } from '../components/rewards/YourSkyScene';
import { minutesToDisplay } from '../utils/helpers';

const FOCUS_PHASES = [
    { threshold: '25%', title: 'Star Bloom', description: 'A few new lights appear and the sky starts feeling awake.' },
    { threshold: '50%', title: 'Constellation Trace', description: 'Nearby stars begin connecting into recognizable fragments.' },
    { threshold: '75%', title: 'Nebula Lift', description: 'Orbit paths brighten and the nebula field becomes richer.' },
    { threshold: '100%', title: 'Sirius Pulse', description: 'A visible pulse marks the session and permanently enriches your sky.' },
];

export default function RewardsPage() {
    const user = useAuthStore((s) => s.user);
    const sessions = useAppStore((s) => s.sessions);

    const userSessions = sessions.filter((session) => session.userId === user?.id && session.completed);
    const totalMinutes = userSessions.reduce((sum, session) => sum + (session.actualMinutes || 0), 0);
    const sessionsCompleted = userSessions.length;
    const skySummary = getSkySummary({
        sessionsCompleted,
        streak: user?.streakCount || 0,
        totalMinutes,
        focusProgress: 0,
    });

    const gainCards = [
        {
            label: 'Permanent sky state',
            value: skySummary.richnessLabel,
            detail: `${skySummary.starsLit} stars are now permanently visible in your personal sky.`,
        },
        {
            label: 'Constellation memory',
            value: `${skySummary.constellationCount} clusters`,
            detail: `${skySummary.visibleConnections.length} active links have already been traced between your stars.`,
        },
        {
            label: 'Orbit richness',
            value: skySummary.orbitLabel,
            detail: `Your ${user?.streakCount || 0}-day streak is helping orbit trails stay brighter and more stable.`,
        },
        {
            label: 'Rare celestial effects',
            value: skySummary.meteorReady ? 'Unlocked' : 'Locked',
            detail: skySummary.rareEventLabel,
        },
    ];

    return (
        <div className="max-w-5xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-600">Sirius Rewards</p>
                <h1 className="mt-2 text-[34px] font-bold tracking-tight text-[#0f172a]">Your Sky</h1>
                <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-500">
                    This is not a badge shelf. It is your personal sky. Every completed focus session permanently enriches it with new stars, stronger orbit trails, deeper nebula light, and rarer celestial events.
                </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <YourSkyScene
                    sessionsCompleted={sessionsCompleted}
                    streak={user?.streakCount || 0}
                    totalMinutes={totalMinutes}
                    focusProgress={0}
                />
            </motion.div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card"
                >
                    <h2 className="text-[17px] font-bold text-[#111827]">How Sirius Responds</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {FOCUS_PHASES.map((phase) => (
                            <div key={phase.threshold} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-600">{phase.threshold}</div>
                                <div className="mt-2 text-[15px] font-semibold text-[#111827]">{phase.title}</div>
                                <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{phase.description}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14 }}
                    className="card"
                >
                    <h2 className="text-[17px] font-bold text-[#111827]">Sky Gains</h2>
                    <div className="mt-4 space-y-3">
                        {gainCards.map((card) => (
                            <div key={card.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-4">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{card.label}</div>
                                <div className="mt-2 text-[22px] font-bold text-[#111827]">{card.value}</div>
                                <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{card.detail}</p>
                            </div>
                        ))}
                        <div className="rounded-2xl border border-slate-100 bg-[linear-gradient(135deg,#f8fbff_0%,#eef6ff_100%)] px-4 py-4">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Focus time stored in the sky</div>
                            <div className="mt-2 text-[24px] font-bold text-[#111827]">{minutesToDisplay(totalMinutes)}</div>
                            <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                                Every finished Pomodoro permanently adds depth to the scene instead of filling a separate progress bar.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
