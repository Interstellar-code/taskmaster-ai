# TaskMaster AI - Configuration and PRD Fixes

This document outlines the fixes applied to resolve configuration file location issues and PRD management problems.

## Issues Fixed

### 1. Configuration File Location Confusion

**Problem**: After the 0.16 merger, TaskMaster was still looking for `.taskmasterconfig` in some places instead of the new `.taskmaster/config.json` location.

**Root Cause**: Hardcoded references to `.taskmasterconfig` in several files weren't updated to use the new directory structure.

**Files Fixed**:
- `scripts/modules/task-manager/models.js` - Updated config path resolution
- `scripts/modules/config-manager.js` - Updated warning messages

**Solution**: 
- Updated hardcoded config path references to use `getConfigPath()` function
- Modified error messages to be generic ("config file" instead of ".taskmasterconfig")
- Ensured backward compatibility through the existing `getConfigPath()` function

### 2. PRD File Browser Search Paths

**Problem**: The PRD file browser was looking in `scripts` folder instead of the new `.taskmaster/prd/pending` structure.

**Root Cause**: Search paths in the menu system weren't updated for the new directory structure.

**Files Fixed**:
- `src/menu/index.js` - Updated `browsePRDFiles()` function
- `mcp-server/src/core/utils/path-utils.js` - Updated `findPRDDocumentPath()` function

**Solution**:
- Prioritized new structure paths (`.taskmaster/prd/pending`, etc.)
- Maintained backward compatibility with old structure
- Added comprehensive search path coverage

### 3. PRD Show Command Parameter Error

**Problem**: Menu was passing `--prdId=prd_001` parameter, but the command expects PRD ID as a positional argument.

**Root Cause**: Mismatch between menu parameter handling and command definition.

**Files Fixed**:
- `src/menu/index.js` - Created dedicated handler functions

**Solution**:
- Created `handlePrdShow()` function to properly pass PRD ID as positional argument
- Created `handlePrdStatus()` function for status updates
- Used `executeCommand()` instead of `executeCommandWithParams()` for positional arguments

## New Search Path Priority

### PRD File Browser
1. `.taskmaster/prd/pending/`
2. `.taskmaster/prd/in-progress/`
3. `.taskmaster/prd/done/`
4. `.taskmaster/prd/`
5. `prd/pending/`
6. `prd/in-progress/`
7. `prd/done/`
8. `prd/`
9. `scripts/`
10. `docs/`
11. `requirements/`
12. `.` (project root)

### Configuration File Resolution
1. `.taskmaster/config.json` (new structure)
2. `.taskmasterconfig` (legacy structure)

## API Key Configuration Issue

**Current Status**: Most API keys in `.env` are still placeholder values.

**Current .env file**:
```env
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY_HERE
PERPLEXITY_API_KEY=YOUR_PERPLEXITY_KEY_HERE
OPENAI_API_KEY=YOUR_OPENAI_KEY_HERE
GOOGLE_API_KEY=YOUR_GOOGLE_KEY_HERE
MISTRAL_API_KEY=YOUR_MISTRAL_KEY_HERE
OPENROUTER_API_KEY=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
XAI_API_KEY=YOUR_XAI_KEY_HERE
AZURE_OPENAI_API_KEY=YOUR_AZURE_KEY_HERE
```

**Solution**: Use the API key setup script:
```bash
node scripts/setup-api-keys.js
```

## Testing the Fixes

### 1. Test Configuration File Resolution
```bash
# Check if config is found
task-master models --status

# Should show config from .taskmaster/config.json
```

### 2. Test PRD File Browser
```bash
# Launch menu and test PRD parsing
task-master menu

# Navigate to: Project Management > Parse PRD
# Select: Browse and select file
# Should now show files from .taskmaster/prd/pending/
```

### 3. Test PRD Show Command
```bash
# Launch menu and test PRD details
task-master menu

# Navigate to: Project Management > PRD Management > Show PRD Details
# Enter: prd_001
# Should work without "unknown option" error
```

### 4. Test API Key Configuration
```bash
# Run the setup script
node scripts/setup-api-keys.js

# Follow prompts to configure API keys
# Test with PRD parsing after setup
```

## Verification Commands

```bash
# 1. Verify config file location
ls -la .taskmaster/config.json

# 2. Verify PRD structure
ls -la .taskmaster/prd/

# 3. Test PRD commands directly
task-master prd-show prd_001
task-master prd-status prd_001 pending

# 4. Test menu navigation
task-master menu
```

## Expected Behavior After Fixes

1. **Configuration**: TaskMaster should find and use `.taskmaster/config.json`
2. **PRD Browser**: Should prioritize files in `.taskmaster/prd/pending/`
3. **PRD Commands**: Should work without parameter errors
4. **API Keys**: Setup script should help configure valid keys

## Backward Compatibility

All fixes maintain backward compatibility:
- Old `.taskmasterconfig` files still work
- Old `prd/` directory structure still supported
- Existing commands and parameters unchanged

## Next Steps

1. **Configure API Keys**: Run `node scripts/setup-api-keys.js`
2. **Test PRD Parsing**: Try parsing a PRD file with valid API keys
3. **Verify Menu Navigation**: Test all PRD management functions
4. **Update Documentation**: Ensure all docs reflect new structure

## Troubleshooting

### If config file issues persist:
```bash
# Check current config location
task-master models --status

# Force config recreation
task-master models --setup
```

### If PRD files not found:
```bash
# Check PRD structure
ls -la .taskmaster/prd/

# Verify file permissions
ls -la .taskmaster/prd/pending/
```

### If API key errors continue:
```bash
# Verify .env file
cat .env

# Check for placeholder values
grep "YOUR_.*_HERE" .env

# Run setup script
node scripts/setup-api-keys.js
```
