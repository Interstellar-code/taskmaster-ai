/**
 * Database-aware Set Task Status Command
 * Updates task status using SQLite database
 */

import chalk from 'chalk';
import boxen from 'boxen';
import { autoMigrateIfNeeded } from '../database/migrate-json-to-db.js';

/**
 * Set task status in database
 * @param {string} taskId - Task ID to update
 * @param {string} newStatus - New status to set
 * @returns {Promise<void>}
 */
async function setTaskStatusDB(taskId, newStatus) {
  try {
    console.log(chalk.blue(`🔄 Updating task ${taskId} status to "${newStatus}"...`));
    
    // Auto-migrate if needed
    await autoMigrateIfNeeded();
    
    // Initialize database
    const { default: cliDatabase } = await import('../database/cli-database.js');
    await cliDatabase.initialize();
    
    // Validate status
    const validStatuses = ['pending', 'in-progress', 'done', 'review', 'blocked', 'deferred', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      console.error(chalk.red(`❌ Invalid status: "${newStatus}"`));
      console.log(chalk.yellow(`Valid statuses: ${validStatuses.join(', ')}`));
      return;
    }
    
    // Get current task to verify it exists
    const currentTask = await cliDatabase.getTask(taskId);
    if (!currentTask) {
      console.error(chalk.red(`❌ Task with ID "${taskId}" not found.`));
      return;
    }
    
    // Store old status for comparison
    const oldStatus = currentTask.status;
    
    // Update task status
    const success = await cliDatabase.updateTaskStatus(taskId, newStatus);
    
    if (success) {
      console.log(chalk.green(`✅ Task ${taskId} status updated successfully!`));
      
      // Display status change summary
      displayStatusChangeSuccess(currentTask, oldStatus, newStatus);
      
      // Check for dependency implications
      await checkDependencyImplications(taskId, newStatus, cliDatabase);
      
    } else {
      console.error(chalk.red(`❌ Failed to update task ${taskId} status.`));
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Error updating task status:'), error.message);
    throw error;
  }
}

/**
 * Display status change success message
 * @param {Object} task - Task object
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 */
function displayStatusChangeSuccess(task, oldStatus, newStatus) {
  const statusColors = {
    'pending': 'yellow',
    'in-progress': 'blue',
    'done': 'green',
    'review': 'cyan',
    'blocked': 'red',
    'deferred': 'gray',
    'cancelled': 'gray'
  };
  
  const oldColor = statusColors[oldStatus] || 'white';
  const newColor = statusColors[newStatus] || 'white';
  
  console.log('\n' + boxen(
    chalk.white.bold(`📋 Task Status Updated`) + '\n\n' +
    
    chalk.gray('Task: ') + chalk.white.bold(`${task.id} - ${task.title}`) + '\n' +
    chalk.gray('Status Change: ') + 
    chalk[oldColor](`${getStatusIcon(oldStatus)} ${oldStatus}`) + 
    chalk.gray(' → ') + 
    chalk[newColor].bold(`${getStatusIcon(newStatus)} ${newStatus}`) + '\n' +
    
    (newStatus === 'done' ? 
      '\n' + chalk.green.bold('🎉 Congratulations! Task completed!') :
      newStatus === 'in-progress' ?
      '\n' + chalk.blue.bold('🚀 Task is now in progress. Good luck!') :
      newStatus === 'blocked' ?
      '\n' + chalk.red.bold('🚫 Task is blocked. Consider reviewing dependencies.') :
      ''
    ),
    
    {
      padding: 1,
      borderColor: newColor,
      borderStyle: 'round',
      margin: { top: 1, bottom: 1 }
    }
  ));
}

/**
 * Check for dependency implications when status changes
 * @param {string} taskId - Task ID that was updated
 * @param {string} newStatus - New status
 * @param {Object} cliDatabase - Database connection
 */
async function checkDependencyImplications(taskId, newStatus, cliDatabase) {
  try {
    // If task is completed, check for dependent tasks that can now proceed
    if (newStatus === 'done') {
      const dependents = await cliDatabase.getTaskDependents(taskId);
      
      if (dependents && dependents.length > 0) {
        const readyTasks = [];
        
        for (const dependent of dependents) {
          const depTask = await cliDatabase.getTask(dependent.task_identifier);
          if (depTask && depTask.status === 'pending') {
            // Check if all dependencies are satisfied
            const allDeps = await cliDatabase.getTaskDependencies(dependent.task_identifier);
            const allSatisfied = allDeps.every(dep => dep.depends_on_status === 'done');
            
            if (allSatisfied) {
              readyTasks.push(dependent);
            }
          }
        }
        
        if (readyTasks.length > 0) {
          console.log(boxen(
            chalk.white.bold('🔓 Tasks Now Available') + '\n\n' +
            chalk.gray('Completing this task has unblocked:') + '\n' +
            readyTasks.map(task => 
              `• ${chalk.cyan(task.task_identifier)} - ${task.title}`
            ).join('\n') + '\n\n' +
            chalk.yellow.bold('💡 Suggested next steps:') + '\n' +
            readyTasks.slice(0, 2).map(task => 
              `  task-hero set-status --id=${task.task_identifier} --status=in-progress`
            ).join('\n'),
            
            {
              padding: 1,
              borderColor: 'green',
              borderStyle: 'round',
              margin: { top: 1 }
            }
          ));
        }
      }
    }
    
    // If task is set to in-progress, show quick action suggestions
    if (newStatus === 'in-progress') {
      console.log(boxen(
        chalk.white.bold('🚀 Quick Actions') + '\n\n' +
        chalk.cyan(`task-hero show ${taskId}`) + chalk.gray(' - View task details') + '\n' +
        chalk.cyan(`task-hero expand --id=${taskId}`) + chalk.gray(' - Break into subtasks') + '\n' +
        chalk.cyan(`task-hero next`) + chalk.gray(' - Find next available task'),
        
        {
          padding: 1,
          borderColor: 'blue',
          borderStyle: 'round',
          margin: { top: 1 }
        }
      ));
    }
    
  } catch (error) {
    // Don't fail the main operation if dependency check fails
    console.log(chalk.yellow('⚠️  Could not check dependency implications'));
  }
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
    'review': '👀',
    'blocked': '🚫',
    'deferred': '⏸️',
    'cancelled': '❌'
  };
  return icons[status] || '📋';
}

/**
 * Batch update multiple task statuses
 * @param {Array} updates - Array of {taskId, status} objects
 * @returns {Promise<void>}
 */
export async function batchUpdateTaskStatuses(updates) {
  console.log(chalk.blue(`🔄 Batch updating ${updates.length} task statuses...`));
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const update of updates) {
    try {
      await setTaskStatusDB(update.taskId, update.status);
      successCount++;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to update task ${update.taskId}: ${error.message}`));
      failureCount++;
    }
  }
  
  console.log(chalk.green(`✅ Batch update completed: ${successCount} successful, ${failureCount} failed`));
}

export default setTaskStatusDB;
