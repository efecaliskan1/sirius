import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import { AMBIENT_SOUNDS, DEFAULT_POMODORO_SETTINGS, INPUT_LIMITS, MIN_FOCUS_SESSION_MINUTES } from '../utils/constants';
import { calculateCoins, calculateXP, checkNewBadges, getSessionStats } from '../utils/rewardEngine';
import { getDateKeyInTurkey, getToday, minutesToDisplay } from '../utils/helpers';
import { getWeekKey } from '../utils/social';
import { setAmbientVolume, startAmbientSound, stopAmbientSound } from '../utils/ambientSounds';
import { fillCopy, useLocale } from '../utils/i18n';
import { ensureBrowserNotificationPermission, showBrowserNotification } from '../utils/notifications';
import {
    clearPomodoroRuntime,
    getActiveRuntimeSnapshot,
    loadPomodoroRuntime,
    savePomodoroRuntime,
} from '../utils/pomodoroRuntime';

const SESSION_TYPES = [
    { key: 'focus', label: 'Focus' },
    { key: 'shortBreak', label: 'Short Break' },
    { key: 'longBreak', label: 'Long Break' },
];

const PRESET_OPTIONS = [
    {
        key: '25/5',
        label: '25 / 5',
        description: 'Classic rhythm for everyday studying.',
        settings: {
            workTime: 25,
            shortBreakTime: 5,
            longBreakTime: 15,
            roundsBeforeLongBreak: 4,
        },
    },
    {
        key: '50/10',
        label: '50 / 10',
        description: 'Longer study blocks with calmer recovery.',
        settings: {
            workTime: 50,
            shortBreakTime: 10,
            longBreakTime: 20,
            roundsBeforeLongBreak: 3,
        },
    },
    {
        key: 'custom',
        label: 'Custom',
        description: 'Tune the cadence around your own workload.',
    },
];

const POMODORO_COPY = {
    en: {
        sessionTypes: { focus: 'Focus', shortBreak: 'Short Break', longBreak: 'Long Break' },
        soundLabels: { none: 'Silent', rain: 'Rain', cafe: 'Cafe', fire: 'Fire', wave: 'Waves' },
        heroStats: {
            sessionsToday: 'Sessions today',
            deepFocusStars: 'Deep focus stars',
            focusTimeToday: 'Focus time today',
            currentStreak: 'Current streak',
        },
        ambient: 'Ambient',
        ambientSound: 'Ambient sound',
        deepFocusMode: 'Deep Focus Mode',
        normalMode: 'Normal Mode',
        linkedCourse: 'Linked course',
        linkedTask: 'Linked task',
        noCourse: 'No course',
        noTask: 'No task',
        start: 'Start',
        pause: 'Pause',
        reset: 'Reset',
        skip: 'Skip',
        stop: 'Stop',
        deepFocus: 'Deep Focus',
        returnToDashboard: 'Return to dashboard',
        tabWarning: 'Stay in this Sirius space for a smoother deep focus session.',
        leaveConfirm: 'Are you sure you want to leave Deep Focus?',
        confirmExit: 'Confirm exit',
        wait: 'Wait...',
        stay: 'Stay',
        sessionComplete: 'Session complete',
        skyUpgrade: 'Sirius saved a new sky upgrade',
        deepCompletion: 'This deep focus block permanently brightened your personal sky.',
        normalCompletion: 'This completed session added steady progress to your focus record.',
        sessionLabel: 'Session label',
        coins: 'Coins',
        focus: 'Focus',
        focusFinishedTitle: 'Focus session complete',
        focusFinishedBody: '{label} finished. {minutes} of focus time was saved.',
        breakFinishedTitle: 'Break complete',
        breakFinishedBody: 'Your next focus block is ready.',
        sessionNote: 'Session note',
        notePlaceholder: 'Capture what moved forward in this session.',
        streakNow: 'Streak now',
        continue: 'Continue',
        focusSession: 'Focus Session',
        badgeUnlocked: 'Badge unlocked',
        breakComplete: 'Break complete. Sirius is ready for another focus block.',
        breakSkipped: 'Break skipped. Your next focus block is ready.',
        focusSkipped: 'Focus block skipped. Sirius moved you to the next recovery phase.',
        modeTag: { deep: 'Deep focus', normal: 'Normal mode' },
    },
    tr: {
        sessionTypes: { focus: 'Odak', shortBreak: 'Kısa mola', longBreak: 'Uzun mola' },
        soundLabels: { none: 'Sessiz', rain: 'Yağmur', cafe: 'Kafe', fire: 'Ateş', wave: 'Dalgalar' },
        heroStats: {
            sessionsToday: 'Bugünkü oturumlar',
            deepFocusStars: 'Derin odak yıldızları',
            focusTimeToday: 'Bugünkü odak süresi',
            currentStreak: 'Güncel seri',
        },
        ambient: 'Ortam',
        ambientSound: 'Ortam sesi',
        deepFocusMode: 'Derin odak modu',
        normalMode: 'Normal mod',
        linkedCourse: 'Bağlı ders',
        linkedTask: 'Bağlı görev',
        noCourse: 'Ders yok',
        noTask: 'Görev yok',
        start: 'Başlat',
        pause: 'Duraklat',
        reset: 'Sıfırla',
        skip: 'Geç',
        stop: 'Durdur',
        deepFocus: 'Derin odak',
        returnToDashboard: 'Panele dön',
        tabWarning: 'Daha akıcı bir derin odak için bu Sirius alanında kal.',
        leaveConfirm: 'Derin odaktan çıkmak istediğine emin misin?',
        confirmExit: 'Çıkışı onayla',
        wait: 'Bekle...',
        stay: 'Kal',
        sessionComplete: 'Oturum tamamlandı',
        skyUpgrade: 'Sirius gökyüzüne yeni bir gelişme ekledi',
        deepCompletion: 'Bu derin odak oturumu kişisel gökyüzünü kalıcı olarak güçlendirdi.',
        normalCompletion: 'Bu oturum, odak kayıtlarına düzenli bir ilerleme ekledi.',
        sessionLabel: 'Oturum başlığı',
        coins: 'Jeton',
        focus: 'Odak',
        focusFinishedTitle: 'Odak oturumu tamamlandı',
        focusFinishedBody: '{label} tamamlandı. {minutes} odak süresi kaydedildi.',
        breakFinishedTitle: 'Mola tamamlandı',
        breakFinishedBody: 'Sıradaki odak bloğun hazır.',
        sessionNote: 'Oturum notu',
        notePlaceholder: 'Bu oturumda nelerin ilerlediğini kısaca not et.',
        streakNow: 'Yeni seri',
        continue: 'Devam et',
        focusSession: 'Odak oturumu',
        badgeUnlocked: 'Rozet açıldı',
        breakComplete: 'Mola tamamlandı. Sirius yeni odak bloğu için hazır.',
        breakSkipped: 'Mola geçildi. Sıradaki odak bloğun hazır.',
        focusSkipped: 'Odak bloğu geçildi. Sirius seni bir sonraki mola aşamasına taşıdı.',
        modeTag: { deep: 'Derin odak', normal: 'Normal mod' },
    },
};

const DEEP_SPACE_STARS = [
    { left: '8%', top: '18%', size: 2, delay: 0.2 },
    { left: '16%', top: '32%', size: 3, delay: 1.1 },
    { left: '24%', top: '12%', size: 2, delay: 1.6 },
    { left: '34%', top: '26%', size: 2, delay: 0.9 },
    { left: '42%', top: '10%', size: 4, delay: 2.1 },
    { left: '55%', top: '18%', size: 2, delay: 0.5 },
    { left: '64%', top: '30%', size: 3, delay: 1.8 },
    { left: '72%', top: '14%', size: 2, delay: 2.4 },
    { left: '81%', top: '26%', size: 3, delay: 0.8 },
    { left: '90%', top: '18%', size: 2, delay: 1.3 },
    { left: '76%', top: '56%', size: 2, delay: 0.4 },
    { left: '62%', top: '66%', size: 4, delay: 2.7 },
    { left: '48%', top: '74%', size: 2, delay: 1.9 },
    { left: '28%', top: '70%', size: 3, delay: 1.4 },
    { left: '12%', top: '62%', size: 2, delay: 2.3 },
];

const TIMER_RADIUS = 136;
const TIMER_CENTER = 160;
function sanitizeRuntimeSelection(value) {
    return typeof value === 'string' ? value : '';
}

function sanitizeRuntimeAmbientSound(value) {
    if (typeof value !== 'string') {
        return 'none';
    }

    return AMBIENT_SOUNDS.some((sound) => sound.id === value) ? value : 'none';
}

function getMaxMinutesForType(type) {
    if (type === 'focus') return 120;
    if (type === 'longBreak') return 60;
    return 30;
}

function getMinMinutesForType(type) {
    if (type === 'focus') return MIN_FOCUS_SESSION_MINUTES;
    return 1;
}

function clampSessionMinutes(type, value, fallback) {
    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue)) {
        return fallback;
    }

    const minMinutes = getMinMinutesForType(type);
    const maxMinutes = getMaxMinutesForType(type);
    return Math.min(maxMinutes, Math.max(minMinutes, Math.round(parsedValue)));
}

function detectPreset(settings) {
    const workTime = settings.workTime || settings.focusDuration || 25;
    const shortBreakTime = settings.shortBreakTime || settings.shortBreakDuration || 5;
    const longBreakTime = settings.longBreakTime || settings.longBreakDuration || 15;
    const roundsBeforeLongBreak = settings.roundsBeforeLongBreak || settings.sessionsUntilLongBreak || 4;

    const matchingPreset = PRESET_OPTIONS.find((preset) => {
        if (!preset.settings) return false;
        return (
            preset.settings.workTime === workTime &&
            preset.settings.shortBreakTime === shortBreakTime &&
            preset.settings.longBreakTime === longBreakTime &&
            preset.settings.roundsBeforeLongBreak === roundsBeforeLongBreak
        );
    });

    return matchingPreset?.key || 'custom';
}

function getNextSessionState(currentType, currentRound, safeSettings) {
    if (currentType === 'focus') {
        if (currentRound >= safeSettings.roundsBeforeLongBreak) {
            return { type: 'longBreak', round: 1 };
        }

        return { type: 'shortBreak', round: currentRound + 1 };
    }

    return { type: 'focus', round: currentRound };
}

function formatClock(timeLeft) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return {
        minutes: minutes.toString().padStart(2, '0'),
        seconds: seconds.toString().padStart(2, '0'),
    };
}

function playCompletionChime() {
    if (typeof window === 'undefined') return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const notes = [
        { frequency: 880, duration: 0.12, delay: 0 },
        { frequency: 1174, duration: 0.14, delay: 0.14 },
    ];

    notes.forEach(({ frequency, duration, delay }) => {
        const oscillator = ctx.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
        oscillator.connect(gain);
        oscillator.start(ctx.currentTime + delay);
        oscillator.stop(ctx.currentTime + delay + duration);
    });

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

    window.setTimeout(() => {
        ctx.close().catch(() => { });
    }, 500);
}

export default function PomodoroPage() {
    const user = useAuthStore((s) => s.user);
    const applyFocusSessionRewards = useAuthStore((s) => s.applyFocusSessionRewards);
    const setPresence = useAuthStore((s) => s.setPresence);
    const courses = useAppStore((s) => s.courses);
    const tasks = useAppStore((s) => s.tasks);
    const sessions = useAppStore((s) => s.sessions);
    const badges = useAppStore((s) => s.badges);
    const rewardState = useAppStore((s) => s.rewardState);
    const addSession = useAppStore((s) => s.addSession);
    const updateSession = useAppStore((s) => s.updateSession);
    const addBadge = useAppStore((s) => s.addBadge);
    const addToast = useAppStore((s) => s.addToast);
    const flushCloudStudySync = useAppStore((s) => s.flushCloudStudySync);

    const [searchParams] = useSearchParams();

    const [sessionType, setSessionType] = useState('focus');
    const [experienceMode, setExperienceMode] = useState(() => searchParams.get('mode') === 'deep' ? 'deep' : 'normal');
    const [settings, setSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('studywithme_pomodoro_settings');
            return saved ? JSON.parse(saved) : DEFAULT_POMODORO_SETTINGS;
        } catch {
            return DEFAULT_POMODORO_SETTINGS;
        }
    });
    const [selectedPreset, setSelectedPreset] = useState(() => detectPreset(DEFAULT_POMODORO_SETTINGS));
    const [selectedCourseId, setSelectedCourseId] = useState(() => searchParams.get('courseId') || '');
    const [selectedTaskId, setSelectedTaskId] = useState(() => searchParams.get('taskId') || '');
    const [ambientSound, setAmbientSound] = useState('none');
    const [ambientVolume, setAmbientVolumeState] = useState(45);
    const [isRunning, setIsRunning] = useState(false);
    const [timeLeft, setTimeLeft] = useState((DEFAULT_POMODORO_SETTINGS.workTime || 25) * 60);
    const [round, setRound] = useState(1);
    const [showCompletion, setShowCompletion] = useState(null);
    const [sessionNote, setSessionNote] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [tabSwitchWarning, setTabSwitchWarning] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [exitConfirmReady, setExitConfirmReady] = useState(false);
    const locale = useLocale();
    const copy = POMODORO_COPY[locale] || POMODORO_COPY.en;
    const activeThemeKey = user?.theme || 'calm';
    const isDark = activeThemeKey === 'dark';
    const isBarbie = activeThemeKey === 'barbie';

    const intervalRef = useRef(null);
    const svgRef = useRef(null);
    const targetEndTimeRef = useRef(null);
    const exitConfirmTimeoutRef = useRef(null);
    const hasRestoredRuntimeRef = useRef(false);

    const safeSettings = useMemo(() => ({
        workTime: clampSessionMinutes('focus', settings.workTime || settings.focusDuration || 25, 25),
        shortBreakTime: clampSessionMinutes('shortBreak', settings.shortBreakTime || settings.shortBreakDuration || 5, 5),
        longBreakTime: clampSessionMinutes('longBreak', settings.longBreakTime || settings.longBreakDuration || 15, 15),
        roundsBeforeLongBreak: Math.min(8, Math.max(1, Math.round(Number(settings.roundsBeforeLongBreak || settings.sessionsUntilLongBreak || 4)))),
    }), [settings]);
    const safeCourses = useMemo(() => (Array.isArray(courses) ? courses : []), [courses]);
    const safeTasks = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks]);
    const safeSessions = useMemo(() => (Array.isArray(sessions) ? sessions : []), [sessions]);
    const safeBadges = useMemo(() => (Array.isArray(badges) ? badges : []), [badges]);

    const getDuration = useCallback((type) => {
        switch (type) {
            case 'focus':
                return safeSettings.workTime * 60;
            case 'shortBreak':
                return safeSettings.shortBreakTime * 60;
            case 'longBreak':
                return safeSettings.longBreakTime * 60;
            default:
                return safeSettings.workTime * 60;
        }
    }, [safeSettings]);

    const userCourses = useMemo(
        () => safeCourses.filter((course) => course?.userId === user?.id),
        [safeCourses, user?.id]
    );
    const openTasks = useMemo(
        () => safeTasks.filter((task) => task?.userId === user?.id && !task.completed),
        [safeTasks, user?.id]
    );
    const availableTasks = useMemo(
        () => (selectedCourseId ? openTasks.filter((task) => task.courseId === selectedCourseId) : openTasks),
        [openTasks, selectedCourseId]
    );
    const selectedCourse = userCourses.find((course) => course.id === selectedCourseId);
    const selectedTask = openTasks.find((task) => task.id === selectedTaskId);

    const currentSessionTitle = selectedTask?.title
        || selectedCourse?.courseName
        || copy.focusSession;

    const deepFocusSessionsCount = useMemo(
        () => safeSessions.filter((session) => session?.userId === user?.id && session.completed && session.mode === 'deep').length,
        [safeSessions, user?.id]
    );
    const todayKey = getToday();
    const completedTodaySessions = useMemo(
        () => safeSessions.filter((session) => {
            if (!session?.completed || session?.userId !== user?.id) {
                return false;
            }

            const sessionDateKey = session.sessionDateKey || (session.createdAt ? getDateKeyInTurkey(session.createdAt) : '');
            return sessionDateKey === todayKey;
        }),
        [safeSessions, todayKey, user?.id]
    );
    const activeRuntimeSession = useMemo(
        () => getActiveRuntimeSnapshot(loadPomodoroRuntime(), user?.id, todayKey),
        [isRunning, sessionType, timeLeft, todayKey, user?.id]
    );
    const completedTodayFocusMinutes = completedTodaySessions.reduce(
        (sum, session) => sum + Number(session?.actualMinutes || session?.plannedMinutes || 0),
        0
    );
    const completedTodaySessionCount = completedTodaySessions.length;
    const savedDailyFocusMinutes = rewardState?.dailyDateKey === todayKey
        ? Number(rewardState?.dailyFocusMinutes || 0)
        : 0;
    const savedDailySessionsCount = rewardState?.dailyDateKey === todayKey
        ? Number(rewardState?.dailySessionsCount || 0)
        : 0;
    const todayFocusMinutes = Math.max(savedDailyFocusMinutes, completedTodayFocusMinutes)
        + (activeRuntimeSession?.elapsedMinutes || 0);
    const todaySessionCount = Math.max(savedDailySessionsCount, completedTodaySessionCount)
        + (activeRuntimeSession?.countsAsSession ? 1 : 0);

    const totalDuration = getDuration(sessionType);
    const runningProgress = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0;
    const selectedMinutes = Math.max(getMinMinutesForType(sessionType), Math.round(timeLeft / 60));
    const idleProgress = (selectedMinutes / getMaxMinutesForType(sessionType)) * 100;
    const progress = isRunning ? runningProgress : idleProgress;
    const circumference = 2 * Math.PI * TIMER_RADIUS;
    const strokeDashoffset = Number.isNaN(progress) ? 0 : circumference - (progress / 100) * circumference;
    const angleInRadians = ((progress / 100) * 360 - 90) * (Math.PI / 180);
    const handleX = TIMER_CENTER + TIMER_RADIUS * Math.cos(angleInRadians);
    const handleY = TIMER_CENTER + TIMER_RADIUS * Math.sin(angleInRadians);
    const clock = formatClock(timeLeft);

    const heroStats = [
        { label: copy.heroStats.sessionsToday, value: todaySessionCount },
        { label: copy.heroStats.deepFocusStars, value: deepFocusSessionsCount },
        { label: copy.heroStats.focusTimeToday, value: minutesToDisplay(todayFocusMinutes) },
        { label: copy.heroStats.currentStreak, value: `${user?.streakCount || 0}d` },
    ];

    const soundOptions = AMBIENT_SOUNDS;

    const getDynamicColor = useCallback(() => {
        if (sessionType !== 'focus') {
            return sessionType === 'shortBreak' ? '#22C55E' : '#06B6D4';
        }

        if (selectedCourse?.color) return selectedCourse.color;

        const ratio = selectedMinutes / 120;
        const r = Math.round(79 + (ratio * (168 - 79)));
        const g = Math.round(110 - (ratio * 110));
        const b = Math.round(247 - (ratio * (247 - 215)));
        return `rgb(${r}, ${g}, ${b})`;
    }, [selectedCourse?.color, selectedMinutes, sessionType]);

    const activeColor = getDynamicColor();

    const sendPomodoroNotification = useCallback((title, body) => {
        showBrowserNotification(title, {
            body,
            tag: `pomodoro-${sessionType}-${Date.now()}`,
        });
    }, [sessionType]);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 700);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!user?.id || hasRestoredRuntimeRef.current) return;

        hasRestoredRuntimeRef.current = true;
        const runtime = loadPomodoroRuntime();

        if (!runtime || runtime.userId !== user.id) return;

        const restoredSessionType = SESSION_TYPES.some((type) => type.key === runtime.sessionType)
            ? runtime.sessionType
            : 'focus';
        const restoredMode = runtime.experienceMode === 'deep' ? 'deep' : 'normal';
        const restoredRound = Math.min(8, Math.max(1, Number(runtime.round) || 1));
        const restoredTargetEndTime = Number.isFinite(runtime.targetEndTime) ? runtime.targetEndTime : null;
        const fallbackTimeLeft = getDuration(restoredSessionType);
        const restoredTimeLeft = Math.max(1, Math.round(Number(runtime.timeLeft) || fallbackTimeLeft));

        targetEndTimeRef.current = restoredTargetEndTime;
        setSessionType(restoredSessionType);
        setExperienceMode(restoredMode);
        const restoredCourseId = sanitizeRuntimeSelection(runtime.selectedCourseId);
        const restoredTaskId = sanitizeRuntimeSelection(runtime.selectedTaskId);
        const restoredAmbientSound = sanitizeRuntimeAmbientSound(runtime.ambientSound);

        setSelectedCourseId(restoredCourseId);
        setSelectedTaskId(restoredTaskId);
        setAmbientSound(restoredAmbientSound);
        setAmbientVolumeState(Math.max(0, Math.min(100, Number(runtime.ambientVolume) || 45)));
        setRound(restoredRound);
        setSessionNote(typeof runtime.sessionNote === 'string' ? runtime.sessionNote : '');
        setTimeLeft(restoredTimeLeft);
        setIsRunning(Boolean(runtime.isRunning && restoredTargetEndTime));

        if (runtime.isRunning && restoredAmbientSound !== 'none') {
            startAmbientSound(restoredAmbientSound, Math.max(0, Math.min(100, Number(runtime.ambientVolume) || 45)) / 100).catch(() => { });
        }
    }, [getDuration, user?.id]);

    useEffect(() => {
        if (!user?.id || !hasRestoredRuntimeRef.current) return;

        savePomodoroRuntime({
            userId: user.id,
            sessionType,
            experienceMode,
            selectedCourseId,
            selectedTaskId,
            ambientSound,
            ambientVolume,
            isRunning,
            timeLeft,
            round,
            sessionNote,
            targetEndTime: targetEndTimeRef.current,
            durationSeconds: totalDuration,
            sessionDateKey: todayKey,
        });
    }, [
        ambientSound,
        ambientVolume,
        experienceMode,
        isRunning,
        round,
        selectedCourseId,
        selectedTaskId,
        sessionNote,
        sessionType,
        timeLeft,
        todayKey,
        totalDuration,
        user?.id,
    ]);

    useEffect(() => {
        localStorage.setItem('studywithme_pomodoro_settings', JSON.stringify({
            ...safeSettings,
            focusDuration: safeSettings.workTime,
            shortBreakDuration: safeSettings.shortBreakTime,
            longBreakDuration: safeSettings.longBreakTime,
            sessionsUntilLongBreak: safeSettings.roundsBeforeLongBreak,
        }));
    }, [safeSettings]);

    useEffect(() => {
        setSelectedPreset(detectPreset(safeSettings));
    }, [safeSettings]);

    useEffect(() => {
        if (!isRunning) {
            setTimeLeft(getDuration(sessionType));
        }
    }, [getDuration, isRunning, sessionType]);

    const applyPreset = (presetKey) => {
        if (presetKey === 'custom') {
            setSelectedPreset('custom');
            return;
        }

        const preset = PRESET_OPTIONS.find((item) => item.key === presetKey);
        if (!preset?.settings) return;

        setSelectedPreset(preset.key);
        setSettings((previous) => ({
            ...previous,
            ...preset.settings,
            focusDuration: preset.settings.workTime,
            shortBreakDuration: preset.settings.shortBreakTime,
            longBreakDuration: preset.settings.longBreakTime,
            sessionsUntilLongBreak: preset.settings.roundsBeforeLongBreak,
        }));

        if (!isRunning) {
            targetEndTimeRef.current = null;
            const nextMinutes = sessionType === 'focus'
                ? preset.settings.workTime
                : sessionType === 'shortBreak'
                    ? preset.settings.shortBreakTime
                    : preset.settings.longBreakTime;
            setTimeLeft(nextMinutes * 60);
        }
    };

    const handleSessionComplete = useCallback(async () => {
        setIsRunning(false);
        targetEndTimeRef.current = null;
        stopAmbientSound();

        playCompletionChime();

        if (sessionType === 'focus') {
            const plannedMinutes = safeSettings.workTime;
            const actualMinutes = plannedMinutes;
            const rewardCoins = calculateCoins(actualMinutes);
            const rewardXp = calculateXP('session', actualMinutes);
            const sessionDate = getToday();
            const course = userCourses.find((item) => item.id === selectedCourseId);
            const task = openTasks.find((item) => item.id === selectedTaskId);

            sendPomodoroNotification(
                copy.focusFinishedTitle,
                fillCopy(copy.focusFinishedBody, {
                    label: currentSessionTitle,
                    minutes: minutesToDisplay(actualMinutes),
                })
            );

            const newSession = addSession({
                userId: user.id,
                courseId: selectedCourseId || null,
                taskId: selectedTaskId || null,
                plannedMinutes,
                actualMinutes,
                completed: true,
                mode: experienceMode,
                label: currentSessionTitle,
                sessionDateKey: sessionDate,
            });

            await flushCloudStudySync();

            const weekKey = getWeekKey();
            const rewardedUser = await applyFocusSessionRewards({
                actualMinutes,
                sessionDate,
                weekKey,
            });

            setPresence({
                focusingNow: false,
                currentSessionTitle: '',
                weeklyFocusMinutes: rewardedUser?.weeklyFocusMinutes || actualMinutes,
                weeklyFocusWeekKey: rewardedUser?.weeklyFocusWeekKey || weekKey,
                totalFocusMinutes: rewardedUser?.totalFocusMinutes || actualMinutes,
                xp: rewardedUser?.xp || rewardXp,
                streakCount: rewardedUser?.streakCount || 0,
                lastActiveDate: rewardedUser?.lastActiveDate || sessionDate,
            }).catch((error) => console.error('Failed to update study room presence', error));

            setShowCompletion({
                sessionId: newSession.id,
                coins: rewardCoins,
                xp: rewardXp,
                courseName: course?.courseName || null,
                taskName: task?.title || null,
                minutes: actualMinutes,
                streak: rewardedUser?.streakCount || 0,
                mode: experienceMode,
                label: currentSessionTitle,
            });
            setSessionNote('');

            const allSessions = [...safeSessions, newSession];
            const stats = getSessionStats(allSessions, safeCourses);
            stats.streak = rewardedUser?.streakCount || 0;
            const existingKeys = safeBadges.map((badge) => badge.badgeKey);
            const newBadges = checkNewBadges(stats, existingKeys);

            for (const badge of newBadges) {
                addBadge({ userId: user.id, badgeKey: badge.badgeKey });
                setTimeout(() => {
                    addToast({ type: 'reward', icon: badge.icon, message: `${copy.badgeUnlocked}: ${badge.badgeName}!` });
                }, 1200);
            }

            await flushCloudStudySync();

            const nextSession = getNextSessionState(sessionType, round, safeSettings);
            setSessionType(nextSession.type);
            setRound(nextSession.round);
            setTimeLeft(getDuration(nextSession.type));
        } else {
            sendPomodoroNotification(copy.breakFinishedTitle, copy.breakFinishedBody);
            setSessionType('focus');
            setTimeLeft(getDuration('focus'));
            setPresence({ focusingNow: false, currentSessionTitle: '' }).catch(() => { });
            addToast({ type: 'success', icon: '☕', message: copy.breakComplete });
        }
    }, [
        addBadge,
        addSession,
        addToast,
        experienceMode,
        getDuration,
        openTasks,
        round,
        safeSettings,
        safeBadges,
        safeCourses,
        safeSessions,
        selectedCourseId,
        selectedTaskId,
        sessionType,
        setPresence,
        applyFocusSessionRewards,
        flushCloudStudySync,
        user,
        userCourses,
        currentSessionTitle,
        copy.badgeUnlocked,
        copy.breakFinishedBody,
        copy.breakFinishedTitle,
        copy.breakComplete,
        copy.focusFinishedBody,
        copy.focusFinishedTitle,
        sendPomodoroNotification,
    ]);

    const syncTimeLeft = useCallback(() => {
        if (!targetEndTimeRef.current) return false;

        const remainingMs = targetEndTimeRef.current - Date.now();

        if (remainingMs <= 0) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            setTimeLeft(0);
            void handleSessionComplete();
            return true;
        }

        setTimeLeft(Math.ceil(remainingMs / 1000));
        return false;
    }, [handleSessionComplete]);

    useEffect(() => {
        if (isRunning) {
            if (!targetEndTimeRef.current) {
                targetEndTimeRef.current = Date.now() + (timeLeft * 1000);
            }

            syncTimeLeft();
            intervalRef.current = setInterval(syncTimeLeft, 1000);
        }

        return () => {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        };
    }, [isRunning, syncTimeLeft, timeLeft]);

    useEffect(() => {
        if (!isRunning) return undefined;

        const handleVisibilityRefresh = () => {
            if (!document.hidden) {
                syncTimeLeft();
            }
        };

        window.addEventListener('focus', handleVisibilityRefresh);
        document.addEventListener('visibilitychange', handleVisibilityRefresh);

        return () => {
            window.removeEventListener('focus', handleVisibilityRefresh);
            document.removeEventListener('visibilitychange', handleVisibilityRefresh);
        };
    }, [isRunning, syncTimeLeft]);

    useEffect(() => {
        if (!isRunning || experienceMode !== 'deep') return undefined;

        const handleLeave = () => {
            if (document.hidden) {
                setTabSwitchWarning(true);
            } else {
                setTimeout(() => setTabSwitchWarning(false), 1600);
            }
        };

        document.addEventListener('visibilitychange', handleLeave);
        return () => document.removeEventListener('visibilitychange', handleLeave);
    }, [experienceMode, isRunning]);

    useEffect(() => {
        if (!showExitConfirm) return undefined;

        setExitConfirmReady(false);
        exitConfirmTimeoutRef.current = setTimeout(() => {
            setExitConfirmReady(true);
        }, 2500);

        return () => {
            clearTimeout(exitConfirmTimeoutRef.current);
            exitConfirmTimeoutRef.current = null;
        };
    }, [showExitConfirm]);

    useEffect(() => {
        if (!user?.id) return;

        if (isRunning && sessionType === 'focus') {
            setPresence({
                focusingNow: true,
                currentSessionTitle,
            }).catch((error) => console.error('Failed to mark user as focusing', error));
            return;
        }

        setPresence({
            focusingNow: false,
            currentSessionTitle: '',
        }).catch(() => { });
    }, [currentSessionTitle, isRunning, sessionType, setPresence, user?.id]);

    const handleStartOrResume = () => {
        setShowCompletion(null);
        setTabSwitchWarning(false);
        void ensureBrowserNotificationPermission();
        if (!targetEndTimeRef.current) {
            targetEndTimeRef.current = Date.now() + (timeLeft * 1000);
        }
        setIsRunning(true);
        if (ambientSound !== 'none') {
            startAmbientSound(ambientSound, ambientVolume / 100).catch(() => { });
        }
    };

    const handlePause = useCallback(() => {
        if (targetEndTimeRef.current) {
            const remainingMs = Math.max(targetEndTimeRef.current - Date.now(), 0);
            setTimeLeft(Math.ceil(remainingMs / 1000));
        }

        targetEndTimeRef.current = null;
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsRunning(false);
        stopAmbientSound();
    }, []);

    const resetTimer = () => {
        handlePause();
        clearPomodoroRuntime();
        setRound(1);
        setSessionType('focus');
        setTimeLeft(getDuration('focus'));
        setShowCompletion(null);
        setTabSwitchWarning(false);
        setShowExitConfirm(false);
        setExitConfirmReady(false);
        setPresence({ focusingNow: false, currentSessionTitle: '' }).catch(() => { });
    };

    const handleSkip = () => {
        handlePause();
        clearPomodoroRuntime();
        setShowCompletion(null);

        const nextSession = getNextSessionState(sessionType, round, safeSettings);
        setSessionType(nextSession.type);
        setRound(nextSession.round);
        setTimeLeft(getDuration(nextSession.type));

        if (sessionType === 'focus') {
            addToast({ type: 'success', icon: '⏭️', message: copy.focusSkipped });
        } else {
            addToast({ type: 'success', icon: '⏭️', message: copy.breakSkipped });
        }
    };

    const requestExitDeepMode = () => {
        if (!isRunning) {
            setExperienceMode('normal');
            return;
        }

        setShowExitConfirm(true);
    };

    const confirmExitDeepMode = () => {
        if (!exitConfirmReady) return;
        handlePause();
        clearPomodoroRuntime();
        stopAmbientSound();
        setExperienceMode('normal');
        setShowExitConfirm(false);
        setExitConfirmReady(false);
        setTabSwitchWarning(false);
    };

    const cancelExitDeepMode = () => {
        setShowExitConfirm(false);
        setExitConfirmReady(false);
    };

    const handleAmbientSoundChange = async (nextSound) => {
        setAmbientSound(nextSound);

        if (nextSound === 'none') {
            stopAmbientSound();
            return;
        }

        await startAmbientSound(nextSound, ambientVolume / 100);
    };

    const handleAmbientVolumeChange = (nextVolume) => {
        const parsedVolume = Math.max(0, Math.min(100, Number(nextVolume) || 0));
        setAmbientVolumeState(parsedVolume);

        if (ambientSound !== 'none') {
            setAmbientVolume(parsedVolume / 100);
        }
    };

    const updateTimeFromPointer = useCallback((event) => {
        if (!svgRef.current) return;

        const svg = svgRef.current;
        const point = svg.createSVGPoint();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;

        point.x = clientX;
        point.y = clientY;

        const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());
        const dx = svgPoint.x - TIMER_CENTER;
        const dy = svgPoint.y - TIMER_CENTER;
        let angle = Math.atan2(dy, dx);
        angle += Math.PI / 2;

        if (angle < 0) angle += 2 * Math.PI;

        const maxMinutes = getMaxMinutesForType(sessionType);
        let nextMinutes = Math.round((angle / (2 * Math.PI)) * maxMinutes);
        const minMinutes = getMinMinutesForType(sessionType);
        if (nextMinutes < minMinutes) nextMinutes = minMinutes;

        setTimeLeft(nextMinutes * 60);
        setSelectedPreset('custom');
        setSettings((previous) => {
            const next = { ...previous };

            if (sessionType === 'focus') {
                next.workTime = nextMinutes;
                next.focusDuration = nextMinutes;
            } else if (sessionType === 'shortBreak') {
                next.shortBreakTime = nextMinutes;
                next.shortBreakDuration = nextMinutes;
            } else {
                next.longBreakTime = nextMinutes;
                next.longBreakDuration = nextMinutes;
            }

            return next;
        });

        targetEndTimeRef.current = null;
    }, [sessionType]);

    const handleDrag = useCallback((event) => {
        if (isRunning || !isDragging || !svgRef.current) return;
        updateTimeFromPointer(event);
    }, [isDragging, isRunning, updateTimeFromPointer]);

    const beginDrag = useCallback((event) => {
        if (isRunning || !svgRef.current) return;

        const svg = svgRef.current;
        const point = svg.createSVGPoint();
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        const clientY = event.touches ? event.touches[0].clientY : event.clientY;

        point.x = clientX;
        point.y = clientY;

        const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());
        const dx = svgPoint.x - TIMER_CENTER;
        const dy = svgPoint.y - TIMER_CENTER;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (Math.abs(distance - TIMER_RADIUS) > 42) return;
        if (event.cancelable) event.preventDefault();

        setIsDragging(true);
        updateTimeFromPointer(event);
    }, [isRunning, updateTimeFromPointer]);

    useEffect(() => {
        if (!isDragging) return undefined;

        const stopDrag = () => setIsDragging(false);
        window.addEventListener('mousemove', handleDrag);
        window.addEventListener('mouseup', stopDrag);
        window.addEventListener('touchmove', handleDrag, { passive: false });
        window.addEventListener('touchend', stopDrag);

        return () => {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', stopDrag);
            window.removeEventListener('touchmove', handleDrag);
            window.removeEventListener('touchend', stopDrag);
        };
    }, [handleDrag, isDragging]);

    useEffect(() => () => {
        clearInterval(intervalRef.current);
        clearTimeout(exitConfirmTimeoutRef.current);
        stopAmbientSound();
    }, []);

    if (isLoading) {
        return (
            <div className="mx-auto max-w-6xl">
                <div className="mb-8 h-24 rounded-[28px] bg-slate-100/80 animate-pulse" />
                <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                    <div className="h-[520px] rounded-[32px] bg-slate-100/80 animate-pulse" />
                    <div className="space-y-6">
                        <div className="h-56 rounded-[28px] bg-slate-100/80 animate-pulse" />
                        <div className="h-56 rounded-[28px] bg-slate-100/80 animate-pulse" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={experienceMode === 'deep' ? '' : 'mx-auto max-w-6xl'}>
            <AnimatePresence>
                {showCompletion && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-md"
                        onClick={() => setShowCompletion(null)}
                    >
                        <motion.div
                            initial={{ y: 20 }}
                            animate={{ y: 0 }}
                            className="w-full max-w-md rounded-[32px] border border-white/70 bg-white/95 p-7 shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="mb-5 flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-500">
                                        {copy.sessionComplete}
                                    </div>
                                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                                        {copy.skyUpgrade}
                                    </h2>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                        {showCompletion.mode === 'deep'
                                            ? copy.deepCompletion
                                            : copy.normalCompletion}
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-sky-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                                    {showCompletion.mode === 'deep' ? copy.modeTag.deep : copy.modeTag.normal}
                                </div>
                            </div>

                            <div className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-5">
                                <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    {copy.sessionLabel}
                                </div>
                                <div className="mt-1 text-lg font-semibold text-slate-900">{showCompletion.label}</div>
                                {(showCompletion.courseName || showCompletion.taskName) && (
                                    <div className="mt-2 text-sm text-slate-500">
                                        {[showCompletion.courseName, showCompletion.taskName].filter(Boolean).join(' · ')}
                                    </div>
                                )}

                                <div className="mt-5 grid grid-cols-3 gap-3">
                                    <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                                        <div className="text-lg font-bold text-slate-900">+{showCompletion.coins}</div>
                                        <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">{copy.coins}</div>
                                    </div>
                                    <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                                        <div className="text-lg font-bold text-slate-900">+{showCompletion.xp}</div>
                                        <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">XP</div>
                                    </div>
                                    <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm">
                                        <div className="text-lg font-bold text-slate-900">{minutesToDisplay(showCompletion.minutes)}</div>
                                        <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">{copy.focus}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5">
                                <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                    {copy.sessionNote}
                                </label>
                                <textarea
                                    className="input min-h-[96px] resize-none !rounded-[24px] !px-4 !py-3 text-sm"
                                    placeholder={copy.notePlaceholder}
                                    value={sessionNote}
                                    onChange={(event) => setSessionNote(event.target.value.slice(0, INPUT_LIMITS.longNote))}
                                    maxLength={INPUT_LIMITS.longNote}
                                />
                            </div>

                            <div className="mt-6 flex items-center justify-between">
                                <div className="text-sm font-medium text-slate-500">
                                    {copy.streakNow} <span className="font-bold text-slate-900">{showCompletion.streak}d</span>
                                </div>
                                <button
                                    onClick={() => {
                                        if (sessionNote.trim()) {
                                            updateSession(showCompletion.sessionId, { note: sessionNote.trim() });
                                        }
                                        setShowCompletion(null);
                                    }}
                                    className="btn-primary justify-center rounded-2xl px-6 py-3"
                                >
                                    {copy.continue}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {experienceMode === 'deep' ? (
                    <motion.section
                        key="deep-mode"
                        initial={{ opacity: 0, scale: 0.985 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.985 }}
                        className="fixed inset-0 z-40 overflow-hidden bg-[#081124] px-6 py-6 shadow-[0_30px_120px_rgba(8,17,36,0.55)]"
                    >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_34%),radial-gradient(circle_at_20%_30%,rgba(129,140,248,0.16),transparent_22%),radial-gradient(circle_at_80%_70%,rgba(14,165,233,0.1),transparent_24%),linear-gradient(180deg,#07101f_0%,#0a1630_50%,#09152a_100%)]" />
                        <div className="absolute inset-0 opacity-80">
                            {DEEP_SPACE_STARS.map((star, index) => (
                                <motion.span
                                    key={`${star.left}-${star.top}-${index}`}
                                    className="absolute rounded-full bg-white"
                                    style={{
                                        left: star.left,
                                        top: star.top,
                                        width: star.size,
                                        height: star.size,
                                        boxShadow: '0 0 14px rgba(191,219,254,0.8)',
                                    }}
                                    animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.2, 0.9] }}
                                    transition={{ duration: 3.8 + star.delay, repeat: Infinity, ease: 'easeInOut' }}
                                />
                            ))}
                        </div>
                        <motion.div
                            className="absolute left-1/2 top-[18%] h-64 w-64 -translate-x-1/2 rounded-full blur-3xl"
                            animate={{ scale: [0.92, 1.04, 0.92], opacity: [0.35, 0.55, 0.35] }}
                            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                            style={{ background: `radial-gradient(circle, ${activeColor} 0%, rgba(59,130,246,0.08) 55%, transparent 78%)` }}
                        />

                        <div className="relative z-10 flex min-h-screen flex-col">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                                    {copy.deepFocusMode}
                                </div>
                                <div className="w-full rounded-[24px] border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md lg:max-w-md">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300/70">
                                            {copy.ambient}
                                        </span>
                                        <span className="text-xs font-medium text-slate-300/70">
                                            {ambientVolume}%
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {soundOptions.map((sound) => (
                                            <button
                                                key={sound.id}
                                                onClick={() => handleAmbientSoundChange(sound.id)}
                                                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all"
                                                style={ambientSound === sound.id
                                                    ? {
                                                        borderRadius: '9999px',
                                                        border: '2px solid #1a1a1a',
                                                        background: '#FCD34D',
                                                        color: '#1a1a1a',
                                                        boxShadow: '2px 2px 0 #1a1a1a',
                                                    }
                                                    : {
                                                        borderRadius: '9999px',
                                                        border: '2px solid rgba(255,255,255,0.4)',
                                                        background: 'rgba(255,255,255,0.06)',
                                                        color: 'rgba(255,255,255,0.85)',
                                                    }}
                                            >
                                                <span className="mr-1.5">{sound.emoji}</span>
                                                {copy.soundLabels[sound.id] || sound.label}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={ambientVolume}
                                        onChange={(event) => handleAmbientVolumeChange(event.target.value)}
                                        className="ambient-slider ambient-slider-light mt-3 w-full"
                                    />
                                </div>
                            </div>

                            <AnimatePresence>
                                {tabSwitchWarning && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="mx-auto mt-6 rounded-full border border-amber-300/20 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100"
                                    >
                                        {copy.tabWarning}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {showExitConfirm && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="mx-auto mt-5 flex flex-wrap items-center justify-center gap-3 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-slate-200 backdrop-blur-md"
                                    >
                                        <span>{copy.leaveConfirm}</span>
                                        <button
                                            onClick={confirmExitDeepMode}
                                            disabled={!exitConfirmReady}
                                            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${exitConfirmReady ? 'bg-white text-slate-900' : 'bg-white/10 text-slate-400'}`}
                                        >
                                            {exitConfirmReady ? copy.confirmExit : copy.wait}
                                        </button>
                                        <button
                                            onClick={cancelExitDeepMode}
                                            className="rounded-full border border-white/12 px-4 py-1.5 text-xs font-semibold text-slate-200"
                                        >
                                            {copy.stay}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex flex-1 flex-col items-center justify-center px-1 text-center sm:px-4">
                                <div className="relative mx-auto flex h-[min(78vw,360px)] w-[min(78vw,360px)] items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-[0_0_80px_rgba(59,130,246,0.16)] backdrop-blur-md sm:h-[360px] sm:w-[360px]">
                                    <svg
                                        ref={svgRef}
                                        className={`absolute inset-0 h-full w-full -rotate-90 ${!isRunning ? 'cursor-pointer' : ''}`}
                                        viewBox="0 0 320 320"
                                        onMouseDown={beginDrag}
                                        onTouchStart={beginDrag}
                                    >
                                        <circle
                                            cx={TIMER_CENTER}
                                            cy={TIMER_CENTER}
                                            r={TIMER_RADIUS}
                                            fill="none"
                                            stroke="rgba(255,255,255,0.08)"
                                            strokeWidth="8"
                                        />
                                        <motion.circle
                                            cx={TIMER_CENTER}
                                            cy={TIMER_CENTER}
                                            r={TIMER_RADIUS}
                                            fill="none"
                                            stroke={activeColor}
                                            strokeWidth="9"
                                            strokeLinecap="round"
                                            strokeDasharray={circumference}
                                            animate={{ strokeDashoffset }}
                                            transition={{ duration: 0.45 }}
                                            style={{ filter: `drop-shadow(0 0 18px ${activeColor})` }}
                                        />
                                    </svg>

                                    {!isRunning && (
                                        <motion.button
                                            type="button"
                                            className="absolute z-10 h-8 w-8 rounded-full border-4 border-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                                            style={{
                                                backgroundColor: activeColor,
                                                left: `${(handleX / 320) * 100}%`,
                                                top: `${(handleY / 320) * 100}%`,
                                                transform: 'translate(-50%, -50%)',
                                            }}
                                            onMouseDown={beginDrag}
                                            onTouchStart={beginDrag}
                                            animate={{ scale: isDragging ? 1.15 : 1 }}
                                        />
                                    )}

                                    <div className="relative z-10 flex flex-col items-center">
                                        <motion.div
                                            animate={{ scale: isRunning ? [1, 1.015, 1] : 1 }}
                                            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                                            className="text-[clamp(3.6rem,14vw,5.5rem)] font-semibold tracking-[-0.08em] text-white"
                                        >
                                            {clock.minutes}:{clock.seconds}
                                        </motion.div>
                                    </div>
                                </div>

                                <div className="mt-10 flex w-full max-w-3xl flex-wrap items-center justify-center gap-3 sm:gap-4">
                                    <button
                                        onClick={isRunning ? handlePause : handleStartOrResume}
                                        className="min-w-[140px] rounded-full bg-white px-8 py-3 text-sm font-semibold text-slate-900 shadow-[0_18px_45px_rgba(255,255,255,0.14)] transition-transform hover:-translate-y-0.5"
                                    >
                                        {isRunning ? copy.pause : copy.start}
                                    </button>
                                    <button
                                        onClick={resetTimer}
                                        className="min-w-[140px] rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-slate-100"
                                    >
                                        {copy.stop}
                                    </button>
                                    <button
                                        onClick={requestExitDeepMode}
                                        className="min-w-[180px] rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-slate-100"
                                    >
                                        {copy.returnToDashboard}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                ) : (
                    <motion.section
                        key="normal-mode"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mx-auto max-w-7xl"
                    >
                        <div className="mb-6 flex justify-end">
                            <div
                                className="inline-flex rounded-full p-1.5 shadow-sm"
                                style={{
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : isBarbie ? 'rgba(225,29,114,0.18)' : 'rgba(226,232,240,1)'}`,
                                    background: isDark ? 'rgba(15,23,42,0.72)' : isBarbie ? 'rgba(255, 244, 250, 0.92)' : 'rgba(255,255,255,0.8)',
                                }}
                            >
                                <button
                                    onClick={() => setExperienceMode('normal')}
                                    className="rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm"
                                    style={{
                                        background: isDark ? 'rgba(99,102,241,0.88)' : isBarbie ? 'linear-gradient(135deg, #E11D74 0%, #EC4899 100%)' : '#0f172a',
                                        color: '#ffffff',
                                    }}
                                >
                                    {copy.normalMode}
                                </button>
                                <button
                                    onClick={() => setExperienceMode('deep')}
                                    className="rounded-full px-5 py-2.5 text-sm font-semibold transition-colors"
                                    style={{ color: isDark ? 'rgba(226,232,240,0.7)' : isBarbie ? '#A61B64' : '#64748b' }}
                                >
                                    {copy.deepFocusMode}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                                <div
                                    className="overflow-hidden rounded-[24px]"
                                    style={{
                                        border: 'var(--bb-border-w) solid var(--bb-ink)',
                                        background: 'var(--bb-card)',
                                        boxShadow: '5px 5px 0 var(--bb-shadow)',
                                    }}
                                >
                                    <div className="px-6 pb-7 pt-6">
                                        <div className="mb-6 flex flex-wrap items-center gap-2">
                                            {SESSION_TYPES.map((type) => (
                                                <button
                                                    key={type.key}
                                                    onClick={() => {
                                                        if (!isRunning) {
                                                            setSessionType(type.key);
                                                            setShowCompletion(null);
                                                            targetEndTimeRef.current = null;
                                                        }
                                                    }}
                                                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all"
                                                    style={sessionType === type.key
                                                        ? {
                                                            borderRadius: '999px',
                                                            border: '2.5px solid var(--bb-ink)',
                                                            background: 'var(--bb-accent-1)',
                                                            color: 'var(--bb-ink)',
                                                            boxShadow: '3px 3px 0 var(--bb-shadow)',
                                                        }
                                                        : {
                                                            borderRadius: '999px',
                                                            border: '2.5px solid var(--bb-ink)',
                                                            background: 'var(--bb-card)',
                                                            color: 'var(--bb-ink)',
                                                        }}
                                                >
                                                    {copy.sessionTypes[type.key] || type.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="grid gap-8 lg:grid-cols-[0.95fr_0.95fr] lg:items-center">
                                            <div className="flex justify-center">
                                                <div className="relative h-[min(72vw,320px)] w-[min(72vw,320px)] select-none sm:h-[320px] sm:w-[320px]">
                                                    <svg
                                                        ref={svgRef}
                                                        className={`h-full w-full ${!isRunning ? 'cursor-pointer' : ''}`}
                                                        viewBox="0 0 320 320"
                                                        onMouseDown={beginDrag}
                                                        onTouchStart={beginDrag}
                                                    >
                                                        <defs>
                                                            <linearGradient id="pomodoroProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                                <stop offset="0%" stopColor={activeColor} />
                                                                <stop offset="100%" stopColor="#7dd3fc" />
                                                            </linearGradient>
                                                        </defs>
                                                        <circle
                                                            cx={TIMER_CENTER}
                                                            cy={TIMER_CENTER}
                                                            r={TIMER_RADIUS}
                                                            fill="none"
                                                            stroke="rgba(148,163,184,0.18)"
                                                            strokeWidth="12"
                                                        />
                                                        <motion.circle
                                                            transform={`rotate(-90 ${TIMER_CENTER} ${TIMER_CENTER})`}
                                                            cx={TIMER_CENTER}
                                                            cy={TIMER_CENTER}
                                                            r={TIMER_RADIUS}
                                                            fill="none"
                                                            stroke="url(#pomodoroProgressGradient)"
                                                            strokeWidth="12"
                                                            strokeLinecap="round"
                                                            strokeDasharray={circumference}
                                                            animate={{ strokeDashoffset }}
                                                            transition={{ duration: isDragging ? 0 : 0.45, ease: 'easeOut' }}
                                                            style={{ filter: `drop-shadow(0 0 14px ${activeColor})` }}
                                                        />
                                                    </svg>

                                                    {!isRunning && (
                                                        <motion.button
                                                            type="button"
                                                            className="absolute z-10 h-8 w-8 rounded-full border-4 border-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
                                                            style={{
                                                                backgroundColor: activeColor,
                                                                left: `${(handleX / 320) * 100}%`,
                                                                top: `${(handleY / 320) * 100}%`,
                                                                transform: 'translate(-50%, -50%)',
                                                            }}
                                                            onMouseDown={beginDrag}
                                                            onTouchStart={beginDrag}
                                                            animate={{ scale: isDragging ? 1.15 : 1 }}
                                                        />
                                                    )}

                                                    <div
                                                        className="absolute inset-6 flex flex-col items-center justify-center rounded-full"
                                                        style={{
                                                            background: 'var(--bb-card)',
                                                            border: '2.5px solid var(--bb-ink)',
                                                            boxShadow: 'inset 3px 3px 0 var(--bb-shadow)',
                                                        }}
                                                    >
                                                        <div className="text-[clamp(3.6rem,14vw,5.2rem)] font-extrabold tracking-[-0.08em]" style={{ color: 'var(--bb-ink)' }}>
                                                            {clock.minutes}:{clock.seconds}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div
                                                    className="rounded-[20px] p-4"
                                                    style={{
                                                        border: '2.5px solid var(--bb-ink)',
                                                        background: 'var(--bb-paper)',
                                                        boxShadow: '3px 3px 0 var(--bb-shadow)',
                                                    }}
                                                >
                                                    <div className="flex flex-wrap gap-2">
                                                        {PRESET_OPTIONS.map((preset) => (
                                                            <button
                                                                key={preset.key}
                                                                onClick={() => applyPreset(preset.key)}
                                                                className="px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all"
                                                                style={selectedPreset === preset.key
                                                                    ? {
                                                                        borderRadius: '999px',
                                                                        border: '2.5px solid var(--bb-ink)',
                                                                        background: 'var(--bb-accent-1)',
                                                                        color: 'var(--bb-ink)',
                                                                        boxShadow: '2px 2px 0 var(--bb-shadow)',
                                                                    }
                                                                    : {
                                                                        borderRadius: '999px',
                                                                        border: '2.5px solid var(--bb-ink)',
                                                                        background: 'var(--bb-card)',
                                                                        color: 'var(--bb-ink)',
                                                                    }}
                                                            >
                                                                {preset.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div
                                                    className="rounded-[20px] p-4"
                                                    style={{
                                                        border: '2.5px solid var(--bb-ink)',
                                                        background: 'var(--bb-card)',
                                                        boxShadow: '3px 3px 0 var(--bb-shadow)',
                                                    }}
                                                >
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <label className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: 'var(--bb-ink)' }}>
                                                                {copy.ambientSound}
                                                            </label>
                                                            <span className="text-xs font-bold" style={{ color: 'var(--bb-ink)', opacity: 0.65 }}>
                                                                {ambientVolume}%
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {soundOptions.map((sound) => (
                                                                <button
                                                                    key={sound.id}
                                                                    onClick={() => handleAmbientSoundChange(sound.id)}
                                                                    className="px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all"
                                                                    style={ambientSound === sound.id
                                                                        ? {
                                                                            borderRadius: '999px',
                                                                            border: '2px solid var(--bb-ink)',
                                                                            background: 'var(--bb-accent-1)',
                                                                            color: 'var(--bb-ink)',
                                                                            boxShadow: '2px 2px 0 var(--bb-shadow)',
                                                                        }
                                                                        : {
                                                                            borderRadius: '999px',
                                                                            border: '2px solid var(--bb-ink)',
                                                                            background: 'var(--bb-paper)',
                                                                            color: 'var(--bb-ink)',
                                                                        }}
                                                                >
                                                                    <span className="mr-1.5" style={{ fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",emoji' }}>{sound.emoji}</span>
                                                                    {copy.soundLabels[sound.id] || sound.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            value={ambientVolume}
                                                            onChange={(event) => handleAmbientVolumeChange(event.target.value)}
                                                            className="ambient-slider w-full"
                                                        />
                                                    </div>
                                                </div>
                                                <div
                                                    className="rounded-[20px] p-4"
                                                    style={{
                                                        border: '2.5px solid var(--bb-ink)',
                                                        background: 'var(--bb-card)',
                                                        boxShadow: '3px 3px 0 var(--bb-shadow)',
                                                    }}
                                                >
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="label">{copy.linkedCourse}</label>
                                                            <select
                                                                className="input !rounded-[18px]"
                                                                value={selectedCourseId}
                                                                onChange={(event) => {
                                                                    setSelectedCourseId(event.target.value);
                                                                    setSelectedTaskId('');
                                                                }}
                                                                disabled={isRunning}
                                                            >
                                                                <option value="">{copy.noCourse}</option>
                                                                {userCourses.map((course) => (
                                                                    <option key={course.id} value={course.id}>
                                                                        {course.icon} {course.courseName}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="label">{copy.linkedTask}</label>
                                                            <select
                                                                className="input !rounded-[18px]"
                                                                value={selectedTaskId}
                                                                onChange={(event) => setSelectedTaskId(event.target.value)}
                                                                disabled={isRunning}
                                                            >
                                                                <option value="">{copy.noTask}</option>
                                                                {availableTasks.map((task) => (
                                                                    <option key={task.id} value={task.id}>
                                                                        {task.title}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    {heroStats.map((stat, i) => {
                                                        const accents = ['var(--bb-accent-2)', 'var(--bb-accent-3)', 'var(--bb-accent-4)', 'var(--bb-accent-1)'];
                                                        const bg = accents[i % accents.length];
                                                        return (
                                                            <div
                                                                key={stat.label}
                                                                className="px-4 py-3"
                                                                style={{
                                                                    borderRadius: '16px',
                                                                    border: '2.5px solid var(--bb-ink)',
                                                                    background: bg,
                                                                    boxShadow: '3px 3px 0 var(--bb-shadow)',
                                                                }}
                                                            >
                                                                <div className="text-[10px] font-extrabold uppercase tracking-[0.16em]" style={{ color: 'var(--bb-ink)', opacity: 0.7 }}>
                                                                    {stat.label}
                                                                </div>
                                                                <div className="mt-1.5 text-2xl font-extrabold tracking-tight" style={{ color: 'var(--bb-ink)' }}>
                                                                    {stat.value}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                            <button
                                                onClick={isRunning ? handlePause : handleStartOrResume}
                                                className="px-4 py-3 text-sm font-extrabold uppercase tracking-wider"
                                                style={{
                                                    borderRadius: '14px',
                                                    border: '2.5px solid var(--bb-ink)',
                                                    background: 'var(--bb-accent-1)',
                                                    color: 'var(--bb-ink)',
                                                    boxShadow: '3px 3px 0 var(--bb-shadow)',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {isRunning ? copy.pause : copy.start}
                                            </button>
                                            <button
                                                onClick={resetTimer}
                                                className="px-4 py-3 text-sm font-extrabold uppercase tracking-wider"
                                                style={{
                                                    borderRadius: '14px',
                                                    border: '2.5px solid var(--bb-ink)',
                                                    background: 'var(--bb-card)',
                                                    color: 'var(--bb-ink)',
                                                    boxShadow: '3px 3px 0 var(--bb-shadow)',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {copy.reset}
                                            </button>
                                            <button
                                                onClick={handleSkip}
                                                className="px-4 py-3 text-sm font-extrabold uppercase tracking-wider"
                                                style={{
                                                    borderRadius: '14px',
                                                    border: '2.5px solid var(--bb-ink)',
                                                    background: 'var(--bb-card)',
                                                    color: 'var(--bb-ink)',
                                                    boxShadow: '3px 3px 0 var(--bb-shadow)',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {copy.skip}
                                            </button>
                                            <button
                                                onClick={() => setExperienceMode('deep')}
                                                className="px-4 py-3 text-sm font-extrabold uppercase tracking-wider"
                                                style={{
                                                    borderRadius: '14px',
                                                    border: '2.5px solid var(--bb-ink)',
                                                    background: 'var(--bb-accent-3)',
                                                    color: 'var(--bb-ink)',
                                                    boxShadow: '3px 3px 0 var(--bb-shadow)',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {copy.deepFocus}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>
        </div>
    );
}
