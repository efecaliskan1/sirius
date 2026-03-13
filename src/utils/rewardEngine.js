import { BADGE_DEFINITIONS, COINS_PER_SESSION, XP_PER_SESSION, XP_PER_TASK, LEVEL_THRESHOLDS, COMPANION_STAGES, MOTIVATIONAL_MESSAGES } from './constants';
import { getToday } from './helpers';

export function calculateCoins(session) {
    if (!session.completed) return 0;
    return COINS_PER_SESSION;
}

export function calculateXP(type = 'session') {
    return type === 'session' ? XP_PER_SESSION : XP_PER_TASK;
}

export function getLevelFromXP(xp) {
    let level = 0;
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
        if (xp >= LEVEL_THRESHOLDS[i]) {
            level = i;
        } else {
            break;
        }
    }
    const currentThreshold = LEVEL_THRESHOLDS[level] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[level + 1] || LEVEL_THRESHOLDS[level] + 1000;
    const progress = ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return { level, xp, currentThreshold, nextThreshold, progress: Math.min(100, progress) };
}

export function getCompanionStage(level) {
    let stage = COMPANION_STAGES[0];
    for (const s of COMPANION_STAGES) {
        if (level >= s.minLevel) stage = s;
    }
    return stage;
}

export function getMotivationalMessage(streak, totalSessions, lastActiveDate) {
    const today = getToday();

    // Check inactivity (hasn't been active in 2+ days)
    if (lastActiveDate) {
        const last = new Date(lastActiveDate);
        const now = new Date(today);
        const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
        if (diffDays >= 2) {
            const msgs = MOTIVATIONAL_MESSAGES.inactive;
            return msgs[Math.floor(Math.random() * msgs.length)];
        }
    }

    // Streak messages take priority
    if (streak > 0) {
        for (const tier of MOTIVATIONAL_MESSAGES.streak) {
            if (streak >= tier.min && streak <= tier.max) {
                const msg = tier.messages[Math.floor(Math.random() * tier.messages.length)];
                return msg.replace('{streak}', streak);
            }
        }
    }

    // Session-based messages
    for (const tier of MOTIVATIONAL_MESSAGES.sessions) {
        if (totalSessions >= tier.min && totalSessions <= tier.max) {
            const msgs = tier.messages;
            return msgs[Math.floor(Math.random() * msgs.length)];
        }
    }

    return "Let's make today count! 🚀";
}

export function checkNewBadges(stats, existingBadgeKeys) {
    const newBadges = [];
    for (const badge of BADGE_DEFINITIONS) {
        if (!existingBadgeKeys.includes(badge.badgeKey) && badge.condition(stats)) {
            newBadges.push(badge);
        }
    }
    return newBadges;
}

export function getSessionStats(sessions, courses) {
    const completedSessions = sessions.filter((s) => s.completed);
    const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0);
    const uniqueCourseIds = new Set(completedSessions.map((s) => s.courseId).filter(Boolean));

    const courseFocusTime = {};
    let longestSessionMinutes = 0;

    for (const session of completedSessions) {
        if (session.courseId) {
            courseFocusTime[session.courseId] = (courseFocusTime[session.courseId] || 0) + (session.actualMinutes || 0);
        }
        if (session.actualMinutes && session.actualMinutes > longestSessionMinutes) {
            longestSessionMinutes = session.actualMinutes;
        }
    }

    let mostStudiedCourse = null;
    let maxTime = 0;
    for (const [courseId, time] of Object.entries(courseFocusTime)) {
        if (time > maxTime) {
            maxTime = time;
            mostStudiedCourse = courses.find((c) => c.id === courseId) || null;
        }
    }

    return {
        totalSessions: completedSessions.length,
        totalMinutes,
        longestSessionMinutes,
        uniqueCourses: uniqueCourseIds.size,
        mostStudiedCourse,
        courseFocusTime,
    };
}

export function getWeeklyStats(sessions) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const daySessions = sessions.filter(
            (s) => s.completed && s.createdAt && s.createdAt.startsWith(dateStr)
        );
        const totalMinutes = daySessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0);
        weekDays.push({
            day: d.toLocaleDateString('en-US', { weekday: 'short' }),
            date: dateStr,
            minutes: totalMinutes,
            sessions: daySessions.length,
        });
    }
    return weekDays;
}

export function getHeatmapData(sessions, weeks = 12) {
    const today = new Date();
    const data = [];
    for (let i = weeks * 7 - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const daySessions = sessions.filter(
            (s) => s.completed && s.createdAt && s.createdAt.startsWith(dateStr)
        );
        const totalMinutes = daySessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0);

        const courseCounts = {};
        daySessions.forEach(s => {
            if (s.courseId) courseCounts[s.courseId] = (courseCounts[s.courseId] || 0) + (s.actualMinutes || 0);
        });
        let mainCourseId = null;
        let mainCourseMax = 0;
        for (const [id, count] of Object.entries(courseCounts)) {
            if (count > mainCourseMax) {
                mainCourseMax = count;
                mainCourseId = id;
            }
        }

        data.push({
            date: dateStr,
            day: d.toLocaleDateString('en-US', { weekday: 'short' }),
            minutes: totalMinutes,
            sessionsCount: daySessions.length,
            mainCourseId,
            level: totalMinutes === 0 ? 0 : totalMinutes <= 30 ? 1 : totalMinutes <= 60 ? 2 : totalMinutes <= 120 ? 3 : 4,
        });
    }
    return data;
}

export function getWeeklyTrend(sessions, weeks = 8) {
    const today = new Date();
    const trend = [];
    for (let w = weeks - 1; w >= 0; w--) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (w * 7 + today.getDay()));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const startStr = weekStart.toISOString().split('T')[0];
        const endStr = weekEnd.toISOString().split('T')[0];

        const weekSessions = sessions.filter(
            (s) => s.completed && s.createdAt && s.createdAt.split('T')[0] >= startStr && s.createdAt.split('T')[0] <= endStr
        );
        const totalMinutes = weekSessions.reduce((sum, s) => sum + (s.actualMinutes || 0), 0);
        trend.push({
            week: `W${weeks - w}`,
            minutes: totalMinutes,
            hours: Math.round(totalMinutes / 60 * 10) / 10,
        });
    }
    return trend;
}

export function getSmartSuggestion(courses, topics = [], sessions, today) {
    if (!courses || courses.length === 0) return { message: "Add your first course to get personalized study suggestions.", type: "new" };

    const completedSessions = sessions.filter(s => s.completed);

    const courseLastStudied = {};
    courses.forEach(c => courseLastStudied[c.id] = null);

    completedSessions.forEach(s => {
        if (s.courseId && s.createdAt) {
            const date = s.createdAt.split('T')[0];
            if (!courseLastStudied[s.courseId] || date > courseLastStudied[s.courseId]) {
                courseLastStudied[s.courseId] = date;
            }
        }
    });

    const now = new Date(today);
    let neglectedCourse = null;
    let maxDays = 0;

    for (const [courseId, lastDate] of Object.entries(courseLastStudied)) {
        if (!lastDate) {
            neglectedCourse = courses.find(c => c.id === courseId);
            maxDays = Infinity;
            break;
        }
        const diffDays = Math.floor((now - new Date(lastDate)) / (1000 * 60 * 60 * 24));
        if (diffDays > maxDays) {
            maxDays = diffDays;
            neglectedCourse = courses.find(c => c.id === courseId);
        }
    }

    if (neglectedCourse && maxDays > 2 && maxDays !== Infinity) {
        return {
            message: `You haven't studied ${neglectedCourse.courseName} in ${maxDays} days. Maybe review it today?`,
            courseId: neglectedCourse.id,
            type: 'neglected'
        };
    }

    const courseProgress = {};
    courses.forEach(c => {
        const cTopics = topics.filter(t => t.courseId === c.id && t.type === 'item');
        if (cTopics.length > 0) {
            const completed = cTopics.filter(t => t.completed).length;
            courseProgress[c.id] = completed / cTopics.length;
        }
    });

    for (const [courseId, progress] of Object.entries(courseProgress)) {
        if (progress > 0.6 && progress < 1) {
            const c = courses.find(c => c.id === courseId);
            return {
                message: `You are close to finishing the ${c.courseName} roadmap. Study now to complete it!`,
                courseId: c.id,
                type: 'progress'
            };
        }
    }

    // Default 
    const randomCourse = courses[Math.floor(Math.random() * courses.length)];
    if (randomCourse) {
        return {
            message: `Plan a quick focus session for ${randomCourse.courseName} today.`,
            courseId: randomCourse.id,
            type: 'general'
        };
    }

    return { message: "Ready to focus?", type: "general" };
}
