import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { minutesToDisplay } from '../../utils/helpers';
import { useLocale } from '../../utils/i18n';

const STAR_FIELD = [
    {
        id: 'sirius-core', x: 50, y: 22, size: 14,
        copy: {
            en: { label: 'Sirius Core', detail: 'The anchor light of your sky. It pulses most strongly when a focus session completes.' },
            tr: { label: 'Sirius çekirdeği', detail: 'Gökyüzünün ana ışığı. Bir odak oturumu tamamlandığında en güçlü parıltısını gösterir.' },
        },
    },
    {
        id: 'quiet-east', x: 66, y: 30, size: 8,
        copy: {
            en: { label: 'East Quiet Star', detail: 'One of the early stars that appears as your sky wakes up.' },
            tr: { label: 'Doğu sakin yıldızı', detail: 'Gökyüzün canlanmaya başlarken görünen ilk yıldızlardan biridir.' },
        },
    },
    {
        id: 'quiet-west', x: 34, y: 34, size: 8,
        copy: {
            en: { label: 'West Quiet Star', detail: 'A balancing star that brightens your calm baseline.' },
            tr: { label: 'Batı sakin yıldızı', detail: 'Sakin temel parlaklığını dengeleyen ve güçlendiren yıldızdır.' },
        },
    },
    {
        id: 'north-trace', x: 58, y: 16, size: 7,
        copy: {
            en: { label: 'North Trace', detail: 'A subtle guide star pulled forward by consistency.' },
            tr: { label: 'Kuzey izi', detail: 'Düzenli çalışmayla öne çıkan ince bir yön yıldızıdır.' },
        },
    },
    {
        id: 'south-glint', x: 44, y: 43, size: 7,
        copy: {
            en: { label: 'South Glint', detail: 'This star appears once your sessions begin to accumulate.' },
            tr: { label: 'Güney parıltısı', detail: 'Oturumların birikmeye başladığında ortaya çıkar.' },
        },
    },
    {
        id: 'orbit-edge', x: 76, y: 42, size: 7,
        copy: {
            en: { label: 'Orbit Edge', detail: 'A bright point that helps form your first orbit trail.' },
            tr: { label: 'Yörünge kıyısı', detail: 'İlk yörünge izinin oluşmasına yardım eden parlak noktadır.' },
        },
    },
    {
        id: 'echo-point', x: 24, y: 49, size: 6,
        copy: {
            en: { label: 'Echo Point', detail: 'A quieter star that deepens the atmosphere of your sky.' },
            tr: { label: 'Yankı noktası', detail: 'Gökyüzünün atmosferine derinlik katan daha sakin bir yıldızdır.' },
        },
    },
    {
        id: 'nebula-seed', x: 63, y: 54, size: 8,
        copy: {
            en: { label: 'Nebula Seed', detail: 'This one feeds the soft nebula glow around your constellations.' },
            tr: { label: 'Bulutsu tohumu', detail: 'Takımyıldızlarının çevresindeki yumuşak bulutsu ışımasını besler.' },
        },
    },
    {
        id: 'horizon-lantern', x: 16, y: 60, size: 6,
        copy: {
            en: { label: 'Horizon Lantern', detail: 'A faint horizon star unlocked by longer-term focus.' },
            tr: { label: 'Ufuk feneri', detail: 'Daha uzun vadeli odakla açılan silik bir ufuk yıldızıdır.' },
        },
    },
    {
        id: 'drift-line', x: 83, y: 58, size: 6,
        copy: {
            en: { label: 'Drift Line', detail: 'A rare star that sharpens your orbit trails.' },
            tr: { label: 'Sürüklenme izi', detail: 'Yörünge çizgilerini keskinleştiren nadir bir yıldızdır.' },
        },
    },
    {
        id: 'zenith-one', x: 39, y: 10, size: 6,
        copy: {
            en: { label: 'Zenith One', detail: 'A high star reserved for richer skies and higher streaks.' },
            tr: { label: 'Zenit bir', detail: 'Daha zengin gökyüzleri ve daha güçlü seriler için ayrılmış yüksek bir yıldızdır.' },
        },
    },
    {
        id: 'zenith-two', x: 69, y: 12, size: 6,
        copy: {
            en: { label: 'Zenith Two', detail: 'This star arrives when your sky starts feeling expansive.' },
            tr: { label: 'Zenit iki', detail: 'Gökyüzün genişlemeye başladığında ortaya çıkar.' },
        },
    },
    {
        id: 'hushed-arc', x: 29, y: 23, size: 5,
        copy: {
            en: { label: 'Hushed Arc', detail: 'A soft star that fills the empty space between constellations.' },
            tr: { label: 'Sessiz yay', detail: 'Takımyıldızları arasındaki boşluğu dolduran yumuşak bir yıldızdır.' },
        },
    },
    {
        id: 'silver-rest', x: 58, y: 69, size: 6,
        copy: {
            en: { label: 'Silver Rest', detail: 'A calmer light that signals your sky is becoming permanent.' },
            tr: { label: 'Gümüş durak', detail: 'Gökyüzünün kalıcı hale geldiğini hissettiren sakin bir ışıktır.' },
        },
    },
    {
        id: 'far-trace', x: 86, y: 23, size: 5,
        copy: {
            en: { label: 'Far Trace', detail: 'A distant star that only appears in enriched skies.' },
            tr: { label: 'Uzak iz', detail: 'Sadece zenginleşmiş gökyüzlerinde görünen uzak bir yıldızdır.' },
        },
    },
    {
        id: 'veil-point', x: 11, y: 32, size: 5,
        copy: {
            en: { label: 'Veil Point', detail: 'This one strengthens the nebula veil around the scene.' },
            tr: { label: 'Örtü noktası', detail: 'Sahnenin etrafındaki bulutsu örtüyü güçlendirir.' },
        },
    },
    {
        id: 'inner-orbit', x: 72, y: 69, size: 5,
        copy: {
            en: { label: 'Inner Orbit', detail: 'A subtle marker inside your brightest orbital path.' },
            tr: { label: 'İç yörünge', detail: 'En parlak yörünge yolunun içindeki ince bir işarettir.' },
        },
    },
    {
        id: 'deep-field', x: 22, y: 72, size: 5,
        copy: {
            en: { label: 'Deep Field', detail: 'A late unlock that gives the sky more depth and stillness.' },
            tr: { label: 'Derin alan', detail: 'Gökyüzüne daha fazla derinlik ve dinginlik katan geç açılan bir yıldızdır.' },
        },
    },
];

const CONSTELLATION_LINKS = [
    ['quiet-west', 'sirius-core'],
    ['sirius-core', 'quiet-east'],
    ['sirius-core', 'north-trace'],
    ['quiet-west', 'south-glint'],
    ['south-glint', 'nebula-seed'],
    ['quiet-east', 'orbit-edge'],
    ['quiet-west', 'echo-point'],
    ['echo-point', 'horizon-lantern'],
    ['orbit-edge', 'drift-line'],
    ['north-trace', 'zenith-one'],
    ['north-trace', 'zenith-two'],
    ['quiet-west', 'hushed-arc'],
    ['nebula-seed', 'silver-rest'],
    ['quiet-east', 'far-trace'],
    ['quiet-west', 'veil-point'],
    ['nebula-seed', 'inner-orbit'],
    ['echo-point', 'deep-field'],
];

const SKY_MILESTONES = [
    {
        requirement: { sessions: 3 },
        copy: {
            en: { label: 'First constellation', reward: 'Constellation fragments start connecting.' },
            tr: { label: 'İlk takımyıldızı', reward: 'Takımyıldızı parçaları birbirine bağlanmaya başlıyor.' },
        },
    },
    {
        requirement: { sessions: 8, minutes: 180 },
        copy: {
            en: { label: 'Orbit trail', reward: 'A soft orbit begins circling your sky.' },
            tr: { label: 'Yörünge izi', reward: 'Yumuşak bir yörünge gökyüzünün etrafında dönmeye başlıyor.' },
        },
    },
    {
        requirement: { sessions: 16, streak: 3 },
        copy: {
            en: { label: 'Nebula veil', reward: 'Nebula glow deepens around your stars.' },
            tr: { label: 'Bulutsu örtüsü', reward: 'Bulutsu ışıması yıldızlarının çevresinde derinleşiyor.' },
        },
    },
    {
        requirement: { sessions: 28, streak: 7 },
        copy: {
            en: { label: 'Meteor window', reward: 'Rare meteor sweeps begin appearing.' },
            tr: { label: 'Meteor penceresi', reward: 'Nadir meteor geçişleri görünmeye başlıyor.' },
        },
    },
    {
        requirement: { sessions: 45, minutes: 1200, streak: 14 },
        copy: {
            en: { label: 'Sirius pulse', reward: 'Your Sirius star emits a stronger permanent pulse.' },
            tr: { label: 'Sirius darbesi', reward: 'Sirius yıldızın daha güçlü ve kalıcı bir parıltı yayıyor.' },
        },
    },
];

const SKY_LABELS = {
    richness: {
        quiet: { en: 'Quiet sky', tr: 'Sakin gökyüzü' },
        growing: { en: 'Growing sky', tr: 'Gelişen gökyüzü' },
        enriched: { en: 'Enriched sky', tr: 'Zenginleşen gökyüzü' },
        radiant: { en: 'Radiant sky', tr: 'Parlayan gökyüzü' },
    },
    orbit: {
        faint: { en: 'Faint orbit traces', tr: 'Hafif yörünge izleri' },
        stable: { en: 'Stable orbit ribbons', tr: 'Dengeli yörünge çizgileri' },
        bright: { en: 'Bright orbit architecture', tr: 'Parlak yörünge yapısı' },
    },
    rareEvents: {
        low: {
            en: 'Rare celestial events unlock as your streak and session count grow',
            tr: 'Serin ve oturum sayın arttıkça nadir göksel olaylar açılır',
        },
        medium: {
            en: 'Meteors can now appear during richer sessions',
            tr: 'Daha güçlü oturumlarda artık meteorlar görülebilir',
        },
        high: {
            en: 'High chance of meteors and strong Sirius pulses',
            tr: 'Meteorlar ve güçlü Sirius darbeleri için yüksek olasılık',
        },
    },
    fullyAwakened: {
        en: 'Your sky is fully awakened.',
        tr: 'Gökyüzün tamamen uyandı.',
    },
};

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function getLocalizedCopy(copy, locale, field) {
    return copy?.[locale]?.[field] || copy?.en?.[field] || '';
}

function localizeStar(star, locale) {
    return {
        ...star,
        label: getLocalizedCopy(star.copy, locale, 'label'),
        detail: getLocalizedCopy(star.copy, locale, 'detail'),
    };
}

function localizeMilestone(milestone, locale) {
    return {
        ...milestone,
        label: getLocalizedCopy(milestone.copy, locale, 'label'),
        reward: getLocalizedCopy(milestone.copy, locale, 'reward'),
    };
}

function getMilestoneDelta(milestone, skyStats, locale = 'en') {
    const missing = [];
    const isTurkish = locale === 'tr';

    if (milestone.requirement.sessions && skyStats.sessionsCompleted < milestone.requirement.sessions) {
        const sessionDelta = milestone.requirement.sessions - skyStats.sessionsCompleted;
        missing.push(isTurkish ? `${sessionDelta} oturum` : `${sessionDelta} session${sessionDelta === 1 ? '' : 's'}`);
    }

    if (milestone.requirement.minutes && skyStats.totalMinutes < milestone.requirement.minutes) {
        const remainingMinutes = milestone.requirement.minutes - skyStats.totalMinutes;
        missing.push(isTurkish ? `${minutesToDisplay(remainingMinutes)} odak süresi` : `${minutesToDisplay(remainingMinutes)} focus time`);
    }

    if (milestone.requirement.streak && skyStats.streak < milestone.requirement.streak) {
        const streakDelta = milestone.requirement.streak - skyStats.streak;
        missing.push(isTurkish ? `${streakDelta} seri günü` : `${streakDelta} streak day${streakDelta === 1 ? '' : 's'}`);
    }

    return missing.join(' · ');
}

export function getSkySummary({ sessionsCompleted = 0, streak = 0, totalMinutes = 0, focusProgress = 0, locale = 'en' }) {
    const resolvedLocale = locale === 'tr' ? 'tr' : 'en';
    const permanentRichness = clamp(
        (sessionsCompleted / 48) * 0.42 +
        (totalMinutes / 2400) * 0.4 +
        (streak / 21) * 0.18,
        0,
        1
    );

    const liveRichness = clamp(focusProgress / 100, 0, 1);
    const combinedRichness = clamp(permanentRichness + liveRichness * 0.35, 0, 1);
    const starsLit = clamp(
        4 +
        Math.round(permanentRichness * 8) +
        (focusProgress >= 25 ? 2 : 0) +
        (focusProgress >= 50 ? 2 : 0) +
        (focusProgress >= 75 ? 1 : 0) +
        (focusProgress >= 100 ? 1 : 0),
        4,
        STAR_FIELD.length
    );

    const visibleStars = STAR_FIELD.slice(0, starsLit).map((star) => localizeStar(star, resolvedLocale));
    const visibleIds = new Set(visibleStars.map((star) => star.id));
    const connectionProgress = clamp(permanentRichness * 0.7 + liveRichness * 0.55, 0, 1);
    const visibleConnections = CONSTELLATION_LINKS
        .filter(([from, to]) => visibleIds.has(from) && visibleIds.has(to))
        .slice(0, Math.max(0, Math.floor(CONSTELLATION_LINKS.length * connectionProgress)));

    const nextMilestoneBase = SKY_MILESTONES.find((milestone) => {
        if (milestone.requirement.sessions && sessionsCompleted < milestone.requirement.sessions) return true;
        if (milestone.requirement.minutes && totalMinutes < milestone.requirement.minutes) return true;
        if (milestone.requirement.streak && streak < milestone.requirement.streak) return true;
        return false;
    });
    const nextMilestone = nextMilestoneBase ? localizeMilestone(nextMilestoneBase, resolvedLocale) : null;

    return {
        visibleStars,
        visibleConnections,
        starsLit,
        constellationCount: Math.max(1, Math.ceil(visibleConnections.length / 3)),
        nebulaStrength: clamp(permanentRichness * 0.5 + (focusProgress >= 75 ? 0.35 : 0) + (streak >= 5 ? 0.12 : 0), 0.12, 1),
        orbitStrength: clamp(permanentRichness * 0.55 + (focusProgress >= 50 ? 0.2 : 0) + (focusProgress >= 75 ? 0.15 : 0), 0.1, 1),
        siriusPulse: focusProgress >= 100 ? 1 : clamp(0.35 + liveRichness * 0.45 + permanentRichness * 0.2, 0.35, 0.9),
        meteorReady: streak >= 5 || sessionsCompleted >= 24,
        rareNebula: streak >= 10 || totalMinutes >= 900,
        permanentRichness,
        combinedRichness,
        nextMilestone,
        nextMilestoneDelta: nextMilestoneBase
            ? getMilestoneDelta(nextMilestoneBase, { sessionsCompleted, streak, totalMinutes }, resolvedLocale)
            : SKY_LABELS.fullyAwakened[resolvedLocale],
        richnessLabel: permanentRichness < 0.2
            ? SKY_LABELS.richness.quiet[resolvedLocale]
            : permanentRichness < 0.45
                ? SKY_LABELS.richness.growing[resolvedLocale]
                : permanentRichness < 0.72
                    ? SKY_LABELS.richness.enriched[resolvedLocale]
                    : SKY_LABELS.richness.radiant[resolvedLocale],
        orbitLabel: permanentRichness < 0.25
            ? SKY_LABELS.orbit.faint[resolvedLocale]
            : permanentRichness < 0.55
                ? SKY_LABELS.orbit.stable[resolvedLocale]
                : SKY_LABELS.orbit.bright[resolvedLocale],
        rareEventLabel: streak >= 12 || sessionsCompleted >= 40
            ? SKY_LABELS.rareEvents.high[resolvedLocale]
            : streak >= 5 || sessionsCompleted >= 24
                ? SKY_LABELS.rareEvents.medium[resolvedLocale]
                : SKY_LABELS.rareEvents.low[resolvedLocale]
    };
}

export default function YourSkyScene({
    sessionsCompleted = 0,
    streak = 0,
    totalMinutes = 0,
    focusProgress = 0,
    compact = false,
    className = '',
}) {
    const [activeStarId, setActiveStarId] = useState('sirius-core');
    const locale = useLocale();
    const isTurkish = locale === 'tr';

    const skyState = useMemo(
        () => getSkySummary({ sessionsCompleted, streak, totalMinutes, focusProgress, locale }),
        [sessionsCompleted, streak, totalMinutes, focusProgress, locale]
    );

    const activeStar = skyState.visibleStars.find((star) => star.id === activeStarId) || skyState.visibleStars[0];
    const sceneHeight = compact ? 'aspect-[16/9]' : 'aspect-[16/10]';
    const statsCards = [
        {
            label: isTurkish ? 'Tamamlanan oturumlar' : 'Sessions completed',
            value: sessionsCompleted,
            detail: isTurkish ? 'Tamamlanan her odak bloğu bu sahneyi kalıcı olarak zenginleştirir.' : 'Each completed focus block permanently enriches the scene.'
        },
        {
            label: isTurkish ? 'Güncel seri' : 'Current streak',
            value: `${streak}d`,
            detail: isTurkish ? 'Seriler parlaklığı, nadirliği ve gökyüzünün zenginliğini artırır.' : 'Streaks increase brightness, rarity, and sky richness.'
        },
        {
            label: isTurkish ? 'Yanan yıldızlar' : 'Stars lit',
            value: skyState.starsLit,
            detail: isTurkish
                ? `${skyState.constellationCount} takımyıldızı kümesi oluşmaya başlıyor.`
                : `${skyState.constellationCount} constellation cluster${skyState.constellationCount === 1 ? '' : 's'} are beginning to form.`
        },
        {
            label: isTurkish ? 'Sıradaki açılım' : 'Next unlock',
            value: skyState.nextMilestone ? skyState.nextMilestone.label : (isTurkish ? 'Gökyüzü uyandı' : 'Sky awakened'),
            detail: skyState.nextMilestone ? skyState.nextMilestoneDelta : (isTurkish ? 'Gökyüzün en zengin temel seviyesine ulaştı.' : 'Your sky has reached its richest baseline.')
        },
    ];

    return (
        <div className={compact ? className : `card overflow-hidden ${className}`}>
            {!compact && (
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-[26px] font-bold tracking-tight" style={{ color: 'var(--theme-text, #0f172a)' }}>{isTurkish ? 'Gökyüzün' : 'Your Sky'}</h2>
                        <p className="mt-1 max-w-2xl text-[14px] leading-relaxed" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
                            {isTurkish
                                ? 'Her odak oturumuyla büyüyen yaşayan bir göksel sahne. Düzenin güçlendikçe yıldızlar çoğalır, takımyıldızları bağlanır ve nadir etkiler görünmeye başlar.'
                                : 'A living celestial scene that grows with each focus session. Stars gather, constellations connect, and rare effects appear as your consistency deepens.'}
                        </p>
                    </div>
                    <div className="rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ borderColor: 'var(--theme-border-light, #e2e8f0)', background: 'color-mix(in srgb, var(--theme-card, #ffffff) 78%, transparent)', color: 'var(--theme-primary, #0284c7)' }}>
                        {isTurkish ? 'Canlı göksel ödül döngüsü' : 'Live celestial reward loop'}
                    </div>
                </div>
            )}

            {compact && (
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-[16px] font-bold" style={{ color: 'var(--theme-text, #111827)' }}>{isTurkish ? 'Gökyüzün' : 'Your Sky'}</h3>
                        <p className="text-[12px]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{isTurkish ? 'Odaklandıkça gelişen sakin bir sahne.' : 'A calm scene that evolves as you focus.'}</p>
                    </div>
                    <div className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ background: 'var(--theme-primary-bg, #eef2ff)', color: 'var(--theme-primary, #0284c7)' }}>
                        {focusProgress > 0 ? `${Math.round(focusProgress)}% ${isTurkish ? 'canlı' : 'live'}` : (isTurkish ? 'ortam' : 'ambient')}
                    </div>
                </div>
            )}

            <div className={`relative ${sceneHeight} overflow-hidden rounded-[28px] border border-white/60 bg-[radial-gradient(circle_at_top,#ffffff_0%,#eef6ff_32%,#dfeeff_58%,#d7e7ff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgba(59,130,246,0.22),transparent_38%),radial-gradient(circle_at_32%_40%,rgba(125,211,252,0.22),transparent_28%),radial-gradient(circle_at_76%_48%,rgba(129,140,248,0.18),transparent_30%)]" />

                <motion.div
                    className="absolute left-[12%] top-[28%] h-[38%] w-[44%] rounded-full bg-sky-200/35 blur-3xl"
                    animate={{ opacity: [0.35, 0.55, 0.4], scale: [1, 1.08, 1] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ opacity: skyState.nebulaStrength * 0.65 }}
                />
                <motion.div
                    className="absolute right-[12%] top-[22%] h-[42%] w-[36%] rounded-full bg-indigo-200/25 blur-3xl"
                    animate={{ opacity: [0.2, 0.42, 0.28], scale: [0.96, 1.05, 1] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ opacity: skyState.nebulaStrength * 0.55 }}
                />

                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="orbitTrail" x1="0" y1="0" x2="100" y2="100">
                            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                            <stop offset="55%" stopColor="rgba(125,211,252,0.9)" />
                            <stop offset="100%" stopColor="rgba(96,165,250,0.2)" />
                        </linearGradient>
                    </defs>

                    <ellipse
                        cx="50"
                        cy="63"
                        rx={30 + skyState.orbitStrength * 12}
                        ry={12 + skyState.orbitStrength * 4}
                        fill="none"
                        stroke="url(#orbitTrail)"
                        strokeWidth={1.2 + skyState.orbitStrength * 0.7}
                        opacity={0.5 + skyState.orbitStrength * 0.35}
                    />
                    <ellipse
                        cx="56"
                        cy="59"
                        rx={20 + skyState.orbitStrength * 8}
                        ry={8 + skyState.orbitStrength * 2.5}
                        fill="none"
                        stroke="rgba(191,219,254,0.75)"
                        strokeWidth="0.8"
                        opacity={0.2 + skyState.orbitStrength * 0.35}
                    />

                    {skyState.visibleConnections.map(([from, to], index) => {
                        const start = STAR_FIELD.find((star) => star.id === from);
                        const end = STAR_FIELD.find((star) => star.id === to);

                        return (
                            <motion.line
                                key={`${from}-${to}`}
                                x1={start.x}
                                y1={start.y}
                                x2={end.x}
                                y2={end.y}
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 0.42 + skyState.combinedRichness * 0.4 }}
                                transition={{ duration: 0.8, delay: index * 0.06 }}
                                stroke="rgba(148,163,184,0.55)"
                                strokeWidth="0.45"
                                strokeLinecap="round"
                            />
                        );
                    })}
                </svg>

                {skyState.meteorReady && (
                    <motion.div
                        className="absolute left-[63%] top-[18%] h-[2px] w-[14%] rounded-full bg-gradient-to-r from-white via-sky-300 to-transparent"
                        initial={{ opacity: 0, x: -8, y: -8 }}
                        animate={{ opacity: [0, 0.65, 0], x: [0, 20, 32], y: [0, 8, 12] }}
                        transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 7, ease: 'easeOut' }}
                        style={{ rotate: '18deg' }}
                    />
                )}

                <motion.div
                    className="absolute left-1/2 top-[18%] h-16 w-16 -translate-x-1/2 rounded-full bg-white"
                    animate={{
                        opacity: [0.18, 0.28 + skyState.siriusPulse * 0.25, 0.18],
                        scale: [0.95, 1.05 + skyState.siriusPulse * 0.12, 0.95]
                    }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ boxShadow: '0 0 45px rgba(96, 165, 250, 0.45)' }}
                />
                <motion.div
                    className="absolute left-1/2 top-[18%] h-3 w-3 -translate-x-1/2 rounded-full bg-white"
                    animate={{ scale: [1, 1.18, 1], opacity: [0.9, 1, 0.9] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute left-1/2 top-[18%] h-[70px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-b from-transparent via-white to-transparent"
                    animate={{ opacity: [0.25, 0.7, 0.25], scaleY: [0.85, 1.05, 0.85] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div
                    className="absolute left-1/2 top-[18%] h-[2px] w-[70px] -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-white to-transparent"
                    animate={{ opacity: [0.25, 0.7, 0.25], scaleX: [0.85, 1.05, 0.85] }}
                    transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                />

                {skyState.visibleStars.map((star, index) => (
                    <motion.button
                        key={star.id}
                        type="button"
                        onMouseEnter={() => setActiveStarId(star.id)}
                        onFocus={() => setActiveStarId(star.id)}
                        onClick={() => setActiveStarId(star.id)}
                        className="absolute rounded-full outline-none"
                        style={{
                            left: `${star.x}%`,
                            top: `${star.y}%`,
                            width: `${star.size}px`,
                            height: `${star.size}px`,
                            transform: 'translate(-50%, -50%)',
                        }}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{
                            opacity: 0.75 + skyState.combinedRichness * 0.25,
                            scale: activeStarId === star.id ? 1.22 : 1,
                            boxShadow: activeStarId === star.id
                                ? '0 0 0 10px rgba(255,255,255,0.16), 0 0 32px rgba(96,165,250,0.65)'
                                : '0 0 24px rgba(96,165,250,0.55)'
                        }}
                        transition={{ duration: 0.35, delay: index * 0.04 }}
                        aria-label={star.label}
                    >
                        <motion.span
                            className="block h-full w-full rounded-full bg-white"
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 2.8 + index * 0.08, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    </motion.button>
                ))}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/70 to-transparent" />

                <div className="absolute right-4 top-4 max-w-[44%] rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md" style={{ borderColor: 'rgba(255,255,255,0.28)', background: 'color-mix(in srgb, var(--theme-card, #ffffff) 70%, transparent)' }}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{isTurkish ? 'Yıldız detayı' : 'Star detail'}</div>
                    <div className="mt-1 text-[14px] font-semibold" style={{ color: 'var(--theme-text, #1e293b)' }}>{activeStar?.label || (isTurkish ? 'Sirius çekirdeği' : 'Sirius Core')}</div>
                    <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{activeStar?.detail}</p>
                </div>

                {focusProgress >= 100 && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-sky-200 bg-white/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 shadow-md backdrop-blur-md"
                    >
                        {isTurkish ? 'Kalıcı gökyüzü gelişimi kaydedildi' : 'Permanent sky upgrade saved'}
                    </motion.div>
                )}
            </div>

            {!compact ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {statsCards.map((card) => (
                    <div key={card.label} className="rounded-2xl px-4 py-3" style={{ border: '1px solid var(--theme-border-light, #f1f5f9)', background: 'color-mix(in srgb, var(--theme-surface, #f8fafc) 82%, transparent)' }}>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{card.label}</div>
                        <div className="mt-2 text-[18px] font-bold" style={{ color: 'var(--theme-text, #111827)' }}>{card.value}</div>
                        <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>{card.detail}</p>
                    </div>
                ))}
            </div>
            ) : (
                <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl px-3 py-2" style={{ background: 'color-mix(in srgb, var(--theme-surface, #f8fafc) 90%, transparent)' }}>
                        <div className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{isTurkish ? 'Yıldızlar' : 'Stars lit'}</div>
                        <div className="mt-1 text-[15px] font-bold" style={{ color: 'var(--theme-text, #111827)' }}>{skyState.starsLit}</div>
                    </div>
                    <div className="rounded-xl px-3 py-2" style={{ background: 'color-mix(in srgb, var(--theme-surface, #f8fafc) 90%, transparent)' }}>
                        <div className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{isTurkish ? 'Seri' : 'Streak'}</div>
                        <div className="mt-1 text-[15px] font-bold" style={{ color: 'var(--theme-text, #111827)' }}>{streak}d</div>
                    </div>
                    <div className="rounded-xl px-3 py-2" style={{ background: 'color-mix(in srgb, var(--theme-surface, #f8fafc) 90%, transparent)' }}>
                        <div className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{isTurkish ? 'Sıradaki' : 'Next'}</div>
                        <div className="mt-1 truncate text-[13px] font-bold" style={{ color: 'var(--theme-text, #111827)' }}>{skyState.nextMilestone ? skyState.nextMilestone.label : (isTurkish ? 'Uyandı' : 'Awakened')}</div>
                    </div>
                </div>
            )}

            {!compact && skyState.nextMilestone && (
                <div className="mt-4 rounded-2xl px-4 py-3" style={{ border: '1px solid var(--theme-border-light, #f1f5f9)', background: 'var(--theme-card, #ffffff)' }}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{isTurkish ? 'Sıradaki göksel değişim' : 'Next celestial shift'}</div>
                    <div className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--theme-text, #111827)' }}>{skyState.nextMilestone.label}</div>
                    <p className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--theme-text-secondary, #64748b)' }}>
                        {skyState.nextMilestone.reward} {isTurkish ? 'Kalan:' : 'Remaining:'} {skyState.nextMilestoneDelta}
                    </p>
                </div>
            )}
        </div>
    );
}
