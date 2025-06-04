import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import {
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  FormDatePicker,
  FormMultiSelect,
  FormTagInput,
  FormSection,
  FormActions,
} from './index';
import { TaskFormSchema, TaskFormData } from './schemas';

interface TaskFormProps {
  initialData?: Partial<TaskFormData>;
  onSubmit: (data: TaskFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

/**
 * Comprehensive task form using all reusable form components
 */
export function TaskForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  mode = 'create',
}: TaskFormProps) {
  const form = useForm<TaskFormData>({
    resolver: zodResolver(TaskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      status: 'pending',
      dependencies: [],
      tags: [],
      estimatedHours: undefined,
      assignee: '',
      dueDate: undefined,
      details: '',
      testStrategy: '',
      ...initialData,
    },
  });

  const priorityOptions = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' },
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
    { value: 'review', label: 'Review' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'deferred', label: 'Deferred' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const dependencyOptions = [
    { value: '1', label: 'Task #1 - Setup Project' },
    { value: '2', label: 'Task #2 - Design Database' },
    { value: '3', label: 'Task #3 - Create API' },
    { value: '4', label: 'Task #4 - Build Frontend' },
    { value: '5', label: 'Task #5 - Testing' },
  ];

  const tagSuggestions = [
    'frontend', 'backend', 'api', 'database', 'testing',
    'bug', 'feature', 'enhancement', 'documentation', 'urgent'
  ];

  const handleSubmit = (data: TaskFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormSection
          title="Basic Information"
          description="Essential task details and description"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              name="title"
              control={form.control}
              label="Task Title"
              placeholder="Enter task title..."
              required
              description="A clear, concise title for the task"
            />
            <FormSelect
              name="priority"
              control={form.control}
              label="Priority"
              options={priorityOptions}
              required
              description="Task priority level"
            />
          </div>
          
          <FormTextarea
            name="description"
            control={form.control}
            label="Description"
            placeholder="Describe the task in detail..."
            rows={4}
            required
            description="Detailed description of what needs to be done"
          />
        </FormSection>

        <FormSection
          title="Task Management"
          description="Status, dependencies, and organizational details"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              name="status"
              control={form.control}
              label="Status"
              options={statusOptions}
              description="Current task status"
            />
            <FormInput
              name="estimatedHours"
              control={form.control}
              label="Estimated Hours"
              type="number"
              min={0}
              step={0.5}
              placeholder="0"
              description="Estimated time to complete (hours)"
            />
          </div>

          <FormMultiSelect
            name="dependencies"
            control={form.control}
            label="Dependencies"
            options={dependencyOptions}
            maxSelections={5}
            description="Tasks that must be completed before this one"
          />

          <FormTagInput
            name="tags"
            control={form.control}
            label="Tags"
            suggestions={tagSuggestions}
            maxTags={10}
            description="Add tags to categorize and organize tasks"
          />
        </FormSection>

        <FormSection
          title="Assignment & Timeline"
          description="Who is responsible and when it's due"
          collapsible
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              name="assignee"
              control={form.control}
              label="Assignee"
              placeholder="Enter assignee name..."
              description="Person responsible for this task"
            />
            <FormDatePicker
              name="dueDate"
              control={form.control}
              label="Due Date"
              description="When this task should be completed"
              minDate={new Date()}
            />
          </div>
        </FormSection>

        <FormSection
          title="Additional Details"
          description="Extra information and testing strategy"
          collapsible
          defaultCollapsed
        >
          <FormTextarea
            name="details"
            control={form.control}
            label="Additional Details"
            placeholder="Any additional information..."
            rows={3}
            description="Extra context, notes, or requirements"
          />
          
          <FormTextarea
            name="testStrategy"
            control={form.control}
            label="Test Strategy"
            placeholder="How will this task be tested..."
            rows={3}
            description="Testing approach and acceptance criteria"
          />
        </FormSection>

        <FormActions align="right">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create Task' : 'Update Task'}
          </Button>
        </FormActions>
      </form>
    </Form>
  );
}

TaskForm.displayName = 'TaskForm';
