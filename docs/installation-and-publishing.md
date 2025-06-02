# TaskMaster AI - Installation & Publishing Guide

This guide covers how to install the current TaskMaster AI version locally and how to publish it as an npm package named "task-hero-ai".

## Table of Contents

1. [Local Installation Methods](#local-installation-methods)
2. [Publishing to npm as "task-hero-ai"](#publishing-to-npm-as-task-hero-ai)
3. [GitHub Actions Setup](#github-actions-setup)
4. [Installation from npm](#installation-from-npm)
5. [Troubleshooting](#troubleshooting)

## Local Installation Methods

### Method 1: Clone and Link (Recommended for Development)

This method is perfect for development and testing your customizations:

```bash
# 1. Clone the repository
git clone https://github.com/Interstellar-code/taskmaster-ai.git
cd taskmaster-ai

# 2. Install dependencies
npm install

# 3. Link globally for system-wide access
npm link

# 4. Verify installation
task-master --version
task-master menu
```

**Benefits:**
- ✅ Immediate access to your latest changes
- ✅ Easy to modify and test
- ✅ No need to republish for local testing

**To uninstall:**
```bash
npm unlink
```

### Method 2: Install from Local Directory

Install directly from a local directory without linking:

```bash
# From any directory, install from local path
npm install -g /path/to/your/taskmaster-ai

# Or using relative path
npm install -g ./taskmaster-ai
```

### Method 3: Install from GitHub Repository

Install directly from your GitHub repository:

```bash
# Install from main branch
npm install -g git+https://github.com/Interstellar-code/taskmaster-ai.git

# Install from specific branch
npm install -g git+https://github.com/Interstellar-code/taskmaster-ai.git#dev_rohit

# Install from specific tag/release
npm install -g git+https://github.com/Interstellar-code/taskmaster-ai.git#v0.15.0
```

## Publishing to npm as "task-hero-ai"

### Prerequisites

1. **npm Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **npm CLI**: Ensure you have npm installed and are logged in
3. **Package Name**: Verify "task-hero-ai" is available

### Step 1: Prepare Package for Publishing

First, update your `package.json` to use the new package name:

```bash
# Update package.json
npm pkg set name="task-hero-ai"
npm pkg set version="1.0.0"
npm pkg set description="TaskMaster AI - A task management system for ambitious AI-driven development"
npm pkg set repository.url="git+https://github.com/Interstellar-code/taskmaster-ai.git"
npm pkg set homepage="https://github.com/Interstellar-code/taskmaster-ai#readme"
npm pkg set bugs.url="https://github.com/Interstellar-code/taskmaster-ai/issues"
```

### Step 2: Update Binary Commands

Update the binary commands in `package.json`:

```json
{
  "bin": {
    "task-hero": "bin/task-master.js",
    "task-hero-ai": "bin/task-master.js",
    "task-hero-mcp": "mcp-server/server.js"
  }
}
```

### Step 3: Verify Package Contents

Check what will be included in your package:

```bash
# See what files will be published
npm pack --dry-run

# Create a test package
npm pack
```

### Step 4: Login to npm

```bash
# Login to npm
npm login

# Verify you're logged in
npm whoami
```

### Step 5: Publish to npm

```bash
# First publication
npm publish

# For subsequent updates
npm version patch  # or minor/major
npm publish
```

### Step 6: Verify Publication

```bash
# Check if package is available
npm view task-hero-ai

# Test installation
npm install -g task-hero-ai
task-hero --version
```

## GitHub Actions Setup

Your repository already has GitHub Actions configured. To enable automatic npm publishing:

### Step 1: Add npm Token to GitHub Secrets

1. Go to [npmjs.com](https://www.npmjs.com/) → Account → Access Tokens
2. Create a new "Automation" token
3. Go to your GitHub repository → Settings → Secrets and variables → Actions
4. Add a new secret named `NPM_TOKEN` with your npm token

### Step 2: Update Release Workflow

The existing `.github/workflows/release.yml` is already configured for npm publishing. It will:

- ✅ Automatically publish to npm when you push to main branch
- ✅ Use changesets for version management
- ✅ Create GitHub releases
- ✅ Handle pre-release and stable releases

### Step 3: Using Changesets for Releases

```bash
# Add a changeset (describes what changed)
npm run changeset

# Version packages (updates version numbers)
npx changeset version

# Publish (done automatically by GitHub Actions)
npm run release
```

## Installation from npm

Once published, users can install your package globally:

```bash
# Install globally
npm install -g task-hero-ai

# Verify installation
task-hero --version
task-hero menu

# Or use the full name
task-hero-ai --version
```

### Usage After Installation

```bash
# Initialize a new project
task-hero init

# Launch interactive menu
task-hero menu

# Parse PRD files
task-hero parse-prd scripts/prd.txt

# List tasks
task-hero list

# Get next task
task-hero next
```

## Troubleshooting

### Common Issues

**1. Permission Errors on Windows**
```bash
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**2. npm Link Issues**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall and relink
npm install
npm link
```

**3. Package Name Conflicts**
```bash
# Check if name is available
npm view task-hero-ai

# If taken, try variations:
# task-hero-ai-custom
# taskmaster-hero-ai
# your-username-task-hero-ai
```

**4. Binary Not Found After Installation**
```bash
# Check npm global bin directory
npm config get prefix

# Add to PATH if needed (Windows)
setx PATH "%PATH%;%APPDATA%\npm"

# Add to PATH if needed (Unix)
export PATH=$PATH:$(npm config get prefix)/bin
```

### Verification Commands

```bash
# Check installation
which task-hero        # Unix
where task-hero        # Windows

# Check package info
npm list -g task-hero-ai

# Check version
task-hero --version

# Test functionality
task-hero --help
task-hero menu
```

## Next Steps

After successful installation/publishing:

1. **Update Documentation**: Update README.md with new installation instructions
2. **Test Installation**: Test on different systems (Windows, macOS, Linux)
3. **Create Examples**: Add usage examples and tutorials
4. **Monitor Usage**: Track downloads and user feedback
5. **Maintain Versions**: Use semantic versioning for updates

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review npm logs: `npm config get cache` → check npm-debug.log
3. Create an issue on [GitHub](https://github.com/Interstellar-code/taskmaster-ai/issues)
4. Check npm package status: `npm view task-hero-ai`
