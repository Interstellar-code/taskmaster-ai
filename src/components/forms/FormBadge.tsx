import React from 'react';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FormBadgeProps extends Omit<BadgeProps, 'variant'> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  pulse?: boolean;
}

/**
 * Enhanced form badge component for status indicators and tags
 * 
 * Features:
 * - Multiple variants including custom success, warning, info
 * - Different sizes
 * - Icon support
 * - Removable functionality
 * - Pulse animation for active states
 * - Form-specific styling
 */
export function FormBadge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  removable = false,
  onRemove,
  pulse = false,
  className,
  ...props
}: FormBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 h-5',
    md: 'text-xs px-2 py-1 h-6',
    lg: 'text-sm px-2.5 py-1 h-7',
  };

  const variantClasses = {
    default: '',
    secondary: '',
    destructive: '',
    outline: '',
    success: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300',
    info: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300',
  };

  const badgeVariant = ['success', 'warning', 'info'].includes(variant) 
    ? 'secondary' 
    : variant as BadgeProps['variant'];

  return (
    <Badge
      {...props}
      variant={badgeVariant}
      className={cn(
        sizeClasses[size],
        ['success', 'warning', 'info'].includes(variant) && variantClasses[variant],
        pulse && 'animate-pulse',
        'inline-flex items-center gap-1',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 flex-shrink-0 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Remove"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </Badge>
  );
}

FormBadge.displayName = 'FormBadge';
