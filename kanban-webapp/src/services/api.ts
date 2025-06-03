// API service for communicating with TaskMaster backend

import { Task } from '@/types';

const API_BASE_URL = 'http://localhost:3001/api/v1';

/**
 * API client for TaskMaster backend
 */
export class TaskMasterAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch all tasks from the backend
   */
  async getTasks(): Promise<Task[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.tasks || [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: number, status: string): Promise<Task> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  /**
   * Create a new task
   */
  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    try {
      const response = await fetch(`${this.baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }
}

// Export a default instance
export const taskMasterAPI = new TaskMasterAPI();
