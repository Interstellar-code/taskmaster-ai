/**
 * PRD Confirmation Popup Component
 * Handles confirmation dialogs for destructive operations like archiving PRDs
 */

import chalk from 'chalk';
import { 
    hideCursor, 
    showCursor, 
    getTerminalSize,
    centerText,
    createRoundedHorizontalLine,
    createVerticalLine
} from '../../kanban/utils/terminal-utils.js';

/**
 * PRD Confirmation Popup class
 */
export class PRDConfirmationPopup {
    constructor() {
        this.isVisible = false;
        this.message = '';
        this.title = '';
        this.confirmCallback = null;
        this.cancelCallback = null;
        this.popupWidth = 60;
        this.popupHeight = 10;
        this.selectedOption = 'no'; // Default to 'no' for safety
    }

    /**
     * Show confirmation popup
     * @param {string} title - Title of the confirmation dialog
     * @param {string} message - Message to display
     * @param {Function} onConfirm - Callback when user confirms
     * @param {Function} onCancel - Callback when user cancels
     */
    show(title, message, onConfirm, onCancel) {
        this.title = title;
        this.message = message;
        this.confirmCallback = onConfirm;
        this.cancelCallback = onCancel;
        this.selectedOption = 'no'; // Always default to 'no' for safety
        this.isVisible = true;
        hideCursor();
    }

    /**
     * Hide confirmation popup
     */
    hide() {
        this.isVisible = false;
        this.title = '';
        this.message = '';
        this.confirmCallback = null;
        this.cancelCallback = null;
        this.selectedOption = 'no';
        showCursor();
    }

    /**
     * Check if popup is visible
     */
    isOpen() {
        return this.isVisible;
    }

    /**
     * Handle keyboard input
     * @param {string} key - Pressed key
     */
    handleKeyPress(key) {
        if (!this.isVisible) return false;

        switch (key) {
            case '\u001b[C': // Right arrow
            case '\t': // Tab
                this.selectedOption = this.selectedOption === 'yes' ? 'no' : 'yes';
                return true;
                
            case '\u001b[D': // Left arrow
            case '\u001b[Z': // Shift+Tab
                this.selectedOption = this.selectedOption === 'yes' ? 'no' : 'yes';
                return true;
                
            case 'y':
            case 'Y':
                this.selectedOption = 'yes';
                return true;
                
            case 'n':
            case 'N':
                this.selectedOption = 'no';
                return true;
                
            case '\r': // Enter
            case '\n':
                this.executeAction();
                return true;
                
            case '\u001b': // Escape
                this.cancel();
                return true;
                
            default:
                return false;
        }
    }

    /**
     * Execute the selected action
     */
    executeAction() {
        if (this.selectedOption === 'yes' && this.confirmCallback) {
            this.confirmCallback();
        } else if (this.cancelCallback) {
            this.cancelCallback();
        }
        this.hide();
    }

    /**
     * Cancel the operation
     */
    cancel() {
        if (this.cancelCallback) {
            this.cancelCallback();
        }
        this.hide();
    }

    /**
     * Render the confirmation popup
     */
    render() {
        if (!this.isVisible) return null;

        const { width: termWidth, height: termHeight } = getTerminalSize();
        
        // Calculate popup position (centered)
        const startX = Math.floor((termWidth - this.popupWidth) / 2);
        const startY = Math.floor((termHeight - this.popupHeight) / 2);
        
        const lines = [];
        
        // Top border
        lines.push(createRoundedHorizontalLine(this.popupWidth, true, false));
        
        // Title bar
        const titleBar = centerText(chalk.red.bold(` ${this.title} `), this.popupWidth - 2);
        lines.push(createVerticalLine(titleBar, this.popupWidth));
        
        // Separator
        lines.push(createRoundedHorizontalLine(this.popupWidth, true, false).replace(/╭/g, '├').replace(/╮/g, '┤'));
        
        // Empty line
        lines.push(createVerticalLine('', this.popupWidth));
        
        // Message lines (word wrap if needed)
        const messageLines = this.wrapText(this.message, this.popupWidth - 4);
        messageLines.forEach(line => {
            const centeredLine = centerText(chalk.white(line), this.popupWidth - 2);
            lines.push(createVerticalLine(centeredLine, this.popupWidth));
        });
        
        // Empty line
        lines.push(createVerticalLine('', this.popupWidth));
        
        // Button line
        const yesButton = this.selectedOption === 'yes' 
            ? chalk.black.bgGreen(' YES ') 
            : chalk.green(' YES ');
        const noButton = this.selectedOption === 'no' 
            ? chalk.black.bgRed(' NO ') 
            : chalk.red(' NO ');
        
        const buttonLine = `${yesButton}   ${noButton}`;
        const centeredButtons = centerText(buttonLine, this.popupWidth - 2);
        lines.push(createVerticalLine(centeredButtons, this.popupWidth));
        
        // Empty line
        lines.push(createVerticalLine('', this.popupWidth));
        
        // Instructions
        const instructions = chalk.dim('Use ←→ or Y/N to select, Enter to confirm, Esc to cancel');
        const centeredInstructions = centerText(instructions, this.popupWidth - 2);
        lines.push(createVerticalLine(centeredInstructions, this.popupWidth));
        
        // Bottom border
        lines.push(createRoundedHorizontalLine(this.popupWidth, false, true));
        
        // Position and render each line
        const output = [];
        lines.forEach((line, index) => {
            const y = startY + index;
            if (y >= 0 && y < termHeight) {
                output.push(`\u001b[${y + 1};${startX + 1}H${line}`);
            }
        });
        
        return output.join('');
    }

    /**
     * Wrap text to fit within specified width
     * @param {string} text - Text to wrap
     * @param {number} maxWidth - Maximum width per line
     * @returns {string[]} Array of wrapped lines
     */
    wrapText(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            if (currentLine.length + word.length + 1 <= maxWidth) {
                currentLine += (currentLine ? ' ' : '') + word;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                }
                currentLine = word;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines.length > 0 ? lines : [''];
    }
}

/**
 * Create a PRD confirmation popup instance
 */
export function createPRDConfirmationPopup() {
    return new PRDConfirmationPopup();
}
