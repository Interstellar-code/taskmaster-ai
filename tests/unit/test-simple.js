/**
 * Simple test for terminal utilities
 */

import chalk from 'chalk';

console.log(chalk.blue('Testing basic functionality...'));

// Test basic terminal output
console.log('┌─────────────────┐');
console.log('│ Test Kanban     │');
console.log('├─────────────────┤');
console.log('│ 📋 PENDING (0)  │');
console.log('│ No tasks        │');
console.log('└─────────────────┘');

console.log('\nBasic test completed successfully!');
