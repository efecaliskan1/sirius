import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Layout/Sidebar';
import Toast from '../components/UI/Toast';
import AudioEngine from '../components/UI/AudioEngine';
import FocusOverlay from '../components/UI/FocusOverlay';
import useAuthStore from '../store/authStore';
import { THEMES } from '../utils/constants';

export default function AppLayout() {
    const user = useAuthStore((s) => s.user);
    const themeKey = user?.theme || 'calm';

    // Apply theme CSS variables + data-theme attribute
    useEffect(() => {
        const theme = THEMES.find((t) => t.key === themeKey);
        const root = document.documentElement;
        // Set data-theme for CSS selector targeting
        root.setAttribute('data-theme', themeKey);
        if (theme) {
            const varMap = {
                '--color-surface': '--theme-surface',
                '--color-surface-card': '--theme-card',
                '--color-surface-hover': '--theme-surface-hover',
                '--color-surface-dark': '--theme-surface-dark',
                '--color-border': '--theme-border',
                '--color-border-light': '--theme-border-light',
                '--color-text': '--theme-text',
                '--color-text-secondary': '--theme-text-secondary',
                '--color-text-muted': '--theme-text-muted',
                '--color-sidebar': '--theme-sidebar',
                '--color-primary': '--theme-primary',
                '--color-primary-bg': '--theme-primary-bg',
            };
            Object.entries(theme.vars).forEach(([key, value]) => {
                if (varMap[key]) {
                    root.style.setProperty(varMap[key], value);
                }
                if (key === '--sidebar-bg' || key === '--sidebar-border') {
                    root.style.setProperty(key, value);
                }
            });
        }
    }, [themeKey]);

    return (
        <div className="flex min-h-screen transition-colors duration-300 relative" style={{ backgroundColor: 'var(--theme-surface, #F8FAFC)' }}>
            <AudioEngine />
            <FocusOverlay />
            <Sidebar />
            <main className="flex-1 ml-[240px] p-8">
                <Outlet />
            </main>
            <Toast />
        </div>
    );
}
