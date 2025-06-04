import { useState, useEffect, useCallback } from 'react';
import type { Task, TaskStatus, KanbanColumn } from '../types/task';
import { TaskService } from '../services/taskService';

const COLUMN_CONFIG: Record<TaskStatus, { title: string; color: string }> = {
  'pending': { title: 'Pending', color: 'bg-slate-100 border-slate-300' },
  'in-progress': { title: 'In Progress', color: 'bg-blue-100 border-blue-300' },
  'done': { title: 'Done', color: 'bg-green-100 border-green-300' },
  'review': { title: 'Review', color: 'bg-yellow-100 border-yellow-300' },
  'blocked': { title: 'Blocked', color: 'bg-red-100 border-red-300' },
  'deferred': { title: 'Deferred', color: 'bg-gray-100 border-gray-300' },
  'cancelled': { title: 'Cancelled', color: 'bg-gray-100 border-gray-300' }
};

export const useKanban = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create columns from tasks
  const columns: KanbanColumn[] = Object.entries(COLUMN_CONFIG).map(([status, config]) => ({
    id: status as TaskStatus,
    title: config.title,
    color: config.color,
    tasks: tasks.filter(task => task.status === status)
  }));

  // Load tasks from API
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedTasks = await TaskService.getAllTasks();
      setTasks(fetchedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  // Update task status with optimistic updates
  const updateTaskStatus = useCallback(async (taskId: number | string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? { ...task, status: newStatus, updatedAt: new Date().toISOString() }
          : task
      )
    );

    try {
      await TaskService.updateTaskStatus(taskId, newStatus);
      // Optionally refresh tasks to ensure consistency
      // await loadTasks();
    } catch (err) {
      // Revert optimistic update on error
      setError(err instanceof Error ? err.message : 'Failed to update task');
      await loadTasks(); // Reload to get correct state
    }
  }, [loadTasks]);

  // Initial load
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return {
    columns,
    tasks,
    loading,
    error,
    loadTasks,
    updateTaskStatus
  };
};
