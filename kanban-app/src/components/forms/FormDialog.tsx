import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FormDialogProps {
  /** Trigger element that opens the dialog */
  trigger?: React.ReactNode;
  /** Dialog title */
  title?: string;
  /** Dialog description */
  description?: string;
  /** Dialog content */
  children: React.ReactNode;
  /** Footer actions */
  footer?: React.ReactNode;
  /** Whether dialog is open (controlled mode) */
  open?: boolean;
  /** Callback when dialog open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Maximum width of dialog */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  /** Whether dialog can be closed by clicking outside or pressing escape */
  closable?: boolean;
  /** Custom className for dialog content */
  className?: string;
  /** Whether to show close button */
  showCloseButton?: boolean;
}

/**
 * Reusable dialog component for forms, confirmations, and modals
 * 
 * Features:
 * - Controlled and uncontrolled modes
 * - Customizable trigger element
 * - Flexible content and footer
 * - Responsive sizing options
 * - Accessibility compliant
 * - Keyboard navigation support
 */
export function FormDialog({
  trigger,
  title,
  description,
  children,
  footer,
  open,
  onOpenChange,
  maxWidth = 'md',
  closable = true,
  className,
  showCloseButton = true,
}: FormDialogProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  };

  const dialogContent = (
    <DialogContent
      className={cn(
        maxWidthClasses[maxWidth],
        'w-full',
        className
      )}
      onPointerDownOutside={closable ? undefined : (e) => e.preventDefault()}
      onEscapeKeyDown={closable ? undefined : (e) => e.preventDefault()}
    >
      {(title || description) && (
        <DialogHeader>
          {title && (
            <DialogTitle className="text-lg font-semibold">
              {title}
            </DialogTitle>
          )}
          {description && (
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
      )}
      
      <div className="py-4">
        {children}
      </div>
      
      {footer && (
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          {footer}
        </DialogFooter>
      )}
    </DialogContent>
  );

  // If no trigger is provided, render as controlled dialog
  if (!trigger) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {dialogContent}
      </Dialog>
    );
  }

  // Render with trigger (uncontrolled or controlled)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}

/**
 * Confirmation dialog component for destructive actions
 */
export interface ConfirmDialogProps {
  /** Trigger element */
  trigger: React.ReactNode;
  /** Confirmation title */
  title: string;
  /** Confirmation message */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Confirm button variant */
  confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel?: () => void;
  /** Whether action is loading */
  loading?: boolean;
}

export function ConfirmDialog({
  trigger,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'destructive',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  const handleCancel = () => {
    onCancel?.();
    setOpen(false);
  };

  return (
    <FormDialog
      trigger={trigger}
      title={title}
      description={message}
      open={open}
      onOpenChange={setOpen}
      maxWidth="sm"
      footer={
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            {loading ? 'Processing...' : confirmText}
          </Button>
        </div>
      }
    >
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          This action cannot be undone.
        </p>
      </div>
    </FormDialog>
  );
}

FormDialog.displayName = 'FormDialog';
ConfirmDialog.displayName = 'ConfirmDialog';
