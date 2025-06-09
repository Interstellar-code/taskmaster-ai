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

// Type conversion utilities for Phase 4 field mapping fixes
const convertToIntegerIds = (ids: (string | number)[]): number[] => {
  return ids.map(id => typeof id === 'string' ? parseInt(id, 10) : id).filter(id => !isNaN(id));
};

const convertToStringIds = (ids: number[]): string[] => {
  return ids.map(id => id.toString());
};

// Enhanced type for form options that can handle both string and number values
interface EnhancedSelectOption {
  value: string; // Always string for form component compatibility
  label: string;
  numericValue?: number; // Store the original numeric value
  disabled?: boolean;
}

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
  dependencies: z.array(z.union([z.string(), z.number()])).default([]).transform((deps) => convertToIntegerIds(deps)),
  subtasks: z.array(z.object({
    id: z.number(),
    title: z.string().min(3, 'Subtask title must be at least 3 characters'),
    description: z.string().optional(),
    details: z.string().optional(),
    status: z.enum(['pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled']).default('pending'),
    dependencies: z.array(z.union([z.string(), z.number()])).default([]).transform((deps) => convertToIntegerIds(deps)),
    parent_task_id: z.number().optional(),
    test_strategy: z.string().optional(),
    prd_source: z.object({
      filePath: z.string(),
      fileName: z.string(),
      parsedDate: z.string(),
      fileHash: z.string(),
      fileSize: z.number()
    }).nullable().optional(),
  })).default([]),

  // Optional enhanced fields
  estimated_hours: z.number()
    .min(0.5, 'Minimum 0.5 hours')
    .max(200, 'Maximum 200 hours')
    .optional(),
  assignee: z.string()
    .max(50, 'Assignee name must be less than 50 characters')
    .optional(),
  due_date: z.date().optional(), // Date object from date picker
  details: z.string()
    .max(2000, 'Details must be less than 2000 characters')
    .optional(),
  test_strategy: z.string()
    .max(1000, 'Test strategy must be less than 1000 characters')
    .optional(),
  prd_id: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'string' ? parseInt(val, 10) : val;
  }),
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
  const [availableTasks, setAvailableTasks] = useState<EnhancedSelectOption[]>([]);
  const [availablePRDs, setAvailablePRDs] = useState<EnhancedSelectOption[]>([]);
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
      estimated_hours: initialData?.estimated_hours || undefined,
      assignee: initialData?.assignee || '',
      due_date: initialData?.due_date ? new Date(initialData.due_date) : undefined,
      details: initialData?.details || '',
      test_strategy: initialData?.test_strategy || '',
      dependencies: initialData?.dependencies ? convertToStringIds(initialData.dependencies) : [],
      prd_id: initialData?.prd_id || undefined,
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
        id: typeof subtask.id === 'number' ? subtask.id : parseInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
        title: subtask.title || '',
        description: subtask.description || '',
        details: subtask.details || '',
        status: subtask.status || 'pending',
        dependencies: subtask.dependencies ? convertToStringIds(subtask.dependencies) : [],
        parent_task_id: subtask.parent_task_id,
        test_strategy: subtask.test_strategy || '',
        prd_source: subtask.prd_source || null,
      })) : [];

      form.reset({
        title: initialData.title || '',
        description: initialData.description || '',
        priority: initialData.priority || 'medium',
        tags: initialData.tags || [],
        estimated_hours: initialData.estimated_hours || undefined,
        assignee: initialData.assignee || '',
        due_date: initialData?.due_date ? (typeof initialData.due_date === 'string' ? new Date(initialData.due_date) : initialData.due_date) : undefined,
        details: initialData.details || '',
        test_strategy: initialData.test_strategy || '',
        dependencies: initialData.dependencies ? convertToStringIds(initialData.dependencies) : [],
        prd_id: initialData.prd_id || undefined,
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

      const tasks: EnhancedSelectOption[] = validTasks.map((task) => {
        const numericId = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
        return {
          value: numericId.toString(),
          label: `#${numericId} - ${task.title.trim()}`,
          numericValue: numericId
        };
      });
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

  const fetchPRDs = async (): Promise<EnhancedSelectOption[]> => {
    try {
      const response = await fetch('/api/prds');
      if (response.ok) {
        const result = await response.json();

        // Handle unified API response format
        let data;
        if (result.success && result.data) {
          data = result.data;
        } else if (Array.isArray(result)) {
          // Direct array response (fallback)
          data = result;
        } else {
          console.warn('Unexpected PRD API response format:', result);
          return [];
        }

        return data.map((prd: { id: string | number; title?: string; fileName?: string }): EnhancedSelectOption => {
          const numericId = typeof prd.id === 'string' ? parseInt(prd.id, 10) : prd.id;
          return {
            value: numericId.toString(),
            label: prd.title || prd.fileName || `PRD ${numericId}`,
            numericValue: numericId
          };
        });
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
        ...(data.estimated_hours && { estimated_hours: data.estimated_hours }),
        ...(data.assignee && data.assignee.trim() && { assignee: data.assignee.trim() }),
        ...(data.due_date && { due_date: data.due_date.toISOString() }),
        ...(data.details && data.details.trim() && { details: data.details.trim() }),
        ...(data.test_strategy && data.test_strategy.trim() && { test_strategy: data.test_strategy.trim() }),
        // New comprehensive fields (dependencies already converted by schema transform)
        ...(data.dependencies && data.dependencies.length > 0 && { dependencies: data.dependencies }),
        ...(data.prd_id && { prd_id: data.prd_id }),
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
                name="prd_id"
                control={form.control}
                label="PRD Source"
                placeholder="Select related PRD"
                searchPlaceholder="Search PRDs..."
                emptyText="No PRDs found"
                options={availablePRDs
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
                        options={availableTasks}
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
                        name="estimated_hours"
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
                        name="due_date"
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
                      name="test_strategy"
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
  form: {
    watch: (name: 'subtasks') => TaskCreateFormData['subtasks'];
    getValues: (name: 'subtasks') => TaskCreateFormData['subtasks'];
    setValue: (name: 'subtasks', value: TaskCreateFormData['subtasks']) => void;
  };
}

function SubtaskManager({ form }: SubtaskManagerProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const subtasks = form.watch('subtasks') || [];

  const addSubtask = () => {
    if (newSubtaskTitle.trim()) {
      const newSubtask = {
        id: parseInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
        title: newSubtaskTitle.trim(),
        description: '',
        details: '',
        status: 'pending' as const,
        dependencies: [],
        parent_task_id: undefined,
        test_strategy: '',
        prd_source: null,
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
    const updatedSubtasks = currentSubtasks.map((st) =>
      st.id.toString() === subtaskId ? { ...st, status: (st.status === 'done' ? 'pending' : 'done') as 'pending' | 'done' } : st
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
