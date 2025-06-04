import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { FormCombobox } from '@/components/forms/FormCombobox';

// Schema for the form
const FormSchema = z.object({
  country: z.string().min(1, 'Please select a country'),
  framework: z.string().optional(),
  language: z.string().optional(),
});

type FormData = z.infer<typeof FormSchema>;

// Sample data
const countries = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'jp', label: 'Japan' },
  { value: 'au', label: 'Australia' },
  { value: 'br', label: 'Brazil' },
  { value: 'in', label: 'India' },
  { value: 'cn', label: 'China' },
];

const frameworks = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue.js' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'nextjs', label: 'Next.js' },
  { value: 'nuxtjs', label: 'Nuxt.js' },
  { value: 'gatsby', label: 'Gatsby' },
  { value: 'remix', label: 'Remix' },
];

const languages = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
];

// Wrapper component for stories
const FormComboboxWrapper = (args: any) => {
  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      country: '',
      framework: '',
      language: '',
    },
  });

  return (
    <Form {...form}>
      <form className="space-y-4 max-w-md">
        <FormCombobox
          {...args}
          control={form.control}
        />
      </form>
    </Form>
  );
};

const meta: Meta<typeof FormCombobox> = {
  title: 'Forms/FormCombobox',
  component: FormComboboxWrapper,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The FormCombobox component provides a searchable dropdown selection with Command component integration.

## Features
- Integration with React Hook Form
- Searchable dropdown with Command component
- Keyboard navigation support
- Accessible labels and descriptions
- Error state styling
- Custom option filtering

## Accessibility
- Proper ARIA labels and descriptions
- Keyboard navigation (Arrow keys, Enter, Escape)
- Screen reader announcements
- Focus management
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'select',
      options: ['country', 'framework', 'language'],
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
    searchPlaceholder: {
      control: 'text',
      description: 'Search input placeholder',
    },
    emptyText: {
      control: 'text',
      description: 'Text shown when no options match',
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
    searchable: {
      control: 'boolean',
      description: 'Whether the dropdown is searchable',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'country',
    label: 'Country',
    placeholder: 'Select a country...',
    searchPlaceholder: 'Search countries...',
    description: 'Choose your country from the list',
    options: countries,
  },
};

export const Required: Story = {
  args: {
    name: 'country',
    label: 'Country',
    placeholder: 'Select a country...',
    description: 'This field is required',
    required: true,
    options: countries,
  },
};

export const WithManyOptions: Story = {
  args: {
    name: 'language',
    label: 'Programming Language',
    placeholder: 'Select a language...',
    searchPlaceholder: 'Search languages...',
    description: 'Choose your preferred programming language',
    options: languages,
  },
  parameters: {
    docs: {
      description: {
        story: 'Combobox with many options demonstrating search functionality.',
      },
    },
  },
};

export const NonSearchable: Story = {
  args: {
    name: 'framework',
    label: 'Framework',
    placeholder: 'Select a framework...',
    description: 'Choose a frontend framework',
    searchable: false,
    options: frameworks,
  },
  parameters: {
    docs: {
      description: {
        story: 'Combobox without search functionality.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    name: 'country',
    label: 'Country',
    placeholder: 'This field is disabled',
    description: 'This field cannot be edited',
    disabled: true,
    options: countries,
  },
};

export const CustomMessages: Story = {
  args: {
    name: 'framework',
    label: 'Framework',
    placeholder: 'Pick your favorite...',
    searchPlaceholder: 'Type to filter...',
    emptyText: 'No frameworks found matching your search.',
    description: 'Custom placeholder and empty message',
    options: frameworks,
  },
  parameters: {
    docs: {
      description: {
        story: 'Combobox with customized placeholder and empty state messages.',
      },
    },
  },
};

export const WithCallback: Story = {
  render: () => {
    const CallbackExample = () => {
      const form = useForm<FormData>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
          framework: '',
        },
      });

      const handleValueChange = (value: string) => {
        console.log('Selected value:', value);
        alert(`You selected: ${frameworks.find(f => f.value === value)?.label || 'None'}`);
      };

      return (
        <Form {...form}>
          <form className="space-y-4 max-w-md">
            <FormCombobox
              name="framework"
              control={form.control}
              label="Framework"
              placeholder="Select a framework..."
              description="Selection will trigger a callback"
              options={frameworks}
              onValueChange={handleValueChange}
            />
          </form>
        </Form>
      );
    };

    return <CallbackExample />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Combobox with value change callback for custom handling.',
      },
    },
  },
};
