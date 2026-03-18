import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { minutesToDisplay } from '../../utils/helpers';

const STAR_FIELD = [
    { id: 'sirius-core', x: 50, y: 22, size: 14, label: 'Sirius Core', detail: 'The anchor light of your sky. It pulses most strongly when a focus session completes.' },
    { id: 'quiet-east', x: 66, y: 30, size: 8, label: 'East Quiet Star', detail: 'One of the early stars that appears as your sky wakes up.' },
    { id: 'quiet-west', x: 34, y: 34, size: 8, label: 'West Quiet Star', detail: 'A balancing star that brightens your calm baseline.' },
    { id: 'north-trace', x: 58, y: 16, size: 7, label: 'North Trace', detail: 'A subtle guide star pulled forward by consistency.' },
    { id: 'south-glint', x: 44, y: 43, size: 7, label: 'South Glint', detail: 'This star appears once your sessions begin to accumulate.' },
    { id: 'orbit-edge', x: 76, y: 42, size: 7, label: 'Orbit Edge', detail: 'A bright point that helps form your first orbit trail.' },
    { id: 'echo-point', x: 24, y: 49, size: 6, label: 'Echo Point', detail: 'A quieter star that deepens the atmosphere of your sky.' },
    { id: 'nebula-seed', x: 63, y: 54, size: 8, label: 'Nebula Seed', detail: 'This one feeds the soft nebula glow around your constellations.' },
    { id: 'horizon-lantern', x: 16, y: 60, size: 6, label: 'Horizon Lantern', detail: 'A faint horizon star unlocked by longer-term focus.' },
    { id: 'drift-line', x: 83, y: 58, size: 6, label: 'Drift Line', detail: 'A rare star that sharpens your orbit trails.' },
    { id: 'zenith-one', x: 39, y: 10, size: 6, label: 'Zenith One', detail: 'A high star reserved for richer skies and higher streaks.' },
    { id: 'zenith-two', x: 69, y: 12, size: 6, label: 'Zenith Two', detail: 'This star arrives when your sky starts feeling expansive.' },
    { id: 'hushed-arc', x: 29, y: 23, size: 5, label: 'Hushed Arc', detail: 'A soft star that fills the empty space between constellations.' },
    { id: 'silver-rest', x: 58, y: 69, size: 6, label: 'Silver Rest', detail: 'A calmer light that signals your sky is becoming permanent.' },
    { id: 'far-trace', x: 86, y: 23, size: 5, label: 'Far Trace', detail: 'A distant star that only appears in enriched skies.' },
    { id: 'veil-point', x: 11, y: 32, size: 5, label: 'Veil Point', detail: 'This one strengthens the nebula veil around the scene.' },
    { id: 'inner-orbit', x: 72, y: 69, size: 5, label: 'Inner Orbit', detail: 'A subtle marker inside your brightest orbital path.' },
    { id: 'deep-field', x: 22, y: 72, size: 5, label: 'Deep Field', detail: 'A late unlock that gives the sky more depth and stillness.' },
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
    { label: 'First constellation', requirement: { sessions: 3 }, reward: 'Constellation fragments start connecting.' },
    { label: 'Orbit trail', requirement: { sessions: 8, minutes: 180 }, reward: 'A soft orbit begins circling your sky.' },
    { label: 'Nebula veil', requirement: { sessions: 16, streak: 3 }, reward: 'Nebula glow deepens around your stars.' },
    { label: 'Meteor window', requirement: { sessions: 28, streak: 7 }, reward: 'Rare meteor sweeps begin appearing.' },
    { label: 'Sirius pulse', requirement: { sessions: 45, minutes: 1200, streak: 14 }, reward: 'Your Sirius star emits a stronger permanent pulse.' },
];

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function getMilestoneDelta(milestone, skyStats) {
    const missing = [];

    if (milestone.requirement.sessions && skyStats.sessionsCompleted < milestone.requirement.sessions) {
        missing.push(`${milestone.requirement.sessions - skyStats.sessionsCompleted} session${milestone.requirement.sessions - skyStats.sessionsCompleted === 1 ? '' : 's'}`);
    }

    if (milestone.requirement.minutes && skyStats.totalMinutes < milestone.requirement.minutes) {
        const remainingMinutes = milestone.requirement.minutes - skyStats.totalMinutes;
        missing.push(`${minutesToDisplay(remainingMinutes)} focus time`);
    }

    if (milestone.requirement.streak && skyStats.streak < milestone.requirement.streak) {
        missing.push(`${milestone.requirement.streak - skyStats.streak} streak day${milestone.requirement.streak - skyStats.streak === 1 ? '' : 's'}`);
    }

    return missing.join(' · ');
}

export function getSkySummary({ sessionsCompleted = 0, streak = 0, totalMinutes = 0, focusProgress = 0 }) {
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

    const visibleStars = STAR_FIELD.slice(0, starsLit);
    const visibleIds = new Set(visibleStars.map((star) => star.id));
    const connectionProgress = clamp(permanentRichness * 0.7 + liveRichness * 0.55, 0, 1);
    const visibleConnections = CONSTELLATION_LINKS
        .filter(([from, to]) => visibleIds.has(from) && visibleIds.has(to))
        .slice(0, Math.max(0, Math.floor(CONSTELLATION_LINKS.length * connectionProgress)));

    const nextMilestone = SKY_MILESTONES.find((milestone) => {
        if (milestone.requirement.sessions && sessionsCompleted < milestone.requirement.sessions) return true;
        if (milestone.requirement.minutes && totalMinutes < milestone.requirement.minutes) return true;
        if (milestone.requirement.streak && streak < milestone.requirement.streak) return true;
        return false;
    });

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
        nextMilestoneDelta: nextMilestone ? getMilestoneDelta(nextMilestone, { sessionsCompleted, streak, totalMinutes }) : 'Your sky is fully awakened.',
        richnessLabel: permanentRichness < 0.2 ? 'Quiet sky' : permanentRichness < 0.45 ? 'Growing sky' : permanentRichness < 0.72 ? 'Enriched sky' : 'Radiant sky',
        orbitLabel: permanentRichness < 0.25 ? 'Faint orbit traces' : permanentRichness < 0.55 ? 'Stable orbit ribbons' : 'Bright orbit architecture',
        rareEventLabel: streak >= 12 || sessionsCompleted >= 40
            ? 'High chance of meteors and strong Sirius pulses'
            : streak >= 5 || sessionsCompleted >= 24
                ? 'Meteors can now appear during richer sessions'
                : 'Rare celestial events unlock as your streak and session count grow'
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

    const skyState = useMemo(
        () => getSkySummary({ sessionsCompleted, streak, totalMinutes, focusProgress }),
        [sessionsCompleted, streak, totalMinutes, focusProgress]
    );

    const activeStar = skyState.visibleStars.find((star) => star.id === activeStarId) || skyState.visibleStars[0];
    const sceneHeight = compact ? 'aspect-[16/9]' : 'aspect-[16/10]';
    const statsCards = [
        {
            label: 'Sessions completed',
            value: sessionsCompleted,
            detail: 'Each completed focus block permanently enriches the scene.'
        },
        {
            label: 'Current streak',
            value: `${streak}d`,
            detail: 'Streaks increase brightness, rarity, and sky richness.'
        },
        {
            label: 'Stars lit',
            value: skyState.starsLit,
            detail: `${skyState.constellationCount} constellation cluster${skyState.constellationCount === 1 ? '' : 's'} are beginning to form.`
        },
        {
            label: 'Next unlock',
            value: skyState.nextMilestone ? skyState.nextMilestone.label : 'Sky awakened',
            detail: skyState.nextMilestone ? skyState.nextMilestoneDelta : 'Your sky has reached its richest baseline.'
        },
    ];

    return (
        <div className={compact ? className : `card overflow-hidden ${className}`}>
            {!compact && (
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-[26px] font-bold tracking-tight text-[#0f172a]">Your Sky</h2>
                        <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-slate-500">
                            A living celestial scene that grows with each focus session. Stars gather, constellations connect, and rare effects appear as your consistency deepens.
                        </p>
                    </div>
                    <div className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600">
                        Live celestial reward loop
                    </div>
                </div>
            )}

            {compact && (
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-[16px] font-bold text-[#111827]">Your Sky</h3>
                        <p className="text-[12px] text-slate-400">A calm scene that evolves as you focus.</p>
                    </div>
                    <div className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-600">
                        {focusProgress > 0 ? `${Math.round(focusProgress)}% live` : 'ambient'}
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

                <div className="absolute right-4 top-4 max-w-[44%] rounded-2xl border border-white/70 bg-white/68 px-4 py-3 shadow-lg backdrop-blur-md">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Star detail</div>
                    <div className="mt-1 text-[14px] font-semibold text-slate-800">{activeStar?.label || 'Sirius Core'}</div>
                    <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{activeStar?.detail}</p>
                </div>

                {focusProgress >= 100 && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-sky-200 bg-white/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 shadow-md backdrop-blur-md"
                    >
                        Permanent sky upgrade saved
                    </motion.div>
                )}
            </div>

            {!compact ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {statsCards.map((card) => (
                    <div key={card.label} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{card.label}</div>
                        <div className="mt-2 text-[18px] font-bold text-[#111827]">{card.value}</div>
                        <p className="mt-1 text-[12px] leading-relaxed text-slate-500">{card.detail}</p>
                    </div>
                ))}
            </div>
            ) : (
                <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Stars lit</div>
                        <div className="mt-1 text-[15px] font-bold text-[#111827]">{skyState.starsLit}</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Streak</div>
                        <div className="mt-1 text-[15px] font-bold text-[#111827]">{streak}d</div>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">Next</div>
                        <div className="mt-1 truncate text-[13px] font-bold text-[#111827]">{skyState.nextMilestone ? skyState.nextMilestone.label : 'Awakened'}</div>
                    </div>
                </div>
            )}

            {!compact && skyState.nextMilestone && (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-white px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Next celestial shift</div>
                    <div className="mt-1 text-[15px] font-semibold text-[#111827]">{skyState.nextMilestone.label}</div>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                        {skyState.nextMilestone.reward} Remaining: {skyState.nextMilestoneDelta}
                    </p>
                </div>
            )}
        </div>
    );
}
