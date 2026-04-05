import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAppStore from '../../store/appStore';
import useAuthStore from '../../store/authStore';

export default function FocusOverlay() {
    const isFocusMode = useAppStore(s => s.isFocusMode);
    const setFocusMode = useAppStore(s => s.setFocusMode);
    const focusTask = useAppStore(s => s.focusTask);
    const ambientSounds = useAppStore(s => s.ambientSounds);
    const updateAmbientSound = useAppStore(s => s.updateAmbientSound);
    const user = useAuthStore(s => s.user);
    const isDark = (user?.theme || 'calm') === 'dark';

    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const safeAmbientSounds = Array.isArray(ambientSounds) ? ambientSounds : [];

    // Countdown logic
    useEffect(() => {
        if (!isFocusMode) {
            setTimeLeft(25 * 60); // Reset when exiting focus mode
            return;
        }

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // Minimal completion state or just exit
                    setFocusMode(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isFocusMode, setFocusMode]);

    if (!isFocusMode) return null;

    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="fixed inset-0 z-[100] flex flex-col items-center justify-between"
                style={{
                    backgroundColor: 'var(--theme-surface, #F8FAFC)',
                    color: 'var(--theme-text, #1E293B)'
                }}
            >
                {/* Top spacer */}
                <div className="flex-1 w-full" />

                {/* Center Content */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="text-[120px] md:text-[180px] font-extrabold tracking-tighter leading-none"
                    >
                        {mins}:{secs}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="mt-6 flex items-center gap-3 px-6 py-3 rounded-2xl"
                        style={{
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0,0,0,0.03)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`
                        }}
                    >
                        <span className="text-xl">🎯</span>
                        <span className="text-lg font-medium opacity-80">
                            {focusTask?.title || "Deep Focus Session"}
                        </span>
                    </motion.div>
                </div>

                {/* Bottom Controls */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="flex-1 w-full max-w-2xl px-8 pb-12 flex flex-col justify-end"
                >
                    <div className="flex items-center justify-between gap-8 backdrop-blur-md rounded-3xl p-6"
                        style={{
                            backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.6)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)'}`
                        }}
                    >
                        {/* Ambient Sound Toggles (Mini versions) */}
                        <div className="flex items-center gap-4">
                            {safeAmbientSounds.map(sound => (
                                <button
                                    key={sound.id}
                                    onClick={() => updateAmbientSound(sound.id, {
                                        isPlaying: !sound.isPlaying,
                                        volume: sound.volume === 0 ? 50 : sound.volume
                                    })}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${sound.isPlaying && sound.volume > 0
                                            ? (isDark ? 'bg-indigo-500/20 text-indigo-300 ring-2 ring-indigo-500/50' : 'bg-blue-100 text-blue-600 ring-2 ring-blue-400')
                                            : (isDark ? 'bg-white/5 hover:bg-white/10 opacity-50' : 'bg-slate-100 hover:bg-slate-200 opacity-60')
                                        }`}
                                    title={sound.name}
                                >
                                    {sound.icon}
                                </button>
                            ))}
                        </div>

                        {/* End Session */}
                        <button
                            onClick={() => setFocusMode(false)}
                            className={`px-8 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 ${isDark
                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                                    : 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-100'
                                }`}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="9" x2="15" y2="15" /><line x1="15" y1="9" x2="9" y2="15" /></svg>
                            End Session / Break
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
