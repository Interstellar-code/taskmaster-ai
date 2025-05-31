# Task: Rebrand TaskMaster AI to TaskHero AI

## Task Information
- **Task ID**: REBRAND-001
- **Date Created**: 2025-05-31
- **Priority**: High
- **Status**: Todo
- **Estimated Effort**: 3-5 days
- **Assignee**: Development Team

## Objective
Complete rebranding of TaskMaster AI to TaskHero AI across all project files, documentation, UI elements, and external references.

## Scope
This task covers the comprehensive rebranding effort to change all instances of "TaskMaster" to "TaskHero" throughout the entire codebase and documentation.

## Areas to Rebrand

### 1. Core Application Files
- [ ] **package.json**: Update name, description, keywords, repository URLs
- [ ] **README.md**: Replace all TaskMaster references with TaskHero
- [ ] **README-task-master.md**: Rename file and update content
- [ ] **index.js**: Update comments, descriptions, and exported names
- [ ] **bin/task-master.js**: Rename to task-hero.js and update internal references

### 2. Configuration & Scripts
- [ ] **scripts/**: Update all script files with TaskHero branding
- [ ] **mcp-server/**: Update MCP server references and configurations
- [ ] **src/**: Update source code comments and string literals
- [ ] **.env.example**: Update any TaskMaster references in comments

### 3. Documentation
- [ ] **docs/**: Update all documentation files
- [ ] **CHANGELOG.md**: Update project name references
- [ ] **LICENSE**: Update if project name is mentioned
- [ ] **assets/**: Update any asset files with branding

### 4. CLI Commands & Help Text
- [ ] Update CLI command descriptions and help text
- [ ] Update error messages and user-facing strings
- [ ] Update banner/logo text in UI modules

### 5. Dependencies & External References
- [ ] Update npm package name and related configurations
- [ ] Update any hardcoded URLs or references
- [ ] Update MCP configuration examples

### 6. Testing & Build Files
- [ ] **tests/**: Update test descriptions and assertions
- [ ] **jest.config.js**: Update if project name is referenced
- [ ] Update any build or deployment scripts

## Technical Requirements

### File Naming Conventions
- Rename `task-master.js` to `task-hero.js`
- Rename `README-task-master.md` to `README-task-hero.md`
- Update any other files with "task-master" in the name

### String Replacements
- "TaskMaster" → "TaskHero"
- "Task Master" → "Task Hero" 
- "task-master" → "task-hero"
- "taskmaster" → "taskhero"
- "TASKMASTER" → "TASKHERO"

### Package Configuration
- Update package.json name from "task-master-ai" to "task-hero-ai"
- Update binary commands from "task-master" to "task-hero"
- Update repository URLs and homepage links

## Acceptance Criteria
- [ ] All instances of "TaskMaster" replaced with "TaskHero" across the codebase
- [ ] All file names updated to reflect new branding
- [ ] Package.json properly configured with new name and details
- [ ] CLI commands work with new "task-hero" command name
- [ ] Documentation accurately reflects TaskHero branding
- [ ] No broken references or links due to renaming
- [ ] MCP server configurations updated for TaskHero
- [ ] All tests pass with updated branding

## Implementation Notes
1. Use global search and replace carefully to avoid breaking functionality
2. Test CLI commands after renaming binary files
3. Verify MCP server still works with updated configurations
4. Update any hardcoded paths or references
5. Ensure backward compatibility considerations are documented

## Dependencies
- None (standalone rebranding task)

## Risks & Considerations
- **Breaking Changes**: Renaming CLI commands will require users to update their configurations
- **External References**: Any external documentation or tutorials will need updates
- **Package Registry**: New npm package name will need to be available
- **User Migration**: Consider providing migration guide for existing users

## Testing Strategy
1. **Functional Testing**: Verify all CLI commands work with new names
2. **Integration Testing**: Test MCP server integration with new branding
3. **Documentation Review**: Ensure all documentation is consistent
4. **Search Verification**: Confirm no old branding remains in codebase

## Definition of Done
- All TaskMaster references replaced with TaskHero
- CLI commands functional with new naming
- Documentation updated and consistent
- Tests passing
- No broken links or references
- Package ready for publication with new name
