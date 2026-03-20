let idCounter = 0;
export const TURKEY_TIMEZONE = 'Europe/Istanbul';
export const TURKEY_LOCALE = 'tr-TR';
export const ENGLISH_LOCALE = 'en-US';

export function generateId() {
    idCounter += 1;
    return `${Date.now()}_${idCounter}_${Math.random().toString(36).substr(2, 6)}`;
}

export function getTurkeyDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: TURKEY_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });

    const parts = formatter.formatToParts(date);
    return {
        year: parts.find((part) => part.type === 'year')?.value || '1970',
        month: parts.find((part) => part.type === 'month')?.value || '01',
        day: parts.find((part) => part.type === 'day')?.value || '01',
    };
}

export function getDateKeyInTurkey(date = new Date()) {
    const { year, month, day } = getTurkeyDateParts(date);
    return `${year}-${month}-${day}`;
}

export function getToday() {
    return getDateKeyInTurkey();
}

export function getLocaleTag(locale = 'tr') {
    return locale === 'tr' ? TURKEY_LOCALE : ENGLISH_LOCALE;
}

export function getGreeting(locale = 'en') {
    const hour = Number(new Intl.DateTimeFormat('en-GB', {
        timeZone: TURKEY_TIMEZONE,
        hour: '2-digit',
        hour12: false,
    }).format(new Date()));
    if (locale === 'tr') {
        if (hour < 12) return 'Günaydın';
        if (hour < 18) return 'İyi günler';
        return 'İyi akşamlar';
    }
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export function formatDate(dateStr, locale = 'tr') {
    if (!dateStr) return '';
    const d = typeof dateStr === 'string' && dateStr.includes('T') ? new Date(dateStr) : new Date(`${dateStr}T00:00:00`);
    return d.toLocaleDateString(getLocaleTag(locale), { timeZone: TURKEY_TIMEZONE, month: 'short', day: 'numeric' });
}

export function formatTime(timeStr, locale = 'en') {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    if (locale === 'tr') {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function isToday(dateStr) {
    return dateStr === getToday();
}

export function isFuture(dateStr) {
    return dateStr > getToday();
}

export function minutesToDisplay(minutes) {
    if (!minutes || minutes === 0) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}

export function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
}

export function getWeekDates(referenceDate) {
    const date = new Date(referenceDate);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);

    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        dates.push(getDateKeyInTurkey(d));
    }
    return dates;
}

export function getDayNumber(dateStr) {
    return Number(formatDateWithOptions(dateStr, { day: 'numeric' }));
}

export function getMonthYear(dateStr) {
    return formatDateWithOptions(dateStr, { month: 'long', year: 'numeric' });
}

export function formatDateWithOptions(dateInput, options, locale = 'tr') {
    if (!dateInput) return '';
    const date = dateInput instanceof Date
        ? dateInput
        : typeof dateInput === 'string' && dateInput.includes('T')
            ? new Date(dateInput)
            : new Date(`${dateInput}T00:00:00`);

    return new Intl.DateTimeFormat(getLocaleTag(locale), {
        timeZone: TURKEY_TIMEZONE,
        ...options,
    }).format(date);
}

export function formatDateTimeInTurkey(dateInput, options = {}, locale = 'tr') {
    if (!dateInput) return '';
    const date = typeof dateInput === 'string' || dateInput instanceof Date ? new Date(dateInput) : dateInput;
    return new Intl.DateTimeFormat(getLocaleTag(locale), {
        timeZone: TURKEY_TIMEZONE,
        ...options,
    }).format(date);
}
