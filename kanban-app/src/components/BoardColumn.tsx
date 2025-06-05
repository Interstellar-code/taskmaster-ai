import { SortableContext } from "@dnd-kit/sortable";
import { useDndContext, type UniqueIdentifier, useDroppable } from "@dnd-kit/core";

import { useMemo } from "react";
import { TaskCard } from "./TaskCard";
import { EnhancedTask } from "./EnhancedKanbanBoard";
import { cva } from "class-variance-authority";
import { Card, CardContent, CardHeader } from "./ui/card";

import { ScrollArea, ScrollBar } from "./ui/scroll-area";

export interface Column {
  id: UniqueIdentifier;
  title: string;
  headerColor?: string;
  textColor?: string;
  badgeColor?: string;
  count?: number;
}

export type ColumnType = "Column";

export interface ColumnDragData {
  type: ColumnType;
  column: Column;
}

interface BoardColumnProps {
  column: Column;
  tasks: EnhancedTask[];
  isOverlay?: boolean;
  renderTask?: (task: EnhancedTask) => React.ReactNode;
}

export function BoardColumn({ column, tasks, isOverlay, renderTask }: BoardColumnProps) {
  const tasksIds = useMemo(() => {
    return tasks.map((task) => task.id);
  }, [tasks]);

  // Make the entire column droppable
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "Column",
      column,
    },
  });

  // Disable column dragging - columns are now static
  const isDragging = false;

  const variants = cva(
    "h-[85vh] max-h-[85vh] w-full max-w-full bg-primary-foreground flex flex-col flex-shrink-0 snap-center transition-colors",
    {
      variants: {
        dragging: {
          default: "border-2 border-transparent",
          over: "ring-2 opacity-30",
          overlay: "ring-2 ring-primary",
        },
        dropping: {
          default: "",
          over: "bg-blue-50 dark:bg-blue-950 border-2 border-blue-300 dark:border-blue-700",
        },
      },
    }
  );

  return (
    <Card
      ref={setNodeRef}
      className={variants({
        dragging: isOverlay ? "overlay" : isDragging ? "over" : undefined,
        dropping: isOver ? "over" : "default",
      })}
    >
      <CardHeader className={`p-4 font-semibold border-b-2 text-center flex flex-row justify-center items-center ${column.headerColor || 'bg-gray-100'} ${column.textColor || 'text-gray-700'}`}>
        <span className="text-lg">{column.title} ({tasks.length})</span>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="flex flex-grow flex-col gap-2 p-4 min-h-[calc(85vh-80px)] relative">
          <SortableContext items={tasksIds}>
            {tasks.map((task) => (
              renderTask ? renderTask(task) : <TaskCard key={task.id} task={task} />
            ))}
            {/* Enhanced drop zone - always present for better UX */}
            <div className={`
              flex-1 flex items-center justify-center text-muted-foreground text-sm
              border-2 border-dashed rounded-lg transition-all duration-200
              ${tasks.length === 0
                ? 'border-muted p-8 min-h-[300px]'
                : 'border-transparent p-4 min-h-[100px] hover:border-muted/50'
              }
              ${isOver ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/50' : ''}
            `}>
              {tasks.length === 0 ? (
                <div className="text-center">
                  <div className="text-lg mb-2">📋</div>
                  <div>Drop tasks here</div>
                </div>
              ) : (
                <div className="opacity-0 hover:opacity-50 transition-opacity">
                  Drop tasks here
                </div>
              )}
            </div>
          </SortableContext>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}

export function BoardContainer({ children }: { children: React.ReactNode }) {
  const dndContext = useDndContext();

  const variations = cva("px-2 md:px-0 flex lg:justify-center pb-4", {
    variants: {
      dragging: {
        default: "snap-x snap-mandatory",
        active: "snap-none",
      },
    },
  });

  return (
    <ScrollArea
      className={variations({
        dragging: dndContext.active ? "active" : "default",
      })}
    >
      <div className="grid grid-cols-3 gap-4 w-full max-w-7xl mx-auto px-4">
        {children}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
