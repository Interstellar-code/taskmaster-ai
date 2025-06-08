# Phase 3: CLI Architecture Refinement & Testing Implementation Plan

## Current Critical Issues

### 1. **BROKEN `task-hero init` Command**
- ❌ Still creates JSON files (`tasks.json`, `prds.json`)
- ❌ No SQLite database initialization
- ❌ Uses old `scripts/init.js` instead of new database system

### 2. **Mixed Architecture State**
- ✅ Database access layer exists (`scripts/modules/database/cli-database.js`)
- ❌ CLI commands still have API fallbacks
- ❌ `task-hero init` not using database initialization

### 3. **Testing Gaps**
- ❌ No unit tests for CLI commands
- ❌ No testing of database operations
- ❌ No integration tests for complete workflows

## Phase 3 Implementation Tasks

### **Task 3.1: Fix `task-hero init` Command**
**Priority:** CRITICAL | **Effort:** 1 day

#### Current Problem:
```javascript
// commands.js line 2526 - WRONG!
await initializeProject(cmdOptions); // Uses old JSON system
```

#### Required Fix:
```javascript
// Should use new database initialization
import { initializeTaskHero } from '../../api/index.js';
await initializeTaskHero(process.cwd(), cmdOptions);
```

#### Acceptance Criteria:
- [ ] `task-hero init` creates SQLite database (`taskhero.db`)
- [ ] No JSON files created (`tasks.json`, `prds.json`)
- [ ] Database schema properly initialized
- [ ] Migration from existing JSON files works
- [ ] Test with existing TaskMaster project data

### **Task 3.2: Remove API Dependencies from CLI**
**Priority:** HIGH | **Effort:** 2 days

#### Current Issues:
- CLI commands have API fallback logic
- Mixed file/API access patterns
- Unnecessary complexity

#### Required Changes:
- Remove all API imports from CLI commands
- Use direct database access only
- Remove `--api` and `--no-api` options
- Simplify command implementations

### **Task 3.3: Test Database Migration**
**Priority:** HIGH | **Effort:** 1 day

#### Test Scenarios:
- [ ] Fresh project initialization
- [ ] Migration from existing JSON files
- [ ] Migration with complex task dependencies
- [ ] Migration with PRD data
- [ ] Error handling for corrupted data

### **Task 3.4: Create Comprehensive CLI Tests**
**Priority:** HIGH | **Effort:** 3 days

#### Test Structure:
```
tests/unit/cli-commands/
├── init-command.test.js          # Test database initialization
├── next-command.test.js          # Test next task logic
├── list-command.test.js          # Test task listing
├── add-task-command.test.js      # Test task creation
├── set-status-command.test.js    # Test status updates
├── expand-command.test.js        # Test task expansion
└── menu-system.test.js           # Test interactive menu
```

#### Test Requirements:
- [ ] All CLI commands tested with database
- [ ] Error handling for invalid inputs
- [ ] Edge cases and boundary conditions
- [ ] Database transaction testing
- [ ] Migration testing

### **Task 3.5: Integration Testing**
**Priority:** MEDIUM | **Effort:** 2 days

#### Test Workflows:
- [ ] Complete PRD-to-execution workflow
- [ ] Task dependency management
- [ ] Status transitions and validation
- [ ] Interactive menu operations
- [ ] Database consistency checks

## Implementation Priority

### **Week 1: Critical Fixes**
1. **Day 1**: Fix `task-hero init` to use SQLite
2. **Day 2**: Test init with existing project data
3. **Day 3**: Remove API dependencies from CLI
4. **Day 4**: Test all CLI commands work independently
5. **Day 5**: Create basic unit test structure

### **Week 2: Comprehensive Testing**
1. **Days 1-3**: Implement all CLI command tests
2. **Days 4-5**: Integration testing and edge cases

## Testing Strategy

### **Database Testing Approach**
```javascript
// Test database setup
beforeEach(async () => {
  // Create temporary test database
  testDb = await createTestDatabase();
  await seedTestData(testDb);
});

afterEach(async () => {
  // Clean up test database
  await testDb.close();
  await fs.unlink(testDbPath);
});
```

### **CLI Command Testing Pattern**
```javascript
describe('task-hero init', () => {
  test('should create SQLite database', async () => {
    await initCommand({ name: 'test-project' });
    expect(fs.existsSync('.taskmaster/taskhero.db')).toBe(true);
    expect(fs.existsSync('.taskmaster/tasks/tasks.json')).toBe(false);
  });
});
```

## Success Criteria

### **Functional Requirements**
- ✅ `task-hero init` creates SQLite database only
- ✅ All CLI commands work without API server
- ✅ Existing project data migrates successfully
- ✅ No JSON files created in new projects

### **Quality Requirements**
- ✅ 100% test coverage for CLI commands
- ✅ All edge cases handled gracefully
- ✅ Database operations tested thoroughly
- ✅ Migration scenarios validated

## Risk Mitigation

### **Data Loss Prevention**
- Backup JSON files before migration
- Validate migration success before cleanup
- Rollback mechanism for failed migrations

### **Performance Validation**
- Test with large datasets
- Verify database query performance
- Monitor memory usage during operations

## Next Steps

1. **Immediate**: Fix `task-hero init` command
2. **Test**: Validate with existing TaskMaster data
3. **Expand**: Add comprehensive test suite
4. **Document**: Update architecture documentation
