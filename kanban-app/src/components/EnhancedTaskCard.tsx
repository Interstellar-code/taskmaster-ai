import React, { useState } from 'react';
import type { UniqueIdentifier } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cva } from "class-variance-authority";
import {
  GripVertical,
  Clock,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Circle,
  GitBranch,
  TestTube,
  AlertCircle,
  Pause
} from "lucide-react";
import { EnhancedKanbanTask, ColumnId } from "../api/types";
import { taskService } from "../api/taskService";

export interface EnhancedTaskCardProps {
  task: EnhancedKanbanTask;
  isOverlay?: boolean;
  onTaskClick?: (taskId: string) => void;
}

export type TaskType = "Task";

export interface TaskDragData {
  type: TaskType;
  task: {
    id: string;
    columnId: ColumnId;
    content: string;
    enhancedData: EnhancedKanbanTask;
  };
}

// Priority color variants
const priorityVariants = cva("border-l-4 transition-all duration-200", {
  variants: {
    priority: {
      high: "border-l-red-500 bg-red-50 dark:bg-red-950/20",
      medium: "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
      low: "border-l-green-500 bg-green-50 dark:bg-green-950/20"
    }
  }
});

// Status badge variants
const statusVariants = cva("text-xs font-medium", {
  variants: {
    status: {
      pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      'in-progress': "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      review: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      blocked: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
      deferred: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
    }
  }
});

// Status icons mapping
const statusIcons = {
  pending: Circle,
  'in-progress': AlertTriangle,
  review: Clock,
  blocked: AlertCircle,
  done: CheckCircle,
  cancelled: Circle,
  deferred: Pause
};

// Priority icons mapping
const priorityIcons = {
  high: "🔴",
  medium: "🟡",
  low: "🟢"
};

export function EnhancedTaskCard({ task, isOverlay, onTaskClick }: EnhancedTaskCardProps) {
  const [showDetails, setShowDetails] = useState(false);

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
      task: {
        id: task.id,
        columnId: task.columnId,
        content: task.content,
        enhancedData: task,
      },
    } satisfies TaskDragData,
    attributes: {
      roleDescription: "Task",
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const variants = cva("", {
    variants: {
      dragging: {
        over: "ring-2 opacity-30",
        overlay: "ring-2 ring-primary",
      },
    },
  });

  const StatusIcon = statusIcons[task.status as keyof typeof statusIcons] || Circle;

  const handleCardClick = () => {
    if (onTaskClick) {
      onTaskClick(task.id);
    }
  };

  return (
    <TooltipProvider>
      <Card
        ref={setNodeRef}
        style={style}
        className={`${priorityVariants({ priority: task.priority })} ${variants({
          dragging: isOverlay ? "overlay" : isDragging ? "over" : undefined,
        })} hover:shadow-md cursor-pointer`}
        onClick={handleCardClick}
      >
        <CardHeader className="pb-2 px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                {...attributes}
                {...listeners}
                className="p-1 text-secondary-foreground/50 -ml-2 h-auto cursor-grab"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="sr-only">Move task</span>
                <GripVertical size={16} />
              </Button>
              
              <span className="text-sm" title={`Priority: ${task.priority}`}>
                {priorityIcons[task.priority]}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {task.prdSource && (
                <Tooltip>
                  <TooltipTrigger>
                    <FileText size={14} className="text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>From: {task.prdSource.fileName}</p>
                    <p>Parsed: {task.prdSource.parsedDate.toLocaleDateString()}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              <Badge 
                className={statusVariants({ status: task.status as keyof typeof statusVariants.variants.status })}
              >
                <StatusIcon size={12} className="mr-1" />
                {task.status}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 px-3 pb-3">
          {/* Task ID and PRD ID */}
          <div className="text-xs text-muted-foreground mb-1 font-mono">
            {task.prdSource ? `PRD1:Task:${task.id}` : `Task:${task.id}`}
          </div>

          <h3 className="font-medium text-sm mb-2 line-clamp-2" title={task.title}>
            {task.title}
          </h3>

          {task.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2" title={task.description}>
              {task.description}
            </p>
          )}

          {/* Metadata row */}
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-3">
              {/* Subtask progress */}
              {task.subtaskProgress && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1">
                      <Users size={12} />
                      <span>{task.subtaskProgress.completed}/{task.subtaskProgress.total}</span>
                      <Progress
                        value={task.subtaskProgress.percentage}
                        className="w-8 h-1"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Subtasks: {task.subtaskProgress.completed} of {task.subtaskProgress.total} completed</p>
                    <p>{task.subtaskProgress.percentage.toFixed(0)}% progress</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Dependencies */}
              {task.dependencies.length > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1">
                      <GitBranch size={12} />
                      <span>{task.dependencies.length}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Dependencies: {task.dependencies.length}</p>
                    <p>Status: {task.dependencyStatus}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Test strategy indicator */}
              {task.hasTestStrategy && (
                <Tooltip>
                  <TooltipTrigger>
                    <TestTube size={12} className="text-green-600" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Has test strategy</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Last updated */}
            {task.updatedAt && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock size={12} />
                    <span>{taskService.formatRelativeTime(task.updatedAt)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Last updated: {task.updatedAt.toLocaleString()}</p>
                  {task.ageInDays !== undefined && (
                    <p>Age: {task.ageInDays} days</p>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
