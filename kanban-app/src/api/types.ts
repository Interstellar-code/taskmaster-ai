// API Types for TaskMaster Integration

// TaskFormData interface as specified in the PRD for CRUD operations
export interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: TaskStatus;
  dependencies: number[];
  tags: string[];
  estimatedHours?: number;
  assignee?: string;
  dueDate?: Date;
  attachments?: File[];
  details?: string;
  test_strategy?: string;
  prd_id?: number;
  subtasks?: TaskMasterSubtaskForm[];
}

// Bulk operation interface for batch operations
export interface BulkOperation {
  taskIds: number[];
  operation: 'delete' | 'updateStatus' | 'updatePriority' | 'addDependency';
  payload: {
    status?: TaskStatus;
    priority?: 'low' | 'medium' | 'high';
    depends_on_task_id?: number;
  };
}

// Valid task statuses
export type TaskStatus = 'pending' | 'in-progress' | 'done' | 'review' | 'blocked' | 'deferred' | 'cancelled';

// TaskMaster subtask interface (standardized format)
export interface TaskMasterSubtaskForm {
  id: number;
  title: string;
  description?: string;
  details?: string;
  status: TaskStatus;
  dependencies?: number[];
  parent_task_id?: number;
  test_strategy?: string;
  prd_source?: {
    filePath: string;
    fileName: string;
    parsedDate: string;
    fileHash: string;
    fileSize: number;
  } | null;
}

// Task creation request interface
export interface CreateTaskRequest {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  status?: TaskStatus;
  dependencies?: number[];
  tags?: string[];
  estimatedHours?: number;
  assignee?: string;
  dueDate?: string; // ISO string format
  details?: string;
  test_strategy?: string;
  subtasks?: TaskMasterSubtaskForm[]; // Support for subtasks in creation
}

// Task update request interface
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: TaskStatus;
  dependencies?: number[];
  tags?: string[];
  estimatedHours?: number;
  assignee?: string;
  dueDate?: string; // ISO string format
  details?: string;
  test_strategy?: string;
}

export interface TaskMasterTask {
  id: number;
  title: string;
  description: string;
  details?: string;
  test_strategy?: string;
  status: string;
  priority: string;
  dependencies: number[];
  subtasks?: TaskMasterSubtask[];
  prd_source?: {
    filePath: string;
    fileName: string;
    parsedDate: string;
    fileHash: string;
    fileSize: number;
  } | null;
  updated_at?: string;
  // Complexity analysis
  complexity_score?: number;
  complexity_level?: 'low' | 'medium' | 'high';
}

export interface TaskMasterSubtask {
  id: number;
  title: string;
  description: string;
  details?: string;
  status: string;
  dependencies: number[];
  parent_task_id?: number;
  test_strategy?: string;
  prd_source?: {
    filePath: string;
    fileName: string;
    parsedDate: string;
    fileHash: string;
    fileSize: number;
  } | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  source?: string;
  timestamp: string;
  error?: string;
  message?: string;
}

export interface TasksResponse {
  tasks: TaskMasterTask[];
  summary?: {
    totalTasks: number;
    statusCounts: Record<string, number>;
  };
}

export interface ProjectInfo {
  totalTasks: number;
  statusBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  lastUpdated: string | null;
  projectName: string;
  coreIntegration: boolean;
}

// Kanban-specific types
export interface KanbanTask {
  id: string;
  content: string;
  columnId: ColumnId;
  title?: string;
  description?: string;
  priority?: string;
  dependencies?: number[];
  subtasks?: KanbanTask[];
}

// Enhanced Kanban task with rich metadata
export interface EnhancedKanbanTask {
  // Existing fields
  id: string;
  content: string;
  columnId: ColumnId;

  // Enhanced metadata
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: string;

  // Progress indicators
  subtaskProgress?: {
    completed: number;
    total: number;
    percentage: number;
  };

  // Relationships
  dependencies: number[];
  dependencyStatus: 'none' | 'waiting' | 'ready';

  // Temporal data
  updated_at?: Date;
  ageInDays?: number;

  // Source tracking
  prd_source?: {
    fileName: string;
    parsedDate: Date;
  };

  // Testing
  hasTestStrategy: boolean;

  // Complexity analysis
  complexity_score?: number;
  complexity_level?: 'low' | 'medium' | 'high';

  // Additional metadata
  details?: string;
  test_strategy?: string;
}

export interface Column {
  id: ColumnId;
  title: string;
}

export type ColumnId = "pending" | "in-progress" | "done";

// Status mapping between TaskMaster and Kanban
export const STATUS_MAPPING: Record<string, ColumnId> = {
  'pending': 'pending',
  'in-progress': 'in-progress',
  'done': 'done',
  'review': 'in-progress', // Review tasks go to in-progress with indicator
  'blocked': 'pending', // Blocked tasks go to pending with indicator
  'cancelled': 'done', // Cancelled tasks go to done
  'deferred': 'pending' // Deferred tasks go to pending
};

// Reverse mapping for status updates (now direct mapping)
export const KANBAN_TO_TASKMASTER_STATUS: Record<ColumnId, string> = {
  'pending': 'pending',
  'in-progress': 'in-progress',
  'done': 'done'
};
