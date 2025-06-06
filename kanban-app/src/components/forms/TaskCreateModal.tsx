import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FormDialog } from './FormDialog';
import { FormInput, FormTextarea, FormSelect, FormSection, FormMultiCombobox, FormCombobox, FormDatePicker, useFormToast } from './index';
import { ChevronDown } from 'lucide-react';
import { taskService } from '@/api/taskService';
import { Plus, Loader2, X } from 'lucide-react';

// Export the schema and types for reuse in TaskEditModal
export { TaskCreateSchema, type TaskCreateFormData };

// Enhanced Schema - essential + optional fields for task creation
const TaskCreateSchema = z.object({
  // Essential fields
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title must be less than 200 characters'),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters long')
    .max(5000, 'Description must be less than 5000 characters'),

  priority: z.enum(['low', 'medium', 'high']).default('medium'),

  // Required fields with default empty arrays (following TaskEditSchema pattern)
  tags: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  subtasks: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string().min(3, 'Subtask title must be at least 3 characters'),
    description: z.string().optional(),
    details: z.string().optional(),
    status: z.enum(['pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled']).default('pending'),
    dependencies: z.array(z.union([z.string(), z.number()])).default([]),
    parentTaskId: z.union([z.string(), z.number()]).optional(),
    testStrategy: z.string().optional(),
    prdSource: z.any().optional(),
  })).default([]),

  // Optional enhanced fields
  estimatedHours: z.number()
    .min(0.5, 'Minimum 0.5 hours')
    .max(200, 'Maximum 200 hours')
    .optional(),
  assignee: z.string()
    .max(50, 'Assignee name must be less than 50 characters')
    .optional(),
  dueDate: z.date().optional(), // Date object from date picker
  details: z.string()
    .max(2000, 'Details must be less than 2000 characters')
    .optional(),
  testStrategy: z.string()
    .max(1000, 'Test strategy must be less than 1000 characters')
    .optional(),
  prdSource: z.string().optional(),
});

type TaskCreateFormData = z.infer<typeof TaskCreateSchema>;

interface TaskCreateModalProps {
  /** Callback when task is successfully created */
  onTaskCreated?: () => void;
  /** Custom trigger element */
  trigger?: React.ReactNode;
  /** Controlled open state */
  open?: boolean;
  /** Controlled open change handler */
  onOpenChange?: (open: boolean) => void;
  /** Initial data for pre-populating form (for copy functionality) */
  initialData?: Partial<TaskCreateFormData>;
}

/**
 * Enhanced Task Creation Modal
 *
 * Features:
 * - Essential fields (title, description, priority)
 * - Advanced optional fields (assignee, due date, estimated hours, etc.)
 * - Collapsible advanced section for clean UX
 * - Client-side validation with Zod
 * - Integration with TaskMaster API
 * - Success/error notifications
 * - Responsive design
 */
export function TaskCreateModal({
  onTaskCreated,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  initialData
}: TaskCreateModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<Array<{id: string, title: string}>>([]);
  const [availablePRDs, setAvailablePRDs] = useState<Array<{id: string, title: string}>>([]);
  const { showSuccess, showError, showWarning } = useFormToast();

  // Use controlled or internal open state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const form = useForm({
    resolver: zodResolver(TaskCreateSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      priority: initialData?.priority || 'medium',
      tags: initialData?.tags || [],
      estimatedHours: initialData?.estimatedHours || undefined,
      assignee: initialData?.assignee || '',
      dueDate: initialData?.dueDate ? new Date(initialData.dueDate) : undefined,
      details: initialData?.details || '',
      testStrategy: initialData?.testStrategy || '',
      dependencies: initialData?.dependencies || [],
      prdSource: initialData?.prdSource || '',
      subtasks: initialData?.subtasks || [],
    },
  });

  // Fetch available tasks and PRDs when modal opens
  useEffect(() => {
    if (open) {
      fetchAvailableData();
    }
  }, [open]);

  // Update form when initialData changes (for copy functionality)
  useEffect(() => {
    if (initialData) {
      // Convert subtasks to proper TaskMaster format
      const formSubtasks = initialData.subtasks ? initialData.subtasks.map((subtask) => ({
        id: subtask.id || `subtask_${Date.now()}_${Math.random()}`,
        title: subtask.title || '',
        description: subtask.description || '',
        details: subtask.details || '',
        status: subtask.status || 'pending',
        dependencies: subtask.dependencies || [],
        parentTaskId: subtask.parentTaskId,
        testStrategy: subtask.testStrategy || '',
        prdSource: subtask.prdSource || null,
      })) : [];

      form.reset({
        title: initialData.title || '',
        description: initialData.description || '',
        priority: initialData.priority || 'medium',
        tags: initialData.tags || [],
        estimatedHours: initialData.estimatedHours || undefined,
        assignee: initialData.assignee || '',
        dueDate: initialData?.dueDate ? (typeof initialData.dueDate === 'string' ? new Date(initialData.dueDate) : initialData.dueDate) : undefined,
        details: initialData.details || '',
        testStrategy: initialData.testStrategy || '',
        dependencies: initialData.dependencies || [],
        prdSource: initialData.prdSource || '',
        subtasks: formSubtasks,
      });
    }
  }, [initialData, form]);

  const fetchAvailableData = async () => {
    try {
      // Fetch existing tasks for dependencies
      const tasksResponse = await taskService.getAllTasks();

      // Ensure we have a valid array and filter out invalid tasks
      const validTasks = Array.isArray(tasksResponse) ? tasksResponse.filter(task =>
        task && task.id && task.title && task.title.trim()
      ) : [];

      const tasks = validTasks.map((task) => ({
        id: task.id.toString(),
        title: task.title.trim()
      }));
      setAvailableTasks(tasks);

      // Fetch real PRD data from API
      const prds = await fetchPRDs();
      setAvailablePRDs(prds);
    } catch (error) {
      console.error('Failed to fetch available data:', error);
      // Set empty arrays on error to prevent undefined issues
      setAvailableTasks([]);
      setAvailablePRDs([]);

      // Show user-friendly error message
      showWarning('Load Warning', 'Could not load available tasks and PRDs. You can still create a task without dependencies.');
    }
  };

  const fetchPRDs = async (): Promise<Array<{id: string, title: string}>> => {
    try {
      const response = await fetch('/api/v1/prds');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data.map((prd: any) => ({
            id: prd.id || prd.fileName,
            title: prd.title || prd.fileName || `PRD ${prd.id}`
          }));
        }
      }
      // Fallback to empty array if API call fails
      return [];
    } catch (error) {
      console.warn('Failed to fetch PRDs, using fallback:', error);
      return [];
    }
  };

  const priorityOptions = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' },
  ];

  const handleSubmit = async (data: TaskCreateFormData) => {
    try {
      setIsSubmitting(true);

      // Create task using enhanced format with all fields
      const taskData = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: 'pending', // Default status for new tasks
        // Enhanced fields (only include if they have values)
        ...(data.tags && data.tags.length > 0 && { tags: data.tags }),
        ...(data.estimatedHours && { estimatedHours: data.estimatedHours }),
        ...(data.assignee && data.assignee.trim() && { assignee: data.assignee.trim() }),
        ...(data.dueDate && { dueDate: data.dueDate.toISOString() }),
        ...(data.details && data.details.trim() && { details: data.details.trim() }),
        ...(data.testStrategy && data.testStrategy.trim() && { testStrategy: data.testStrategy.trim() }),
        // New comprehensive fields
        ...(data.dependencies && data.dependencies.length > 0 && { dependencies: data.dependencies }),
        ...(data.prdSource && data.prdSource.trim() && { prdSource: data.prdSource.trim() }),
        ...(data.subtasks && data.subtasks.length > 0 && { subtasks: data.subtasks }),
      };

      await taskService.createTask(taskData);

      // Success notification
      showSuccess('Task Created', `"${data.title}" has been created successfully.`);

      // Reset form and close modal
      form.reset();
      setOpen(false);

      // Notify parent component
      onTaskCreated?.();

    } catch (error) {
      console.error('Failed to create task:', error);
      
      // Error notification
      showError('Error Creating Task', error instanceof Error ? error.message : 'Failed to create task. Please try again.');
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
      description="Add a new task to your project. Fill in the essential details and expand for advanced options."
      open={open}
      onOpenChange={setOpen}
      maxWidth="6xl"
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
          className="space-y-8"
        >
          <div className="space-y-6">
            {/* Title and Priority/PRD Source in first row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <FormInput
                name="title"
                control={form.control}
                label="Task Title"
                placeholder="Enter a descriptive title for your task"
                required
              />

              <FormSelect
                name="priority"
                control={form.control}
                label="Priority"
                placeholder="Select task priority"
                options={priorityOptions}
              />

              <FormCombobox
                name="prdSource"
                control={form.control}
                label="PRD Source"
                placeholder="Select related PRD"
                searchPlaceholder="Search PRDs..."
                emptyText="No PRDs found"
                options={availablePRDs
                  .filter(prd => prd.id && prd.id.trim() && prd.title && prd.title.trim())
                  .map(prd => ({
                    value: prd.id.trim(),
                    label: prd.title.trim()
                  }))
                }
              />
            </div>

            {/* Description with reduced height */}
            <FormTextarea
              name="description"
              control={form.control}
              label="Description"
              placeholder="Provide detailed information about the task requirements, goals, and any relevant context..."
              rows={2}
              required
            />
          </div>

          {/* Advanced Fields Section */}
          <div className="border-t pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-between p-0 h-auto font-normal mb-6"
            >
              <span className="text-lg font-medium">Advanced Options</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </Button>

            {showAdvanced && (
              <div className="space-y-8">
                <div className="space-y-6">
                  {/* Dependencies (40%) and other fields (20%, 20%, 20%) in one row */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-2">
                      <FormMultiCombobox
                        name="dependencies"
                        control={form.control}
                        label="Dependencies"
                        placeholder="Select dependencies..."
                        searchPlaceholder="Search tasks..."
                        emptyMessage="No tasks found"
                        options={availableTasks
                          .filter(task => task.id && task.id.trim() && task.title && task.title.trim())
                          .map(task => ({
                            value: task.id.trim(),
                            label: `#${task.id.trim()} - ${task.title.trim()}`
                          }))
                        }
                        maxSelections={10}
                        showSelectedCount={true}
                      />
                    </div>

                    <div className="md:col-span-1">
                      <FormInput
                        name="assignee"
                        control={form.control}
                        label="Assignee"
                        placeholder="Enter assignee name"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <FormInput
                        name="estimatedHours"
                        control={form.control}
                        label="Estimated Hours"
                        type="number"
                        min={0.5}
                        max={200}
                        step={0.5}
                        placeholder="0"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <FormDatePicker
                        name="dueDate"
                        control={form.control}
                        label="Due Date"
                        placeholder="Select due date"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Details, Test Strategy, and Subtasks layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormTextarea
                      name="details"
                      control={form.control}
                      label="Additional Details"
                      placeholder="Any additional context, requirements, or notes..."
                      rows={3}
                    />

                    <FormTextarea
                      name="testStrategy"
                      control={form.control}
                      label="Test Strategy"
                      placeholder="How will this task be tested or validated..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <FormSection
                      title="Subtasks"
                    >
                      <SubtaskManager form={form} />
                    </FormSection>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}

TaskCreateModal.displayName = 'TaskCreateModal';

/**
 * SubtaskManager Component
 * Manages dynamic subtask creation with checkboxes
 */
interface SubtaskManagerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any;
}

function SubtaskManager({ form }: SubtaskManagerProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const subtasks = form.watch('subtasks') || [];

  const addSubtask = () => {
    if (newSubtaskTitle.trim()) {
      const newSubtask = {
        id: `subtask_${Date.now()}`,
        title: newSubtaskTitle.trim(),
        description: '',
        details: '',
        status: 'pending' as const,
        dependencies: [],
        testStrategy: '',
        prdSource: null,
      };

      const currentSubtasks = form.getValues('subtasks') || [];
      form.setValue('subtasks', [...currentSubtasks, newSubtask]);
      setNewSubtaskTitle('');
    }
  };

  const removeSubtask = (subtaskId: string) => {
    const currentSubtasks = form.getValues('subtasks') || [];
    const updatedSubtasks = currentSubtasks.filter((st: { id: string | number }) => st.id !== subtaskId);
    form.setValue('subtasks', updatedSubtasks);
  };

  const toggleSubtask = (subtaskId: string) => {
    const currentSubtasks = form.getValues('subtasks') || [];
    const updatedSubtasks = currentSubtasks.map((st: { id: string | number; status: string }) =>
      st.id === subtaskId ? { ...st, status: st.status === 'done' ? 'pending' : 'done' } : st
    );
    form.setValue('subtasks', updatedSubtasks);
  };

  return (
    <div className="space-y-4">
      {/* Add new subtask */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Enter subtask title..."
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          className="flex-1 px-3 py-2 border border-input rounded-md text-sm"
        />
        <Button
          type="button"
          onClick={addSubtask}
          disabled={!newSubtaskTitle.trim()}
        >
          Add Subtask
        </Button>
      </div>

      {/* Existing subtasks */}
      {subtasks.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Subtasks ({subtasks.length})</label>
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
            {subtasks.map((subtask: { id: string | number; title: string; status: string }) => (
              <div key={subtask.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded">
                <input
                  type="checkbox"
                  checked={subtask.status === 'done'}
                  onChange={() => toggleSubtask(subtask.id.toString())}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                    {subtask.id}
                  </span>
                  <span className={`text-sm ${subtask.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                    {subtask.title}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-100 hover:text-red-700"
                  onClick={() => removeSubtask(subtask.id.toString())}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
