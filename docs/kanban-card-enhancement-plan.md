# Kanban Card Enhancement Plan
## Modern Design and Rich Task Metadata Display

### Executive Summary

This document outlines a comprehensive plan to enhance the TaskMaster kanban task cards with modern design principles and rich metadata display capabilities. The enhancement will transform basic task cards into information-rich, visually appealing components that effectively communicate task status, progress, relationships, and temporal information.

---

## 1. Current State Analysis

### 1.1 Existing Card Design
The current `TaskCard.tsx` component displays minimal information:
- **Basic Layout**: Simple card with header and content
- **Displayed Data**: Only task content/title and a generic "Task" badge
- **Visual Elements**: Drag handle (GripVertical icon) and basic outline badge
- **Styling**: Basic shadcn/ui card with minimal customization

### 1.2 Current Data Flow
```typescript
// Current Task Interface (simplified)
interface Task {
  id: UniqueIdentifier;
  columnId: ColumnId;
  content: string;
}
```

### 1.3 Limitations
- **Information Poverty**: Only shows task title, missing rich metadata
- **No Visual Hierarchy**: All tasks look identical regardless of priority/status
- **Missing Context**: No indication of dependencies, subtasks, or progress
- **Poor Temporal Awareness**: No timestamps or duration indicators
- **Limited Accessibility**: Minimal screen reader support for metadata

---

## 2. Available Metadata Inventory

### 2.1 TaskMaster Task Schema Analysis
Based on `kanban-app/src/api/types.ts` and API response analysis:

```typescript
interface TaskMasterTask {
  // Core Identification
  id: string | number;
  title: string;
  description: string;
  
  // Status & Priority
  status: string; // pending, in-progress, done, review, blocked, cancelled, deferred
  priority: string; // high, medium, low
  
  // Relationships
  dependencies: (string | number)[];
  subtasks?: TaskMasterSubtask[];
  
  // Metadata
  details?: string;
  testStrategy?: string;
  updatedAt?: string; // ISO timestamp
  
  // PRD Integration
  prdSource?: {
    filePath: string;
    fileName: string;
    parsedDate: string;
    fileHash: string;
    fileSize: number;
  } | null;
}
```

### 2.2 Derived Metadata
From the available data, we can calculate:
- **Progress Indicators**: Subtask completion percentage
- **Dependency Status**: Number of blocking dependencies
- **Age Indicators**: Time since last update
- **Complexity Indicators**: Description length, subtask count
- **Source Traceability**: PRD file references

---

## 3. Modern Card Design Specifications

### 3.1 Design Principles
- **Information Hierarchy**: Most important info prominently displayed
- **Visual Consistency**: Consistent color coding and iconography
- **Progressive Disclosure**: Show essential info, hide details until needed
- **Accessibility First**: Screen reader friendly with proper ARIA labels
- **Responsive Design**: Adapts to different screen sizes

### 3.2 Card Layout Structure
```
┌─────────────────────────────────────┐
│ [Drag] [Priority] [Status]    [PRD] │ ← Header Bar
├─────────────────────────────────────┤
│ Task Title (truncated if long)      │ ← Primary Content
│ Brief description preview...        │
├─────────────────────────────────────┤
│ [📊 3/5] [🔗 2] [⏰ 2d]      [📝]  │ ← Metadata Bar
└─────────────────────────────────────┘
```

### 3.3 Visual Design Elements

#### 3.3.1 Priority Indicators
- **High Priority**: Red accent border + 🔴 icon
- **Medium Priority**: Yellow accent border + 🟡 icon  
- **Low Priority**: Green accent border + 🟢 icon

#### 3.3.2 Status Badges
- **Pending**: Gray badge with "📋 Todo"
- **In Progress**: Blue badge with "⚡ Active"
- **Review**: Orange badge with "👀 Review"
- **Blocked**: Red badge with "🚫 Blocked"
- **Done**: Green badge with "✅ Done"

#### 3.3.3 Progress Indicators
- **Subtasks**: "📊 3/5 subtasks" with mini progress bar
- **Dependencies**: "🔗 2 deps" with warning if blocking
- **Test Coverage**: "🧪 Tests" if testStrategy exists

#### 3.3.4 Temporal Information
- **Last Updated**: "⏰ 2d ago" with relative time
- **Age Indicators**: Color coding based on staleness

---

## 4. Metadata Display Strategy

### 4.1 Information Prioritization

#### 4.1.1 Always Visible (Primary)
1. **Task Title** - Truncated to 2 lines max
2. **Status Badge** - Current task status with icon
3. **Priority Indicator** - Color-coded border/icon

#### 4.1.2 Contextual Display (Secondary)
1. **Subtask Progress** - Only if subtasks exist
2. **Dependencies** - Only if dependencies exist
3. **PRD Source** - Only if linked to PRD
4. **Last Updated** - Always show if available

#### 4.1.3 On Hover/Focus (Tertiary)
1. **Full Description** - Tooltip with complete text
2. **Dependency Details** - List of blocking tasks
3. **Test Strategy** - If defined
4. **PRD Details** - File name and parse date

### 4.2 Responsive Behavior
- **Desktop**: Full metadata display
- **Tablet**: Condensed icons with tooltips
- **Mobile**: Essential info only, expandable details

---

## 5. Technical Implementation Plan

### 5.1 Component Architecture

#### 5.1.1 Enhanced TaskCard Structure
```typescript
interface EnhancedTaskCardProps {
  task: KanbanTask; // Extended with TaskMaster metadata
  isOverlay?: boolean;
  showDetails?: boolean;
  onTaskClick?: (taskId: string) => void;
}
```

#### 5.1.2 Sub-components
1. **TaskCardHeader** - Priority, status, drag handle
2. **TaskCardContent** - Title, description preview
3. **TaskCardMetadata** - Progress, dependencies, timestamps
4. **TaskCardTooltip** - Detailed information overlay

### 5.2 Data Transformation Requirements

#### 5.2.1 Enhanced KanbanTask Interface
```typescript
interface KanbanTask {
  // Existing fields
  id: string;
  content: string;
  columnId: ColumnId;
  
  // Enhanced metadata
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: TaskStatus;
  
  // Progress indicators
  subtaskProgress?: {
    completed: number;
    total: number;
    percentage: number;
  };
  
  // Relationships
  dependencies: string[];
  dependencyStatus: 'none' | 'waiting' | 'ready';
  
  // Temporal data
  updatedAt?: Date;
  ageInDays?: number;
  
  // Source tracking
  prdSource?: {
    fileName: string;
    parsedDate: Date;
  };
  
  // Testing
  hasTestStrategy: boolean;
}
```

### 5.3 Styling Approach

#### 5.3.1 Tailwind CSS Classes
```typescript
const cardVariants = cva("relative transition-all duration-200", {
  variants: {
    priority: {
      high: "border-l-4 border-l-red-500",
      medium: "border-l-4 border-l-yellow-500", 
      low: "border-l-4 border-l-green-500"
    },
    status: {
      pending: "bg-gray-50",
      'in-progress': "bg-blue-50",
      review: "bg-orange-50",
      blocked: "bg-red-50",
      done: "bg-green-50"
    }
  }
});
```

#### 5.3.2 Custom Components
- **ProgressBar**: Mini progress indicator for subtasks
- **StatusBadge**: Colored badge with status icon
- **MetadataChip**: Small info chips for metadata
- **PriorityIndicator**: Color-coded priority marker

### 5.4 Accessibility Features
- **ARIA Labels**: Comprehensive labeling for screen readers
- **Keyboard Navigation**: Full keyboard support for card interactions
- **High Contrast**: Ensure color combinations meet WCAG standards
- **Screen Reader Announcements**: Status changes and progress updates

---

## 6. MCP vs CLI Command Alignment Analysis

### 6.1 Current Discrepancies
Based on codebase analysis, several MCP functions don't have direct CLI equivalents:

#### 6.1.1 Missing CLI Commands
- `updateSubtaskByIdDirect` - No direct CLI for subtask updates
- `removeSubtaskDirect` - Limited CLI subtask management
- `analyzeTaskComplexityDirect` - Complexity analysis not in main CLI
- `clearSubtasksDirect` - No CLI command for clearing subtasks

#### 6.1.2 MCP-Only Functions
- `getCacheStatsDirect` - Internal MCP function
- `initializeProjectDirect` - Different from CLI init

### 6.2 Recommended Alignment
1. **Add Missing CLI Commands**: Implement CLI equivalents for all MCP functions
2. **Standardize Parameters**: Ensure consistent parameter naming
3. **Update Documentation**: Sync help text between MCP and CLI
4. **Test Coverage**: Ensure both interfaces have equivalent functionality

---

## 7. Implementation Phases

### Phase 1: Data Enhancement (Week 1)
- [ ] Extend KanbanTask interface with rich metadata
- [ ] Update taskMasterToKanban conversion function
- [ ] Add progress calculation utilities
- [ ] Implement dependency status logic

### Phase 2: Visual Design (Week 2)
- [ ] Create enhanced TaskCard component
- [ ] Implement priority and status indicators
- [ ] Add progress bars and metadata chips
- [ ] Design responsive layout system

### Phase 3: Interactivity (Week 3)
- [ ] Add hover states and tooltips
- [ ] Implement click handlers for task details
- [ ] Add keyboard navigation support
- [ ] Create accessibility features

### Phase 4: Testing & Polish (Week 4)
- [ ] Comprehensive testing across devices
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Documentation updates

---

## 8. Success Metrics

### 8.1 User Experience Metrics
- **Information Density**: 5+ metadata points visible per card
- **Visual Clarity**: Clear priority/status distinction at a glance
- **Accessibility Score**: WCAG 2.1 AA compliance
- **Performance**: <100ms render time for card updates

### 8.2 Functional Requirements
- **Complete Metadata Display**: All available TaskMaster data utilized
- **Responsive Design**: Functional on mobile, tablet, desktop
- **Real-time Updates**: Live status and progress updates
- **Keyboard Accessibility**: Full keyboard navigation support

---

## 9. Future Enhancements

### 9.1 Advanced Features
- **Drag & Drop Enhancements**: Visual feedback during drag operations
- **Bulk Operations**: Multi-select for batch status updates
- **Filtering & Search**: Advanced card filtering capabilities
- **Custom Views**: User-configurable card layouts

### 9.2 Integration Opportunities
- **Time Tracking**: Integration with time tracking systems
- **Comments System**: Task-level commenting and collaboration
- **File Attachments**: Document and image attachments
- **Notification System**: Real-time updates and alerts

---

## 10. Reference Design Analysis

### 10.1 Inspiration from Provided Images
The reference images show modern kanban cards with:
- **Clean Typography**: Clear hierarchy with title and description
- **Status Indicators**: Colored badges and avatars for assignment
- **Temporal Information**: "Today", "In three days", "A week ago" timestamps
- **Visual Grouping**: Consistent spacing and card shadows
- **Color Coding**: Different background tints for different states

### 10.2 TaskMaster-Specific Adaptations
- **Replace Avatars**: Use priority indicators instead of user avatars
- **Enhance Timestamps**: Show relative time with more context
- **Add Progress Bars**: Visual representation of subtask completion
- **Include Dependencies**: Show blocking relationships
- **PRD Integration**: Display source document references

---

## 11. Detailed MCP vs CLI Command Mapping

### 11.1 Complete Function Comparison

| MCP Function | CLI Command | Status | Notes |
|--------------|-------------|---------|-------|
| `listTasksDirect` | `task-hero list` | ✅ Aligned | Both list tasks |
| `addTaskDirect` | `task-hero add-task` | ✅ Aligned | Both add tasks |
| `setTaskStatusDirect` | `task-hero set-status` | ✅ Aligned | Both update status |
| `showTaskDirect` | `task-hero show` | ✅ Aligned | Both show task details |
| `nextTaskDirect` | `task-hero next` | ✅ Aligned | Both find next task |
| `expandTaskDirect` | `task-hero expand` | ✅ Aligned | Both expand tasks |
| `removeTaskDirect` | `task-hero remove-task` | ⚠️ Partial | CLI has limited options |
| `moveTaskDirect` | `task-hero move-task` | ✅ Aligned | Both move tasks |
| `updateTaskByIdDirect` | `task-hero update-task` | ✅ Aligned | Both update tasks |
| `addSubtaskDirect` | `task-hero add-subtask` | ❌ Missing | No direct CLI command |
| `updateSubtaskByIdDirect` | N/A | ❌ Missing | No CLI equivalent |
| `removeSubtaskDirect` | N/A | ❌ Missing | No CLI equivalent |
| `clearSubtasksDirect` | N/A | ❌ Missing | No CLI equivalent |
| `addDependencyDirect` | `task-hero add-dependency` | ✅ Aligned | Both add dependencies |
| `removeDependencyDirect` | N/A | ❌ Missing | No CLI equivalent |
| `validateDependenciesDirect` | `task-hero validate-dependencies` | ✅ Aligned | Both validate |
| `fixDependenciesDirect` | `task-hero fix-dependencies` | ✅ Aligned | Both fix dependencies |
| `analyzeTaskComplexityDirect` | `task-hero analyze-complexity` | ⚠️ Partial | Limited CLI access |
| `complexityReportDirect` | N/A | ❌ Missing | No CLI equivalent |
| `expandAllTasksDirect` | `task-hero expand-all` | ✅ Aligned | Both expand all |
| `updateTasksDirect` | `task-hero update` | ✅ Aligned | Both bulk update |
| `generateTaskFilesDirect` | `task-hero generate` | ✅ Aligned | Both generate files |
| `parsePRDDirect` | `task-hero parse-prd` | ✅ Aligned | Both parse PRDs |
| `modelsDirect` | `task-hero models` | ✅ Aligned | Both manage models |
| `initializeProjectDirect` | `task-hero init` | ⚠️ Different | Different implementations |

### 11.2 Priority Fixes Needed
1. **Add Missing CLI Commands**:
   - `remove-dependency`
   - `update-subtask`
   - `remove-subtask`
   - `clear-subtasks`
   - `complexity-report`

2. **Standardize Parameters**:
   - Ensure consistent naming between MCP and CLI
   - Align help text and descriptions
   - Standardize error messages

3. **Update Documentation**:
   - Sync command descriptions
   - Update help text in both interfaces
   - Create unified command reference

---

## 12. Implementation Code Examples

### 12.1 Enhanced TaskCard Component Structure
```typescript
// Enhanced TaskCard.tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Clock,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Circle,
  GitBranch
} from "lucide-react";

interface EnhancedTaskCardProps {
  task: EnhancedKanbanTask;
  isOverlay?: boolean;
  onTaskClick?: (taskId: string) => void;
}

export function EnhancedTaskCard({ task, isOverlay, onTaskClick }: EnhancedTaskCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const priorityColors = {
    high: 'border-l-red-500 bg-red-50',
    medium: 'border-l-yellow-500 bg-yellow-50',
    low: 'border-l-green-500 bg-green-50'
  };

  const statusIcons = {
    pending: Circle,
    'in-progress': AlertTriangle,
    review: Clock,
    done: CheckCircle,
    blocked: AlertTriangle
  };

  return (
    <Card className={`${priorityColors[task.priority]} border-l-4 transition-all hover:shadow-md`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge variant={task.status === 'done' ? 'default' : 'secondary'}>
            {React.createElement(statusIcons[task.status], { size: 12 })}
            {task.status}
          </Badge>
          {task.prdSource && (
            <Tooltip>
              <TooltipTrigger>
                <FileText size={14} className="text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                From: {task.prdSource.fileName}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <h3 className="font-medium text-sm mb-2 line-clamp-2">
          {task.title}
        </h3>

        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
          {task.description}
        </p>

        <div className="flex items-center justify-between text-xs">
          {task.subtaskProgress && (
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>{task.subtaskProgress.completed}/{task.subtaskProgress.total}</span>
              <Progress
                value={task.subtaskProgress.percentage}
                className="w-8 h-1"
              />
            </div>
          )}

          {task.dependencies.length > 0 && (
            <div className="flex items-center gap-1">
              <GitBranch size={12} />
              <span>{task.dependencies.length}</span>
            </div>
          )}

          {task.updatedAt && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock size={12} />
              <span>{formatRelativeTime(task.updatedAt)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 12.2 Data Transformation Function
```typescript
// Enhanced taskMasterToKanban conversion
export function taskMasterToKanban(task: TaskMasterTask): EnhancedKanbanTask {
  const columnId = STATUS_MAPPING[task.status] || 'todo';

  // Calculate subtask progress
  const subtaskProgress = task.subtasks?.length ? {
    completed: task.subtasks.filter(st => st.status === 'done').length,
    total: task.subtasks.length,
    percentage: (task.subtasks.filter(st => st.status === 'done').length / task.subtasks.length) * 100
  } : undefined;

  // Determine dependency status
  const dependencyStatus = task.dependencies.length === 0 ? 'none' : 'waiting'; // Would need to check actual dependency statuses

  return {
    id: String(task.id),
    content: task.title,
    columnId,
    title: task.title,
    description: task.description,
    priority: (task.priority as 'high' | 'medium' | 'low') || 'medium',
    status: task.status,
    subtaskProgress,
    dependencies: task.dependencies.map(dep => String(dep)),
    dependencyStatus,
    updatedAt: task.updatedAt ? new Date(task.updatedAt) : undefined,
    ageInDays: task.updatedAt ? Math.floor((Date.now() - new Date(task.updatedAt).getTime()) / (1000 * 60 * 60 * 24)) : undefined,
    prdSource: task.prdSource ? {
      fileName: task.prdSource.fileName,
      parsedDate: new Date(task.prdSource.parsedDate)
    } : undefined,
    hasTestStrategy: Boolean(task.testStrategy?.trim())
  };
}
```

---

*This comprehensive plan provides the foundation for creating modern, information-rich kanban cards that effectively display TaskMaster's extensive metadata while maintaining excellent user experience and accessibility standards.*
