import { useState } from "react";
import "./App.css";
import { EnhancedKanbanBoard } from "./components/EnhancedKanbanBoard";
import { ThemeToggle } from "./components/ThemeToggle";
import { ThemeProvider } from "./components/theme-provider";
import { FormDemo } from "./components/forms/FormDemo";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/toaster";

function App() {
  const [currentView, setCurrentView] = useState<'kanban' | 'forms'>('kanban');

  return (
    <>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <div className="min-h-screen flex flex-col">
          <header className="flex justify-between items-center w-full flex-row p-4">
            <nav className="flex gap-2">
              <Button
                variant={currentView === 'kanban' ? 'default' : 'outline'}
                onClick={() => setCurrentView('kanban')}
              >
                Kanban Board
              </Button>
              <Button
                variant={currentView === 'forms' ? 'default' : 'outline'}
                onClick={() => setCurrentView('forms')}
              >
                Form Components
              </Button>
            </nav>
            <ThemeToggle />
          </header>
          <main className="mx-4 flex flex-col gap-6">
            {currentView === 'kanban' ? (
              <>
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                  TaskHero - AI Kanban Board
                </h1>
                <EnhancedKanbanBoard />
              </>
            ) : (
              <FormDemo />
            )}
          </main>
        </div>
        <Toaster />
      </ThemeProvider>
    </>
  );
}

export default App;
