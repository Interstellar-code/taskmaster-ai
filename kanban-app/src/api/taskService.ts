// TaskMaster API Service
import { 
  TaskMasterTask, 
  ApiResponse, 
  TasksResponse, 
  ProjectInfo,
  KanbanTask,
  ColumnId,
  STATUS_MAPPING,
  KANBAN_TO_TASKMASTER_STATUS
} from './types';

const API_BASE_URL = 'http://localhost:3003';

class TaskService {
  private async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Get all tasks from TaskMaster
  async getAllTasks(): Promise<TaskMasterTask[]> {
    const response = await this.fetchApi<TaskMasterTask[]>('/api/tasks');
    return response.data;
  }

  // Get task by ID
  async getTaskById(id: string): Promise<TaskMasterTask> {
    const response = await this.fetchApi<TaskMasterTask>(`/api/tasks/${id}`);
    return response.data;
  }

  // Update task status
  async updateTaskStatus(id: string, status: string): Promise<TaskMasterTask> {
    const response = await this.fetchApi<TaskMasterTask>(`/api/tasks/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return response.data;
  }

  // Get project information
  async getProjectInfo(): Promise<ProjectInfo> {
    const response = await this.fetchApi<ProjectInfo>('/api/taskhero/info');
    return response.data;
  }

  // Convert TaskMaster task to Kanban task
  taskMasterToKanban(task: TaskMasterTask): KanbanTask {
    const columnId = STATUS_MAPPING[task.status] || 'todo';
    
    return {
      id: String(task.id),
      content: task.title,
      columnId,
      title: task.title,
      description: task.description,
      priority: task.priority,
      dependencies: task.dependencies.map(dep => String(dep)),
      subtasks: task.subtasks?.map(subtask => ({
        id: String(subtask.id),
        content: subtask.title,
        columnId: STATUS_MAPPING[subtask.status] || 'todo',
        title: subtask.title,
        description: subtask.description,
      }))
    };
  }

  // Convert Kanban tasks back to TaskMaster format for status updates
  kanbanToTaskMasterStatus(columnId: ColumnId): string {
    return KANBAN_TO_TASKMASTER_STATUS[columnId];
  }

  // Get tasks organized by Kanban columns
  async getTasksByColumns(): Promise<Record<ColumnId, KanbanTask[]>> {
    const tasks = await this.getAllTasks();
    const columns: Record<ColumnId, KanbanTask[]> = {
      'todo': [],
      'in-progress': [],
      'done': []
    };

    tasks.forEach(task => {
      const kanbanTask = this.taskMasterToKanban(task);
      columns[kanbanTask.columnId].push(kanbanTask);
    });

    return columns;
  }

  // Update task status when moved between columns
  async moveTaskToColumn(taskId: string, newColumnId: ColumnId): Promise<TaskMasterTask> {
    const newStatus = this.kanbanToTaskMasterStatus(newColumnId);
    return await this.updateTaskStatus(taskId, newStatus);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const taskService = new TaskService();
export default taskService;
