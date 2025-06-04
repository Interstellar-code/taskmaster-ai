import "./App.css";
import { EnhancedKanbanBoard } from "./components/EnhancedKanbanBoard";
import { ThemeToggle } from "./components/ThemeToggle";
import { ThemeProvider } from "./components/theme-provider";

function App() {
  return (
    <>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <div className="min-h-screen flex flex-col">
          <header className="flex justify-end w-full flex-row p-4">
            <ThemeToggle />
          </header>
          <main className="mx-4 flex flex-col gap-6">
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              TaskHero - Enhanced Kanban Board
            </h1>
            <EnhancedKanbanBoard />
            <p className="leading-7 [&:not(:first-child)]:mt-6">
              Rich task metadata display with priority indicators, progress tracking, and dependency management.
            </p>
          </main>

        </div>
      </ThemeProvider>
    </>
  );
}

export default App;
