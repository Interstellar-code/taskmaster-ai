import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuShortcut,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

export interface ContextMenuAction {
  /** Unique identifier for the action */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Keyboard shortcut */
  shortcut?: string;
  /** Whether action is disabled */
  disabled?: boolean;
  /** Whether action is destructive */
  destructive?: boolean;
  /** Action handler */
  onSelect?: () => void;
  /** Sub-menu items */
  children?: ContextMenuAction[];
}

export interface ContextMenuCheckboxAction {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Whether checked */
  checked: boolean;
  /** Change handler */
  onCheckedChange: (checked: boolean) => void;
  /** Whether disabled */
  disabled?: boolean;
}

export interface ContextMenuRadioAction {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Radio value */
  value: string;
  /** Whether disabled */
  disabled?: boolean;
}

export interface ContextMenuGroup {
  /** Group type */
  type: 'actions' | 'checkbox' | 'radio' | 'separator' | 'label';
  /** Group label (for label type) */
  label?: string;
  /** Actions in group */
  actions?: ContextMenuAction[];
  /** Checkbox items */
  checkboxItems?: ContextMenuCheckboxAction[];
  /** Radio items */
  radioItems?: ContextMenuRadioAction[];
  /** Radio group value (for radio type) */
  radioValue?: string;
  /** Radio group change handler */
  onRadioValueChange?: (value: string) => void;
}

export interface FormContextMenuProps {
  /** Element that triggers the context menu */
  children: React.ReactNode;
  /** Menu groups */
  groups: ContextMenuGroup[];
  /** Custom className */
  className?: string;
  /** Whether menu is disabled */
  disabled?: boolean;
}

/**
 * Reusable context menu component for right-click interactions
 * 
 * Features:
 * - Support for different action types (regular, checkbox, radio)
 * - Nested sub-menus
 * - Keyboard shortcuts display
 * - Separators and labels for organization
 * - Destructive action styling
 * - Accessibility compliant
 */
export function FormContextMenu({
  children,
  groups,
  className,
  disabled = false,
}: FormContextMenuProps) {
  const renderAction = (action: ContextMenuAction) => {
    if (action.children && action.children.length > 0) {
      return (
        <ContextMenuSub key={action.id}>
          <ContextMenuSubTrigger
            disabled={action.disabled}
            className={cn(
              action.destructive && 'text-red-600 focus:text-red-600',
              'flex items-center gap-2'
            )}
          >
            {action.icon && <span className="w-4 h-4">{action.icon}</span>}
            {action.label}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {action.children.map(renderAction)}
          </ContextMenuSubContent>
        </ContextMenuSub>
      );
    }

    return (
      <ContextMenuItem
        key={action.id}
        disabled={action.disabled}
        onSelect={action.onSelect}
        className={cn(
          action.destructive && 'text-red-600 focus:text-red-600',
          'flex items-center gap-2'
        )}
      >
        {action.icon && <span className="w-4 h-4">{action.icon}</span>}
        <span className="flex-1">{action.label}</span>
        {action.shortcut && (
          <ContextMenuShortcut>{action.shortcut}</ContextMenuShortcut>
        )}
      </ContextMenuItem>
    );
  };

  const renderGroup = (group: ContextMenuGroup, index: number) => {
    const isLastGroup = index === groups.length - 1;

    switch (group.type) {
      case 'label':
        return (
          <React.Fragment key={`group-${index}`}>
            <ContextMenuLabel>{group.label}</ContextMenuLabel>
            {!isLastGroup && <ContextMenuSeparator />}
          </React.Fragment>
        );

      case 'separator':
        return <ContextMenuSeparator key={`separator-${index}`} />;

      case 'checkbox':
        return (
          <React.Fragment key={`checkbox-group-${index}`}>
            {group.checkboxItems?.map((item) => (
              <ContextMenuCheckboxItem
                key={item.id}
                checked={item.checked}
                onCheckedChange={item.onCheckedChange}
                disabled={item.disabled}
              >
                {item.label}
              </ContextMenuCheckboxItem>
            ))}
            {!isLastGroup && <ContextMenuSeparator />}
          </React.Fragment>
        );

      case 'radio':
        return (
          <React.Fragment key={`radio-group-${index}`}>
            <ContextMenuRadioGroup
              value={group.radioValue}
              onValueChange={group.onRadioValueChange}
            >
              {group.radioItems?.map((item) => (
                <ContextMenuRadioItem
                  key={item.id}
                  value={item.value}
                  disabled={item.disabled}
                >
                  {item.label}
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
            {!isLastGroup && <ContextMenuSeparator />}
          </React.Fragment>
        );

      case 'actions':
      default:
        return (
          <React.Fragment key={`actions-group-${index}`}>
            {group.actions?.map(renderAction)}
            {!isLastGroup && <ContextMenuSeparator />}
          </React.Fragment>
        );
    }
  };

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className={cn('w-56', className)}>
        {groups.map(renderGroup)}
      </ContextMenuContent>
    </ContextMenu>
  );
}

FormContextMenu.displayName = 'FormContextMenu';
