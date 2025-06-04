import type { Meta, StoryObj } from '@storybook/react';
import { FormButton } from '@/components/forms/FormButton';
import { Save, Download, Trash2, Plus } from 'lucide-react';

const meta: Meta<typeof FormButton> = {
  title: 'Forms/FormButton',
  component: FormButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The FormButton component is an enhanced button with loading states, icons, and form-specific styling.

## Features
- Loading states with spinner animation
- Icon support with left/right positioning
- Full width option
- All standard button variants and sizes
- Form-specific styling and behavior
- Accessibility compliant

## Accessibility
- Proper ARIA labels for loading states
- Keyboard navigation support
- Focus management
- Screen reader announcements
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'Button visual style variant',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Button size',
    },
    loading: {
      control: 'boolean',
      description: 'Whether button is in loading state',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether button is disabled',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Whether button takes full width',
    },
    iconPosition: {
      control: 'select',
      options: ['left', 'right'],
      description: 'Position of the icon relative to text',
    },
    children: {
      control: 'text',
      description: 'Button text content',
    },
    loadingText: {
      control: 'text',
      description: 'Text to show when loading',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default Button',
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <FormButton variant="default">Default</FormButton>
      <FormButton variant="secondary">Secondary</FormButton>
      <FormButton variant="outline">Outline</FormButton>
      <FormButton variant="destructive">Destructive</FormButton>
      <FormButton variant="ghost">Ghost</FormButton>
      <FormButton variant="link">Link</FormButton>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available button variants.',
      },
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <FormButton size="sm">Small</FormButton>
      <FormButton size="default">Default</FormButton>
      <FormButton size="lg">Large</FormButton>
      <FormButton size="icon">
        <Plus className="h-4 w-4" />
      </FormButton>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different button sizes including icon-only buttons.',
      },
    },
  },
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <FormButton icon={<Save className="h-4 w-4" />} iconPosition="left">
        Save
      </FormButton>
      <FormButton icon={<Download className="h-4 w-4" />} iconPosition="right">
        Download
      </FormButton>
      <FormButton variant="destructive" icon={<Trash2 className="h-4 w-4" />}>
        Delete
      </FormButton>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Buttons with icons in different positions.',
      },
    },
  },
};

export const Loading: Story = {
  args: {
    children: 'Save Changes',
    loading: true,
    loadingText: 'Saving...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Button in loading state with spinner and custom loading text.',
      },
    },
  },
};

export const LoadingStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <FormButton loading>Loading</FormButton>
      <FormButton loading loadingText="Saving...">Save</FormButton>
      <FormButton loading variant="destructive" loadingText="Deleting...">
        Delete
      </FormButton>
      <FormButton loading variant="outline" loadingText="Processing...">
        Process
      </FormButton>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Various buttons in loading states.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
};

export const FullWidth: Story = {
  args: {
    children: 'Full Width Button',
    fullWidth: true,
  },
  parameters: {
    layout: 'padded',
  },
};

export const FormActions: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-md">
      <div className="flex gap-2">
        <FormButton variant="outline" fullWidth>
          Cancel
        </FormButton>
        <FormButton fullWidth>
          Submit
        </FormButton>
      </div>
      <FormButton 
        variant="destructive" 
        fullWidth 
        icon={<Trash2 className="h-4 w-4" />}
      >
        Delete Item
      </FormButton>
    </div>
  ),
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Common form action button layouts.',
      },
    },
  },
};
