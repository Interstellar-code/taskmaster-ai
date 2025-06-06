/**
 * Test script for Kanban board
 */

import { launchKanbanBoard } from '../../src/kanban/kanban-board.js';

console.log('Testing Kanban board...');

try {
	await launchKanbanBoard();
} catch (error) {
	console.error('Error:', error);
	process.exit(1);
}
