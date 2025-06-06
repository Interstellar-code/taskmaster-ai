import { FieldValues, FieldPath } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FormInputProps } from './types';

/**
 * Reusable form input component with validation
 * 
 * Features:
 * - Integration with React Hook Form
 * - Built-in validation display
 * - Support for different input types
 * - Accessible labels and descriptions
 * - Error state styling
 */
export function FormInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  label,
  description,
  placeholder,
  disabled = false,
  required = false,
  className,
  type = 'text',
  min,
  max,
  step,
}: FormInputProps<TFieldValues, TName>) {
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
          <FormControl>
            <Input
              {...field}
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              min={min}
              max={max}
              step={step}
              className={cn(
                fieldState.error && 'border-red-500 focus-visible:ring-red-500',
                'transition-colors'
              )}
              aria-invalid={!!fieldState.error}
              aria-describedby={
                description ? `${String(name)}-description` : undefined
              }
              onChange={(e) => {
                // Handle number inputs properly
                if (type === 'number') {
                  const value = e.target.value;
                  // Convert to number if value exists, otherwise undefined
                  field.onChange(value === '' ? undefined : Number(value));
                } else {
                  field.onChange(e.target.value);
                }
              }}
              value={field.value ?? ''}
            />
          </FormControl>
          {description && (
            <FormDescription id={`${String(name)}-description`}>
              {description}
            </FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

FormInput.displayName = 'FormInput';
