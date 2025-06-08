/**
 * Simple test for Phase 1 components
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting simple Phase 1 test...');

try {
  // Test 1: Import database manager
  console.log('📊 Test 1: Importing database manager...');
  const { default: databaseManager } = await import('./utils/database.js');
  console.log('✅ Database manager imported successfully');

  // Test 2: Import schema
  console.log('📋 Test 2: Importing database schema...');
  const { DATABASE_SCHEMA } = await import('./models/schema.js');
  console.log('✅ Database schema imported successfully');
  console.log(`   Schema version: ${DATABASE_SCHEMA.version}`);
  console.log(`   Tables defined: ${Object.keys(DATABASE_SCHEMA.tables).length}`);

  // Test 3: Test database path generation
  console.log('🗂️ Test 3: Testing database path generation...');
  const testRoot = path.join(__dirname, '..', 'test-simple');
  const dbPath = databaseManager.getDatabasePath(testRoot);
  console.log('✅ Database path generated successfully');
  console.log(`   Path: ${dbPath}`);

  // Test 4: Import DAOs
  console.log('🏗️ Test 4: Importing DAOs...');
  const { default: ProjectDAO } = await import('./dao/ProjectDAO.js');
  const { default: TaskDAO } = await import('./dao/TaskDAO.js');
  const { default: PRDDAO } = await import('./dao/PRDDAO.js');
  const { default: ConfigurationDAO } = await import('./dao/ConfigurationDAO.js');
  console.log('✅ All DAOs imported successfully');

  // Test 5: Import utilities
  console.log('🛠️ Test 5: Importing utilities...');
  const { default: databaseInitializer } = await import('./utils/initialization.js');
  const { default: backupManager } = await import('./utils/backup.js');
  console.log('✅ All utilities imported successfully');

  console.log('\n🎉 All imports successful! Phase 1 components are ready.');
  
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}
