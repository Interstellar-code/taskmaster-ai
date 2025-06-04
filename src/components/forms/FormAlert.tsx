import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface FormAlertProps {
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  title?: string;
  description?: string;
  children?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  icon?: React.ReactNode | boolean;
}

/**
 * Enhanced form alert component for displaying messages and notifications
 * 
 * Features:
 * - Multiple variants (success, warning, info, error)
 * - Automatic icons based on variant
 * - Custom icons support
 * - Dismissible functionality
 * - Title and description support
 * - Form-specific styling
 */
export function FormAlert({
  variant = 'default',
  title,
  description,
  children,
  dismissible = false,
  onDismiss,
  className,
  icon = true,
  ...props
}: FormAlertProps) {
  const variantStyles = {
    default: '',
    destructive: '',
    success: 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-400',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400',
    info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400',
  };

  const getIcon = () => {
    if (icon === false) return null;
    if (React.isValidElement(icon)) return icon;

    switch (variant) {
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'destructive':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const alertVariant = ['success', 'warning', 'info'].includes(variant) 
    ? 'default' 
    : variant as 'default' | 'destructive';

  return (
    <Alert
      {...props}
      variant={alertVariant}
      className={cn(
        ['success', 'warning', 'info'].includes(variant) && variantStyles[variant],
        'relative',
        className
      )}
    >
      {getIcon()}
      <div className="flex-1">
        {title && <AlertTitle>{title}</AlertTitle>}
        {description && <AlertDescription>{description}</AlertDescription>}
        {children && !description && <AlertDescription>{children}</AlertDescription>}
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </Alert>
  );
}

FormAlert.displayName = 'FormAlert';
