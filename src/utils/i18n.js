export const LOCALE_STORAGE_KEY = 'sirius_locale';

export const SUPPORTED_LOCALES = [
    { key: 'en', label: 'English', shortLabel: 'EN' },
    { key: 'tr', label: 'Turkce', shortLabel: 'TR' },
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
        trLabel: 'Turkce',
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
        customizeDashboard: 'Panoyu duzenle',
        quoteOfTheDay: 'Gunluk Alinti',
        smartSuggestion: 'Akilli Oneri',
        focus: 'Odaklan',
        todayTasks: 'Bugunun Gorevleri',
        viewAll: 'Tumunu gor ->',
        noTasks: 'Bugun icin planlanmis gorev yok.',
        addTask: 'Gorev Ekle',
        todaySchedule: 'Bugunun Takvimi',
        viewSchedule: 'Takvimi gor ->',
        noSchedule: 'Bugun icin ders veya oturum planlanmadi',
        dailyReflection: 'Gunluk Degerlendirme',
        dailyReflectionPrompt: 'Bugunku calisma oturumun ne kadar verimliydi?',
        productive: 'Verimli',
        average: 'Orta',
        lowFocus: 'Dusuk Odak',
        quickFocus: 'Hizli Odak',
        quickFocusSubtitle: '25 dakikalik bir oturum baslat',
        startSession: 'Oturumu Baslat ->',
        globalStudyRoom: 'Global Calisma Odasi',
        live: 'Canli',
        members: 'uye',
        focusingNow: 'su an odakta',
        activeMembers: 'aktif uye',
        onlineNow: 'simdi cevrimici',
        nobodyActive: 'Henuz aktif kimse yok. Oda, oturum acmis Sirius uyeleri kullandikca otomatik dolar.',
        isInSession: '{name}, {session} icinde calisiyor.',
        isOnline: '{name} su anda cevrimici.',
        joinStudyRoom: 'Calisma Odasina Katil',
        weeklyGoal: 'Haftalik Hedef',
        goalSuffix: 'hedefi',
        yourSky: 'Senin Gokyun',
        details: 'Detaylar ->',
        protectStreak: 'Seriyi Koru',
        streakProtected: 'Serin bugun koruma altinda',
        myCourses: 'Derslerim',
        addCourseCta: '+ Ders Ekle',
        addFirstCourse: 'Baslamak icin ilk dersini ekle',
        sessionsToday: 'Bugunku Oturumlar',
        todaysTasksStat: 'Bugunku Gorevler',
        focusTime: 'Odak Suresi',
        streak: 'Seri',
        editCourse: 'Dersi Duzenle',
        newCourse: 'Yeni Ders',
        courseName: 'Ders Adi',
        courseNamePlaceholder: 'ornegin Matematik 101',
        icon: 'Ikon',
        color: 'Renk',
        delete: 'Sil',
        cancel: 'Iptal',
        save: 'Kaydet',
        addCourse: 'Ders Ekle',
        weeklyStudyGoal: 'Haftalik Calisma Hedefi',
        hoursPerWeek: 'Haftalik saat',
        saveGoal: 'Hedefi Kaydet',
        customizeDashboardModal: 'Panoyu Duzenle',
        customizeDashboardDescription: 'Ana sayfada hangi bilesenlerin gorunecegini sec.',
        done: 'Tamam',
        noCourse: 'Ders secilmedi',
        noTask: 'Gorev secilmedi',
        viewCourseFallback: 'Ders',
        student: 'Ogrenci',
        motivationSubtitle: '{name} · {description}',
        trLabel: 'Turkce',
        enLabel: 'English',
        widgetNames: {
            'today-tasks': 'Bugunun Gorevleri',
            'schedule-preview': 'Bugunun Takvimi',
            'quick-focus': 'Hizli Odak',
            'weekly-goal': 'Haftalik Hedef',
            'streak-status': 'Odul Durumu',
        },
    },
};

export function fillCopy(template, values = {}) {
    return Object.entries(values).reduce(
        (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
        template
    );
}
