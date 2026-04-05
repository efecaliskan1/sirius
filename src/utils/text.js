const CONTROL_AND_BIDI_PATTERN = /[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/g;
const COLLAPSIBLE_WHITESPACE_PATTERN = /\s+/g;

export function normalizeVisibleText(value, maxLength = 120, fallback = '') {
    const raw = typeof value === 'string' ? value : '';
    const normalized = raw
        .replace(CONTROL_AND_BIDI_PATTERN, '')
        .replace(COLLAPSIBLE_WHITESPACE_PATTERN, ' ')
        .trim();

    if (!normalized) {
        return fallback;
    }

    return normalized.slice(0, maxLength);
}
