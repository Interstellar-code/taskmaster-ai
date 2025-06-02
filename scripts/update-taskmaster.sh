#!/bin/bash

# TaskMaster AI Update Script
# This script helps users update their global TaskMaster AI installation

set -e

echo "🔄 TaskMaster AI Update Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check current installed version
print_status "Checking current installation..."
if command -v task-hero &> /dev/null; then
    CURRENT_VERSION=$(task-hero --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo "unknown")
    print_status "Current version: $CURRENT_VERSION"
else
    print_warning "TaskMaster AI not currently installed globally"
    CURRENT_VERSION="not installed"
fi

# Check latest version on npm
print_status "Checking latest version on npm..."
LATEST_VERSION=$(npm view task-hero-ai version 2>/dev/null || echo "unknown")
if [ "$LATEST_VERSION" = "unknown" ]; then
    print_error "Could not fetch latest version from npm"
    exit 1
fi
print_status "Latest version: $LATEST_VERSION"

# Compare versions
if [ "$CURRENT_VERSION" = "$LATEST_VERSION" ] && [ "$CURRENT_VERSION" != "unknown" ]; then
    print_success "You already have the latest version ($CURRENT_VERSION)"
    echo ""
    echo "If you're experiencing issues, you can force reinstall with:"
    echo "  npm uninstall -g task-hero-ai && npm install -g task-hero-ai"
    exit 0
fi

# Confirm update
echo ""
if [ "$CURRENT_VERSION" = "not installed" ]; then
    print_status "Installing TaskMaster AI v$LATEST_VERSION..."
else
    print_status "Updating from v$CURRENT_VERSION to v$LATEST_VERSION..."
fi

read -p "Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Update cancelled"
    exit 0
fi

# Perform update
echo ""
print_status "Starting update process..."

# Step 1: Uninstall current version (if installed)
if [ "$CURRENT_VERSION" != "not installed" ]; then
    print_status "Uninstalling current version..."
    npm uninstall -g task-hero-ai || {
        print_warning "Could not uninstall current version, continuing anyway..."
    }
fi

# Step 2: Clear npm cache
print_status "Clearing npm cache..."
npm cache clean --force || {
    print_warning "Could not clear npm cache, continuing anyway..."
}

# Step 3: Install latest version
print_status "Installing latest version..."
if npm install -g task-hero-ai; then
    print_success "Installation completed successfully!"
else
    print_error "Installation failed!"
    echo ""
    echo "Try running with sudo (not recommended) or fix npm permissions:"
    echo "  sudo npm install -g task-hero-ai"
    echo ""
    echo "Or fix npm permissions:"
    echo "  npm config set prefix ~/.npm-global"
    echo "  export PATH=~/.npm-global/bin:\$PATH"
    echo "  npm install -g task-hero-ai"
    exit 1
fi

# Step 4: Verify installation
print_status "Verifying installation..."
if command -v task-hero &> /dev/null; then
    NEW_VERSION=$(task-hero --version 2>/dev/null | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo "unknown")
    if [ "$NEW_VERSION" = "$LATEST_VERSION" ]; then
        print_success "Update successful! TaskMaster AI v$NEW_VERSION is now installed."
    else
        print_warning "Update completed but version mismatch detected."
        print_warning "Expected: $LATEST_VERSION, Got: $NEW_VERSION"
    fi
else
    print_error "TaskMaster AI command not found after installation!"
    print_error "You may need to restart your terminal or update your PATH."
    exit 1
fi

# Final instructions
echo ""
print_success "Update complete!"
echo ""
echo "You can now use TaskMaster AI with:"
echo "  task-hero --help"
echo "  task-hero menu"
echo "  task-hero init"
echo ""
print_status "If you encounter any issues, please check:"
echo "  - Your PATH includes the npm global bin directory"
echo "  - You have proper permissions for global npm packages"
echo "  - Try restarting your terminal"
