/**
 * Database-aware Add Task Command
 * Creates new tasks using SQLite database
 */

import chalk from 'chalk';
import boxen from 'boxen';
import { autoMigrateIfNeeded } from '../database/migrate-json-to-db.js';

/**
 * Add a new task to the database
 * @param {Object} taskData - Task data
 * @param {string} taskData.title - Task title
 * @param {string} taskData.description - Task description
 * @param {string} taskData.details - Implementation details
 * @param {Array} taskData.dependencies - Array of dependency task IDs
 * @param {string} taskData.priority - Task priority (low, medium, high, urgent)
 * @param {string} taskData.status - Task status (default: pending)
 * @param {number} taskData.complexityScore - Complexity score (0-10)
 * @param {Object} taskData.metadata - Additional metadata
 * @returns {Promise<Object>} Created task object
 */
async function addTaskDB(taskData) {
  try {
    console.log(chalk.blue(`📝 Creating new task: "${taskData.title}"...`));
    
    // Auto-migrate if needed
    await autoMigrateIfNeeded();
    
    // Initialize database
    const { default: cliDatabase } = await import('../database/cli-database.js');
    await cliDatabase.initialize();
    
    // Validate required fields
    if (!taskData.title || !taskData.description) {
      throw new Error('Task title and description are required');
    }
    
    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (taskData.priority && !validPriorities.includes(taskData.priority)) {
      throw new Error(`Invalid priority: ${taskData.priority}. Valid options: ${validPriorities.join(', ')}`);
    }
    
    // Validate status
    const validStatuses = ['pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled'];
    if (taskData.status && !validStatuses.includes(taskData.status)) {
      throw new Error(`Invalid status: ${taskData.status}. Valid options: ${validStatuses.join(', ')}`);
    }
    
    // Validate dependencies exist
    if (taskData.dependencies && taskData.dependencies.length > 0) {
      for (const depId of taskData.dependencies) {
        const depTask = await cliDatabase.getTask(depId);
        if (!depTask) {
          throw new Error(`Dependency task with ID "${depId}" not found`);
        }
      }
    }
    
    // Create task in database
    const newTask = await cliDatabase.createTask({
      title: taskData.title,
      description: taskData.description,
      details: taskData.details || '',
      dependencies: taskData.dependencies || [],
      priority: taskData.priority || 'medium',
      status: taskData.status || 'pending',
      complexityScore: taskData.complexityScore || 0,
      metadata: taskData.metadata || {}
    });
    
    if (newTask) {
      console.log(chalk.green(`✅ Task created successfully with ID: ${newTask.id}`));
      
      // Display task creation summary
      displayTaskCreationSuccess(newTask);
      
      // Show next steps
      showNextSteps(newTask);
      
      return newTask;
    } else {
      throw new Error('Failed to create task');
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error creating task:'), error.message);
    throw error;
  }
}

/**
 * Display task creation success message
 * @param {Object} task - Created task object
 */
function displayTaskCreationSuccess(task) {
  const priorityColors = {
    'urgent': 'red',
    'high': 'yellow',
    'medium': 'blue',
    'low': 'gray'
  };
  
  const priorityColor = priorityColors[task.priority] || 'blue';
  
  console.log('\n' + boxen(
    chalk.white.bold(`📋 Task Created Successfully`) + '\n\n' +
    
    chalk.gray('ID: ') + chalk.white.bold(task.id) + '\n' +
    chalk.gray('Title: ') + chalk.white.bold(task.title) + '\n' +
    chalk.gray('Status: ') + chalk.yellow(`⏱️ ${task.status}`) + '\n' +
    chalk.gray('Priority: ') + chalk[priorityColor](`${getPriorityIcon(task.priority)} ${task.priority}`) + '\n' +
    
    (task.description ? '\n' + chalk.gray('Description:') + '\n' + chalk.white(task.description) + '\n' : '') +
    
    (task.dependencies && task.dependencies.length > 0 ? 
      '\n' + chalk.gray('Dependencies: ') + chalk.cyan(task.dependencies.join(', ')) + '\n' : 
      '\n' + chalk.gray('Dependencies: ') + chalk.green('None') + '\n'
    ) +
    
    (task.complexityScore > 0 ? 
      chalk.gray('Complexity: ') + chalk.cyan(task.complexityScore) + '\n' : ''
    ),
    
    {
      padding: 1,
      borderColor: priorityColor,
      borderStyle: 'round',
      margin: { top: 1, bottom: 1 }
    }
  ));
}

/**
 * Show next steps after task creation
 * @param {Object} task - Created task object
 */
function showNextSteps(task) {
  const canStart = !task.dependencies || task.dependencies.length === 0;
  
  console.log(boxen(
    chalk.white.bold('🚀 Next Steps') + '\n\n' +
    
    (canStart ? 
      chalk.green('✅ This task is ready to start (no dependencies)') + '\n\n' :
      chalk.yellow('⏳ This task has dependencies that must be completed first') + '\n\n'
    ) +
    
    chalk.cyan(`task-hero show ${task.id}`) + chalk.gray(' - View full task details') + '\n' +
    chalk.cyan(`task-hero set-status --id=${task.id} --status=in-progress`) + chalk.gray(' - Start working on this task') + '\n' +
    chalk.cyan(`task-hero expand --id=${task.id}`) + chalk.gray(' - Break into subtasks') + '\n' +
    chalk.cyan(`task-hero next`) + chalk.gray(' - Find next available task'),
    
    {
      padding: 1,
      borderColor: canStart ? 'green' : 'yellow',
      borderStyle: 'round',
      margin: { top: 1 }
    }
  ));
}

/**
 * Get priority icon
 * @param {string} priority - Task priority
 * @returns {string} Priority icon
 */
function getPriorityIcon(priority) {
  const icons = {
    'urgent': '🔥',
    'high': '⬆️',
    'medium': '➡️',
    'low': '⬇️'
  };
  return icons[priority] || '➡️';
}

/**
 * Add multiple tasks in batch
 * @param {Array} tasksData - Array of task data objects
 * @returns {Promise<Array>} Array of created tasks
 */
export async function batchAddTasks(tasksData) {
  console.log(chalk.blue(`📝 Creating ${tasksData.length} tasks in batch...`));
  
  const createdTasks = [];
  let successCount = 0;
  let failureCount = 0;
  
  for (const taskData of tasksData) {
    try {
      const task = await addTaskDB(taskData);
      createdTasks.push(task);
      successCount++;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to create task "${taskData.title}": ${error.message}`));
      failureCount++;
    }
  }
  
  console.log(chalk.green(`✅ Batch creation completed: ${successCount} successful, ${failureCount} failed`));
  return createdTasks;
}

/**
 * Create task from AI prompt (wrapper for existing AI functionality)
 * @param {string} prompt - AI prompt for task creation
 * @param {Array} dependencies - Task dependencies
 * @param {string} priority - Task priority
 * @param {boolean} useResearch - Whether to use research capabilities
 * @returns {Promise<Object>} Created task object
 */
export async function createTaskFromAI(prompt, dependencies = [], priority = 'medium', useResearch = false) {
  try {
    console.log(chalk.blue(`🤖 Creating task from AI prompt: "${prompt}"...`));
    
    // Import the existing AI task creation functionality
    const { addTask } = await import('../task-operations.js');
    
    // Use the existing addTask function but ensure it uses database
    const context = {
      projectRoot: process.cwd(),
      commandName: 'add-task-db',
      outputType: 'cli'
    };
    
    const result = await addTask(
      null, // tasksPath - not needed for database
      prompt,
      dependencies,
      priority,
      context,
      'text', // outputFormat
      null, // manualTaskData
      useResearch
    );
    
    return result;
  } catch (error) {
    console.error(chalk.red('❌ Error creating task from AI:'), error.message);
    throw error;
  }
}

export default addTaskDB;
