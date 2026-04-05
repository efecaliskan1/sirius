export const POMODORO_RUNTIME_STORAGE_KEY = 'sirius_pomodoro_runtime';

function canUseStorage(type) {
    if (typeof window === 'undefined') return false;

    try {
        return typeof window[type] !== 'undefined';
    } catch {
        return false;
    }
}

function canUseLocalStorage() {
    return canUseStorage('localStorage');
}

function canUseSessionStorage() {
    return canUseStorage('sessionStorage');
}

export function loadPomodoroRuntime() {
    if (canUseLocalStorage()) {
        try {
            const localValue = window.localStorage.getItem(POMODORO_RUNTIME_STORAGE_KEY);
            if (localValue) {
                return JSON.parse(localValue);
            }
        } catch {
            // Ignore storage read errors.
        }
    }

    if (canUseSessionStorage()) {
        try {
            const sessionValue = window.sessionStorage.getItem(POMODORO_RUNTIME_STORAGE_KEY);
            if (sessionValue) {
                const parsed = JSON.parse(sessionValue);
                if (canUseLocalStorage()) {
                    window.localStorage.setItem(POMODORO_RUNTIME_STORAGE_KEY, sessionValue);
                }
                window.sessionStorage.removeItem(POMODORO_RUNTIME_STORAGE_KEY);
                return parsed;
            }
        } catch {
            // Ignore storage read errors.
        }
    }

    return null;
}

export function savePomodoroRuntime(snapshot) {
    if (!canUseLocalStorage()) return;

    try {
        window.localStorage.setItem(POMODORO_RUNTIME_STORAGE_KEY, JSON.stringify(snapshot));
        if (canUseSessionStorage()) {
            window.sessionStorage.removeItem(POMODORO_RUNTIME_STORAGE_KEY);
        }
    } catch {
        // Ignore storage quota or privacy mode errors.
    }
}

export function clearPomodoroRuntime() {
    try {
        if (canUseLocalStorage()) {
            window.localStorage.removeItem(POMODORO_RUNTIME_STORAGE_KEY);
        }
        if (canUseSessionStorage()) {
            window.sessionStorage.removeItem(POMODORO_RUNTIME_STORAGE_KEY);
        }
    } catch {
        // Ignore storage cleanup errors.
    }
}

export function getActiveRuntimeSnapshot(runtime, userId, todayKey, now = Date.now()) {
    if (!runtime || runtime.userId !== userId) return null;
    if (!runtime.isRunning || runtime.sessionType !== 'focus') return null;

    const runtimeDateKey = typeof runtime.sessionDateKey === 'string'
        ? runtime.sessionDateKey
        : '';

    if (!runtimeDateKey || runtimeDateKey !== todayKey) {
        return null;
    }

    const targetEndTime = Number(runtime.targetEndTime);
    const durationSeconds = Number(runtime.durationSeconds);

    if (!Number.isFinite(targetEndTime) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        return null;
    }

    const startedAt = targetEndTime - durationSeconds * 1000;
    const elapsedSeconds = Math.max(0, Math.min(durationSeconds, Math.floor((now - startedAt) / 1000)));
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);

    if (elapsedMinutes <= 0) {
        return null;
    }

    return {
        elapsedMinutes,
        countsAsSession: true,
    };
}
