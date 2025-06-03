import { useState } from 'react';
import { Button } from './components/ui/button';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto p-8">
        <div className="flex flex-col items-center space-y-8">
          <h1 className="text-4xl font-bold text-center">
            TaskHero Kanban Webapp
          </h1>

          <div className="text-center space-y-4">
            <p className="text-lg text-muted-foreground">
              Tailwind CSS and shadcn/ui are successfully integrated!
            </p>

            <div className="flex gap-4 justify-center">
              <Button onClick={() => setCount(count => count + 1)}>
                Count is {count}
              </Button>

              <Button variant="outline">
                Outline Button
              </Button>

              <Button variant="secondary">
                Secondary Button
              </Button>

              <Button variant="destructive">
                Destructive Button
              </Button>
            </div>

            <div className="mt-8 p-6 border rounded-lg bg-card">
              <h2 className="text-xl font-semibold mb-4">Integration Test</h2>
              <p className="text-muted-foreground">
                This demonstrates that Tailwind CSS classes and shadcn/ui components
                are working correctly. The styling, colors, and component variants
                should all be properly applied.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
