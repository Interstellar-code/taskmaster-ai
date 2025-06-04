import { ReactNode } from 'react';
import { FieldPath, FieldValues, Control } from 'react-hook-form';

/**
 * Base props for all form components
 */
export interface BaseFormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName;
  control?: Control<TFieldValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

/**
 * Option type for select components
 */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/**
 * Props for select components
 */
export interface FormSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends BaseFormFieldProps<TFieldValues, TName> {
  options: SelectOption[];
  emptyText?: string;
}

/**
 * Props for input components
 */
export interface FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends BaseFormFieldProps<TFieldValues, TName> {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Props for textarea components
 */
export interface FormTextareaProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends BaseFormFieldProps<TFieldValues, TName> {
  rows?: number;
  resize?: boolean;
}

/**
 * Props for checkbox components
 */
export interface FormCheckboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends BaseFormFieldProps<TFieldValues, TName> {
  checkboxLabel?: string;
}

/**
 * Props for date picker components
 */
export interface FormDatePickerProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends BaseFormFieldProps<TFieldValues, TName> {
  showTime?: boolean;
  minDate?: Date;
  maxDate?: Date;
  dateFormat?: string;
}

/**
 * Props for combobox components
 */
export interface FormComboboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends BaseFormFieldProps<TFieldValues, TName> {
  options: SelectOption[];
  searchable?: boolean;
  emptyText?: string;
  searchPlaceholder?: string;
  onValueChange?: (value: string) => void;
}

/**
 * Props for multi-select components
 */
export interface FormMultiSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends BaseFormFieldProps<TFieldValues, TName> {
  options: SelectOption[];
  maxSelections?: number;
  emptyText?: string;
}

/**
 * Props for tag input components
 */
export interface FormTagInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends BaseFormFieldProps<TFieldValues, TName> {
  suggestions?: string[];
  maxTags?: number;
  allowCustomTags?: boolean;
}

/**
 * Props for form section components
 */
export interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

/**
 * Props for form actions components
 */
export interface FormActionsProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  spacing?: 'sm' | 'md' | 'lg';
}

/**
 * Task form data interface (matching the API types)
 */
export interface TaskFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'done' | 'review' | 'blocked' | 'deferred' | 'cancelled';
  dependencies: string[];
  tags: string[];
  estimatedHours?: number;
  assignee?: string;
  dueDate?: Date;
  details?: string;
  testStrategy?: string;
}
