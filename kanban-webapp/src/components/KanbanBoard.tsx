import React from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { useKanban } from '../hooks/useKanban';
import type { Task, TaskStatus } from '../types/task';

export const KanbanBoard: React.FC = () => {
  const { columns, loading, error, updateTaskStatus } = useKanban();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

    const taskId = active.id as string;
    const newColumnId = over.id as TaskStatus;

    // Find the task being moved
    const task = columns
      .flatMap(col => col.tasks)
      .find(task => task.id === taskId);

    if (!task) return;

    // Only update if the status actually changed
    if (task.status !== newColumnId) {
      updateTaskStatus(taskId, newColumnId);
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
    <div className="h-full p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">TaskMaster Kanban</h1>
        <p className="text-gray-600 mt-2">
          Manage your tasks with drag-and-drop functionality
        </p>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {mainColumns.map((column) => (
            <KanbanColumn key={column.id} column={column} />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
