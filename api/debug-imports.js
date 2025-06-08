/**
 * Debug imports to find the issue
 */

console.log('Testing imports...');

try {
  console.log('1. Testing express...');
  await import('express');
  console.log('✅ express OK');
  
  console.log('2. Testing cors...');
  await import('cors');
  console.log('✅ cors OK');
  
  console.log('3. Testing helmet...');
  await import('helmet');
  console.log('✅ helmet OK');
  
  console.log('4. Testing winston...');
  await import('winston');
  console.log('✅ winston OK');
  
  console.log('5. Testing ws...');
  await import('ws');
  console.log('✅ ws OK');
  
  console.log('6. Testing middleware/errorHandler...');
  await import('./middleware/errorHandler.js');
  console.log('✅ errorHandler OK');
  
  console.log('7. Testing middleware/requestLogger...');
  await import('./middleware/requestLogger.js');
  console.log('✅ requestLogger OK');
  
  console.log('8. Testing middleware/validateProject...');
  await import('./middleware/validateProject.js');
  console.log('✅ validateProject OK');
  
  console.log('9. Testing middleware/corsConfig...');
  await import('./middleware/corsConfig.js');
  console.log('✅ corsConfig OK');
  
  console.log('10. Testing routes/health...');
  await import('./routes/health.js');
  console.log('✅ health routes OK');
  
  console.log('11. Testing routes/tasks...');
  await import('./routes/tasks.js');
  console.log('✅ tasks routes OK');
  
  console.log('12. Testing routes/prds...');
  await import('./routes/prds.js');
  console.log('✅ prds routes OK');
  
  console.log('13. Testing routes/config...');
  await import('./routes/config.js');
  console.log('✅ config routes OK');
  
  console.log('14. Testing routes/analytics...');
  await import('./routes/analytics.js');
  console.log('✅ analytics routes OK');
  
  console.log('15. Testing websocket/index...');
  await import('./websocket/index.js');
  console.log('✅ websocket OK');
  
  console.log('16. Testing utils/database...');
  await import('./utils/database.js');
  console.log('✅ database utils OK');
  
  console.log('17. Testing server.js...');
  await import('./server.js');
  console.log('✅ server OK');
  
  console.log('\n🎉 All imports successful!');
  
} catch (error) {
  console.error('❌ Import failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
