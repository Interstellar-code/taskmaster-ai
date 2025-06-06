# TaskMaster AI - Quick Installation Guide

## 🚀 Install from npm (Recommended)

```bash
npm install -g task-hero-ai
task-hero --version
task-hero menu
```

## 🔧 Local Development Setup

```bash
# Clone and setup
git clone https://github.com/Interstellar-code/taskmaster-ai.git
cd taskmaster-ai
npm install
npm link

# Verify
task-master --version
node scripts/verify-installation.js
```

## 📦 Publish to npm as "task-hero-ai"

### Prerequisites

- npm account at [npmjs.com](https://www.npmjs.com/)
- npm CLI logged in: `npm login`

### Quick Publish Steps

```bash
# 1. Prepare package
node scripts/prepare-npm-package.js

# 2. Test package
npm pack --dry-run

# 3. Publish
npm publish
```

### Automated Publishing (GitHub Actions)

1. Add `NPM_TOKEN` to GitHub repository secrets
2. Push to main branch
3. GitHub Actions will automatically publish

## 🔍 Verification Commands

```bash
# Check installation
task-hero --version
task-hero --help
task-hero menu

# Check npm package
npm view task-hero-ai
npm list -g task-hero-ai

# Run full verification
node scripts/verify-installation.js
```

## 🛠️ Alternative Installation Methods

### From GitHub Repository

```bash
npm install -g git+https://github.com/Interstellar-code/taskmaster-ai.git
```

### From Local Directory

```bash
npm install -g /path/to/taskmaster-ai
```

## 📚 Documentation

- **Complete Guide**: [docs/installation-and-publishing.md](docs/installation-and-publishing.md)
- **Interactive Menu**: [docs/interactive-menu.md](docs/interactive-menu.md)
- **Configuration**: [docs/configuration.md](docs/configuration.md)

## 🆘 Troubleshooting

### Common Issues

- **Permission errors**: Run PowerShell as Administrator (Windows)
- **Command not found**: Check PATH or run `npm link`
- **Package conflicts**: Use `npm unlink` then `npm link`

### Quick Fixes

```bash
# Clear cache and reinstall
npm cache clean --force
npm install
npm link

# Check global npm directory
npm config get prefix

# Verify binary location
which task-hero        # Unix
where task-hero        # Windows
```

## 🎯 Quick Start After Installation

```bash
# Initialize new project
task-hero init

# Launch interactive menu
task-hero menu

# Parse PRD file
task-hero parse-prd scripts/prd.txt

# List tasks
task-hero list

# Get next task
task-hero next
```

---

**Need help?** Check the [full documentation](docs/installation-and-publishing.md) or create an [issue](https://github.com/Interstellar-code/taskmaster-ai/issues).
