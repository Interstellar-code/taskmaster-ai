/**
 * Keyboard Handler for Kanban Board
 * Handles all keyboard input and navigation
 */

import chalk from 'chalk';

/**
 * KeyboardHandler class for managing keyboard input
 */
export class KeyboardHandler {
    constructor(board) {
        this.board = board;
        this.isActive = false;
        this.keyHandlers = new Map();
        
        // Bind the key press handler
        this.handleKeyPress = this.handleKeyPress.bind(this);
        
        // Setup default key mappings
        this.setupDefaultKeyMappings();
    }

    /**
     * Setup default key mappings
     */
    setupDefaultKeyMappings() {
        // Navigation keys
        this.keyHandlers.set('\u001b[C', () => this.board.moveToNextColumn()); // Right arrow
        this.keyHandlers.set('\u001b[D', () => this.board.moveToPreviousColumn()); // Left arrow
        this.keyHandlers.set('\u001b[A', () => this.board.moveSelectionUp()); // Up arrow
        this.keyHandlers.set('\u001b[B', () => this.board.moveSelectionDown()); // Down arrow
        
        // Status update keys
        this.keyHandlers.set('1', () => this.board.moveTaskToStatus('pending'));
        this.keyHandlers.set('2', () => this.board.moveTaskToStatus('in-progress'));
        this.keyHandlers.set('3', () => this.board.moveTaskToStatus('done'));
        
        // Quick operations
        this.keyHandlers.set('r', () => this.board.refreshBoard());
        this.keyHandlers.set('R', () => this.board.refreshBoard());
        this.keyHandlers.set('s', () => this.board.showStatistics());
        this.keyHandlers.set('S', () => this.board.showStatistics());
        this.keyHandlers.set('h', () => this.board.showHelp());
        this.keyHandlers.set('H', () => this.board.showHelp());
        this.keyHandlers.set('?', () => this.board.showHelp());
        
        // Exit keys
        this.keyHandlers.set('q', () => this.board.quit());
        this.keyHandlers.set('Q', () => this.board.quit());
        this.keyHandlers.set('\u0003', () => this.board.quit()); // Ctrl+C
        this.keyHandlers.set('\u001b', () => this.board.quit()); // Escape
        
        // Task operations (for future implementation)
        this.keyHandlers.set('v', () => this.board.viewTaskDetails());
        this.keyHandlers.set('V', () => this.board.viewTaskDetails());
        this.keyHandlers.set('d', () => this.board.deleteTask());
        this.keyHandlers.set('D', () => this.board.deleteTask());
        this.keyHandlers.set('e', () => this.board.editTask());
        this.keyHandlers.set('E', () => this.board.editTask());
        this.keyHandlers.set('i', () => this.board.showTaskInfo());
        this.keyHandlers.set('I', () => this.board.showTaskInfo());
        
        // Board controls (for future implementation)
        this.keyHandlers.set('f', () => this.board.toggleFilter());
        this.keyHandlers.set('F', () => this.board.toggleFilter());
        this.keyHandlers.set('/', () => this.board.openSearch());
        this.keyHandlers.set('\t', () => this.board.cycleFocus()); // Tab

        // Column scrolling
        this.keyHandlers.set('\u001b[5~', () => this.board.scrollColumnUp()); // Page Up
        this.keyHandlers.set('\u001b[6~', () => this.board.scrollColumnDown()); // Page Down
        this.keyHandlers.set('\u001b[1;5A', () => this.board.scrollColumnUp()); // Ctrl+Up
        this.keyHandlers.set('\u001b[1;5B', () => this.board.scrollColumnDown()); // Ctrl+Down
    }

    /**
     * Start listening for keyboard input
     */
    start() {
        if (this.isActive) return;
        
        this.isActive = true;
        
        // Set raw mode for immediate key capture
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', this.handleKeyPress);
        
        // Handle process termination
        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());
    }

    /**
     * Stop listening for keyboard input
     */
    stop() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Restore terminal state
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
        }
        
        process.stdin.pause();
        process.stdin.removeListener('data', this.handleKeyPress);
    }

    /**
     * Handle keyboard input
     * @param {string} key - Pressed key
     */
    handleKeyPress(key) {
        if (!this.isActive) return;

        try {
            // Check if popups are open and handle popup input first
            if (this.board.helpPopup && this.board.helpPopup.isPopupOpen()) {
                const handled = this.board.helpPopup.handleKeyPress(key);
                if (handled) {
                    this.board.render();
                    return;
                }
            }

            if (this.board.taskDetailsPopup && this.board.taskDetailsPopup.isOpen()) {
                const handled = this.board.taskDetailsPopup.handleKeyPress(key);
                if (handled) {
                    this.board.render();
                    return;
                }
            }

            // Check if we have a handler for this key
            const handler = this.keyHandlers.get(key);
            if (handler) {
                handler();
                // Refresh the board after most operations
                if (this.shouldRefreshAfterKey(key)) {
                    this.board.render();
                }
            } else {
                // Handle unknown keys (for debugging)
                this.handleUnknownKey(key);
            }
        } catch (error) {
            console.error(chalk.red('Error handling key press:'), error.message);
        }
    }

    /**
     * Check if board should refresh after a key press
     * @param {string} key - The pressed key
     */
    shouldRefreshAfterKey(key) {
        // Don't refresh for these keys as they handle their own display
        const noRefreshKeys = ['q', 'Q', '\u0003', '\u001b', 's', 'S', 'h', 'H', '?'];
        return !noRefreshKeys.includes(key);
    }

    /**
     * Handle unknown key presses (for debugging)
     * @param {string} key - Unknown key
     */
    handleUnknownKey(key) {
        // In debug mode, you could log unknown keys
        // console.log('Unknown key:', key.charCodeAt(0), key);
    }

    /**
     * Add a custom key handler
     * @param {string} key - Key to handle
     * @param {Function} handler - Handler function
     */
    addKeyHandler(key, handler) {
        this.keyHandlers.set(key, handler);
    }

    /**
     * Remove a key handler
     * @param {string} key - Key to remove
     */
    removeKeyHandler(key) {
        this.keyHandlers.delete(key);
    }

    /**
     * Get all registered key handlers
     */
    getKeyHandlers() {
        return new Map(this.keyHandlers);
    }

    /**
     * Check if keyboard handler is active
     */
    isListening() {
        return this.isActive;
    }

    /**
     * Get help text for keyboard shortcuts
     */
    getHelpText() {
        return {
            navigation: [
                '← → : Move between columns',
                '↑ ↓ : Move between tasks',
                'PgUp/PgDn : Scroll column up/down',
                'Ctrl+↑/↓ : Scroll column up/down'
            ],
            actions: [
                '1   : Move task to Pending',
                '2   : Move task to In Progress', 
                '3   : Move task to Done'
            ],
            operations: [
                'V   : View task details',
                'D   : Delete task',
                'E   : Edit task title',
                'I   : Show task info',
                'R   : Refresh board'
            ],
            board: [
                'F   : Toggle filters',
                '/   : Search tasks',
                'S   : Show statistics',
                'H   : Show help',
                'Q   : Quit to menu'
            ]
        };
    }

    /**
     * Format help text for display
     */
    formatHelpText() {
        const help = this.getHelpText();
        const sections = [];
        
        sections.push(chalk.white.bold('Navigation:'));
        help.navigation.forEach(line => sections.push(chalk.gray(`  ${line}`)));
        
        sections.push(chalk.white.bold('\nActions:'));
        help.actions.forEach(line => sections.push(chalk.gray(`  ${line}`)));
        
        sections.push(chalk.white.bold('\nOperations:'));
        help.operations.forEach(line => sections.push(chalk.gray(`  ${line}`)));
        
        sections.push(chalk.white.bold('\nBoard:'));
        help.board.forEach(line => sections.push(chalk.gray(`  ${line}`)));
        
        return sections.join('\n');
    }
}

/**
 * Create a keyboard handler instance
 */
export function createKeyboardHandler(board) {
    return new KeyboardHandler(board);
}
