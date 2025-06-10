import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type PRD, prdService } from '../api/prdService';
import { PRDEditSchema } from './forms/schemas';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Form } from './ui/form';
import { FormInput } from './forms/FormInput';
import { FormTextarea } from './forms/FormTextarea';
import { FormSelect } from './forms/FormSelect';
import { FormTagInput } from './forms/FormTagInput';
import { useFormToast } from './forms/FormToast';
import { Loader2, Save, X } from 'lucide-react';

interface PRDEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prd: PRD | null;
  onPRDUpdate?: () => void; // Callback to refresh PRD data
}

export function PRDEditModal({ open, onOpenChange, prd, onPRDUpdate }: PRDEditModalProps) {
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useFormToast();

  const form = useForm({
    resolver: zodResolver(PRDEditSchema),
    defaultValues: {
      title: prd?.title || '',
      description: prd?.description || '',
      priority: prd?.priority || 'medium',
      complexity: prd?.complexity || 'medium',
      tags: prd?.tags || [],
      estimated_effort: prd?.estimated_effort || '',
    },
  });

  // Reset form when PRD changes
  React.useEffect(() => {
    if (prd && open) {
      form.reset({
        title: prd.title || '',
        description: prd.description || '',
        priority: prd.priority || 'medium',
        complexity: prd.complexity || 'medium',
        tags: prd.tags || [],
        estimated_effort: prd.estimated_effort || '',
      });
    }
  }, [prd, open, form]);

  const onSubmit = async (data: {
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    complexity: 'low' | 'medium' | 'high';
    tags: string[];
    estimated_effort?: string;
  }) => {
    if (!prd) return;

    setSaving(true);
    try {
      await prdService.updatePRD(prd.id, {
        title: data.title,
        description: data.description,
        priority: data.priority,
        complexity: data.complexity,
        tags: data.tags,
      });

      showSuccess('PRD Updated', 'PRD metadata has been updated successfully!');
      
      // Close modal and refresh parent
      onOpenChange(false);
      if (onPRDUpdate) {
        onPRDUpdate();
      }
    } catch (error) {
      console.error('Failed to update PRD:', error);
      showError('Update Failed', 'Failed to update PRD metadata. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  if (!prd) return null;

  // Priority options
  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  // Complexity options
  const complexityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit PRD Metadata
          </DialogTitle>
          <DialogDescription>
            Update the PRD information below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* Basic Information Section */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
                
                {/* Title */}
                <FormInput
                  name="title"
                  control={form.control}
                  label="Title"
                  placeholder="Enter PRD title"
                  required
                  className="mb-4"
                />

                {/* Description */}
                <FormTextarea
                  name="description"
                  control={form.control}
                  label="Description"
                  placeholder="Enter PRD description"
                  rows={3}
                  className="mb-4"
                />
              </div>

              {/* Metadata Section */}
              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                <FormSelect
                  name="priority"
                  control={form.control}
                  label="Priority"
                  placeholder="Select priority"
                  options={priorityOptions}
                  required
                />

                {/* Complexity */}
                <FormSelect
                  name="complexity"
                  control={form.control}
                  label="Complexity"
                  placeholder="Select complexity"
                  options={complexityOptions}
                  required
                />
              </div>

              {/* Estimated Effort */}
              <FormInput
                name="estimated_effort"
                control={form.control}
                label="Estimated Effort"
                placeholder="e.g., 2-4 hours, 1-2 days"
                className="mb-4"
              />

              {/* Tags */}
              <FormTagInput
                name="tags"
                control={form.control}
                label="Tags"
                placeholder="Type and press Enter to add tags..."
                allowCustomTags
                maxTags={10}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
