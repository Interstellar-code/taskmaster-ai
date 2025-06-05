import { FieldValues, FieldPath } from 'react-hook-form';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { FormDatePickerProps } from './types';

/**
 * Reusable form date picker component with validation
 * 
 * Features:
 * - Integration with React Hook Form
 * - Built-in validation display
 * - Calendar popup interface
 * - Date range restrictions
 * - Accessible labels and descriptions
 * - Error state styling
 */
export function FormDatePicker<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  label,
  description,
  placeholder = 'Pick a date',
  disabled = false,
  required = false,
  className,
  minDate,
  maxDate,
  dateFormat = 'PPP',
}: FormDatePickerProps<TFieldValues, TName>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className={cn('flex flex-col space-y-2', className)}>
          {label && (
            <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
              {label}
            </FormLabel>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full pl-3 text-left font-normal',
                    !field.value && 'text-muted-foreground',
                    fieldState.error && 'border-red-500 focus:ring-red-500',
                    'transition-colors'
                  )}
                  disabled={disabled}
                  aria-invalid={!!fieldState.error}
                  aria-describedby={
                    description ? `${String(name)}-description` : undefined
                  }
                >
                  {field.value ? (
                    format(field.value, dateFormat)
                  ) : (
                    <span>{placeholder}</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                disabled={(date) => {
                  if (disabled) return true;
                  if (minDate && date < minDate) return true;
                  if (maxDate && date > maxDate) return true;
                  return false;
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
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

FormDatePicker.displayName = 'FormDatePicker';
