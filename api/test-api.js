/**
 * Simple API test script for TaskHero API
 * Tests basic functionality of the API endpoints
 */

import { createApp } from './server.js';
import request from 'supertest';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_PROJECT_ROOT = process.cwd();

/**
 * Run API tests
 */
async function runTests() {
  console.log('🚀 Starting TaskHero API Tests...\n');
  
  try {
    // Create Express app for testing
    const app = createApp();
    
    // Test 1: Health check
    console.log('📋 Test 1: Health Check');
    const healthResponse = await request(app)
      .get('/health')
      .expect(200);
    
    console.log('✅ Health check passed');
    console.log(`   Status: ${healthResponse.body.data.status}`);
    console.log(`   Uptime: ${healthResponse.body.data.uptime}s\n`);
    
    // Test 2: Detailed health check with project
    console.log('📋 Test 2: Detailed Health Check');
    const detailedHealthResponse = await request(app)
      .get('/health/detailed')
      .set('X-Project-Root', TEST_PROJECT_ROOT)
      .expect(200);
    
    console.log('✅ Detailed health check passed');
    console.log(`   Database status: ${detailedHealthResponse.body.data.database.status}`);
    console.log(`   Response time: ${detailedHealthResponse.body.data.responseTime}\n`);
    
    // Test 3: API documentation
    console.log('📋 Test 3: API Documentation');
    const docsResponse = await request(app)
      .get('/api-docs')
      .expect(301); // Redirect to /api-docs/
    
    console.log('✅ API documentation endpoint accessible\n');
    
    // Test 4: Root endpoint
    console.log('📋 Test 4: Root Endpoint');
    const rootResponse = await request(app)
      .get('/')
      .expect(200);
    
    console.log('✅ Root endpoint passed');
    console.log(`   Message: ${rootResponse.body.message}`);
    console.log(`   Version: ${rootResponse.body.version}\n`);
    
    // Test 5: Tasks endpoint (should require project root)
    console.log('📋 Test 5: Tasks Endpoint (without project root)');
    const tasksNoProjectResponse = await request(app)
      .get('/api/tasks')
      .expect(400);
    
    console.log('✅ Tasks endpoint correctly requires project root');
    console.log(`   Error: ${tasksNoProjectResponse.body.error.code}\n`);
    
    // Test 6: Tasks endpoint with project root
    console.log('📋 Test 6: Tasks Endpoint (with project root)');
    try {
      const tasksResponse = await request(app)
        .get('/api/tasks')
        .set('X-Project-Root', TEST_PROJECT_ROOT)
        .expect(200);
      
      console.log('✅ Tasks endpoint passed');
      console.log(`   Tasks found: ${tasksResponse.body.data.length}`);
      console.log(`   Message: ${tasksResponse.body.message}\n`);
    } catch (error) {
      if (error.status === 400 && error.response.body.error.code === 'NOT_TASKHERO_PROJECT') {
        console.log('⚠️  Tasks endpoint requires TaskHero project');
        console.log(`   Error: ${error.response.body.error.message}\n`);
      } else {
        throw error;
      }
    }
    
    // Test 7: PRDs endpoint
    console.log('📋 Test 7: PRDs Endpoint');
    try {
      const prdsResponse = await request(app)
        .get('/api/prds')
        .set('X-Project-Root', TEST_PROJECT_ROOT)
        .expect(200);
      
      console.log('✅ PRDs endpoint passed');
      console.log(`   PRDs found: ${prdsResponse.body.data.length}`);
      console.log(`   Message: ${prdsResponse.body.message}\n`);
    } catch (error) {
      if (error.status === 400 && error.response.body.error.code === 'NOT_TASKHERO_PROJECT') {
        console.log('⚠️  PRDs endpoint requires TaskHero project');
        console.log(`   Error: ${error.response.body.error.message}\n`);
      } else {
        throw error;
      }
    }
    
    // Test 8: Configuration endpoint
    console.log('📋 Test 8: Configuration Endpoint');
    try {
      const configResponse = await request(app)
        .get('/api/config')
        .set('X-Project-Root', TEST_PROJECT_ROOT)
        .expect(200);
      
      console.log('✅ Configuration endpoint passed');
      console.log(`   Configurations found: ${configResponse.body.data.length}`);
      console.log(`   Message: ${configResponse.body.message}\n`);
    } catch (error) {
      if (error.status === 400 && error.response.body.error.code === 'NOT_TASKHERO_PROJECT') {
        console.log('⚠️  Configuration endpoint requires TaskHero project');
        console.log(`   Error: ${error.response.body.error.message}\n`);
      } else {
        throw error;
      }
    }
    
    // Test 9: Analytics dashboard
    console.log('📋 Test 9: Analytics Dashboard');
    try {
      const analyticsResponse = await request(app)
        .get('/api/analytics/dashboard')
        .set('X-Project-Root', TEST_PROJECT_ROOT)
        .expect(200);
      
      console.log('✅ Analytics dashboard passed');
      console.log(`   Total tasks: ${analyticsResponse.body.data.tasks.total}`);
      console.log(`   Total PRDs: ${analyticsResponse.body.data.prds.total}\n`);
    } catch (error) {
      if (error.status === 400 && error.response.body.error.code === 'NOT_TASKHERO_PROJECT') {
        console.log('⚠️  Analytics endpoint requires TaskHero project');
        console.log(`   Error: ${error.response.body.error.message}\n`);
      } else {
        throw error;
      }
    }
    
    // Test 10: Invalid endpoint
    console.log('📋 Test 10: Invalid Endpoint');
    const invalidResponse = await request(app)
      .get('/api/invalid-endpoint')
      .expect(404);
    
    console.log('✅ Invalid endpoint correctly returns 404');
    console.log(`   Error: ${invalidResponse.body.error.code}\n`);
    
    // Test 11: CORS headers
    console.log('📋 Test 11: CORS Headers');
    const corsResponse = await request(app)
      .options('/api/tasks')
      .set('Origin', 'http://localhost:3000')
      .expect(204);
    
    console.log('✅ CORS preflight request passed');
    console.log(`   Access-Control-Allow-Origin: ${corsResponse.headers['access-control-allow-origin'] || 'Not set'}`);
    console.log(`   Access-Control-Allow-Methods: ${corsResponse.headers['access-control-allow-methods'] || 'Not set'}\n`);
    
    console.log('🎉 All API tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Health endpoints working');
    console.log('   ✅ API documentation accessible');
    console.log('   ✅ Project validation working');
    console.log('   ✅ CORS configuration working');
    console.log('   ✅ Error handling working');
    console.log('\n🚀 TaskHero API is ready for use!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.body);
    }
    process.exit(1);
  }
}

/**
 * Run performance tests
 */
async function runPerformanceTests() {
  console.log('\n🏃 Running Performance Tests...\n');
  
  const app = createApp();
  const iterations = 100;
  
  // Test health endpoint performance
  console.log(`📊 Testing health endpoint performance (${iterations} requests)`);
  const startTime = Date.now();
  
  const promises = [];
  for (let i = 0; i < iterations; i++) {
    promises.push(
      request(app)
        .get('/health')
        .expect(200)
    );
  }
  
  await Promise.all(promises);
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  
  console.log(`✅ Performance test completed`);
  console.log(`   Total time: ${totalTime}ms`);
  console.log(`   Average time per request: ${avgTime.toFixed(2)}ms`);
  console.log(`   Requests per second: ${(1000 / avgTime).toFixed(2)}`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const runPerf = args.includes('--performance') || args.includes('-p');
  
  await runTests();
  
  if (runPerf) {
    await runPerformanceTests();
  }
  
  console.log('\n✨ Testing complete!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { runTests, runPerformanceTests };
