export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies: string[];
  subtasks?: Task[];
  createdAt: string;
  updatedAt: string;
  prdSource?: string;
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
