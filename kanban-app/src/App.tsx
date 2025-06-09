import { useState, useEffect } from "react";
import "./App.css";
import { EnhancedKanbanBoard } from "./components/EnhancedKanbanBoard";
import { PRDManagement } from "./components/PRDManagement";
import { ThemeToggle } from "./components/ThemeToggle";
import { ThemeProvider } from "./components/theme-provider";
import { FormDemo } from "./components/forms/FormDemo";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/toaster";

function App() {
  const [currentView, setCurrentView] = useState<'kanban' | 'forms' | 'prds'>('kanban');

  // Check URL parameters to determine initial view
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const prdFilter = urlParams.get('prd');
    const viewParam = urlParams.get('view');
    
    // If there's a PRD filter, show kanban view
    if (prdFilter) {
      setCurrentView('kanban');
    } else if (viewParam && ['kanban', 'forms', 'prds'].includes(viewParam)) {
      setCurrentView(viewParam as 'kanban' | 'forms' | 'prds');
    }
  }, []);

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
                variant={currentView === 'prds' ? 'default' : 'outline'}
                onClick={() => setCurrentView('prds')}
              >
                PRD Management
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
            ) : currentView === 'prds' ? (
              <PRDManagement />
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
