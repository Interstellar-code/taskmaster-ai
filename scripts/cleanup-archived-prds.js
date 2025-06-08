#!/usr/bin/env node

/**
 * Cleanup script for PRDs that have status "archived" but are still in the main prds.json
 * This script will properly archive them using the archivePrd function
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the proper archive function
import { archivePrd } from './modules/prd-manager/prd-archiving.js';
import { getPRDsJsonPath } from './modules/prd-manager/prd-utils.js';

async function cleanupArchivedPRDs() {
    console.log(chalk.cyan('\n🧹 Cleaning up incorrectly archived PRDs...\n'));

    try {
        // Get the PRDs file path
        const prdsPath = getPRDsJsonPath();
        
        if (!fs.existsSync(prdsPath)) {
            console.log(chalk.yellow('No prds.json file found. Nothing to clean up.'));
            return;
        }

        // Read the current PRDs
        const prdsData = JSON.parse(fs.readFileSync(prdsPath, 'utf-8'));
        
        // Find PRDs with status "archived" that are still in the main list
        const archivedPRDs = prdsData.prds.filter(prd => prd.status === 'archived');
        
        if (archivedPRDs.length === 0) {
            console.log(chalk.green('✅ No incorrectly archived PRDs found. All good!'));
            return;
        }

        console.log(chalk.yellow(`Found ${archivedPRDs.length} PRDs with "archived" status that need proper archiving:`));
        archivedPRDs.forEach(prd => {
            console.log(chalk.gray(`  - ${prd.id}: ${prd.title}`));
        });

        console.log(chalk.cyan('\n📦 Starting proper archiving process...\n'));

        // Archive each PRD properly
        for (const prd of archivedPRDs) {
            console.log(chalk.blue(`Archiving ${prd.id}: ${prd.title}...`));
            
            try {
                const result = await archivePrd(prd.id, {
                    force: true // Force archive since they're already marked as archived
                });

                if (result.success) {
                    console.log(chalk.green(`✅ Successfully archived ${prd.id}`));
                    if (result.data) {
                        console.log(chalk.gray(`   Archive path: ${result.data.archivePath}`));
                        console.log(chalk.gray(`   Archived tasks: ${result.data.archivedTaskCount}`));
                    }
                } else {
                    console.log(chalk.red(`❌ Failed to archive ${prd.id}: ${result.error}`));
                }
            } catch (error) {
                console.log(chalk.red(`❌ Error archiving ${prd.id}: ${error.message}`));
            }
        }

        console.log(chalk.cyan('\n🎉 Cleanup process completed!'));
        
    } catch (error) {
        console.error(chalk.red('Error during cleanup:'), error.message);
        process.exit(1);
    }
}

// Run the cleanup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    cleanupArchivedPRDs().catch(error => {
        console.error(chalk.red('Cleanup failed:'), error);
        process.exit(1);
    });
}

export { cleanupArchivedPRDs }; 