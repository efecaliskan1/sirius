import { create } from 'zustand';
import { generateId } from '../utils/helpers';

function loadData(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

const useAppStore = create((set, get) => ({
    courses: loadData('studywithme_courses'),
    tasks: loadData('studywithme_tasks'),
    scheduleEntries: loadData('studywithme_schedule'),
    sessions: loadData('studywithme_sessions'),
    badges: loadData('studywithme_badges'),
    courseTopics: loadData('studywithme_course_topics'),
    toasts: [],

    // --- FOCUS MODE & SOCIAL ---
    isFocusMode: false,
    focusTask: null, // The task currently focused on
    setFocusMode: (isActive, task = null) => set({ isFocusMode: isActive, focusTask: task }),

    // --- AMBIENT SOUNDS ---
    ambientSounds: [
        { id: 'rain', name: 'Rain', icon: '🌧️', volume: 0, isPlaying: false, url: '' },
        { id: 'cafe', name: 'Cafe', icon: '☕', volume: 0, isPlaying: false, url: '' },
        { id: 'forest', name: 'Forest', icon: '🌲', volume: 0, isPlaying: false, url: '' }
    ],
    updateAmbientSound: (id, updates) => set((state) => ({
        ambientSounds: state.ambientSounds.map(s => s.id === id ? { ...s, ...updates } : s)
    })),

    // --- COURSES ---
    addCourse: (course) => {
        const newCourse = { ...course, id: generateId(), createdAt: new Date().toISOString() };
        set((state) => {
            const courses = [...state.courses, newCourse];
            saveData('studywithme_courses', courses);
            return { courses };
        });
        return newCourse;
    },
    updateCourse: (id, updates) => {
        set((state) => {
            const courses = state.courses.map((c) => (c.id === id ? { ...c, ...updates } : c));
            saveData('studywithme_courses', courses);
            return { courses };
        });
    },
    deleteCourse: (id) => {
        set((state) => {
            const courses = state.courses.filter((c) => c.id !== id);
            saveData('studywithme_courses', courses);
            return { courses };
        });
    },

    // --- COURSE TOPICS ---
    addCourseTopic: (topic) => {
        const newTopic = {
            ...topic,
            id: generateId(),
            completed: false,
            children: [],
            createdAt: new Date().toISOString(),
        };
        set((state) => {
            const courseTopics = [...state.courseTopics, newTopic];
            saveData('studywithme_course_topics', courseTopics);
            return { courseTopics };
        });
        return newTopic;
    },
    updateCourseTopic: (id, updates) => {
        set((state) => {
            const courseTopics = state.courseTopics.map((t) => (t.id === id ? { ...t, ...updates } : t));
            saveData('studywithme_course_topics', courseTopics);
            return { courseTopics };
        });
    },
    deleteCourseTopic: (id) => {
        set((state) => {
            // Also remove all children
            const toDelete = new Set([id]);
            const findChildren = (parentId) => {
                state.courseTopics.forEach((t) => {
                    if (t.parentId === parentId) {
                        toDelete.add(t.id);
                        findChildren(t.id);
                    }
                });
            };
            findChildren(id);
            const courseTopics = state.courseTopics.filter((t) => !toDelete.has(t.id));
            saveData('studywithme_course_topics', courseTopics);
            return { courseTopics };
        });
    },
    toggleCourseTopic: (id) => {
        set((state) => {
            const courseTopics = state.courseTopics.map((t) =>
                t.id === id ? { ...t, completed: !t.completed } : t
            );
            saveData('studywithme_course_topics', courseTopics);
            return { courseTopics };
        });
    },
    reorderCourseTopics: (courseId, orderedIds) => {
        set((state) => {
            const courseTopics = [...state.courseTopics];
            orderedIds.forEach((id, index) => {
                const idx = courseTopics.findIndex((t) => t.id === id);
                if (idx >= 0) courseTopics[idx] = { ...courseTopics[idx], order: index };
            });
            saveData('studywithme_course_topics', courseTopics);
            return { courseTopics };
        });
    },

    // --- TASKS ---
    addTask: (task) => {
        const newTask = {
            ...task,
            id: generateId(),
            completed: false,
            subtasks: task.subtasks || [],
            estimatedMinutes: task.estimatedMinutes || null,
            createdAt: new Date().toISOString(),
        };
        set((state) => {
            const tasks = [...state.tasks, newTask];
            saveData('studywithme_tasks', tasks);
            return { tasks };
        });
        return newTask;
    },
    updateTask: (id, updates) => {
        set((state) => {
            const tasks = state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
            saveData('studywithme_tasks', tasks);
            return { tasks };
        });
    },
    deleteTask: (id) => {
        set((state) => {
            const tasks = state.tasks.filter((t) => t.id !== id);
            saveData('studywithme_tasks', tasks);
            return { tasks };
        });
    },
    toggleTask: (id) => {
        set((state) => {
            const tasks = state.tasks.map((t) =>
                t.id === id ? { ...t, completed: !t.completed } : t
            );
            saveData('studywithme_tasks', tasks);
            return { tasks };
        });
    },
    toggleSubtask: (taskId, subtaskIndex) => {
        set((state) => {
            const tasks = state.tasks.map((t) => {
                if (t.id === taskId && t.subtasks) {
                    const subtasks = [...t.subtasks];
                    subtasks[subtaskIndex] = { ...subtasks[subtaskIndex], completed: !subtasks[subtaskIndex].completed };
                    return { ...t, subtasks };
                }
                return t;
            });
            saveData('studywithme_tasks', tasks);
            return { tasks };
        });
    },
    addSubtask: (taskId, subtaskTitle) => {
        set((state) => {
            const tasks = state.tasks.map((t) => {
                if (t.id === taskId) {
                    const subtasks = [...(t.subtasks || []), { title: subtaskTitle, completed: false }];
                    return { ...t, subtasks };
                }
                return t;
            });
            saveData('studywithme_tasks', tasks);
            return { tasks };
        });
    },
    removeSubtask: (taskId, subtaskIndex) => {
        set((state) => {
            const tasks = state.tasks.map((t) => {
                if (t.id === taskId && t.subtasks) {
                    const subtasks = t.subtasks.filter((_, i) => i !== subtaskIndex);
                    return { ...t, subtasks };
                }
                return t;
            });
            saveData('studywithme_tasks', tasks);
            return { tasks };
        });
    },

    // --- SCHEDULE ---
    addScheduleEntry: (entry) => {
        const newEntry = {
            ...entry,
            id: generateId(),
            blockType: entry.blockType || 'class',
            createdAt: new Date().toISOString(),
        };
        set((state) => {
            const scheduleEntries = [...state.scheduleEntries, newEntry];
            saveData('studywithme_schedule', scheduleEntries);
            return { scheduleEntries };
        });
        return newEntry;
    },
    updateScheduleEntry: (id, updates) => {
        set((state) => {
            const scheduleEntries = state.scheduleEntries.map((e) =>
                e.id === id ? { ...e, ...updates } : e
            );
            saveData('studywithme_schedule', scheduleEntries);
            return { scheduleEntries };
        });
    },
    deleteScheduleEntry: (id) => {
        set((state) => {
            const scheduleEntries = state.scheduleEntries.filter((e) => e.id !== id);
            saveData('studywithme_schedule', scheduleEntries);
            return { scheduleEntries };
        });
    },

    // --- SESSIONS ---
    addSession: (session) => {
        const newSession = {
            ...session,
            id: generateId(),
            createdAt: new Date().toISOString(),
        };
        set((state) => {
            const sessions = [...state.sessions, newSession];
            saveData('studywithme_sessions', sessions);
            return { sessions };
        });
        return newSession;
    },
    updateSession: (id, updates) => {
        set((state) => {
            const sessions = state.sessions.map((s) => (s.id === id ? { ...s, ...updates } : s));
            saveData('studywithme_sessions', sessions);
            return { sessions };
        });
    },

    // --- BADGES ---
    addBadge: (badge) => {
        const newBadge = {
            ...badge,
            id: generateId(),
            unlockedAt: new Date().toISOString(),
        };
        set((state) => {
            const badges = [...state.badges, newBadge];
            saveData('studywithme_badges', badges);
            return { badges };
        });
        return newBadge;
    },

    // --- TOAST ---
    addToast: (toast) => {
        const id = generateId();
        set((state) => ({
            toasts: [...state.toasts, { ...toast, id }],
        }));
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id),
            }));
        }, 4000);
    },
    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id),
        }));
    },
}));

export default useAppStore;
