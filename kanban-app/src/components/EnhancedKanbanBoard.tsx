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
import { arrayMove } from "@dnd-kit/sortable";
import { EnhancedTaskCard } from "./EnhancedTaskCard";
import type { Column } from "./BoardColumn";
import { hasDraggableData } from "./utils";
import { coordinateGetter } from "./multipleContainersKeyboardPreset";
import { taskService } from "../api/taskService";
import type { EnhancedKanbanTask, ColumnId as ApiColumnId, TaskMasterTask } from "../api/types";
import { TaskCreateModal } from "./forms/TaskCreateModal";
import { PRDUploadModal } from "./forms/PRDUploadModal";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { X, Filter } from "lucide-react";
import { useFormToast } from "./forms/FormToast";

const defaultCols = [
  {
    id: "pending" as const,
    title: "Todo",
    headerColor: "bg-red-500",
    textColor: "text-white",
    badgeColor: "bg-red-500",
    count: 0,
  },
  {
    id: "in-progress" as const,
    title: "In progress",
    headerColor: "bg-blue-500",
    textColor: "text-white",
    badgeColor: "bg-blue-500",
    count: 0,
  },
  {
    id: "done" as const,
    title: "Done",
    headerColor: "bg-green-500",
    textColor: "text-white",
    badgeColor: "bg-green-500",
    count: 0,
  },
] satisfies Column[];

export type ColumnId = (typeof defaultCols)[number]["id"];

// Column IDs are now aligned with API status values - no mapping needed

// Enhanced Task interface for drag and drop compatibility
export interface EnhancedTask {
  id: UniqueIdentifier;
  columnId: ApiColumnId;
  content: string;
  // Include all enhanced properties
  enhancedData: EnhancedKanbanTask;
}

// Convert EnhancedKanbanTask to EnhancedTask for compatibility with existing components
function enhancedKanbanTaskToTask(enhancedKanbanTask: EnhancedKanbanTask): EnhancedTask {
  return {
    id: enhancedKanbanTask.id,
    columnId: enhancedKanbanTask.columnId as ApiColumnId,
    content: enhancedKanbanTask.content,
    enhancedData: enhancedKanbanTask,
  };
}

export function EnhancedKanbanBoard() {
  const [columns] = useState<Column[]>(defaultCols);
  const pickedUpTaskColumn = useRef<ApiColumnId | null>(null);
  const { showSuccess, showError, showWarning } = useFormToast();

  const [tasks, setTasks] = useState<EnhancedTask[]>([]);
  const [allTasks, setAllTasks] = useState<TaskMasterTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtering state
  const [selectedPRD, setSelectedPRD] = useState<string>('all');
  const [availablePRDs, setAvailablePRDs] = useState<Array<{id: string, title: string}>>([]);

  // Load tasks from TaskMaster API
  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if API is available
      const isHealthy = await taskService.healthCheck();
      if (!isHealthy) {
        throw new Error('TaskMaster API is not available');
      }

      // Get all tasks with full data for PRD filtering
      const allTasksData = await taskService.getAllTasks();

      // Sort tasks by ID descending (latest on top)
      const sortedTasks = allTasksData.sort((a, b) => {
        const idA = typeof a.id === 'string' ? parseInt(a.id) : a.id;
        const idB = typeof b.id === 'string' ? parseInt(b.id) : b.id;
        return idB - idA;
      });

      setAllTasks(sortedTasks);

      // Extract unique PRDs for filtering
      const prds = new Set<string>();
      sortedTasks.forEach(task => {
        if (task.prdSource?.fileName) {
          prds.add(task.prdSource.fileName);
        }
      });

      setAvailablePRDs(Array.from(prds).map(prd => ({
        id: prd,
        title: prd.replace(/\.(md|txt)$/i, '') // Remove file extension for display
      })));

      const tasksByColumns = await taskService.getEnhancedTasksByColumns();

      // Convert to EnhancedTask format for existing components
      const allTasksList: EnhancedTask[] = [];
      Object.entries(tasksByColumns).forEach(([, enhancedKanbanTasks]) => {
        enhancedKanbanTasks.forEach(enhancedKanbanTask => {
          allTasksList.push(enhancedKanbanTaskToTask(enhancedKanbanTask));
        });
      });

      setTasks(allTasksList);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [activeTask, setActiveTask] = useState<EnhancedTask | null>(null);



  // Filter tasks based on selected PRD
  const filteredTasks = useMemo(() => {
    if (selectedPRD === 'all') {
      return tasks;
    }

    // Filter tasks by PRD source
    const filteredTaskIds = allTasks
      .filter(task => task.prdSource?.fileName === selectedPRD)
      .map(task => String(task.id));

    return tasks.filter(task => filteredTaskIds.includes(String(task.id)));
  }, [tasks, allTasks, selectedPRD]);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: coordinateGetter,
    })
  );

  function getDraggingTaskData(taskId: UniqueIdentifier, columnId: ColumnId) {
    const tasksInColumn = filteredTasks.filter((task) => task.columnId === columnId);
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
        pickedUpTaskColumn.current = active.data.current.task.columnId as ApiColumnId;
        const { tasksInColumn, taskPosition, column } = getDraggingTaskData(
          active.id,
          pickedUpTaskColumn.current!
        );
        return `Picked up Task ${
          active.data.current.task.content
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
            active.data.current.task.content
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
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center gap-4 p-4 bg-background border rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter by PRD:</span>
        </div>

        <Select value={selectedPRD} onValueChange={setSelectedPRD}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select PRD..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            {availablePRDs.map((prd) => (
              <SelectItem key={prd.id} value={prd.id}>
                {prd.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedPRD !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedPRD('all')}
            className="h-8 px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <div className="ml-auto flex gap-2">
          <PRDUploadModal onPRDUploaded={loadTasks} />
          <TaskCreateModal onTaskCreated={loadTasks} />
        </div>
      </div>

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
              tasks={filteredTasks.filter((task) => task.columnId === col.id)}
              renderTask={(task) => (
                <EnhancedTaskCard
                  key={task.id}
                  task={task.enhancedData}
                  onTaskClick={(taskId) => {
                    console.log('Task clicked:', taskId);
                    // TODO: Implement task detail modal
                  }}
                  onTaskUpdated={(updatedTask) => {
                    console.log('Task updated:', updatedTask);
                    // Refresh the board data
                    loadTasks();
                  }}
                  onTaskDeleted={(taskId) => {
                    console.log('Task deleted:', taskId);
                    // Refresh the board data
                    loadTasks();
                  }}
                  onTaskCreated={(newTask) => {
                    console.log('Task created:', newTask);
                    // Refresh the board data
                    loadTasks();
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
                  tasks={filteredTasks.filter(
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
    </div>
  );

  function onDragStart(event: DragStartEvent) {
    console.log('🚀 onDragStart triggered:', event);

    if (!hasDraggableData(event.active)) {
      console.log('❌ No draggable data in onDragStart');
      return;
    }

    const data = event.active.data.current;
    console.log('📊 Drag start data:', data);

    if (data?.type === "Column") {
      console.log('🏛️ Setting active column:', data.column);
      setActiveColumn(data.column);
      return;
    }

    if (data?.type === "Task") {
      console.log('📋 Setting active task:', data.task);
      setActiveTask(data.task);
      return;
    }

    console.log('⚠️ Unknown drag type in onDragStart');
  }

  async function onDragEnd(event: DragEndEvent) {
    console.log('🎯 onDragEnd triggered:', event);

    setActiveColumn(null);
    setActiveTask(null);

    const { active, over } = event;
    if (!over) {
      console.log('❌ No over target, returning');
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    console.log('🔄 Drag end IDs:', { activeId, overId });

    if (activeId === overId) {
      console.log('⚠️ Same ID, returning');
      return;
    }

    if (!hasDraggableData(active) || !hasDraggableData(over)) {
      console.log('❌ No draggable data, returning');
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    console.log('📊 Drag data:', { activeData, overData });

    const isActiveATask = activeData?.type === "Task";
    const isOverATask = overData?.type === "Task";
    const isOverAColumn = overData?.type === "Column";

    console.log('🏷️ Drag types:', { isActiveATask, isOverATask, isOverAColumn });

    if (!isActiveATask) {
      console.log('❌ Active is not a task, returning');
      return;
    }

    let newColumnId: ApiColumnId | null = null;

    // Determine the target column
    if (isOverATask) {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        newColumnId = overTask.columnId;
      }
    } else if (isOverAColumn) {
      // Column IDs are now aligned with API status values
      newColumnId = overId as ApiColumnId;
    }

    if (!newColumnId) return;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Check if moving from "done" to another column - ask for confirmation
    if (activeTask.columnId === 'done' && newColumnId !== 'done') {
      const confirmed = window.confirm(
        `Are you sure you want to move task "${activeTask.content}" from "Done" back to "${newColumnId}"? This will change its status.`
      );

      if (!confirmed) {
        // Revert the UI change by reloading tasks
        loadTasks();
        showWarning(
          'Move Cancelled',
          'Task move was cancelled by user.'
        );
        return;
      }
    }

    // Debug logging
    console.log('Drag end debug:', {
      activeTaskId: activeTask.id,
      activeTaskColumnId: activeTask.columnId,
      newColumnId,
      willUpdate: activeTask.columnId !== newColumnId
    });

    // Only update if the column actually changed
    if (activeTask.columnId !== newColumnId) {
      try {
        console.log(`Calling moveTaskToColumn with taskId: ${activeTask.id}, newColumnId: ${newColumnId}`);
        await taskService.moveTaskToColumn(String(activeTask.id), newColumnId);
        console.log(`Task ${activeTask.id} moved to ${newColumnId}`);

        // Show success toast
        showSuccess(
          'Task Moved Successfully',
          `Task "${activeTask.content}" moved to ${newColumnId.replace('-', ' ')}`
        );

        // Refresh the board to get the updated data
        loadTasks();
      } catch (error) {
        console.error('Failed to update task status:', error);
        // Revert the UI change by reloading tasks
        loadTasks();
        showError(
          'Move Failed',
          'Failed to move task. Please try again.'
        );
      }
    } else {
      console.log('No column change detected, skipping API call');
    }
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
      setTasks((currentTasks) => {
        const activeIndex = currentTasks.findIndex((t) => t.id === activeId);
        const overIndex = currentTasks.findIndex((t) => t.id === overId);
        const activeTask = currentTasks[activeIndex];
        const overTask = currentTasks[overIndex];
        if (
          activeTask &&
          overTask &&
          activeTask.columnId !== overTask.columnId
        ) {
          // Just update the UI - actual API call will happen in onDragEnd
          const updatedActiveTask = { ...activeTask, columnId: overTask.columnId };
          const updatedTasks = [...currentTasks];
          updatedTasks[activeIndex] = updatedActiveTask;
          return arrayMove(updatedTasks, activeIndex, overIndex - 1);
        }

        return arrayMove(currentTasks, activeIndex, overIndex);
      });
    }

    const isOverAColumn = overData?.type === "Column";

    // Im dropping a Task over a column
    if (isActiveATask && isOverAColumn) {
      setTasks((currentTasks) => {
        const activeIndex = currentTasks.findIndex((t) => t.id === activeId);
        const activeTask = currentTasks[activeIndex];
        if (activeTask) {
          // Column IDs are now aligned with API status values
          const newApiColumnId = overId as ApiColumnId;

          // Just update the UI - actual API call will happen in onDragEnd
          const updatedActiveTask = { ...activeTask, columnId: newApiColumnId };
          const updatedTasks = [...currentTasks];
          updatedTasks[activeIndex] = updatedActiveTask;
          return updatedTasks;
        }
        return currentTasks;
      });
    }
  }
}
