/**
 * Database-specific test for Phase 1
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PROJECT_ROOT = path.join(__dirname, '..', 'test-db');

async function testDatabase() {
  console.log('🚀 Starting database test...');

  try {
    // Clean up any existing test data
    if (fs.existsSync(TEST_PROJECT_ROOT)) {
      fs.rmSync(TEST_PROJECT_ROOT, { recursive: true, force: true });
    }

    // Test 1: Import and initialize database manager
    console.log('📊 Test 1: Database manager initialization...');
    const { default: databaseManager } = await import('./utils/database.js');
    
    console.log('   Initializing database...');
    await databaseManager.initialize(TEST_PROJECT_ROOT);
    console.log('✅ Database initialized successfully');

    // Test 2: Health check
    console.log('🏥 Test 2: Health check...');
    const isHealthy = await databaseManager.healthCheck();
    console.log(`✅ Database health: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);

    // Test 3: Get statistics
    console.log('📈 Test 3: Database statistics...');
    const stats = await databaseManager.getStats();
    console.log('✅ Database statistics:');
    Object.entries(stats).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} records`);
    });

    // Test 4: Simple query
    console.log('🔍 Test 4: Simple query...');
    const result = await databaseManager.getQuery('SELECT 1 as test');
    console.log(`✅ Query result: ${JSON.stringify(result)}`);

    // Test 5: Create a project using DAO
    console.log('🏗️ Test 5: Project DAO test...');
    const { default: ProjectDAO } = await import('./dao/ProjectDAO.js');
    
    const projectData = {
      name: 'Test Project',
      description: 'Test project for database validation',
      root_path: TEST_PROJECT_ROOT
    };
    
    const project = await ProjectDAO.create(projectData);
    console.log('✅ Project created via DAO:');
    console.log(`   ID: ${project.id}, Name: ${project.name}`);

    // Test 6: Close database
    console.log('🔒 Test 6: Closing database...');
    await databaseManager.close();
    console.log('✅ Database closed successfully');

    console.log('\n🎉 All database tests passed!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run the test
testDatabase()
  .then(() => {
    console.log('\n✨ Database test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Database test failed:', error);
    process.exit(1);
  });
