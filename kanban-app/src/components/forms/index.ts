/**
 * Reusable Form Components Library
 * 
 * This module exports all reusable form components for the TaskMaster Kanban application.
 * Components are built using shadcn/ui and React Hook Form with Zod validation.
 */

// Core form components
export { FormInput } from './FormInput';
export { FormTextarea } from './FormTextarea';
export { FormSelect } from './FormSelect';
export { FormCheckbox } from './FormCheckbox';
export { FormDatePicker } from './FormDatePicker';

// Advanced components
export { FormCombobox } from './FormCombobox';
export { FormMultiCombobox } from './FormMultiCombobox';
export { FormMultiSelect } from './FormMultiSelect';
export { FormTagInput } from './FormTagInput';

// Layout and container components
export { FormSection } from './FormSection';
export { FormActions } from './FormActions';

// Action and display components
export { FormButton } from './FormButton';
export { FormBadge } from './FormBadge';
export { FormAlert } from './FormAlert';
export { FormToast, useFormToast } from './FormToast';

// Dialog and context menu components
export { FormDialog, ConfirmDialog } from './FormDialog';
export { FormContextMenu } from './FormContextMenu';
export { FormDropdownMenu } from './FormDropdownMenu';

// Complete form examples
export { TaskCreateModal } from './TaskCreateModal';
export { TaskEditModal } from './TaskEditModal';
export { TaskDeleteDialog } from './TaskDeleteDialog';
export { PRDUploadModal } from './PRDUploadModal';
export { FormFileUpload } from './FormFileUpload';
export { FormDemo } from './FormDemo';

// Validation schemas
export * from './schemas';

// Types (excluding TaskFormData to avoid duplicate export)
export type {
  BaseFormFieldProps,
  SelectOption,
  FormSelectProps,
  FormInputProps,
  FormTextareaProps,
  FormCheckboxProps,
  FormDatePickerProps,
  FormComboboxProps,
  FormMultiComboboxProps,
  FormMultiSelectProps,
  FormTagInputProps,
  FormSectionProps,
  FormActionsProps
} from './types';
