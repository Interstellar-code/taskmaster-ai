import React, { useState, KeyboardEvent } from 'react';
import { FieldValues } from 'react-hook-form';
import { X } from 'lucide-react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FormTagInputProps } from './types';

/**
 * Reusable form tag input component
 */
export function FormTagInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends keyof TFieldValues = keyof TFieldValues
>({
  name,
  control,
  label,
  description,
  placeholder = 'Type and press Enter to add tags...',
  disabled = false,
  required = false,
  className,
  suggestions = [],
  maxTags,
  allowCustomTags = true,
}: FormTagInputProps<TFieldValues, TName>) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
    inputValue.length > 0
  );

  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const tags = field.value || [];

        const addTag = (tag: string) => {
          const trimmedTag = tag.trim();
          if (
            trimmedTag &&
            !tags.includes(trimmedTag) &&
            (!maxTags || tags.length < maxTags)
          ) {
            field.onChange([...tags, trimmedTag]);
            setInputValue('');
            setShowSuggestions(false);
          }
        };

        const removeTag = (tagToRemove: string) => {
          field.onChange(tags.filter((tag: string) => tag !== tagToRemove));
        };

        const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (allowCustomTags) {
              addTag(inputValue);
            }
          } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
          }
        };

        return (
          <FormItem className={cn('space-y-2', className)}>
            {label && (
              <FormLabel className={cn(required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
                {label}
              </FormLabel>
            )}
            <div className="space-y-2">
              {/* Tags display */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag: string, index: number) => (
                    <Badge
                      key={`${tag}-${index}`}
                      variant="secondary"
                      className="text-xs"
                    >
                      {tag}
                      <button
                        type="button"
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            removeTag(tag);
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() => removeTag(tag)}
                        disabled={disabled}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Input field */}
              <div className="relative">
                <FormControl>
                  <Input
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setShowSuggestions(e.target.value.length > 0 && suggestions.length > 0);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setShowSuggestions(inputValue.length > 0 && suggestions.length > 0)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    placeholder={
                      maxTags && tags.length >= maxTags
                        ? `Maximum ${maxTags} tags reached`
                        : placeholder
                    }
                    disabled={disabled || (maxTags && tags.length >= maxTags)}
                    className={cn(
                      fieldState.error && 'border-red-500 focus-visible:ring-red-500',
                      'transition-colors'
                    )}
                    aria-invalid={!!fieldState.error}
                    aria-describedby={
                      description ? `${name}-description` : undefined
                    }
                  />
                </FormControl>

                {/* Suggestions dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md max-h-40 overflow-auto">
                    {filteredSuggestions.map((suggestion, index) => (
                      <div
                        key={`${suggestion}-${index}`}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        onClick={() => addTag(suggestion)}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {description && (
              <FormDescription id={`${name}-description`}>
                {description}
                {maxTags && (
                  <span className="block text-xs text-muted-foreground mt-1">
                    {tags.length}/{maxTags} tags used
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

FormTagInput.displayName = 'FormTagInput';
