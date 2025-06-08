/**
 * Simple API test to verify endpoints are working
 */

// Using built-in fetch (Node.js 18+)

const BASE_URL = 'http://localhost:3001';
const PROJECT_ROOT = process.cwd();

async function testEndpoint(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing TaskHero API Endpoints...\n');
  
  // Test 1: Health check
  console.log('📋 Test 1: Health Check');
  const health = await testEndpoint(`${BASE_URL}/health`);
  if (health.status === 200) {
    console.log('✅ Health check passed');
    console.log(`   Status: ${health.data.data.status}`);
  } else {
    console.log('❌ Health check failed:', health);
  }
  
  // Test 2: Root endpoint
  console.log('\n📋 Test 2: Root Endpoint');
  const root = await testEndpoint(`${BASE_URL}/`);
  if (root.status === 200) {
    console.log('✅ Root endpoint passed');
    console.log(`   Message: ${root.data.message}`);
  } else {
    console.log('❌ Root endpoint failed:', root);
  }
  
  // Test 3: Tasks endpoint with project header
  console.log('\n📋 Test 3: Tasks Endpoint');
  const tasks = await testEndpoint(`${BASE_URL}/api/tasks`, {
    headers: {
      'X-Project-Root': PROJECT_ROOT
    }
  });
  if (tasks.status === 200) {
    console.log('✅ Tasks endpoint passed');
    console.log(`   Tasks found: ${tasks.data.data.length}`);
  } else {
    console.log('❌ Tasks endpoint failed:', tasks);
  }
  
  // Test 4: PRDs endpoint
  console.log('\n📋 Test 4: PRDs Endpoint');
  const prds = await testEndpoint(`${BASE_URL}/api/prds`, {
    headers: {
      'X-Project-Root': PROJECT_ROOT
    }
  });
  if (prds.status === 200) {
    console.log('✅ PRDs endpoint passed');
    console.log(`   PRDs found: ${prds.data.data.length}`);
  } else {
    console.log('❌ PRDs endpoint failed:', prds);
  }
  
  // Test 5: Analytics dashboard
  console.log('\n📋 Test 5: Analytics Dashboard');
  const analytics = await testEndpoint(`${BASE_URL}/api/analytics/dashboard`, {
    headers: {
      'X-Project-Root': PROJECT_ROOT
    }
  });
  if (analytics.status === 200) {
    console.log('✅ Analytics dashboard passed');
    console.log(`   Total tasks: ${analytics.data.data.tasks.total}`);
    console.log(`   Total PRDs: ${analytics.data.data.prds.total}`);
  } else {
    console.log('❌ Analytics dashboard failed:', analytics);
  }
  
  console.log('\n🎉 API testing completed!');
}

runTests().catch(console.error);
