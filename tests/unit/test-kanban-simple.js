/**
 * Test full Kanban board (without keyboard input)
 */

import chalk from 'chalk';
import { KanbanBoard } from '../../src/kanban/kanban-board.js';

console.log(chalk.blue('Testing full Kanban board...'));

// Create a test board
const board = new KanbanBoard();

try {
	// Load tasks
	await board.loadTasks();
	console.log(chalk.green('Tasks loaded successfully!'));

	// Test board rendering (just generate lines, don't start interactive mode)
	board.boardLayout.render();

	console.log(chalk.green('Kanban board test completed!'));
} catch (error) {
	console.error(chalk.red('Error testing Kanban board:'), error.message);
	console.error(error.stack);
}
