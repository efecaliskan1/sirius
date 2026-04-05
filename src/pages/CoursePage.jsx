import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import { INPUT_LIMITS } from '../utils/constants';
import { useLocale } from '../utils/i18n';

const COURSE_COPY = {
    en: {
        notFound: 'Course not found',
        backToCourses: '← Back to Courses',
        activeTasks: 'active tasks',
        studyItems: 'study items',
        progress: 'Progress',
        roadmap: 'Study Roadmap',
        emptyTitle: 'Build your study roadmap',
        emptyBody: 'Add chapters, topics, and checklists to track completion',
        addTopicPlaceholder: 'Add a new chapter or topic...',
        add: 'Add',
        addItem: 'Add item',
        addNote: 'Add note',
        addNotePlaceholder: 'Add a note...',
        save: 'Save',
        cancel: 'Cancel',
        addInlineItemPlaceholder: 'Add item...',
    },
    tr: {
        notFound: 'Ders bulunamadı',
        backToCourses: '← Derslere dön',
        activeTasks: 'açık görev',
        studyItems: 'çalışma öğesi',
        progress: 'İlerleme',
        roadmap: 'Çalışma yol haritası',
        emptyTitle: 'Çalışma yol haritanı oluştur',
        emptyBody: 'Bölümler, konular ve kontrol listeleri ekleyerek ilerlemeni takip et',
        addTopicPlaceholder: 'Yeni bölüm veya konu ekle...',
        add: 'Ekle',
        addItem: 'Öğe ekle',
        addNote: 'Not ekle',
        addNotePlaceholder: 'Bir not ekle...',
        save: 'Kaydet',
        cancel: 'İptal',
        addInlineItemPlaceholder: 'Öğe ekle...',
    },
};

export default function CoursePage() {
    const { courseId } = useParams();
    const user = useAuthStore((s) => s.user);
    const courses = useAppStore((s) => s.courses);
    const courseTopics = useAppStore((s) => s.courseTopics);
    const addCourseTopic = useAppStore((s) => s.addCourseTopic);
    const updateCourseTopic = useAppStore((s) => s.updateCourseTopic);
    const deleteCourseTopic = useAppStore((s) => s.deleteCourseTopic);
    const toggleCourseTopic = useAppStore((s) => s.toggleCourseTopic);
    const tasks = useAppStore((s) => s.tasks);
    const locale = useLocale();
    const copy = COURSE_COPY[locale] || COURSE_COPY.en;

    const safeCourses = Array.isArray(courses) ? courses : [];
    const safeCourseTopics = Array.isArray(courseTopics) ? courseTopics : [];
    const safeTasks = Array.isArray(tasks) ? tasks : [];

    const course = safeCourses.find((c) => c?.id === courseId && c?.userId === user?.id);
    const topics = safeCourseTopics
        .filter((t) => t?.courseId === courseId && t?.userId === user?.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    const courseTasks = safeTasks.filter((t) => t?.userId === user?.id && t?.courseId === courseId && !t?.completed);

    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [newSubtopicParent, setNewSubtopicParent] = useState(null);
    const [newSubtopicText, setNewSubtopicText] = useState('');
    const [editingTopic, setEditingTopic] = useState(null);
    const [editText, setEditText] = useState('');
    const [expandedTopics, setExpandedTopics] = useState(new Set());
    const [newNoteId, setNewNoteId] = useState(null);
    const [noteText, setNoteText] = useState('');

    if (!course) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-400">{copy.notFound}</p>
                <Link to="/courses" className="text-blue-500 text-sm mt-2 inline-block">{copy.backToCourses}</Link>
            </div>
        );
    }

    const rootTopics = topics.filter((t) => !t.parentId);
    const getChildren = (parentId) => topics.filter((t) => t.parentId === parentId);

    const handleAddTopic = () => {
        if (!newTopicTitle.trim()) return;
        addCourseTopic({
            courseId,
            userId: user.id,
            title: newTopicTitle,
            parentId: null,
            type: 'section',
            order: rootTopics.length,
        });
        setNewTopicTitle('');
    };

    const handleAddSubtopic = (parentId) => {
        if (!newSubtopicText.trim()) return;
        const children = getChildren(parentId);
        addCourseTopic({
            courseId,
            userId: user.id,
            title: newSubtopicText,
            parentId,
            type: 'item',
            order: children.length,
        });
        setNewSubtopicText('');
        setNewSubtopicParent(null);
        setExpandedTopics((prev) => new Set([...prev, parentId]));
    };

    const handleSaveEdit = (id) => {
        if (!editText.trim()) return;
        updateCourseTopic(id, { title: editText });
        setEditingTopic(null);
        setEditText('');
    };

    const handleSaveNote = (id) => {
        updateCourseTopic(id, { note: noteText });
        setNewNoteId(null);
        setNoteText('');
    };

    const toggleExpanded = (id) => {
        setExpandedTopics((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const completedCount = topics.filter((t) => t.completed && t.type === 'item').length;
    const totalItems = topics.filter((t) => t.type === 'item').length;
    const progress = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

    const renderTopic = (topic, depth = 0) => {
        const children = getChildren(topic.id);
        const isExpanded = expandedTopics.has(topic.id);
        const isSection = topic.type === 'section' || children.length > 0;
        const isEditing = editingTopic === topic.id;
        const childCompleted = children.filter((c) => c.completed).length;

        return (
            <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${depth > 0 ? 'ml-6' : ''}`}
            >
                <div className={`flex items-center gap-2 py-2 px-3 rounded-xl group hover:bg-slate-50/80 transition-colors ${depth === 0 ? 'mb-0.5' : ''
                    }`}>
                    {/* Expand/collapse for sections */}
                    {isSection ? (
                        <button onClick={() => toggleExpanded(topic.id)} className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-500 transition-colors">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    ) : (
                        <button
                            onClick={() => toggleCourseTopic(topic.id)}
                            className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${topic.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 hover:border-blue-400'
                                }`}
                        >
                            {topic.completed && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                        </button>
                    )}

                    {/* Title */}
                    {isEditing ? (
                        <input
                            className="flex-1 text-sm py-0.5 px-2 border border-blue-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-300"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value.slice(0, INPUT_LIMITS.topicTitle))}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(topic.id); if (e.key === 'Escape') setEditingTopic(null); }}
                            maxLength={INPUT_LIMITS.topicTitle}
                            autoFocus
                        />
                    ) : (
                        <span
                            className={`flex-1 cursor-pointer ${isSection
                                ? `text-sm font-semibold ${depth === 0 ? 'text-[#111827]' : 'text-slate-500'}`
                                : `text-sm ${topic.completed ? 'line-through text-slate-400' : 'text-slate-500'}`
                                }`}
                            onDoubleClick={() => { setEditingTopic(topic.id); setEditText(topic.title); }}
                        >
                            {topic.title}
                        </span>
                    )}

                    {/* Section completion indicator */}
                    {isSection && children.length > 0 && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {childCompleted}/{children.length}
                        </span>
                    )}

                    {/* Actions */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                        {isSection && (
                            <button
                                onClick={() => { setNewSubtopicParent(topic.id); setNewSubtopicText(''); setExpandedTopics((prev) => new Set([...prev, topic.id])); }}
                                className="p-1 text-slate-300 hover:text-blue-400"
                                title={copy.addItem}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            </button>
                        )}
                        <button
                            onClick={() => { setNewNoteId(topic.id); setNoteText(topic.note || ''); }}
                            className={`p-1 ${topic.note ? 'text-amber-400' : 'text-slate-300'} hover:text-amber-500`}
                            title={copy.addNote}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                        </button>
                        <button
                            onClick={() => deleteCourseTopic(topic.id)}
                            className="p-1 text-slate-300 hover:text-red-400"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>
                </div>

                {/* Note */}
                {topic.note && newNoteId !== topic.id && (
                    <div className="ml-10 mb-1 text-[11px] text-slate-400 italic bg-amber-50/50 px-2.5 py-1 rounded-lg">
                        {topic.note}
                    </div>
                )}

                {/* Note editor */}
                {newNoteId === topic.id && (
                    <div className="ml-10 mb-2">
                        <textarea
                            className="input !text-xs !h-16 resize-none"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value.slice(0, INPUT_LIMITS.longNote))}
                            placeholder={copy.addNotePlaceholder}
                            maxLength={INPUT_LIMITS.longNote}
                            autoFocus
                        />
                        <div className="flex gap-2 mt-1">
                            <button onClick={() => handleSaveNote(topic.id)} className="text-xs text-blue-500 font-medium">{copy.save}</button>
                            <button onClick={() => setNewNoteId(null)} className="text-xs text-slate-400">{copy.cancel}</button>
                        </div>
                    </div>
                )}

                {/* Children */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            {children.map((child) => renderTopic(child, depth + 1))}

                            {/* Add subtopic inline */}
                            {newSubtopicParent === topic.id && (
                                <div className="flex items-center gap-2 ml-6 py-1.5 px-3">
                                    <input
                                        className="flex-1 text-xs py-1.5 px-2.5 border border-blue-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-300"
                                        value={newSubtopicText}
                                        onChange={(e) => setNewSubtopicText(e.target.value.slice(0, INPUT_LIMITS.topicTitle))}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtopic(topic.id); if (e.key === 'Escape') setNewSubtopicParent(null); }}
                                        placeholder={copy.addInlineItemPlaceholder}
                                        maxLength={INPUT_LIMITS.topicTitle}
                                        autoFocus
                                    />
                                    <button onClick={() => handleAddSubtopic(topic.id)} className="text-xs text-blue-500 font-medium">{copy.add}</button>
                                    <button onClick={() => setNewSubtopicParent(null)} className="text-xs text-slate-400">×</button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    };

    return (
        <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
                <Link to="/" className="text-slate-400 hover:text-blue-500 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                </Link>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm" style={{ backgroundColor: course.color + '25' }}>
                    {course.icon || '📚'}
                </div>
                <div>
                    <h1 className="text-xl font-bold text-[#111827]">{course.courseName}</h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{courseTasks.length} {copy.activeTasks} · {totalItems} {copy.studyItems}</p>
                </div>
            </div>

            {/* Progress */}
            {totalItems > 0 && (
                <div className="card mb-6">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[14px] font-bold text-[#111827]">{course.courseName} {copy.progress}: {progress}%</span>
                    </div>
                    <div className="progress-bar w-full">
                        <motion.div
                            className="progress-bar-fill shadow-sm"
                            style={{ backgroundColor: course.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8 }}
                        />
                    </div>
                </div>
            )}

            {/* Roadmap */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[15px] font-bold text-[#111827]">{copy.roadmap}</h2>
                </div>

                {rootTopics.length === 0 ? (
                    <div className="text-center py-12 card bg-slate-50/50 border-dashed border-2">
                        <div className="text-4xl mb-3 animate-float">🗺️</div>
                        <p className="text-slate-500 font-medium mb-1">{copy.emptyTitle}</p>
                        <p className="text-slate-500 text-[13px]">{copy.emptyBody}</p>
                    </div>
                ) : (
                    <div className="card !p-2 bg-white/50 backdrop-blur-sm">
                        {rootTopics.map((topic) => renderTopic(topic))}
                    </div>
                )}
            </div>

            {/* Add Topic */}
            <div className="flex items-center gap-2 mt-4 mt-2">
                <input
                    className="input !py-3 !px-4 text-[14px] flex-1 shadow-sm"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value.slice(0, INPUT_LIMITS.topicTitle))}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddTopic(); }}
                    placeholder={copy.addTopicPlaceholder}
                    maxLength={INPUT_LIMITS.topicTitle}
                />
                <button onClick={handleAddTopic} className="btn-primary !py-3 !px-5 shadow-sm">{copy.add}</button>
            </div>
        </div>
    );
}
