import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { FormDialog } from './FormDialog';
import { FormInput, FormTextarea, FormSelect, FormSection, FormCheckbox, FormMultiSelect, FormMultiCombobox, FormCombobox, FormDatePicker, useFormToast } from './index';
import { ChevronDown } from 'lucide-react';
import { taskService } from '@/api/taskService';
import { Edit, Loader2 } from 'lucide-react';
import { TaskCreateSchema, type TaskCreateFormData } from './TaskCreateModal';
import { EnhancedKanbanTask } from '@/api/types';

interface TaskEditModalProps {
  task: EnhancedKanbanTask;
  onTaskUpdated?: (task: any) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const priorityOptions = [
  { value: 'low', label: 'Low Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'high', label: 'High Priority' },
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [availableTasks, setAvailableTasks] = useState<Array<{id: string, title: string}>>([]);
  const [availablePRDs, setAvailablePRDs] = useState<Array<{id: string, title: string}>>([]);
  const { showSuccess, showError } = useFormToast();

  // Use controlled or internal state
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : open;
  const setIsOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setOpen;

  const form = useForm<TaskCreateFormData>({
    resolver: zodResolver(TaskCreateSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      tags: [],
      estimatedHours: undefined,
      assignee: '',
      dueDate: '',
      details: '',
      testStrategy: '',
      dependencies: [],
      prdSource: '',
      subtasks: [],
    },
  });

  // Pre-populate form with task data when modal opens or task changes
  useEffect(() => {
    if (isOpen && task) {
      loadTaskData();
    }
  }, [isOpen, task, form]);

  const loadTaskData = async () => {
    try {
      // Fetch full task details to get subtasks and other data
      const fullTask = await taskService.getTaskById(task.id);

      // Convert subtasks from TaskMaster format to form format
      const formSubtasks = fullTask.subtasks ? fullTask.subtasks.map((subtask: any) => ({
        id: subtask.id || `subtask_${Date.now()}_${Math.random()}`,
        title: subtask.title || subtask.description || '',
        completed: subtask.status === 'done' || subtask.completed || false,
      })) : [];

      form.reset({
        title: fullTask.title || '',
        description: fullTask.description || '',
        priority: fullTask.priority || 'medium',
        tags: [], // Would need to be added to task data structure
        estimatedHours: fullTask.estimatedHours || undefined,
        assignee: fullTask.assignee || '',
        dueDate: fullTask.dueDate || '',
        details: fullTask.details || '',
        testStrategy: fullTask.testStrategy || '',
        dependencies: fullTask.dependencies || [],
        prdSource: fullTask.prdSource?.fileName || '',
        subtasks: formSubtasks,
      });

      fetchAvailableData();
    } catch (error) {
      console.error('Failed to load task data:', error);
      showError("Load Error", "Failed to load task details. Using basic data.");

      // Fallback to basic task data
      form.reset({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        tags: [],
        estimatedHours: undefined,
        assignee: '',
        dueDate: '',
        details: task.details || '',
        testStrategy: task.testStrategy || '',
        dependencies: task.dependencies || [],
        prdSource: task.prdSource?.fileName || '',
        subtasks: [],
      });

      fetchAvailableData();
    }
  };

  // Fetch available tasks and PRDs when modal opens
  const fetchAvailableData = async () => {
    try {
      const [tasks] = await Promise.all([
        taskService.getAllTasks(),
      ]);

      // Filter out current task from dependencies
      const filteredTasks = tasks
        .filter(t => t.id !== task.id)
        .map(t => ({
          id: String(t.id),
          title: t.title
        }));

      setAvailableTasks(filteredTasks);
      // PRDs would need to be fetched from a separate endpoint
      setAvailablePRDs([]);
    } catch (error) {
      console.error('Failed to fetch available data:', error);
      showError("Load Error", "Failed to load form data. Please try again.");
    }
  };

  const handleSubmit = async (data: TaskCreateFormData) => {
    setIsSubmitting(true);
    try {
      // Build comprehensive prompt with all form data
      let prompt = `Update task: ${data.title}\n\nDescription: ${data.description}`;

      if (data.priority) {
        prompt += `\nPriority: ${data.priority}`;
      }

      if (data.assignee && data.assignee.trim()) {
        prompt += `\nAssignee: ${data.assignee.trim()}`;
      }

      if (data.estimatedHours) {
        prompt += `\nEstimated Hours: ${data.estimatedHours}`;
      }

      if (data.dueDate) {
        prompt += `\nDue Date: ${data.dueDate}`;
      }

      if (data.dependencies && data.dependencies.length > 0) {
        prompt += `\nDependencies: ${data.dependencies.join(', ')}`;
      }

      if (data.details && data.details.trim()) {
        prompt += `\n\nAdditional Details: ${data.details.trim()}`;
      }

      if (data.testStrategy && data.testStrategy.trim()) {
        prompt += `\n\nTest Strategy: ${data.testStrategy.trim()}`;
      }

      if (data.subtasks && data.subtasks.length > 0) {
        prompt += `\n\nSubtasks:`;
        data.subtasks.forEach((subtask: any, index: number) => {
          const status = subtask.completed ? '[DONE]' : '[PENDING]';
          prompt += `\n${index + 1}. ${status} ${subtask.title}`;
        });
      }

      const updateData = { prompt };
      const updatedTask = await taskService.updateTask(task.id, updateData);

      showSuccess("Task Updated", "Task updated successfully!");

      onTaskUpdated?.(updatedTask);
      setIsOpen(false);

    } catch (error) {
      console.error('Failed to update task:', error);
      showError("Update Failed", "Failed to update task. Please try again.");
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
                placeholder="Select PRD source..."
                searchPlaceholder="Search PRDs..."
                emptyMessage="No PRDs found"
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
                      name="estimatedHours"
                      control={form.control}
                      label="Est. Hours"
                      placeholder="0.5"
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="200"
                    />

                    <FormDatePicker
                      name="dueDate"
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

/**
 * SubtaskManager Component
 * Manages dynamic subtask creation with checkboxes
 */
interface SubtaskManagerProps {
  form: any; // UseFormReturn type
}

function SubtaskManager({ form }: SubtaskManagerProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const subtasks = form.watch('subtasks') || [];

  const addSubtask = () => {
    if (newSubtaskTitle.trim()) {
      const newSubtask = {
        id: `subtask_${Date.now()}`,
        title: newSubtaskTitle.trim(),
        completed: false,
      };

      const currentSubtasks = form.getValues('subtasks') || [];
      form.setValue('subtasks', [...currentSubtasks, newSubtask]);
      setNewSubtaskTitle('');
    }
  };

  const removeSubtask = (subtaskId: string) => {
    const currentSubtasks = form.getValues('subtasks') || [];
    const updatedSubtasks = currentSubtasks.filter((st: any) => st.id !== subtaskId);
    form.setValue('subtasks', updatedSubtasks);
  };

  const toggleSubtask = (subtaskId: string) => {
    const currentSubtasks = form.getValues('subtasks') || [];
    const updatedSubtasks = currentSubtasks.map((st: any) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
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
            {subtasks.map((subtask: any, index: number) => (
              <div key={subtask.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded">
                <input
                  type="checkbox"
                  checked={subtask.completed}
                  onChange={() => toggleSubtask(subtask.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {subtask.title}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSubtask(subtask.id)}
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                >
                  ×
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
