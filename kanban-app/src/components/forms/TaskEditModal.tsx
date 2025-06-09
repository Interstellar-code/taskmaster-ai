import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FormDialog } from './FormDialog';
import { FormInput, FormTextarea, FormSelect, FormSection, FormMultiCombobox, FormCombobox, FormDatePicker, useFormToast } from './index';
import { ChevronDown } from 'lucide-react';
import { taskService } from '@/api/taskService';
import { Edit, Loader2, X } from 'lucide-react';

import { z } from 'zod';
import { EnhancedKanbanTask, TaskMasterTask, TaskStatus } from '@/api/types';

// Type guard function to safely check for dueDate property that may exist at runtime
function hasDateProperty(obj: unknown): obj is { dueDate?: string } {
  return typeof obj === 'object' && obj !== null && 'dueDate' in obj;
}

// Create a proper edit schema that makes required fields explicit
// Type conversion utilities for Phase 4 field mapping fixes
const convertToIntegerIds = (ids: (string | number)[]): number[] => {
  return ids.map(id => typeof id === 'string' ? parseInt(id, 10) : id).filter(id => !isNaN(id));
};

const convertToStringIds = (ids: number[]): string[] => {
  return ids.map(id => id.toString());
};

const TaskEditSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters long').max(5000, 'Description must be less than 5000 characters'),
  tags: z.array(z.string()).default([]),
  dependencies: z.array(z.union([z.string(), z.number()])).default([]).transform((deps) => convertToIntegerIds(deps)),
  subtasks: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    title: z.string(),
    description: z.string().optional(),
    details: z.string().optional(),
    status: z.enum(['pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled']),
    dependencies: z.array(z.union([z.string(), z.number()])).default([]).transform((deps) => convertToIntegerIds(deps)),
    parent_task_id: z.union([z.string(), z.number()]).optional().transform((val) => {
      if (val === undefined || val === null) return undefined;
      return typeof val === 'string' ? parseInt(val, 10) : val;
    }),
    test_strategy: z.string().optional(),
    prd_source: z.object({
      filePath: z.string(),
      fileName: z.string(),
      parsedDate: z.string(),
      fileHash: z.string(),
      fileSize: z.number()
    }).nullable().optional(),
  })).default([]),
  details: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled']).optional(),
  estimated_hours: z.number().optional(),
  assignee: z.string().optional(),
  due_date: z.date().optional(),
  test_strategy: z.string().optional(),
  prd_id: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return typeof val === 'string' ? parseInt(val, 10) : val;
  }),
});

type TaskEditFormData = z.infer<typeof TaskEditSchema>;

interface TaskEditModalProps {
  task: EnhancedKanbanTask;
  onTaskUpdated?: (task: TaskMasterTask) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const priorityOptions = [
  { value: 'low', label: 'Low Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'high', label: 'High Priority' },
];

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'done', label: 'Done' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'cancelled', label: 'Cancelled' },
];

/**
 * Task Edit Modal
 *
 * Features:
 * - Pre-populated form fields with existing task data
 * - Same comprehensive form as TaskCreateModal
 * - Integration with TaskMaster PUT API
 * - Success/error notifications
 * - Responsive design
 */
export function TaskEditModal({ task, onTaskUpdated, trigger, open: controlledOpen, onOpenChange: controlledOnOpenChange }: TaskEditModalProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [availableTasks, setAvailableTasks] = useState<Array<{id: string, title: string}>>([]);
  const [availablePRDs, setAvailablePRDs] = useState<Array<{id: string, title: string}>>([]);
  const { showSuccess, showError } = useFormToast();

  // Use controlled or internal state
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : open;
  const setIsOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setOpen;

  const form = useForm({
    resolver: zodResolver(TaskEditSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium' as const,
      status: 'pending' as const,
      tags: [],
      estimated_hours: undefined,
      assignee: '',
      due_date: undefined,
      details: '',
      test_strategy: '',
      dependencies: [],
      prd_id: undefined,
      subtasks: [],
    },
  });

  const loadTaskData = useCallback(async () => {
    try {
      // Fetch full task details to get subtasks and other data
      const fullTask = await taskService.getTaskById(task.id);

      // Convert subtasks to proper TaskMaster format
      const formSubtasks = fullTask.subtasks ? fullTask.subtasks.map((subtask, index: number) => ({
        id: subtask.id ? subtask.id : `${task.id}.${index + 1}`,
        title: subtask.title || subtask.description || '',
        description: subtask.description || '',
        details: subtask.details || '',
        status: (subtask.status as 'pending' | 'in-progress' | 'done' | 'review' | 'blocked' | 'deferred' | 'cancelled') || 'pending',
        dependencies: convertToStringIds(subtask.dependencies || []),
        parent_task_id: subtask.parent_task_id || parseInt(task.id, 10),
        test_strategy: subtask.test_strategy || '',
        prd_source: subtask.prd_source || null,
      })) : [];

      form.reset({
        title: fullTask.title || '',
        description: fullTask.description || '',
        priority: (fullTask.priority as 'low' | 'medium' | 'high') || 'medium',
        status: (fullTask.status as TaskStatus) || 'pending',
        tags: [],
        estimated_hours: (fullTask as TaskMasterTask & { estimated_hours?: number }).estimated_hours || undefined,
        assignee: (fullTask as TaskMasterTask & { assignee?: string }).assignee || '',
        due_date: hasDateProperty(fullTask) && fullTask.dueDate ? new Date(fullTask.dueDate) : undefined,
        details: fullTask.details || '',
        test_strategy: fullTask.test_strategy || '',
        dependencies: convertToStringIds(Array.isArray(fullTask.dependencies) ? fullTask.dependencies : []),
        prd_id: (fullTask as TaskMasterTask & { prd_id?: number }).prd_id || undefined,
        subtasks: formSubtasks,
      });

      fetchAvailableData();
    } catch (error) {
      console.error('Failed to load task data:', error);
      // Don't show error toast, just use fallback data gracefully

      // Fallback to basic task data
      form.reset({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: (task.status as TaskStatus) || 'pending',
        tags: [],
        estimated_hours: undefined,
        assignee: '',
        due_date: hasDateProperty(task) && task.dueDate ? new Date(task.dueDate) : undefined,
        details: task.details || '',
        test_strategy: task.test_strategy || '',
        dependencies: convertToStringIds(Array.isArray(task.dependencies) ? task.dependencies : []),
        prd_id: undefined,
        subtasks: [],
      });

      fetchAvailableData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, form]);

  // Pre-populate form with task data when modal opens or task changes
  useEffect(() => {
    if (isOpen && task) {
      loadTaskData();
    }
  }, [isOpen, task, loadTaskData]);

  // Fetch available tasks and PRDs when modal opens
  const fetchAvailableData = useCallback(async () => {
    try {
      const [tasks, prds] = await Promise.all([
        taskService.getAllTasks(),
        fetchPRDs(),
      ]);

      // Filter out current task from dependencies
      const filteredTasks = tasks
        .filter(t => String(t.id) !== task.id)
        .map(t => ({
          id: String(t.id),
          title: t.title
        }));

      setAvailableTasks(filteredTasks);
      setAvailablePRDs(prds);
    } catch (error) {
      console.error('Failed to fetch available data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError("Load Error", `Failed to load form data: ${errorMessage}`);
    }
  }, [task.id, showError]);

  const fetchPRDs = async (): Promise<Array<{id: string, title: string}>> => {
    try {
      const response = await fetch('/api/v1/prds');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data.map((prd: { id: string | number; title?: string; fileName?: string }) => ({
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

  const handleSubmit = async (data: TaskEditFormData) => {
    setIsSubmitting(true);
    try {
      // Send structured data instead of just a prompt
      // Convert Date objects to strings for API compatibility
      const updateData = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        tags: data.tags,
        dependencies: data.dependencies, // Already converted to numbers by schema transform
        assignee: data.assignee?.trim() || undefined,
        estimated_hours: data.estimated_hours || undefined,
        due_date: data.due_date ? data.due_date.toISOString() : undefined,
        details: data.details?.trim() || undefined,
        test_strategy: data.test_strategy?.trim() || undefined,
        prd_id: data.prd_id || undefined,
        subtasks: data.subtasks || []
      };

      // Remove undefined values to avoid sending them, but keep empty arrays and subtasks
      Object.keys(updateData).forEach(key => {
        const typedKey = key as keyof TaskEditFormData;
        if (updateData[typedKey] === undefined || (updateData[typedKey] === '' && !['dependencies', 'subtasks'].includes(key))) {
          delete updateData[typedKey];
        }
      });

      console.log('Sending update data to API:', updateData);

      const updatedTask = await taskService.updateTask(task.id, updateData);

      showSuccess("Task Updated", "Task updated successfully!");

      onTaskUpdated?.(updatedTask);
      setIsOpen(false);

    } catch (error) {
      console.error('Failed to update task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      showError("Update Failed", `Failed to update task: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    setIsOpen(false);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Edit className="h-4 w-4" />
      Edit Task
    </Button>
  );

  return (
    <FormDialog
      trigger={trigger || defaultTrigger}
      title={`Edit Task #${task.id}`}
      description="Update task details and configuration."
      open={isOpen}
      onOpenChange={setIsOpen}
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
            form="task-edit-form"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Updating...' : 'Update Task'}
          </Button>
        </div>
      }
    >
      <Form {...form}>
        <form
          id="task-edit-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-8"
        >
          <div className="space-y-6">
            {/* Title, Priority, Status, and PRD Source in first row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
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

              <FormSelect
                name="status"
                control={form.control}
                label="Status"
                placeholder="Select task status"
                options={statusOptions}
              />

              <FormCombobox
                name="prd_id"
                control={form.control}
                label="PRD Source"
                placeholder="Select PRD source..."
                searchPlaceholder="Search PRDs..."
                options={availablePRDs.map(prd => ({
                  value: prd.id,
                  label: prd.title
                }))}
              />
            </div>

            {/* Description spanning full width */}
            <FormTextarea
              name="description"
              control={form.control}
              label="Description"
              placeholder="Provide a detailed description of what needs to be accomplished..."
              rows={3}
              required
            />

            {/* Advanced Options Toggle */}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="gap-2 text-sm"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
              </Button>
            </div>

            {showAdvanced && (
              <div className="space-y-8">
                <div className="space-y-6">
                  {/* Dependencies and other fields */}
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
                          .filter(t => t.id && t.id.trim() && t.title && t.title.trim())
                          .map(t => ({
                            value: t.id.trim(),
                            label: `#${t.id.trim()} - ${t.title.trim()}`
                          }))
                        }
                        maxSelections={10}
                        showSelectedCount={true}
                      />
                    </div>

                    <FormInput
                      name="assignee"
                      control={form.control}
                      label="Assignee"
                      placeholder="Assigned to..."
                    />

                    <FormInput
                      name="estimated_hours"
                      control={form.control}
                      label="Est. Hours"
                      placeholder="0.5"
                      type="number"
                      step={0.5}
                      min={0.5}
                      max={200}
                    />

                    <FormDatePicker
                      name="due_date"
                      control={form.control}
                      label="Due Date"
                      placeholder="Select date..."
                    />
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
                      <SubtaskManager form={form} task={task} onTaskUpdated={onTaskUpdated} />
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

/**
 * SubtaskManager Component
 * Manages dynamic subtask creation with checkboxes
 */
interface SubtaskManagerProps {
  form: {
    watch: (name: 'subtasks') => TaskEditFormData['subtasks'];
    getValues: (name: 'subtasks') => TaskEditFormData['subtasks'];
    setValue: (name: 'subtasks', value: TaskEditFormData['subtasks']) => void;
  };
  task: EnhancedKanbanTask;
  onTaskUpdated?: (task: TaskMasterTask) => void;
}

function SubtaskManager({ form, task, onTaskUpdated }: SubtaskManagerProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const subtasks = form.watch('subtasks') || [];
  const { showSuccess, showError } = useFormToast();

  const addSubtask = () => {
    if (newSubtaskTitle.trim()) {
      const currentSubtasks = form.getValues('subtasks') || [];

      const newSubtask = {
        id: parseInt(`${Date.now()}${Math.floor(Math.random() * 1000)}`),
        title: newSubtaskTitle.trim(),
        description: '',
        details: '',
        status: 'pending' as const,
        dependencies: [],
        parent_task_id: task?.id ? parseInt(task.id, 10) : undefined,
        test_strategy: '',
        prd_source: null,
      };

      form.setValue('subtasks', [...currentSubtasks, newSubtask]);
      setNewSubtaskTitle('');
    }
  };

  const removeSubtask = (subtaskId: string) => {
    const currentSubtasks = form.getValues('subtasks') || [];
    const updatedSubtasks = currentSubtasks.filter((st: { id: string | number }) => st.id !== subtaskId);
    form.setValue('subtasks', updatedSubtasks);
  };

  const toggleSubtask = async (subtaskId: string) => {
    const currentSubtasks = form.getValues('subtasks') || [];
    const targetSubtask = currentSubtasks.find(st => st.id === subtaskId);

    if (!targetSubtask) {
      showError("Update Failed", "Subtask not found.");
      return;
    }

    const newStatus = targetSubtask.status === 'done' ? 'pending' : 'done';

    // Update form state immediately for responsive UI
    const updatedSubtasks = currentSubtasks.map(st =>
      st.id === subtaskId ? { ...st, status: newStatus as TaskStatus } : st
    );
    form.setValue('subtasks', updatedSubtasks);

    // Make direct API call to update subtask status using TaskMaster's set-status functionality
    try {
      // Use the subtask status update API endpoint
      const response = await taskService.updateSubtaskStatus(task.id, subtaskId, newStatus);

      // Show success feedback
      showSuccess(
        "Subtask Updated",
        `Subtask ${subtaskId} marked as ${newStatus === 'done' ? 'completed' : 'pending'}`
      );

      // Notify parent component to refresh the kanban board
      if (onTaskUpdated && response) {
        onTaskUpdated(response);
      }
    } catch (error) {
      console.error('Failed to update subtask:', error);

      // Revert the form state on error
      form.setValue('subtasks', currentSubtasks);

      // Show error feedback
      showError("Update Failed", "Failed to update subtask. Please try again.");
    }
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
                  onChange={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSubtask(subtask.id.toString());
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
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
