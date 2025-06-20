import React, { useState } from 'react';

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
  Pause,
  Edit,
  Trash2,
  Copy,
  BarChart3,
  Split,
  Loader2
} from "lucide-react";
import { EnhancedKanbanTask, ColumnId, TaskMasterTask } from "../api/types";

// Interface for copy task data (matching TaskCreateFormData format)
interface CopyTaskData {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status?: string;
  dependencies: number[];
  tags?: string[];
  details?: string;
  test_strategy?: string;
  subtasks?: Array<{
    id: number;
    title: string;
    description?: string;
    details?: string;
    status: 'pending' | 'in-progress' | 'done' | 'review' | 'blocked' | 'deferred' | 'cancelled';
    dependencies: number[];
    parent_task_id?: number;
    test_strategy?: string;
    prd_source?: {
      filePath: string;
      fileName: string;
      parsedDate: string;
      fileHash: string;
      fileSize: number;
    } | null;
  }>;
  prd_source?: string; // TaskCreateModal expects string, not object
}
import { taskService } from "../api/taskService";
import { TaskEditModal, TaskDeleteDialog, TaskCreateModal } from "./forms";
import { useFormToast } from "./forms/FormToast";

export interface EnhancedTaskCardProps {
  task: EnhancedKanbanTask;
  isOverlay?: boolean;
  onTaskClick?: (taskId: string) => void;
  onTaskUpdated?: (task: TaskMasterTask) => void;
  onTaskDeleted?: (taskId: string) => void;
  onTaskCreated?: () => void;
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

// Status badge variants - matching column header colors
const statusVariants = cva("text-xs font-medium", {
  variants: {
    status: {
      pending: "bg-red-500 text-white",
      'in-progress': "bg-blue-500 text-white",
      review: "bg-orange-500 text-white",
      blocked: "bg-red-600 text-white",
      done: "bg-green-500 text-white",
      cancelled: "bg-gray-500 text-white",
      deferred: "bg-purple-500 text-white"
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

export function EnhancedTaskCard({ task, isOverlay, onTaskClick, onTaskUpdated, onTaskDeleted, onTaskCreated }: EnhancedTaskCardProps) {

  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyTaskData, setCopyTaskData] = useState<CopyTaskData | null>(null);
  const [isExpanding, setIsExpanding] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { showSuccess, showError } = useFormToast();

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

  const handleCopyTask = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Fetch full task details including subtasks
      const fullTask = await taskService.getTaskById(task.id);

      // Transform subtasks from legacy format to standardized TaskMaster format
      const transformedSubtasks = fullTask.subtasks?.map(subtask => {
        // Handle both legacy format (with completed boolean) and new format (with status)
        let status: 'pending' | 'in-progress' | 'done' | 'review' | 'blocked' | 'deferred' | 'cancelled' = 'pending';

        // Type guard for legacy format
        const isLegacySubtask = (st: unknown): st is { completed: boolean } => {
          return typeof st === 'object' && st !== null && 'completed' in st;
        };

        if (isLegacySubtask(subtask)) {
          // Legacy format: convert completed boolean to status
          status = subtask.completed ? 'done' : 'pending';
        } else if ('status' in subtask) {
          // New format: use existing status or default to pending
          const validStatuses = ['pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled'] as const;
          const isValidStatus = (s: string): s is typeof validStatuses[number] =>
            validStatuses.includes(s as typeof validStatuses[number]);
          status = isValidStatus(subtask.status) ? subtask.status : 'pending';
        }

        return {
          id: parseInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
          title: subtask.title,
          description: subtask.description || '',
          details: subtask.details || '',
          status: status,
          dependencies: [], // Clear dependencies for copied subtasks as per user preference
          parent_task_id: undefined, // Will be set when the parent task is created
          test_strategy: ('test_strategy' in subtask && typeof subtask.test_strategy === 'string') ? subtask.test_strategy : '',
          prd_source: subtask.prd_source || null,
        };
      }) || [];

      // Prepare copy data with "Copy of" prefix, remove ID and clear dependencies
      const copyData: CopyTaskData = {
        title: `Copy of ${fullTask.title}`,
        description: fullTask.description,
        priority: (fullTask.priority as 'high' | 'medium' | 'low') || 'medium',
        status: fullTask.status,
        dependencies: [], // Clear dependencies for copied task
        details: fullTask.details,
        test_strategy: fullTask.test_strategy,
        subtasks: transformedSubtasks,
        prd_source: fullTask.prd_source?.fileName,
      };

      setCopyTaskData(copyData);
      setShowCopyModal(true);
    } catch (error) {
      console.error('Failed to fetch task for copying:', error);
    }
  };

  const handleAnalyzeComplexity = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnalyzing(true);
    try {
      console.log(`Analyzing complexity for task ${task.id}...`);
      const result = await taskService.analyzeTaskComplexity(task.id);
      console.log('Complexity analysis result:', result);

      // Refresh the task data to show updated complexity
      if (onTaskUpdated) {
        // Fetch updated task data
        const updatedTask = await taskService.getTaskById(task.id);
        onTaskUpdated(updatedTask);
      }

      showSuccess(
        'Complexity Analysis Complete',
        `Task ${task.id} complexity analysis completed successfully. Complexity score updated.`
      );
    } catch (error) {
      console.error('Failed to analyze task complexity:', error);
      const errorMessage = error instanceof Error && error.message.includes('timed out')
        ? 'Complexity analysis timed out. This is a complex task that may require manual analysis.'
        : 'Failed to analyze task complexity. Please try again.';

      showError('Analysis Failed', errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExpandTask = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanding(true);
    try {
      console.log(`Expanding task ${task.id} into subtasks...`);

      // Check if we have complexity analysis data to improve expansion
      const expandData: { prompt?: string; num?: number } = {};

      // Try to find and use complexity analysis report for better expansion
      try {
        // Check if there's a recent complexity analysis report
        const complexityReport = await fetch(`http://localhost:3003/api/v1/tasks/${task.id}/complexity-report`);
        if (complexityReport.ok) {
          const reportData = await complexityReport.json();
          if (reportData.data && reportData.data.expansionPrompt) {
            expandData.prompt = reportData.data.expansionPrompt;
            expandData.num = reportData.data.recommendedSubtasks || 8;
            console.log('Using complexity analysis data for expansion:', reportData.data);
          }
        }
      } catch (reportError) {
        console.log('No complexity report found, using basic expansion');
      }

      // Fallback: If task has complexity score, use it to determine number of subtasks
      if (!expandData.prompt && task.complexity_score && task.complexity_score > 5) {
        const recommendedSubtasks = Math.min(Math.max(Math.floor(task.complexity_score * 1.5), 6), 15);
        expandData.num = recommendedSubtasks;

        // Add context about complexity
        expandData.prompt = `This is a complex task (complexity score: ${task.complexity_score}/10). Break it down into ${recommendedSubtasks} detailed, actionable subtasks that address the full scope of work required.`;
      }

      const result = await taskService.expandTask(task.id, expandData);
      console.log('Task expansion result:', result);

      // Refresh the task data
      if (onTaskUpdated) {
        onTaskUpdated(result);
      }

      const subtaskCount = result.subtasks?.length || 0;
      showSuccess(
        'Task Expanded Successfully',
        `Task ${task.id} has been expanded into ${subtaskCount} subtasks successfully!`
      );
    } catch (error) {
      console.error('Failed to expand task:', error);
      const errorMessage = error instanceof Error && error.message.includes('timed out')
        ? 'Task expansion timed out. This is a complex task that may take longer to process. Please try again or consider breaking it down manually.'
        : 'Failed to expand task. Please try again.';

      showError('Expansion Failed', errorMessage);
    } finally {
      setIsExpanding(false);
    }
  };

  return (
    <TooltipProvider>
      <Card
        ref={setNodeRef}
        style={style}
        className={`${priorityVariants({ priority: task.priority })} ${variants({
          dragging: isOverlay ? "overlay" : isDragging ? "over" : undefined,
        })} hover:shadow-md cursor-pointer group`}
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

              {/* Complexity Score */}
              {task.complexity_score && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      <BarChart3 size={10} />
                      <span>{task.complexity_score}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Complexity Score: {task.complexity_score}/10</p>
                    <p>Level: {task.complexity_level || (task.complexity_score >= 8 ? 'high' : task.complexity_score >= 5 ? 'medium' : 'low')}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="flex items-center gap-2">
              {task.prd_source && (
                <Tooltip>
                  <TooltipTrigger>
                    <FileText size={14} className="text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>From: {task.prd_source.fileName}</p>
                    <p>Parsed: {task.prd_source.parsedDate.toLocaleDateString()}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              <Badge
                className={statusVariants({
                  status: task.status as 'pending' | 'in-progress' | 'review' | 'blocked' | 'done' | 'cancelled' | 'deferred'
                })}
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
            {task.prd_source ? `PRD1:Task:${task.id}` : `Task:${task.id}`}
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
            {task.updated_at && (
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock size={12} />
                    <span>{taskService.formatRelativeTime(task.updated_at)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Last updated: {task.updated_at.toLocaleString()}</p>
                  {task.ageInDays !== undefined && (
                    <p>Age: {task.ageInDays} days</p>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Action buttons at bottom */}
          <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-border/50">
            <TaskEditModal
              task={task}
              onTaskUpdated={onTaskUpdated}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Edit size={14} />
                </Button>
              }
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-purple-600 hover:bg-purple-100 hover:text-purple-700"
                  onClick={handleAnalyzeComplexity}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isAnalyzing ? 'Analyzing complexity...' : 'Analyze task complexity'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-green-600 hover:bg-green-100 hover:text-green-700"
                  onClick={handleExpandTask}
                  disabled={isExpanding}
                >
                  {isExpanding ? <Loader2 size={14} className="animate-spin" /> : <Split size={14} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isExpanding ? 'Expanding task...' : 'Expand into subtasks'}</p>
              </TooltipContent>
            </Tooltip>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-100 hover:text-blue-700"
              onClick={handleCopyTask}
            >
              <Copy size={14} />
            </Button>

            <TaskDeleteDialog
              task={task}
              onTaskDeleted={onTaskDeleted}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 size={14} />
                </Button>
              }
            />
          </div>
        </CardContent>

        {/* Copy Modal */}
        {showCopyModal && copyTaskData && (
          <TaskCreateModal
            open={showCopyModal}
            onOpenChange={setShowCopyModal}
            onTaskCreated={() => {
              // TaskCreateModal expects () => void, but we need to call onTaskCreated with task
              // Since we don't have the created task data here, we'll call it without parameters
              // and let the parent component refresh the task list
              onTaskCreated?.();
            }}
            initialData={copyTaskData}
          />
        )}
      </Card>
    </TooltipProvider>
  );
}
