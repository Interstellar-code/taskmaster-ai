// Custom hook for managing tasks state and operations

import { useState, useEffect, useCallback } from 'react';
import { Task, TaskStatus } from '@/types';
import { taskMasterAPI } from '@/services/api';

export interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refreshTasks: () => Promise<void>;
  updateTaskStatus: (taskId: number, status: TaskStatus) => Promise<void>;
  createTask: (task: Omit<Task, 'id'>) => Promise<void>;
}

/**
 * Custom hook for managing tasks
 */
export const useTasks = (): UseTasksReturn => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch tasks from the API
   */
  const refreshTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedTasks = await taskMasterAPI.getTasks();
      setTasks(fetchedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update task status
   */
  const updateTaskStatus = useCallback(
    async (taskId: number, status: TaskStatus) => {
      try {
        setError(null);
        await taskMasterAPI.updateTaskStatus(taskId, status);

        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? { ...task, status } : task
          )
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update task status'
        );
        console.error('Error updating task status:', err);
      }
    },
    []
  );

  /**
   * Create a new task
   */
  const createTask = useCallback(async (newTask: Omit<Task, 'id'>) => {
    try {
      setError(null);
      const createdTask = await taskMasterAPI.createTask(newTask);
      setTasks(prevTasks => [...prevTasks, createdTask]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      console.error('Error creating task:', err);
    }
  }, []);

  // Load tasks on mount
  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  return {
    tasks,
    loading,
    error,
    refreshTasks,
    updateTaskStatus,
    createTask,
  };
};
