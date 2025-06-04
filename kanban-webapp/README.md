# TaskMaster Kanban Webapp

A modern, responsive Kanban board interface for TaskMaster built with React, TypeScript, and shadcn/ui.

## Features

- ✅ **Responsive Three-Column Layout**: Pending, In-Progress, Done
- ✅ **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- ✅ **Task Management**: View tasks with metadata (priority, dependencies, subtasks)
- ✅ **Real-time Updates**: Optimistic updates with API integration
- ✅ **Drag & Drop Ready**: @dnd-kit integration for future drag-and-drop functionality
- ✅ **TypeScript**: Full type safety throughout the application
- ✅ **Responsive Design**: Works on desktop, tablet, and mobile devices

## Technology Stack

- **Frontend**: React 19.1.0 + TypeScript
- **UI Components**: shadcn/ui + Tailwind CSS v4.1.8
- **Drag & Drop**: @dnd-kit/core
- **Backend**: Express.js with TaskMaster MCP API integration
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with CSS variables for theming

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- TaskMaster project with tasks data

### Installation & Running

1. **Install dependencies**:
   ```bash
   cd kanban-webapp
   npm install
   ```

2. **Development mode** (runs both frontend and backend):
   ```bash
   npm run dev:full
   ```
   - Frontend: http://localhost:5173 (or 5174 if 5173 is in use)
   - Backend API: http://localhost:3002

3. **Frontend only**:
   ```bash
   npm run dev
   ```

4. **Backend only**:
   ```bash
   npm run dev:server
   ```

### Building for Production

```bash
npm run build
```

## API Integration

The Kanban board connects to TaskMaster MCP API endpoints:

- `GET /api/v1/tasks` - Fetch all tasks
- `PATCH /api/v1/tasks/:id/status` - Update task status
- `GET /api/v1/tasks/:id` - Get specific task details

## Development Scripts

- `npm run dev` - Start frontend development server
- `npm run dev:server` - Start backend server
- `npm run dev:full` - Start both frontend and backend
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier

## Important Notes

- Use `type` imports for TypeScript types (required by `verbatimModuleSyntax`)
- Ensure all builds pass before submitting changes
- Test both development and production builds
