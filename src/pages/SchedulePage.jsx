import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Modal from '../components/UI/Modal';
import { DAYS_OF_WEEK, TIME_SLOTS, BLOCK_TYPES } from '../utils/constants';
import { getWeekDates, getDayNumber, getMonthYear, isToday, formatTime, timeToMinutes } from '../utils/helpers';

export default function SchedulePage() {
    const user = useAuthStore((s) => s.user);
    const courses = useAppStore((s) => s.courses);
    const scheduleEntries = useAppStore((s) => s.scheduleEntries);
    const addScheduleEntry = useAppStore((s) => s.addScheduleEntry);
    const updateScheduleEntry = useAppStore((s) => s.updateScheduleEntry);
    const deleteScheduleEntry = useAppStore((s) => s.deleteScheduleEntry);

    const [weekOffset, setWeekOffset] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [dragEntry, setDragEntry] = useState(null);
    const [form, setForm] = useState({
        courseId: '',
        date: '',
        startTime: '09:00',
        endTime: '10:00',
        optionalNote: '',
        blockType: 'class',
        customLabel: '',
    });

    const today = new Date();
    const referenceDate = new Date(today);
    referenceDate.setDate(today.getDate() + weekOffset * 7);
    const weekDates = getWeekDates(referenceDate);

    const userCourses = courses.filter((c) => c.userId === user?.id);
    const userEntries = scheduleEntries.filter((e) => e.userId === user?.id);

    const entriesByDate = useMemo(() => {
        const map = {};
        for (const entry of userEntries) {
            if (!map[entry.date]) map[entry.date] = [];
            map[entry.date].push(entry);
        }
        return map;
    }, [userEntries]);

    const getCourse = (courseId) => courses.find((c) => c.id === courseId);
    const getBlockType = (type) => BLOCK_TYPES.find((b) => b.value === type) || BLOCK_TYPES[0];

    const openAddModal = (date, time) => {
        setEditingEntry(null);
        const endHour = parseInt(time.split(':')[0]) + 1;
        setForm({
            courseId: userCourses[0]?.id || '',
            date,
            startTime: time,
            endTime: `${Math.min(endHour, 23).toString().padStart(2, '0')}:00`,
            optionalNote: '',
            blockType: 'class',
            customLabel: '',
        });
        setShowModal(true);
    };

    const openEditModal = (entry) => {
        setEditingEntry(entry);
        setForm({
            courseId: entry.courseId || '',
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime,
            optionalNote: entry.optionalNote || '',
            blockType: entry.blockType || 'class',
            customLabel: entry.customLabel || '',
        });
        setShowModal(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (form.blockType === 'class' && !form.courseId) return;
        if (editingEntry) {
            updateScheduleEntry(editingEntry.id, { ...form });
        } else {
            addScheduleEntry({ ...form, userId: user.id });
        }
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
        const newEndHour = Math.floor(newEndMin / 60);
        const newEndMinute = newEndMin % 60;

        updateScheduleEntry(dragEntry.id, {
            date,
            startTime: timeSlot,
            endTime: `${newEndHour.toString().padStart(2, '0')}:${newEndMinute.toString().padStart(2, '0')}`,
        });
        setDragEntry(null);
    }, [dragEntry, updateScheduleEntry]);

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
            return course?.courseName || 'Course';
        }
        if (entry.blockType === 'custom' && entry.customLabel) return entry.customLabel;
        return getBlockType(entry.blockType).label;
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#111827]">Schedule</h1>
                    <p className="text-slate-400 text-sm mt-0.5">{getMonthYear(weekDates[0])}</p>
                </div>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center gap-2 mb-5">
                <button onClick={() => setWeekOffset((w) => w - 1)} className="btn-ghost text-xs">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                    Prev
                </button>
                <button
                    onClick={() => setWeekOffset(0)}
                    className={`btn-ghost text-xs ${weekOffset === 0 ? 'text-blue-600 font-semibold' : ''}`}
                >
                    This Week
                </button>
                <button onClick={() => setWeekOffset((w) => w + 1)} className="btn-ghost text-xs">
                    Next
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
                <div className="flex-1"></div>
                {/* Block type legend */}
                <div className="flex items-center gap-3">
                    {BLOCK_TYPES.map((bt) => (
                        <div key={bt.value} className="flex items-center gap-1">
                            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: bt.color }}></div>
                            <span className="text-[10px] text-slate-400">{bt.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Weekly Table */}
            <div className="card !p-0 overflow-hidden !rounded-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[800px]">
                        <thead>
                            <tr>
                                <th className="w-16 p-3 text-[10px] font-medium text-slate-400 border-b border-slate-100 bg-slate-50/50 uppercase tracking-wider">
                                    Time
                                </th>
                                {weekDates.map((date, i) => (
                                    <th
                                        key={date}
                                        className={`p-2.5 text-center border-b border-l border-slate-100 last:border-r-0 ${isToday(date) ? 'bg-blue-50/30' : 'bg-slate-50/50'
                                            }`}
                                    >
                                        <div className="text-[10px] font-medium text-slate-400 uppercase">{DAYS_OF_WEEK[i]?.short}</div>
                                        <div
                                            className={`text-base font-semibold mt-0.5 ${isToday(date)
                                                ? 'text-white bg-blue-500 w-8 h-8 rounded-xl flex items-center justify-center mx-auto shadow-sm shadow-blue-200'
                                                : 'text-slate-600'
                                                }`}
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
                                    <td className="p-1.5 text-[10px] text-slate-400 text-right border-r border-slate-100 bg-slate-50/30 font-medium pr-2.5 whitespace-nowrap">
                                        {formatTime(timeSlot)}
                                    </td>
                                    {weekDates.map((date) => {
                                        const entries = getEntriesForSlot(date, timeSlot);
                                        const startEntries = entries.filter((e) => isEntryStart(e, timeSlot));
                                        const hasNonStartEntries = entries.some((e) => !isEntryStart(e, timeSlot));

                                        return (
                                            <td
                                                key={`${date}-${timeSlot}`}
                                                className={`border-l border-b border-slate-50 last:border-r-0 p-0.5 h-[48px] relative ${isToday(date) ? 'bg-blue-50/10' : ''
                                                    } ${!hasNonStartEntries && startEntries.length === 0 ? 'cursor-pointer hover:bg-blue-50/30 transition-colors' : ''}`}
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
                                                                {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                                                            </div>
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
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingEntry ? 'Edit Schedule Block' : 'Add Schedule Block'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Block Type */}
                    <div>
                        <label className="label">Block Type</label>
                        <div className="flex gap-2">
                            {BLOCK_TYPES.map((bt) => (
                                <button
                                    key={bt.value}
                                    type="button"
                                    onClick={() => setForm({ ...form, blockType: bt.value })}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${form.blockType === bt.value
                                        ? 'text-white border-transparent shadow-sm'
                                        : 'border-slate-200 text-slate-500 bg-slate-50'
                                        }`}
                                    style={form.blockType === bt.value ? { backgroundColor: bt.color } : {}}
                                >
                                    {bt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Course (for class/study types) */}
                    {(form.blockType === 'class' || form.blockType === 'study') && (
                        <div>
                            <label className="label">Course</label>
                            <select
                                className="input"
                                value={form.courseId}
                                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                                required={form.blockType === 'class'}
                            >
                                <option value="">Select a course</option>
                                {userCourses.map((c) => (
                                    <option key={c.id} value={c.id}>{c.courseName}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Custom label */}
                    {form.blockType === 'custom' && (
                        <div>
                            <label className="label">Label</label>
                            <input
                                className="input"
                                value={form.customLabel}
                                onChange={(e) => setForm({ ...form, customLabel: e.target.value })}
                                placeholder="e.g. Library Time"
                            />
                        </div>
                    )}

                    <div>
                        <label className="label">Date</label>
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
                            <label className="label">Start</label>
                            <input
                                type="time"
                                className="input"
                                value={form.startTime}
                                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">End</label>
                            <input
                                type="time"
                                className="input"
                                value={form.endTime}
                                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="label">Note (optional)</label>
                        <input
                            className="input"
                            value={form.optionalNote}
                            onChange={(e) => setForm({ ...form, optionalNote: e.target.value })}
                            placeholder="Room 201, bring textbook..."
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        {editingEntry && (
                            <button type="button" onClick={handleDelete} className="btn-ghost text-red-500 hover:bg-red-50">Delete</button>
                        )}
                        <div className="flex-1"></div>
                        <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary">{editingEntry ? 'Save' : 'Add Block'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
