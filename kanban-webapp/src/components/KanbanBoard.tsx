import React from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  KeyboardSensor,
  TouchSensor,
  MouseSensor,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, UniqueIdentifier, Active, Over } from '@dnd-kit/core';
import { useState, useRef } from 'react';

// Define Announcements type inline since it's not properly exported
interface Arguments {
  active: Active;
  over: Over | null;
}

interface Announcements {
  onDragStart({ active }: Pick<Arguments, 'active'>): string | undefined;
  onDragMove?({ active, over }: Arguments): string | undefined;
  onDragOver({ active, over }: Arguments): string | undefined;
  onDragEnd({ active, over }: Arguments): string | undefined;
  onDragCancel({ active, over }: Arguments): string | undefined;
}
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { useKanban } from '../hooks/useKanban';
import type { Task, TaskStatus } from '../types/task';
import { hasDraggableData } from './dnd/utils';
import { coordinateGetter } from './dnd/multipleContainersKeyboardPreset';

export const KanbanBoard: React.FC = () => {
  const { columns, loading, error, updateTaskStatus, isTaskUpdating, isTaskRecentlyDropped } = useKanban();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const pickedUpTaskColumn = useRef<TaskStatus | null>(null);

  // Configure drag sensors with enhanced accessibility
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: coordinateGetter,
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Helper function to get dragging task data for announcements
  function getDraggingTaskData(taskId: UniqueIdentifier, columnId: TaskStatus) {
    const column = columns.find((col) => col.id === columnId);
    const tasksInColumn = column?.tasks || [];
    const taskPosition = tasksInColumn.findIndex((task) => task.id === taskId);
    return {
      tasksInColumn,
      taskPosition,
      column,
    };
  }

  // Accessibility announcements for screen readers
  const announcements: Announcements = {
    onDragStart({ active }) {
      if (!hasDraggableData(active)) return "";
      if (active.data.current?.['type'] === "Task") {
        pickedUpTaskColumn.current = active.data.current.task.status;
        const { tasksInColumn, taskPosition, column } = getDraggingTaskData(
          active.id,
          pickedUpTaskColumn.current!
        );
        return `Picked up Task ${
          active.data.current.task.title
        } at position: ${taskPosition + 1} of ${
          tasksInColumn.length
        } in column ${column?.title}`;
      }
      return "";
    },
    onDragOver({ active, over }) {
      if (!hasDraggableData(active) || !hasDraggableData(over)) return "";
      if (
        active.data.current?.['type'] === "Task" &&
        over.data.current?.['type'] === "Task"
      ) {
        const { tasksInColumn, taskPosition, column } = getDraggingTaskData(
          over.id,
          over.data.current.task.status
        );
        if (over.data.current.task.status !== pickedUpTaskColumn.current) {
          return `Task ${
            active.data.current.task.title
          } was moved over column ${column?.title} in position ${
            taskPosition + 1
          } of ${tasksInColumn.length}`;
        }
        return `Task was moved over position ${taskPosition + 1} of ${
          tasksInColumn.length
        } in column ${column?.title}`;
      }
      return "";
    },
    onDragEnd({ active, over }) {
      if (!hasDraggableData(active) || !hasDraggableData(over)) {
        pickedUpTaskColumn.current = null;
        return "";
      }
      if (
        active.data.current?.['type'] === "Task" &&
        over.data.current?.['type'] === "Task"
      ) {
        const { tasksInColumn, taskPosition, column } = getDraggingTaskData(
          over.id,
          over.data.current.task.status
        );
        if (over.data.current.task.status !== pickedUpTaskColumn.current) {
          return `Task was dropped into column ${column?.title} in position ${
            taskPosition + 1
          } of ${tasksInColumn.length}`;
        }
        return `Task was dropped into position ${taskPosition + 1} of ${
          tasksInColumn.length
        } in column ${column?.title}`;
      }
      pickedUpTaskColumn.current = null;
      return "";
    },
    onDragCancel({ active }) {
      pickedUpTaskColumn.current = null;
      if (!hasDraggableData(active)) return "";
      return `Dragging ${active.data.current?.['type']} cancelled.`;
    },
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = columns
      .flatMap(col => col.tasks)
      .find(task => task.id === active.id);
    
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id;
    const newColumnId = over.id as TaskStatus;

    // Find the task being moved
    const task = columns
      .flatMap(col => col.tasks)
      .find(task => task.id.toString() === taskId.toString());

    if (!task) return;

    // Only update if the status actually changed
    if (task.status !== newColumnId) {
      updateTaskStatus(task.id, newColumnId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    );
  }

  // Filter to show only the main three columns for now
  const mainColumns = columns.filter(col => 
    ['pending', 'in-progress', 'done'].includes(col.id)
  );

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: 'hsl(var(--kanban-bg))' }}>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">TaskMaster Kanban</h1>
          <p className="text-gray-400 mt-2">
            Manage your tasks with drag-and-drop functionality
          </p>
        </div>

        <DndContext
          accessibility={{
            announcements,
          }}
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-4">
            {mainColumns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                isTaskUpdating={isTaskUpdating}
                isTaskRecentlyDropped={isTaskRecentlyDropped}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="transform rotate-6 scale-110 animate-drag-lift transition-all duration-300 ease-out">
                <TaskCard
                  task={activeTask}
                  isOverlay
                  isUpdating={isTaskUpdating(activeTask.id)}
                />
              </div>
            ) : null}
          </DragOverlay>

          {/* Enhanced portal-based drag overlay for better rendering */}
          {typeof window !== 'undefined' && activeTask && createPortal(
            <div className="fixed inset-0 pointer-events-none z-50">
              <div className="absolute top-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  Dragging: {activeTask.title}
                </div>
              </div>
            </div>,
            document.body
          )}
        </DndContext>
      </div>
    </div>
  );
};
