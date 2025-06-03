// Core types for the TaskMaster Kanban Web Application

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies: number[];
  details?: string;
  testStrategy?: string;
  subtasks?: Subtask[];
  prdSource?: PRDSource;
}

export interface Subtask {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  dependencies: number[];
  details?: string;
  acceptanceCriteria?: string;
}

export interface PRDSource {
  filePath: string;
  fileName: string;
  parsedDate: string;
  fileHash: string;
  fileSize: number;
}

export type TaskStatus =
  | 'pending'
  | 'in-progress'
  | 'done'
  | 'review'
  | 'blocked'
  | 'deferred'
  | 'cancelled';

export type TaskPriority = 'high' | 'medium' | 'low';

export interface KanbanColumn {
  id: string;
  title: string;
  status: TaskStatus;
  tasks: Task[];
}

export interface DragDropResult {
  draggableId: string;
  type: string;
  source: {
    droppableId: string;
    index: number;
  };
  destination?: {
    droppableId: string;
    index: number;
  } | null;
}
