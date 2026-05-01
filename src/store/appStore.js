import { create } from 'zustand';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, ensureAppCheckToken } from '../firebase/config';
import {
    AMBIENT_SOUNDS,
    BLOCK_TYPES,
    COURSE_COLORS,
    COURSE_ICONS,
    INPUT_LIMITS,
    MIN_FOCUS_SESSION_MINUTES,
} from '../utils/constants';
import { generateId, getDateKeyInTurkey, getToday } from '../utils/helpers';
import { getWeekKey } from '../utils/social';
import { normalizeVisibleText } from '../utils/text';
import { deriveRewardStateFromSessions } from '../utils/rewardEngine';

const STUDY_DATA_STORAGE_KEYS = {
    courses: 'studywithme_courses',
    tasks: 'studywithme_tasks',
    scheduleEntries: 'studywithme_schedule',
    sessions: 'studywithme_sessions',
    badges: 'studywithme_badges',
    courseTopics: 'studywithme_course_topics',
    rewardState: 'studywithme_reward_state',
};

const PERSISTED_APP_KEYS = Object.values(STUDY_DATA_STORAGE_KEYS);
const STUDY_DATA_COLLECTION = 'studyData';
const STUDY_DATA_LIST_LIMITS = {
    [STUDY_DATA_STORAGE_KEYS.courses]: 500,
    [STUDY_DATA_STORAGE_KEYS.tasks]: 2000,
    [STUDY_DATA_STORAGE_KEYS.scheduleEntries]: 2000,
    [STUDY_DATA_STORAGE_KEYS.sessions]: 5000,
    [STUDY_DATA_STORAGE_KEYS.badges]: 500,
    [STUDY_DATA_STORAGE_KEYS.courseTopics]: 5000,
};
const PRIORITY_VALUES = new Set(['low', 'medium', 'high']);
const BLOCK_TYPE_VALUES = new Set(BLOCK_TYPES.map((block) => block.value));
const COURSE_COLOR_VALUES = new Set(COURSE_COLORS.map((courseColor) => courseColor.color));
const COURSE_ICON_VALUES = new Set(COURSE_ICONS);
const TOPIC_TYPE_VALUES = new Set(['section', 'item']);
const SESSION_MODE_VALUES = new Set(['normal', 'deep']);
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-6]):[0-5]\d$/;

const DEFAULT_AMBIENT_SOUNDS = AMBIENT_SOUNDS
    .filter((sound) => sound.id !== 'none')
    .map((sound) => ({
        id: sound.id,
        name: sound.label,
        icon: sound.emoji,
        volume: 0,
        isPlaying: false,
        url: sound.file ? `/${sound.file}` : '',
    }));

const EMPTY_STUDY_STATE = {
    courses: [],
    tasks: [],
    scheduleEntries: [],
    sessions: [],
    badges: [],
    courseTopics: [],
    rewardState: {
        coinBalance: 0,
        xp: 0,
        streakCount: 0,
        totalFocusMinutes: 0,
        weeklyFocusMinutes: 0,
        weeklyFocusWeekKey: getWeekKey(),
        dailyFocusMinutes: 0,
        dailySessionsCount: 0,
        dailyDateKey: getToday(),
        lastActiveDate: '',
        lastRewardedAt: '',
    },
};

let studyDataUnsubscribe = null;
let studyDataSyncTimer = null;
let criticalStudySyncTimer = null;
let isApplyingRemoteStudySnapshot = false;
let lastSyncedStudySignatures = null;
let activeStudySyncUserId = null;

function canUseLocalStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function getScopedStorageKey(baseKey, userId) {
    return `${baseKey}:${userId}`;
}

function sanitizeIdentifier(value, maxLength = 120) {
    if (typeof value !== 'string') {
        return '';
    }

    const sanitizedValue = Array.from(value)
        .filter((char) => {
            const codePoint = char.codePointAt(0) || 0;
            const isAsciiControl = codePoint <= 0x1f || codePoint === 0x7f;
            const isBidiControl = (codePoint >= 0x202a && codePoint <= 0x202e)
                || (codePoint >= 0x2066 && codePoint <= 0x2069);
            return !isAsciiControl && !isBidiControl;
        })
        .join('');

    return sanitizedValue.trim().slice(0, maxLength);
}

function clampInteger(value, min, max, fallback = null) {
    const parsedValue = Number.parseInt(value, 10);

    if (!Number.isFinite(parsedValue)) {
        return fallback;
    }

    return Math.min(max, Math.max(min, parsedValue));
}

function sanitizeIsoDateTime(value, fallback = '') {
    if (typeof value !== 'string') {
        return fallback;
    }

    const parsedTime = Date.parse(value);
    if (Number.isNaN(parsedTime)) {
        return fallback;
    }

    return new Date(parsedTime).toISOString();
}

function sanitizeDateKey(value, fallback = '') {
    return typeof value === 'string' && DATE_KEY_PATTERN.test(value) ? value : fallback;
}

function sanitizeTimeValue(value, fallback = '') {
    return typeof value === 'string' && TIME_PATTERN.test(value) ? value : fallback;
}

function sanitizeCourseRecord(course, userId) {
    const id = sanitizeIdentifier(course?.id, 80);
    const ownerId = sanitizeIdentifier(course?.userId || userId, 80);
    const courseName = normalizeVisibleText(course?.courseName, INPUT_LIMITS.courseName, '');

    if (!id || !ownerId || ownerId !== userId || !courseName) {
        return null;
    }

    return {
        id,
        userId: ownerId,
        courseName,
        color: COURSE_COLOR_VALUES.has(course?.color) ? course.color : COURSE_COLORS[0].color,
        icon: COURSE_ICON_VALUES.has(course?.icon) ? course.icon : '📚',
        createdAt: sanitizeIsoDateTime(course?.createdAt, new Date().toISOString()),
    };
}

function sanitizeSubtasks(subtasks) {
    if (!Array.isArray(subtasks)) {
        return [];
    }

    return subtasks
        .slice(0, 50)
        .map((subtask) => {
            const title = normalizeVisibleText(subtask?.title, INPUT_LIMITS.subtaskTitle, '');
            if (!title) {
                return null;
            }

            return {
                title,
                completed: Boolean(subtask?.completed),
            };
        })
        .filter(Boolean);
}

function sanitizeTaskRecord(task, userId) {
    const id = sanitizeIdentifier(task?.id, 80);
    const ownerId = sanitizeIdentifier(task?.userId || userId, 80);
    const title = normalizeVisibleText(task?.title, INPUT_LIMITS.taskTitle, '');

    if (!id || !ownerId || ownerId !== userId || !title) {
        return null;
    }

    const courseId = sanitizeIdentifier(task?.courseId || '', 80);
    const dueDate = sanitizeDateKey(task?.dueDate, '');
    const dueTime = sanitizeTimeValue(task?.dueTime, '');
    const priority = PRIORITY_VALUES.has(task?.priority) ? task.priority : 'medium';
    const estimatedMinutes = clampInteger(task?.estimatedMinutes, 1, 720, null);

    return {
        id,
        userId: ownerId,
        title,
        courseId: courseId || '',
        description: normalizeVisibleText(task?.description, INPUT_LIMITS.longNote, ''),
        dueDate,
        dueTime,
        priority,
        estimatedMinutes,
        subtasks: sanitizeSubtasks(task?.subtasks),
        completed: Boolean(task?.completed),
        createdAt: sanitizeIsoDateTime(task?.createdAt, new Date().toISOString()),
    };
}

function sanitizeScheduleEntryRecord(entry, userId) {
    const id = sanitizeIdentifier(entry?.id, 80);
    const ownerId = sanitizeIdentifier(entry?.userId || userId, 80);
    const date = sanitizeDateKey(entry?.date, '');
    const startTime = sanitizeTimeValue(entry?.startTime, '');
    const endTime = sanitizeTimeValue(entry?.endTime, '');

    if (!id || !ownerId || ownerId !== userId || !date || !startTime || !endTime || endTime <= startTime) {
        return null;
    }

    const courseId = sanitizeIdentifier(entry?.courseId || '', 80);
    const blockType = BLOCK_TYPE_VALUES.has(entry?.blockType) ? entry.blockType : 'class';

    return {
        id,
        userId: ownerId,
        courseId: courseId || '',
        taskId: sanitizeIdentifier(entry?.taskId || '', 80) || null,
        date,
        startTime,
        endTime,
        optionalNote: normalizeVisibleText(entry?.optionalNote, INPUT_LIMITS.shortNote, ''),
        blockType,
        customLabel: normalizeVisibleText(entry?.customLabel, INPUT_LIMITS.scheduleLabel, ''),
        createdAt: sanitizeIsoDateTime(entry?.createdAt, new Date().toISOString()),
    };
}

function sanitizeSessionRecord(session, userId) {
    const id = sanitizeIdentifier(session?.id, 80);
    const ownerId = sanitizeIdentifier(session?.userId || userId, 80);

    if (!id || !ownerId || ownerId !== userId) {
        return null;
    }

    const createdAt = sanitizeIsoDateTime(session?.createdAt, new Date().toISOString());
    const sessionDateKey = sanitizeDateKey(
        session?.sessionDateKey,
        sanitizeDateKey(getDateKeyInTurkey(createdAt), getDateKeyInTurkey(new Date()))
    );

    return {
        id,
        userId: ownerId,
        courseId: sanitizeIdentifier(session?.courseId || '', 80) || null,
        taskId: sanitizeIdentifier(session?.taskId || '', 80) || null,
        plannedMinutes: clampInteger(session?.plannedMinutes, MIN_FOCUS_SESSION_MINUTES, 720, 25),
        actualMinutes: clampInteger(session?.actualMinutes, MIN_FOCUS_SESSION_MINUTES, 720, 25),
        completed: Boolean(session?.completed),
        mode: SESSION_MODE_VALUES.has(session?.mode) ? session.mode : 'normal',
        label: normalizeVisibleText(session?.label, INPUT_LIMITS.sessionLabel, ''),
        note: normalizeVisibleText(session?.note, INPUT_LIMITS.longNote, ''),
        createdAt,
        sessionDateKey,
    };
}

function sanitizeBadgeRecord(badge, userId) {
    const id = sanitizeIdentifier(badge?.id, 80);
    const ownerId = sanitizeIdentifier(badge?.userId || userId, 80);
    const badgeKey = sanitizeIdentifier(badge?.badgeKey, 80);

    if (!id || !ownerId || ownerId !== userId || !badgeKey) {
        return null;
    }

    return {
        id,
        userId: ownerId,
        badgeKey,
        unlockedAt: sanitizeIsoDateTime(badge?.unlockedAt, new Date().toISOString()),
    };
}

function sanitizeCourseTopicRecord(topic, userId) {
    const id = sanitizeIdentifier(topic?.id, 80);
    const ownerId = sanitizeIdentifier(topic?.userId || userId, 80);
    const courseId = sanitizeIdentifier(topic?.courseId, 80);
    const title = normalizeVisibleText(topic?.title, INPUT_LIMITS.topicTitle, '');

    if (!id || !ownerId || ownerId !== userId || !courseId || !title) {
        return null;
    }

    return {
        id,
        userId: ownerId,
        courseId,
        title,
        parentId: sanitizeIdentifier(topic?.parentId || '', 80) || null,
        type: TOPIC_TYPE_VALUES.has(topic?.type) ? topic.type : 'item',
        order: clampInteger(topic?.order, 0, 5000, 0),
        completed: Boolean(topic?.completed),
        createdAt: sanitizeIsoDateTime(topic?.createdAt, new Date().toISOString()),
        note: normalizeVisibleText(topic?.note, INPUT_LIMITS.longNote, ''),
    };
}

function sanitizeStudyCollection(baseKey, userId, records) {
    const limit = STUDY_DATA_LIST_LIMITS[baseKey] || 500;
    if (!Array.isArray(records) || !userId) {
        return [];
    }

    const sanitizer = {
        [STUDY_DATA_STORAGE_KEYS.courses]: sanitizeCourseRecord,
        [STUDY_DATA_STORAGE_KEYS.tasks]: sanitizeTaskRecord,
        [STUDY_DATA_STORAGE_KEYS.scheduleEntries]: sanitizeScheduleEntryRecord,
        [STUDY_DATA_STORAGE_KEYS.sessions]: sanitizeSessionRecord,
        [STUDY_DATA_STORAGE_KEYS.badges]: sanitizeBadgeRecord,
        [STUDY_DATA_STORAGE_KEYS.courseTopics]: sanitizeCourseTopicRecord,
    }[baseKey];

    if (!sanitizer) {
        return [];
    }

    return records
        .slice(0, limit)
        .map((record) => sanitizer(record, userId))
        .filter(Boolean);
}

function sanitizeStudyState(studyState, userId) {
    const sanitizedState = {
        courses: sanitizeStudyCollection(STUDY_DATA_STORAGE_KEYS.courses, userId, studyState?.courses),
        tasks: sanitizeStudyCollection(STUDY_DATA_STORAGE_KEYS.tasks, userId, studyState?.tasks),
        scheduleEntries: sanitizeStudyCollection(STUDY_DATA_STORAGE_KEYS.scheduleEntries, userId, studyState?.scheduleEntries),
        sessions: sanitizeStudyCollection(STUDY_DATA_STORAGE_KEYS.sessions, userId, studyState?.sessions),
        badges: sanitizeStudyCollection(STUDY_DATA_STORAGE_KEYS.badges, userId, studyState?.badges),
        courseTopics: sanitizeStudyCollection(STUDY_DATA_STORAGE_KEYS.courseTopics, userId, studyState?.courseTopics),
        rewardState: sanitizeRewardState(studyState?.rewardState),
    };

    return applyRewardStateRecovery(sanitizedState);
}

function sanitizeRewardState(rewardState) {
    const currentWeekKey = getWeekKey();
    const currentDayKey = getToday();

    if (!rewardState || typeof rewardState !== 'object' || Array.isArray(rewardState)) {
        return {
            ...EMPTY_STUDY_STATE.rewardState,
            weeklyFocusWeekKey: currentWeekKey,
            dailyDateKey: currentDayKey,
        };
    }

    const weeklyFocusWeekKey = sanitizeDateKey(rewardState.weeklyFocusWeekKey, currentWeekKey);
    const isCurrentWeek = weeklyFocusWeekKey === currentWeekKey;

    const lastActiveDate = sanitizeDateKey(rewardState.lastActiveDate, '');
    const today = new Date();
    const todayKey = sanitizeDateKey(getDateKeyInTurkey(today), '');
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = sanitizeDateKey(getDateKeyInTurkey(yesterday), '');
    const rawStreakCount = clampInteger(rewardState.streakCount, 0, 10000, 0) || 0;
    const streakCount = lastActiveDate === todayKey || lastActiveDate === yesterdayKey ? rawStreakCount : 0;
    const rewardDailyDateKey = sanitizeDateKey(rewardState.dailyDateKey, currentDayKey);
    const isCurrentDay = rewardDailyDateKey === currentDayKey;

    return {
        coinBalance: clampInteger(rewardState.coinBalance, 0, 1000000, 0) || 0,
        xp: clampInteger(rewardState.xp, 0, 10000000, 0) || 0,
        streakCount,
        totalFocusMinutes: clampInteger(rewardState.totalFocusMinutes, 0, 10000000, 0) || 0,
        weeklyFocusMinutes: clampInteger(
            rewardState.weeklyFocusMinutes,
            0,
            10080,
            0
        ) && isCurrentWeek ? clampInteger(rewardState.weeklyFocusMinutes, 0, 10080, 0) : 0,
        weeklyFocusWeekKey,
        dailyFocusMinutes: isCurrentDay ? clampInteger(rewardState.dailyFocusMinutes, 0, 1440, 0) || 0 : 0,
        dailySessionsCount: isCurrentDay ? clampInteger(rewardState.dailySessionsCount, 0, 100, 0) || 0 : 0,
        dailyDateKey: currentDayKey,
        lastActiveDate,
        lastRewardedAt: sanitizeIsoDateTime(rewardState.lastRewardedAt, ''),
    };
}

function loadData(key) {
    if (!canUseLocalStorage()) {
        return [];
    }

    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
}

function saveData(key, data) {
    if (!canUseLocalStorage()) {
        return;
    }

    localStorage.setItem(key, JSON.stringify(data));
}

function loadScopedData(baseKey, userId) {
    if (!canUseLocalStorage() || !userId) {
        return [];
    }

    const scopedKey = getScopedStorageKey(baseKey, userId);
    const scopedRaw = localStorage.getItem(scopedKey);

    if (scopedRaw !== null) {
        try {
            const parsed = JSON.parse(scopedRaw);
            return sanitizeStudyCollection(baseKey, userId, parsed);
        } catch {
            return [];
        }
    }

    const legacyRecords = sanitizeStudyCollection(
        baseKey,
        userId,
        loadData(baseKey).filter((item) => item?.userId === userId)
    );
    if (legacyRecords.length > 0) {
        saveData(scopedKey, legacyRecords);
    }

    return legacyRecords;
}

function loadScopedRewardState(userId) {
    if (!canUseLocalStorage() || !userId) {
        return { ...EMPTY_STUDY_STATE.rewardState };
    }

    const scopedKey = getScopedStorageKey(STUDY_DATA_STORAGE_KEYS.rewardState, userId);
    const scopedRaw = localStorage.getItem(scopedKey);

    if (scopedRaw !== null) {
        try {
            return sanitizeRewardState(JSON.parse(scopedRaw));
        } catch {
            return { ...EMPTY_STUDY_STATE.rewardState };
        }
    }

    return { ...EMPTY_STUDY_STATE.rewardState };
}

function saveScopedData(baseKey, userId, data) {
    if (!userId) {
        return [];
    }

    const sanitizedData = sanitizeStudyCollection(baseKey, userId, data);
    saveData(getScopedStorageKey(baseKey, userId), sanitizedData);
    return sanitizedData;
}

function saveScopedRewardState(userId, rewardState) {
    if (!userId) {
        return { ...EMPTY_STUDY_STATE.rewardState };
    }

    const sanitizedRewardState = sanitizeRewardState(rewardState);
    saveData(getScopedStorageKey(STUDY_DATA_STORAGE_KEYS.rewardState, userId), sanitizedRewardState);
    return sanitizedRewardState;
}

function buildScopedStudyState(userId) {
    if (!userId) {
        return { ...EMPTY_STUDY_STATE };
    }

    return applyRewardStateRecovery({
        courses: loadScopedData(STUDY_DATA_STORAGE_KEYS.courses, userId),
        tasks: loadScopedData(STUDY_DATA_STORAGE_KEYS.tasks, userId),
        scheduleEntries: loadScopedData(STUDY_DATA_STORAGE_KEYS.scheduleEntries, userId),
        sessions: loadScopedData(STUDY_DATA_STORAGE_KEYS.sessions, userId),
        badges: loadScopedData(STUDY_DATA_STORAGE_KEYS.badges, userId),
        courseTopics: loadScopedData(STUDY_DATA_STORAGE_KEYS.courseTopics, userId),
        rewardState: loadScopedRewardState(userId),
    });
}

function belongsToUser(record, userId) {
    return Boolean(userId) && record?.userId === userId;
}

function resolveMutationOwnerId(preferredUserId, fallbackUserId) {
    const safePreferredUserId = sanitizeIdentifier(preferredUserId, 80);
    const safeFallbackUserId = sanitizeIdentifier(fallbackUserId, 80);
    const safeAuthUserId = sanitizeIdentifier(auth.currentUser?.uid, 80);

    return safePreferredUserId || safeFallbackUserId || safeAuthUserId || '';
}

function extractStudyState(state) {
    return {
        courses: state.courses,
        tasks: state.tasks,
        scheduleEntries: state.scheduleEntries,
        sessions: state.sessions,
        badges: state.badges,
        courseTopics: state.courseTopics,
        rewardState: state.rewardState,
    };
}

function normalizeRemoteStudyData(data, userId) {
    return sanitizeStudyState(data, userId);
}

function getStudyStateSignature(studyState) {
    return JSON.stringify(studyState);
}

function getStudyStateSignatures(studyState) {
    return Object.fromEntries(
        Object.keys(EMPTY_STUDY_STATE).map((key) => [key, getStudyStateSignature(studyState?.[key] || [])])
    );
}

function getChangedStudyPayload(studyState) {
    const signatures = getStudyStateSignatures(studyState);
    const changedCollections = Object.entries(signatures).filter(
        ([key, signature]) => !lastSyncedStudySignatures || lastSyncedStudySignatures[key] !== signature
    );

    if (changedCollections.length === 0) {
        return { changedPayload: null, signatures };
    }

    return {
        changedPayload: Object.fromEntries(changedCollections.map(([key]) => [key, studyState[key]])),
        signatures,
    };
}

function markStudyStateSynced(studyState) {
    lastSyncedStudySignatures = getStudyStateSignatures(studyState);
}

function markRemoteStudyStateSynced(remoteStudyState, currentStudyState) {
    const currentSignatures = getStudyStateSignatures(currentStudyState);
    const remoteSignatures = getStudyStateSignatures(remoteStudyState);
    const previousSyncedSignatures = lastSyncedStudySignatures || {};

    lastSyncedStudySignatures = Object.fromEntries(
        Object.keys(EMPTY_STUDY_STATE).map((key) => {
            const hasUnsyncedLocalChanges = previousSyncedSignatures[key] && currentSignatures[key] !== previousSyncedSignatures[key];

            if (hasUnsyncedLocalChanges && remoteSignatures[key] !== currentSignatures[key]) {
                return [key, previousSyncedSignatures[key]];
            }

            return [key, remoteSignatures[key]];
        })
    );
}

function mergeRemoteStudyState(remoteStudyState, currentStudyState) {
    const currentSignatures = getStudyStateSignatures(currentStudyState);
    const remoteSignatures = getStudyStateSignatures(remoteStudyState);

    return applyRewardStateRecovery(Object.fromEntries(
        Object.keys(EMPTY_STUDY_STATE).map((key) => {
            if (key === 'rewardState') {
                return [key, mergeRewardStateSnapshot(remoteStudyState?.rewardState, currentStudyState?.rewardState)];
            }

            const hasUnsyncedLocalChanges =
                lastSyncedStudySignatures && currentSignatures[key] !== lastSyncedStudySignatures[key];

            if (hasUnsyncedLocalChanges && remoteSignatures[key] !== currentSignatures[key]) {
                return [key, currentStudyState[key]];
            }

            return [key, remoteStudyState[key]];
        })
    ));
}

function mergeStudyCollectionRecords(remoteRecords = [], localRecords = []) {
    const merged = new Map();

    remoteRecords.forEach((record) => {
        if (record?.id) {
            merged.set(record.id, record);
        }
    });

    localRecords.forEach((record) => {
        if (record?.id && !merged.has(record.id)) {
            merged.set(record.id, record);
        }
    });

    return Array.from(merged.values());
}

function mergeHydratedStudyState(remoteStudyState, localStudyState) {
    return applyRewardStateRecovery(Object.fromEntries(
        Object.keys(EMPTY_STUDY_STATE).map((key) => {
            if (key === 'rewardState') {
                return [key, mergeRewardStateSnapshot(remoteStudyState?.rewardState, localStudyState?.rewardState)];
            }

            return [
                key,
                mergeStudyCollectionRecords(remoteStudyState?.[key] || [], localStudyState?.[key] || []),
            ];
        })
    ));
}

function maxDateKey(left, right) {
    const safeLeft = sanitizeDateKey(left, '');
    const safeRight = sanitizeDateKey(right, '');

    if (!safeLeft) return safeRight;
    if (!safeRight) return safeLeft;
    return safeLeft >= safeRight ? safeLeft : safeRight;
}

function maxIsoDate(left, right) {
    const safeLeft = sanitizeIsoDateTime(left, '');
    const safeRight = sanitizeIsoDateTime(right, '');

    if (!safeLeft) return safeRight;
    if (!safeRight) return safeLeft;
    return safeLeft >= safeRight ? safeLeft : safeRight;
}

function mergeRewardStateSnapshot(remoteRewardState, localRewardState) {
    const currentWeekKey = getWeekKey();
    const currentDayKey = getToday();
    const safeRemote = sanitizeRewardState(remoteRewardState);
    const safeLocal = sanitizeRewardState(localRewardState);

    return {
        coinBalance: Math.max(safeRemote.coinBalance, safeLocal.coinBalance),
        xp: Math.max(safeRemote.xp, safeLocal.xp),
        streakCount: Math.max(safeRemote.streakCount, safeLocal.streakCount),
        totalFocusMinutes: Math.max(safeRemote.totalFocusMinutes, safeLocal.totalFocusMinutes),
        weeklyFocusMinutes: Math.max(
            safeRemote.weeklyFocusWeekKey === currentWeekKey ? safeRemote.weeklyFocusMinutes : 0,
            safeLocal.weeklyFocusWeekKey === currentWeekKey ? safeLocal.weeklyFocusMinutes : 0
        ),
        weeklyFocusWeekKey: currentWeekKey,
        dailyFocusMinutes: Math.max(
            safeRemote.dailyDateKey === currentDayKey ? safeRemote.dailyFocusMinutes : 0,
            safeLocal.dailyDateKey === currentDayKey ? safeLocal.dailyFocusMinutes : 0
        ),
        dailySessionsCount: Math.max(
            safeRemote.dailyDateKey === currentDayKey ? safeRemote.dailySessionsCount : 0,
            safeLocal.dailyDateKey === currentDayKey ? safeLocal.dailySessionsCount : 0
        ),
        dailyDateKey: currentDayKey,
        lastActiveDate: maxDateKey(safeRemote.lastActiveDate, safeLocal.lastActiveDate),
        lastRewardedAt: maxIsoDate(safeRemote.lastRewardedAt, safeLocal.lastRewardedAt),
    };
}

function applyRewardStateRecovery(studyState) {
    const recoveredRewardState = deriveRewardStateFromSessions(studyState?.sessions || []);
    const currentRewardState = sanitizeRewardState(studyState?.rewardState);

    return {
        ...studyState,
        rewardState: {
            coinBalance: Math.max(currentRewardState.coinBalance, recoveredRewardState.coinBalance),
            xp: Math.max(currentRewardState.xp, recoveredRewardState.xp),
            streakCount: Math.max(currentRewardState.streakCount, recoveredRewardState.streakCount),
            totalFocusMinutes: Math.max(currentRewardState.totalFocusMinutes, recoveredRewardState.totalFocusMinutes),
            weeklyFocusMinutes: Math.max(
                currentRewardState.weeklyFocusMinutes,
                recoveredRewardState.weeklyFocusMinutes
            ),
            weeklyFocusWeekKey: getWeekKey(),
            dailyFocusMinutes: Math.max(
                currentRewardState.dailyFocusMinutes,
                recoveredRewardState.dailyFocusMinutes
            ),
            dailySessionsCount: Math.max(
                currentRewardState.dailySessionsCount,
                recoveredRewardState.dailySessionsCount
            ),
            dailyDateKey: getToday(),
            lastActiveDate: maxDateKey(currentRewardState.lastActiveDate, recoveredRewardState.lastActiveDate),
            lastRewardedAt: maxIsoDate(currentRewardState.lastRewardedAt, recoveredRewardState.lastRewardedAt),
        },
    };
}

function hasStudyData(studyState) {
    return Object.entries(studyState).some(([key, value]) => {
        if (key === 'rewardState') {
            return Boolean(
                value &&
                (value.coinBalance > 0 ||
                    value.xp > 0 ||
                    value.streakCount > 0 ||
                    value.totalFocusMinutes > 0 ||
                    value.weeklyFocusMinutes > 0 ||
                    value.dailyFocusMinutes > 0 ||
                    value.dailySessionsCount > 0)
            );
        }

        return Array.isArray(value) && value.length > 0;
    });
}

function persistScopedStudyState(userId, studyState) {
    if (!userId) {
        return;
    }

    const sanitizedStudyState = sanitizeStudyState(studyState, userId);
    saveScopedData(STUDY_DATA_STORAGE_KEYS.courses, userId, sanitizedStudyState.courses);
    saveScopedData(STUDY_DATA_STORAGE_KEYS.tasks, userId, sanitizedStudyState.tasks);
    saveScopedData(STUDY_DATA_STORAGE_KEYS.scheduleEntries, userId, sanitizedStudyState.scheduleEntries);
    saveScopedData(STUDY_DATA_STORAGE_KEYS.sessions, userId, sanitizedStudyState.sessions);
    saveScopedData(STUDY_DATA_STORAGE_KEYS.badges, userId, sanitizedStudyState.badges);
    saveScopedData(STUDY_DATA_STORAGE_KEYS.courseTopics, userId, sanitizedStudyState.courseTopics);
    saveScopedRewardState(userId, sanitizedStudyState.rewardState);
}

function clearStudyDataSync() {
    if (studyDataUnsubscribe) {
        studyDataUnsubscribe();
        studyDataUnsubscribe = null;
    }

    if (studyDataSyncTimer) {
        window.clearTimeout(studyDataSyncTimer);
        studyDataSyncTimer = null;
    }

    if (criticalStudySyncTimer) {
        window.clearTimeout(criticalStudySyncTimer);
        criticalStudySyncTimer = null;
    }

    isApplyingRemoteStudySnapshot = false;
    lastSyncedStudySignatures = null;
    activeStudySyncUserId = null;
}

async function syncStudyStateToFirestore(userId, studyState) {
    if (!userId) {
        return false;
    }

    const sanitizedStudyState = sanitizeStudyState(studyState, userId);
    const { changedPayload, signatures } = getChangedStudyPayload(sanitizedStudyState);

    if (!changedPayload) {
        return true;
    }

    const isReady = await ensureStudyDataSyncReady();
    if (!isReady) {
        return false;
    }

    await setDoc(
        doc(db, STUDY_DATA_COLLECTION, userId),
        {
            userId,
            ...changedPayload,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );

    lastSyncedStudySignatures = signatures;
    return true;
}

async function ensureStudyDataSyncReady() {
    try {
        await ensureAppCheckToken();
        return true;
    } catch (error) {
        console.error('Study data sync security check failed', error);
        return false;
    }
}

const useAppStore = create((set, get) => ({
    ...EMPTY_STUDY_STATE,
    activeUserId: null,
    toasts: [],

    // --- FOCUS MODE & SOCIAL ---
    isFocusMode: false,
    focusTask: null, // The task currently focused on
    setFocusMode: (isActive, task = null) => set({ isFocusMode: isActive, focusTask: task }),

    // --- AMBIENT SOUNDS ---
    ambientSounds: DEFAULT_AMBIENT_SOUNDS,
    updateAmbientSound: (id, updates) => set((state) => ({
        ambientSounds: (Array.isArray(state.ambientSounds) ? state.ambientSounds : DEFAULT_AMBIENT_SOUNDS)
            .map((sound) => (sound.id === id ? { ...sound, ...updates } : sound)),
    })),

    flushCloudStudySync: async () => {
        const currentState = get();
        const userId = resolveMutationOwnerId('', currentState.activeUserId);

        if (!userId || isApplyingRemoteStudySnapshot) {
            return false;
        }

        if (studyDataSyncTimer) {
            window.clearTimeout(studyDataSyncTimer);
            studyDataSyncTimer = null;
        }

        try {
            return await syncStudyStateToFirestore(userId, extractStudyState(currentState));
        } catch (error) {
            console.error('Failed to flush study data to Firestore', error);
            return false;
        }
    },

    requestCriticalCloudStudySync: () => {
        const currentState = get();
        const userId = resolveMutationOwnerId('', currentState.activeUserId);

        if (!userId || isApplyingRemoteStudySnapshot) {
            return;
        }

        if (criticalStudySyncTimer) {
            window.clearTimeout(criticalStudySyncTimer);
        }

        criticalStudySyncTimer = window.setTimeout(() => {
            criticalStudySyncTimer = null;
            void get().flushCloudStudySync();
        }, 80);
    },

    scheduleCloudStudySync: () => {
        const currentState = get();
        const userId = resolveMutationOwnerId('', currentState.activeUserId);

        if (!userId || isApplyingRemoteStudySnapshot) {
            return;
        }

        if (studyDataSyncTimer) {
            window.clearTimeout(studyDataSyncTimer);
        }

        studyDataSyncTimer = window.setTimeout(async () => {
            const latestState = get();
            const latestUserId = resolveMutationOwnerId('', latestState.activeUserId);

            if (!latestUserId || latestUserId !== userId || isApplyingRemoteStudySnapshot) {
                return;
            }

            try {
                await syncStudyStateToFirestore(latestUserId, extractStudyState(latestState));
            } catch (error) {
                console.error('Failed to sync study data to Firestore', error);
            }
        }, 250);
    },

    hydratePersistedStudyData: async (userId) => {
        clearStudyDataSync();
        activeStudySyncUserId = userId || null;

        const localStudyState = buildScopedStudyState(userId);
        set({
            activeUserId: userId || null,
            ...localStudyState,
            toasts: [],
            isFocusMode: false,
            focusTask: null,
            ambientSounds: DEFAULT_AMBIENT_SOUNDS,
        });

        if (!userId) {
            return;
        }

        try {
            const isReady = await ensureStudyDataSyncReady();
            if (!isReady) {
                return;
            }

            const studyRef = doc(db, STUDY_DATA_COLLECTION, userId);
            const snapshot = await getDoc(studyRef);

            if (snapshot.exists()) {
                const remoteStudyState = normalizeRemoteStudyData(snapshot.data(), userId);
                const hydratedStudyState = mergeHydratedStudyState(remoteStudyState, localStudyState);
                const remoteSignature = getStudyStateSignature(remoteStudyState);
                const hydratedSignature = getStudyStateSignature(hydratedStudyState);
                isApplyingRemoteStudySnapshot = true;
                persistScopedStudyState(userId, hydratedStudyState);
                set((state) => ({
                    ...hydratedStudyState,
                    activeUserId: userId,
                    toasts: state.toasts,
                    isFocusMode: false,
                    focusTask: null,
                    ambientSounds: DEFAULT_AMBIENT_SOUNDS,
                }));
                markStudyStateSynced(remoteStudyState);
                isApplyingRemoteStudySnapshot = false;
                if (remoteSignature !== hydratedSignature) {
                    get().scheduleCloudStudySync();
                }
            } else if (hasStudyData(localStudyState)) {
                get().scheduleCloudStudySync();
            } else {
                markStudyStateSynced(localStudyState);
            }

            studyDataUnsubscribe = onSnapshot(
                studyRef,
                (remoteSnapshot) => {
                    if (!remoteSnapshot.exists() || activeStudySyncUserId !== userId) {
                        return;
                    }

                    const remoteStudyState = normalizeRemoteStudyData(remoteSnapshot.data(), userId);
                    const currentStudyState = extractStudyState(get());
                    const remoteSignature = getStudyStateSignature(remoteStudyState);
                    const currentSignature = getStudyStateSignature(currentStudyState);

                    if (remoteSignature === currentSignature) {
                        markStudyStateSynced(remoteStudyState);
                        return;
                    }

                    const mergedStudyState = mergeRemoteStudyState(remoteStudyState, currentStudyState);
                    isApplyingRemoteStudySnapshot = true;
                    persistScopedStudyState(userId, mergedStudyState);
                    set((state) => ({
                        ...mergedStudyState,
                        activeUserId: userId,
                        toasts: state.toasts,
                        isFocusMode: state.isFocusMode,
                        focusTask: state.focusTask,
                        ambientSounds: state.ambientSounds,
                    }));
                    markRemoteStudyStateSynced(remoteStudyState, currentStudyState);
                    isApplyingRemoteStudySnapshot = false;
                },
                (error) => {
                    console.error('Study data realtime sync failed', error);
                }
            );
        } catch (error) {
            console.error('Failed to hydrate study data from Firestore', error);
        }
    },

    resetInMemoryStudyData: () => {
        clearStudyDataSync();
        set({
            activeUserId: null,
            ...EMPTY_STUDY_STATE,
            toasts: [],
            isFocusMode: false,
            focusTask: null,
            ambientSounds: DEFAULT_AMBIENT_SOUNDS,
        });
    },

    // --- COURSES ---
    addCourse: (course) => {
        const ownerId = resolveMutationOwnerId(course?.userId, get().activeUserId);
        if (!ownerId) return null;

        const newCourse = {
            ...course,
            userId: ownerId,
            id: generateId(),
            createdAt: new Date().toISOString(),
        };
        set((state) => {
            const courses = [...state.courses, newCourse];
            const scopedUserId = resolveMutationOwnerId(newCourse.userId, state.activeUserId);
            const sanitizedCourses = saveScopedData(STUDY_DATA_STORAGE_KEYS.courses, scopedUserId, courses);
            return {
                activeUserId: state.activeUserId || scopedUserId,
                courses: sanitizedCourses,
            };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
        return sanitizeCourseRecord(newCourse, ownerId);
    },
    updateCourse: (id, updates) => {
        set((state) => {
            const courses = state.courses.map((c) =>
                c.id === id && belongsToUser(c, state.activeUserId) ? { ...c, ...updates } : c
            );
            const sanitizedCourses = saveScopedData(STUDY_DATA_STORAGE_KEYS.courses, state.activeUserId, courses);
            return { courses: sanitizedCourses };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
    },
    deleteCourse: (id) => {
        set((state) => {
            const courses = state.courses.filter((c) => !(c.id === id && belongsToUser(c, state.activeUserId)));
            const sanitizedCourses = saveScopedData(STUDY_DATA_STORAGE_KEYS.courses, state.activeUserId, courses);
            return { courses: sanitizedCourses };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
    },

    // --- COURSE TOPICS ---
    addCourseTopic: (topic) => {
        const ownerId = resolveMutationOwnerId(topic?.userId, get().activeUserId);
        if (!ownerId) return null;

        const newTopic = {
            ...topic,
            userId: ownerId,
            id: generateId(),
            completed: false,
            children: [],
            createdAt: new Date().toISOString(),
        };
        set((state) => {
            const courseTopics = [...state.courseTopics, newTopic];
            const scopedUserId = resolveMutationOwnerId(newTopic.userId, state.activeUserId);
            const sanitizedCourseTopics = saveScopedData(STUDY_DATA_STORAGE_KEYS.courseTopics, scopedUserId, courseTopics);
            return {
                activeUserId: state.activeUserId || scopedUserId,
                courseTopics: sanitizedCourseTopics,
            };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
        return sanitizeCourseTopicRecord(newTopic, ownerId);
    },
    updateCourseTopic: (id, updates) => {
        set((state) => {
            const courseTopics = state.courseTopics.map((t) =>
                t.id === id && belongsToUser(t, state.activeUserId) ? { ...t, ...updates } : t
            );
            const sanitizedCourseTopics = saveScopedData(STUDY_DATA_STORAGE_KEYS.courseTopics, state.activeUserId, courseTopics);
            return { courseTopics: sanitizedCourseTopics };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
    },
    deleteCourseTopic: (id) => {
        set((state) => {
            // Also remove all children
            const toDelete = new Set([id]);
            const findChildren = (parentId) => {
                state.courseTopics.forEach((t) => {
                    if (t.parentId === parentId && belongsToUser(t, state.activeUserId)) {
                        toDelete.add(t.id);
                        findChildren(t.id);
                    }
                });
            };
            findChildren(id);
            const courseTopics = state.courseTopics.filter((t) => !toDelete.has(t.id) || !belongsToUser(t, state.activeUserId));
            const sanitizedCourseTopics = saveScopedData(STUDY_DATA_STORAGE_KEYS.courseTopics, state.activeUserId, courseTopics);
            return { courseTopics: sanitizedCourseTopics };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
    },
    toggleCourseTopic: (id) => {
        set((state) => {
            const courseTopics = state.courseTopics.map((t) =>
                t.id === id && belongsToUser(t, state.activeUserId) ? { ...t, completed: !t.completed } : t
            );
            const sanitizedCourseTopics = saveScopedData(STUDY_DATA_STORAGE_KEYS.courseTopics, state.activeUserId, courseTopics);
            return { courseTopics: sanitizedCourseTopics };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
    },
    reorderCourseTopics: (courseId, orderedIds) => {
        set((state) => {
            const courseTopics = [...state.courseTopics];
            orderedIds.forEach((id, index) => {
                const idx = courseTopics.findIndex((t) => t.id === id);
                if (idx >= 0 && courseTopics[idx].courseId === courseId && belongsToUser(courseTopics[idx], state.activeUserId)) {
                    courseTopics[idx] = { ...courseTopics[idx], order: index };
                }
            });
            const sanitizedCourseTopics = saveScopedData(STUDY_DATA_STORAGE_KEYS.courseTopics, state.activeUserId, courseTopics);
            return { courseTopics: sanitizedCourseTopics };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
    },

    // --- TASKS ---
    addTask: (task) => {
        const ownerId = resolveMutationOwnerId(task?.userId, get().activeUserId);
        if (!ownerId) return null;

        const newTask = {
            ...task,
            userId: ownerId,
            id: generateId(),
            completed: false,
            subtasks: task.subtasks || [],
            estimatedMinutes: task.estimatedMinutes || null,
            createdAt: new Date().toISOString(),
        };
        set((state) => {
            const tasks = [...state.tasks, newTask];
            const scopedUserId = resolveMutationOwnerId(newTask.userId, state.activeUserId);
            const sanitizedTasks = saveScopedData(STUDY_DATA_STORAGE_KEYS.tasks, scopedUserId, tasks);
            return {
                activeUserId: state.activeUserId || scopedUserId,
                tasks: sanitizedTasks,
            };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
        return sanitizeTaskRecord(newTask, ownerId);
    },
    updateTask: (id, updates) => {
        set((state) => {
            const tasks = state.tasks.map((t) =>
                t.id === id && belongsToUser(t, state.activeUserId) ? { ...t, ...updates } : t
            );
            const sanitizedTasks = saveScopedData(STUDY_DATA_STORAGE_KEYS.tasks, state.activeUserId, tasks);
            return { tasks: sanitizedTasks };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
    },
    deleteTask: (id) => {
        set((state) => {
            const tasks = state.tasks.filter((t) => !(t.id === id && belongsToUser(t, state.activeUserId)));
            const sanitizedTasks = saveScopedData(STUDY_DATA_STORAGE_KEYS.tasks, state.activeUserId, tasks);
            return { tasks: sanitizedTasks };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
    },
    toggleTask: (id) => {
        set((state) => {
            const tasks = state.tasks.map((t) =>
                t.id === id && belongsToUser(t, state.activeUserId) ? { ...t, completed: !t.completed } : t
            );
            const sanitizedTasks = saveScopedData(STUDY_DATA_STORAGE_KEYS.tasks, state.activeUserId, tasks);
            return { tasks: sanitizedTasks };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
    },
    toggleSubtask: (taskId, subtaskIndex) => {
        set((state) => {
            const tasks = state.tasks.map((t) => {
                if (t.id === taskId && t.subtasks && belongsToUser(t, state.activeUserId)) {
                    const subtasks = [...t.subtasks];
                    subtasks[subtaskIndex] = { ...subtasks[subtaskIndex], completed: !subtasks[subtaskIndex].completed };
                    return { ...t, subtasks };
                }
                return t;
            });
            const sanitizedTasks = saveScopedData(STUDY_DATA_STORAGE_KEYS.tasks, state.activeUserId, tasks);
            return { tasks: sanitizedTasks };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
    },
    addSubtask: (taskId, subtaskTitle) => {
        set((state) => {
            const tasks = state.tasks.map((t) => {
                if (t.id === taskId && belongsToUser(t, state.activeUserId)) {
                    const subtasks = [...(t.subtasks || []), { title: subtaskTitle, completed: false }];
                    return { ...t, subtasks };
                }
                return t;
            });
            const sanitizedTasks = saveScopedData(STUDY_DATA_STORAGE_KEYS.tasks, state.activeUserId, tasks);
            return { tasks: sanitizedTasks };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
    },
    removeSubtask: (taskId, subtaskIndex) => {
        set((state) => {
            const tasks = state.tasks.map((t) => {
                if (t.id === taskId && t.subtasks && belongsToUser(t, state.activeUserId)) {
                    const subtasks = t.subtasks.filter((_, i) => i !== subtaskIndex);
                    return { ...t, subtasks };
                }
                return t;
            });
            const sanitizedTasks = saveScopedData(STUDY_DATA_STORAGE_KEYS.tasks, state.activeUserId, tasks);
            return { tasks: sanitizedTasks };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
    },

    // --- SCHEDULE ---
    addScheduleEntry: (entry) => {
        const ownerId = resolveMutationOwnerId(entry?.userId, get().activeUserId);
        if (!ownerId) return null;

        const newEntry = {
            ...entry,
            userId: ownerId,
            id: generateId(),
            blockType: entry.blockType || 'class',
            createdAt: new Date().toISOString(),
        };
        set((state) => {
            const scheduleEntries = [...state.scheduleEntries, newEntry];
            const scopedUserId = resolveMutationOwnerId(newEntry.userId, state.activeUserId);
            const sanitizedScheduleEntries = saveScopedData(STUDY_DATA_STORAGE_KEYS.scheduleEntries, scopedUserId, scheduleEntries);
            return {
                activeUserId: state.activeUserId || scopedUserId,
                scheduleEntries: sanitizedScheduleEntries,
            };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
        return sanitizeScheduleEntryRecord(newEntry, ownerId);
    },
    updateScheduleEntry: (id, updates) => {
        set((state) => {
            const scheduleEntries = state.scheduleEntries.map((e) =>
                e.id === id && belongsToUser(e, state.activeUserId) ? { ...e, ...updates } : e
            );
            const sanitizedScheduleEntries = saveScopedData(STUDY_DATA_STORAGE_KEYS.scheduleEntries, state.activeUserId, scheduleEntries);
            return { scheduleEntries: sanitizedScheduleEntries };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
    },
    deleteScheduleEntry: (id) => {
        set((state) => {
            const scheduleEntries = state.scheduleEntries.filter((e) => !(e.id === id && belongsToUser(e, state.activeUserId)));
            const sanitizedScheduleEntries = saveScopedData(STUDY_DATA_STORAGE_KEYS.scheduleEntries, state.activeUserId, scheduleEntries);
            return { scheduleEntries: sanitizedScheduleEntries };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
    },

    // --- SESSIONS ---
    addSession: (session) => {
        const ownerId = resolveMutationOwnerId(session?.userId, get().activeUserId);
        if (!ownerId) return null;

        const createdAt = new Date().toISOString();
        const newSession = {
            ...session,
            userId: ownerId,
            id: generateId(),
            createdAt,
            sessionDateKey: sanitizeDateKey(session?.sessionDateKey, getDateKeyInTurkey(createdAt)),
        };
        set((state) => {
            const sessions = [...state.sessions, newSession];
            const scopedUserId = resolveMutationOwnerId(newSession.userId, state.activeUserId);
            const sanitizedSessions = saveScopedData(STUDY_DATA_STORAGE_KEYS.sessions, scopedUserId, sessions);
            return {
                activeUserId: state.activeUserId || scopedUserId,
                sessions: sanitizedSessions,
            };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
        return sanitizeSessionRecord(newSession, ownerId);
    },
    updateSession: (id, updates) => {
        set((state) => {
            const sessions = state.sessions.map((s) =>
                s.id === id && belongsToUser(s, state.activeUserId) ? { ...s, ...updates } : s
            );
            const sanitizedSessions = saveScopedData(STUDY_DATA_STORAGE_KEYS.sessions, state.activeUserId, sessions);
            return { sessions: sanitizedSessions };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
    },

    // --- BADGES ---
    addBadge: (badge) => {
        const ownerId = resolveMutationOwnerId(badge?.userId, get().activeUserId);
        if (!ownerId) return null;

        const newBadge = {
            ...badge,
            userId: ownerId,
            id: generateId(),
            unlockedAt: new Date().toISOString(),
        };
        set((state) => {
            const badges = [...state.badges, newBadge];
            const scopedUserId = resolveMutationOwnerId(newBadge.userId, state.activeUserId);
            const sanitizedBadges = saveScopedData(STUDY_DATA_STORAGE_KEYS.badges, scopedUserId, badges);
            return {
                activeUserId: state.activeUserId || scopedUserId,
                badges: sanitizedBadges,
            };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
        return sanitizeBadgeRecord(newBadge, ownerId);
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
    clearPersistedStudyData: (targetUserId = get().activeUserId) => {
        if (!canUseLocalStorage()) {
            return;
        }

        for (const key of PERSISTED_APP_KEYS) {
            if (targetUserId) {
                localStorage.removeItem(getScopedStorageKey(key, targetUserId));
            } else {
                localStorage.removeItem(key);
            }
        }

        set({
            activeUserId: targetUserId ? get().activeUserId : null,
            courses: [],
            tasks: [],
            scheduleEntries: [],
            sessions: [],
            badges: [],
            courseTopics: [],
            toasts: [],
            isFocusMode: false,
            focusTask: null,
            ambientSounds: DEFAULT_AMBIENT_SOUNDS,
        });
    },

    saveRewardStateSnapshot: (rewardStateInput) => {
        const activeUserId = resolveMutationOwnerId('', get().activeUserId);
        if (!activeUserId) {
            return { ...EMPTY_STUDY_STATE.rewardState };
        }

        const nextRewardState = sanitizeRewardState(rewardStateInput);
        set((state) => {
            const rewardState = saveScopedRewardState(activeUserId, {
                ...state.rewardState,
                ...nextRewardState,
            });
            return {
                activeUserId: state.activeUserId || activeUserId,
                rewardState,
            };
        });
        get().scheduleCloudStudySync();
        get().requestCriticalCloudStudySync();
        return nextRewardState;
    },
}));

export default useAppStore;
