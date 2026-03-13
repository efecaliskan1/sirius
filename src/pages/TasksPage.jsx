import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Modal from '../components/UI/Modal';
import { PRIORITY_OPTIONS } from '../utils/constants';
import { formatDate, getToday, isToday, isFuture, minutesToDisplay } from '../utils/helpers';

const FILTER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
];

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

    const userCourses = courses.filter((c) => c.userId === user?.id);
    const userTasks = tasks.filter((t) => t.userId === user?.id);

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

    const getCourse = (courseId) => courses.find((c) => c.id === courseId);

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
        const data = {
            ...form,
            estimatedMinutes: form.estimatedMinutes ? parseInt(form.estimatedMinutes) : null,
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
        <div className="max-w-[800px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--theme-text, #1e293b)' }}>Tasks</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--theme-text-muted, #94a3b8)' }}>Manage your study tasks</p>
                </div>
                <button onClick={openAddModal} className="btn-primary">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add Task
                </button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
                <div className="flex bg-slate-100/80 rounded-xl p-0.5 gap-0.5">
                    {FILTER_TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === tab.key ? 'bg-white text-[#111827] shadow-sm' : 'text-slate-400 hover:text-slate-500'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                {userCourses.length > 0 && (
                    <select
                        value={courseFilter}
                        onChange={(e) => setCourseFilter(e.target.value)}
                        className="input !w-auto !py-1.5 text-xs"
                    >
                        <option value="">All courses</option>
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
                        <p className="text-slate-400 text-sm">No tasks here. Add your first task!</p>
                    </div>
                ) : (
                    sortedTasks.map((task, index) => {
                        const course = getCourse(task.courseId);
                        const isExpanded = expandedTask === task.id;
                        const subtasks = task.subtasks || [];
                        const completedSubtasks = subtasks.filter((s) => s.completed).length;

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
                                                    {isToday(task.dueDate) ? 'Today' : formatDate(task.dueDate)}
                                                </span>
                                            )}
                                            {task.estimatedMinutes && (
                                                <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                                                    ⏱ {minutesToDisplay(task.estimatedMinutes)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Focus Button */}
                                    {!task.completed && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); startQuickFocus(task); }}
                                            className="opacity-0 group-hover:opacity-100 text-xs font-medium text-blue-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1"
                                            title="Start a focus session for this task"
                                        >
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                            Focus
                                        </button>
                                    )}

                                    {/* Actions */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-blue-400 transition-all p-1"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all p-1"
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
                                                        placeholder="Add subtask..."
                                                        value={expandedTask === task.id ? newSubtaskText : ''}
                                                        onChange={(e) => setNewSubtaskText(e.target.value)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddInlineSubtask(task.id); }}
                                                    />
                                                    <button
                                                        onClick={() => handleAddInlineSubtask(task.id)}
                                                        className="text-xs text-blue-500 font-medium hover:text-blue-600"
                                                    >
                                                        Add
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
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingTask ? 'Edit Task' : 'New Task'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Title</label>
                        <input
                            className="input"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g. Read Chapter 5"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="label">Course</label>
                        <select className="input" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                            <option value="">No course</option>
                            {userCourses.map((c) => (<option key={c.id} value={c.id}>{c.icon} {c.courseName}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className="label">Description (optional)</label>
                        <textarea
                            className="input !h-16 resize-none"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Notes..."
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="label">Due Date</label>
                            <input type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Due Time</label>
                            <input type="time" className="input" value={form.dueTime} onChange={(e) => setForm({ ...form, dueTime: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Est. Time (min)</label>
                            <input
                                type="number"
                                className="input"
                                value={form.estimatedMinutes}
                                onChange={(e) => setForm({ ...form, estimatedMinutes: e.target.value })}
                                placeholder="45"
                                min="1"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="label">Priority</label>
                        <div className="flex gap-2">
                            {PRIORITY_OPTIONS.map((p) => (
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
                        <label className="label">Subtasks</label>
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
                                onChange={(e) => setFormSubtask(e.target.value)}
                                placeholder="Add a subtask..."
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFormSubtask(); } }}
                            />
                            <button type="button" onClick={handleAddFormSubtask} className="btn-ghost text-xs text-blue-500">Add</button>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                        <button type="submit" className="btn-primary flex-1 justify-center">{editingTask ? 'Save Changes' : 'Add Task'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
