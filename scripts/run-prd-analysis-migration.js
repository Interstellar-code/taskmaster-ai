#!/usr/bin/env node

/**
 * Run PRD analysis migration
 * Adds analysis fields to PRD table and creates task counting view
 */

import { migratePrdAnalysis } from './modules/database/migrate-prd-analysis.js';
import { findProjectRoot } from './modules/utils.js';

async function main() {
  try {
    const projectRoot = findProjectRoot();
    console.log('Running PRD analysis migration...');
    await migratePrdAnalysis(projectRoot);
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

main();
