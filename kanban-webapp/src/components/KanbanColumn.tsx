import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { Badge } from './ui/badge';
import type { KanbanColumn as KanbanColumnType } from '../types/task';

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

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className={`
        p-4 rounded-t-lg border-b-2 
        ${column.color}
        ${isOver ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
      `}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{column.title}</h3>
          <Badge variant="secondary" className="ml-2">
            {column.tasks.length}
          </Badge>
        </div>
      </div>

      {/* Tasks Container */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 p-4 space-y-3 min-h-[200px] bg-gray-50/50 rounded-b-lg border-l-2 border-r-2 border-b-2
          ${column.color.split(' ')[1]} // Extract border color
          ${isOver ? 'bg-blue-50' : ''}
          transition-colors duration-200
        `}
      >
        <SortableContext 
          items={column.tasks.map(task => task.id)} 
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              No tasks in {column.title.toLowerCase()}
            </div>
          ) : (
            column.tasks.map((task) => (
              <div key={task.id}>
                <TaskCard task={task} />
              </div>
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
};
