#!/usr/bin/env node

/**
 * Menu launcher script
 * This provides an alternative way to launch the menu if the global command isn't working
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import and launch the menu
try {
    const { initializeInteractiveMenu } = await import('../src/menu/index.js');
    await initializeInteractiveMenu();
} catch (error) {
    console.error('Error launching menu:', error.message);
    console.log('\nTry running: node bin/task-master.js menu');
    process.exit(1);
}
