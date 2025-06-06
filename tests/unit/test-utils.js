/**
 * Test terminal utilities
 */

import chalk from 'chalk';
import {
	BOX_CHARS,
	getTerminalSize,
	calculateColumnWidths,
	createHorizontalLine,
	getStatusDisplay
} from '../../src/kanban/utils/terminal-utils.js';

console.log(chalk.blue('Testing terminal utilities...'));

// Test terminal size
const terminalSize = getTerminalSize();
console.log(`Terminal size: ${terminalSize.width}x${terminalSize.height}`);

// Test column width calculation
const columnWidths = calculateColumnWidths(terminalSize.width);
console.log(`Column width: ${columnWidths.columnWidth}`);

// Test box characters
console.log('\nBox characters test:');
console.log(createHorizontalLine(20));

// Test status display
const statusDisplay = getStatusDisplay('pending');
console.log(`\nStatus display: ${statusDisplay.emoji} ${statusDisplay.name}`);

console.log('\nTerminal utilities test completed!');
