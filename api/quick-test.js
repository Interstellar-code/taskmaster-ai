/**
 * Quick test to identify the exact issue
 */

console.log('Testing TaskDAO import...');

try {
  const { default: TaskDAO } = await import('./dao/TaskDAO.js');
  console.log('✅ TaskDAO imported successfully');
  console.log('TaskDAO methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(TaskDAO)));
  
  // Test findAll method
  console.log('Testing findAll...');
  const result = await TaskDAO.findAll({});
  console.log('✅ findAll works, result type:', typeof result, 'length:', result?.length);
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
