// Utility functions for the TaskMaster Kanban Web Application

import { Task, TaskStatus, TaskPriority } from '@/types';

/**
 * Get status color for UI components
 */
export const getStatusColor = (status: TaskStatus): string => {
  const statusColors: Record<TaskStatus, string> = {
    pending: 'bg-gray-100 text-gray-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    done: 'bg-green-100 text-green-800',
    review: 'bg-yellow-100 text-yellow-800',
    blocked: 'bg-red-100 text-red-800',
    deferred: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  return statusColors[status] || statusColors.pending;
};

/**
 * Get priority color for UI components
 */
export const getPriorityColor = (priority: TaskPriority): string => {
  const priorityColors: Record<TaskPriority, string> = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };
  return priorityColors[priority] || priorityColors.medium;
};

/**
 * Format task ID for display
 */
export const formatTaskId = (id: number): string => {
  return `#${id}`;
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Check if task has dependencies
 */
export const hasDependencies = (task: Task): boolean => {
  return task.dependencies && task.dependencies.length > 0;
};

/**
 * Get task completion percentage for tasks with subtasks
 */
export const getTaskCompletionPercentage = (task: Task): number => {
  if (!task.subtasks || task.subtasks.length === 0) {
    return task.status === 'done' ? 100 : 0;
  }

  const completedSubtasks = task.subtasks.filter(
    subtask => subtask.status === 'done'
  ).length;
  return Math.round((completedSubtasks / task.subtasks.length) * 100);
};

/**
 * Sort tasks by priority and then by ID
 */
export const sortTasks = (tasks: Task[]): Task[] => {
  const priorityOrder: Record<TaskPriority, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  return [...tasks].sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.id - b.id;
  });
};
