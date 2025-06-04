import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { useDndContext, type UniqueIdentifier, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMemo } from "react";
import { Task, TaskCard } from "./TaskCard";
import { cva } from "class-variance-authority";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { GripVertical } from "lucide-react";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";

export interface Column {
  id: UniqueIdentifier;
  title: string;
}

export type ColumnType = "Column";

export interface ColumnDragData {
  type: ColumnType;
  column: Column;
}

interface BoardColumnProps {
  column: Column;
  tasks: Task[];
  isOverlay?: boolean;
  renderTask?: (task: Task) => React.ReactNode;
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
  const transform = null;
  const transition = null;
  const isDragging = false;

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const variants = cva(
    "h-[85vh] max-h-[85vh] w-[350px] max-w-full bg-primary-foreground flex flex-col flex-shrink-0 snap-center transition-colors",
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
      <CardHeader className="p-4 font-semibold border-b-2 text-center flex flex-row justify-center items-center">
        <span className="text-lg">{column.title} ({tasks.length})</span>
      </CardHeader>
      <ScrollArea className="flex-1">
        <CardContent className="flex flex-grow flex-col gap-2 p-2 min-h-[calc(85vh-80px)]">
          <SortableContext items={tasksIds}>
            {tasks.map((task) => (
              renderTask ? renderTask(task) : <TaskCard key={task.id} task={task} />
            ))}
            {/* Empty drop zone when no tasks */}
            {tasks.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-muted rounded-lg p-8 min-h-[200px]">
                Drop tasks here
              </div>
            )}
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
      <div className="flex gap-4 items-center flex-row justify-center">
        {children}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
