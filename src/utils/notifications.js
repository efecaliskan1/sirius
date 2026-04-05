import { normalizeVisibleText } from './text';

const SCHEDULE_NOTIFICATION_PREFIX = 'sirius_schedule_notification';

export function isBrowserNotificationSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
}

export async function ensureBrowserNotificationPermission() {
    if (!isBrowserNotificationSupported()) return 'unsupported';

    if (Notification.permission !== 'default') {
        return Notification.permission;
    }

    try {
        return await Notification.requestPermission();
    } catch {
        return 'denied';
    }
}

export function showBrowserNotification(title, options = {}) {
    if (!isBrowserNotificationSupported() || Notification.permission !== 'granted') {
        return null;
    }

    try {
        const safeTitle = normalizeVisibleText(title, 80, 'Sirius');
        const safeBody = normalizeVisibleText(options.body || '', 180, '');
        const safeTag = normalizeVisibleText(options.tag || '', 80, '');

        return new Notification(safeTitle, {
            icon: '/sirius-logo.svg',
            badge: '/sirius-logo.svg',
            ...options,
            body: safeBody || undefined,
            tag: safeTag || undefined,
        });
    } catch {
        return null;
    }
}

export function buildTurkeyDateTime(dateKey, time) {
    const [rawHour = '0', rawMinute = '0'] = String(time || '00:00').split(':');
    const hour = Number.parseInt(rawHour, 10);
    const minute = Number.parseInt(rawMinute, 10);
    const baseDate = new Date(`${dateKey}T00:00:00+03:00`);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
        return baseDate;
    }

    baseDate.setMinutes(baseDate.getMinutes() + (hour * 60) + minute);
    return baseDate;
}

export function getScheduleNotificationKey(entry) {
    return `${SCHEDULE_NOTIFICATION_PREFIX}:${entry.id}:${entry.date}:${entry.startTime}`;
}

export function hasSeenScheduleNotification(entry) {
    if (typeof window === 'undefined') return false;

    try {
        return window.localStorage.getItem(getScheduleNotificationKey(entry)) === '1';
    } catch {
        return false;
    }
}

export function markScheduleNotificationSeen(entry) {
    if (typeof window === 'undefined') return;

    try {
        window.localStorage.setItem(getScheduleNotificationKey(entry), '1');
    } catch {
        // Ignore storage errors and continue without persistence.
    }
}
