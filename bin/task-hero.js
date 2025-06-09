#!/usr/bin/env node

/**
 * TaskHero
 * Copyright (c) 2025 Eyal Toledano, Ralph Khreish
 *
 * This software is licensed under the MIT License with Commons Clause.
 * You may use this software for any purpose, including commercial applications,
 * and modify and redistribute it freely, subject to the following restrictions:
 *
 * 1. You may not sell this software or offer it as a service.
 * 2. The origin of this software must not be misrepresented.
 * 3. Altered source versions must be plainly marked as such.
 *
 * For the full license text, see the LICENSE file in the root directory.
 */

/**
 * TaskHero CLI
 * Main entry point for globally installed package
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

import { runCLI } from '../scripts/modules/commands.js';
import chalk from 'chalk';

// Run the CLI directly
(async () => {
	try {
		await runCLI(process.argv);
	} catch (error) {
		console.error(chalk.red(`Error: ${error.message}`));
		process.exit(1);
	}
})();
