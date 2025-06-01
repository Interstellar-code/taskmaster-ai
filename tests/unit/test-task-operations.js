/**
 * Test task operations
 */

import chalk from 'chalk';
import { createTaskOperationsHandler } from '../../src/kanban/handlers/task-operations.js';

console.log(chalk.blue('Testing task operations...'));

// Mock kanban board
const mockBoard = {
    projectRoot: process.cwd(),
    tasksPath: './tasks/tasks.json',
    tasks: [],
    async loadTasks() {
        console.log('Mock: Loading tasks...');
    }
};

// Create handler
const handler = createTaskOperationsHandler(mockBoard);

// Test task
const testTask = {
    id: 37,
    title: 'Quick Task Operations via Keyboard',
    status: 'pending',
    priority: 'high',
    dependencies: [36],
    prdSource: { 
        filePath: 'kanban-view-prd.txt',
        fileName: 'kanban-view-prd.txt'
    },
    description: 'Implement quick task operations accessible via keyboard shortcuts including view details (V), delete (D), edit title (E), show info (I), and refresh board (R).',
    details: 'Create handlers for keyboard shortcuts that allow users to quickly perform common task operations without leaving the Kanban board interface.'
};

console.log('\n=== Testing View Task Details ===');
const viewResult = handler.viewTaskDetails(testTask);
console.log('View result:', viewResult.success ? 'SUCCESS' : 'FAILED');

console.log('\n=== Testing Show Task Info ===');
const infoResult = handler.showTaskInfo(testTask);
console.log('Info result:', infoResult.success ? 'SUCCESS' : 'FAILED');

console.log('\n=== Testing Delete Task ===');
const deleteResult = await handler.deleteTask(testTask);
console.log('Delete result:', deleteResult.requiresConfirmation ? 'CONFIRMATION REQUIRED' : 'FAILED');

console.log('\n=== Testing Edit Task ===');
const editResult = await handler.editTaskTitle(testTask);
console.log('Edit result:', editResult.requiresInput ? 'INPUT REQUIRED' : 'FAILED');

console.log('\nTask operations test completed!');
