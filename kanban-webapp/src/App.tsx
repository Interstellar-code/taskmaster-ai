import { KanbanBoard } from './components/KanbanBoard';

function App() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      <KanbanBoard />
    </div>
  );
}

export default App;
