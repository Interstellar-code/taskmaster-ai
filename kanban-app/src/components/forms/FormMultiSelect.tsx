import React, { useState } from 'react';
import { FieldValues } from 'react-hook-form';
import { Check, X, ChevronDown } from 'lucide-react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { FormMultiSelectProps } from './types';

/**
 * Reusable form multi-select component
 */
export function FormMultiSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends keyof TFieldValues = keyof TFieldValues
>({
  name,
  control,
  label,
  description,
  placeholder = 'Select options...',
  disabled = false,
  required = false,
  className,
  options,
  maxSelections,
  emptyText = 'No options available',
}: FormMultiSelectProps<TFieldValues, TName>) {
  const [open, setOpen] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selectedValues = field.value || [];
        const selectedOptions = options.filter(option => 
          selectedValues.includes(option.value)
        );

        const toggleOption = (optionValue: string) => {
          const currentValues = field.value || [];
          const newValues = currentValues.includes(optionValue)
            ? currentValues.filter((value: string) => value !== optionValue)
            : maxSelections && currentValues.length >= maxSelections
            ? currentValues
            : [...currentValues, optionValue];
          
          field.onChange(newValues);
        };

        const removeOption = (optionValue: string) => {
          const newValues = (field.value || []).filter((value: string) => value !== optionValue);
          field.onChange(newValues);
        };

        return (
          <FormItem className={cn('space-y-2', className)}>
            {label && (
              <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
                {label}
              </FormLabel>
            )}
            <div className="space-y-2">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className={cn(
                        'w-full justify-between',
                        selectedValues.length === 0 && 'text-muted-foreground',
                        fieldState.error && 'border-red-500 focus:ring-red-500',
                        'transition-colors'
                      )}
                      disabled={disabled}
                    >
                      {selectedValues.length === 0
                        ? placeholder
                        : `${selectedValues.length} selected`}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <div className="max-h-60 overflow-auto p-1">
                    {options.length === 0 ? (
                      <div className="py-6 text-center text-sm">{emptyText}</div>
                    ) : (
                      options.map((option) => {
                        const isSelected = selectedValues.includes(option.value);
                        const isDisabled = option.disabled || 
                          (maxSelections && !isSelected && selectedValues.length >= maxSelections);

                        return (
                          <div
                            key={option.value}
                            className={cn(
                              'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                              isDisabled 
                                ? 'opacity-50 cursor-not-allowed' 
                                : 'hover:bg-accent hover:text-accent-foreground cursor-pointer',
                              isSelected && 'bg-accent text-accent-foreground'
                            )}
                            onClick={() => !isDisabled && toggleOption(option.value)}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                isSelected ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {option.label}
                          </div>
                        );
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Selected items display */}
              {selectedOptions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedOptions.map((option) => (
                    <Badge
                      key={option.value}
                      variant="secondary"
                      className="text-xs"
                    >
                      {option.label}
                      <button
                        type="button"
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            removeOption(option.value);
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() => removeOption(option.value)}
                        disabled={disabled}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {description && (
              <FormDescription id={`${name}-description`}>
                {description}
                {maxSelections && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    Maximum {maxSelections} selections allowed
                  </span>
                )}
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

FormMultiSelect.displayName = 'FormMultiSelect';
