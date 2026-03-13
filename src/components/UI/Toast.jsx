import { AnimatePresence, motion } from 'framer-motion';
import useAppStore from '../../store/appStore';

const typeStyles = {
    success: 'bg-slate-500',
    error: 'bg-red-500',
    reward: 'bg-gradient-to-r from-amber-400 to-orange-400',
    info: 'bg-slate-500',
};

export default function Toast() {
    const toasts = useAppStore((s) => s.toasts);
    const removeToast = useAppStore((s) => s.removeToast);

    return (
        <div className="fixed bottom-6 right-6 z-[60] space-y-2.5">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`${typeStyles[toast.type] || typeStyles.info} text-white px-5 py-3 rounded-2xl shadow-lg shadow-slate-200/50 flex items-center gap-3 min-w-[260px] cursor-pointer backdrop-blur-lg`}
                        onClick={() => removeToast(toast.id)}
                    >
                        {toast.icon && <span className="text-lg">{toast.icon}</span>}
                        <span className="text-sm font-medium">{toast.message}</span>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
