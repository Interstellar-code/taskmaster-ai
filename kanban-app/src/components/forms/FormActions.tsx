
import { cn } from '@/lib/utils';
import { FormActionsProps } from './types';

/**
 * Reusable form actions component for organizing form buttons
 */
export function FormActions({
  children,
  className,
  align = 'right',
  spacing = 'md',
}: FormActionsProps) {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  const spacingClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  };

  return (
    <div
      className={cn(
        'flex items-center',
        alignmentClasses[align],
        spacingClasses[spacing],
        'pt-4 border-t border-border',
        className
      )}
    >
      {children}
    </div>
  );
}

FormActions.displayName = 'FormActions';
