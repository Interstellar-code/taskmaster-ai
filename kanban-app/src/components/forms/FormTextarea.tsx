import { FieldValues, FieldPath } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { FormTextareaProps } from './types';

/**
 * Reusable form textarea component with validation
 * 
 * Features:
 * - Integration with React Hook Form
 * - Built-in validation display
 * - Configurable rows and resize behavior
 * - Accessible labels and descriptions
 * - Error state styling
 */
export function FormTextarea<
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
  rows = 3,
  resize = true,
}: FormTextareaProps<TFieldValues, TName>) {
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
            <Textarea
              {...field}
              placeholder={placeholder}
              disabled={disabled}
              rows={rows}
              className={cn(
                fieldState.error && 'border-red-500 focus-visible:ring-red-500',
                !resize && 'resize-none',
                'transition-colors'
              )}
              aria-invalid={!!fieldState.error}
              aria-describedby={
                description ? `${String(name)}-description` : undefined
              }
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

FormTextarea.displayName = 'FormTextarea';
