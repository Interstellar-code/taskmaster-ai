/**
 * Database-aware Show Task Command
 * Displays detailed information about a specific task using SQLite database
 */

import chalk from 'chalk';
import boxen from 'boxen';
import { autoMigrateIfNeeded } from '../database/migrate-json-to-db.js';

/**
 * Show detailed information about a specific task from database
 * @param {string} taskId - Task ID to show
 * @param {string} statusFilter - Optional status filter for subtasks
 * @returns {Promise<void>}
 */
async function showTaskDB(taskId, statusFilter = null) {
  try {
    console.log(chalk.blue(`🔍 Loading task details for ID: ${taskId}...`));
    
    // Auto-migrate if needed
    await autoMigrateIfNeeded();
    
    // Initialize database
    const { default: cliDatabase } = await import('../database/cli-database.js');
    await cliDatabase.initialize();
    
    // Get task from database
    const task = await cliDatabase.getTask(taskId);
    
    if (!task) {
      console.log(chalk.red(`❌ Task with ID "${taskId}" not found.`));
      return;
    }
    
    // Display task information
    displayTaskDetails(task, statusFilter);
    
    // Get and display subtasks if any
    const subtasks = await cliDatabase.getSubtasks(taskId);
    if (subtasks && subtasks.length > 0) {
      displaySubtasks(subtasks, statusFilter);
    }
    
    // Get and display dependencies
    const dependencies = await cliDatabase.getTaskDependencies(taskId);
    if (dependencies && dependencies.length > 0) {
      displayDependencies(dependencies);
    }
    
    // Get tasks that depend on this task
    const dependents = await cliDatabase.getTaskDependents(taskId);
    if (dependents && dependents.length > 0) {
      displayDependents(dependents);
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error showing task:'), error.message);
    throw error;
  }
}

/**
 * Display main task details
 * @param {Object} task - Task object from database
 * @param {string} statusFilter - Optional status filter
 */
function displayTaskDetails(task, statusFilter) {
  const statusColors = {
    'pending': 'yellow',
    'in-progress': 'blue', 
    'done': 'green',
    'blocked': 'red',
    'deferred': 'gray',
    'cancelled': 'gray'
  };
  
  const priorityColors = {
    'urgent': 'red',
    'high': 'yellow',
    'medium': 'blue',
    'low': 'gray'
  };
  
  const statusColor = statusColors[task.status] || 'white';
  const priorityColor = priorityColors[task.priority] || 'white';
  
  // Parse metadata if it's a string
  let metadata = {};
  try {
    metadata = typeof task.metadata === 'string' ? JSON.parse(task.metadata) : (task.metadata || {});
  } catch (e) {
    metadata = {};
  }
  
  console.log('\n' + boxen(
    chalk.white.bold(`📋 Task Details: ${task.title}`) + '\n\n' +
    
    chalk.gray('ID: ') + chalk.white.bold(task.id || task.task_identifier) + '\n' +
    chalk.gray('Status: ') + chalk[statusColor].bold(`${getStatusIcon(task.status)} ${task.status}`) + '\n' +
    chalk.gray('Priority: ') + chalk[priorityColor].bold(`${getPriorityIcon(task.priority)} ${task.priority}`) + '\n' +
    chalk.gray('Complexity: ') + chalk.cyan(task.complexity_score || 'N/A') + '\n' +
    
    (task.description ? '\n' + chalk.gray('Description:') + '\n' + chalk.white(task.description) + '\n' : '') +
    
    (task.details ? '\n' + chalk.gray('Details:') + '\n' + chalk.white(task.details) + '\n' : '') +
    
    (metadata.test_strategy ? '\n' + chalk.gray('Test Strategy:') + '\n' + chalk.white(metadata.test_strategy) + '\n' : '') +
    
    '\n' + chalk.gray('Created: ') + chalk.white(formatDate(task.created_at)) +
    '\n' + chalk.gray('Updated: ') + chalk.white(formatDate(task.updated_at)) +
    
    (task.prd_id ? '\n' + chalk.gray('PRD Source: ') + chalk.cyan(`PRD ${task.prd_id}`) : ''),
    
    {
      padding: 1,
      borderColor: statusColor,
      borderStyle: 'round',
      margin: { top: 1, bottom: 1 }
    }
  ));
}

/**
 * Display subtasks
 * @param {Array} subtasks - Array of subtask objects
 * @param {string} statusFilter - Optional status filter
 */
function displaySubtasks(subtasks, statusFilter) {
  let filteredSubtasks = subtasks;
  
  if (statusFilter) {
    filteredSubtasks = subtasks.filter(subtask => subtask.status === statusFilter);
  }
  
  if (filteredSubtasks.length === 0) {
    if (statusFilter) {
      console.log(chalk.yellow(`📝 No subtasks found with status: ${statusFilter}`));
    }
    return;
  }
  
  console.log(boxen(
    chalk.white.bold('📝 Subtasks') + 
    (statusFilter ? chalk.gray(` (filtered by: ${statusFilter})`) : '') + 
    '\n\n' +
    filteredSubtasks.map(subtask => {
      const statusIcon = getStatusIcon(subtask.status);
      const priorityIcon = getPriorityIcon(subtask.priority);
      return `${statusIcon} ${chalk.white.bold(subtask.task_identifier)} - ${subtask.title}\n` +
             `   ${chalk.gray('Status:')} ${subtask.status} ${chalk.gray('Priority:')} ${priorityIcon} ${subtask.priority}`;
    }).join('\n\n'),
    
    {
      padding: 1,
      borderColor: 'blue',
      borderStyle: 'round',
      margin: { top: 1, bottom: 1 }
    }
  ));
}

/**
 * Display task dependencies
 * @param {Array} dependencies - Array of dependency objects
 */
function displayDependencies(dependencies) {
  console.log(boxen(
    chalk.white.bold('🔗 Dependencies') + '\n\n' +
    chalk.gray('This task depends on:') + '\n' +
    dependencies.map(dep => 
      `• ${chalk.cyan(dep.depends_on_identifier)} - ${dep.depends_on_title} (${dep.depends_on_status})`
    ).join('\n'),
    
    {
      padding: 1,
      borderColor: 'yellow',
      borderStyle: 'round',
      margin: { top: 1, bottom: 1 }
    }
  ));
}

/**
 * Display tasks that depend on this task
 * @param {Array} dependents - Array of dependent task objects
 */
function displayDependents(dependents) {
  console.log(boxen(
    chalk.white.bold('⬅️  Dependents') + '\n\n' +
    chalk.gray('These tasks depend on this task:') + '\n' +
    dependents.map(dep => 
      `• ${chalk.cyan(dep.task_identifier)} - ${dep.title} (${dep.status})`
    ).join('\n'),
    
    {
      padding: 1,
      borderColor: 'magenta',
      borderStyle: 'round',
      margin: { top: 1, bottom: 1 }
    }
  ));
}

/**
 * Get status icon
 * @param {string} status - Task status
 * @returns {string} Status icon
 */
function getStatusIcon(status) {
  const icons = {
    'pending': '⏱️',
    'in-progress': '🔄',
    'done': '✅',
    'blocked': '🚫',
    'deferred': '⏸️',
    'cancelled': '❌'
  };
  return icons[status] || '📋';
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
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  } catch (e) {
    return dateString;
  }
}

export default showTaskDB;
