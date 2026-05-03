import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Modal from '../components/UI/Modal';
import { INPUT_LIMITS, PRIORITY_OPTIONS } from '../utils/constants';
import { formatDate, getToday, isToday, isFuture, minutesToDisplay } from '../utils/helpers';
import { useLocale } from '../utils/i18n';

const FILTER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
];

const TASKS_COPY = {
    en: {
        title: 'Tasks',
        subtitle: 'Manage your study tasks',
        addTask: 'Add Task',
        allCourses: 'All courses',
        empty: 'No tasks here. Add your first task!',
        today: 'Today',
        focus: 'Focus',
        addSubtask: 'Add',
        addSubtaskPlaceholder: 'Add subtask...',
        editTask: 'Edit task',
        newTask: 'New task',
        taskTitle: 'Title',
        taskTitlePlaceholder: 'e.g. Read Chapter 5',
        course: 'Course',
        noCourse: 'No course',
        description: 'Description (optional)',
        descriptionPlaceholder: 'Notes...',
        dueDate: 'Due Date',
        dueTime: 'Due Time',
        estimatedTime: 'Est. Time (min)',
        priority: 'Priority',
        subtasks: 'Subtasks',
        cancel: 'Cancel',
        saveChanges: 'Save Changes',
        addSubtaskAction: 'Add',
        priorityLabels: {
            low: 'Low',
            medium: 'Medium',
            high: 'High',
        },
        filters: {
            all: 'All',
            today: 'Today',
            upcoming: 'Upcoming',
            completed: 'Completed',
        },
    },
    tr: {
        title: 'Görevler',
        subtitle: 'Çalışma görevlerini düzenle',
        addTask: 'Görev ekle',
        allCourses: 'Tüm dersler',
        empty: 'Burada henüz görev yok. İlk görevini ekleyebilirsin.',
        today: 'Bugün',
        focus: 'Odak',
        addSubtask: 'Ekle',
        addSubtaskPlaceholder: 'Alt görev ekle...',
        editTask: 'Görevi düzenle',
        newTask: 'Yeni görev',
        taskTitle: 'Başlık',
        taskTitlePlaceholder: 'Örn. 5. bölümü oku',
        course: 'Ders',
        noCourse: 'Ders yok',
        description: 'Açıklama (isteğe bağlı)',
        descriptionPlaceholder: 'Notlar...',
        dueDate: 'Bitiş tarihi',
        dueTime: 'Bitiş saati',
        estimatedTime: 'Tahmini süre (dk)',
        priority: 'Öncelik',
        subtasks: 'Alt görevler',
        cancel: 'Vazgeç',
        saveChanges: 'Değişiklikleri kaydet',
        addSubtaskAction: 'Ekle',
        priorityLabels: {
            low: 'Düşük',
            medium: 'Orta',
            high: 'Yüksek',
        },
        filters: {
            all: 'Tümü',
            today: 'Bugün',
            upcoming: 'Yaklaşan',
            completed: 'Tamamlanan',
        },
    },
};

export default function TasksPage() {
    const user = useAuthStore((s) => s.user);
    const tasks = useAppStore((s) => s.tasks);
    const courses = useAppStore((s) => s.courses);
    const addTask = useAppStore((s) => s.addTask);
    const updateTask = useAppStore((s) => s.updateTask);
    const deleteTask = useAppStore((s) => s.deleteTask);
    const toggleTask = useAppStore((s) => s.toggleTask);
    const toggleSubtask = useAppStore((s) => s.toggleSubtask);
    const addSubtask = useAppStore((s) => s.addSubtask);
    const removeSubtask = useAppStore((s) => s.removeSubtask);
    const navigate = useNavigate();

    const [filter, setFilter] = useState('all');
    const [courseFilter, setCourseFilter] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [expandedTask, setExpandedTask] = useState(null);
    const [newSubtaskText, setNewSubtaskText] = useState('');
    const locale = useLocale();
    const copy = TASKS_COPY[locale] || TASKS_COPY.en;
    const themeKey = user?.theme || 'calm';
    const isDark = themeKey === 'dark';
    const isBarbie = themeKey === 'barbie';

    const [form, setForm] = useState({
        title: '',
        courseId: '',
        description: '',
        dueDate: '',
        dueTime: '',
        priority: 'medium',
        estimatedMinutes: '',
        subtasks: [],
    });
    const [formSubtask, setFormSubtask] = useState('');
    const safeCourses = Array.isArray(courses) ? courses : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const userCourses = safeCourses.filter((c) => c?.userId === user?.id);
    const userTasks = safeTasks.filter((t) => t?.userId === user?.id);
    const localizedPriorityOptions = PRIORITY_OPTIONS.map((option) => ({
        ...option,
        label: copy.priorityLabels?.[option.value] || option.label,
    }));
    const filterShellBackground = 'var(--bb-paper)';
    const filterButtonStyle = (active) => ({
        background: active ? 'var(--bb-accent-1)' : 'transparent',
        color: 'var(--bb-ink)',
        border: active ? '2px solid var(--bb-ink)' : '2px solid transparent',
        boxShadow: active ? '2px 2px 0 var(--bb-shadow)' : 'none',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
    });
    const getPriorityMeta = (priority) => {
        const label = copy.priorityLabels?.[priority] || priority || copy.priorityLabels.medium;

        if (isDark) {
            if (priority === 'high') {
                return {
                    label,
                    style: {
                        background: 'rgba(239, 68, 68, 0.18)',
                        color: '#fecaca',
                        borderColor: 'rgba(248, 113, 113, 0.28)',
                    },
                };
            }

            if (priority === 'low') {
                return {
                    label,
                    style: {
                        background: 'rgba(148, 163, 184, 0.16)',
                        color: '#cbd5e1',
                        borderColor: 'rgba(148, 163, 184, 0.22)',
                    },
                };
            }

            return {
                label,
                style: {
                    background: 'rgba(245, 158, 11, 0.16)',
                    color: '#fde68a',
                    borderColor: 'rgba(251, 191, 36, 0.22)',
                },
            };
        }

        if (priority === 'high') {
            return {
                label,
                style: {
                    background: '#fff1f2',
                    color: '#be123c',
                    borderColor: '#fecdd3',
                },
            };
        }

        if (priority === 'low') {
            return {
                label,
                style: {
                    background: '#f8fafc',
                    color: '#64748b',
                    borderColor: '#e2e8f0',
                },
            };
        }

        return {
            label,
            style: {
                background: '#fffbeb',
                color: '#b45309',
                borderColor: '#fde68a',
            },
        };
    };

    const filteredTasks = userTasks.filter((t) => {
        if (courseFilter && t.courseId !== courseFilter) return false;
        switch (filter) {
            case 'today': return t.dueDate === getToday() && !t.completed;
            case 'upcoming': return t.dueDate && isFuture(t.dueDate) && !t.completed;
            case 'completed': return t.completed;
            default: return !t.completed;
        }
    });

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (a.priority !== b.priority) return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        return 1;
    });

    const getCourse = (courseId) => safeCourses.find((c) => c.id === courseId);

    const openAddModal = () => {
        setEditingTask(null);
        setForm({ title: '', courseId: userCourses[0]?.id || '', description: '', dueDate: '', dueTime: '', priority: 'medium', estimatedMinutes: '', subtasks: [] });
        setShowModal(true);
    };

    const openEditModal = (task) => {
        setEditingTask(task);
        setForm({
            title: task.title,
            courseId: task.courseId,
            description: task.description || '',
            dueDate: task.dueDate || '',
            dueTime: task.dueTime || '',
            priority: task.priority || 'medium',
            estimatedMinutes: task.estimatedMinutes || '',
            subtasks: task.subtasks || [],
        });
        setShowModal(true);
    };

    const handleAddFormSubtask = () => {
        if (!formSubtask.trim()) return;
        setForm({ ...form, subtasks: [...form.subtasks, { title: formSubtask, completed: false }] });
        setFormSubtask('');
    };

    const handleRemoveFormSubtask = (idx) => {
        setForm({ ...form, subtasks: form.subtasks.filter((_, i) => i !== idx) });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        const parsedEstimatedMinutes = Number.parseInt(form.estimatedMinutes, 10);
        const data = {
            ...form,
            estimatedMinutes: Number.isFinite(parsedEstimatedMinutes)
                ? Math.min(720, Math.max(1, parsedEstimatedMinutes))
                : null,
        };
        if (editingTask) {
            updateTask(editingTask.id, data);
        } else {
            addTask({ ...data, userId: user.id });
        }
        setShowModal(false);
    };

    const handleAddInlineSubtask = (taskId) => {
        if (!newSubtaskText.trim()) return;
        addSubtask(taskId, newSubtaskText);
        setNewSubtaskText('');
    };

    const startQuickFocus = (task) => {
        const params = new URLSearchParams();
        if (task.courseId) params.set('courseId', task.courseId);
        params.set('taskId', task.id);
        navigate(`/pomodoro?${params.toString()}`);
    };

    return (
        <div className="max-w-[920px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-text, #1e293b)' }}>{copy.title}</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>{copy.subtitle}</p>
                </div>
                <button onClick={openAddModal} className="btn-primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    {copy.addTask}
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
                <div
                    className="flex rounded-xl p-1 gap-1"
                    style={{
                        background: filterShellBackground,
                        border: 'var(--bb-border-w) solid var(--bb-ink)',
                        boxShadow: '3px 3px 0 var(--bb-shadow)',
                    }}
                >
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={filterButtonStyle(filter === tab.key)}
                        >
                            {copy.filters[tab.key] || tab.label}
                        </button>
                    ))}
                </div>
                {userCourses.length > 0 && (
                    <select
                        value={courseFilter}
                        onChange={(e) => setCourseFilter(e.target.value)}
                        className="input !w-auto !py-1.5 text-xs"
                    >
                        <option value="">{copy.allCourses}</option>
                        {userCourses.map((c) => (
                            <option key={c.id} value={c.id}>{c.courseName}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Task List */}
            <div className="space-y-2">
                {sortedTasks.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-3">📝</div>
                        <p className="text-slate-400 text-sm">{copy.empty}</p>
                    </div>
                ) : (
                    sortedTasks.map((task, index) => {
                        const course = getCourse(task.courseId);
                        const isExpanded = expandedTask === task.id;
                        const subtasks = task.subtasks || [];
                        const completedSubtasks = subtasks.filter((s) => s.completed).length;
                        const priorityMeta = getPriorityMeta(task.priority || 'medium');

                        return (
                            <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.025 }}
                                className={`card group ${task.completed ? 'opacity-50' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Checkbox */}
                                    <button
                                        onClick={() => toggleTask(task.id)}
                                        className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.completed
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : 'border-slate-200 hover:border-blue-400'
                                            }`}
                                    >
                                        {task.completed && (
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                        )}
                                    </button>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedTask(isExpanded ? null : task.id)}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-sm font-medium ${task.completed ? 'line-through text-slate-400' : ''}`} style={!task.completed ? { color: 'var(--theme-text, #1e293b)' } : {}}>
                                                        {task.title}
                                                    </span>
                                                    {task.priority && (
                                                        <span
                                                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: PRIORITY_OPTIONS.find((p) => p.value === task.priority)?.color }}
                                                        />
                                                    )}
                                                    {subtasks.length > 0 && (
                                                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                                            {completedSubtasks}/{subtasks.length}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2.5 mt-1">
                                                    {course && (
                                                        <span className="badge text-[10px]" style={{ backgroundColor: course.color + '12', color: course.color }}>
                                                            {course.icon && <span className="mr-0.5">{course.icon}</span>}{course.courseName}
                                                        </span>
                                                    )}
                                                    {task.dueDate && (
                                                        <span className={`text-[11px] ${isToday(task.dueDate) ? 'text-blue-500 font-medium' : 'text-slate-400'}`}>
                                                            {isToday(task.dueDate) ? copy.today : formatDate(task.dueDate, locale)}
                                                        </span>
                                                    )}
                                                    {task.estimatedMinutes && (
                                                        <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                                                            ⏱ {minutesToDisplay(task.estimatedMinutes)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`text-sm font-medium ${task.completed ? 'line-through text-slate-400' : ''}`} style={!task.completed ? { color: 'var(--theme-text, #1e293b)' } : {}}>
                                            </span>
                                            <span
                                                className="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] flex-shrink-0"
                                                style={priorityMeta.style}
                                            >
                                                {priorityMeta.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Quick Focus Button */}
                                    {!task.completed && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); startQuickFocus(task); }}
                                            className="rounded-2xl border px-3 py-2 text-xs font-semibold shadow-sm transition-all hover:-translate-y-0.5"
                                            style={{
                                                borderColor: isDark ? 'rgba(129,140,248,0.34)' : '#c7d2fe',
                                                background: isDark ? 'rgba(99,102,241,0.18)' : '#eef2ff',
                                                color: isDark ? '#c7d2fe' : '#4338ca',
                                            }}
                                            title={copy.focus}
                                        >
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                            {copy.focus}
                                        </button>
                                    )}

                                    {/* Actions */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                                        className="rounded-xl border p-2 shadow-sm transition-all"
                                        style={isDark
                                            ? {
                                                borderColor: 'rgba(99,102,241,0.18)',
                                                background: 'rgba(15,23,42,0.88)',
                                                color: 'rgba(226,232,240,0.74)',
                                            }
                                            : {
                                                borderColor: '#e2e8f0',
                                                background: '#ffffff',
                                                color: '#64748b',
                                            }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                        className="rounded-xl border p-2 shadow-sm transition-all"
                                        style={isDark
                                            ? {
                                                borderColor: 'rgba(248,113,113,0.18)',
                                                background: 'rgba(15,23,42,0.88)',
                                                color: 'rgba(226,232,240,0.74)',
                                            }
                                            : {
                                                borderColor: '#e2e8f0',
                                                background: '#ffffff',
                                                color: '#64748b',
                                            }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    </button>
                                </div>

                                {/* Expanded subtasks */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="mt-3 pl-8 space-y-1.5 border-t border-slate-50 pt-3">
                                                {task.description && (
                                                    <p className="text-xs text-slate-400 mb-2 italic">{task.description}</p>
                                                )}
                                                {subtasks.map((sub, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 group/sub">
                                                        <button
                                                            onClick={() => toggleSubtask(task.id, idx)}
                                                            className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${sub.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 hover:border-blue-400'
                                                                }`}
                                                        >
                                                            {sub.completed && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                                        </button>
                                                        <span className={`text-xs flex-1 ${sub.completed ? 'line-through text-slate-400' : 'text-slate-500'}`}>
                                                            {sub.title}
                                                        </span>
                                                        <button
                                                            onClick={() => removeSubtask(task.id, idx)}
                                                            className="opacity-0 group-hover/sub:opacity-100 text-slate-300 hover:text-red-400 text-xs"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                                {/* Add subtask inline */}
                                                <div className="flex items-center gap-2 mt-2">
                            <input
                                className="flex-1 text-xs py-1 px-2 border border-slate-100 rounded-lg outline-none focus:border-blue-300"
                                placeholder={copy.addSubtaskPlaceholder}
                                value={expandedTask === task.id ? newSubtaskText : ''}
                                onChange={(e) => setNewSubtaskText(e.target.value.slice(0, INPUT_LIMITS.subtaskTitle))}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddInlineSubtask(task.id); }}
                                maxLength={INPUT_LIMITS.subtaskTitle}
                            />
                                                    <button
                                                        onClick={() => handleAddInlineSubtask(task.id)}
                                                        className="text-xs text-blue-500 font-medium hover:text-blue-600"
                                                    >
                                                        {copy.addSubtask}
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Add/Edit Task Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingTask ? copy.editTask : copy.newTask}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">{copy.taskTitle}</label>
                        <input
                            className="input"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value.slice(0, INPUT_LIMITS.taskTitle) })}
                            placeholder={copy.taskTitlePlaceholder}
                            maxLength={INPUT_LIMITS.taskTitle}
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="label">{copy.course}</label>
                        <select className="input" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                            <option value="">{copy.noCourse}</option>
                            {userCourses.map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.courseName}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className="label">{copy.description}</label>
                        <textarea
                            className="input !h-16 resize-none"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value.slice(0, INPUT_LIMITS.longNote) })}
                            placeholder={copy.descriptionPlaceholder}
                            maxLength={INPUT_LIMITS.longNote}
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                            <label className="label">{copy.dueDate}</label>
                            <input type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">{copy.dueTime}</label>
                            <input type="time" className="input" value={form.dueTime} onChange={(e) => setForm({ ...form, dueTime: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">{copy.estimatedTime}</label>
                            <input
                                type="number"
                                className="input"
                                value={form.estimatedMinutes}
                                onChange={(e) => setForm({
                                    ...form,
                                    estimatedMinutes: e.target.value.replace(/[^\d]/g, '').slice(0, 3),
                                })}
                                placeholder="45"
                                min="1"
                                max="720"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="label">{copy.priority}</label>
                        <div className="flex gap-2">
                            {localizedPriorityOptions.map((p) => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setForm({ ...form, priority: p.value })}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${form.priority === p.value ? 'border-transparent text-white shadow-sm' : 'border-slate-200 text-slate-400'
                                        }`}
                                    style={form.priority === p.value ? { backgroundColor: p.color } : {}}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Subtasks in form */}
                    <div>
                        <label className="label">{copy.subtasks}</label>
                        {form.subtasks.map((sub, idx) => (
                            <div key={idx} className="flex items-center gap-2 mb-1.5">
                                <span className="text-xs text-slate-500 flex-1 bg-slate-50 px-2.5 py-1.5 rounded-lg">{sub.title}</span>
                                <button type="button" onClick={() => handleRemoveFormSubtask(idx)} className="text-slate-300 hover:text-red-400 text-xs">×</button>
                            </div>
                        ))}
                        <div className="flex gap-2">
                            <input
                                className="input !py-1.5 text-xs flex-1"
                                value={formSubtask}
                                onChange={(e) => setFormSubtask(e.target.value.slice(0, INPUT_LIMITS.subtaskTitle))}
                                placeholder={copy.addSubtaskPlaceholder}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFormSubtask(); } }}
                                maxLength={INPUT_LIMITS.subtaskTitle}
                            />
                            <button type="button" onClick={handleAddFormSubtask} className="btn-ghost text-xs text-blue-500">{copy.addSubtaskAction}</button>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">{copy.cancel}</button>
                        <button type="submit" className="btn-primary flex-1 justify-center">{editingTask ? copy.saveChanges : copy.addTask}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
