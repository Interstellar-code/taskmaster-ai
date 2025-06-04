import type { Meta, StoryObj } from '@storybook/react';
import { FormDemo } from '@/components/forms/FormDemo';

const meta: Meta<typeof FormDemo> = {
  title: 'Forms/Complete Form Demo',
  component: FormDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# TaskMaster Form Components Library

This is a comprehensive demonstration of all reusable form components built for the TaskMaster Kanban application.

## Component Categories

### Core Input Components
- **FormInput**: Text, email, number, password inputs with validation
- **FormTextarea**: Multi-line text input with auto-resize
- **FormSelect**: Dropdown selection with search
- **FormCheckbox**: Boolean input with custom styling
- **FormDatePicker**: Date selection with calendar popup

### Advanced Components  
- **FormCombobox**: Searchable dropdown with custom options
- **FormMultiSelect**: Multiple selection with tags
- **FormTagInput**: Dynamic tag creation and management

### Layout Components
- **FormSection**: Organized form sections with titles
- **FormActions**: Button groups for form actions

### Action & Display Components
- **FormButton**: Enhanced buttons with loading states and icons
- **FormBadge**: Status indicators and tags
- **FormAlert**: Contextual messages and notifications
- **FormToast**: Global notification system

### Dialog & Context Components
- **FormDialog**: Modal dialogs for forms and confirmations
- **ConfirmDialog**: Specialized confirmation dialogs
- **FormContextMenu**: Right-click context menus

## Features

### Validation & Error Handling
- Built-in Zod schema validation
- Real-time error display
- Accessible error announcements
- Field-level validation feedback

### Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader optimized
- Focus management
- ARIA labels and descriptions

### Design System
- Consistent with shadcn/ui design tokens
- Responsive layouts
- Dark mode support
- Customizable themes
- Tailwind CSS integration

### Developer Experience
- TypeScript support with strict typing
- React Hook Form integration
- Comprehensive documentation
- Storybook examples
- Automated testing with Vitest

## Usage

All components are designed to work together seamlessly and can be imported individually or as a complete set:

\`\`\`tsx
import {
  FormInput,
  FormButton,
  FormDialog,
  FormContextMenu,
  // ... other components
} from '@/components/forms';
\`\`\`

Each component includes comprehensive TypeScript types, validation schemas, and accessibility features out of the box.
        `,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const CompleteDemo: Story = {
  parameters: {
    docs: {
      description: {
        story: `
This story showcases all form components in a single, interactive demo. 

**Features demonstrated:**
- All input types with validation
- Action buttons with different states
- Dialog and context menu interactions
- Toast notifications
- Form sections and layout
- Error handling and accessibility

**Try the following:**
1. Fill out the form fields to see validation in action
2. Click the various buttons to see different states
3. Open dialogs to see modal interactions
4. Right-click the context menu area
5. Trigger toast notifications
6. Submit the form to see the complete workflow

This demo represents a real-world form implementation using all the available components.
        `,
      },
    },
  },
};
