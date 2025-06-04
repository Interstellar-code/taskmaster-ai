import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface DropdownMenuAction {
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
  children?: DropdownMenuAction[];
}

export interface DropdownMenuCheckboxAction {
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

export interface DropdownMenuRadioAction {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Radio value */
  value: string;
  /** Whether disabled */
  disabled?: boolean;
}

export interface DropdownMenuGroup {
  /** Group type */
  type: 'actions' | 'checkbox' | 'radio' | 'separator' | 'label';
  /** Group label (for label type) */
  label?: string;
  /** Actions in group */
  actions?: DropdownMenuAction[];
  /** Checkbox items */
  checkboxItems?: DropdownMenuCheckboxAction[];
  /** Radio items */
  radioItems?: DropdownMenuRadioAction[];
  /** Radio group value (for radio type) */
  radioValue?: string;
  /** Radio group change handler */
  onRadioValueChange?: (value: string) => void;
}

export interface FormDropdownMenuProps {
  /** Element that triggers the dropdown menu */
  children: React.ReactNode;
  /** Menu groups */
  groups: DropdownMenuGroup[];
  /** Custom className */
  className?: string;
  /** Whether menu is disabled */
  disabled?: boolean;
  /** Menu alignment */
  align?: 'start' | 'center' | 'end';
  /** Menu side */
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Reusable dropdown menu component for form actions and selections
 * 
 * Features:
 * - Support for different action types (regular, checkbox, radio)
 * - Nested sub-menus
 * - Keyboard shortcuts display
 * - Separators and labels for organization
 * - Destructive action styling
 * - Accessibility compliant
 */
export function FormDropdownMenu({
  children,
  groups,
  className,
  disabled = false,
  align = 'start',
  side = 'bottom',
}: FormDropdownMenuProps) {
  const renderAction = (action: DropdownMenuAction) => {
    if (action.children && action.children.length > 0) {
      return (
        <DropdownMenuSub key={action.id}>
          <DropdownMenuSubTrigger
            disabled={action.disabled}
            className={cn(
              action.destructive && 'text-red-600 focus:text-red-600',
              'flex items-center gap-2'
            )}
          >
            {action.icon && <span className="w-4 h-4">{action.icon}</span>}
            {action.label}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {action.children.map(renderAction)}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }

    return (
      <DropdownMenuItem
        key={action.id}
        disabled={action.disabled}
        onSelect={action.onSelect}
        className={cn(
          action.destructive && 'text-red-600 focus:text-red-600',
          'flex items-center gap-2 cursor-pointer'
        )}
      >
        {action.icon && <span className="w-4 h-4">{action.icon}</span>}
        <span className="flex-1">{action.label}</span>
        {action.shortcut && (
          <DropdownMenuShortcut>{action.shortcut}</DropdownMenuShortcut>
        )}
      </DropdownMenuItem>
    );
  };

  const renderGroup = (group: DropdownMenuGroup, index: number) => {
    const isLastGroup = index === groups.length - 1;

    switch (group.type) {
      case 'label':
        return (
          <React.Fragment key={`group-${index}`}>
            <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
            {!isLastGroup && <DropdownMenuSeparator />}
          </React.Fragment>
        );

      case 'separator':
        return <DropdownMenuSeparator key={`separator-${index}`} />;

      case 'checkbox':
        return (
          <React.Fragment key={`checkbox-group-${index}`}>
            {group.checkboxItems?.map((item) => (
              <DropdownMenuCheckboxItem
                key={item.id}
                checked={item.checked}
                onCheckedChange={item.onCheckedChange}
                disabled={item.disabled}
                className="cursor-pointer"
              >
                {item.label}
              </DropdownMenuCheckboxItem>
            ))}
            {!isLastGroup && <DropdownMenuSeparator />}
          </React.Fragment>
        );

      case 'radio':
        return (
          <React.Fragment key={`radio-group-${index}`}>
            <DropdownMenuRadioGroup
              value={group.radioValue}
              onValueChange={group.onRadioValueChange}
            >
              {group.radioItems?.map((item) => (
                <DropdownMenuRadioItem
                  key={item.id}
                  value={item.value}
                  disabled={item.disabled}
                  className="cursor-pointer"
                >
                  {item.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {!isLastGroup && <DropdownMenuSeparator />}
          </React.Fragment>
        );

      case 'actions':
      default:
        return (
          <React.Fragment key={`actions-group-${index}`}>
            {group.actions?.map(renderAction)}
            {!isLastGroup && <DropdownMenuSeparator />}
          </React.Fragment>
        );
    }
  };

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className={cn('w-56', className)}
        align={align}
        side={side}
      >
        {groups.map(renderGroup)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

FormDropdownMenu.displayName = 'FormDropdownMenu';
