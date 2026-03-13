import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import { DEFAULT_POMODORO_SETTINGS, COINS_PER_SESSION, XP_PER_SESSION, AMBIENT_SOUNDS } from '../utils/constants';
import { checkNewBadges, getSessionStats, getLevelFromXP, getCompanionStage } from '../utils/rewardEngine';
import { minutesToDisplay } from '../utils/helpers';
import { startAmbientSound, stopAmbientSound } from '../utils/ambientSounds';

const SESSION_TYPES = [
    { key: 'focus', label: 'Focus', color: '#4F6EF7' },
    { key: 'shortBreak', label: 'Short Break', color: '#3BAF75' },
    { key: 'longBreak', label: 'Long Break', color: '#06B6D4' },
];

export default function PomodoroPage() {
    const user = useAuthStore((s) => s.user);
    const updateUser = useAuthStore((s) => s.updateUser);
    const courses = useAppStore((s) => s.courses);
    const tasks = useAppStore((s) => s.tasks);
    const sessions = useAppStore((s) => s.sessions);
    const badges = useAppStore((s) => s.badges);
    const addSession = useAppStore((s) => s.addSession);
    const updateSession = useAppStore((s) => s.updateSession);
    const addBadge = useAppStore((s) => s.addBadge);
    const addToast = useAppStore((s) => s.addToast);

    const [searchParams] = useSearchParams();

    const [sessionType, setSessionType] = useState('focus');
    const [settings, setSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('studywithme_pomodoro_settings');
            return saved ? JSON.parse(saved) : DEFAULT_POMODORO_SETTINGS;
        } catch { return DEFAULT_POMODORO_SETTINGS; }
    });

    // Validate settings in case of old cache
    const safeSettings = {
        workTime: settings.workTime || settings.focusDuration || 25,
        shortBreakTime: settings.shortBreakTime || settings.shortBreakDuration || 5,
        longBreakTime: settings.longBreakTime || settings.longBreakDuration || 15,
        roundsBeforeLongBreak: settings.roundsBeforeLongBreak || 4
    };

    const [selectedCourseId, setSelectedCourseId] = useState(() => searchParams.get('courseId') || '');
    const [selectedTaskId, setSelectedTaskId] = useState(() => searchParams.get('taskId') || '');
    const [isRunning, setIsRunning] = useState(false);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [timeLeft, setTimeLeft] = useState(safeSettings.workTime * 60);
    const [round, setRound] = useState(1);
    const [showSettings, setShowSettings] = useState(false);
    const [showCompletion, setShowCompletion] = useState(null);
    const [sessionNote, setSessionNote] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);

    const intervalRef = useRef(null);
    const bellAudioRef = useRef(null);
    const svgRef = useRef(null);

    // Initial loading animation
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 900);
        return () => clearTimeout(timer);
    }, []);

    const getDuration = useCallback((type) => {
        switch (type) {
            case 'focus': return safeSettings.workTime * 60;
            case 'shortBreak': return safeSettings.shortBreakTime * 60;
            case 'longBreak': return safeSettings.longBreakTime * 60;
            default: return safeSettings.workTime * 60;
        }
    }, [safeSettings.workTime, safeSettings.shortBreakTime, safeSettings.longBreakTime]);

    useEffect(() => {
        if (!isRunning) setTimeLeft(getDuration(sessionType));
    }, [sessionType, getDuration]);

    // Save settings
    useEffect(() => {
        localStorage.setItem('studywithme_pomodoro_settings', JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        localStorage.setItem('studywithme_pomodoro_settings', JSON.stringify(safeSettings));
    }, [safeSettings]);

    useEffect(() => {
        if (isRunning) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current);
                        handleSessionComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(intervalRef.current);
    }, [isRunning]);

    // Auto focus mode when running
    useEffect(() => {
        if (isRunning && sessionType === 'focus') {
            setIsFocusMode(true);
        }
    }, [isRunning, sessionType]);

    function handleSessionComplete() {
        setIsRunning(false);

        // Play success bell
        if (!bellAudioRef.current) {
            bellAudioRef.current = new Audio('https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3');
        }
        bellAudioRef.current.play().catch(e => console.log('Audio error:', e));

        if (sessionType === 'focus') {
            const plannedMinutes = safeSettings.workTime;
            const actualMinutes = plannedMinutes;
            const course = courses.find((c) => c.id === selectedCourseId);
            const task = tasks.find((t) => t.id === selectedTaskId);

            const newSession = addSession({
                userId: user.id,
                courseId: selectedCourseId || null,
                taskId: selectedTaskId || null,
                plannedMinutes,
                actualMinutes,
                completed: true,
            });

            // Award coins + XP
            const newCoins = (user.coinBalance || 0) + COINS_PER_SESSION;
            const newXP = (user.xp || 0) + XP_PER_SESSION;

            // Update streak
            const today = new Date().toISOString().split('T')[0];
            let newStreak = user.streakCount || 0;
            if (user.lastActiveDate !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                if (user.lastActiveDate === yesterdayStr || !user.lastActiveDate) {
                    newStreak += 1;
                } else {
                    newStreak = 1;
                }
            }

            updateUser({ coinBalance: newCoins, xp: newXP, streakCount: newStreak, lastActiveDate: today });

            // Show completion screen
            setShowCompletion({
                sessionId: newSession.id,
                coins: COINS_PER_SESSION,
                xp: XP_PER_SESSION,
                courseName: course?.courseName || null,
                taskName: task?.title || null,
                minutes: actualMinutes,
                streak: newStreak,
            });
            setSessionNote('');

            // Check badges
            const allSessions = [...sessions, newSession];
            const stats = getSessionStats(allSessions, courses);
            stats.streak = newStreak;
            const existingKeys = badges.map((b) => b.badgeKey);
            const newBadges = checkNewBadges(stats, existingKeys);
            for (const badge of newBadges) {
                addBadge({ userId: user.id, badgeKey: badge.badgeKey });
                setTimeout(() => {
                    addToast({ type: 'reward', icon: badge.icon, message: `Badge unlocked: ${badge.badgeName}!` });
                }, 2000);
            }

            // Move to break
            if (round >= safeSettings.roundsBeforeLongBreak) {
                setSessionType('longBreak');
                setRound(1);
            } else {
                setSessionType('shortBreak');
                setRound((r) => r + 1);
            }
        } else {
            setSessionType('focus');
            setIsFocusMode(false);
            addToast({ type: 'success', icon: '☕', message: 'Break over. Ready to focus!' });
        }
    };

    const toggleTimer = () => {
        if (!isRunning) {
            setShowCompletion(null);
        }
        setIsRunning(!isRunning);
    };

    const resetTimer = () => {
        setIsRunning(false);
        setIsFocusMode(false);
        clearInterval(intervalRef.current);
        setTimeLeft(getDuration(sessionType));
        setShowCompletion(null);
    };

    const exitFocusMode = () => {
        setIsFocusMode(false);
    };

    // Circular Slider Drag Logic
    const handleDrag = useCallback((e) => {
        if (isRunning || !isDragging || !svgRef.current) return;

        const svg = svgRef.current;
        const pt = svg.createSVGPoint();

        // Support touch and mouse
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        pt.x = clientX;
        pt.y = clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

        // Calculate angle from center (160,160)
        const dx = svgP.x - 160;
        const dy = svgP.y - 160;
        let angle = Math.atan2(dy, dx);

        // Transform standard canvas angle to top-zero, clockwise
        angle = angle + (Math.PI / 2);
        if (angle < 0) angle += 2 * Math.PI;

        const maxMinutes = sessionType === 'focus' ? 120 : sessionType === 'longBreak' ? 60 : 30;

        // Map angle to minutes
        let selectedMinutes = Math.round((angle / (2 * Math.PI)) * maxMinutes);
        if (selectedMinutes < 1) selectedMinutes = 1;

        // Update local settings temporarily while dragging for fluid UI
        setTimeLeft(selectedMinutes * 60);

        setSettings(prev => {
            const newSettings = { ...prev };
            if (sessionType === 'focus') {
                newSettings.workTime = selectedMinutes;
                newSettings.focusDuration = selectedMinutes;
            } else if (sessionType === 'shortBreak') {
                newSettings.shortBreakTime = selectedMinutes;
                newSettings.shortBreakDuration = selectedMinutes;
            } else {
                newSettings.longBreakTime = selectedMinutes;
                newSettings.longBreakDuration = selectedMinutes;
            }
            return newSettings;
        });

    }, [isRunning, isDragging, sessionType, setSettings]);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDrag);
            window.addEventListener('mouseup', () => setIsDragging(false));
            window.addEventListener('touchmove', handleDrag, { passive: false });
            window.addEventListener('touchend', () => setIsDragging(false));
        }
        return () => {
            window.removeEventListener('mousemove', handleDrag);
            window.removeEventListener('mouseup', () => setIsDragging(false));
            window.removeEventListener('touchmove', handleDrag);
            window.removeEventListener('touchend', () => setIsDragging(false));
        };
    }, [isDragging, handleDrag]);

    const totalDuration = getDuration(sessionType);
    const progress = ((totalDuration - timeLeft) / totalDuration) * 100;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    // Dynamic color gradient based on time (focus only)
    const getDynamicColor = () => {
        if (sessionType !== 'focus') return currentType.color;

        const currentCourse = courses.find(c => c.id === selectedCourseId);
        if (currentCourse && currentCourse.color) {
            return currentCourse.color;
        }

        const maxMinutes = 120;
        const ratio = minutes / maxMinutes;

        // From blue to deep purple/magenta based on length
        const r = Math.round(79 + (ratio * (168 - 79)));
        const g = Math.round(110 - (ratio * 110));
        const b = Math.round(247 - (ratio * (247 - 215)));

        return `rgb(${r}, ${g}, ${b})`;
    };

    const activeColor = getDynamicColor();

    const currentType = SESSION_TYPES.find((t) => t.key === sessionType);
    const userCourses = courses.filter((c) => c.userId === user?.id);
    const courseTasks = tasks.filter((t) => t.userId === user?.id && t.courseId === selectedCourseId && !t.completed);

    const circumference = 2 * Math.PI * 140;
    // Map progress to circle offset, considering it starts from top
    const strokeDashoffset = isNaN(progress) ? 0 : circumference - (progress / 100) * circumference;

    // Handle positions
    const angleInRadians = ((progress / 100) * 360 - 90) * (Math.PI / 180);
    const handleX = 160 + 140 * Math.cos(angleInRadians);
    const handleY = 160 + 140 * Math.sin(angleInRadians);

    const companion = getCompanionStage(getLevelFromXP(user?.xp || 0).level);
    const isDark = (user?.theme || 'calm') === 'dark';

    if (isLoading) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto flex flex-col items-center justify-center pt-16">
                <div className="w-[300px] h-[300px] rounded-full animate-pulse shadow-sm" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                <div className="h-5 w-48 rounded-full animate-pulse mt-8 mb-4" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                <div className="h-10 w-full max-w-sm rounded-xl animate-pulse" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
            </motion.div>
        );
    }

    // Focus mode (full screen dark overlay)
    if (isFocusMode && isRunning) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="focus-mode"
            >
                <button
                    onClick={exitFocusMode}
                    className="absolute top-6 right-6 text-white/30 hover:text-white/60 transition-colors text-sm z-10"
                >
                    Exit Focus Mode
                </button>

                {/* Cosmic Background Glow */}
                <div
                    className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none transition-all duration-[3000ms]"
                    style={{
                        background: `radial-gradient(circle at 50% 50%, ${activeColor}30 0%, transparent 60%)`
                    }}
                />

                {/* Minimal Header instead of Ambient Sounds */}
                <div className="absolute top-6 left-6 z-10">
                    <div className="text-white/40 text-sm font-medium">✨ Kozmik Kütüphane Aktif</div>
                </div>

                <div className="text-center z-10 relative">
                    <motion.div animate={{ scale: isRunning ? 1.05 : 1 }} transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }} className="text-6xl mb-8 drop-shadow-2xl">
                        {companion.emoji}
                    </motion.div>
                    <div className="relative w-[340px] h-[340px] mx-auto">
                        <svg ref={svgRef} className="w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 320 320">
                            <circle cx="160" cy="160" r="140" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
                            <motion.circle
                                cx="160" cy="160" r="140"
                                fill="none"
                                stroke={activeColor}
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                animate={{ strokeDashoffset }}
                                transition={{ duration: isDragging ? 0 : 0.5 }}
                            />
                        </svg>

                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <motion.div
                                animate={{ scale: isRunning ? [1, 1.02, 1] : 1, color: isRunning ? '#ffffff' : '#f8fafc' }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="text-7xl font-light tabular-nums tracking-tighter"
                            >
                                {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                            </motion.div>
                            <div className="text-sm font-medium mt-3" style={{ color: activeColor }}>
                                {currentType.label} · Round {round}
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Completion Screen */}
            <AnimatePresence>
                {showCompletion && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm"
                        onClick={() => setShowCompletion(null)}
                    >
                        <motion.div
                            initial={{ y: 20 }}
                            animate={{ y: 0 }}
                            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                className="text-5xl mb-4 animate-celebration"
                            >
                                🎉
                            </motion.div>
                            <h2 className="text-xl font-bold text-[#111827] mb-1">Session Complete!</h2>

                            {showCompletion.courseName && (
                                <p className="text-sm text-slate-400">
                                    {showCompletion.courseName}
                                    {showCompletion.taskName && ` · ${showCompletion.taskName}`}
                                </p>
                            )}

                            <div className="my-4 py-4 px-6 bg-slate-50 rounded-2xl">
                                <div className="text-2xl font-bold text-slate-500">{minutesToDisplay(showCompletion.minutes)}</div>
                                <div className="text-xs text-slate-400 mt-0.5">Focus Time</div>
                            </div>

                            <div className="mb-4 text-left">
                                <label className="label text-[11px] mb-1">Study Session Note</label>
                                <textarea
                                    className="input text-[13px] resize-none h-[66px] !p-2.5"
                                    placeholder="What did you accomplish? e.g. Reviewed integrals and solved 10 exercises"
                                    value={sessionNote}
                                    onChange={(e) => setSessionNote(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-center gap-6 mb-5">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.4, type: 'spring' }}
                                    className="text-center"
                                >
                                    <div className="text-xl font-bold text-amber-500 animate-coin-pop">+{showCompletion.coins}</div>
                                    <div className="text-[10px] text-slate-400">coins</div>
                                </motion.div>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.5, type: 'spring' }}
                                    className="text-center"
                                >
                                    <div className="text-xl font-bold text-blue-500">+{showCompletion.xp}</div>
                                    <div className="text-[10px] text-slate-400">XP</div>
                                </motion.div>
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.6, type: 'spring' }}
                                    className="text-center"
                                >
                                    <div className="text-xl font-bold text-orange-500">🔥 {showCompletion.streak}</div>
                                    <div className="text-[10px] text-slate-400">streak</div>
                                </motion.div>
                            </div>

                            <button
                                onClick={() => {
                                    if (sessionNote.trim()) {
                                        updateSession(showCompletion.sessionId, { note: sessionNote.trim() });
                                    }
                                    setShowCompletion(null);
                                }}
                                className="btn-primary w-full justify-center py-3"
                            >
                                Continue
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-text, #1e293b)' }}>Pomodoro Timer</h1>
                <p className="text-sm mt-0.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Stay focused, one session at a time</p>
            </div>

            {/* Session Type Tabs */}
            <div className="flex justify-center mb-8">
                <div className="flex bg-slate-100/80 rounded-2xl p-1 gap-0.5">
                    {SESSION_TYPES.map((type) => (
                        <button
                            key={type.key}
                            onClick={() => { if (!isRunning) setSessionType(type.key); }}
                            className={`px-5 py-2 rounded-xl text-xs font-medium transition-all ${sessionType === type.key ? 'bg-white shadow-sm text-[#111827]' : 'text-slate-400 hover:text-slate-500'
                                }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Timer Circle - Interactive SVG */}
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }} className="flex justify-center mb-8">
                <div className="relative w-[320px] h-[320px] select-none">
                    <svg ref={svgRef} className={`w-full h-full ${!isRunning ? 'cursor-pointer' : ''}`} viewBox="0 0 320 320" onMouseDown={() => !isRunning && setIsDragging(true)} onTouchStart={() => !isRunning && setIsDragging(true)}>
                        <circle cx="160" cy="160" r="140" fill="none" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"} strokeWidth="12" />
                        <motion.circle
                            transform="rotate(-90 160 160)"
                            cx="160" cy="160" r="140"
                            fill="none"
                            stroke={activeColor}
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: isDragging ? 0 : 0.5, ease: "easeOut" }}
                            className={`${isDragging ? 'opacity-80' : 'opacity-100'}`}
                        />
                    </svg>

                    {/* Draggable Handle */}
                    {!isRunning && (
                        <motion.div
                            className="absolute z-10 w-8 h-8 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.1)] border-4 border-white cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                            style={{
                                backgroundColor: activeColor,
                                left: `${handleX}px`,
                                top: `${handleY}px`,
                                transform: 'translate(-50%, -50%)',
                                touchAction: 'none'
                            }}
                            onMouseDown={() => setIsDragging(true)}
                            onTouchStart={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            animate={{ scale: isDragging ? 1.2 : 1 }}
                        />
                    )}

                    {/* Interactive Center Button */}
                    <button
                        onClick={toggleTimer}
                        disabled={isDragging}
                        className={`absolute inset-6 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'} group`}
                    >
                        <motion.div animate={{ scale: isRunning ? 1.05 : 1 }} transition={{ duration: 0.5, ease: "easeInOut", repeat: isRunning ? Infinity : 0, repeatType: "reverse" }} className="text-5xl mb-3 drop-shadow-sm pointer-events-none">
                            {companion.emoji}
                        </motion.div>
                        <motion.div
                            animate={{ scale: isDragging ? 1.1 : 1 }}
                            className="text-7xl font-black tabular-nums tracking-tighter pointer-events-none"
                            style={{ color: 'var(--theme-text, #1e293b)' }}
                        >
                            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                        </motion.div>
                        <div className={`mt-5 rounded-full p-4 transition-colors pointer-events-none shadow-sm ${isRunning ? (isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-800') : 'bg-white text-slate-800'}`} style={{ color: isRunning ? '' : activeColor, backgroundColor: isRunning ? '' : `${activeColor}20` }}>
                            {isRunning ? (
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>
                            ) : (
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" className="translate-x-0.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                            )}
                        </div>
                    </button>
                </div>
            </motion.div>

            {/* Sub Controls */}
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="flex justify-center gap-3 mb-8">
                <button onClick={resetTimer} className="btn-secondary px-8 font-semibold rounded-2xl py-2.5">Reset</button>
            </motion.div>



            {/* Course/Task Link */}
            <div className="card max-w-md mx-auto mb-4">
                <div className="space-y-3">
                    <div>
                        <label className="label">Link to Course</label>
                        <select
                            className="input"
                            value={selectedCourseId}
                            onChange={(e) => { setSelectedCourseId(e.target.value); setSelectedTaskId(''); }}
                            disabled={isRunning}
                        >
                            <option value="">No course</option>
                            {userCourses.map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.courseName}</option>))}
                        </select>
                    </div>
                    {selectedCourseId && courseTasks.length > 0 && (
                        <div>
                            <label className="label">Link to Task (optional)</label>
                            <select className="input" value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} disabled={isRunning}>
                                <option value="">No task</option>
                                {courseTasks.map((t) => (<option key={t.id} value={t.id}>{t.title}</option>))}
                            </select>
                        </div>
                    )}
                </div>
            </div>


        </div>
    );
}
