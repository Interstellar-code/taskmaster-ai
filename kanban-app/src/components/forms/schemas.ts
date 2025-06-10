import { z } from 'zod';

/**
 * Validation schemas for TaskMaster forms using Zod
 */

// Task status enum
export const TaskStatusSchema = z.enum([
  'pending',
  'in-progress', 
  'done',
  'review',
  'blocked',
  'deferred',
  'cancelled'
]);

// Task priority enum
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high']);

// Base task schema
export const TaskFormSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title must be less than 200 characters'),
  
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters long')
    .max(5000, 'Description must be less than 5000 characters'),
  
  priority: TaskPrioritySchema.default('medium'),
  
  status: TaskStatusSchema.default('pending'),
  
  dependencies: z
    .array(z.string())
    .default([])
    .refine(
      (deps) => new Set(deps).size === deps.length,
      'Dependencies must be unique'
    ),
  
  tags: z
    .array(z.string())
    .default([])
    .refine(
      (tags) => new Set(tags).size === tags.length,
      'Tags must be unique'
    ),
  
  estimatedHours: z
    .number()
    .min(0, 'Estimated hours must be positive')
    .max(1000, 'Estimated hours must be less than 1000')
    .optional(),
  
  assignee: z
    .string()
    .min(1, 'Assignee cannot be empty')
    .optional(),
  
  dueDate: z
    .date()
    .refine(
      (date) => date > new Date(),
      'Due date must be in the future'
    )
    .optional(),
  
  details: z
    .string()
    .max(10000, 'Details must be less than 10000 characters')
    .optional(),
  
  testStrategy: z
    .string()
    .max(5000, 'Test strategy must be less than 5000 characters')
    .optional(),
});

// Task creation schema (all required fields)
export const TaskCreateSchema = TaskFormSchema.required({
  title: true,
  description: true,
});

// Task update schema (all fields optional except id)
export const TaskUpdateSchema = TaskFormSchema.partial().extend({
  id: z.string().min(1, 'Task ID is required'),
});

// Bulk operation schema
export const BulkOperationSchema = z.object({
  taskIds: z
    .array(z.string())
    .min(1, 'At least one task ID is required'),
  
  operation: z.enum(['delete', 'updateStatus', 'updatePriority', 'addDependency']),
  
  payload: z.object({
    status: TaskStatusSchema.optional(),
    priority: TaskPrioritySchema.optional(),
    dependsOn: z.string().optional(),
  }).optional(),
});

// Search/filter schema
export const TaskFilterSchema = z.object({
  status: z.array(TaskStatusSchema).optional(),
  priority: z.array(TaskPrioritySchema).optional(),
  assignee: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dueDateFrom: z.date().optional(),
  dueDateTo: z.date().optional(),
  search: z.string().optional(),
});

// Form field validation helpers
export const createFieldSchema = {
  title: () => z.string().min(3).max(200),
  description: () => z.string().min(10).max(5000),
  email: () => z.string().email('Invalid email address'),
  url: () => z.string().url('Invalid URL'),
  phone: () => z.string().regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number'),
  positiveNumber: () => z.number().min(0, 'Must be a positive number'),
  requiredString: () => z.string().min(1, 'This field is required'),
  optionalString: () => z.string().optional(),
  tags: () => z.array(z.string()).default([]),
  dependencies: () => z.array(z.string()).default([]),
};

// PRD status enum
export const PRDStatusSchema = z.enum(['pending', 'in-progress', 'done', 'archived']);

// PRD priority enum
export const PRDPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

// PRD complexity enum
export const PRDComplexitySchema = z.enum(['low', 'medium', 'high']);

// PRD edit schema
export const PRDEditSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title must be less than 200 characters'),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters long')
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),

  priority: PRDPrioritySchema.default('medium'),

  complexity: PRDComplexitySchema.default('medium'),

  tags: z
    .array(z.string())
    .default([])
    .refine(
      (tags) => new Set(tags).size === tags.length,
      'Tags must be unique'
    ),

  estimated_effort: z
    .string()
    .max(100, 'Estimated effort must be less than 100 characters')
    .optional(),
});

// Export types
export type TaskFormData = z.infer<typeof TaskFormSchema>;
export type TaskCreateData = z.infer<typeof TaskCreateSchema>;
export type TaskUpdateData = z.infer<typeof TaskUpdateSchema>;
export type BulkOperationData = z.infer<typeof BulkOperationSchema>;
export type TaskFilterData = z.infer<typeof TaskFilterSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type PRDEditData = z.infer<typeof PRDEditSchema>;
export type PRDStatus = z.infer<typeof PRDStatusSchema>;
export type PRDPriority = z.infer<typeof PRDPrioritySchema>;
export type PRDComplexity = z.infer<typeof PRDComplexitySchema>;
