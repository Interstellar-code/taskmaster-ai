#!/usr/bin/env node

/**
 * Test script to verify the configuration and PRD fixes
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log(chalk.blue('🔍 Testing TaskMaster AI Fixes\n'));

const tests = [
    {
        name: 'Configuration File Location',
        test: () => {
            const newConfigPath = path.join(rootDir, '.taskmaster', 'config.json');
            const oldConfigPath = path.join(rootDir, '.taskmasterconfig');
            
            if (fs.existsSync(newConfigPath)) {
                return `✅ New config found: .taskmaster/config.json`;
            } else if (fs.existsSync(oldConfigPath)) {
                return `⚠️  Using legacy config: .taskmasterconfig`;
            } else {
                throw new Error('No config file found');
            }
        }
    },
    {
        name: 'PRD Directory Structure',
        test: () => {
            const prdDir = path.join(rootDir, '.taskmaster', 'prd');
            const pendingDir = path.join(prdDir, 'pending');
            const inProgressDir = path.join(prdDir, 'in-progress');
            const doneDir = path.join(prdDir, 'done');
            
            const results = [];
            
            if (fs.existsSync(prdDir)) {
                results.push('✅ .taskmaster/prd/ exists');
            } else {
                results.push('❌ .taskmaster/prd/ missing');
            }
            
            if (fs.existsSync(pendingDir)) {
                const files = fs.readdirSync(pendingDir).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
                results.push(`✅ pending/ has ${files.length} PRD files`);
            } else {
                results.push('❌ pending/ directory missing');
            }
            
            if (fs.existsSync(inProgressDir)) {
                const files = fs.readdirSync(inProgressDir).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
                results.push(`✅ in-progress/ has ${files.length} PRD files`);
            } else {
                results.push('❌ in-progress/ directory missing');
            }
            
            if (fs.existsSync(doneDir)) {
                const files = fs.readdirSync(doneDir).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
                results.push(`✅ done/ has ${files.length} PRD files`);
            } else {
                results.push('❌ done/ directory missing');
            }
            
            return results.join('\n   ');
        }
    },
    {
        name: 'PRD Metadata File',
        test: () => {
            const prdsJsonPath = path.join(rootDir, '.taskmaster', 'prd', 'prds.json');
            
            if (!fs.existsSync(prdsJsonPath)) {
                throw new Error('prds.json not found');
            }
            
            const prdsData = JSON.parse(fs.readFileSync(prdsJsonPath, 'utf8'));
            const prdCount = prdsData.prds ? prdsData.prds.length : 0;
            
            return `✅ prds.json found with ${prdCount} PRDs`;
        }
    },
    {
        name: 'API Key Configuration',
        test: () => {
            const envPath = path.join(rootDir, '.env');
            
            if (!fs.existsSync(envPath)) {
                throw new Error('.env file not found');
            }
            
            const envContent = fs.readFileSync(envPath, 'utf8');
            const lines = envContent.split('\n').filter(line => line.includes('=') && !line.startsWith('#'));
            
            const apiKeys = {};
            lines.forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    apiKeys[key.trim()] = value.trim();
                }
            });
            
            const keyStatus = [];
            const requiredKeys = ['ANTHROPIC_API_KEY', 'OPENROUTER_API_KEY', 'PERPLEXITY_API_KEY'];
            const optionalKeys = ['OPENAI_API_KEY', 'GOOGLE_API_KEY', 'XAI_API_KEY'];
            
            for (const key of requiredKeys) {
                const value = apiKeys[key];
                if (value && !value.includes('YOUR_') && !value.includes('_HERE')) {
                    keyStatus.push(`✅ ${key}: configured`);
                } else {
                    keyStatus.push(`❌ ${key}: placeholder/missing`);
                }
            }
            
            for (const key of optionalKeys) {
                const value = apiKeys[key];
                if (value && !value.includes('YOUR_') && !value.includes('_HERE')) {
                    keyStatus.push(`✅ ${key}: configured`);
                } else {
                    keyStatus.push(`⚠️  ${key}: placeholder/missing`);
                }
            }
            
            return keyStatus.join('\n   ');
        }
    },
    {
        name: 'Task Files Structure',
        test: () => {
            const tasksDir = path.join(rootDir, '.taskmaster', 'tasks');
            const tasksJsonPath = path.join(tasksDir, 'tasks.json');
            
            if (!fs.existsSync(tasksDir)) {
                throw new Error('tasks directory not found');
            }
            
            if (!fs.existsSync(tasksJsonPath)) {
                throw new Error('tasks.json not found');
            }
            
            const tasksData = JSON.parse(fs.readFileSync(tasksJsonPath, 'utf8'));
            const taskCount = tasksData.tasks ? tasksData.tasks.length : 0;
            
            const taskFiles = fs.readdirSync(tasksDir).filter(f => f.startsWith('task_') && f.endsWith('.txt'));
            
            return `✅ tasks.json with ${taskCount} tasks, ${taskFiles.length} task files`;
        }
    },
    {
        name: 'Menu System Files',
        test: () => {
            const menuIndexPath = path.join(rootDir, 'src', 'menu', 'index.js');
            const commandExecutorPath = path.join(rootDir, 'src', 'menu', 'command-executor.js');
            
            if (!fs.existsSync(menuIndexPath)) {
                throw new Error('menu index.js not found');
            }
            
            if (!fs.existsSync(commandExecutorPath)) {
                throw new Error('command-executor.js not found');
            }
            
            // Check if the fixes are in place
            const menuContent = fs.readFileSync(menuIndexPath, 'utf8');
            const hasNewSearchPaths = menuContent.includes('.taskmaster/prd/pending');
            const hasPrdShowHandler = menuContent.includes('handlePrdShow');
            
            const results = [];
            results.push('✅ Menu files exist');
            results.push(hasNewSearchPaths ? '✅ Updated PRD search paths' : '❌ Old PRD search paths');
            results.push(hasPrdShowHandler ? '✅ Fixed PRD show handler' : '❌ Old PRD show handler');
            
            return results.join('\n   ');
        }
    }
];

let passed = 0;
let failed = 0;

console.log('Running fix verification tests...\n');

for (const test of tests) {
    try {
        const result = test.test();
        console.log(`${chalk.green('✅')} ${chalk.bold(test.name)}`);
        if (result.includes('\n')) {
            console.log(`   ${result}`);
        } else {
            console.log(`   ${result}`);
        }
        console.log('');
        passed++;
    } catch (error) {
        console.log(`${chalk.red('❌')} ${chalk.bold(test.name)}`);
        console.log(`   ${chalk.red(error.message)}`);
        console.log('');
        failed++;
    }
}

console.log(`${chalk.cyan('📊 Test Results')}: ${chalk.green(passed)} passed, ${chalk.red(failed)} failed\n`);

if (failed === 0) {
    console.log(chalk.green('🎉 All fixes verified successfully!\n'));
    console.log(chalk.blue('Next steps:'));
    console.log('1. Configure API keys: node scripts/setup-api-keys.js');
    console.log('2. Test PRD parsing: task-master menu');
    console.log('3. Test PRD management: task-master menu > Project Management > PRD Management');
} else {
    console.log(chalk.yellow('⚠️  Some issues detected. Please review the failed tests above.\n'));
    console.log(chalk.blue('Troubleshooting:'));
    console.log('1. Check file permissions');
    console.log('2. Verify directory structure');
    console.log('3. Run: task-master init (if needed)');
    console.log('4. See: docs/config-and-prd-fixes.md');
}

console.log(chalk.gray('\nFor detailed information, see: docs/config-and-prd-fixes.md'));
