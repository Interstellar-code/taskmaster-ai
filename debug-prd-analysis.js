#!/usr/bin/env node

/**
 * Debug script to test PRD analysis and file reading
 */

import path from 'path';
import fs from 'fs';

const projectRoot = process.cwd();
const prdFilePath = '.taskmaster\\prd\\phase3_architecture_summary.md';

console.log('=== PRD Analysis Debug ===');
console.log('Project Root:', projectRoot);
console.log('PRD File Path:', prdFilePath);

// Test file path resolution
const absoluteFilePath = path.resolve(projectRoot, prdFilePath);
console.log('Absolute File Path:', absoluteFilePath);

// Test file existence
const fileExists = fs.existsSync(absoluteFilePath);
console.log('File Exists:', fileExists);

if (fileExists) {
  try {
    const content = fs.readFileSync(absoluteFilePath, 'utf8');
    console.log('File Content Length:', content.length);
    console.log('First 200 characters:', content.substring(0, 200));
    
    // Test AI service import
    console.log('\n=== Testing AI Service Import ===');
    const possiblePaths = [
      path.resolve(projectRoot, 'scripts', 'modules', 'ai-services-unified.js'),
      path.resolve(process.cwd(), 'scripts', 'modules', 'ai-services-unified.js'),
      path.resolve(import.meta.dirname, '..', '..', 'scripts', 'modules', 'ai-services-unified.js')
    ];

    let aiServicePath = null;
    for (const testPath of possiblePaths) {
      console.log('Testing AI service path:', testPath);
      if (fs.existsSync(testPath)) {
        aiServicePath = testPath;
        console.log('✅ Found AI service at:', testPath);
        break;
      } else {
        console.log('❌ Not found at:', testPath);
      }
    }

    if (aiServicePath) {
      try {
        // Convert Windows path to file:// URL for dynamic import
        const aiServiceUrl = process.platform === 'win32'
          ? `file:///${aiServicePath.replace(/\\/g, '/')}`
          : aiServicePath;
        console.log('AI service URL:', aiServiceUrl);

        const { generateTextService } = await import(aiServiceUrl);
        console.log('✅ AI service imported successfully');
        console.log('generateTextService type:', typeof generateTextService);
      } catch (importError) {
        console.log('❌ AI service import failed:', importError.message);
      }
    } else {
      console.log('❌ AI service not found in any path');
    }
    
  } catch (error) {
    console.log('❌ Error reading file:', error.message);
  }
} else {
  console.log('❌ File does not exist');
  
  // Try with forward slashes
  const altPath = prdFilePath.replace(/\\/g, '/');
  const altAbsolutePath = path.resolve(projectRoot, altPath);
  console.log('Trying alternative path:', altAbsolutePath);
  console.log('Alternative path exists:', fs.existsSync(altAbsolutePath));
}
