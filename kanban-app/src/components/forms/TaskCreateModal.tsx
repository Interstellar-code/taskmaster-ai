import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FormDialog } from './FormDialog';
import { FormInput, FormTextarea, FormSelect } from './index';
import { taskService } from '@/api/taskService';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';

// MVP Schema - only essential fields for task creation
const TaskCreateSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title must be less than 200 characters'),
  
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters long')
    .max(5000, 'Description must be less than 5000 characters'),
  
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

type TaskCreateFormData = z.infer<typeof TaskCreateSchema>;

interface TaskCreateModalProps {
  /** Callback when task is successfully created */
  onTaskCreated?: () => void;
  /** Custom trigger element */
  trigger?: React.ReactNode;
}

/**
 * MVP Task Creation Modal
 * 
 * Features:
 * - Essential fields only (title, description, priority)
 * - Client-side validation with Zod
 * - Integration with TaskMaster API
 * - Success/error notifications
 * - Responsive design
 */
export function TaskCreateModal({ onTaskCreated, trigger }: TaskCreateModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<TaskCreateFormData>({
    resolver: zodResolver(TaskCreateSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
    },
  });

  const priorityOptions = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' },
  ];

  const handleSubmit = async (data: TaskCreateFormData) => {
    try {
      setIsSubmitting(true);

      // Create task using direct title/description parameters (MVP format)
      const taskData = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: 'pending', // Default status for new tasks
      };

      await taskService.createTask(taskData);

      // Success notification
      toast({
        title: 'Task Created',
        description: `"${data.title}" has been created successfully.`,
        variant: 'default',
      });

      // Reset form and close modal
      form.reset();
      setOpen(false);

      // Notify parent component
      onTaskCreated?.();

    } catch (error) {
      console.error('Failed to create task:', error);
      
      // Error notification
      toast({
        title: 'Error Creating Task',
        description: error instanceof Error ? error.message : 'Failed to create task. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setOpen(false);
  };

  // Default trigger button if none provided
  const defaultTrigger = (
    <Button className="gap-2">
      <Plus className="h-4 w-4" />
      Create Task
    </Button>
  );

  return (
    <FormDialog
      trigger={trigger || defaultTrigger}
      title="Create New Task"
      description="Add a new task to your project with essential information."
      open={open}
      onOpenChange={setOpen}
      maxWidth="lg"
      footer={
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="task-create-form"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form
          id="task-create-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-6"
        >
          <FormInput
            name="title"
            label="Task Title"
            placeholder="Enter a descriptive title for your task"
            description="A clear, concise title that describes what needs to be done"
            required
          />

          <FormTextarea
            name="description"
            label="Description"
            placeholder="Provide detailed information about the task requirements, goals, and any relevant context..."
            description="Detailed description of the task including requirements and acceptance criteria"
            rows={4}
            required
          />

          <FormSelect
            name="priority"
            label="Priority"
            placeholder="Select task priority"
            description="Choose the priority level for this task"
            options={priorityOptions}
          />
        </form>
      </Form>
    </FormDialog>
  );
}

TaskCreateModal.displayName = 'TaskCreateModal';
