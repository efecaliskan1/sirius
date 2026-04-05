import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
    collection,
    onSnapshot,
    query,
    where,
} from 'firebase/firestore';
import useAuthStore from '../store/authStore';
import { db } from '../firebase/config';
import { isRecentlyActive, timestampToMillis } from '../utils/social';
import { useLocale } from '../utils/i18n';

const LEADERBOARD_COPY = {
    en: {
        title: 'Global Leaderboard',
        subtitle: 'Live weekly focus time from members actively using Sirius',
        rank: 'Your Rank',
        unranked: 'Unranked',
        thisWeek: 'this week',
        yourFocus: 'Your Focus',
        activeMembers: 'active members are currently showing up on the live board.',
        error: 'Leaderboard is unavailable until public profile rules are enabled.',
        member: 'Member',
        focusTime: 'Focus Time',
        empty: 'No real study activity yet. Once members complete focus sessions, the leaderboard will populate automatically.',
        student: 'Student',
        you: 'You',
        activeNow: 'Active now',
        dayStreak: 'day streak',
        publicPresenceOn: 'Your public profile is visible on Sirius leaderboards and live study spaces.',
        publicPresenceOff: 'Your public profile is hidden until you explicitly choose to appear.',
        enablePublicPresence: 'Join the live board',
        disablePublicPresence: 'Hide my profile',
    },
    tr: {
        title: 'Global liderlik tablosu',
        subtitle: 'Sirius kullanan üyelerin canlı haftalık odak süreleri',
        rank: 'Sıralaman',
        unranked: 'Sıralama dışında',
        thisWeek: 'bu hafta',
        yourFocus: 'Odak süren',
        activeMembers: 'aktif üye şu anda canlı tabloda görünüyor.',
        error: 'Liderlik tablosu, herkese açık profil kuralları açılana kadar kullanılamıyor.',
        member: 'Üye',
        focusTime: 'Odak süresi',
        empty: 'Henüz gerçek çalışma verisi yok. Üyeler odak oturumu tamamladıkça tablo otomatik olarak dolacak.',
        student: 'Öğrenci',
        you: 'Sen',
        activeNow: 'Şu an aktif',
        dayStreak: 'günlük seri',
        publicPresenceOn: 'Herkese açık profilin Sirius liderlik tablosunda ve canlı çalışma alanlarında görünür.',
        publicPresenceOff: 'Herkese açık profilin sen özellikle açana kadar gizli kalır.',
        enablePublicPresence: 'Canlı tabloya katıl',
        disablePublicPresence: 'Profilimi gizle',
    },
};

export default function LeaderboardPage() {
    const user = useAuthStore((s) => s.user);
    const updateUser = useAuthStore((s) => s.updateUser);
    const isDark = (user?.theme || 'calm') === 'dark';
    const [entries, setEntries] = useState([]);
    const [error, setError] = useState('');
    const locale = useLocale();
    const copy = LEADERBOARD_COPY[locale] || LEADERBOARD_COPY.en;
    const isPublicPresenceEnabled = Boolean(user?.publicProfileEnabled);

    useEffect(() => {
        const leaderboardQuery = query(
            collection(db, 'publicProfiles'),
            where('publicProfileEnabled', '==', true)
        );

        const unsubscribe = onSnapshot(
            leaderboardQuery,
            (snapshot) => {
                const nextEntries = snapshot.docs
                    .map((docSnapshot) => ({
                        id: docSnapshot.id,
                        ...docSnapshot.data(),
                    }))
                    .filter((entry) => Boolean(entry.publicProfileEnabled))
                    .filter((entry) => (entry.weeklyFocusMinutes || 0) > 0);

                setEntries(nextEntries);
                setError('');
            },
            (snapshotError) => {
                console.error('Failed to load leaderboard', snapshotError);
                setError(copy.error);
            }
        );

        return unsubscribe;
    }, [copy.error]);

    const rankedEntries = useMemo(() => {
        return [...entries].sort((a, b) => {
            if ((b.weeklyFocusMinutes || 0) !== (a.weeklyFocusMinutes || 0)) {
                return (b.weeklyFocusMinutes || 0) - (a.weeklyFocusMinutes || 0);
            }
            return timestampToMillis(b.lastSeenAt) - timestampToMillis(a.lastSeenAt);
        });
    }, [entries]);

    const currentUserId = user?.id;
    const currentUserIndex = rankedEntries.findIndex((entry) => entry.id === currentUserId);
    const userRank = currentUserIndex >= 0 ? currentUserIndex + 1 : null;
    const currentUserEntry = currentUserIndex >= 0 ? rankedEntries[currentUserIndex] : null;
    const activeUsersThisWeek = rankedEntries.filter((entry) => isRecentlyActive(entry.lastSeenAt)).length;

    return (
        <div className="max-w-[800px] mx-auto pb-12">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <h1 className="text-[32px] font-extrabold tracking-tight" style={{ color: 'var(--theme-text, #111827)' }}>
                    {copy.title}
                </h1>
                <p className="font-medium text-[15px] mt-1" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>
                    {copy.subtitle}
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`p-6 rounded-2xl mb-8 border ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'} shadow-sm`}
            >
                <div className="flex items-center justify-between gap-6">
                    <div>
                        <h2 className="text-[14px] font-bold uppercase tracking-wider mb-1" style={{ color: isDark ? '#A5B4FC' : '#4F46E5' }}>
                            {copy.rank}
                        </h2>
                        <div className="text-[28px] font-extrabold" style={{ color: 'var(--theme-text, #111827)' }}>
                            {userRank ? `#${userRank}` : copy.unranked} <span className="text-[18px] font-medium opacity-60">{copy.thisWeek}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[14px] font-bold uppercase tracking-wider mb-1" style={{ color: isDark ? '#A5B4FC' : '#4F46E5' }}>
                            {copy.yourFocus}
                        </div>
                        <div className="text-[24px] font-extrabold" style={{ color: 'var(--theme-text, #111827)' }}>
                            {Math.floor((currentUserEntry?.weeklyFocusMinutes || user?.weeklyFocusMinutes || 0) / 60)}h {((currentUserEntry?.weeklyFocusMinutes || user?.weeklyFocusMinutes || 0) % 60)}m
                        </div>
                    </div>
                </div>
                <div className="mt-4 text-[13px] font-medium" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>
                    {activeUsersThisWeek} {copy.activeMembers}
                </div>
                <div className={`mt-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${isDark ? 'bg-white/5' : 'bg-white/70'} border ${isDark ? 'border-white/10' : 'border-indigo-100'}`}>
                    <div className="text-[13px] leading-relaxed" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>
                        {isPublicPresenceEnabled ? copy.publicPresenceOn : copy.publicPresenceOff}
                    </div>
                    <button
                        onClick={() => updateUser({ publicProfileEnabled: !isPublicPresenceEnabled })}
                        className={`shrink-0 rounded-xl px-3 py-2 text-[12px] font-bold transition-colors ${isDark ? 'bg-indigo-500/15 text-indigo-200' : 'bg-white text-indigo-700 border border-indigo-100'}`}
                    >
                        {isPublicPresenceEnabled ? copy.disablePublicPresence : copy.enablePublicPresence}
                    </button>
                </div>
            </motion.div>

            {error && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                    {error}
                </div>
            )}

            <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className={`px-6 py-4 border-b flex items-center font-bold text-[13px] uppercase tracking-wider ${isDark ? 'border-white/10 text-white/50' : 'border-slate-100 text-slate-400'}`}>
                    <div className="w-16">{copy.rank}</div>
                    <div className="flex-1">{copy.member}</div>
                    <div className="text-right">{copy.focusTime}</div>
                </div>

                {rankedEntries.length === 0 ? (
                    <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>
                        {copy.empty}
                    </div>
                ) : (
                    <div className="divide-y" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                        {rankedEntries.map((student, index) => {
                            const isTop3 = index < 3;
                            const isUser = student.id === currentUserId;
                            let rankDisplay = `#${index + 1}`;
                            if (index === 0) rankDisplay = '🥇';
                            else if (index === 1) rankDisplay = '🥈';
                            else if (index === 2) rankDisplay = '🥉';

                            const safeDisplayName = typeof student.displayName === 'string' && student.displayName.trim()
                                ? student.displayName
                                : copy.student;

                            return (
                                <motion.div
                                    key={student.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.12 + index * 0.04 }}
                                    className={`px-6 py-4 flex items-center transition-colors ${isUser
                                        ? (isDark ? 'bg-indigo-500/15' : 'bg-indigo-50/50')
                                        : (isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50')
                                        }`}
                                >
                                    <div className={`w-16 font-bold ${isTop3 ? 'text-2xl drop-shadow-sm' : 'text-lg'} ${isDark ? 'text-white/60' : 'text-slate-400'}`}>
                                        {rankDisplay}
                                    </div>
                                    <div className="flex-1 flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] ${isUser
                                            ? (isDark ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-indigo-500 text-white shadow-md shadow-indigo-200')
                                            : (isDark ? 'bg-white/10 text-white/80' : 'bg-slate-100 text-slate-600')
                                            }`}>
                                            {safeDisplayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[15px] flex items-center gap-2" style={{ color: 'var(--theme-text, #1E293B)' }}>
                                                {safeDisplayName}
                                                {isUser && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-500/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                                                        {copy.you}
                                                    </span>
                                                )}
                                                {isRecentlyActive(student.lastSeenAt) && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {copy.activeNow}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[12px]" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>
                                                {student.streakCount || 0} {copy.dayStreak} · {student.xp || 0} XP
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right font-bold text-[15px]" style={{ color: 'var(--theme-text-secondary, #64748B)' }}>
                                        {Math.floor((student.weeklyFocusMinutes || 0) / 60)}h {(student.weeklyFocusMinutes || 0) % 60}m
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
