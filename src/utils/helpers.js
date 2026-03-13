let idCounter = 0;

export function generateId() {
    idCounter += 1;
    return `${Date.now()}_${idCounter}_${Math.random().toString(36).substr(2, 6)}`;
}

export function getToday() {
    return new Date().toISOString().split('T')[0];
}

export function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
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
        dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
}

export function getDayNumber(dateStr) {
    return new Date(dateStr + 'T00:00:00').getDate();
}

export function getMonthYear(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
