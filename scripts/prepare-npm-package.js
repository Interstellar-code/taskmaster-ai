#!/usr/bin/env node

/**
 * Script to prepare TaskMaster AI for npm publishing as "task-hero-ai"
 * This script updates package.json with the new package name and configuration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');

console.log('🚀 Preparing TaskMaster AI for npm publishing as "task-hero-ai"...\n');

try {
    // Read current package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    console.log(`📦 Current package name: ${packageJson.name}`);
    console.log(`📦 Current version: ${packageJson.version}\n`);
    
    // Update package configuration for npm publishing
    const updates = {
        name: 'task-hero-ai',
        description: 'TaskMaster AI - A task management system for ambitious AI-driven development',
        keywords: [
            'task-management',
            'ai',
            'development',
            'productivity',
            'cli',
            'taskmaster',
            'project-management',
            'cursor',
            'anthropic',
            'claude',
            'mcp',
            'context'
        ],
        bin: {
            'task-hero': 'bin/task-master.js',
            'task-hero-ai': 'bin/task-master.js',
            'task-hero-mcp': 'mcp-server/server.js'
        },
        repository: {
            type: 'git',
            url: 'git+https://github.com/Interstellar-code/taskmaster-ai.git'
        },
        homepage: 'https://github.com/Interstellar-code/taskmaster-ai#readme',
        bugs: {
            url: 'https://github.com/Interstellar-code/taskmaster-ai/issues'
        },
        author: 'Interstellar Code (https://github.com/Interstellar-code)',
        contributors: [
            'Eyal Toledano (https://github.com/eyaltoledano)',
            'Ralph (https://github.com/RalphEcom)'
        ]
    };
    
    // Merge updates with existing package.json
    const updatedPackage = { ...packageJson, ...updates };
    
    // Write updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(updatedPackage, null, 2) + '\n');
    
    console.log('✅ Package.json updated successfully!');
    console.log(`📦 New package name: ${updatedPackage.name}`);
    console.log(`📦 Version: ${updatedPackage.version}`);
    console.log(`🔧 Binary commands: ${Object.keys(updatedPackage.bin).join(', ')}\n`);
    
    // Create/update .npmignore if needed
    const npmignorePath = path.join(rootDir, '.npmignore');
    if (!fs.existsSync(npmignorePath)) {
        const npmignoreContent = `# Development files
.git
.github
.vscode
.idea
.DS_Store

# Logs
logs
*.log
npm-debug.log*
dev-debug.log
init-debug.log

# Tests and development
src
test
tests
docs
examples
.editorconfig
.eslintrc
.prettierrc
.travis.yml
.gitlab-ci.yml
tsconfig.json
jest.config.js

# Project files (not needed in package)
tasks.json
tasks/
prd.txt
scripts/prd.txt
.env
.taskmaster/

# Temporary files
.tmp
.temp
*.swp
*.swo

# Node modules
node_modules/

# Debug files
*.debug
`;
        fs.writeFileSync(npmignorePath, npmignoreContent);
        console.log('✅ Created .npmignore file');
    }
    
    console.log('\n🎉 Package preparation complete!');
    console.log('\nNext steps:');
    console.log('1. Review the changes in package.json');
    console.log('2. Test locally: npm pack --dry-run');
    console.log('3. Login to npm: npm login');
    console.log('4. Publish: npm publish');
    console.log('\nFor detailed instructions, see: docs/installation-and-publishing.md');
    
} catch (error) {
    console.error('❌ Error preparing package:', error.message);
    process.exit(1);
}
