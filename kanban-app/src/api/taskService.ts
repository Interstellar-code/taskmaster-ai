// TaskMaster API Service
import {
  TaskMasterTask,
  ApiResponse,
  ProjectInfo,
  KanbanTask,
  EnhancedKanbanTask,
  ColumnId,
  STATUS_MAPPING,
  KANBAN_TO_TASKMASTER_STATUS
} from './types';

const API_BASE_URL = 'http://localhost:3003';

// Extended interfaces for comprehensive API support
interface ManualTaskData {
  title: string;
  description: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high';
  dependencies?: string[];
}

interface ManualSubtaskData {
  title: string;
  description: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface TaskCreateRequest {
  prompt?: string;
  dependencies?: string[];
  priority?: 'low' | 'medium' | 'high';
  research?: boolean;
  manualTaskData?: ManualTaskData;
}

interface TaskUpdateRequest {
  prompt?: string;
  // Structured update fields
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: string;
  dependencies?: string[];
  tags?: string[];
  estimatedHours?: number;
  assignee?: string;
  dueDate?: string;
  details?: string;
  testStrategy?: string;
  subtasks?: Array<{
    id: string | number;
    title: string;
    description?: string;
    details?: string;
    status: string;
    dependencies?: (string | number)[];
    parentTaskId?: string | number;
    testStrategy?: string;
    prdSource?: any;
  }>;
}

interface SubtaskCreateRequest {
  prompt?: string;
  dependencies?: string[];
  priority?: 'low' | 'medium' | 'high';
  manualSubtaskData?: ManualSubtaskData;
}

interface DependencyRequest {
  dependsOn: string;
}

interface TaskMoveRequest {
  after?: string;
}

interface ExpandTaskRequest {
  prompt?: string;
  num?: number;
}

interface ComplexityReport {
  totalTasks: number;
  complexityDistribution: Record<string, number>;
  averageComplexity: number;
  recommendations: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fixedDependencies?: string[];
}

interface TaskGenerationResult {
  success: boolean;
  generatedFiles: string[];
  errors: string[];
}

interface TaskComplexityAnalysis {
  taskId: string;
  complexity: 'low' | 'medium' | 'high';
  score: number;
  factors: string[];
  recommendations: string[];
  estimatedHours?: number;
}

interface BulkOperationResult {
  success: boolean;
  processedTasks: string[];
  errors: string[];
  summary: string;
}

interface TasksApiResponse {
  tasks: TaskMasterTask[];
  summary: {
    totalTasks: number;
    statusCounts: Record<string, number>;
  };
}

class TaskService {
  private async fetchApi<T>(endpoint: string, options?: RequestInit & { timeout?: number }): Promise<ApiResponse<T>> {
    try {
      // Default timeout is 60 seconds, but allow override for long operations
      const timeout = options?.timeout || 60000;

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out. This operation may take longer than expected.');
      }
      console.error('API request failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // CORE TASK MANAGEMENT METHODS
  // ============================================================================

  // Get all tasks from TaskMaster
  async getAllTasks(status?: string, withSubtasks?: boolean): Promise<TaskMasterTask[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (withSubtasks) params.append('withSubtasks', 'true');

    const endpoint = `/api/v1/tasks${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.fetchApi<TasksApiResponse>(endpoint);

    // The API returns { data: { tasks: [...], summary: {...} } }
    // We need to extract the tasks array from the nested structure
    if (response.data && Array.isArray(response.data.tasks)) {
      return response.data.tasks;
    }

    // Fallback: if response.data is already an array (for backward compatibility)
    if (Array.isArray(response.data)) {
      return response.data;
    }

    // If neither, return empty array to prevent errors
    console.warn('Unexpected API response structure:', response);
    return [];
  }

  // Get task by ID
  async getTaskById(id: string, status?: string): Promise<TaskMasterTask> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const endpoint = `/api/v1/tasks/${id}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.fetchApi<TaskMasterTask>(endpoint);
    return response.data;
  }

  // Create a new task
  async createTask(taskData: TaskCreateRequest): Promise<TaskMasterTask> {
    const response = await this.fetchApi<TaskMasterTask>('/api/v1/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
    return response.data;
  }

  // Update task by ID
  async updateTask(id: string, updateData: TaskUpdateRequest): Promise<TaskMasterTask> {
    const response = await this.fetchApi<TaskMasterTask>(`/api/v1/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return response.data;
  }

  // Update task status
  async updateTaskStatus(id: string, status: string): Promise<TaskMasterTask> {
    console.log(`updateTaskStatus: Making API call to /api/v1/tasks/${id}/status with status: ${status}`);

    const response = await this.fetchApi<TaskMasterTask>(`/api/v1/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });

    console.log('updateTaskStatus response:', response);
    return response.data;
  }

  // Delete a task
  async deleteTask(id: string): Promise<void> {
    await this.fetchApi<void>(`/api/v1/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Move task to new position
  async moveTask(id: string, moveData: TaskMoveRequest): Promise<TaskMasterTask> {
    const response = await this.fetchApi<TaskMasterTask>(`/api/v1/tasks/${id}/move`, {
      method: 'POST',
      body: JSON.stringify(moveData),
    });
    return response.data;
  }

  // Get next available task
  async getNextTask(): Promise<TaskMasterTask> {
    const response = await this.fetchApi<TaskMasterTask>('/api/v1/tasks/next');
    return response.data;
  }

  // Get project information
  async getProjectInfo(): Promise<ProjectInfo> {
    const response = await this.fetchApi<ProjectInfo>('/api/taskhero/info');
    return response.data;
  }

  // ============================================================================
  // SUBTASK MANAGEMENT METHODS
  // ============================================================================

  // Create a subtask
  async createSubtask(parentId: string, subtaskData: SubtaskCreateRequest): Promise<TaskMasterTask> {
    const response = await this.fetchApi<TaskMasterTask>(`/api/v1/tasks/${parentId}/subtasks`, {
      method: 'POST',
      body: JSON.stringify(subtaskData),
    });
    return response.data;
  }

  // Update subtask by ID
  async updateSubtask(parentId: string, subtaskId: string, updateData: TaskUpdateRequest): Promise<TaskMasterTask> {
    const response = await this.fetchApi<TaskMasterTask>(`/api/v1/tasks/${parentId}/subtasks/${subtaskId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return response.data;
  }

  // Update subtask status directly
  async updateSubtaskStatus(parentId: string, subtaskId: string, status: string): Promise<TaskMasterTask> {
    console.log(`updateSubtaskStatus: Making API call to update subtask ${parentId}.${subtaskId} status to: ${status}`);

    const response = await this.fetchApi<TaskMasterTask>(`/api/v1/tasks/${parentId}/subtasks/${subtaskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });

    console.log('updateSubtaskStatus response:', response);
    return response.data;
  }

  // Delete a subtask
  async deleteSubtask(parentId: string, subtaskId: string): Promise<void> {
    await this.fetchApi<void>(`/api/v1/tasks/${parentId}/subtasks/${subtaskId}`, {
      method: 'DELETE',
    });
  }

  // Clear all subtasks from a task
  async clearSubtasks(parentId: string): Promise<void> {
    await this.fetchApi<void>(`/api/v1/tasks/${parentId}/subtasks`, {
      method: 'DELETE',
    });
  }

  // Expand task into subtasks
  async expandTask(id: string, expandData: ExpandTaskRequest): Promise<TaskMasterTask> {
    const response = await this.fetchApi<TaskMasterTask>(`/api/v1/tasks/${id}/expand`, {
      method: 'POST',
      body: JSON.stringify(expandData),
      timeout: 300000, // 5 minutes timeout for AI operations
    });
    return response.data;
  }

  // ============================================================================
  // DEPENDENCY MANAGEMENT METHODS
  // ============================================================================

  // Add dependency to a task
  async addDependency(id: string, dependencyData: DependencyRequest): Promise<TaskMasterTask> {
    const response = await this.fetchApi<TaskMasterTask>(`/api/v1/tasks/${id}/dependencies`, {
      method: 'POST',
      body: JSON.stringify(dependencyData),
    });
    return response.data;
  }

  // Remove dependency from a task
  async removeDependency(id: string, dependencyId: string): Promise<void> {
    await this.fetchApi<void>(`/api/v1/tasks/${id}/dependencies/${dependencyId}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // VALIDATION AND ANALYSIS METHODS
  // ============================================================================

  // Validate task dependencies
  async validateDependencies(): Promise<ValidationResult> {
    const response = await this.fetchApi<ValidationResult>('/api/v1/tasks/validate-dependencies');
    return response.data;
  }

  // Fix broken dependencies
  async fixDependencies(): Promise<ValidationResult> {
    const response = await this.fetchApi<ValidationResult>('/api/v1/tasks/fix-dependencies', {
      method: 'POST',
    });
    return response.data;
  }

  // Generate task files from tasks.json
  async generateTaskFiles(): Promise<TaskGenerationResult> {
    const response = await this.fetchApi<TaskGenerationResult>('/api/v1/tasks/generate-files', {
      method: 'POST',
    });
    return response.data;
  }

  // Get complexity analysis report
  async getComplexityReport(): Promise<ComplexityReport> {
    const response = await this.fetchApi<ComplexityReport>('/api/v1/reports/complexity');
    return response.data;
  }

  // Analyze complexity of a specific task
  async analyzeTaskComplexity(id: string): Promise<TaskComplexityAnalysis> {
    const response = await this.fetchApi<TaskComplexityAnalysis>(`/api/v1/tasks/${id}/analyze-complexity`, {
      method: 'POST',
      timeout: 180000, // 3 minutes timeout for complexity analysis
    });
    return response.data;
  }

  // ============================================================================
  // BULK OPERATIONS METHODS
  // ============================================================================

  // Expand all tasks that need expansion
  async expandAllTasks(prompt?: string): Promise<BulkOperationResult> {
    const response = await this.fetchApi<BulkOperationResult>('/api/v1/tasks/expand-all', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
      timeout: 600000, // 10 minutes timeout for bulk operations
    });
    return response.data;
  }

  // Update all tasks with AI assistance
  async updateAllTasks(prompt: string): Promise<BulkOperationResult> {
    const response = await this.fetchApi<BulkOperationResult>('/api/v1/tasks/update-all', {
      method: 'PUT',
      body: JSON.stringify({ prompt }),
    });
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

  // Convert TaskMaster task to Enhanced Kanban task with rich metadata
  taskMasterToEnhancedKanban(task: TaskMasterTask): EnhancedKanbanTask {
    const columnId = STATUS_MAPPING[task.status] || 'todo';

    // Calculate subtask progress
    const subtaskProgress = task.subtasks?.length ? {
      completed: task.subtasks.filter(st => st.status === 'done').length,
      total: task.subtasks.length,
      percentage: (task.subtasks.filter(st => st.status === 'done').length / task.subtasks.length) * 100
    } : undefined;

    // Determine dependency status
    const dependencyStatus = task.dependencies.length === 0 ? 'none' : 'waiting'; // Would need to check actual dependency statuses

    // Calculate age in days
    const ageInDays = task.updatedAt ? Math.floor((Date.now() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24)) : undefined;

    return {
      id: String(task.id),
      content: task.title,
      columnId,
      title: task.title,
      description: task.description,
      priority: (task.priority as 'high' | 'medium' | 'low') || 'medium',
      status: task.status,
      subtaskProgress,
      dependencies: task.dependencies.map(dep => String(dep)),
      dependencyStatus,
      updatedAt: task.updatedAt ? new Date(task.updatedAt) : undefined,
      ageInDays,
      prdSource: task.prdSource ? {
        fileName: task.prdSource.fileName,
        parsedDate: new Date(task.prdSource.parsedDate)
      } : undefined,
      hasTestStrategy: Boolean(task.testStrategy?.trim()),
      complexityScore: task.complexityScore,
      complexityLevel: task.complexityLevel,
      details: task.details,
      testStrategy: task.testStrategy
    };
  }

  // Utility function to format relative time
  formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInDays > 0) {
      return `${diffInDays}d ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours}h ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes}m ago`;
    } else {
      return 'Just now';
    }
  }

  // Convert Kanban tasks back to TaskMaster format for status updates
  kanbanToTaskMasterStatus(columnId: ColumnId): string {
    return KANBAN_TO_TASKMASTER_STATUS[columnId];
  }

  // Get tasks organized by Kanban columns
  async getTasksByColumns(): Promise<Record<ColumnId, KanbanTask[]>> {
    try {
      const tasks = await this.getAllTasks();
      const columns: Record<ColumnId, KanbanTask[]> = {
        'pending': [],
        'in-progress': [],
        'done': []
      };

      // Ensure tasks is an array before calling forEach
      if (!Array.isArray(tasks)) {
        console.error('getAllTasks did not return an array:', tasks);
        return columns; // Return empty columns
      }

      tasks.forEach(task => {
        try {
          const kanbanTask = this.taskMasterToKanban(task);
          columns[kanbanTask.columnId].push(kanbanTask);
        } catch (error) {
          console.error('Error converting task to kanban format:', task, error);
        }
      });

      return columns;
    } catch (error) {
      console.error('Error in getTasksByColumns:', error);
      // Return empty columns structure on error
      return {
        'pending': [],
        'in-progress': [],
        'done': []
      };
    }
  }

  // Get enhanced tasks organized by Kanban columns
  async getEnhancedTasksByColumns(): Promise<Record<ColumnId, EnhancedKanbanTask[]>> {
    try {
      const tasks = await this.getAllTasks();
      const columns: Record<ColumnId, EnhancedKanbanTask[]> = {
        'pending': [],
        'in-progress': [],
        'done': []
      };

      // Ensure tasks is an array before calling forEach
      if (!Array.isArray(tasks)) {
        console.error('getAllTasks did not return an array:', tasks);
        return columns; // Return empty columns
      }

      tasks.forEach(task => {
        try {
          const enhancedKanbanTask = this.taskMasterToEnhancedKanban(task);
          columns[enhancedKanbanTask.columnId].push(enhancedKanbanTask);
        } catch (error) {
          console.error('Error converting task to enhanced kanban format:', task, error);
        }
      });

      return columns;
    } catch (error) {
      console.error('Error in getEnhancedTasksByColumns:', error);
      // Return empty columns structure on error
      return {
        'pending': [],
        'in-progress': [],
        'done': []
      };
    }
  }

  // Update task status when moved between columns
  async moveTaskToColumn(taskId: string, newColumnId: ColumnId): Promise<TaskMasterTask> {
    const newStatus = this.kanbanToTaskMasterStatus(newColumnId);
    console.log(`moveTaskToColumn: taskId=${taskId}, newColumnId=${newColumnId}, newStatus=${newStatus}`);

    const result = await this.updateTaskStatus(taskId, newStatus);
    console.log('moveTaskToColumn result:', result);

    return result;
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
