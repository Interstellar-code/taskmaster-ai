import React, { useState } from 'react';
import { FieldValues } from 'react-hook-form';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FormMultiComboboxProps } from './types';

/**
 * Reusable form multi-combobox component with search functionality
 * 
 * Features:
 * - Integration with React Hook Form
 * - Multi-selection with badges
 * - Built-in search/filter functionality
 * - Customizable options
 * - Validation display
 * - Accessible labels and descriptions
 * - Error state styling
 * - Text truncation for long selections
 */
export function FormMultiCombobox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends keyof TFieldValues = keyof TFieldValues
>({
  name,
  control,
  label,
  description,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found.',
  options = [],
  disabled = false,
  required = false,
  className,
  maxSelections,
  showSelectedCount = true,
}: FormMultiComboboxProps<TFieldValues, TName>) {
  const [open, setOpen] = useState(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selectedValues = Array.isArray(field.value) ? field.value : [];
        const selectedOptions = options.filter(option => 
          selectedValues.includes(option.value)
        );

        const handleSelect = (optionValue: string) => {
          const currentValues = Array.isArray(field.value) ? field.value : [];
          let newValues;
          
          if (currentValues.includes(optionValue)) {
            // Remove if already selected
            newValues = currentValues.filter(value => value !== optionValue);
          } else {
            // Add if not selected (check max limit)
            if (maxSelections && currentValues.length >= maxSelections) {
              return; // Don't add if max reached
            }
            newValues = [...currentValues, optionValue];
          }
          
          field.onChange(newValues);
        };

        const removeSelection = (optionValue: string) => {
          const currentValues = Array.isArray(field.value) ? field.value : [];
          const newValues = currentValues.filter(value => value !== optionValue);
          field.onChange(newValues);
        };

        const getDisplayText = () => {
          if (selectedOptions.length === 0) {
            return placeholder;
          }
          
          if (showSelectedCount && selectedOptions.length > 2) {
            return `${selectedOptions.length} selected`;
          }
          
          return selectedOptions.map(option => option.label).join(', ');
        };

        return (
          <FormItem className={cn('flex flex-col space-y-2', className)}>
            {label && (
              <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
                {label}
              </FormLabel>
            )}
            
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                      'w-full justify-between min-h-10',
                      selectedValues.length === 0 && 'text-muted-foreground',
                      fieldState.error && 'border-red-500 focus:ring-red-500',
                      'transition-colors'
                    )}
                    disabled={disabled}
                  >
                    <span className="truncate text-left">
                      {getDisplayText()}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder={searchPlaceholder} />
                  <CommandList>
                    <CommandEmpty>{emptyMessage}</CommandEmpty>
                    <CommandGroup>
                      {options.map((option) => {
                        const isSelected = selectedValues.includes(option.value);
                        const isDisabled = option.disabled || 
                          (maxSelections && !isSelected && selectedValues.length >= maxSelections);
                        
                        return (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            disabled={isDisabled}
                            onSelect={() => handleSelect(option.value)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                isSelected ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span className="truncate">{option.label}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Selected items as badges */}
            {selectedOptions.length > 0 && (
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {selectedOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="text-xs px-2 py-1 max-w-[200px]"
                  >
                    <span className="truncate">{option.label}</span>
                    <button
                      type="button"
                      onClick={() => removeSelection(option.value)}
                      disabled={disabled}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {description && (
              <FormDescription>
                {description}
                {maxSelections && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (Max: {maxSelections})
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

FormMultiCombobox.displayName = 'FormMultiCombobox';
