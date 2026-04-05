import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Modal from '../components/UI/Modal';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import { COURSE_COLORS, COURSE_ICONS, INPUT_LIMITS } from '../utils/constants';
import { HOME_COPY, useLocale } from '../utils/i18n';

const COURSES_COPY = {
    en: {
        title: 'Courses',
        subtitle: 'Keep each subject in its own space and jump into the roadmap when you are ready.',
        summaryLabel: 'Active courses',
        tasksLabel: 'Open tasks',
        roadmapLabel: 'Roadmap items',
        openRoadmap: 'Open roadmap',
    },
    tr: {
        title: 'Dersler',
        subtitle: 'Her dersi kendi alanında tut, hazır olduğunda doğrudan yol haritasına geç.',
        summaryLabel: 'Aktif ders',
        tasksLabel: 'Açık görev',
        roadmapLabel: 'Yol haritası öğesi',
        openRoadmap: 'Yol haritasını aç',
    },
};

export default function CoursesPage() {
    const locale = useLocale();
    const sharedCopy = HOME_COPY[locale] || HOME_COPY.en;
    const copy = COURSES_COPY[locale] || COURSES_COPY.en;
    const user = useAuthStore((s) => s.user);
    const courses = useAppStore((s) => s.courses);
    const courseTopics = useAppStore((s) => s.courseTopics);
    const tasks = useAppStore((s) => s.tasks);
    const addCourse = useAppStore((s) => s.addCourse);
    const updateCourse = useAppStore((s) => s.updateCourse);
    const deleteCourse = useAppStore((s) => s.deleteCourse);
    const navigate = useNavigate();

    const [showCourseModal, setShowCourseModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState(null);
    const [courseForm, setCourseForm] = useState({
        courseName: '',
        color: COURSE_COLORS[0].color,
        icon: COURSE_ICONS[0],
    });

    const themeKey = user?.theme || 'calm';
    const isDark = themeKey === 'dark';
    const isBarbie = themeKey === 'barbie';
    const safeCourses = Array.isArray(courses) ? courses : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeCourseTopics = Array.isArray(courseTopics) ? courseTopics : [];

    const userCourses = useMemo(
        () => safeCourses.filter((course) => course?.userId === user?.id),
        [safeCourses, user?.id]
    );

    const courseStats = useMemo(() => {
        return userCourses.reduce((acc, course) => {
            acc[course.id] = {
                tasks: safeTasks.filter((task) => task?.userId === user?.id && task.courseId === course.id && !task.completed).length,
                topics: safeCourseTopics.filter((topic) => topic?.userId === user?.id && topic.courseId === course.id).length,
            };
            return acc;
        }, {});
    }, [safeCourseTopics, safeTasks, user?.id, userCourses]);

    const totalOpenTasks = Object.values(courseStats).reduce((sum, stat) => sum + stat.tasks, 0);
    const totalTopics = Object.values(courseStats).reduce((sum, stat) => sum + stat.topics, 0);

    const openAddCourseModal = () => {
        setEditingCourse(null);
        setCourseForm({
            courseName: '',
            color: COURSE_COLORS[Math.floor(Math.random() * COURSE_COLORS.length)].color,
            icon: COURSE_ICONS[Math.floor(Math.random() * COURSE_ICONS.length)],
        });
        setShowCourseModal(true);
    };

    const openEditCourseModal = (course) => {
        setEditingCourse(course);
        setCourseForm({
            courseName: course.courseName,
            color: course.color,
            icon: course.icon || COURSE_ICONS[0],
        });
        setShowCourseModal(true);
    };

    const handleCourseSubmit = (event) => {
        event.preventDefault();
        if (!courseForm.courseName.trim()) return;

        if (editingCourse) {
            updateCourse(editingCourse.id, courseForm);
        } else {
            addCourse({ ...courseForm, userId: user.id });
        }

        setShowCourseModal(false);
    };

    const handleDeleteCourse = () => {
        if (!editingCourse) return;
        deleteCourse(editingCourse.id);
        setShowCourseModal(false);
    };

    return (
        <div className="w-full max-w-[1440px] space-y-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <div
                    className={`overflow-hidden rounded-[32px] border px-6 py-7 sm:px-8 sm:py-8 ${isDark ? 'border-indigo-500/15' : 'border-slate-200/70'}`}
                    style={{
                        background: isDark
                            ? 'radial-gradient(circle at top right, rgba(129, 140, 248, 0.18), rgba(15, 23, 42, 0.9) 46%)'
                            : isBarbie
                                ? 'linear-gradient(135deg, rgba(255, 247, 251, 1) 0%, rgba(249, 168, 212, 0.22) 100%)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(238, 242, 255, 0.82) 100%)',
                    }}
                >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--theme-primary, #4F46E5)' }}>
                                Sirius
                            </p>
                            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl" style={{ color: 'var(--theme-text, #111827)' }}>
                                {copy.title}
                            </h1>
                            <p className="mt-3 max-w-xl text-sm leading-6 sm:text-[15px]" style={{ color: 'var(--theme-text-secondary, #64748B)' }}>
                                {copy.subtitle}
                            </p>
                        </div>

                        <button onClick={openAddCourseModal} className="btn-primary shrink-0">
                            {locale === 'tr' ? 'Yeni ders ekle' : 'Add a new course'}
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                    {[
                        { label: copy.summaryLabel, value: userCourses.length, accent: '📚' },
                        { label: copy.tasksLabel, value: totalOpenTasks, accent: '📝' },
                        { label: copy.roadmapLabel, value: totalTopics, accent: '🧭' },
                    ].map((card) => (
                        <div key={card.label} className="card !p-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg" style={{ background: 'var(--theme-primary-bg, #EEF2FF)' }}>
                                    {card.accent}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>
                                        {card.label}
                                    </p>
                                    <p className="mt-1 text-2xl font-black leading-none" style={{ color: 'var(--theme-text, #111827)' }}>
                                        {card.value}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {userCourses.length === 0 ? (
                    <div className="card col-span-full flex min-h-[260px] flex-col items-center justify-center gap-4 text-center">
                        <div className="text-5xl">📚</div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold" style={{ color: 'var(--theme-text, #111827)' }}>{sharedCopy.addFirstCourse}</h2>
                            <p className="text-sm" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>{copy.subtitle}</p>
                        </div>
                        <button onClick={openAddCourseModal} className="btn-primary">
                            {locale === 'tr' ? 'Yeni ders ekle' : 'Add a new course'}
                        </button>
                    </div>
                ) : (
                    userCourses.map((course, index) => {
                        const stats = courseStats[course.id] || { tasks: 0, topics: 0 };
                        return (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.04 }}
                                className="card card-interactive group flex min-h-[220px] flex-col justify-between !p-5"
                                onClick={() => navigate(`/course/${course.id}`)}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-[20px] text-2xl" style={{ backgroundColor: `${course.color}18` }}>
                                            {course.icon || '📚'}
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--theme-text, #111827)' }}>
                                                {course.courseName}
                                            </h2>
                                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: course.color }}>
                                                {copy.openRoadmap}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            openEditCourseModal(course);
                                        }}
                                        className="rounded-xl p-2 opacity-70 transition hover:bg-black/5 hover:opacity-100"
                                        style={{ color: 'var(--theme-text-muted, #94A3B8)' }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--theme-surface-hover, #F8FAFC)' }}>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>{copy.tasksLabel}</p>
                                        <p className="mt-2 text-xl font-black" style={{ color: 'var(--theme-text, #111827)' }}>{stats.tasks}</p>
                                    </div>
                                    <div className="rounded-2xl px-4 py-3" style={{ background: 'var(--theme-surface-hover, #F8FAFC)' }}>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--theme-text-muted, #94A3B8)' }}>{copy.roadmapLabel}</p>
                                        <p className="mt-2 text-xl font-black" style={{ color: 'var(--theme-text, #111827)' }}>{stats.topics}</p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => navigate(`/course/${course.id}`)}
                                    className="mt-6 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition"
                                    style={{
                                        borderColor: 'var(--theme-border-light, #E2E8F0)',
                                        color: 'var(--theme-primary, #4F46E5)',
                                        background: 'var(--theme-primary-bg, #EEF2FF)',
                                    }}
                                >
                                    <span>{copy.openRoadmap}</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                        <path d="M5 12h14" />
                                        <path d="m13 5 7 7-7 7" />
                                    </svg>
                                </button>
                            </motion.div>
                        );
                    })
                )}
            </div>

            <Modal
                isOpen={showCourseModal}
                onClose={() => setShowCourseModal(false)}
                title={editingCourse ? sharedCopy.editCourse : sharedCopy.newCourse}
            >
                <form onSubmit={handleCourseSubmit} className="space-y-4">
                    <div>
                        <label className="label">{sharedCopy.courseName}</label>
                        <input
                            className="input"
                            value={courseForm.courseName}
                            onChange={(event) => setCourseForm({ ...courseForm, courseName: event.target.value.slice(0, INPUT_LIMITS.courseName) })}
                            placeholder={sharedCopy.courseNamePlaceholder}
                            maxLength={INPUT_LIMITS.courseName}
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="label">{sharedCopy.icon}</label>
                        <div className="flex flex-wrap gap-2">
                            {COURSE_ICONS.map((icon) => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setCourseForm({ ...courseForm, icon })}
                                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg transition ${courseForm.icon === icon ? 'scale-110' : 'hover:scale-105'}`}
                                    style={courseForm.icon === icon
                                        ? {
                                            background: 'var(--theme-primary-bg, #EEF2FF)',
                                            boxShadow: `0 0 0 2px ${isBarbie ? 'rgba(225, 29, 114, 0.28)' : 'rgba(79, 110, 247, 0.26)'}`,
                                        }
                                        : { background: 'var(--theme-surface-hover, #F8FAFC)' }}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="label">{sharedCopy.color}</label>
                        <div className="flex flex-wrap gap-2.5">
                            {COURSE_COLORS.map((color) => (
                                <button
                                    key={color.id}
                                    type="button"
                                    onClick={() => setCourseForm({ ...courseForm, color: color.color })}
                                    className={`h-8 w-8 rounded-xl transition ${courseForm.color === color.color ? 'scale-110 ring-2 ring-offset-2 ring-blue-400' : 'hover:scale-105'}`}
                                    style={{ backgroundColor: color.color }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        {editingCourse && (
                            <button type="button" onClick={handleDeleteCourse} className="btn-ghost text-red-500 hover:bg-red-50">
                                {sharedCopy.delete}
                            </button>
                        )}
                        <div className="flex-1" />
                        <button type="button" onClick={() => setShowCourseModal(false)} className="btn-secondary">
                            {sharedCopy.cancel}
                        </button>
                        <button type="submit" className="btn-primary">
                            {editingCourse ? sharedCopy.save : sharedCopy.addCourse}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
