export const ACTIVE_USER_WINDOW_MS = 5 * 60 * 1000;

export function getWeekKey(date = new Date()) {
    const value = new Date(date);
    const day = value.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    value.setHours(0, 0, 0, 0);
    value.setDate(value.getDate() + diff);
    return value.toISOString().split('T')[0];
}

export function getDisplayName(user) {
    if (!user) return 'Student';
    const baseName = user.name?.trim() || user.displayName?.trim() || '';
    if (baseName) return baseName;
    return user.email?.split('@')[0] || 'Student';
}

export function timestampToMillis(value) {
    if (!value) return 0;
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (typeof value === 'string' || value instanceof Date) return new Date(value).getTime();
    if (typeof value?.seconds === 'number') return value.seconds * 1000;
    return 0;
}

export function isRecentlyActive(lastSeenAt, now = Date.now()) {
    const lastSeenMs = timestampToMillis(lastSeenAt);
    if (!lastSeenMs) return false;
    return now - lastSeenMs <= ACTIVE_USER_WINDOW_MS;
}
