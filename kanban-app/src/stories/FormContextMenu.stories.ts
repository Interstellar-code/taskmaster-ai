import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { FormContextMenu } from '@/components/forms/FormContextMenu';
import { Copy, Paste, Cut, Trash2, Edit, Share, Download, Settings } from 'lucide-react';

const meta: Meta<typeof FormContextMenu> = {
  title: 'Forms/FormContextMenu',
  component: FormContextMenu,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The FormContextMenu component provides right-click context menus for enhanced user interactions.

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
      description: 'Whether the context menu is disabled',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <FormContextMenu
      groups={[
        {
          type: 'actions',
          actions: [
            {
              id: 'copy',
              label: 'Copy',
              icon: <Copy className="h-4 w-4" />,
              shortcut: 'Ctrl+C',
              onSelect: () => alert('Copied!'),
            },
            {
              id: 'paste',
              label: 'Paste',
              icon: <Paste className="h-4 w-4" />,
              shortcut: 'Ctrl+V',
              onSelect: () => alert('Pasted!'),
            },
            {
              id: 'cut',
              label: 'Cut',
              icon: <Cut className="h-4 w-4" />,
              shortcut: 'Ctrl+X',
              onSelect: () => alert('Cut!'),
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
              onSelect: () => alert('Deleted!'),
            },
          ],
        },
      ]}
    >
      <div className="p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center text-sm text-muted-foreground cursor-pointer hover:border-muted-foreground/50 transition-colors">
        Right-click me for basic context menu
      </div>
    </FormContextMenu>
  ),
};

export const WithSubMenus: Story = {
  render: () => (
    <FormContextMenu
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
                  onSelect: () => alert('Rename!'),
                },
                {
                  id: 'duplicate',
                  label: 'Duplicate',
                  shortcut: 'Ctrl+D',
                  onSelect: () => alert('Duplicated!'),
                },
                {
                  id: 'properties',
                  label: 'Properties',
                  onSelect: () => alert('Properties!'),
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
                  onSelect: () => alert('Email shared!'),
                },
                {
                  id: 'link',
                  label: 'Copy Link',
                  onSelect: () => alert('Link copied!'),
                },
                {
                  id: 'export',
                  label: 'Export',
                  children: [
                    {
                      id: 'pdf',
                      label: 'Export as PDF',
                      onSelect: () => alert('PDF exported!'),
                    },
                    {
                      id: 'csv',
                      label: 'Export as CSV',
                      onSelect: () => alert('CSV exported!'),
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
              onSelect: () => alert('Downloaded!'),
            },
          ],
        },
      ]}
    >
      <div className="p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center text-sm text-muted-foreground cursor-pointer hover:border-muted-foreground/50 transition-colors">
        Right-click me for context menu with sub-menus
      </div>
    </FormContextMenu>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Context menu with nested sub-menus.',
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
        <FormContextMenu
          groups={[
            {
              type: 'label',
              label: 'Settings',
            },
            {
              type: 'checkbox',
              checkboxItems: [
                {
                  id: 'notifications',
                  label: 'Enable Notifications',
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
          <div className="p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center text-sm text-muted-foreground cursor-pointer hover:border-muted-foreground/50 transition-colors">
            Right-click me for checkbox menu
            <div className="mt-2 text-xs">
              Current settings: {JSON.stringify(settings, null, 2)}
            </div>
          </div>
        </FormContextMenu>
      );
    };

    return <CheckboxMenuExample />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Context menu with checkbox items for toggling settings.',
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
        <FormContextMenu
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
                { id: 'auto', label: 'Auto', value: 'auto' },
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
          <div className="p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center text-sm text-muted-foreground cursor-pointer hover:border-muted-foreground/50 transition-colors">
            Right-click me for radio menu
            <div className="mt-2 text-xs">
              Theme: {theme}, Language: {language}
            </div>
          </div>
        </FormContextMenu>
      );
    };

    return <RadioMenuExample />;
  },
  parameters: {
    docs: {
      description: {
        story: 'Context menu with radio button groups for selecting options.',
      },
    },
  },
};

export const Disabled: Story = {
  render: () => (
    <FormContextMenu
      disabled={true}
      groups={[
        {
          type: 'actions',
          actions: [
            {
              id: 'copy',
              label: 'Copy',
              onSelect: () => alert('This should not appear'),
            },
          ],
        },
      ]}
    >
      <div className="p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center text-sm text-muted-foreground cursor-pointer hover:border-muted-foreground/50 transition-colors">
        Right-click me (context menu is disabled)
      </div>
    </FormContextMenu>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Disabled context menu that does not respond to right-clicks.',
      },
    },
  },
};
