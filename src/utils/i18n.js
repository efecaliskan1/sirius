export const LOCALE_STORAGE_KEY = 'sirius_locale';

export const SUPPORTED_LOCALES = [
    { key: 'en', label: 'English', shortLabel: 'EN' },
    { key: 'tr', label: 'Türkçe', shortLabel: 'TR' },
];

export function normalizeLocale(locale) {
    return locale === 'tr' ? 'tr' : 'en';
}

export function getStoredLocale() {
    if (typeof window === 'undefined') return 'en';
    try {
        return normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
    } catch {
        return 'en';
    }
}

export function persistLocale(locale) {
    const nextLocale = normalizeLocale(locale);

    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
        } catch {
            // Ignore storage errors and keep the current runtime locale.
        }
    }

    if (typeof document !== 'undefined') {
        document.documentElement.lang = nextLocale === 'tr' ? 'tr' : 'en';
    }

    return nextLocale;
}

export const HOME_COPY = {
    en: {
        customizeDashboard: 'Customize dashboard',
        quoteOfTheDay: 'Quote of the Day',
        smartSuggestion: 'Smart Suggestion',
        focus: 'Focus',
        todayTasks: "Today's Tasks",
        viewAll: 'View all ->',
        noTasks: 'No tasks scheduled for today.',
        addTask: 'Add Task',
        todaySchedule: "Today's Schedule",
        viewSchedule: 'View schedule ->',
        noSchedule: 'No classes or sessions scheduled for today',
        dailyReflection: 'Daily Reflection',
        dailyReflectionPrompt: 'How productive was your study session today?',
        productive: 'Productive',
        average: 'Average',
        lowFocus: 'Low Focus',
        quickFocus: 'Quick Focus',
        quickFocusSubtitle: 'Start a 25m session',
        startSession: 'Start Session ->',
        globalStudyRoom: 'Global Study Room',
        live: 'Live',
        members: 'members',
        focusingNow: 'focusing now',
        activeMembers: 'active members',
        onlineNow: 'online now',
        nobodyActive: 'Nobody is active yet. The room fills automatically as signed-in members use Sirius.',
        isInSession: '{name} is in {session}.',
        isOnline: '{name} is online right now.',
        joinStudyRoom: 'Join Study Room',
        weeklyGoal: 'Weekly Goal',
        goalSuffix: 'goal',
        yourSky: 'Your Sky',
        details: 'Details ->',
        protectStreak: 'Protect Streak',
        streakProtected: 'Your streak is protected today',
        myCourses: 'My Courses',
        addCourseCta: '+ Add Course',
        addFirstCourse: 'Add your first course to get started',
        sessionsToday: 'Sessions Today',
        todaysTasksStat: "Today's Tasks",
        focusTime: 'Focus Time',
        streak: 'Streak',
        editCourse: 'Edit Course',
        newCourse: 'New Course',
        courseName: 'Course Name',
        courseNamePlaceholder: 'e.g. Mathematics 101',
        icon: 'Icon',
        color: 'Color',
        delete: 'Delete',
        cancel: 'Cancel',
        save: 'Save',
        addCourse: 'Add Course',
        weeklyStudyGoal: 'Weekly Study Goal',
        hoursPerWeek: 'Hours per week',
        saveGoal: 'Save Goal',
        customizeDashboardModal: 'Customize Dashboard',
        customizeDashboardDescription: 'Choose which widgets appear on your home page.',
        done: 'Done',
        noCourse: 'No course',
        noTask: 'No task',
        viewCourseFallback: 'Course',
        student: 'Student',
        motivationSubtitle: '{name} · {description}',
        trLabel: 'Türkçe',
        enLabel: 'English',
        widgetNames: {
            'today-tasks': "Today's Tasks",
            'schedule-preview': "Today's Schedule",
            'quick-focus': 'Quick Focus',
            'weekly-goal': 'Weekly Goal',
            'streak-status': 'Rewards Status',
        },
    },
    tr: {
        customizeDashboard: 'Ana sayfayı düzenle',
        quoteOfTheDay: 'Günün sözü',
        smartSuggestion: 'Akıllı öneri',
        focus: 'Odaklan',
        todayTasks: 'Bugün yapılacaklar',
        viewAll: 'Tümünü gör ->',
        noTasks: 'Bugün için planlanmış görev yok.',
        addTask: 'Görev ekle',
        todaySchedule: 'Bugünkü program',
        viewSchedule: 'Takvimi gör ->',
        noSchedule: 'Bugün için planlanmış ders ya da oturum yok',
        dailyReflection: 'Günlük değerlendirme',
        dailyReflectionPrompt: 'Bugünkü çalışma sürecin nasıl geçti?',
        productive: 'Verimli',
        average: 'Orta',
        lowFocus: 'Odak düşüktü',
        quickFocus: 'Hızlı odak',
        quickFocusSubtitle: '25 dakikalık bir oturum başlat',
        startSession: 'Oturumu başlat ->',
        globalStudyRoom: 'Ortak çalışma odası',
        live: 'Canlı',
        members: 'kişi',
        focusingNow: 'şu anda odakta',
        activeMembers: 'aktif üye',
        onlineNow: 'şu an çevrimiçi',
        nobodyActive: 'Şu anda aktif kimse görünmüyor. Sirius kullanan üyeler geldikçe oda canlanır.',
        isInSession: '{name} şu anda {session} içinde.',
        isOnline: '{name} şu anda çevrimiçi.',
        joinStudyRoom: 'Çalışma odasına katıl',
        weeklyGoal: 'Haftalık hedef',
        goalSuffix: 'hedefine',
        yourSky: 'Gökyüzün',
        details: 'Detaylar ->',
        protectStreak: 'Seriyi koru',
        streakProtected: 'Serin bugün koruma altında',
        myCourses: 'Derslerim',
        addCourseCta: '+ Ders Ekle',
        addFirstCourse: 'Başlamak için ilk dersini ekle',
        sessionsToday: 'Bugünkü oturumlar',
        todaysTasksStat: 'Bugünkü görevler',
        focusTime: 'Odak süresi',
        streak: 'Seri',
        editCourse: 'Dersi düzenle',
        newCourse: 'Yeni Ders',
        courseName: 'Ders adı',
        courseNamePlaceholder: 'Örn. Matematik 101',
        icon: 'İkon',
        color: 'Renk',
        delete: 'Sil',
        cancel: 'İptal',
        save: 'Kaydet',
        addCourse: 'Ders Ekle',
        weeklyStudyGoal: 'Haftalık çalışma hedefi',
        hoursPerWeek: 'Haftalık saat',
        saveGoal: 'Hedefi kaydet',
        customizeDashboardModal: 'Ana sayfayı düzenle',
        customizeDashboardDescription: 'Ana sayfada görmek istediğin bileşenleri seç.',
        done: 'Bitti',
        noCourse: 'Ders yok',
        noTask: 'Görev yok',
        viewCourseFallback: 'Ders',
        student: 'Öğrenci',
        motivationSubtitle: '{name} · {description}',
        trLabel: 'Türkçe',
        enLabel: 'English',
        widgetNames: {
            'today-tasks': 'Bugün yapılacaklar',
            'schedule-preview': 'Bugünkü program',
            'quick-focus': 'Hızlı odak',
            'weekly-goal': 'Haftalık hedef',
            'streak-status': 'Ödül durumu',
        },
    },
};

export function fillCopy(template, values = {}) {
    return Object.entries(values).reduce(
        (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
        template
    );
}
