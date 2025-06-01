/**
 * Test board layout
 */

import chalk from 'chalk';
import { BoardLayout } from '../../src/kanban/components/board-layout.js';

console.log(chalk.blue('Testing board layout...'));

// Create a test board
const board = new BoardLayout();

// Add some test tasks
const testTasks = [
    {
        id: 1,
        title: 'Pending Task',
        status: 'pending',
        priority: 'high',
        dependencies: [],
        prdSource: { filePath: 'test.txt' }
    },
    {
        id: 2,
        title: 'In Progress Task',
        status: 'in-progress',
        priority: 'medium',
        dependencies: [1],
        prdSource: null
    },
    {
        id: 3,
        title: 'Done Task',
        status: 'done',
        priority: 'low',
        dependencies: [],
        prdSource: null
    }
];

board.loadTasks(testTasks);

// Generate board lines (don't render to avoid clearing screen)
const lines = board.generateBoardLines();
console.log('Board preview (first 10 lines):');
lines.slice(0, 10).forEach(line => console.log(line));

console.log('\nBoard layout test completed!');
