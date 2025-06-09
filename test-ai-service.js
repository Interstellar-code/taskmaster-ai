#!/usr/bin/env node

/**
 * Test AI service with minimal imports
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = process.cwd();

console.log('=== Testing AI Service ===');
console.log('Project Root:', projectRoot);

try {
  // Test importing just the config manager first
  const configPath = path.resolve(projectRoot, 'scripts', 'modules', 'config-manager.js');
  const configUrl = process.platform === 'win32' 
    ? `file:///${configPath.replace(/\\/g, '/')}`
    : configPath;
  
  console.log('Importing config manager from:', configUrl);
  const { getMainProvider, getMainModelId } = await import(configUrl);
  
  console.log('✅ Config manager imported successfully');
  
  const provider = getMainProvider(projectRoot);
  const modelId = getMainModelId(projectRoot);
  
  console.log('Main Provider:', provider);
  console.log('Main Model ID:', modelId);
  
  // Test importing the base provider first
  const baseProviderPath = path.resolve(projectRoot, 'src', 'ai-providers', 'base-provider.js');
  const baseProviderUrl = process.platform === 'win32'
    ? `file:///${baseProviderPath.replace(/\\/g, '/')}`
    : baseProviderPath;

  console.log('Importing base provider from:', baseProviderUrl);
  const { BaseAIProvider } = await import(baseProviderUrl);
  console.log('✅ Base provider imported successfully');

  // Test importing just the OpenRouter provider
  const openRouterPath = path.resolve(projectRoot, 'src', 'ai-providers', 'openrouter.js');
  const openRouterUrl = process.platform === 'win32'
    ? `file:///${openRouterPath.replace(/\\/g, '/')}`
    : openRouterPath;

  console.log('Importing OpenRouter provider from:', openRouterUrl);
  const { OpenRouterAIProvider } = await import(openRouterUrl);
  
  console.log('✅ OpenRouter provider imported successfully');
  
  const openRouterProvider = new OpenRouterAIProvider();
  console.log('✅ OpenRouter provider instantiated');
  
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('Stack:', error.stack);
}
