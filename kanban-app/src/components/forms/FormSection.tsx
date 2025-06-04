import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormSectionProps } from './types';

/**
 * Reusable form section component for organizing form fields
 */
export function FormSection({
  title,
  description,
  children,
  className,
  collapsible = false,
  defaultCollapsed = false,
}: FormSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const toggleCollapsed = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <div
              className={cn(
                'flex items-center gap-2',
                collapsible && 'cursor-pointer select-none'
              )}
              onClick={toggleCollapsed}
            >
              {collapsible && (
                <div className="flex-shrink-0">
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              )}
              <h3 className="text-lg font-semibold leading-none tracking-tight">
                {title}
              </h3>
            </div>
          )}
          {description && !isCollapsed && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      
      {!isCollapsed && (
        <div className="space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

FormSection.displayName = 'FormSection';
