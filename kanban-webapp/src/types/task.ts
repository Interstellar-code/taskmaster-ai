export interface Task {
  id: number | string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies: (number | string)[];
  subtasks?: Task[];
  details?: string;
  testStrategy?: string;
  createdAt?: string;
  updatedAt?: string;
  prdSource?: any;
}

export type TaskStatus = 'pending' | 'in-progress' | 'done' | 'review' | 'blocked' | 'deferred' | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  color: string;
}

export interface DragEndEvent {
  active: {
    id: string;
    data: {
      current: {
        task: Task;
        columnId: TaskStatus;
      };
    };
  };
  over: {
    id: string;
    data: {
      current: {
        columnId: TaskStatus;
      };
    };
  } | null;
}
