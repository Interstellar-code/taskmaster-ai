import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { GripVertical } from 'lucide-react';
import { cva } from 'class-variance-authority';
import type { BadgeProps } from './ui/badge';
import type { Task, TaskPriority } from '../types/task';

interface TaskCardProps {
  task: Task;
  isOverlay?: boolean;
  dragAttributes?: DraggableAttributes;
  dragListeners?: SyntheticListenerMap | undefined;
  isDragging?: boolean;
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
  isDragging: isDraggingProp
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
        over: "ring-2 ring-blue-400 opacity-30 scale-105",
        overlay: "ring-2 ring-primary shadow-2xl scale-105 rotate-2",
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
      style={style}
      className={`
        cursor-grab active:cursor-grabbing transition-all duration-200
        hover:shadow-lg hover:shadow-blue-100 hover:-translate-y-1
        border border-gray-200 bg-white
        ${variants({
          dragging: isOverlay ? "overlay" : isDragging ? "over" : undefined,
        })}
        ${isDragging ? "z-50" : ""}
      `}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Button
              variant="ghost"
              {...attributes}
              {...listeners}
              className="p-1 text-secondary-foreground/50 -ml-2 h-auto cursor-grab hover:text-secondary-foreground transition-colors"
              aria-label="Move task"
            >
              <GripVertical className="h-3 w-3" />
            </Button>
            <CardTitle className="text-sm font-medium leading-tight flex-1 truncate">
              {task.title}
            </CardTitle>
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
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          {truncatedDescription}
        </p>

        {/* Task ID and Dependencies Row */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span className="font-mono">#{task.id}</span>

          {task.dependencies.length > 0 && (
            <div className="flex items-center gap-1">
              <span>Deps:</span>
              <Badge variant="outline" className="text-xs px-1 py-0">
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
                  className="text-xs px-1 py-0 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  #{dep}
                </Badge>
              ))}
              {task.dependencies.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-xs px-1 py-0 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  +{task.dependencies.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Subtasks Progress */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Subtasks:</span>
              <Badge variant="secondary" className="text-xs px-1 py-0 bg-blue-50 text-blue-700">
                {task.subtasks.filter(st => st.status === 'done').length}/{task.subtasks.length}
              </Badge>
            </div>
            {/* Enhanced progress bar for subtasks */}
            <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
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
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>PRD:</span>
              <Badge variant="secondary" className="text-xs px-1 py-0 truncate max-w-[120px]">
                {formatPrdSource(task.prdSource)}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
