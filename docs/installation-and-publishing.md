# TaskMaster AI - Installation & Publishing Guide

This guide covers how to install the current TaskMaster AI version locally and how to publish it as an npm package named "task-hero-ai".

## Table of Contents

1. [Local Installation Methods](#local-installation-methods)
2. [Publishing to npm as "task-hero-ai"](#publishing-to-npm-as-task-hero-ai)
3. [Version Management & Updates](#version-management--updates)
4. [GitHub Actions Setup](#github-actions-setup)
5. [Installation from npm](#installation-from-npm)
6. [User Update Procedures](#user-update-procedures)
7. [Troubleshooting](#troubleshooting)

## Local Installation Methods

### Method 1: Clone and Link (Recommended for Development)

This method is perfect for development and testing your customizations:

```bash
# 1. Clone the repository
git clone https://github.com/Interstellar-code/taskmaster-ai.git
cd taskhero-ai

# 2. Install dependencies
npm install

# 3. Link globally for system-wide access
npm link

# 4. Verify installation
task-hero --version
task-hero menu
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
npm install -g /path/to/your/taskhero-ai

# Or using relative path
npm install -g ./taskhero-ai
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
npm pkg set description="TaskHero AI - A task management system for ambitious AI-driven development"
npm pkg set repository.url="git+https://github.com/Interstellar-code/taskmaster-ai.git"
npm pkg set homepage="https://github.com/Interstellar-code/taskmaster-ai#readme"
npm pkg set bugs.url="https://github.com/Interstellar-code/taskmaster-ai/issues"
```

### Step 2: Update Binary Commands

Update the binary commands in `package.json`:

```json
{
  "bin": {
    "task-hero": "bin/task-hero.js",
    "task-hero-ai": "bin/task-hero.js",
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

## Version Management & Updates

### Updating Package Version

When you want to release a new version of your package:

#### Step 1: Update Version Number

```bash
# Option 1: Use npm version command (recommended)
npm version patch    # 0.15.0 → 0.15.1 (bug fixes)
npm version minor    # 0.15.1 → 0.16.0 (new features)
npm version major    # 0.16.0 → 1.0.0 (breaking changes)

# Option 2: Manual update in package.json
npm pkg set version="0.15.1"
```

#### Step 2: Verify Version Update

```bash
# Check current version
npm pkg get version

# Verify in package.json
cat package.json | grep version
```

#### Step 3: Commit Version Changes

```bash
# Commit the version bump
git add package.json package-lock.json
git commit -m "chore: bump version to 0.15.1"

# Tag the release (optional but recommended)
git tag v0.15.1
git push origin main --tags
```

#### Step 4: Publish to npm

```bash
# Publish the new version
npm publish

# Verify publication
npm view task-hero-ai version
npm view task-hero-ai versions --json
```

### Version Verification

```bash
# Check what version is published on npm
npm view task-hero-ai

# Check all published versions
npm view task-hero-ai versions

# Check latest version specifically
npm view task-hero-ai version
```

### Pre-release Versions

For testing before official release:

```bash
# Create pre-release version
npm version prerelease --preid=beta  # 0.15.1-beta.0

# Publish as beta
npm publish --tag beta

# Users can install beta version
npm install -g task-hero-ai@beta
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

### Automated Version Management with GitHub Actions

To automate the entire version management process:

#### Option 1: Manual Version Bump + Auto Publish

1. **Update version locally**:
```bash
npm version patch  # or minor/major
git push origin main --tags
```

2. **GitHub Actions automatically**:
   - Detects the version change
   - Runs tests
   - Publishes to npm
   - Creates GitHub release

#### Option 2: Fully Automated with Changesets

1. **Create changeset**:
```bash
npx changeset add
# Follow prompts to describe changes
git add .changeset/
git commit -m "docs: add changeset for new feature"
git push
```

2. **GitHub Actions creates PR**:
   - Automatically updates version in package.json
   - Generates changelog
   - Creates release PR

3. **Merge PR to publish**:
   - Merging the PR triggers automatic npm publish
   - Creates GitHub release with changelog

#### Enhanced GitHub Actions Workflow

Create `.github/workflows/version-and-publish.yml`:

```yaml
name: Version and Publish

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  version-and-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Check if version changed
        id: version-check
        run: |
          CURRENT_VERSION=$(node -p "require('./package.json').version")
          PUBLISHED_VERSION=$(npm view task-hero-ai version 2>/dev/null || echo "0.0.0")
          echo "current=$CURRENT_VERSION" >> $GITHUB_OUTPUT
          echo "published=$PUBLISHED_VERSION" >> $GITHUB_OUTPUT
          if [ "$CURRENT_VERSION" != "$PUBLISHED_VERSION" ]; then
            echo "changed=true" >> $GITHUB_OUTPUT
          else
            echo "changed=false" >> $GITHUB_OUTPUT
          fi

      - name: Publish to npm
        if: steps.version-check.outputs.changed == 'true'
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        if: steps.version-check.outputs.changed == 'true'
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ steps.version-check.outputs.current }}
          release_name: Release v${{ steps.version-check.outputs.current }}
          draft: false
          prerelease: false
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

# Start web interface (Kanban board)
task-hero web

# Start web interface on custom port
task-hero web --port 3001

# Start web interface in development mode
task-hero web --dev

# Parse PRD files
task-hero parse-prd scripts/prd.txt

# List tasks
task-hero list

# Get next task
task-hero next
```

### Web Interface (Kanban Board)

TaskHero includes a built-in web interface with a Kanban board for visual task management:

```bash
# Start web interface on default port (3000)
task-hero web

# Start on custom port
task-hero web --port 3001

# Development mode with hot reload (for contributors)
task-hero web --dev

# Start without opening browser automatically
task-hero web --no-open
```

**Features:**
- ✅ **Visual Kanban Board** - Drag and drop tasks between status columns
- ✅ **Task Management** - Create, edit, and delete tasks with rich metadata
- ✅ **PRD Integration** - Filter tasks by PRD source and track progress
- ✅ **Dependency Management** - Visual dependency tracking and validation
- ✅ **Complexity Analysis** - Built-in complexity scoring and analysis
- ✅ **Real-time Updates** - Changes sync with CLI and other interfaces
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile devices

**Access Points:**
- **Main Interface**: `http://localhost:3000` (or your custom port)
- **API Endpoints**: `http://localhost:3000/api`
- **Health Check**: `http://localhost:3000/health`

## User Update Procedures

### For End Users: Updating to Latest Version

When a new version is published, users need to update their global installation:

#### Method 1: Standard Update (Recommended)

```bash
# Check current installed version
task-hero --version

# Check latest available version on npm
npm view task-hero-ai version

# Update to latest version
npm update -g task-hero-ai

# Verify update
task-hero --version
```

#### Method 2: Reinstall (If update doesn't work)

```bash
# Uninstall current version
npm uninstall -g task-hero-ai

# Clear npm cache
npm cache clean --force

# Install latest version
npm install -g task-hero-ai

# Verify installation
task-hero --version
```

#### Method 3: Install Specific Version

```bash
# Install specific version
npm install -g task-hero-ai@0.15.1

# Install latest beta version
npm install -g task-hero-ai@beta

# Install from specific tag
npm install -g task-hero-ai@latest
```

### Troubleshooting User Updates

#### Issue: npm update doesn't install latest version

**Cause**: npm's global update behavior can be inconsistent, especially on Windows and when packages have been installed from different sources.

**Root Causes**:
- npm caches old package information
- Global packages installed with different permissions
- Package installed from different registries
- npm's `update` command doesn't always work for global packages

**Solutions** (in order of preference):

```bash
# Solution 1: Force reinstall (RECOMMENDED)
npm uninstall -g task-hero-ai
npm cache clean --force
npm install -g task-hero-ai

# Solution 2: Use specific version
npm install -g task-hero-ai@latest

# Solution 3: Use update scripts
# Linux/macOS: bash scripts/update-taskmaster.sh
# Windows: scripts/update-taskmaster.bat

# Solution 4: Check npm configuration
npm config list
npm config get registry
npm config get prefix
```

**Why `npm update -g` often fails**:
- npm's global update mechanism is known to be unreliable
- It may not detect version changes properly
- Cache issues can prevent updates
- Permission conflicts can cause silent failures

#### Issue: Permission errors during update

**Windows**:
```powershell
# Run PowerShell as Administrator
npm update -g task-hero-ai
```

**macOS/Linux**:
```bash
# Use sudo (not recommended for npm)
sudo npm update -g task-hero-ai

# Better: Fix npm permissions
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
npm update -g task-hero-ai
```

#### Issue: Command not found after update

```bash
# Check npm global directory
npm config get prefix

# Check if binary exists
ls -la $(npm config get prefix)/bin/task-hero*

# Refresh shell environment
source ~/.bashrc  # Linux/macOS
# Or restart terminal
```

### Version Checking Commands

```bash
# Check installed version
task-hero --version

# Check available versions on npm
npm view task-hero-ai versions

# Check latest version
npm view task-hero-ai version

# Check package info
npm view task-hero-ai

# List globally installed packages
npm list -g --depth=0 | grep task-hero
```

### Update Notifications

To help users know when updates are available, you can:

1. **Add update checker to your app**:
```javascript
// In your main application
import { checkForUpdates } from 'update-notifier';
checkForUpdates('task-hero-ai');
```

2. **Notify users in release notes**
3. **Use GitHub releases for announcements**

### Automated Update Scripts

We provide update scripts to simplify the update process for users:

#### Using the Update Scripts

**Linux/macOS**:
```bash
# Make script executable
chmod +x scripts/update-taskmaster.sh

# Run the update script
bash scripts/update-taskmaster.sh
```

**Windows**:
```batch
# Run the update script
scripts\update-taskmaster.bat
```

#### What the Scripts Do

1. **Check current installation** - Detects if TaskMaster AI is installed and what version
2. **Check latest version** - Fetches the latest version from npm registry
3. **Compare versions** - Skips update if already on latest version
4. **Confirm with user** - Asks for confirmation before proceeding
5. **Clean uninstall** - Removes current version completely
6. **Clear cache** - Clears npm cache to prevent conflicts
7. **Fresh install** - Installs the latest version from scratch
8. **Verify installation** - Confirms the update was successful

#### Script Features

- ✅ **Version checking** - Only updates when necessary
- ✅ **Error handling** - Graceful failure with helpful messages
- ✅ **User confirmation** - No surprise updates
- ✅ **Cross-platform** - Works on Windows, macOS, and Linux
- ✅ **Colored output** - Easy to read status messages
- ✅ **Verification** - Confirms successful installation

#### For Package Maintainers

Include these scripts in your package and document them in your README:

```markdown
## Updating TaskMaster AI

### Automatic Update (Recommended)
- **Linux/macOS**: `bash scripts/update-taskmaster.sh`
- **Windows**: `scripts\update-taskmaster.bat`

### Manual Update
```bash
npm uninstall -g task-hero-ai
npm cache clean --force
npm install -g task-hero-ai
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

## Quick Reference

### Publisher Commands (Version Management)

```bash
# Update version and publish
npm version patch && npm publish

# Check published version
npm view task-hero-ai version

# View all versions
npm view task-hero-ai versions

# Publish beta version
npm version prerelease --preid=beta && npm publish --tag beta
```

### User Commands (Updates)

```bash
# Check current version
task-hero --version

# Check latest available
npm view task-hero-ai version

# Update (recommended method)
npm uninstall -g task-hero-ai && npm cache clean --force && npm install -g task-hero-ai

# Update using scripts
bash scripts/update-taskmaster.sh  # Linux/macOS
scripts\update-taskmaster.bat      # Windows
```

### Troubleshooting Commands

```bash
# Check npm configuration
npm config list
npm config get prefix
npm config get registry

# Clear npm cache
npm cache clean --force

# Check global packages
npm list -g --depth=0

# Fix npm permissions (Unix)
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Use the update scripts: `scripts/update-taskmaster.sh` or `scripts/update-taskmaster.bat`
3. Review npm logs: `npm config get cache` → check npm-debug.log
4. Create an issue on [GitHub](https://github.com/Interstellar-code/taskmaster-ai/issues)
5. Check npm package status: `npm view task-hero-ai`

### Common Solutions

- **Update not working**: Use `npm uninstall -g task-hero-ai && npm install -g task-hero-ai`
- **Permission errors**: Run as administrator (Windows) or fix npm permissions (Unix)
- **Command not found**: Check PATH and restart terminal
- **Version mismatch**: Clear cache with `npm cache clean --force`
