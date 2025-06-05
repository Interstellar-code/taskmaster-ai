
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormInput,
  FormTextarea,
  FormSelect,
  FormDatePicker,
  FormMultiSelect,
  FormTagInput,
  FormSection,
  FormActions,
  FormButton,
  FormBadge,
  FormAlert,
  useFormToast,
  FormDialog,
  ConfirmDialog,
  FormContextMenu,
  FormDropdownMenu,
} from './index';
import { TaskFormSchema, TaskFormData } from './schemas';

/**
 * Demo page to showcase all form components
 */
export function FormDemo() {
  const { showSuccess, showError, showWarning, showInfo } = useFormToast();

  const form = useForm({
    resolver: zodResolver(TaskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium' as const,
      status: 'pending' as const,
      dependencies: [],
      tags: [],
      estimatedHours: undefined,
      assignee: '',
      dueDate: undefined,
      details: '',
      testStrategy: '',
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
    console.log('Form submitted:', data);
    alert('Form submitted! Check console for data.');
  };

  const handleReset = () => {
    form.reset();
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">TaskMaster Form Components Demo</h1>
        <p className="text-muted-foreground">
          Showcase of all reusable form components with validation
        </p>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Task Form Example</CardTitle>
          <CardDescription>
            This form demonstrates all the reusable form components with validation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormSection
                title="Action & Display Components"
                description="Buttons, badges, alerts, and notifications"
              >
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Buttons</h4>
                    <div className="flex flex-wrap gap-2">
                      <FormButton variant="default">Default Button</FormButton>
                      <FormButton variant="secondary">Secondary</FormButton>
                      <FormButton variant="outline">Outline</FormButton>
                      <FormButton variant="destructive">Destructive</FormButton>
                      <FormButton loading loadingText="Saving...">Loading Button</FormButton>
                      <FormButton icon={<span>🚀</span>} iconPosition="left">With Icon</FormButton>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Badges</h4>
                    <div className="flex flex-wrap gap-2">
                      <FormBadge variant="default">Default</FormBadge>
                      <FormBadge variant="secondary">Secondary</FormBadge>
                      <FormBadge variant="success">Success</FormBadge>
                      <FormBadge variant="warning">Warning</FormBadge>
                      <FormBadge variant="info">Info</FormBadge>
                      <FormBadge variant="destructive">Error</FormBadge>
                      <FormBadge variant="outline" removable onRemove={() => showInfo('Badge removed!')}>
                        Removable
                      </FormBadge>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Alerts</h4>
                    <div className="space-y-2">
                      <FormAlert variant="info" title="Information" description="This is an informational message." />
                      <FormAlert variant="success" title="Success" description="Operation completed successfully!" />
                      <FormAlert variant="warning" title="Warning" description="Please review your input." />
                      <FormAlert variant="destructive" title="Error" description="Something went wrong." />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Toast Notifications</h4>
                    <div className="flex flex-wrap gap-2">
                      <FormButton variant="outline" onClick={() => showSuccess('Success!', 'Operation completed successfully')}>
                        Success Toast
                      </FormButton>
                      <FormButton variant="outline" onClick={() => showError('Error!', 'Something went wrong')}>
                        Error Toast
                      </FormButton>
                      <FormButton variant="outline" onClick={() => showWarning('Warning!', 'Please check your input')}>
                        Warning Toast
                      </FormButton>
                      <FormButton variant="outline" onClick={() => showInfo('Info!', 'Here is some information')}>
                        Info Toast
                      </FormButton>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Dialogs</h4>
                    <div className="flex flex-wrap gap-2">
                      <FormDialog
                        trigger={<FormButton variant="outline">Open Dialog</FormButton>}
                        title="Example Dialog"
                        description="This is a reusable dialog component"
                        footer={
                          <div className="flex gap-2">
                            <FormButton variant="outline">Cancel</FormButton>
                            <FormButton>Save Changes</FormButton>
                          </div>
                        }
                      >
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            This dialog can contain any content including forms, text, or other components.
                          </p>
                          <FormInput
                            name="details"
                            control={form.control}
                            label="Example Input"
                            placeholder="Type something..."
                          />
                        </div>
                      </FormDialog>

                      <ConfirmDialog
                        trigger={<FormButton variant="destructive">Delete Item</FormButton>}
                        title="Confirm Deletion"
                        message="Are you sure you want to delete this item?"
                        confirmText="Delete"
                        cancelText="Cancel"
                        onConfirm={() => showSuccess('Deleted!', 'Item has been deleted')}
                        onCancel={() => showInfo('Cancelled', 'Deletion was cancelled')}
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Context Menu</h4>
                    <FormContextMenu
                      groups={[
                        {
                          type: 'actions',
                          actions: [
                            {
                              id: 'copy',
                              label: 'Copy',
                              shortcut: 'Ctrl+C',
                              onSelect: () => showInfo('Copied!', 'Content copied to clipboard'),
                            },
                            {
                              id: 'paste',
                              label: 'Paste',
                              shortcut: 'Ctrl+V',
                              onSelect: () => showInfo('Pasted!', 'Content pasted from clipboard'),
                            },
                          ],
                        },
                        {
                          type: 'separator',
                        },
                        {
                          type: 'actions',
                          actions: [
                            {
                              id: 'delete',
                              label: 'Delete',
                              destructive: true,
                              shortcut: 'Del',
                              onSelect: () => showError('Deleted!', 'Item has been deleted'),
                            },
                          ],
                        },
                      ]}
                    >
                      <div className="p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center text-sm text-muted-foreground cursor-pointer hover:border-muted-foreground/50 transition-colors">
                        Right-click me to see the context menu
                      </div>
                    </FormContextMenu>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Dropdown Menu</h4>
                    <div className="flex gap-2">
                      <FormDropdownMenu
                        groups={[
                          {
                            type: 'actions',
                            actions: [
                              {
                                id: 'edit',
                                label: 'Edit',
                                shortcut: 'Ctrl+E',
                                onSelect: () => showInfo('Edit!', 'Edit action triggered'),
                              },
                              {
                                id: 'duplicate',
                                label: 'Duplicate',
                                shortcut: 'Ctrl+D',
                                onSelect: () => showInfo('Duplicated!', 'Item duplicated'),
                              },
                            ],
                          },
                          {
                            type: 'separator',
                          },
                          {
                            type: 'actions',
                            actions: [
                              {
                                id: 'archive',
                                label: 'Archive',
                                onSelect: () => showWarning('Archived!', 'Item archived'),
                              },
                              {
                                id: 'delete',
                                label: 'Delete',
                                destructive: true,
                                shortcut: 'Del',
                                onSelect: () => showError('Deleted!', 'Item deleted'),
                              },
                            ],
                          },
                        ]}
                      >
                        <FormButton variant="outline">Actions ▼</FormButton>
                      </FormDropdownMenu>
                    </div>
                  </div>
                </div>
              </FormSection>

              <FormSection
                title="Basic Input Components"
                description="Text inputs, textareas, and basic form controls"
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
                
                <FormTextarea
                  name="description"
                  control={form.control}
                  label="Description"
                  placeholder="Describe the task in detail..."
                  rows={4}
                  required
                  description="Detailed description of what needs to be done"
                />

                <FormInput
                  name="assignee"
                  control={form.control}
                  label="Assignee"
                  placeholder="Enter assignee name..."
                  description="Person responsible for this task"
                />
              </FormSection>

              <FormSection
                title="Selection Components"
                description="Dropdowns, multi-select, and choice components"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormSelect
                    name="priority"
                    control={form.control}
                    label="Priority"
                    options={priorityOptions}
                    required
                    description="Task priority level"
                  />
                  <FormSelect
                    name="status"
                    control={form.control}
                    label="Status"
                    options={statusOptions}
                    description="Current task status"
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
                title="Date and Advanced Components"
                description="Date pickers and other advanced form controls"
              >
                <FormDatePicker
                  name="dueDate"
                  control={form.control}
                  label="Due Date"
                  description="When this task should be completed"
                  minDate={new Date()}
                />

                <FormTextarea
                  name="details"
                  control={form.control}
                  label="Additional Details"
                  placeholder="Any additional information..."
                  rows={3}
                  description="Extra context, notes, or requirements"
                />
              </FormSection>

              <FormActions align="right">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                >
                  Reset Form
                </Button>
                <Button type="submit">
                  Submit Form
                </Button>
              </FormActions>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Form State</CardTitle>
          <CardDescription>
            Current form values and validation state
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-md text-sm overflow-auto">
            {JSON.stringify(form.watch(), null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

FormDemo.displayName = 'FormDemo';
