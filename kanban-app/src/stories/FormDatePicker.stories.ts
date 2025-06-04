import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addDays, subDays } from 'date-fns';
import { Form } from '@/components/ui/form';
import { FormDatePicker } from '@/components/forms/FormDatePicker';

// Schema for the form
const FormSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  birthday: z.date({
    required_error: 'Please select your birthday',
  }),
  deadline: z.date().min(new Date(), 'Deadline must be in the future'),
});

type FormData = z.infer<typeof FormSchema>;

// Wrapper component for stories
const FormDatePickerWrapper = (args: any) => {
  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      startDate: undefined,
      endDate: undefined,
      birthday: undefined,
      deadline: undefined,
    },
  });

  return (
    <Form {...form}>
      <form className="space-y-4 max-w-md">
        <FormDatePicker
          {...args}
          control={form.control}
        />
      </form>
    </Form>
  );
};

const meta: Meta<typeof FormDatePicker> = {
  title: 'Forms/FormDatePicker',
  component: FormDatePickerWrapper,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The FormDatePicker component provides date selection with a calendar popup interface.

## Features
- Integration with React Hook Form
- Calendar popup interface
- Date range validation
- Accessible date input
- Keyboard navigation support
- Min/max date constraints
- Custom date formatting

## Accessibility
- Proper ARIA labels and descriptions
- Keyboard navigation (Arrow keys, Enter, Escape)
- Screen reader announcements
- Focus management
- Date format announcements
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'select',
      options: ['startDate', 'endDate', 'birthday', 'deadline'],
      description: 'Field name for form control',
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
    dateFormat: {
      control: 'text',
      description: 'Date format string (date-fns format)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'startDate',
    label: 'Start Date',
    placeholder: 'Pick a date',
    description: 'Select the start date for your project',
  },
};

export const Required: Story = {
  args: {
    name: 'birthday',
    label: 'Birthday',
    placeholder: 'Select your birthday',
    description: 'This field is required',
    required: true,
  },
};

export const WithMinDate: Story = {
  args: {
    name: 'deadline',
    label: 'Project Deadline',
    placeholder: 'Select deadline',
    description: 'Deadline must be in the future',
    minDate: new Date(),
    required: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Date picker with minimum date constraint (today or later).',
      },
    },
  },
};

export const WithMaxDate: Story = {
  args: {
    name: 'birthday',
    label: 'Date of Birth',
    placeholder: 'Select your birth date',
    description: 'Must be in the past',
    maxDate: new Date(),
  },
  parameters: {
    docs: {
      description: {
        story: 'Date picker with maximum date constraint (today or earlier).',
      },
    },
  },
};

export const WithDateRange: Story = {
  args: {
    name: 'startDate',
    label: 'Event Date',
    placeholder: 'Select event date',
    description: 'Event must be within the next 30 days',
    minDate: new Date(),
    maxDate: addDays(new Date(), 30),
  },
  parameters: {
    docs: {
      description: {
        story: 'Date picker with both minimum and maximum date constraints.',
      },
    },
  },
};

export const CustomFormat: Story = {
  args: {
    name: 'startDate',
    label: 'Start Date',
    placeholder: 'MM/dd/yyyy',
    description: 'Date displayed in US format',
    dateFormat: 'MM/dd/yyyy',
  },
  parameters: {
    docs: {
      description: {
        story: 'Date picker with custom date format (US format).',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    name: 'startDate',
    label: 'Start Date',
    placeholder: 'This field is disabled',
    description: 'This field cannot be edited',
    disabled: true,
  },
};

export const DateRangeExample: Story = {
  render: () => {
    const DateRangeForm = () => {
      const form = useForm<{
        startDate: Date | undefined;
        endDate: Date | undefined;
      }>({
        defaultValues: {
          startDate: undefined,
          endDate: undefined,
        },
      });

      const startDate = form.watch('startDate');

      return (
        <Form {...form}>
          <form className="space-y-4 max-w-md">
            <FormDatePicker
              name="startDate"
              control={form.control}
              label="Start Date"
              placeholder="Select start date"
              description="Choose the start date"
              minDate={new Date()}
            />
            <FormDatePicker
              name="endDate"
              control={form.control}
              label="End Date"
              placeholder="Select end date"
              description="End date must be after start date"
              minDate={startDate ? addDays(startDate, 1) : new Date()}
              disabled={!startDate}
            />
          </form>
        </Form>
      );
    };

    return <DateRangeForm />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Two date pickers working together for date range selection.',
      },
    },
  },
};
