import React from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export interface FormToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  duration?: number;
  action?: React.ReactNode;
}

/**
 * Enhanced toast hook for form-specific notifications
 */
export function useFormToast() {
  const { toast } = useToast();

  const showToast = React.useCallback((options: FormToastOptions) => {
    const { variant = 'default', title, description, duration, action } = options;

    const getIcon = () => {
      switch (variant) {
        case 'success':
          return <CheckCircle className="h-4 w-4 text-green-600" />;
        case 'warning':
          return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
        case 'info':
          return <Info className="h-4 w-4 text-blue-600" />;
        case 'destructive':
          return <AlertCircle className="h-4 w-4 text-red-600" />;
        default:
          return <Info className="h-4 w-4" />;
      }
    };

    const toastVariant = variant === 'success' || variant === 'warning' || variant === 'info' 
      ? 'default' 
      : variant;

    toast({
      variant: toastVariant,
      title: (
        <div className="flex items-center gap-2">
          {getIcon()}
          <span>{title}</span>
        </div>
      ),
      description,
      duration,
      action,
      className: cn(
        variant === 'success' && 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-400',
        variant === 'warning' && 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400',
        variant === 'info' && 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400'
      ),
    });
  }, [toast]);

  const showSuccess = React.useCallback((title: string, description?: string, duration?: number) => {
    showToast({ variant: 'success', title, description, duration });
  }, [showToast]);

  const showError = React.useCallback((title: string, description?: string, duration?: number) => {
    showToast({ variant: 'destructive', title, description, duration });
  }, [showToast]);

  const showWarning = React.useCallback((title: string, description?: string, duration?: number) => {
    showToast({ variant: 'warning', title, description, duration });
  }, [showToast]);

  const showInfo = React.useCallback((title: string, description?: string, duration?: number) => {
    showToast({ variant: 'info', title, description, duration });
  }, [showToast]);

  return {
    toast: showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}

/**
 * Form toast component for displaying notifications
 */
export function FormToast() {
  return null;
}

FormToast.displayName = 'FormToast';
