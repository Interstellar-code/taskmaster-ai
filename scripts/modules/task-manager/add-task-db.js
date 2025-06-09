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

    // Initialize unified database
    const { default: databaseManager } = await import('../../../api/utils/database.js');
    await databaseManager.initialize(process.cwd());

    // Import TaskDAO for unified database operations
    const { default: TaskDAO } = await import('../../../api/dao/TaskDAO.js');

    // Validate required fields
    if (!taskData.title || !taskData.description) {
      throw new Error('Task title and description are required');
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'critical'];
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
        const depTask = await TaskDAO.findById(depId);
        if (!depTask) {
          throw new Error(`Dependency task with ID "${depId}" not found`);
        }
      }
    }

    // Create task in unified database
    const taskCreateData = {
      title: taskData.title,
      description: taskData.description,
      details: taskData.details || '',
      test_strategy: taskData.testStrategy || '',
      status: taskData.status || 'pending',
      priority: taskData.priority || 'medium',
      complexity_score: taskData.complexityScore || 0,
      metadata: JSON.stringify({
        dependencies: taskData.dependencies || [],
        ...taskData.metadata
      })
    };

    const newTask = await TaskDAO.create(taskCreateData);

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
 * Create task from AI prompt using unified API database
 * @param {string} prompt - AI prompt for task creation
 * @param {Array} dependencies - Task dependencies
 * @param {string} priority - Task priority
 * @param {boolean} useResearch - Whether to use research capabilities
 * @returns {Promise<Object>} Created task object
 */
export async function createTaskFromAI(prompt, dependencies = [], priority = 'medium', useResearch = false) {
  try {
    console.log(chalk.blue(`🤖 Creating task from AI prompt: "${prompt}"...`));

    // Initialize unified database
    const { default: databaseManager } = await import('../../../api/utils/database.js');
    await databaseManager.initialize(process.cwd());

    // Import TaskDAO for unified database operations
    const { default: TaskDAO } = await import('../../../api/dao/TaskDAO.js');

    // Import AI service
    const { generateObjectService } = await import('../ai-services-unified.js');

    // Import Zod for schema definition
    const { z } = await import('zod');

    // Define schema for AI task generation
    const AiTaskDataSchema = z.object({
      title: z.string().describe('Clear, concise title for the task'),
      description: z.string().describe('A one or two sentence description of the task'),
      details: z.string().describe('In-depth implementation details, considerations, and guidance'),
      testStrategy: z.string().describe('Detailed approach for verifying task completion'),
      dependencies: z.array(z.number()).optional().describe('Array of task IDs that this task depends on (must be completed before this task can start)')
    });

    // Create AI prompts
    const systemPrompt = `You are an expert software architect and project manager. Create a detailed, actionable task based on the user's prompt. Focus on:
1. Clear, specific implementation steps
2. Technical considerations and best practices
3. Comprehensive testing strategy
4. Realistic scope and dependencies

Provide practical, executable guidance that a developer can follow immediately.`;

    const userPrompt = `Create a detailed task for: ${prompt}

Priority: ${priority}
${dependencies.length > 0 ? `Dependencies: ${dependencies.join(', ')}` : 'No dependencies'}

Generate a comprehensive task with implementation details and testing strategy.`;

    // Generate task data using AI
    console.log(chalk.yellow('🔄 Generating task details with AI...'));

    const aiResponse = await generateObjectService({
      role: useResearch ? 'research' : 'main',
      session: null,
      projectRoot: process.cwd(),
      schema: AiTaskDataSchema,
      objectName: 'newTaskData',
      systemPrompt: systemPrompt,
      prompt: userPrompt,
      commandName: 'add-task-db',
      outputType: 'cli'
    });

    if (!aiResponse || !aiResponse.mainResult) {
      throw new Error('AI service did not return the expected object structure.');
    }

    // Extract task data from AI response
    let taskData;
    if (aiResponse.mainResult.title && aiResponse.mainResult.description) {
      taskData = aiResponse.mainResult;
    } else if (aiResponse.mainResult.object && aiResponse.mainResult.object.title) {
      taskData = aiResponse.mainResult.object;
    } else {
      throw new Error('AI service did not return a valid task object.');
    }

    console.log(chalk.green('✅ AI task generation completed'));

    // Validate dependencies exist in database
    if (dependencies && dependencies.length > 0) {
      for (const depId of dependencies) {
        const depTask = await TaskDAO.findById(depId);
        if (!depTask) {
          throw new Error(`Dependency task with ID "${depId}" not found`);
        }
      }
    }

    // Create task in unified database
    const taskCreateData = {
      title: taskData.title,
      description: taskData.description,
      details: taskData.details || '',
      test_strategy: taskData.testStrategy || '',
      status: 'pending',
      priority: priority,
      complexity_score: 0,
      metadata: JSON.stringify({
        ai_generated: true,
        generation_date: new Date().toISOString(),
        prompt: prompt,
        research_mode: useResearch,
        dependencies: dependencies || []
      })
    };

    const newTask = await TaskDAO.create(taskCreateData);

    if (newTask) {
      console.log(chalk.green(`✅ Task created successfully with ID: ${newTask.id}`));

      // Display task creation summary
      displayTaskCreationSuccess(newTask);

      // Show next steps
      showNextSteps(newTask);

      return newTask;
    } else {
      throw new Error('Failed to create task in database');
    }

  } catch (error) {
    console.error(chalk.red('❌ Error creating task from AI:'), error.message);
    throw error;
  }
}

export default addTaskDB;
