import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cva } from 'class-variance-authority';
import { TaskCard } from './TaskCard';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import type { KanbanColumn as KanbanColumnType, Task } from '../types/task';

// SortableTaskCard wrapper component
const SortableTaskCard: React.FC<{ task: Task }> = ({ task }) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        isOverlay={false}
        // Pass drag attributes and listeners to TaskCard
        dragAttributes={attributes}
        dragListeners={listeners}
        isDragging={isDragging}
      />
    </div>
  );
};

interface KanbanColumnProps {
  column: KanbanColumnType;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ column }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      columnId: column.id,
    },
  });

  const variants = cva(
    "h-[500px] max-h-[500px] w-[350px] max-w-full bg-primary-foreground flex flex-col flex-shrink-0 snap-center",
    {
      variants: {
        dragging: {
          default: "border-2 border-transparent",
          over: "ring-2 opacity-30",
          overlay: "ring-2 ring-primary",
        },
      },
    }
  );

  return (
    <Card className={variants({ dragging: isOver ? "over" : "default" })}>
      <CardHeader className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{column.title}</h3>
          <Badge variant="secondary" className="ml-2">
            {column.tasks.length}
          </Badge>
        </div>
      </CardHeader>

      <ScrollArea className="h-full w-full">
        <CardContent
          ref={setNodeRef}
          className="flex flex-col gap-2 p-2"
        >
          <SortableContext
            items={column.tasks.map(task => task.id)}
            strategy={verticalListSortingStrategy}
          >
            {column.tasks.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No tasks in {column.title.toLowerCase()}
              </div>
            ) : (
              column.tasks.map((task) => (
                <SortableTaskCard key={task.id} task={task} />
              ))
            )}
          </SortableContext>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
