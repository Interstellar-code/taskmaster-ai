/**
 * Test column component
 */

import chalk from 'chalk';
import { KanbanColumn } from '../../src/kanban/components/column.js';

console.log(chalk.blue('Testing column component...'));

// Create a test column
const column = new KanbanColumn('pending', 30, 15);

// Add some test tasks
const testTasks = [
	{
		id: 1,
		title: 'Test Task 1',
		priority: 'high',
		dependencies: [2],
		prdSource: { filePath: 'test.txt' }
	},
	{
		id: 2,
		title: 'Another Test Task with a Very Long Title',
		priority: 'medium',
		dependencies: [],
		prdSource: null
	}
];

column.setTasks(testTasks);
column.setSelectedTask(0);

// Render the column
const lines = column.render();
lines.forEach((line) => console.log(line));

console.log('\nColumn test completed!');
