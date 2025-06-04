import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { taskService } from '@/api/taskService';
import { useFormToast } from './index';
import { EnhancedKanbanTask } from '@/api/types';

interface TaskDeleteDialogProps {
  task: EnhancedKanbanTask;
  onTaskDeleted?: (taskId: string) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Task Delete Confirmation Dialog
 *
 * Features:
 * - Confirmation dialog with task details
 * - Integration with TaskMaster DELETE API
 * - Success/error notifications
 * - Loading state during deletion
 */
export function TaskDeleteDialog({ 
  task, 
  onTaskDeleted, 
  trigger, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange 
}: TaskDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { showSuccess, showError } = useFormToast();

  // Use controlled or internal state
  const isControlled = controlledOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await taskService.deleteTask(task.id);
      
      showSuccess("Task Deleted", "Task deleted successfully!");

      onTaskDeleted?.(task.id);
      setIsOpen(false);
      
    } catch (error) {
      console.error('Failed to delete task:', error);
      showError("Delete Failed", "Failed to delete task. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
      <Trash2 className="h-4 w-4" />
      Delete
    </Button>
  );

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        {trigger || defaultTrigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Task</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>Are you sure you want to delete this task? This action cannot be undone.</p>
            <div className="bg-muted p-3 rounded-md mt-3">
              <p className="font-medium text-sm">Task Details:</p>
              <p className="text-sm"><strong>ID:</strong> {task.id}</p>
              <p className="text-sm"><strong>Title:</strong> {task.title}</p>
              {task.description && (
                <p className="text-sm"><strong>Description:</strong> {task.description}</p>
              )}
              <p className="text-sm"><strong>Status:</strong> {task.status}</p>
              <p className="text-sm"><strong>Priority:</strong> {task.priority}</p>
              {task.dependencies.length > 0 && (
                <p className="text-sm"><strong>Dependencies:</strong> {task.dependencies.length} task(s)</p>
              )}
              {task.subtaskProgress && (
                <p className="text-sm"><strong>Subtasks:</strong> {task.subtaskProgress.total} subtask(s)</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isDeleting ? 'Deleting...' : 'Delete Task'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
