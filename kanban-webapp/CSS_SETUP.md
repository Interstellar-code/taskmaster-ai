# CSS Configuration for Tailwind CSS v4

This document explains the CSS configuration setup to resolve Tailwind CSS linting errors.

## Problem
The CSS language server was showing "Unknown at rule @tailwind" errors for Tailwind CSS directives in `src/index.css`.

## Solution
The following configuration files have been added to resolve these issues:

### 1. VS Code Settings (`.vscode/settings.json`)
- Disables default CSS validation to prevent conflicts
- Configures Tailwind CSS IntelliSense
- Sets up file associations for better CSS support
- Enables custom CSS data for Tailwind directives

### 2. CSS Custom Data (`.vscode/css_custom_data.json`)
- Defines Tailwind CSS at-rules (@tailwind, @apply, @layer)
- Provides documentation links for each directive
- Enables proper syntax highlighting and validation

### 3. PostCSS Configuration (`postcss.config.js`)
- Uses `@tailwindcss/postcss` plugin for Tailwind CSS v4
- Includes autoprefixer for vendor prefixes

### 4. Recommended Extensions
- `bradlc.vscode-tailwindcss` - Tailwind CSS IntelliSense
- `csstools.postcss` - PostCSS Language Support
- `esbenp.prettier-vscode` - Code formatting

## Tailwind CSS v4 Features
This project uses Tailwind CSS v4 which includes:
- New PostCSS plugin architecture
- Improved performance
- Better CSS-in-JS support
- Enhanced IntelliSense

## Verification
After applying these configurations:
1. Restart VS Code
2. Open `src/index.css`
3. Verify that `@tailwind` directives no longer show errors
4. Confirm that Tailwind CSS classes have proper IntelliSense

## Troubleshooting
If issues persist:
1. Ensure all recommended extensions are installed
2. Restart the TypeScript/CSS language server (Ctrl+Shift+P > "Reload Window")
3. Check that the workspace is opened at the kanban-webapp level
4. Verify PostCSS and Tailwind CSS dependencies are properly installed
