import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cva } from 'class-variance-authority';
import { TaskCard } from './TaskCard';
import { Badge } from './ui/badge';

import { ScrollArea } from './ui/scroll-area';
import type { KanbanColumn as KanbanColumnType, Task } from '../types/task';

// SortableTaskCard wrapper component
const SortableTaskCard: React.FC<{
  task: Task;
  isTaskUpdating?: (taskId: number | string) => boolean;
  isTaskRecentlyDropped?: (taskId: number | string) => boolean;
}> = ({ task, isTaskUpdating, isTaskRecentlyDropped }) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        isOverlay={false}
        // Pass drag attributes and listeners to TaskCard
        dragAttributes={attributes}
        dragListeners={listeners}
        isDragging={isDragging}
        isUpdating={isTaskUpdating?.(task.id) || false}
        isRecentlyDropped={isTaskRecentlyDropped?.(task.id) || false}
      />
    </div>
  );
};

interface KanbanColumnProps {
  column: KanbanColumnType;
  isTaskUpdating?: (taskId: number | string) => boolean;
  isTaskRecentlyDropped?: (taskId: number | string) => boolean;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ column, isTaskUpdating, isTaskRecentlyDropped }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      columnId: column.id,
    },
  });

  const variants = cva(
    "h-[600px] max-h-[600px] w-[380px] max-w-full flex flex-col flex-shrink-0 snap-center rounded-lg border transition-all duration-500 ease-out transform-gpu",
    {
      variants: {
        dragging: {
          default: "border-transparent",
          over: "ring-4 ring-blue-500 ring-opacity-60 border-blue-400 border-opacity-50 bg-blue-500 bg-opacity-10 scale-[1.02] shadow-lg shadow-blue-500/20 animate-column-glow",
          overlay: "ring-2 ring-primary",
        },
      },
    }
  );

  // Column title mapping for cleaner display
  const columnTitleMap = {
    'pending': 'Todo',
    'in-progress': 'In progress',
    'done': 'Done'
  };

  const displayTitle = columnTitleMap[column.id as keyof typeof columnTitleMap] || column.title;

  return (
    <div
      className={variants({ dragging: isOver ? "over" : "default" })}
      style={{ backgroundColor: 'hsl(var(--kanban-column-bg))' }}
    >
      <div
        className={`px-6 py-4 border-b transition-all duration-300 ${
          isOver ? 'bg-blue-500/10 border-blue-400/50' : ''
        }`}
        style={{ borderColor: isOver ? 'hsl(210 100% 60%)' : 'hsl(var(--kanban-border))' }}
      >
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold text-lg transition-colors duration-300 ${
            isOver ? 'text-blue-300' : 'text-white'
          }`}>
            {displayTitle}
            {isOver && (
              <span className="ml-2 text-blue-400 animate-bounce">
                ⬇
              </span>
            )}
          </h3>
          <Badge
            variant="secondary"
            className={`ml-2 transition-all duration-300 ${
              isOver
                ? 'bg-blue-600 text-blue-100 border-blue-400 animate-enhanced-pulse'
                : 'bg-gray-700 text-gray-300 border-gray-600'
            }`}
          >
            {column.tasks.length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="h-full w-full">
        <div
          ref={setNodeRef}
          className="flex flex-col gap-3 p-4"
        >
          <SortableContext
            items={column.tasks.map(task => task.id)}
            strategy={verticalListSortingStrategy}
          >
            {column.tasks.length === 0 ? (
              <div className={`flex items-center justify-center h-32 text-gray-400 text-sm transition-all duration-300 ${
                isOver ? 'text-blue-400 scale-105' : ''
              }`}>
                {isOver ? 'Drop task here' : 'No tasks'}
              </div>
            ) : (
              column.tasks.map((task, index) => (
                <div
                  key={task.id}
                  style={{
                    animationDelay: `${index * 0.1}s`
                  }}
                  className="animate-stagger-fade-in"
                >
                  <SortableTaskCard
                    task={task}
                    {...(isTaskUpdating && { isTaskUpdating })}
                    {...(isTaskRecentlyDropped && { isTaskRecentlyDropped })}
                  />
                </div>
              ))
            )}

            {/* Enhanced drop indicator when dragging over column */}
            {isOver && (
              <div className="relative">
                {/* Animated drop zone indicator */}
                <div className="h-3 bg-gradient-to-r from-blue-500/30 via-blue-400/50 to-blue-500/30 rounded-full mx-2 animate-pulse border-2 border-blue-400 border-dashed relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>

                {/* Drop zone text indicator */}
                <div className="text-center mt-2 text-blue-400 text-xs font-medium animate-bounce">
                  {column.tasks.length === 0 ? 'Drop task here' : 'Drop to add task'}
                </div>
              </div>
            )}
          </SortableContext>
        </div>
      </ScrollArea>
    </div>
  );
};
