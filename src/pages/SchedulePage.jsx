import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Modal from '../components/UI/Modal';
import { TIME_SLOTS, BLOCK_TYPES, INPUT_LIMITS } from '../utils/constants';
import { getWeekDates, getDayNumber, formatDateWithOptions, isToday, formatTime24, timeToMinutes } from '../utils/helpers';
import { useLocale } from '../utils/i18n';
import { ensureBrowserNotificationPermission } from '../utils/notifications';

const SCHEDULE_COPY = {
    en: {
        title: 'Schedule',
        prev: 'Prev',
        thisWeek: 'This Week',
        next: 'Next',
        time: 'Time',
        editBlock: 'Edit Schedule Block',
        addBlock: 'Add Schedule Block',
        blockType: 'Block Type',
        course: 'Course',
        selectCourse: 'Select a course',
        customLabel: 'Label',
        customLabelPlaceholder: 'e.g. Library Time',
        addAsTask: 'Also add to Tasks',
        taskTitle: 'Task title',
        taskTitlePlaceholder: 'e.g. Review chapter 3 notes',
        linkedTask: 'Linked task',
        taskSyncHint: 'Keep this schedule block connected with your task list so it is easier to track.',
        date: 'Date',
        start: 'Start',
        end: 'End',
        note: 'Note (optional)',
        notePlaceholder: 'Room 201, bring textbook...',
        delete: 'Delete',
        cancel: 'Cancel',
        save: 'Save',
        addBlockButton: 'Add Block',
        courseFallback: 'Course',
        usageGuide: 'How to use your schedule',
        mobileAgenda: 'Weekly agenda',
        faqTitle: 'Quick guide',
        timeGuide: 'Sirius uses a 24-hour clock here so afternoon hours continue as 13:00, 14:00, and 15:00.',
        lateNightGuide: 'Late-night slots continue through 02:00 so you can keep overnight study blocks in one view.',
        usageItems: [
            { title: 'Drag blocks freely', body: 'Move a block to another hour slot to reschedule it quickly.' },
            { title: 'Connect tasks when needed', body: 'Study, exam, custom, and other blocks can also create or update a linked task.' },
            { title: '24-hour timeline', body: 'This page uses 24-hour time and stays visible until 02:00 so evening sessions remain easy to place.' },
        ],
        blockTypes: {
            class: 'Class',
            study: 'Study Session',
            exam: 'Exam / Quiz',
            other: 'Other',
            custom: 'Custom',
        },
    },
    tr: {
        title: 'Takvim',
        prev: 'Önceki',
        thisWeek: 'Bu hafta',
        next: 'Sonraki',
        time: 'Saat',
        editBlock: 'Program bloğunu düzenle',
        addBlock: 'Program bloğu ekle',
        blockType: 'Blok türü',
        course: 'Ders',
        selectCourse: 'Bir ders seç',
        customLabel: 'Başlık',
        customLabelPlaceholder: 'Örn. Kütüphane saati',
        addAsTask: 'Aynı zamanda görevlere ekle',
        taskTitle: 'Görev başlığı',
        taskTitlePlaceholder: 'Örn. 3. ünite notlarını gözden geçir',
        linkedTask: 'Bağlı görev',
        taskSyncHint: 'Bu program bloğunu görev listene de bağlayarak daha kolay takip edebilirsin.',
        date: 'Tarih',
        start: 'Başlangıç',
        end: 'Bitiş',
        note: 'Not (isteğe bağlı)',
        notePlaceholder: 'Salon 201, kitabı getir...',
        delete: 'Sil',
        cancel: 'İptal',
        save: 'Kaydet',
        addBlockButton: 'Blok ekle',
        courseFallback: 'Ders',
        usageGuide: 'Takvimi nasıl kullanırsın?',
        mobileAgenda: 'Haftalık akış',
        faqTitle: 'Kısa kullanım notları',
        timeGuide: 'Bu sayfada 24 saat düzeni kullanılır; öğleden sonra saatleri 13:00, 14:00 ve 15:00 şeklinde devam eder.',
        lateNightGuide: 'Gece geç saat blokları da aynı akışta kalabilsin diye takvim 02:00\'ye kadar uzanır.',
        usageItems: [
            { title: 'Blokları sürükleyebilirsin', body: 'Bir bloğu başka bir saate taşıyarak hızlıca yeniden planlayabilirsin.' },
            { title: 'Görevlerle bağlayabilirsin', body: 'Çalışma, sınav, özel ve diğer bloklar görev listesine de eklenebilir.' },
            { title: '24 saat düzeni kullanılır', body: 'Takvim bu sayfada 24 saat formatında görünür ve gece 02:00\'ye kadar devam eder.' },
        ],
        blockTypes: {
            class: 'Ders',
            study: 'Çalışma oturumu',
            exam: 'Sınav / kısa yoklama',
            other: 'Diğer',
            custom: 'Özel',
        },
    },
};

const LATE_NIGHT_END_HOUR = 26;

function scheduleMinutesToTime(totalMinutes) {
    const safeMinutes = Math.max(0, Math.min(LATE_NIGHT_END_HOUR * 60, totalMinutes));
    const hours = Math.floor(safeMinutes / 60);
    const minutes = safeMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function addDaysToDateKey(dateKey, offsetDays) {
    const base = new Date(`${dateKey}T00:00:00`);
    base.setDate(base.getDate() + offsetDays);
    return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`;
}

function normalizeScheduleDateTime(dateKey, time) {
    const [rawHour = '0', rawMinute = '0'] = String(time || '00:00').split(':');
    const hour = Number.parseInt(rawHour, 10);
    const minute = Number.parseInt(rawMinute, 10);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
        return { date: dateKey, time: '00:00' };
    }

    const dayOffset = hour >= 24 ? Math.floor(hour / 24) : 0;
    const normalizedHour = ((hour % 24) + 24) % 24;

    return {
        date: dayOffset > 0 ? addDaysToDateKey(dateKey, dayOffset) : dateKey,
        time: `${String(normalizedHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    };
}

export default function SchedulePage() {
    const user = useAuthStore((s) => s.user);
    const courses = useAppStore((s) => s.courses);
    const tasks = useAppStore((s) => s.tasks);
    const scheduleEntries = useAppStore((s) => s.scheduleEntries);
    const addTask = useAppStore((s) => s.addTask);
    const updateTask = useAppStore((s) => s.updateTask);
    const addScheduleEntry = useAppStore((s) => s.addScheduleEntry);
    const updateScheduleEntry = useAppStore((s) => s.updateScheduleEntry);
    const deleteScheduleEntry = useAppStore((s) => s.deleteScheduleEntry);

    const [weekOffset, setWeekOffset] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [dragEntry, setDragEntry] = useState(null);
    const locale = useLocale();
    const copy = SCHEDULE_COPY[locale] || SCHEDULE_COPY.en;
    const themeKey = user?.theme || 'calm';
    const isDark = themeKey === 'dark';
    const isBarbie = themeKey === 'barbie';
    const titleColor = 'var(--theme-text, #1e293b)';
    const mutedColor = 'var(--theme-text-muted, #64748b)';
    const tableBorderColor = isDark
        ? 'rgba(71,85,105,0.42)'
        : isBarbie
            ? 'rgba(225,29,114,0.14)'
            : 'rgba(226,232,240,0.9)';
    const tableHeaderBg = isDark
        ? 'rgba(20,28,47,0.98)'
        : isBarbie
            ? 'rgba(255,241,247,0.96)'
            : 'rgba(248,250,252,0.96)';
    const tableTimeBg = isDark
        ? 'rgba(11,18,32,0.98)'
        : isBarbie
            ? 'rgba(255,247,251,0.94)'
            : 'rgba(248,250,252,0.86)';
    const dayCellBg = isDark
        ? 'rgba(15,23,42,0.52)'
        : isBarbie
            ? 'rgba(255,250,252,0.78)'
            : 'rgba(248,250,252,0.74)';
    const todayCellBg = isDark
        ? 'rgba(15,23,42,0.52)'
        : isBarbie
            ? 'rgba(255,250,252,0.78)'
            : 'rgba(248,250,252,0.74)';
    const todayBadgeShadow = isDark
        ? '0 8px 18px rgba(99,102,241,0.24)'
        : isBarbie
            ? '0 10px 24px rgba(225,29,114,0.22)'
            : '0 10px 24px rgba(79,110,247,0.18)';
    const [form, setForm] = useState({
        courseId: '',
        date: '',
        startTime: '09:00',
        endTime: '10:00',
        optionalNote: '',
        blockType: 'class',
        customLabel: '',
        syncToTask: false,
        taskTitle: '',
        taskId: null,
    });

    const today = new Date();
    const referenceDate = new Date(today);
    referenceDate.setDate(today.getDate() + weekOffset * 7);
    const weekDates = getWeekDates(referenceDate);

    const safeCourses = Array.isArray(courses) ? courses : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const safeScheduleEntries = Array.isArray(scheduleEntries) ? scheduleEntries : [];
    const userCourses = safeCourses.filter((c) => c?.userId === user?.id);
    const userTasks = safeTasks.filter((t) => t?.userId === user?.id);
    const userEntries = safeScheduleEntries.filter((e) => e?.userId === user?.id);
    const timeOptions = useMemo(() => {
        const options = [];
        for (let hour = 6; hour <= LATE_NIGHT_END_HOUR; hour += 1) {
            for (const minute of [0, 30]) {
                if (hour === LATE_NIGHT_END_HOUR && minute === 30) continue;
                options.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
            }
        }
        return options;
    }, []);

    const entriesByDate = useMemo(() => {
        const map = {};
        for (const entry of userEntries) {
            if (!map[entry.date]) map[entry.date] = [];
            map[entry.date].push(entry);
        }
        return map;
    }, [userEntries]);

    const getCourse = (courseId) => safeCourses.find((c) => c.id === courseId);
    const getTask = (taskId) => userTasks.find((t) => t.id === taskId);
    const getBlockType = (type) => BLOCK_TYPES.find((b) => b.value === type) || BLOCK_TYPES[0];
    const buildDefaultTaskTitle = (nextForm) => {
        if (nextForm.taskTitle?.trim()) {
            return nextForm.taskTitle.trim();
        }
        if (nextForm.blockType === 'custom' && nextForm.customLabel?.trim()) {
            return nextForm.customLabel.trim();
        }
        if ((nextForm.blockType === 'class' || nextForm.blockType === 'study') && nextForm.courseId) {
            const course = getCourse(nextForm.courseId);
            if (course?.courseName) {
                return nextForm.blockType === 'study' ? `${course.courseName} focus block` : course.courseName;
            }
        }
        return copy.blockTypes[nextForm.blockType] || copy.courseFallback;
    };
    const buildLinkedTaskDescription = useCallback((nextForm) => {
        const sections = [];
        const course = nextForm.courseId ? getCourse(nextForm.courseId) : null;
        const normalizedStart = formatTime24(nextForm.startTime);
        const normalizedEnd = formatTime24(nextForm.endTime);
        const dateLabel = formatDateWithOptions(nextForm.date, { day: 'numeric', month: 'long', year: 'numeric' }, locale);

        if (course?.courseName) {
            sections.push(locale === 'tr' ? `Ders: ${course.courseName}` : `Course: ${course.courseName}`);
        }

        sections.push(
            locale === 'tr'
                ? `Takvim bloğu: ${dateLabel} • ${normalizedStart} - ${normalizedEnd}`
                : `Schedule block: ${dateLabel} • ${normalizedStart} - ${normalizedEnd}`
        );

        if (nextForm.customLabel?.trim() && nextForm.blockType === 'custom') {
            sections.push(
                locale === 'tr'
                    ? `Blok başlığı: ${nextForm.customLabel.trim()}`
                    : `Block label: ${nextForm.customLabel.trim()}`
            );
        }

        if (nextForm.optionalNote?.trim()) {
            sections.push(nextForm.optionalNote.trim());
        }

        return sections.join('\n');
    }, [getCourse, locale]);

    const buildLinkedTaskPayload = useCallback((nextForm) => {
        const durationMinutes = Math.max(1, timeToMinutes(nextForm.endTime) - timeToMinutes(nextForm.startTime));
        const normalizedDue = normalizeScheduleDateTime(nextForm.date, nextForm.endTime);

        return {
            title: buildDefaultTaskTitle(nextForm),
            courseId: nextForm.courseId || '',
            description: buildLinkedTaskDescription(nextForm),
            dueDate: normalizedDue.date,
            dueTime: normalizedDue.time,
            priority: 'medium',
            estimatedMinutes: durationMinutes,
        };
    }, [buildLinkedTaskDescription]);

    const syncLinkedTaskTiming = useCallback((entry, updates = {}) => {
        if (!entry?.taskId) return;
        const linkedTask = getTask(entry.taskId);
        if (!linkedTask) return;

        const nextForm = {
            courseId: updates.courseId ?? entry.courseId ?? '',
            date: updates.date || entry.date,
            startTime: updates.startTime || entry.startTime,
            endTime: updates.endTime || entry.endTime,
            optionalNote: updates.optionalNote ?? entry.optionalNote ?? '',
            blockType: updates.blockType || entry.blockType || 'class',
            customLabel: updates.customLabel ?? entry.customLabel ?? '',
            taskTitle: linkedTask.title || '',
        };

        updateTask(entry.taskId, buildLinkedTaskPayload(nextForm));
    }, [buildLinkedTaskPayload, getTask, updateTask]);

    const openAddModal = (date, time) => {
        setEditingEntry(null);
        const endHour = Math.min(LATE_NIGHT_END_HOUR, parseInt(time.split(':')[0], 10) + 1);
        setForm({
            courseId: userCourses[0]?.id || '',
            date,
            startTime: time,
            endTime: `${endHour.toString().padStart(2, '0')}:00`,
            optionalNote: '',
            blockType: 'class',
            customLabel: '',
            syncToTask: true,
            taskTitle: '',
            taskId: null,
        });
        setShowModal(true);
    };

    const openEditModal = (entry) => {
        const linkedTask = entry.taskId ? getTask(entry.taskId) : null;
        setEditingEntry(entry);
        setForm({
            courseId: entry.courseId || '',
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime,
            optionalNote: entry.optionalNote || '',
            blockType: entry.blockType || 'class',
            customLabel: entry.customLabel || '',
            syncToTask: Boolean(entry.taskId),
            taskTitle: linkedTask?.title || '',
            taskId: entry.taskId || null,
        });
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (form.blockType === 'class' && !form.courseId) return;
        if (timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)) return;

        const { syncToTask, taskTitle, ...entryForm } = form;
        const shouldSyncTask = syncToTask;
        let linkedTaskId = form.taskId || null;

        if (shouldSyncTask) {
            const taskPayload = buildLinkedTaskPayload(form);

            if (linkedTaskId && getTask(linkedTaskId)) {
                updateTask(linkedTaskId, taskPayload);
            } else {
                const createdTask = addTask({ ...taskPayload, userId: user.id });
                linkedTaskId = createdTask?.id || null;
            }
        } else {
            linkedTaskId = null;
        }

        const schedulePayload = { ...entryForm, taskId: linkedTaskId };
        if (editingEntry) {
            updateScheduleEntry(editingEntry.id, schedulePayload);
            syncLinkedTaskTiming(editingEntry, schedulePayload);
        } else {
            addScheduleEntry({ ...schedulePayload, userId: user.id });
        }
        void ensureBrowserNotificationPermission();
        setShowModal(false);
    };

    const handleDelete = () => {
        if (editingEntry) {
            deleteScheduleEntry(editingEntry.id);
            setShowModal(false);
        }
    };

    // Drag and drop handlers
    const handleDragStart = useCallback((e, entry) => {
        setDragEntry(entry);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', entry.id);
        e.target.style.opacity = '0.5';
    }, []);

    const handleDragEnd = useCallback((e) => {
        e.target.style.opacity = '1';
        setDragEntry(null);
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback((e, date, timeSlot) => {
        e.preventDefault();
        if (!dragEntry) return;

        const oldStartMin = timeToMinutes(dragEntry.startTime);
        const oldEndMin = timeToMinutes(dragEntry.endTime);
        const duration = oldEndMin - oldStartMin;
        const newStartMin = timeToMinutes(timeSlot);
        const newEndMin = newStartMin + duration;
        if (newEndMin > LATE_NIGHT_END_HOUR * 60) {
            setDragEntry(null);
            return;
        }

        const nextEndTime = scheduleMinutesToTime(newEndMin);

        updateScheduleEntry(dragEntry.id, {
            date,
            startTime: timeSlot,
            endTime: nextEndTime,
        });
        syncLinkedTaskTiming(dragEntry, {
            date,
            startTime: timeSlot,
            endTime: nextEndTime,
        });
        setDragEntry(null);
    }, [dragEntry, syncLinkedTaskTiming, updateScheduleEntry]);

    const getEntriesForSlot = (date, timeSlot) => {
        const entries = entriesByDate[date] || [];
        const slotMinutes = timeToMinutes(timeSlot);
        return entries.filter((e) => {
            const startMin = timeToMinutes(e.startTime);
            const endMin = timeToMinutes(e.endTime);
            return slotMinutes >= startMin && slotMinutes < endMin;
        });
    };

    const isEntryStart = (entry, timeSlot) => entry.startTime === timeSlot;

    const getEntrySpan = (entry) => {
        const startMin = timeToMinutes(entry.startTime);
        const endMin = timeToMinutes(entry.endTime);
        return Math.max(1, Math.round((endMin - startMin) / 60));
    };

    const getEntryColor = (entry) => {
        if (entry.blockType === 'class' || !entry.blockType) {
            const course = getCourse(entry.courseId);
            return course?.color || '#4F6EF7';
        }
        return getBlockType(entry.blockType).color;
    };

    const getEntryLabel = (entry) => {
        if (entry.blockType === 'class' || !entry.blockType) {
            const course = getCourse(entry.courseId);
            return course?.courseName || copy.courseFallback;
        }
        if (entry.blockType === 'custom' && entry.customLabel) return entry.customLabel;
        return copy.blockTypes[entry.blockType] || getBlockType(entry.blockType).label;
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: titleColor }}>{copy.title}</h1>
                    <p className="text-sm mt-0.5" style={{ color: mutedColor }}>{formatDateWithOptions(weekDates[0], { month: 'long', year: 'numeric' }, locale)}</p>
                </div>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center gap-2 mb-5">
                <button onClick={() => setWeekOffset((w) => w - 1)} className="btn-ghost text-xs">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                    {copy.prev}
                </button>
                <button
                    onClick={() => setWeekOffset(0)}
                    className="btn-ghost text-xs font-semibold"
                    style={weekOffset === 0 ? { color: 'var(--theme-primary, #4F6EF7)' } : { color: mutedColor }}
                >
                    {copy.thisWeek}
                </button>
                <button onClick={() => setWeekOffset((w) => w + 1)} className="btn-ghost text-xs">
                    {copy.next}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
                <div className="flex-1"></div>
                {/* Block type legend */}
                <div className="flex items-center gap-3">
                    {BLOCK_TYPES.map((bt) => (
                        <div key={bt.value} className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: bt.color }}></div>
                            <span className="text-[10px]" style={{ color: mutedColor }}>{copy.blockTypes[bt.value] || bt.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Weekly Table */}
            <div className="grid gap-3 mb-5 md:grid-cols-3">
                {copy.usageItems.map((item) => (
                    <div key={item.title} className="card">
                        <div className="text-sm font-semibold" style={{ color: 'var(--theme-text, #1e293b)' }}>
                            {item.title}
                        </div>
                        <p className="text-sm mt-1.5" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                            {item.body}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mb-5 md:hidden">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--theme-text, #1e293b)' }}>
                        {copy.mobileAgenda}
                    </h2>
                    <span className="text-[11px]" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                        {copy.timeGuide}
                    </span>
                </div>
                <div className="space-y-3">
                    {weekDates.map((date) => {
                        const dayEntries = [...(entriesByDate[date] || [])].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
                        return (
                            <div key={date} className="card !p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                                            {formatDateWithOptions(date, { weekday: 'long' }, locale)}
                                        </div>
                                        <div className="mt-1 text-sm font-semibold" style={{ color: 'var(--theme-text, #1e293b)' }}>
                                            {formatDateWithOptions(date, { day: 'numeric', month: 'long' }, locale)}
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => openAddModal(date, '09:00')} className="btn-ghost text-xs">
                                        + {copy.addBlockButton}
                                    </button>
                                </div>

                                {dayEntries.length > 0 ? (
                                    <div className="space-y-2">
                                        {dayEntries.map((entry) => {
                                            const color = getEntryColor(entry);
                                            return (
                                                <button
                                                    key={entry.id}
                                                    type="button"
                                                    onClick={() => openEditModal(entry)}
                                                    className="flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition"
                                                    style={{
                                                        borderColor: 'var(--theme-border-light, #e2e8f0)',
                                                        background: 'var(--theme-surface-hover, rgba(255,255,255,0.5))',
                                                    }}
                                                >
                                                    <span className="mt-0.5 h-10 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm font-semibold" style={{ color: 'var(--theme-text, #1e293b)' }}>
                                                            {getEntryLabel(entry)}
                                                        </div>
                                                        <div className="mt-1 text-xs" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                                                            {formatTime24(entry.startTime)} - {formatTime24(entry.endTime)}
                                                        </div>
                                                        {entry.taskId && (
                                                            <div className="mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: 'var(--theme-primary-bg, #EEF2FF)', color: 'var(--theme-primary, #4F46E5)' }}>
                                                                {copy.linkedTask}
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-dashed px-4 py-4 text-sm" style={{ borderColor: 'var(--theme-border-light, #e2e8f0)', color: 'var(--theme-text-muted, #64748b)' }}>
                                        + {copy.addBlockButton}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Weekly Table */}
            <div className="hidden overflow-hidden rounded-2xl card !p-0 md:block">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[800px]">
                        <thead>
                            <tr>
                                <th
                                    className="w-16 p-3 text-[10px] font-medium uppercase tracking-wider"
                                    style={{
                                        color: mutedColor,
                                        borderBottom: `1px solid ${tableBorderColor}`,
                                        background: tableTimeBg,
                                    }}
                                >
                                    {copy.time}
                                </th>
                                {weekDates.map((date, i) => (
                                    <th
                                        key={date}
                                        className="p-2.5 text-center border-l last:border-r-0"
                                        style={{
                                            borderBottom: `1px solid ${tableBorderColor}`,
                                            borderLeft: `1px solid ${tableBorderColor}`,
                                            borderRight: i === weekDates.length - 1 ? `1px solid ${tableBorderColor}` : 'none',
                                            background: tableHeaderBg,
                                        }}
                                    >
                                        <div className="text-[10px] font-medium uppercase" style={{ color: mutedColor }}>
                                            {formatDateWithOptions(date, { weekday: 'short' }, locale)}
                                        </div>
                                        <div
                                            className="mt-0.5 text-base font-semibold"
                                            style={isToday(date)
                                                ? {
                                                    color: 'var(--theme-surface-card, #fff)',
                                                    backgroundColor: 'var(--theme-primary, #4F6EF7)',
                                                    width: '2rem',
                                                    height: '2rem',
                                                    borderRadius: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    margin: '0 auto',
                                                    boxShadow: todayBadgeShadow,
                                                    outline: isDark ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                                }
                                                : { color: titleColor }}
                                        >
                                            {getDayNumber(date)}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {TIME_SLOTS.map((timeSlot, rowIdx) => (
                                <tr key={timeSlot}>
                                    <td
                                        className="p-1.5 text-[10px] text-right font-medium pr-2.5 whitespace-nowrap"
                                        style={{
                                            color: mutedColor,
                                            borderRight: `1px solid ${tableBorderColor}`,
                                            borderBottom: `1px solid ${tableBorderColor}`,
                                            background: tableTimeBg,
                                        }}
                                    >
                                        {formatTime24(timeSlot)}
                                    </td>
                                    {weekDates.map((date) => {
                                        const entries = getEntriesForSlot(date, timeSlot);
                                        const startEntries = entries.filter((e) => isEntryStart(e, timeSlot));
                                        const hasNonStartEntries = entries.some((e) => !isEntryStart(e, timeSlot));

                                        return (
                                            <td
                                                key={`${date}-${timeSlot}`}
                                                className={`last:border-r-0 p-0.5 h-[48px] relative ${!hasNonStartEntries && startEntries.length === 0 ? 'cursor-pointer transition-colors' : ''}`}
                                                style={{
                                                    borderLeft: `1px solid ${tableBorderColor}`,
                                                    borderBottom: `1px solid ${tableBorderColor}`,
                                                    background: isToday(date) ? todayCellBg : dayCellBg,
                                                    boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.02)' : 'none',
                                                }}
                                                onClick={() => {
                                                    if (startEntries.length === 0 && !hasNonStartEntries) {
                                                        openAddModal(date, timeSlot);
                                                    }
                                                }}
                                                onDragOver={handleDragOver}
                                                onDrop={(e) => handleDrop(e, date, timeSlot)}
                                            >
                                                {startEntries.map((entry) => {
                                                    const span = getEntrySpan(entry);
                                                    const color = getEntryColor(entry);
                                                    const label = getEntryLabel(entry);
                                                return (
                                                    <motion.div
                                                        key={entry.id}
                                                            layoutId={entry.id}
                                                            draggable
                                                            onDragStart={(e) => handleDragStart(e, entry)}
                                                            onDragEnd={handleDragEnd}
                                                            onClick={(e) => { e.stopPropagation(); openEditModal(entry); }}
                                                            className="absolute inset-x-1 rounded-xl px-2 py-1.5 cursor-grab active:cursor-grabbing text-xs font-medium text-white overflow-hidden z-10 hover:brightness-110 transition-all shadow-sm"
                                                            style={{
                                                                backgroundColor: color,
                                                                height: `${span * 48 - 4}px`,
                                                                top: '2px',
                                                            }}
                                                    >
                                                        <div className="truncate font-semibold text-[11px]">{label}</div>
                                                        <div className="text-white/70 text-[9px] mt-0.5">
                                                                {formatTime24(entry.startTime)} - {formatTime24(entry.endTime)}
                                                        </div>
                                                        {entry.taskId && (
                                                            <div className="inline-flex items-center gap-1 rounded-full bg-white/16 px-1.5 py-0.5 mt-1 text-[9px] text-white/90">
                                                                <span>{copy.linkedTask}</span>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                );
                                            })}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingEntry ? copy.editBlock : copy.addBlock}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Block Type */}
                    <div>
                        <label className="label">{copy.blockType}</label>
                        <div className="flex gap-2">
                            {BLOCK_TYPES.map((bt) => (
                                <button
                                    key={bt.value}
                                    type="button"
                                    onClick={() => setForm({
                                        ...form,
                                        blockType: bt.value,
                                    })}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${form.blockType === bt.value
                                        ? 'text-white border-transparent shadow-sm'
                                        : ''
                                        }`}
                                    style={form.blockType === bt.value
                                        ? { backgroundColor: bt.color }
                                        : {
                                            borderColor: 'var(--theme-border, #e2e8f0)',
                                            color: mutedColor,
                                            background: 'var(--theme-surface-hover, #f8fafc)',
                                        }}
                                >
                                    {copy.blockTypes[bt.value] || bt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Course (for class/study types) */}
                        {(form.blockType === 'class' || form.blockType === 'study') && (
                        <div>
                            <label className="label">{copy.course}</label>
                            <select
                                className="input"
                                value={form.courseId}
                                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                                required={form.blockType === 'class'}
                            >
                                <option value="">{copy.selectCourse}</option>
                                {userCourses.map((c) => (
                                    <option key={c.id} value={c.id}>{c.courseName}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div
                        className="rounded-2xl border p-3"
                        style={{
                            borderColor: 'var(--theme-border, #e2e8f0)',
                            background: 'var(--theme-surface-hover, rgba(248,250,252,0.7))',
                        }}
                    >
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.syncToTask}
                                onChange={(e) => setForm({ ...form, syncToTask: e.target.checked })}
                                className="mt-1 rounded border-slate-300"
                            />
                            <div>
                                <div className="text-sm font-medium" style={{ color: 'var(--theme-text, #1e293b)' }}>
                                    {copy.addAsTask}
                                </div>
                                <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                                    {copy.taskSyncHint}
                                </p>
                            </div>
                        </label>

                        {form.syncToTask && (
                            <div className="mt-3">
                                <label className="label">{copy.taskTitle}</label>
                                <input
                                    className="input"
                                    value={form.taskTitle}
                                    onChange={(e) => setForm({ ...form, taskTitle: e.target.value.slice(0, INPUT_LIMITS.taskTitle) })}
                                    placeholder={copy.taskTitlePlaceholder}
                                    maxLength={INPUT_LIMITS.taskTitle}
                                />
                            </div>
                        )}
                    </div>

                    {/* Custom label */}
                    {form.blockType === 'custom' && (
                        <div>
                            <label className="label">{copy.customLabel}</label>
                            <input
                                className="input"
                                value={form.customLabel}
                                onChange={(e) => setForm({ ...form, customLabel: e.target.value.slice(0, INPUT_LIMITS.scheduleLabel) })}
                                placeholder={copy.customLabelPlaceholder}
                                maxLength={INPUT_LIMITS.scheduleLabel}
                            />
                        </div>
                    )}

                    <div>
                        <label className="label">{copy.date}</label>
                        <input
                            type="date"
                            className="input"
                            value={form.date}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">{copy.start}</label>
                            <select
                                className="input"
                                value={form.startTime}
                                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                                required
                            >
                                {timeOptions.map((timeOption) => (
                                    <option key={`start-${timeOption}`} value={timeOption}>
                                        {formatTime24(timeOption)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="label">{copy.end}</label>
                            <select
                                className="input"
                                value={form.endTime}
                                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                                required
                            >
                                {timeOptions.map((timeOption) => (
                                    <option key={`end-${timeOption}`} value={timeOption}>
                                        {formatTime24(timeOption)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--theme-text-muted, #64748b)' }}>
                        {copy.timeGuide}
                    </p>
                    <div>
                        <label className="label">{copy.note}</label>
                        <input
                            className="input"
                            value={form.optionalNote}
                            onChange={(e) => setForm({ ...form, optionalNote: e.target.value.slice(0, INPUT_LIMITS.shortNote) })}
                            placeholder={copy.notePlaceholder}
                            maxLength={INPUT_LIMITS.shortNote}
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        {editingEntry && (
                            <button type="button" onClick={handleDelete} className="btn-ghost text-red-500 hover:bg-red-50">{copy.delete}</button>
                        )}
                        <div className="flex-1"></div>
                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">{copy.cancel}</button>
                        <button type="submit" className="btn-primary">{editingEntry ? copy.save : copy.addBlockButton}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
