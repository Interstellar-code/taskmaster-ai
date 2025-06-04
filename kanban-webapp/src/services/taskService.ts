import type { Task, TaskStatus } from '../types/task';

const API_BASE_URL = 'http://localhost:3003/api/v1';

export class TaskService {
  static async getAllTasks(): Promise<Task[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.success ? data.data.tasks || [] : [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  }

  static async updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  static async getTaskById(taskId: string): Promise<Task> {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching task:', error);
      throw error;
    }
  }
}
