import { motion } from 'framer-motion';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import YourSkyScene, { getSkySummary } from '../components/rewards/YourSkyScene';
import { minutesToDisplay } from '../utils/helpers';
import { useLocale } from '../utils/i18n';

const REWARDS_COPY = {
    en: {
        eyebrow: 'Sirius Rewards',
        title: 'Your Sky',
        subtitle: 'This is not a badge shelf. It is your personal sky. Every completed focus session permanently enriches it with new stars, stronger orbit trails, deeper nebula light, and rarer celestial events.',
        howSiriusResponds: 'How Sirius Responds',
        skyGains: 'Sky Gains',
        focusTimeStored: 'Focus time stored in the sky',
        focusTimeDetail: 'Every finished Pomodoro permanently adds depth to the scene instead of filling a separate progress bar.',
        phases: [
            { threshold: '25%', title: 'Star Bloom', description: 'A few new lights appear and the sky starts feeling awake.' },
            { threshold: '50%', title: 'Constellation Trace', description: 'Nearby stars begin connecting into recognizable fragments.' },
            { threshold: '75%', title: 'Nebula Lift', description: 'Orbit paths brighten and the nebula field becomes richer.' },
            { threshold: '100%', title: 'Sirius Pulse', description: 'A visible pulse marks the session and permanently enriches your sky.' },
        ],
        gainCards: {
            permanentSkyState: 'Permanent sky state',
            constellationMemory: 'Constellation memory',
            orbitRichness: 'Orbit richness',
            rareEffects: 'Rare celestial effects',
            constellationClusters: '{count} clusters',
            starsVisible: '{count} stars are now permanently visible in your personal sky.',
            activeLinks: '{links} active links have already been traced between your stars.',
            streakOrbit: 'Your {streak}-day streak is helping orbit trails stay brighter and more stable.',
            unlocked: 'Unlocked',
            locked: 'Locked',
        },
    },
    tr: {
        eyebrow: 'Sirius Ödülleri',
        title: 'Gökyüzün',
        subtitle: 'Burası bir rozet rafı değil. Sana ait kişisel gökyüzü. Tamamladığın her odak oturumu yeni yıldızlar, daha güçlü yörünge izleri, daha derin bulutsu ışığı ve daha nadir göksel detaylarla bu alanı kalıcı olarak zenginleştirir.',
        howSiriusResponds: 'Sirius Nasıl Tepki Verir',
        skyGains: 'Gökyüzüne Eklenenler',
        focusTimeStored: 'Gökyüzünde biriken odak süresi',
        focusTimeDetail: 'Tamamlanan her Pomodoro, ayrı bir ilerleme çubuğu doldurmak yerine bu sahneye kalıcı bir derinlik ekler.',
        phases: [
            { threshold: '25%', title: 'Yıldız kıvılcımı', description: 'Birkaç yeni ışık belirir ve gökyüzü yavaş yavaş canlanmaya başlar.' },
            { threshold: '50%', title: 'Takımyıldızı izi', description: 'Yakın yıldızlar birbirine bağlanıp tanıdık şekiller oluşturmaya başlar.' },
            { threshold: '75%', title: 'Bulutsu yükselişi', description: 'Yörünge izleri güçlenir, bulutsu alanı daha zengin görünür.' },
            { threshold: '100%', title: 'Sirius darbesi', description: 'Gözle görülür bir ışık darbesi oluşur ve gökyüzün kalıcı olarak güçlenir.' },
        ],
        gainCards: {
            permanentSkyState: 'Kalıcı gökyüzü durumu',
            constellationMemory: 'Takımyıldızı hafızası',
            orbitRichness: 'Yörünge zenginliği',
            rareEffects: 'Nadir göksel etkiler',
            constellationClusters: '{count} küme',
            starsVisible: '{count} yıldız artık kişisel gökyüzünde kalıcı olarak görünüyor.',
            activeLinks: 'Yıldızların arasında {links} aktif bağlantı oluşmuş durumda.',
            streakOrbit: '{streak} günlük serin, yörünge izlerinin daha parlak ve daha istikrarlı kalmasına katkı sağlıyor.',
            unlocked: 'Açıldı',
            locked: 'Henüz değil',
        },
    },
};

export default function RewardsPage() {
    const user = useAuthStore((s) => s.user);
    const sessions = useAppStore((s) => s.sessions);
    const locale = useLocale();
    const copy = REWARDS_COPY[locale] || REWARDS_COPY.en;
    const isDark = (user?.theme || 'calm') === 'dark';
    const isBarbie = (user?.theme || 'calm') === 'barbie';
    const safeSessions = Array.isArray(sessions) ? sessions : [];
    const userSessions = safeSessions.filter((session) => session?.userId === user?.id && session.completed);
    const totalMinutes = userSessions.reduce((sum, session) => sum + (session.actualMinutes || 0), 0);
    const sessionsCompleted = userSessions.length;
    const skySummary = getSkySummary({
        sessionsCompleted,
        streak: user?.streakCount || 0,
        totalMinutes,
        focusProgress: 0,
        locale,
    });

    const gainCards = [
        {
            label: copy.gainCards.permanentSkyState,
            value: skySummary.richnessLabel,
            detail: copy.gainCards.starsVisible.replace('{count}', skySummary.starsLit),
        },
        {
            label: copy.gainCards.constellationMemory,
            value: copy.gainCards.constellationClusters.replace('{count}', skySummary.constellationCount),
            detail: copy.gainCards.activeLinks.replace('{links}', skySummary.visibleConnections.length),
        },
        {
            label: copy.gainCards.orbitRichness,
            value: skySummary.orbitLabel,
            detail: copy.gainCards.streakOrbit.replace('{streak}', user?.streakCount || 0),
        },
        {
            label: copy.gainCards.rareEffects,
            value: skySummary.meteorReady ? copy.gainCards.unlocked : copy.gainCards.locked,
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: isBarbie ? 'var(--theme-primary, #E11D74)' : 'var(--theme-primary, #0284c7)' }}>{copy.eyebrow}</p>
                <h1 className="mt-2 text-[34px] font-bold tracking-tight" style={{ color: 'var(--theme-text, #0f172a)' }}>{copy.title}</h1>
                <p className="mt-2 max-w-3xl text-[15px] leading-relaxed" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
                    {copy.subtitle}
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
                    <h2 className="text-[17px] font-bold" style={{ color: 'var(--theme-text, #111827)' }}>{copy.howSiriusResponds}</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {copy.phases.map((phase) => (
                            <div key={phase.threshold} className="rounded-2xl px-4 py-4" style={{ border: '1px solid var(--theme-border-light, #f1f5f9)', background: isDark ? 'rgba(255,255,255,0.03)' : 'var(--theme-surface, rgba(248,250,252,0.8))' }}>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: isBarbie ? 'var(--theme-primary, #E11D74)' : 'var(--theme-primary, #0284c7)' }}>{phase.threshold}</div>
                                <div className="mt-2 text-[15px] font-semibold" style={{ color: 'var(--theme-text, #111827)' }}>{phase.title}</div>
                                <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{phase.description}</p>
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
                    <h2 className="text-[17px] font-bold" style={{ color: 'var(--theme-text, #111827)' }}>{copy.skyGains}</h2>
                    <div className="mt-4 space-y-3">
                        {gainCards.map((card) => (
                            <div key={card.label} className="rounded-2xl px-4 py-4" style={{ border: '1px solid var(--theme-border-light, #f1f5f9)', background: 'var(--theme-card, #ffffff)' }}>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{card.label}</div>
                                <div className="mt-2 text-[22px] font-bold" style={{ color: 'var(--theme-text, #111827)' }}>{card.value}</div>
                                <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{card.detail}</p>
                            </div>
                        ))}
                        <div className="rounded-2xl px-4 py-4" style={{ border: '1px solid var(--theme-border-light, #f1f5f9)', background: isDark ? 'rgba(99,102,241,0.08)' : isBarbie ? 'linear-gradient(135deg,#fff1f7 0%,#ffe4ef 100%)' : 'linear-gradient(135deg,#f8fbff 0%,#eef6ff 100%)' }}>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{copy.focusTimeStored}</div>
                            <div className="mt-2 text-[24px] font-bold" style={{ color: 'var(--theme-text, #111827)' }}>{minutesToDisplay(totalMinutes)}</div>
                            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
                                {copy.focusTimeDetail}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
