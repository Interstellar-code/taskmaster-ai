// API Types for TaskMaster Integration

// TaskFormData interface as specified in the PRD for CRUD operations
export interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: TaskStatus;
  dependencies: string[];
  tags: string[];
  estimatedHours?: number;
  assignee?: string;
  dueDate?: Date;
  attachments?: File[];
  details?: string;
  testStrategy?: string;
  prdSource?: string;
  subtasks?: SimpleSubtask[];
}

// Bulk operation interface for batch operations
export interface BulkOperation {
  taskIds: string[];
  operation: 'delete' | 'updateStatus' | 'updatePriority' | 'addDependency';
  payload: any;
}

// Valid task statuses
export type TaskStatus = 'pending' | 'in-progress' | 'done' | 'review' | 'blocked' | 'deferred' | 'cancelled';

// Simple subtask interface for form creation
export interface SimpleSubtask {
  id: string;
  title: string;
  completed: boolean;
}

// Task creation request interface
export interface CreateTaskRequest {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  status?: TaskStatus;
  dependencies?: string[];
  tags?: string[];
  estimatedHours?: number;
  assignee?: string;
  dueDate?: string; // ISO string format
  details?: string;
  testStrategy?: string;
  subtasks?: SimpleSubtask[]; // Support for subtasks in creation
}

// Task update request interface
export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: TaskStatus;
  dependencies?: string[];
  tags?: string[];
  estimatedHours?: number;
  assignee?: string;
  dueDate?: string; // ISO string format
  details?: string;
  testStrategy?: string;
}

export interface TaskMasterTask {
  id: string | number;
  title: string;
  description: string;
  details?: string;
  testStrategy?: string;
  status: string;
  priority: string;
  dependencies: (string | number)[];
  subtasks?: TaskMasterSubtask[];
  prdSource?: {
    filePath: string;
    fileName: string;
    parsedDate: string;
    fileHash: string;
    fileSize: number;
  } | null;
  updatedAt?: string;
  // Complexity analysis
  complexityScore?: number;
  complexityLevel?: 'low' | 'medium' | 'high';
}

export interface TaskMasterSubtask {
  id: string | number;
  title: string;
  description: string;
  details?: string;
  status: string;
  dependencies: (string | number)[];
  parentTaskId?: string | number;
  prdSource?: {
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
  dependencies?: string[];
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
  dependencies: string[];
  dependencyStatus: 'none' | 'waiting' | 'ready';

  // Temporal data
  updatedAt?: Date;
  ageInDays?: number;

  // Source tracking
  prdSource?: {
    fileName: string;
    parsedDate: Date;
  };

  // Testing
  hasTestStrategy: boolean;

  // Complexity analysis
  complexityScore?: number;
  complexityLevel?: 'low' | 'medium' | 'high';

  // Additional metadata
  details?: string;
  testStrategy?: string;
}

export interface Column {
  id: ColumnId;
  title: string;
}

export type ColumnId = "todo" | "in-progress" | "done";

// Status mapping between TaskMaster and Kanban
export const STATUS_MAPPING: Record<string, ColumnId> = {
  'pending': 'todo',
  'in-progress': 'in-progress',
  'done': 'done',
  'review': 'in-progress', // Review tasks go to in-progress with indicator
  'blocked': 'todo', // Blocked tasks go to todo with indicator
  'cancelled': 'done', // Cancelled tasks go to done
  'deferred': 'todo' // Deferred tasks go to todo
};

// Reverse mapping for status updates
export const KANBAN_TO_TASKMASTER_STATUS: Record<ColumnId, string> = {
  'todo': 'pending',
  'in-progress': 'in-progress',
  'done': 'done'
};
