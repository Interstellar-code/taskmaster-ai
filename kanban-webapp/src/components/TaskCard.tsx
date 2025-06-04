import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { GripVertical, Loader2 } from 'lucide-react';
import { cva } from 'class-variance-authority';
import type { BadgeProps } from './ui/badge';
import type { Task, TaskPriority } from '../types/task';

interface TaskCardProps {
  task: Task;
  isOverlay?: boolean;
  dragAttributes?: DraggableAttributes;
  dragListeners?: SyntheticListenerMap | undefined;
  isDragging?: boolean;
  isUpdating?: boolean;
  isRecentlyDropped?: boolean;
}

export type TaskType = "Task";

export interface TaskDragData {
  type: TaskType;
  task: Task;
}

const priorityConfig: Record<TaskPriority, { variant: BadgeProps['variant']; label: string; className: string }> = {
  low: {
    variant: 'secondary',
    label: 'Low',
    className: 'bg-green-100 text-green-800 border-green-200'
  },
  medium: {
    variant: 'secondary',
    label: 'Medium',
    className: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  high: {
    variant: 'secondary',
    label: 'High',
    className: 'bg-orange-100 text-orange-800 border-orange-200'
  },
  critical: {
    variant: 'destructive',
    label: 'Critical',
    className: 'bg-red-100 text-red-800 border-red-200'
  }
};

// Helper function to safely format PRD source
const formatPrdSource = (prdSource: unknown): string => {
  if (!prdSource) return '';

  const sourceStr = typeof prdSource === 'string' ? prdSource : String(prdSource);
  return sourceStr.replace(/\.md$/, '');
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isOverlay = false,
  dragAttributes,
  dragListeners,
  isDragging: isDraggingProp,
  isUpdating = false,
  isRecentlyDropped = false
}) => {
  // Use passed props if available, otherwise use useSortable for standalone usage
  const sortableData = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    } satisfies TaskDragData,
    attributes: {
      roleDescription: "Task",
    },
  });

  const attributes = dragAttributes || sortableData.attributes;
  const listeners = dragListeners || sortableData.listeners;
  const isDragging = isDraggingProp !== undefined ? isDraggingProp : sortableData.isDragging;
  const transform = sortableData.transform;
  const transition = sortableData.transition;

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const variants = cva("", {
    variants: {
      dragging: {
        over: "ring-2 ring-blue-400 opacity-30 scale-105 transform-gpu animate-drag-lift",
        overlay: "ring-2 ring-primary shadow-2xl scale-110 rotate-3 transform-gpu backdrop-blur-sm animate-drag-lift",
      },
    },
  });

  const priorityInfo = priorityConfig[task.priority];

  // Truncate description to 100 characters
  const truncatedDescription = task.description.length > 100
    ? `${task.description.substring(0, 100)}...`
    : task.description;

  return (
    <Card
      ref={sortableData.setNodeRef}
      style={{
        ...style,
        backgroundColor: 'hsl(var(--kanban-card-bg))',
        borderColor: 'hsl(var(--kanban-border))'
      }}
      className={`
        cursor-grab active:cursor-grabbing transition-all duration-500 ease-out transform-gpu
        hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-2 hover:scale-[1.03]
        border backdrop-blur-sm animate-stagger-fade-in
        ${variants({
          dragging: isOverlay ? "overlay" : isDragging ? "over" : undefined,
        })}
        ${isDragging ? "z-50 shadow-xl animate-drag-lift" : ""}
        ${isUpdating ? "opacity-75 pointer-events-none animate-enhanced-pulse" : ""}
        ${isOverlay ? "shadow-2xl border-blue-400 animate-drag-lift" : ""}
        ${isRecentlyDropped ? "animate-drop-settle" : ""}
        ${!isDragging && !isOverlay ? "hover:animate-none" : ""}
      `}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              variant="ghost"
              {...attributes}
              {...listeners}
              className="p-1 text-gray-400 -ml-2 h-auto cursor-grab hover:text-gray-300 transition-colors"
              aria-label="Move task"
            >
              <GripVertical className="h-3 w-3" />
            </Button>
            <CardTitle className="text-sm font-medium leading-tight flex-1 truncate text-white">
              {task.title}
            </CardTitle>
            {isUpdating && (
              <Loader2 className="h-3 w-3 animate-spin text-blue-400 shrink-0" />
            )}
          </div>
          <Badge
            variant={priorityInfo.variant}
            className={`shrink-0 text-xs font-medium ${priorityInfo.className}`}
          >
            {priorityInfo.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-xs text-gray-300 mb-3 leading-relaxed">
          {truncatedDescription}
        </p>

        {/* Task ID and Dependencies Row */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span className="font-mono">#{task.id}</span>

          {task.dependencies.length > 0 && (
            <div className="flex items-center gap-1">
              <span>Deps:</span>
              <Badge variant="outline" className="text-xs px-1 py-0 border-gray-600 text-gray-300">
                {task.dependencies.length}
              </Badge>
            </div>
          )}
        </div>

        {/* Dependencies Details */}
        {task.dependencies.length > 0 && (
          <div className="mb-2">
            <div className="flex flex-wrap gap-1">
              {task.dependencies.slice(0, 3).map((dep) => (
                <Badge
                  key={dep}
                  variant="outline"
                  className="text-xs px-1 py-0 bg-gray-700 hover:bg-gray-600 transition-colors border-gray-600 text-gray-300"
                >
                  #{dep}
                </Badge>
              ))}
              {task.dependencies.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-xs px-1 py-0 bg-gray-700 hover:bg-gray-600 transition-colors border-gray-600 text-gray-300"
                >
                  +{task.dependencies.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Subtasks Progress */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Subtasks:</span>
              <Badge variant="secondary" className="text-xs px-1 py-0 bg-blue-900 text-blue-300 border-blue-700">
                {task.subtasks.filter(st => st.status === 'done').length}/{task.subtasks.length}
              </Badge>
            </div>
            {/* Enhanced progress bar for subtasks */}
            <div className="mt-1 w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${(task.subtasks.filter(st => st.status === 'done').length / task.subtasks.length) * 100}%`
                }}
              />
            </div>
          </div>
        )}

        {/* PRD Source */}
        {task.prdSource && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>PRD:</span>
              <Badge variant="secondary" className="text-xs px-1 py-0 truncate max-w-[120px] bg-gray-700 text-gray-300 border-gray-600">
                {formatPrdSource(task.prdSource)}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
