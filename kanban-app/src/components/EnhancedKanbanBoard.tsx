import { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

import { BoardColumn, BoardContainer } from "./BoardColumn";
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  useSensor,
  useSensors,
  KeyboardSensor,
  Announcements,
  UniqueIdentifier,
  TouchSensor,
  MouseSensor,
} from "@dnd-kit/core";
import { SortableContext, arrayMove } from "@dnd-kit/sortable";
import { EnhancedTaskCard } from "./EnhancedTaskCard";
import type { Column } from "./BoardColumn";
import { hasDraggableData } from "./utils";
import { coordinateGetter } from "./multipleContainersKeyboardPreset";
import { taskService } from "../api/taskService";
import type { EnhancedKanbanTask, ColumnId as ApiColumnId } from "../api/types";

const defaultCols = [
  {
    id: "todo" as const,
    title: "Todo",
  },
  {
    id: "in-progress" as const,
    title: "In progress",
  },
  {
    id: "done" as const,
    title: "Done",
  },
] satisfies Column[];

export type ColumnId = (typeof defaultCols)[number]["id"];

// Enhanced Task interface for drag and drop compatibility
export interface EnhancedTask {
  id: UniqueIdentifier;
  columnId: ColumnId;
  content: string;
  // Include all enhanced properties
  enhancedData: EnhancedKanbanTask;
}

// Convert EnhancedKanbanTask to EnhancedTask for compatibility with existing components
function enhancedKanbanTaskToTask(enhancedKanbanTask: EnhancedKanbanTask): EnhancedTask {
  return {
    id: enhancedKanbanTask.id,
    columnId: enhancedKanbanTask.columnId,
    content: enhancedKanbanTask.content,
    enhancedData: enhancedKanbanTask,
  };
}

export function EnhancedKanbanBoard() {
  const [columns, setColumns] = useState<Column[]>(defaultCols);
  const pickedUpTaskColumn = useRef<ColumnId | null>(null);
  const columnsId = useMemo(() => columns.map((col) => col.id), [columns]);

  const [tasks, setTasks] = useState<EnhancedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tasks from TaskMaster API
  useEffect(() => {
    async function loadTasks() {
      try {
        setLoading(true);
        setError(null);

        // Check if API is available
        const isHealthy = await taskService.healthCheck();
        if (!isHealthy) {
          throw new Error('TaskMaster API is not available');
        }

        const tasksByColumns = await taskService.getEnhancedTasksByColumns();

        // Convert to EnhancedTask format for existing components
        const allTasks: EnhancedTask[] = [];
        Object.entries(tasksByColumns).forEach(([columnId, enhancedKanbanTasks]) => {
          enhancedKanbanTasks.forEach(enhancedKanbanTask => {
            allTasks.push(enhancedKanbanTaskToTask(enhancedKanbanTask));
          });
        });

        setTasks(allTasks);
      } catch (err) {
        console.error('Failed to load tasks:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, []);

  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [activeTask, setActiveTask] = useState<EnhancedTask | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: coordinateGetter,
    })
  );

  function getDraggingTaskData(taskId: UniqueIdentifier, columnId: ColumnId) {
    const tasksInColumn = tasks.filter((task) => task.columnId === columnId);
    const taskPosition = tasksInColumn.findIndex((task) => task.id === taskId);
    const column = columns.find((col) => col.id === columnId);
    return {
      tasksInColumn,
      taskPosition,
      column,
    };
  }

  const announcements: Announcements = {
    onDragStart({ active }) {
      if (!hasDraggableData(active)) return;
      if (active.data.current?.type === "Task") {
        pickedUpTaskColumn.current = active.data.current.task.columnId;
        const { tasksInColumn, taskPosition, column } = getDraggingTaskData(
          active.id,
          pickedUpTaskColumn.current
        );
        return `Picked up Task ${
          active.data.current.task.enhancedData.title
        } at position: ${taskPosition + 1} of ${
          tasksInColumn.length
        } in column ${column?.title}`;
      }
    },
    onDragOver({ active, over }) {
      if (!hasDraggableData(active) || !hasDraggableData(over)) return;

      if (
        active.data.current?.type === "Task" &&
        over.data.current?.type === "Task"
      ) {
        const { tasksInColumn, taskPosition, column } = getDraggingTaskData(
          over.id,
          over.data.current.task.columnId
        );
        if (over.data.current.task.columnId !== pickedUpTaskColumn.current) {
          return `Task ${
            active.data.current.task.enhancedData.title
          } was moved over column ${column?.title} in position ${
            taskPosition + 1
          } of ${tasksInColumn.length}`;
        }
        return `Task was moved over position ${taskPosition + 1} of ${
          tasksInColumn.length
        } in column ${column?.title}`;
      }
    },
    onDragEnd({ active, over }) {
      if (!hasDraggableData(active) || !hasDraggableData(over)) {
        pickedUpTaskColumn.current = null;
        return;
      }
      if (
        active.data.current?.type === "Task" &&
        over.data.current?.type === "Task"
      ) {
        const { tasksInColumn, taskPosition, column } = getDraggingTaskData(
          over.id,
          over.data.current.task.columnId
        );
        if (over.data.current.task.columnId !== pickedUpTaskColumn.current) {
          return `Task was dropped into column ${column?.title} in position ${
            taskPosition + 1
          } of ${tasksInColumn.length}`;
        }
        return `Task was dropped into position ${taskPosition + 1} of ${
          tasksInColumn.length
        } in column ${column?.title}`;
      }
      pickedUpTaskColumn.current = null;
    },
    onDragCancel({ active }) {
      pickedUpTaskColumn.current = null;
      if (!hasDraggableData(active)) return;
      return `Dragging ${active.data.current?.type} cancelled.`;
    },
  };

  // Show loading state
  if (loading) {
    return (
      <BoardContainer>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading TaskMaster tasks...</div>
        </div>
      </BoardContainer>
    );
  }

  // Show error state
  if (error) {
    return (
      <BoardContainer>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-lg text-red-600 mb-4">Error loading tasks</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </BoardContainer>
    );
  }

  return (
    <DndContext
      accessibility={{
        announcements,
      }}
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
    >
      <BoardContainer>
        {columns.map((col) => (
          <BoardColumn
            key={col.id}
            column={col}
            tasks={tasks.filter((task) => task.columnId === col.id)}
            renderTask={(task) => (
              <EnhancedTaskCard
                key={task.id}
                task={task.enhancedData}
                onTaskClick={(taskId) => {
                  console.log('Task clicked:', taskId);
                  // TODO: Implement task detail modal
                }}
              />
            )}
          />
        ))}
      </BoardContainer>

      {"document" in window &&
        createPortal(
          <DragOverlay>
            {activeColumn && (
              <BoardColumn
                isOverlay
                column={activeColumn}
                tasks={tasks.filter(
                  (task) => task.columnId === activeColumn.id
                )}
                renderTask={(task) => (
                  <EnhancedTaskCard 
                    task={task.enhancedData}
                    isOverlay
                  />
                )}
              />
            )}
            {activeTask && (
              <EnhancedTaskCard 
                task={activeTask.enhancedData} 
                isOverlay 
              />
            )}
          </DragOverlay>,
          document.body
        )}
    </DndContext>
  );

  function onDragStart(event: DragStartEvent) {
    if (!hasDraggableData(event.active)) return;
    const data = event.active.data.current;
    if (data?.type === "Column") {
      setActiveColumn(data.column);
      return;
    }

    if (data?.type === "Task") {
      setActiveTask(data.task);
      return;
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveColumn(null);
    setActiveTask(null);
    // Column dragging is disabled - only handle task dragging
  }

  async function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    if (!hasDraggableData(active) || !hasDraggableData(over)) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    const isActiveATask = activeData?.type === "Task";
    const isOverATask = overData?.type === "Task";

    if (!isActiveATask) return;

    // Im dropping a Task over another Task
    if (isActiveATask && isOverATask) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);
        const activeTask = tasks[activeIndex];
        const overTask = tasks[overIndex];
        if (
          activeTask &&
          overTask &&
          activeTask.columnId !== overTask.columnId
        ) {
          // Update TaskMaster status when moving to different column
          const newColumnId = overTask.columnId as ApiColumnId;
          taskService.moveTaskToColumn(String(activeTask.id), newColumnId)
            .then(() => {
              console.log(`Task ${activeTask.id} moved to ${newColumnId}`);
            })
            .catch((error) => {
              console.error('Failed to update task status:', error);
              // Optionally revert the UI change or show error message
            });

          activeTask.columnId = overTask.columnId;
          activeTask.enhancedData.columnId = overTask.columnId;
          return arrayMove(tasks, activeIndex, overIndex - 1);
        }

        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    const isOverAColumn = overData?.type === "Column";

    // Im dropping a Task over a column
    if (isActiveATask && isOverAColumn) {
      setTasks((tasks) => {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const activeTask = tasks[activeIndex];
        if (activeTask) {
          const newColumnId = overId as ApiColumnId;

          // Update TaskMaster status when moving to different column
          if (activeTask.columnId !== newColumnId) {
            taskService.moveTaskToColumn(String(activeTask.id), newColumnId)
              .then(() => {
                console.log(`Task ${activeTask.id} moved to ${newColumnId}`);
              })
              .catch((error) => {
                console.error('Failed to update task status:', error);
                // Optionally revert the UI change or show error message
              });
          }

          activeTask.columnId = overId as ColumnId;
          activeTask.enhancedData.columnId = overId as ColumnId;
          return arrayMove(tasks, activeIndex, activeIndex);
        }
        return tasks;
      });
    }
  }
}
