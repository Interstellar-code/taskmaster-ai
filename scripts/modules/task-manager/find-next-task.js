import { log } from '../utils.js';
import { addComplexityToTask } from '../utils.js';

/**
 * Return the next work item:
 *   •  Prefer an eligible SUBTASK that belongs to any parent task
 *      whose own status is `in-progress`.
 *   •  If no such subtask exists, fall back to the best top-level task
 *      (previous behaviour).
 *
 * The function still exports the same name (`findNextTask`) so callers
 * don't need to change.  It now always returns an object with
 *  ─ id            →  number  (task)  or  "parentId.subId"  (subtask)
 *  ─ title         →  string
 *  ─ status        →  string
 *  ─ priority      →  string  ("high" | "medium" | "low")
 *  ─ dependencies  →  array   (all IDs expressed in the same dotted form)
 *  ─ parentId      →  number  (present only when it's a subtask)
 *
 * @param {Object[]} tasks  – full array of top-level tasks, each may contain .subtasks[]
 * @param {Object} [complexityReport=null] - Optional complexity report object
 * @returns {Object|null}   – next work item or null if nothing is eligible
 */
function findNextTask(tasks, complexityReport = null) {
	// ---------- helpers ----------------------------------------------------
	const priorityValues = { high: 3, medium: 2, low: 1 };

	const toFullSubId = (parentId, maybeDotId) => {
		//  "12.3"  ->  "12.3"
		//        4 ->  "12.4"   (numeric / short form)
		if (typeof maybeDotId === 'string' && maybeDotId.includes('.')) {
			return maybeDotId;
		}
		return `${parentId}.${maybeDotId}`;
	};

	// ---------- build completed-ID set (tasks *and* subtasks) --------------
	const completedIds = new Set();
	const satisfiedIds = new Set(); // Includes both completed and in-progress for dependency checking
	tasks.forEach((t) => {
		if (t.status === 'done' || t.status === 'completed') {
			completedIds.add(String(t.id));
			satisfiedIds.add(String(t.id));
		} else if (t.status === 'in-progress') {
			satisfiedIds.add(String(t.id)); // In-progress tasks can satisfy dependencies for next task selection
		}
		if (Array.isArray(t.subtasks)) {
			t.subtasks.forEach((st) => {
				if (st.status === 'done' || st.status === 'completed') {
					completedIds.add(`${t.id}.${st.id}`);
					satisfiedIds.add(`${t.id}.${st.id}`);
				} else if (st.status === 'in-progress') {
					satisfiedIds.add(`${t.id}.${st.id}`);
				}
			});
		}
	});

	// ---------- 1) look for eligible subtasks ------------------------------
	const candidateSubtasks = [];

	tasks
		.filter((t) => t.status === 'in-progress' && Array.isArray(t.subtasks))
		.forEach((parent) => {
			parent.subtasks.forEach((st) => {
				const stStatus = st.status || 'pending';
				const stStatusLower =
					typeof stStatus === 'string' ? stStatus.toLowerCase() : 'pending';
				if (stStatusLower !== 'pending' && stStatusLower !== 'in-progress')
					return;

				const fullDeps =
					st.dependencies?.map((d) => toFullSubId(parent.id, d)) ?? [];

				const depsSatisfied =
					fullDeps.length === 0 ||
					fullDeps.every((depId) => satisfiedIds.has(String(depId)));

				if (depsSatisfied) {
					candidateSubtasks.push({
						id: `${parent.id}.${st.id}`,
						title: st.title || `Subtask ${st.id}`,
						status: st.status || 'pending',
						priority: st.priority || parent.priority || 'medium',
						dependencies: fullDeps,
						parentId: parent.id
					});
				}
			});
		});

	if (candidateSubtasks.length > 0) {
		// sort by priority → dep-count → parent-id → sub-id
		candidateSubtasks.sort((a, b) => {
			const pa = priorityValues[a.priority] ?? 2;
			const pb = priorityValues[b.priority] ?? 2;
			if (pb !== pa) return pb - pa;

			if (a.dependencies.length !== b.dependencies.length)
				return a.dependencies.length - b.dependencies.length;

			// compare parent then sub-id numerically
			const [aPar, aSub] = a.id.split('.').map(Number);
			const [bPar, bSub] = b.id.split('.').map(Number);
			if (aPar !== bPar) return aPar - bPar;
			return aSub - bSub;
		});
		const nextTask = candidateSubtasks[0];

		// Add complexity to the task before returning
		if (nextTask && complexityReport) {
			addComplexityToTask(nextTask, complexityReport);
		}

		return nextTask;
	}

	// ---------- 2) fall back to top-level tasks with PRD priority logic ----
	const eligibleTasks = tasks.filter((task) => {
		const status = (task.status || 'pending').toLowerCase();
		// Only include pending tasks (not in-progress) for next task selection
		if (status !== 'pending') return false;
		const deps = task.dependencies ?? [];
		return deps.every((depId) => satisfiedIds.has(String(depId)));
	});

	if (eligibleTasks.length === 0) return null;

	// Enhanced sorting with PRD completion priority and last updated date
	const nextTask = eligibleTasks.sort((a, b) => {
		// 1. First priority: PRD completion logic (includes in-progress PRD priority)
		const prdPriorityA = calculatePRDPriority(a, tasks);
		const prdPriorityB = calculatePRDPriority(b, tasks);
		if (prdPriorityA !== prdPriorityB) return prdPriorityB - prdPriorityA;

		// 2. Second priority: Last updated date for tasks from in-progress PRDs
		const lastUpdatedA = getLastUpdatedDate(a, tasks);
		const lastUpdatedB = getLastUpdatedDate(b, tasks);
		if (
			lastUpdatedA &&
			lastUpdatedB &&
			prdPriorityA >= 1000 &&
			prdPriorityB >= 1000
		) {
			// For in-progress PRDs, prioritize more recently updated tasks
			const dateComparison = new Date(lastUpdatedB) - new Date(lastUpdatedA);
			if (dateComparison !== 0) return dateComparison;
		}

		// 3. Third priority: Sequential task order within PRD
		const sequentialPriorityA = calculateSequentialPriority(a, tasks);
		const sequentialPriorityB = calculateSequentialPriority(b, tasks);
		if (sequentialPriorityA !== sequentialPriorityB)
			return sequentialPriorityB - sequentialPriorityA;

		// 4. Fourth priority: task priority (high/medium/low)
		const pa = priorityValues[a.priority || 'medium'] ?? 2;
		const pb = priorityValues[b.priority || 'medium'] ?? 2;
		if (pb !== pa) return pb - pa;

		// 5. Fifth priority: dependency count (fewer dependencies first)
		const da = (a.dependencies ?? []).length;
		const db = (b.dependencies ?? []).length;
		if (da !== db) return da - db;

		// 6. Final tiebreaker: task ID (lower ID first)
		return a.id - b.id;
	})[0];

	// Add complexity to the task before returning
	if (nextTask && complexityReport) {
		addComplexityToTask(nextTask, complexityReport);
	}

	return nextTask;
}

/**
 * Calculate PRD completion priority for a task with enhanced logic
 * Higher values indicate higher priority for PRD completion
 * @param {Object} task - The task to evaluate
 * @param {Object[]} allTasks - All tasks in the project
 * @returns {number} Priority score (higher = more priority)
 */
function calculatePRDPriority(task, allTasks) {
	// If task has no PRD source, give it lower priority
	if (!task.prdSource || !task.prdSource.fileName) {
		return 0; // Manual tasks get lowest PRD priority
	}

	const prdFileName = task.prdSource.fileName;
	const prdId = task.prdSource.prdId;

	// Find all tasks from the same PRD
	const prdTasks = allTasks.filter(
		(t) =>
			t.prdSource &&
			(t.prdSource.fileName === prdFileName || t.prdSource.prdId === prdId)
	);

	if (prdTasks.length === 0) return 0;

	// Check if this PRD has any tasks currently in progress
	const prdHasInProgressTasks = prdTasks.some(
		(t) => t.status === 'in-progress'
	);

	// PRIORITY 1: Tasks from PRDs with in-progress tasks get highest priority
	let prdPriority = prdHasInProgressTasks ? 1000 : 0;

	// Count completed tasks from this PRD
	const completedPrdTasks = prdTasks.filter(
		(t) => t.status === 'done' || t.status === 'completed'
	);

	// Calculate completion percentage for this PRD
	const completionPercentage = completedPrdTasks.length / prdTasks.length;

	// Add completion-based priority (0-100)
	prdPriority += Math.floor(completionPercentage * 100);

	// Bonus points for PRDs that are very close to completion (80%+)
	if (completionPercentage >= 0.8) {
		prdPriority += 50; // Significant boost for nearly complete PRDs
	}

	// Additional bonus for PRDs with fewer remaining tasks
	const remainingTasks = prdTasks.length - completedPrdTasks.length;
	if (remainingTasks <= 3) {
		prdPriority += 25; // Boost for PRDs with 3 or fewer remaining tasks
	}

	// Slight bonus for sequential task completion within PRD
	// Check if this task is the next sequential task in the PRD
	const sortedPrdTasks = prdTasks.sort((a, b) => a.id - b.id);
	const taskIndex = sortedPrdTasks.findIndex((t) => t.id === task.id);

	if (taskIndex > 0) {
		// Check if all previous tasks in this PRD are completed
		const previousTasksCompleted = sortedPrdTasks
			.slice(0, taskIndex)
			.every((t) => t.status === 'done' || t.status === 'completed');

		if (previousTasksCompleted) {
			prdPriority += 10; // Small bonus for sequential completion
		}
	} else if (taskIndex === 0) {
		// First task in PRD gets a small bonus
		prdPriority += 5;
	}

	return prdPriority;
}

/**
 * Get the last updated date for a task or its PRD
 * @param {Object} task - The task to evaluate
 * @param {Object[]} allTasks - All tasks in the project
 * @returns {string|null} Last updated date or null
 */
function getLastUpdatedDate(task, allTasks) {
	// Try to get last updated from task itself
	if (task.lastUpdated) {
		return task.lastUpdated;
	}

	// Try to get from PRD metadata
	if (task.prdSource && task.prdSource.lastModified) {
		return task.prdSource.lastModified;
	}

	// Try to get from PRD file system (if available)
	if (task.prdSource && task.prdSource.fileName) {
		try {
			// This would require reading PRD metadata from the file system
			// For now, we'll use a fallback approach
			const prdTasks = allTasks.filter(
				(t) =>
					t.prdSource &&
					(t.prdSource.fileName === task.prdSource.fileName ||
						t.prdSource.prdId === task.prdSource.prdId)
			);

			// Find the most recently updated task in this PRD
			const mostRecentTask = prdTasks
				.filter((t) => t.lastUpdated)
				.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))[0];

			if (mostRecentTask) {
				return mostRecentTask.lastUpdated;
			}
		} catch (error) {
			// Ignore errors and continue
		}
	}

	return null;
}

/**
 * Calculate sequential priority for a task within its PRD
 * @param {Object} task - The task to evaluate
 * @param {Object[]} allTasks - All tasks in the project
 * @returns {number} Sequential priority score (higher = more priority)
 */
function calculateSequentialPriority(task, allTasks) {
	if (!task.prdSource || !task.prdSource.fileName) {
		return 0;
	}

	const prdFileName = task.prdSource.fileName;
	const prdId = task.prdSource.prdId;

	// Find all tasks from the same PRD
	const prdTasks = allTasks.filter(
		(t) =>
			t.prdSource &&
			(t.prdSource.fileName === prdFileName || t.prdSource.prdId === prdId)
	);

	if (prdTasks.length === 0) return 0;

	// Sort tasks by ID to get sequential order
	const sortedPrdTasks = prdTasks.sort((a, b) => a.id - b.id);
	const taskIndex = sortedPrdTasks.findIndex((t) => t.id === task.id);

	if (taskIndex === -1) return 0;

	// Check if all previous tasks in this PRD are completed
	const previousTasksCompleted = sortedPrdTasks
		.slice(0, taskIndex)
		.every((t) => t.status === 'done' || t.status === 'completed');

	if (previousTasksCompleted) {
		// Higher priority for tasks that are next in sequence
		// Reverse the index so earlier tasks get higher priority
		return (sortedPrdTasks.length - taskIndex) * 10;
	}

	// If previous tasks aren't completed, lower priority
	return 0;
}

export default findNextTask;
