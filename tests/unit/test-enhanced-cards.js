/**
 * Test enhanced task cards
 */

import chalk from 'chalk';
import { KanbanColumn } from '../../src/kanban/components/column.js';
import { createTaskCard } from '../../src/kanban/components/task-card.js';

console.log(chalk.blue('Testing enhanced task cards...'));

// Test individual task card
const testTask = {
	id: 35,
	title: 'ASCII Task Card Design and Metadata Display',
	priority: 'high',
	dependencies: [34],
	prdSource: {
		filePath: 'kanban-view-prd.txt',
		fileName: 'kanban-view-prd.txt'
	},
	subtasks: [
		{ id: 1, title: 'Define ASCII Task Card Structure' },
		{ id: 2, title: 'Implement Core Task Data Display Logic' },
		{ id: 3, title: 'Develop Title Truncation' },
		{ id: 4, title: 'Ensure Card Column Width Compliance' }
	]
};

console.log('\n=== Individual Task Card Test ===');
const taskCard = createTaskCard(testTask, 50, false);
const cardLines = taskCard.renderAuto();
cardLines.forEach((line) => console.log(line));

console.log('\n=== Column with Enhanced Cards ===');
const column = new KanbanColumn('pending', 50, 20);
column.setTasks([testTask]);
column.setSelectedTask(0);

const columnLines = column.render();
columnLines.forEach((line) => console.log(line));

console.log('\n=== Compact Column Test ===');
const compactColumn = new KanbanColumn('in-progress', 25, 15);
compactColumn.setTasks([testTask]);
const compactLines = compactColumn.render();
compactLines.forEach((line) => console.log(line));

console.log('\nEnhanced task cards test completed!');
