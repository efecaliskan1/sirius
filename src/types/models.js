/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} profilePhoto
 * @property {string} createdAt
 * @property {number} streakCount
 * @property {number} coinBalance
 */

/**
 * @typedef {Object} Course
 * @property {string} id
 * @property {string} userId
 * @property {string} courseName
 * @property {string} color
 * @property {string} createdAt
 */

/**
 * @typedef {Object} ScheduleEntry
 * @property {string} id
 * @property {string} userId
 * @property {string} courseId
 * @property {string} date
 * @property {string} startTime
 * @property {string} endTime
 * @property {string} optionalNote
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} userId
 * @property {string} courseId
 * @property {string} title
 * @property {string} description
 * @property {string} dueDate
 * @property {string} dueTime
 * @property {string} priority
 * @property {boolean} completed
 * @property {string} createdAt
 */

/**
 * @typedef {Object} PomodoroSession
 * @property {string} id
 * @property {string} userId
 * @property {string} courseId
 * @property {string} taskId
 * @property {number} plannedMinutes
 * @property {number} actualMinutes
 * @property {boolean} completed
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Badge
 * @property {string} badgeKey
 * @property {string} badgeName
 * @property {string} description
 * @property {string} icon
 */

/**
 * @typedef {Object} UserBadge
 * @property {string} id
 * @property {string} userId
 * @property {string} badgeKey
 * @property {string} unlockedAt
 */

export default {};
