// API Types for TaskMaster Integration

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
