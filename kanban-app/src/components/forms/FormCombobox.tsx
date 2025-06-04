import React, { useState } from 'react';
import { FieldValues } from 'react-hook-form';
import { Check, ChevronsUpDown } from 'lucide-react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { FormComboboxProps } from './types';

/**
 * Reusable form combobox component with search functionality
 */
export function FormCombobox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends keyof TFieldValues = keyof TFieldValues
>({
  name,
  control,
  label,
  description,
  placeholder = 'Select option...',
  disabled = false,
  required = false,
  className,
  options,
  searchable = true,
  emptyText = 'No option found.',
  searchPlaceholder = 'Search...',
}: FormComboboxProps<TFieldValues, TName>) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const filteredOptions = searchable
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchValue.toLowerCase())
      )
    : options;

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
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    'w-full justify-between',
                    !field.value && 'text-muted-foreground',
                    fieldState.error && 'border-red-500 focus:ring-red-500',
                    'transition-colors'
                  )}
                  disabled={disabled}
                >
                  {field.value
                    ? options.find((option) => option.value === field.value)?.label
                    : placeholder}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <div className="max-h-60 overflow-auto">
                {searchable && (
                  <div className="p-2">
                    <input
                      placeholder={searchPlaceholder}
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md"
                    />
                  </div>
                )}
                <div className="p-1">
                  {filteredOptions.length === 0 ? (
                    <div className="py-6 text-center text-sm">{emptyText}</div>
                  ) : (
                    filteredOptions.map((option) => (
                      <div
                        key={option.value}
                        className={cn(
                          'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                          field.value === option.value && 'bg-accent text-accent-foreground'
                        )}
                        onClick={() => {
                          field.onChange(option.value === field.value ? '' : option.value);
                          setOpen(false);
                          setSearchValue('');
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            field.value === option.value ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {option.label}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
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

FormCombobox.displayName = 'FormCombobox';
