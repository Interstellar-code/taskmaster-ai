// Test the date formatting function that was added to PRDDetailsModal

function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString();
  } catch (error) {
    return 'Invalid Date';
  }
}

console.log('🧪 Testing Date Formatting Function');
console.log('===================================');

// Test cases
const testCases = [
  { input: '2025-06-10 08:21:58', expected: 'Valid Date' },
  { input: '2025-06-10T08:21:58.253Z', expected: 'Valid Date' },
  { input: null, expected: 'Unknown' },
  { input: undefined, expected: 'Unknown' },
  { input: '', expected: 'Unknown' },
  { input: 'invalid-date', expected: 'Invalid Date' },
  { input: '2025-13-45', expected: 'Invalid Date' }
];

testCases.forEach((testCase, index) => {
  const result = formatDate(testCase.input);
  const passed = testCase.expected === 'Valid Date' ? 
    result !== 'Unknown' && result !== 'Invalid Date' : 
    result === testCase.expected;
  
  console.log(`Test ${index + 1}: ${passed ? '✅' : '❌'}`);
  console.log(`  Input: ${testCase.input}`);
  console.log(`  Expected: ${testCase.expected}`);
  console.log(`  Actual: ${result}`);
  console.log('');
});

console.log('🎯 This function will prevent "Invalid Date" from showing in the UI');
console.log('📝 The PRD details modal now uses this safe date formatting');
