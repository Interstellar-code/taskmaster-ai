import React from 'react';
import { FieldValues } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { FormCheckboxProps } from './types';

/**
 * Reusable form checkbox component with validation
 * 
 * Features:
 * - Integration with React Hook Form
 * - Built-in validation display
 * - Accessible labels and descriptions
 * - Error state styling
 * - Support for custom checkbox labels
 */
export function FormCheckbox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends keyof TFieldValues = keyof TFieldValues
>({
  name,
  control,
  label,
  description,
  disabled = false,
  required = false,
  className,
  checkboxLabel,
}: FormCheckboxProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={cn('space-y-2', className)}>
          {label && (
            <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
              {label}
            </FormLabel>
          )}
          <div className="flex items-center space-x-2">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={disabled}
                className={cn(
                  fieldState.error && 'border-red-500 data-[state=checked]:bg-red-500',
                  'transition-colors'
                )}
                aria-invalid={!!fieldState.error}
                aria-describedby={
                  description ? `${name}-description` : undefined
                }
              />
            </FormControl>
            {checkboxLabel && (
              <label
                htmlFor={field.name}
                className={cn(
                  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                  fieldState.error && 'text-red-500'
                )}
              >
                {checkboxLabel}
                {required && <span className="ml-0.5 text-red-500">*</span>}
              </label>
            )}
          </div>
          {description && (
            <FormDescription id={`${name}-description`}>
              {description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

FormCheckbox.displayName = 'FormCheckbox';
