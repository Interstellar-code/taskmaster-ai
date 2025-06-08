/**
 * Automated Test Suite for Kanban API Migration
 * Tests the migration from legacy API endpoints to unified API
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const KANBAN_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';

class KanbanAPITester {
  constructor(page) {
    this.page = page;
    this.testResults = [];
  }

  async log(message, status = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, status };
    this.testResults.push(logEntry);
    console.log(`[${timestamp}] ${status.toUpperCase()}: ${message}`);
  }

  async testAPIEndpoint(endpoint, method = 'GET', body = null) {
    try {
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_URL}${endpoint}`, options);
      const data = await response.json();
      
      await this.log(`API ${method} ${endpoint}: ${response.status}`, 
        response.ok ? 'success' : 'error');
      
      return { response, data, success: response.ok };
    } catch (error) {
      await this.log(`API ${method} ${endpoint} failed: ${error.message}`, 'error');
      return { error, success: false };
    }
  }

  async testKanbanPageLoad() {
    await this.log('Testing kanban page load...');
    
    try {
      await this.page.goto(KANBAN_URL);
      await this.page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
      await this.log('Kanban board loaded successfully', 'success');
      return true;
    } catch (error) {
      await this.log(`Kanban page load failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testTaskLoading() {
    await this.log('Testing task loading from unified API...');
    
    try {
      // Wait for tasks to load
      await this.page.waitForSelector('[data-testid="task-card"]', { timeout: 15000 });
      
      // Count loaded tasks
      const taskCards = await this.page.$$('[data-testid="task-card"]');
      await this.log(`Loaded ${taskCards.length} tasks from API`, 'success');
      
      // Check if tasks have proper data
      if (taskCards.length > 0) {
        const firstTask = taskCards[0];
        const taskTitle = await firstTask.$eval('[data-testid="task-title"]', el => el.textContent);
        await this.log(`First task title: "${taskTitle}"`, 'info');
      }
      
      return taskCards.length > 0;
    } catch (error) {
      await this.log(`Task loading failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testTaskCreation() {
    await this.log('Testing task creation via unified API...');
    
    try {
      // Click create task button
      await this.page.click('[data-testid="create-task-button"]');
      await this.page.waitForSelector('[data-testid="task-create-modal"]', { timeout: 5000 });
      
      // Fill task form
      const testTaskTitle = `Test Task ${Date.now()}`;
      await this.page.fill('[data-testid="task-title-input"]', testTaskTitle);
      await this.page.fill('[data-testid="task-description-input"]', 'Test task description for API migration testing');
      
      // Submit form
      await this.page.click('[data-testid="task-create-submit"]');
      
      // Wait for modal to close and task to appear
      await this.page.waitForSelector('[data-testid="task-create-modal"]', { state: 'hidden', timeout: 10000 });
      
      // Verify task was created
      await this.page.waitForSelector(`text="${testTaskTitle}"`, { timeout: 10000 });
      await this.log(`Task "${testTaskTitle}" created successfully`, 'success');
      
      return true;
    } catch (error) {
      await this.log(`Task creation failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testTaskStatusUpdate() {
    await this.log('Testing task status update via drag and drop...');
    
    try {
      // Find a task in pending column
      const pendingTask = await this.page.$('[data-testid="column-pending"] [data-testid="task-card"]');
      if (!pendingTask) {
        await this.log('No pending tasks found for status update test', 'warning');
        return false;
      }
      
      // Get task title for verification
      const taskTitle = await pendingTask.$eval('[data-testid="task-title"]', el => el.textContent);
      
      // Drag task to in-progress column
      const inProgressColumn = await this.page.$('[data-testid="column-in-progress"]');
      await pendingTask.dragTo(inProgressColumn);
      
      // Wait for status update
      await this.page.waitForTimeout(2000);
      
      // Verify task moved to in-progress column
      const movedTask = await this.page.$(`[data-testid="column-in-progress"] text="${taskTitle}"`);
      if (movedTask) {
        await this.log(`Task "${taskTitle}" status updated successfully`, 'success');
        return true;
      } else {
        await this.log(`Task "${taskTitle}" status update failed`, 'error');
        return false;
      }
    } catch (error) {
      await this.log(`Task status update failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testPRDUpload() {
    await this.log('Testing PRD upload functionality...');
    
    try {
      // Click PRD management button
      await this.page.click('[data-testid="prd-management-button"]');
      await this.page.waitForSelector('[data-testid="prd-upload-modal"]', { timeout: 5000 });
      
      // Test file upload (simulate)
      const testPRDContent = `# Test PRD
## Overview
This is a test PRD for API migration testing.

## Requirements
1. Test requirement 1
2. Test requirement 2
3. Test requirement 3`;
      
      // Fill PRD content
      await this.page.fill('[data-testid="prd-content-input"]', testPRDContent);
      await this.page.fill('[data-testid="prd-filename-input"]', 'test-prd-migration.md');
      
      // Submit PRD
      await this.page.click('[data-testid="prd-upload-submit"]');
      
      // Check for success or error message
      const successMessage = await this.page.waitForSelector('[data-testid="upload-success"]', { timeout: 10000 });
      if (successMessage) {
        await this.log('PRD upload completed (may be placeholder)', 'success');
        return true;
      }
      
      return false;
    } catch (error) {
      await this.log(`PRD upload test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async runAllTests() {
    await this.log('Starting Kanban API Migration Test Suite...');
    
    const tests = [
      { name: 'Page Load', test: () => this.testKanbanPageLoad() },
      { name: 'Task Loading', test: () => this.testTaskLoading() },
      { name: 'Task Creation', test: () => this.testTaskCreation() },
      { name: 'Task Status Update', test: () => this.testTaskStatusUpdate() },
      { name: 'PRD Upload', test: () => this.testPRDUpload() }
    ];
    
    const results = {};
    
    for (const { name, test } of tests) {
      await this.log(`Running test: ${name}...`);
      try {
        results[name] = await test();
      } catch (error) {
        results[name] = false;
        await this.log(`Test ${name} threw error: ${error.message}`, 'error');
      }
    }
    
    // Summary
    const passed = Object.values(results).filter(r => r === true).length;
    const total = Object.keys(results).length;
    
    await this.log(`\n=== TEST SUMMARY ===`);
    await this.log(`Passed: ${passed}/${total}`);
    
    for (const [testName, result] of Object.entries(results)) {
      const status = result ? '✅ PASS' : '❌ FAIL';
      await this.log(`${status}: ${testName}`);
    }
    
    return { results, passed, total, success: passed === total };
  }
}

module.exports = { KanbanAPITester };
