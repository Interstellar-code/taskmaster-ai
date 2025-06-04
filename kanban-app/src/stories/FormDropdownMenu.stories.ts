import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { FormDropdownMenu } from '@/components/forms/FormDropdownMenu';
import { FormButton } from '@/components/forms/FormButton';
import { 
  Edit, 
  Copy, 
  Paste, 
  Trash2, 
  Archive, 
  Share, 
  Download, 
  Settings,
  MoreHorizontal,
  ChevronDown
} from 'lucide-react';

const meta: Meta<typeof FormDropdownMenu> = {
  title: 'Forms/FormDropdownMenu',
  component: FormDropdownMenu,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The FormDropdownMenu component provides dropdown menus for form actions and selections.

## Features
- Support for different action types (regular, checkbox, radio)
- Nested sub-menus
- Keyboard shortcuts display
- Separators and labels for organization
- Destructive action styling
- Accessibility compliant

## Accessibility
- Keyboard navigation support
- ARIA labels and roles
- Focus management
- Screen reader announcements
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Whether the dropdown menu is disabled',
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end'],
      description: 'Menu alignment relative to trigger',
    },
    side: {
      control: 'select',
      options: ['top', 'right', 'bottom', 'left'],
      description: 'Menu side relative to trigger',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <FormDropdownMenu
      groups={[
        {
          type: 'actions',
          actions: [
            {
              id: 'edit',
              label: 'Edit',
              icon: <Edit className="h-4 w-4" />,
              shortcut: 'Ctrl+E',
              onSelect: () => alert('Edit clicked!'),
            },
            {
              id: 'copy',
              label: 'Copy',
              icon: <Copy className="h-4 w-4" />,
              shortcut: 'Ctrl+C',
              onSelect: () => alert('Copy clicked!'),
            },
            {
              id: 'paste',
              label: 'Paste',
              icon: <Paste className="h-4 w-4" />,
              shortcut: 'Ctrl+V',
              onSelect: () => alert('Paste clicked!'),
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
              icon: <Trash2 className="h-4 w-4" />,
              shortcut: 'Del',
              destructive: true,
              onSelect: () => alert('Delete clicked!'),
            },
          ],
        },
      ]}
    >
      <FormButton variant="outline">
        Actions <ChevronDown className="ml-2 h-4 w-4" />
      </FormButton>
    </FormDropdownMenu>
  ),
};

export const WithSubMenus: Story = {
  render: () => (
    <FormDropdownMenu
      groups={[
        {
          type: 'actions',
          actions: [
            {
              id: 'edit',
              label: 'Edit',
              icon: <Edit className="h-4 w-4" />,
              children: [
                {
                  id: 'rename',
                  label: 'Rename',
                  shortcut: 'F2',
                  onSelect: () => alert('Rename clicked!'),
                },
                {
                  id: 'duplicate',
                  label: 'Duplicate',
                  shortcut: 'Ctrl+D',
                  onSelect: () => alert('Duplicate clicked!'),
                },
                {
                  id: 'properties',
                  label: 'Properties',
                  onSelect: () => alert('Properties clicked!'),
                },
              ],
            },
            {
              id: 'share',
              label: 'Share',
              icon: <Share className="h-4 w-4" />,
              children: [
                {
                  id: 'email',
                  label: 'Send via Email',
                  onSelect: () => alert('Email share clicked!'),
                },
                {
                  id: 'link',
                  label: 'Copy Link',
                  onSelect: () => alert('Copy link clicked!'),
                },
                {
                  id: 'export',
                  label: 'Export',
                  children: [
                    {
                      id: 'pdf',
                      label: 'Export as PDF',
                      onSelect: () => alert('PDF export clicked!'),
                    },
                    {
                      id: 'csv',
                      label: 'Export as CSV',
                      onSelect: () => alert('CSV export clicked!'),
                    },
                  ],
                },
              ],
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
              id: 'download',
              label: 'Download',
              icon: <Download className="h-4 w-4" />,
              onSelect: () => alert('Download clicked!'),
            },
          ],
        },
      ]}
    >
      <FormButton variant="outline">
        More Options <MoreHorizontal className="ml-2 h-4 w-4" />
      </FormButton>
    </FormDropdownMenu>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Dropdown menu with nested sub-menus for complex actions.',
      },
    },
  },
};

export const WithCheckboxes: Story = {
  render: () => {
    const CheckboxMenuExample = () => {
      const [settings, setSettings] = useState({
        notifications: true,
        autoSave: false,
        darkMode: true,
        showTips: false,
      });

      return (
        <FormDropdownMenu
          groups={[
            {
              type: 'label',
              label: 'View Options',
            },
            {
              type: 'checkbox',
              checkboxItems: [
                {
                  id: 'notifications',
                  label: 'Show Notifications',
                  checked: settings.notifications,
                  onCheckedChange: (checked) =>
                    setSettings(prev => ({ ...prev, notifications: checked })),
                },
                {
                  id: 'autoSave',
                  label: 'Auto Save',
                  checked: settings.autoSave,
                  onCheckedChange: (checked) =>
                    setSettings(prev => ({ ...prev, autoSave: checked })),
                },
                {
                  id: 'darkMode',
                  label: 'Dark Mode',
                  checked: settings.darkMode,
                  onCheckedChange: (checked) =>
                    setSettings(prev => ({ ...prev, darkMode: checked })),
                },
                {
                  id: 'showTips',
                  label: 'Show Tips',
                  checked: settings.showTips,
                  onCheckedChange: (checked) =>
                    setSettings(prev => ({ ...prev, showTips: checked })),
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
                  id: 'reset',
                  label: 'Reset to Defaults',
                  destructive: true,
                  onSelect: () => {
                    setSettings({
                      notifications: true,
                      autoSave: false,
                      darkMode: false,
                      showTips: true,
                    });
                    alert('Settings reset!');
                  },
                },
              ],
            },
          ]}
        >
          <FormButton variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </FormButton>
        </FormDropdownMenu>
      );
    };

    return <CheckboxMenuExample />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Dropdown menu with checkbox items for toggling settings.',
      },
    },
  },
};

export const WithRadioButtons: Story = {
  render: () => {
    const RadioMenuExample = () => {
      const [theme, setTheme] = useState('light');
      const [language, setLanguage] = useState('en');

      return (
        <FormDropdownMenu
          groups={[
            {
              type: 'label',
              label: 'Theme',
            },
            {
              type: 'radio',
              radioValue: theme,
              onRadioValueChange: setTheme,
              radioItems: [
                { id: 'light', label: 'Light', value: 'light' },
                { id: 'dark', label: 'Dark', value: 'dark' },
                { id: 'auto', label: 'System', value: 'auto' },
              ],
            },
            {
              type: 'separator',
            },
            {
              type: 'label',
              label: 'Language',
            },
            {
              type: 'radio',
              radioValue: language,
              onRadioValueChange: setLanguage,
              radioItems: [
                { id: 'en', label: 'English', value: 'en' },
                { id: 'es', label: 'Español', value: 'es' },
                { id: 'fr', label: 'Français', value: 'fr' },
                { id: 'de', label: 'Deutsch', value: 'de' },
              ],
            },
          ]}
        >
          <FormButton variant="outline">
            Preferences <ChevronDown className="ml-2 h-4 w-4" />
          </FormButton>
        </FormDropdownMenu>
      );
    };

    return <RadioMenuExample />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Dropdown menu with radio button groups for selecting options.',
      },
    },
  },
};

export const Disabled: Story = {
  render: () => (
    <FormDropdownMenu
      disabled={true}
      groups={[
        {
          type: 'actions',
          actions: [
            {
              id: 'edit',
              label: 'Edit',
              onSelect: () => alert('This should not appear'),
            },
          ],
        },
      ]}
    >
      <FormButton variant="outline" disabled>
        Disabled Menu
      </FormButton>
    </FormDropdownMenu>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Disabled dropdown menu that does not respond to clicks.',
      },
    },
  },
};
