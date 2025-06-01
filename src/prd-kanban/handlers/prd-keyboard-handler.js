/**
 * PRD Keyboard Handler
 * Following the exact same pattern as task Kanban keyboard handler
 */

import chalk from 'chalk';

/**
 * PRD Keyboard Handler class - Following Task Kanban Architecture
 */
export class PRDKeyboardHandler {
    constructor(board) {
        this.board = board;
        this.keyHandlers = new Map();
        this.isActive = false;
        
        // Setup key mappings
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
        this.keyHandlers.set('1', () => this.board.movePRDToStatus('pending'));
        this.keyHandlers.set('2', () => this.board.movePRDToStatus('in-progress'));
        this.keyHandlers.set('3', () => this.board.movePRDToStatus('done'));
        
        // Quick operations
        this.keyHandlers.set('v', async () => {
            try {
                await this.board.showPRDDetails();
            } catch (error) {
                console.error(chalk.red('Error showing PRD details:'), error.message);
            }
        });
        this.keyHandlers.set('V', async () => {
            try {
                await this.board.showPRDDetails();
            } catch (error) {
                console.error(chalk.red('Error showing PRD details:'), error.message);
            }
        });
        this.keyHandlers.set('t', () => this.board.showLinkedTasks());
        this.keyHandlers.set('T', () => this.board.showLinkedTasks());
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
        if (this.isActive) {
            return;
        }

        this.isActive = true;
        
        // Setup stdin for raw input
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        
        // Listen for keypress events
        process.stdin.on('data', this.handleKeyPress.bind(this));
        
        console.log(chalk.dim('Keyboard handler started. Use arrow keys to navigate, Q to quit.'));
    }

    /**
     * Stop listening for keyboard input
     */
    stop() {
        if (!this.isActive) {
            return;
        }

        this.isActive = false;
        
        // Remove listeners and restore stdin
        process.stdin.removeAllListeners('data');
        process.stdin.setRawMode(false);
        process.stdin.pause();
        
        console.log(chalk.dim('Keyboard handler stopped.'));
    }

    /**
     * Handle key press events
     */
    handleKeyPress(key) {
        if (!this.isActive) {
            return;
        }

        try {
            // Check if popups are open and handle popup input first
            if (this.board.helpPopup && this.board.helpPopup.isPopupOpen()) {
                const handled = this.board.helpPopup.handleKeyPress(key);
                if (handled) {
                    this.board.render();
                    return;
                }
            }

            if (this.board.prdDetailsPopup && this.board.prdDetailsPopup.isOpen()) {
                const handled = this.board.prdDetailsPopup.handleKeyPress(key);
                if (handled) {
                    this.board.render();
                    return;
                }
            }

            // Check if we have a handler for this key
            const handler = this.keyHandlers.get(key);
            if (handler) {
                // Handle async operations
                const result = handler();
                if (result instanceof Promise) {
                    result.then(() => {
                        // Refresh the board after async operations
                        if (this.shouldRefreshAfterKey(key)) {
                            this.board.render();
                        }
                    }).catch(error => {
                        console.error(chalk.red('Error in async key handler:'), error.message);
                        // Still refresh the board even if there was an error
                        if (this.shouldRefreshAfterKey(key)) {
                            this.board.render();
                        }
                    });
                } else {
                    // Refresh the board after sync operations
                    if (this.shouldRefreshAfterKey(key)) {
                        this.board.render();
                    }
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
     * Check if board should refresh after key press
     */
    shouldRefreshAfterKey(key) {
        // Don't refresh for quit keys
        const noRefreshKeys = ['q', 'Q', '\u0003', '\u001b'];
        return !noRefreshKeys.includes(key);
    }

    /**
     * Handle unknown keys (for debugging)
     */
    handleUnknownKey(key) {
        // Only log in debug mode to avoid spam
        if (process.env.DEBUG_KEYBOARD) {
            const keyCode = key.charCodeAt(0);
            const keyHex = key.split('').map(c => c.charCodeAt(0).toString(16)).join(' ');
            console.log(chalk.dim(`Unknown key: "${key}" (code: ${keyCode}, hex: ${keyHex})`));
        }
    }

    /**
     * Add custom key handler
     */
    addKeyHandler(key, handler) {
        this.keyHandlers.set(key, handler);
    }

    /**
     * Remove key handler
     */
    removeKeyHandler(key) {
        this.keyHandlers.delete(key);
    }

    /**
     * Get all registered keys
     */
    getRegisteredKeys() {
        return Array.from(this.keyHandlers.keys());
    }

    /**
     * Check if handler is active
     */
    isHandlerActive() {
        return this.isActive;
    }

    /**
     * Get key mapping for help display
     */
    getKeyMappings() {
        return {
            navigation: {
                '←→': 'Move between columns',
                '↑↓': 'Move between PRDs',
                'Page Up/Down': 'Scroll column',
                'Ctrl+↑↓': 'Scroll column'
            },
            actions: {
                '1-3': 'Move PRD to status (1=Pending, 2=In Progress, 3=Done)',
                'V': 'View PRD details',
                'T': 'Show linked tasks',
                'S': 'Show statistics',
                'R': 'Refresh board',
                'H/?': 'Show help'
            },
            system: {
                'Q': 'Quit board',
                'Ctrl+C': 'Force quit',
                'Esc': 'Quit board'
            }
        };
    }
}

/**
 * Create a PRD keyboard handler instance
 */
export function createPRDKeyboardHandler(board) {
    return new PRDKeyboardHandler(board);
}
