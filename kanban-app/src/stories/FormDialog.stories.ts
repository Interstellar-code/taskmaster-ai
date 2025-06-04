import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { FormDialog, ConfirmDialog } from '@/components/forms/FormDialog';
import { FormButton } from '@/components/forms/FormButton';
import { FormInput } from '@/components/forms/FormInput';
import { FormTextarea } from '@/components/forms/FormTextarea';
import { Settings, Trash2, Plus } from 'lucide-react';

// Schema for the form
const TaskSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
});

type TaskData = z.infer<typeof TaskSchema>;

const meta: Meta<typeof FormDialog> = {
  title: 'Forms/FormDialog',
  component: FormDialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The FormDialog component provides reusable modal dialogs for forms, confirmations, and other content.

## Features
- Controlled and uncontrolled modes
- Customizable trigger element
- Flexible content and footer
- Responsive sizing options
- Accessibility compliant
- Keyboard navigation support
- Escape key and outside click handling

## Accessibility
- Focus management and trapping
- ARIA labels and descriptions
- Keyboard navigation (Tab, Escape)
- Screen reader announcements
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Dialog title',
    },
    description: {
      control: 'text',
      description: 'Dialog description',
    },
    maxWidth: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl'],
      description: 'Maximum width of dialog',
    },
    closable: {
      control: 'boolean',
      description: 'Whether dialog can be closed by clicking outside or pressing escape',
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Whether to show close button',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: (args) => (
    <FormDialog
      {...args}
      trigger={<FormButton>Open Dialog</FormButton>}
      title="Basic Dialog"
      description="This is a basic dialog example"
      footer={
        <div className="flex gap-2">
          <FormButton variant="outline">Cancel</FormButton>
          <FormButton>Save</FormButton>
        </div>
      }
    >
      <p className="text-sm text-muted-foreground">
        This is the dialog content. You can put any content here including forms, text, or other components.
      </p>
    </FormDialog>
  ),
};

export const WithForm: Story = {
  render: () => {
    const TaskFormDialog = () => {
      const [open, setOpen] = useState(false);
      const form = useForm<TaskData>({
        resolver: zodResolver(TaskSchema),
        defaultValues: {
          title: '',
          description: '',
        },
      });

      const handleSubmit = (data: TaskData) => {
        console.log('Form submitted:', data);
        alert('Task created successfully!');
        setOpen(false);
        form.reset();
      };

      return (
        <FormDialog
          trigger={
            <FormButton icon={<Plus className="h-4 w-4" />}>
              Create Task
            </FormButton>
          }
          title="Create New Task"
          description="Fill in the details to create a new task"
          open={open}
          onOpenChange={setOpen}
          maxWidth="md"
          footer={
            <div className="flex gap-2 w-full sm:w-auto">
              <FormButton
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </FormButton>
              <FormButton
                onClick={form.handleSubmit(handleSubmit)}
                className="flex-1 sm:flex-none"
              >
                Create Task
              </FormButton>
            </div>
          }
        >
          <Form {...form}>
            <form className="space-y-4">
              <FormInput
                name="title"
                control={form.control}
                label="Task Title"
                placeholder="Enter task title..."
                required
              />
              <FormTextarea
                name="description"
                control={form.control}
                label="Description"
                placeholder="Describe the task..."
                rows={3}
                required
              />
            </form>
          </Form>
        </FormDialog>
      );
    };

    return <TaskFormDialog />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Dialog containing a form with validation.',
      },
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <FormDialog
        trigger={<FormButton size="sm">Small</FormButton>}
        title="Small Dialog"
        maxWidth="sm"
        footer={<FormButton>OK</FormButton>}
      >
        <p className="text-sm">This is a small dialog.</p>
      </FormDialog>
      
      <FormDialog
        trigger={<FormButton>Medium</FormButton>}
        title="Medium Dialog"
        maxWidth="md"
        footer={<FormButton>OK</FormButton>}
      >
        <p className="text-sm">This is a medium dialog with more content space.</p>
      </FormDialog>
      
      <FormDialog
        trigger={<FormButton size="lg">Large</FormButton>}
        title="Large Dialog"
        maxWidth="lg"
        footer={<FormButton>OK</FormButton>}
      >
        <p className="text-sm">
          This is a large dialog that can accommodate more content, forms, or complex layouts.
          It provides ample space for detailed information and interactions.
        </p>
      </FormDialog>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different dialog sizes.',
      },
    },
  },
};

export const ConfirmationDialog: Story = {
  render: () => (
    <div className="flex gap-2">
      <ConfirmDialog
        trigger={
          <FormButton variant="destructive" icon={<Trash2 className="h-4 w-4" />}>
            Delete Item
          </FormButton>
        }
        title="Confirm Deletion"
        message="Are you sure you want to delete this item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => alert('Item deleted!')}
        onCancel={() => console.log('Deletion cancelled')}
      />
      
      <ConfirmDialog
        trigger={
          <FormButton variant="outline" icon={<Settings className="h-4 w-4" />}>
            Reset Settings
          </FormButton>
        }
        title="Reset Settings"
        message="This will reset all settings to their default values. Are you sure?"
        confirmText="Reset"
        confirmVariant="default"
        onConfirm={() => alert('Settings reset!')}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Confirmation dialogs for destructive or important actions.',
      },
    },
  },
};

export const NonClosable: Story = {
  render: () => (
    <FormDialog
      trigger={<FormButton variant="outline">Non-Closable Dialog</FormButton>}
      title="Important Notice"
      description="This dialog cannot be closed by clicking outside or pressing escape"
      closable={false}
      footer={
        <FormButton>I Understand</FormButton>
      }
    >
      <p className="text-sm text-muted-foreground">
        This dialog requires explicit user action to close. It cannot be dismissed by clicking outside
        or pressing the escape key.
      </p>
    </FormDialog>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Dialog that cannot be closed by clicking outside or pressing escape.',
      },
    },
  },
};
