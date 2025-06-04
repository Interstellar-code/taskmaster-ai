import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import type { BadgeProps } from './ui/badge';
import type { Task, TaskPriority } from '../types/task';

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
}

const priorityConfig: Record<TaskPriority, { variant: BadgeProps['variant']; label: string }> = {
  low: { variant: 'secondary', label: 'Low' },
  medium: { variant: 'info', label: 'Medium' },
  high: { variant: 'warning', label: 'High' },
  critical: { variant: 'destructive', label: 'Critical' }
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, isDragging = false }) => {
  const priorityInfo = priorityConfig[task.priority];
  
  // Truncate description to 100 characters
  const truncatedDescription = task.description.length > 100 
    ? `${task.description.substring(0, 100)}...` 
    : task.description;

  return (
    <Card 
      className={`
        cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md
        ${isDragging ? 'opacity-50 rotate-2 scale-105' : ''}
      `}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-tight">
            {task.title}
          </CardTitle>
          <Badge variant={priorityInfo.variant} className="shrink-0">
            {priorityInfo.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          {truncatedDescription}
        </p>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono">#{task.id}</span>
          
          {task.dependencies.length > 0 && (
            <div className="flex items-center gap-1">
              <span>Deps:</span>
              <Badge variant="outline" className="text-xs px-1 py-0">
                {task.dependencies.length}
              </Badge>
            </div>
          )}
        </div>
        
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Subtasks:</span>
              <Badge variant="secondary" className="text-xs px-1 py-0">
                {task.subtasks.filter(st => st.status === 'done').length}/{task.subtasks.length}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
