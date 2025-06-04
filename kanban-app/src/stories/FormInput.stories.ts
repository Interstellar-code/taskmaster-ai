import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { FormInput } from '@/components/forms/FormInput';

// Schema for the form
const FormSchema = z.object({
  text: z.string().min(3, 'Must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  number: z.number().min(0, 'Must be positive'),
  password: z.string().min(8, 'Must be at least 8 characters'),
  disabled: z.string().optional(),
});

type FormData = z.infer<typeof FormSchema>;

// Wrapper component for stories
const FormInputWrapper = (args: any) => {
  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      text: '',
      email: '',
      number: undefined,
      password: '',
      disabled: 'This field is disabled',
    },
  });

  return (
    <Form {...form}>
      <form className="space-y-4 max-w-md">
        <FormInput
          {...args}
          control={form.control}
        />
      </form>
    </Form>
  );
};

const meta: Meta<typeof FormInput> = {
  title: 'Forms/FormInput',
  component: FormInputWrapper,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The FormInput component is a reusable input field with built-in validation and error handling.

## Features
- Integration with React Hook Form
- Built-in validation display
- Support for different input types
- Accessible labels and descriptions
- Error state styling
- Required field indicators

## Accessibility
- Proper ARIA labels and descriptions
- Error state announcements
- Keyboard navigation support
- Focus management
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'select',
      options: ['text', 'email', 'number', 'password', 'disabled'],
      description: 'Field name for form control',
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'number', 'password', 'tel', 'url'],
      description: 'HTML input type',
    },
    label: {
      control: 'text',
      description: 'Field label',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    description: {
      control: 'text',
      description: 'Help text displayed below the input',
    },
    required: {
      control: 'boolean',
      description: 'Whether the field is required',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the field is disabled',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'text',
    label: 'Text Input',
    placeholder: 'Enter some text...',
    description: 'This is a basic text input field',
  },
};

export const Required: Story = {
  args: {
    name: 'text',
    label: 'Required Field',
    placeholder: 'This field is required',
    description: 'Notice the red asterisk indicating this field is required',
    required: true,
  },
};

export const Email: Story = {
  args: {
    name: 'email',
    type: 'email',
    label: 'Email Address',
    placeholder: 'user@example.com',
    description: 'Enter a valid email address',
    required: true,
  },
};

export const Number: Story = {
  args: {
    name: 'number',
    type: 'number',
    label: 'Number Input',
    placeholder: '0',
    description: 'Enter a positive number',
    min: 0,
    step: 0.5,
  },
};

export const Password: Story = {
  args: {
    name: 'password',
    type: 'password',
    label: 'Password',
    placeholder: 'Enter your password',
    description: 'Must be at least 8 characters long',
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    name: 'disabled',
    label: 'Disabled Field',
    placeholder: 'This field is disabled',
    description: 'This field cannot be edited',
    disabled: true,
  },
};

export const WithError: Story = {
  args: {
    name: 'text',
    label: 'Field with Error',
    placeholder: 'Type something short to see error',
    description: 'This field has validation that requires at least 3 characters',
    required: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Type less than 3 characters to see the error state.',
      },
    },
  },
};
