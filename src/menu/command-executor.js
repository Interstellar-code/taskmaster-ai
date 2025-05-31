/**
 * Command Executor for Interactive Menu
 * Handles execution of TaskMaster commands from the menu interface
 */

import { spawn } from 'child_process';
import chalk from 'chalk';
import inquirer from 'inquirer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Execute a TaskMaster command
 * @param {string} command - The command to execute (e.g., 'list', 'next')
 * @param {Array} args - Command arguments
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} - Execution result
 */
export async function executeCommand(command, args = [], options = {}) {
    const { 
        showOutput = true, 
        captureOutput = false,
        projectRoot = process.cwd()
    } = options;

    return new Promise((resolve, reject) => {
        // Path to the dev.js script
        const devScriptPath = path.resolve(__dirname, '../../scripts/dev.js');
        
        // Prepare command arguments
        const commandArgs = [devScriptPath, command, ...args];
        
        if (showOutput) {
            console.log(chalk.blue(`\n🔄 Executing: task-master ${command} ${args.join(' ')}`));
            console.log(chalk.gray('─'.repeat(50)));
        }

        // Spawn the process
        const child = spawn('node', commandArgs, {
            stdio: captureOutput ? 'pipe' : 'inherit',
            cwd: projectRoot,
            env: { ...process.env, FORCE_COLOR: '1' }
        });

        let stdout = '';
        let stderr = '';

        if (captureOutput) {
            child.stdout?.on('data', (data) => {
                stdout += data.toString();
                if (showOutput) {
                    process.stdout.write(data);
                }
            });

            child.stderr?.on('data', (data) => {
                stderr += data.toString();
                if (showOutput) {
                    process.stderr.write(data);
                }
            });
        }

        child.on('close', (code) => {
            if (showOutput) {
                console.log(chalk.gray('─'.repeat(50)));
                if (code === 0) {
                    console.log(chalk.green('✅ Command completed successfully'));
                } else {
                    console.log(chalk.red(`❌ Command failed with exit code ${code}`));
                    if (captureOutput && stderr) {
                        console.log(chalk.red('Error details:'));
                        console.log(chalk.gray(stderr));
                    }
                }
            }

            resolve({
                success: code === 0,
                exitCode: code,
                stdout: captureOutput ? stdout : null,
                stderr: captureOutput ? stderr : null,
                command: `${command} ${args.join(' ')}`
            });
        });

        child.on('error', (error) => {
            if (showOutput) {
                console.log(chalk.red(`❌ Error executing command: ${error.message}`));
                console.log(chalk.yellow('This might be due to:'));
                console.log(chalk.gray('- Missing dependencies'));
                console.log(chalk.gray('- Invalid command arguments'));
                console.log(chalk.gray('- System configuration issues'));
            }

            // Log error for debugging
            logError('Command execution error', error, { command, args });

            resolve({
                success: false,
                exitCode: -1,
                error: error.message,
                command: `${command} ${args.join(' ')}`
            });
        });
    });
}

/**
 * Execute command with parameter prompting
 * @param {string} command - The command to execute
 * @param {Array} parameterDefinitions - Parameter definitions for prompting
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} - Execution result
 */
export async function executeCommandWithParams(command, parameterDefinitions = [], options = {}) {
    try {
        // Validate parameter definitions
        if (!Array.isArray(parameterDefinitions)) {
            throw new Error('Parameter definitions must be an array');
        }

        // Prompt for parameters if needed
        const params = await promptForParameters(parameterDefinitions);

        // Validate required parameters
        const missingParams = parameterDefinitions
            .filter(def => def.required && (!params[def.name] || params[def.name] === ''))
            .map(def => def.name);

        if (missingParams.length > 0) {
            throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
        }

        // Build command arguments
        const args = buildCommandArgs(params);

        // Execute the command
        const result = await executeCommand(command, args, options);

        // Log successful execution
        if (result.success) {
            logInfo('Command executed successfully', { command, params, args });
        } else {
            logError('Command execution failed', new Error(`Exit code: ${result.exitCode}`), { command, params, args });
        }

        return result;
    } catch (error) {
        console.error(chalk.red('Error executing command with parameters:'), error.message);
        logError('Parameter processing error', error, { command, parameterDefinitions });
        return { success: false, error: error.message, command };
    }
}

/**
 * Prompt user for command parameters
 * @param {Array} parameterDefinitions - Array of parameter definitions
 * @returns {Promise<Object>} - User input values
 */
async function promptForParameters(parameterDefinitions) {
    if (!parameterDefinitions || parameterDefinitions.length === 0) {
        return {};
    }

    const questions = parameterDefinitions.map(param => {
        const question = {
            type: param.type || 'input',
            name: param.name,
            message: param.message || `Enter ${param.name}:`,
            default: param.default
        };

        // Add validation if specified
        if (param.validate) {
            question.validate = param.validate;
        }

        // Add choices for list type
        if (param.type === 'list' && param.choices) {
            question.choices = param.choices;
        }

        return question;
    });

    return await inquirer.prompt(questions);
}

/**
 * Build command arguments from parameter values
 * @param {Object} params - Parameter values
 * @returns {Array} - Command arguments array
 */
function buildCommandArgs(params) {
    const args = [];
    
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            if (typeof value === 'boolean') {
                if (value) {
                    args.push(`--${key}`);
                }
            } else {
                args.push(`--${key}=${value}`);
            }
        }
    }
    
    return args;
}

/**
 * Show command help and wait for user input
 * @param {string} command - Command name
 * @param {string} description - Command description
 * @param {string} usage - Usage example
 */
export async function showCommandHelp(command, description, usage) {
    console.log(chalk.blue(`\n📖 ${command.toUpperCase()}`));
    console.log(chalk.white(description));
    if (usage) {
        console.log(chalk.gray(`Usage: ${usage}`));
    }
    
    await inquirer.prompt([{
        type: 'input',
        name: 'continue',
        message: chalk.dim('Press Enter to continue...')
    }]);
}

/**
 * Common parameter definitions for reuse
 */
export const COMMON_PARAMS = {
    taskId: {
        name: 'id',
        type: 'input',
        message: 'Enter task ID:',
        validate: (input) => {
            const num = parseInt(input);
            return !isNaN(num) && num > 0 ? true : 'Please enter a valid task ID (positive number)';
        }
    },
    
    taskStatus: {
        name: 'status',
        type: 'list',
        message: 'Select new status:',
        choices: [
            'pending',
            'in-progress', 
            'done',
            'blocked',
            'deferred',
            'cancelled'
        ]
    },
    
    filePath: {
        name: 'input',
        type: 'input',
        message: 'Enter file path:',
        validate: (input) => input.trim().length > 0 ? true : 'File path cannot be empty'
    },
    
    numTasks: {
        name: 'num-tasks',
        type: 'input',
        message: 'Number of tasks to generate:',
        default: '10',
        validate: (input) => {
            const num = parseInt(input);
            return !isNaN(num) && num > 0 && num <= 50 ? true : 'Please enter a number between 1 and 50';
        }
    }
};

/**
 * Logging functions for error tracking and debugging
 */
export function logError(message, error, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level: 'ERROR',
        message,
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack
        },
        context
    };

    // In development, log to console
    if (process.env.DEBUG === '1' || process.env.NODE_ENV === 'development') {
        console.error(chalk.red(`[${timestamp}] ERROR: ${message}`));
        console.error(chalk.gray(JSON.stringify(context, null, 2)));
        console.error(chalk.gray(error.stack));
    }

    // TODO: In production, log to file or external service
    // writeLogToFile(logEntry);
}

export function logInfo(message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level: 'INFO',
        message,
        context
    };

    // In development, log to console
    if (process.env.DEBUG === '1' || process.env.NODE_ENV === 'development') {
        console.log(chalk.blue(`[${timestamp}] INFO: ${message}`));
        if (Object.keys(context).length > 0) {
            console.log(chalk.gray(JSON.stringify(context, null, 2)));
        }
    }
}

export function logWarning(message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        level: 'WARNING',
        message,
        context
    };

    // In development, log to console
    if (process.env.DEBUG === '1' || process.env.NODE_ENV === 'development') {
        console.warn(chalk.yellow(`[${timestamp}] WARNING: ${message}`));
        if (Object.keys(context).length > 0) {
            console.warn(chalk.gray(JSON.stringify(context, null, 2)));
        }
    }
}
