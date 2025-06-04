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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FormSelectProps } from './types';

/**
 * Reusable form select component with validation
 * 
 * Features:
 * - Integration with React Hook Form
 * - Built-in validation display
 * - Support for option groups
 * - Accessible labels and descriptions
 * - Error state styling
 * - Empty state handling
 */
export function FormSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends keyof TFieldValues = keyof TFieldValues
>({
  name,
  control,
  label,
  description,
  placeholder,
  disabled = false,
  required = false,
  className,
  options,
  emptyText = 'No options available',
}: FormSelectProps<TFieldValues, TName>) {
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
          <Select
            onValueChange={field.onChange}
            defaultValue={field.value}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger
                className={cn(
                  fieldState.error && 'border-red-500 focus:ring-red-500',
                  'transition-colors'
                )}
                aria-invalid={!!fieldState.error}
                aria-describedby={
                  description ? `${name}-description` : undefined
                }
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.length === 0 ? (
                <SelectItem value="" disabled>
                  {emptyText}
                </SelectItem>
              ) : (
                options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
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

FormSelect.displayName = 'FormSelect';
