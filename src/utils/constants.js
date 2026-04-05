export const THEMES = [
    {
        key: 'calm',
        name: 'Default Calm',
        description: 'Soft blue + neutral backgrounds',
        preview: ['#F8FAFC', '#4F6EF7', '#FFFFFF'],
        vars: {
            '--color-surface': '#F8FAFC',
            '--color-surface-card': '#FFFFFF',
            '--color-surface-hover': '#F1F5F9',
            '--color-surface-dark': '#F8FAFC',
            '--color-border': '#E2E8F0',
            '--color-border-light': '#F1F5F9',
            '--color-text': '#1E293B',
            '--color-text-secondary': '#64748B',
            '--color-text-muted': '#94A3B8',
            '--color-sidebar': '#FFFFFF',
            '--color-primary': '#4F6EF7',
            '--color-primary-bg': '#EEF2FF',
            '--sidebar-bg': 'rgba(255,255,255,0.8)',
            '--sidebar-border': 'rgba(241,245,249,0.8)',
        },
    },
    {
        key: 'dark',
        name: 'Focus Dark',
        description: 'Dark background for deep focus',
        preview: ['#0F172A', '#6366F1', '#1E293B'],
        vars: {
            '--color-surface': '#0F172A',
            '--color-surface-card': '#1E293B',
            '--color-surface-hover': '#334155',
            '--color-surface-dark': '#0F172A',
            '--color-border': '#334155',
            '--color-border-light': '#1E293B',
            '--color-text': '#F1F5F9',
            '--color-text-secondary': '#94A3B8',
            '--color-text-muted': '#64748B',
            '--color-sidebar': '#111827',
            '--color-primary': '#818CF8',
            '--color-primary-bg': 'rgba(99, 102, 241, 0.15)',
            '--sidebar-bg': 'rgba(17,24,39,0.95)',
            '--sidebar-border': 'rgba(51,65,85,0.5)',
        },
    },
    {
        key: 'nature',
        name: 'Nature',
        description: 'Green-focused calming UI',
        preview: ['#F0FDF4', '#16A34A', '#FFFFFF'],
        vars: {
            '--color-surface': '#F0FDF4',
            '--color-surface-card': '#FFFFFF',
            '--color-surface-hover': '#ECFDF5',
            '--color-surface-dark': '#dcfce7',
            '--color-border': '#BBF7D0',
            '--color-border-light': '#DCFCE7',
            '--color-text': '#064E3B',
            '--color-text-secondary': '#065F46',
            '--color-text-muted': '#047857',
            '--color-sidebar': '#FFFFFF',
            '--color-primary': '#16A34A',
            '--color-primary-bg': '#DCFCE7',
            '--sidebar-bg': 'rgba(240,253,244,0.9)',
            '--sidebar-border': 'rgba(187,247,208,0.5)',
        },
    },
    {
        key: 'latte',
        name: 'Coffee Latte',
        description: 'Warm earthy tones',
        preview: ['#FFF8F0', '#D97706', '#FFFFFF'],
        vars: {
            '--color-surface': '#FFF8F0',
            '--color-surface-card': '#FFFFFF',
            '--color-surface-hover': '#FEF3C7',
            '--color-surface-dark': '#fef3c7',
            '--color-border': '#FDE68A',
            '--color-border-light': '#FEF9C3',
            '--color-text': '#451A03',
            '--color-text-secondary': '#78350F',
            '--color-text-muted': '#92400E',
            '--color-sidebar': '#FFFFFF',
            '--color-primary': '#D97706',
            '--color-primary-bg': '#FEF3C7',
            '--sidebar-bg': 'rgba(255,248,240,0.9)',
            '--sidebar-border': 'rgba(253,230,138,0.5)',
        },
    },
    {
        key: 'barbie',
        name: 'Barbie Pink',
        description: 'Glossy pink layers with bold candy accents',
        preview: ['#FFF3F9', '#E11D74', '#F9A8D4'],
        vars: {
            '--color-surface': '#FFF3F9',
            '--color-surface-card': '#FFF9FC',
            '--color-surface-hover': '#FFE7F2',
            '--color-surface-dark': '#FFD9EB',
            '--color-border': '#F7B4D3',
            '--color-border-light': '#FCE3F1',
            '--color-text': '#7A154B',
            '--color-text-secondary': '#A61B64',
            '--color-text-muted': '#C93F84',
            '--color-sidebar': '#FFF7FB',
            '--color-primary': '#E11D74',
            '--color-primary-bg': '#FDE6F1',
            '--sidebar-bg': 'rgba(255,247,251,0.95)',
            '--sidebar-border': 'rgba(225,29,114,0.16)',
        },
    }
];

export const COURSE_COLORS = [
    { id: 'blue', color: '#3B82F6', bg: 'bg-blue-500' },
    { id: 'indigo', color: '#6366F1', bg: 'bg-indigo-500' },
    { id: 'purple', color: '#A855F7', bg: 'bg-purple-500' },
    { id: 'pink', color: '#EC4899', bg: 'bg-pink-500' },
    { id: 'rose', color: '#F43F5E', bg: 'bg-rose-500' },
    { id: 'orange', color: '#F97316', bg: 'bg-orange-500' },
    { id: 'amber', color: '#F59E0B', bg: 'bg-amber-500' },
    { id: 'emerald', color: '#10B981', bg: 'bg-emerald-500' },
    { id: 'teal', color: '#14B8A6', bg: 'bg-teal-500' },
    { id: 'cyan', color: '#06B6D4', bg: 'bg-cyan-500' },
    { id: 'red', color: '#EF4444', bg: 'bg-red-500' },
    { id: 'yellow', color: '#EAB308', bg: 'bg-yellow-500' },
    { id: 'lime', color: '#84CC16', bg: 'bg-lime-500' },
    { id: 'green', color: '#22C55E', bg: 'bg-green-500' },
    { id: 'sky', color: '#0EA5E9', bg: 'bg-sky-500' },
    { id: 'violet', color: '#8B5CF6', bg: 'bg-violet-500' },
    { id: 'fuchsia', color: '#D946EF', bg: 'bg-fuchsia-500' }
];

export const COURSE_ICONS = [
    '📚', '📖', '📓', '📝', '✏️', '💻', '🧮', '📐', '🔬', '🧪',
    '🧬', '🌍', '🏛️', '🎭', '🎨', '🎵', '🗣️', '💼', '📊', '🤝',
    '💡', '🧠', '🏋️', '🧘', '🍔'
];

export const AVATAR_COLORS = [
    'from-blue-400 to-indigo-500',
    'from-emerald-400 to-teal-500',
    'from-rose-400 to-pink-500',
    'from-amber-400 to-orange-500',
    'from-purple-400 to-fuchsia-500',
    'from-sky-400 to-cyan-500',
    'from-lime-400 to-green-500'
];

export const DEFAULT_WIDGETS = [
    { id: 'today-tasks', name: 'Today\'s Tasks', enabled: true },
    { id: 'schedule-preview', name: 'Today\'s Schedule', enabled: true },
    { id: 'quick-focus', name: 'Quick Focus', enabled: true },
    { id: 'global-study-room', name: 'Global Study Room', enabled: true },
    { id: 'weekly-goal', name: 'Weekly Goal', enabled: true },
    { id: 'streak-status', name: 'Rewards Status', enabled: true }
];

export const PHILOSOPHER_QUOTES = [
    { text: 'The unexamined life is not worth living.', trText: 'Sorgulanmamış bir hayat yaşamaya değmez.', author: 'Socrates' },
    { text: 'Wonder is the feeling of the philosopher, and philosophy begins in wonder.', trText: 'Hayret filozofun duygusudur; felsefe de hayretle başlar.', author: 'Plato' },
    { text: 'Happiness depends upon ourselves.', trText: 'Mutluluk bize bağlıdır.', author: 'Aristotle' },
    { text: 'No man is free who is not master of himself.', trText: 'Kendine hakim olamayan hiç kimse özgür değildir.', author: 'Epictetus' },
    { text: 'The happiness of your life depends upon the quality of your thoughts.', trText: 'Hayatının mutluluğu, düşüncelerinin niteliğine bağlıdır.', author: 'Marcus Aurelius' },
    { text: 'I think, therefore I am.', trText: 'Düşünüyorum, öyleyse varım.', author: 'Rene Descartes' },
    { text: 'He who has a why to live can bear almost any how.', trText: 'Yaşamak için bir nedeni olan kişi, neredeyse her zorluğa katlanabilir.', author: 'Friedrich Nietzsche' },
    { text: 'He who knows others is wise; he who knows himself is enlightened.', trText: 'Başkalarını bilen bilgedir; kendini bilen ise aydınlanmıştır.', author: 'Lao Tzu' }
];

export const COINS_PER_SESSION = 10;
export const XP_PER_SESSION = 75;
export const XP_PER_TASK = 20;
export const SESSION_REWARD_TIERS = [
    { minMinutes: 91, maxMinutes: 120, coins: 40, xp: 400 },
    { minMinutes: 61, maxMinutes: 90, coins: 30, xp: 250 },
    { minMinutes: 31, maxMinutes: 60, coins: 20, xp: 150 },
    { minMinutes: 5, maxMinutes: 30, coins: COINS_PER_SESSION, xp: XP_PER_SESSION },
];
export const STREAK_PROTECTION_COST = 50;
export const MIN_FOCUS_SESSION_MINUTES = 5;
export const MAX_SESSION_REWARD_MINUTES = 120;
export const WEEKLY_GOAL_MINUTES_MIN = 60;
export const WEEKLY_GOAL_MINUTES_MAX = 6000;
export const MAX_LEVEL = 20;
export const LEVEL_THRESHOLDS = [
    0,
    500,
    1130,
    1913,
    2877,
    4055,
    5485,
    7212,
    9290,
    11782,
    14763,
    18321,
    22559,
    27600,
    33588,
    40694,
    49119,
    59101,
    70920,
    84906,
];

export const INPUT_LIMITS = {
    fullName: 80,
    email: 120,
    password: 128,
    courseName: 80,
    scheduleLabel: 80,
    shortNote: 240,
    longNote: 500,
    taskTitle: 120,
    subtaskTitle: 120,
    topicTitle: 120,
    sessionLabel: 120,
};

export const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low Priority', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    { value: 'medium', label: 'Medium', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    { value: 'high', label: 'High Priority', color: 'bg-rose-100 text-rose-800 border-rose-200' }
];

export const DEFAULT_POMODORO_SETTINGS = {
    workTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15,
    sessionsUntilLongBreak: 4,
    autoStartBreaks: false,
    autoStartPomodoros: false
};

export const AMBIENT_SOUNDS = [
    { id: 'none', label: 'Silenced', emoji: '🤫' },
    { id: 'rain', label: 'Rain', emoji: '🌧️', file: 'ambient-rain.mp3' },
    { id: 'cafe', label: 'Cafe', emoji: '☕', file: 'ambient-cafe.mp3' },
    { id: 'fire', label: 'Fire', emoji: '🔥', file: 'ambient-fire.mp3' },
    { id: 'wave', label: 'Waves', emoji: '🌊', file: 'ambient-wave.mp3' }
];

export const MOTIVATIONAL_MESSAGES = {
    streak: [
        {
            min: 1, max: 3, messages: [
                "You've started a streak! Keep it going! 🔥",
                "{streak} days strong! Don't break the chain!",
                "Great start! {streak} days of consistent study!"
            ]
        },
        {
            min: 4, max: 7, messages: [
                "Amazing! {streak} day streak! You're on fire! 🔥",
                "{streak} days! Your consistency is paying off!",
                "Keep pushing! {streak} days and counting!"
            ]
        },
        {
            min: 8, max: 30, messages: [
                "Incredible! {streak} day streak! You're unstoppable! 🚀",
                "{streak} days! That's serious dedication!",
                "Wow, {streak} days! You're building something great!"
            ]
        },
        {
            min: 31, max: 999, messages: [
                "LEGENDARY! {streak} day streak! 👑",
                "{streak} days! You're an inspiration!",
                "Absolute beast mode! {streak} days! 💪"
            ]
        }
    ],
    sessions: [
        {
            min: 0, max: 5, messages: [
                "Every journey starts with a single step. Let's focus! 📚",
                "Ready to begin your study journey? 🌱",
                "Small steps lead to big results. Start now!"
            ]
        },
        {
            min: 6, max: 20, messages: [
                "You're building great habits! Keep going! 💪",
                "Progress is progress, no matter how small!",
                "You're doing amazing! Stay focused! ✨"
            ]
        },
        {
            min: 21, max: 50, messages: [
                "You're becoming a study machine! 🎯",
                "Your dedication is impressive! Keep it up!",
                "Look how far you've come! Don't stop now!"
            ]
        },
        {
            min: 51, max: 999, messages: [
                "Study master status achieved! 🏆",
                "Your consistency is truly remarkable!",
                "You're an inspiration to every student! 🌟"
            ]
        }
    ],
    inactive: [
        "We missed you! Ready to get back on track? 🙌",
        "Welcome back! Let's pick up where you left off! 📖",
        "It's never too late to start again. Let's go! 🚀"
    ]
};

export const DAYS_OF_WEEK = [
    { id: 'mon', label: 'Monday', short: 'Mon' },
    { id: 'tue', label: 'Tuesday', short: 'Tue' },
    { id: 'wed', label: 'Wednesday', short: 'Wed' },
    { id: 'thu', label: 'Thursday', short: 'Thu' },
    { id: 'fri', label: 'Friday', short: 'Fri' },
    { id: 'sat', label: 'Saturday', short: 'Sat' },
    { id: 'sun', label: 'Sunday', short: 'Sun' }
];

export const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);

export const BLOCK_TYPES = [
    { value: 'class', label: 'Class', color: '#3B82F6' },
    { value: 'study', label: 'Study Session', color: '#6366F1' },
    { value: 'task', label: 'Task Block', color: '#F97316' },
    { value: 'exam', label: 'Exam / Quiz', color: '#F43F5E' },
    { value: 'other', label: 'Other', color: '#6B7280' },
    { value: 'custom', label: 'Custom', color: '#8B5CF6' }
];

export const COMPANION_STAGES = [
    { minLevel: 1, name: 'Cosmic Void', emoji: '🌌', description: 'A quiet, dark region waiting to light up as you focus.' },
    { minLevel: 2, name: 'Nebula', emoji: '🌫️', description: 'A colorful cloud where scattered ideas begin to gather.' },
    { minLevel: 4, name: 'Protostar', emoji: '✨', description: 'The first spark as pressure builds and your momentum starts glowing.' },
    { minLevel: 6, name: 'Rising Star', emoji: '⭐', description: 'A bright core forming through consistency and sustained attention.' },
    { minLevel: 8, name: 'First Orbit', emoji: '💫', description: 'Strong focus begins shaping stable rings around your study system.' },
    { minLevel: 10, name: 'Rocky Planet', emoji: '🌑', description: 'Knowledge starts settling into a solid, dependable foundation.' },
    { minLevel: 12, name: 'Blue World', emoji: '🌊', description: 'Steady effort creates an environment where real growth can thrive.' },
    { minLevel: 15, name: 'Cosmic Civilization', emoji: '🏙️', description: 'Ambition expands into whole cities of progress visible from afar.' },
    { minLevel: 18, name: 'Constellation', emoji: '☄️', description: 'Many successful sessions connect into a larger map of mastery.' },
    { minLevel: 20, name: 'Cosmic Library', emoji: '👁️‍🗨️', description: 'An endless universe where every system stores a lesson you have earned.' }
];

export const BADGE_DEFINITIONS = [
    {
        badgeKey: 'first_session',
        title: 'First Focus',
        description: 'Complete your first Pomodoro session',
        icon: '🎯',
        condition: (stats) => stats.totalSessions >= 1
    },
    {
        badgeKey: '3_day_streak',
        title: 'On a Roll',
        description: 'Study for 3 consecutive days',
        icon: '🔥',
        condition: (stats) => stats.streakCount >= 3
    },
    {
        badgeKey: '10_sessions',
        title: 'Dedicated',
        description: 'Complete 10 focus sessions',
        icon: '✅',
        condition: (stats) => stats.totalSessions >= 10
    },
    {
        badgeKey: '7_day_streak',
        title: 'Unstoppable',
        description: 'Study for 7 consecutive days',
        icon: '🚀',
        condition: (stats) => stats.streakCount >= 7
    },
    {
        badgeKey: '100_hours',
        title: 'Centurion',
        description: 'Reach 100 total hours of focus time',
        icon: '👑',
        condition: (stats) => stats.totalMinutes >= 6000
    },
    {
        badgeKey: 'night_owl',
        title: 'Night Owl',
        description: 'Do your best work late at night',
        icon: '🦉',
        condition: (stats) => {
            const hour = new Date().getHours();
            return hour >= 23 || hour <= 4;
        }
    },
    {
        badgeKey: 'kara_delik',
        title: 'Black Hole',
        description: 'Bend time with an epic 3-hour focus session.',
        icon: '🕳️',
        condition: (stats) => stats.longestSessionMinutes >= 180
    },
    {
        badgeKey: 'supernova',
        title: 'Supernova',
        description: 'Finish a major project and trigger a massive burst of progress.',
        icon: '💥',
        condition: (stats) => false // Triggered when fully completing major tasks/projects
    },
    {
        badgeKey: 'deep_focus',
        title: 'Deep Focus',
        description: 'Reach 100 total hours of focused study time.',
        icon: '🎯',
        condition: (stats) => stats.totalMinutes >= 6000
    },
    {
        badgeKey: 'serial_killer',
        title: 'Relentless',
        description: 'Build a ruthless, steady study streak.',
        icon: '⚔️',
        condition: (stats) => stats.streakCount >= 5 || stats.streak >= 5
    }
];
