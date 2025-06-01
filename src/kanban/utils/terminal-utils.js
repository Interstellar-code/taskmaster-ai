/**
 * Terminal utilities for Kanban board
 * Handles terminal sizing, ASCII art, and box drawing characters
 */

import chalk from 'chalk';

/**
 * Box drawing characters for ASCII art
 */
export const BOX_CHARS = {
    // Single line box drawing
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',

    // Double line box drawing
    doubleTopLeft: '╔',
    doubleTopRight: '╗',
    doubleBottomLeft: '╚',
    doubleBottomRight: '╝',
    doubleHorizontal: '═',
    doubleVertical: '║',

    // Rounded corners (using Unicode box drawing)
    roundedTopLeft: '╭',
    roundedTopRight: '╮',
    roundedBottomLeft: '╰',
    roundedBottomRight: '╯',

    // T-junctions
    topTee: '┬',
    bottomTee: '┴',
    leftTee: '├',
    rightTee: '┤',
    cross: '┼',

    // Double T-junctions
    doubleTopTee: '╦',
    doubleBottomTee: '╩',
    doubleLeftTee: '╠',
    doubleRightTee: '╣',
    doubleCross: '╬'
};

/**
 * Get current terminal dimensions
 */
export function getTerminalSize() {
    return {
        width: process.stdout.columns || 80,
        height: process.stdout.rows || 24
    };
}

/**
 * Calculate column widths for the Kanban board
 * @param {number} terminalWidth - Available terminal width
 * @param {number} numColumns - Number of columns (default: 3)
 * @param {number} padding - Padding between columns (default: 2)
 */
export function calculateColumnWidths(terminalWidth, numColumns = 3, padding = 2) {
    const totalPadding = padding * (numColumns - 1);
    const availableWidth = terminalWidth - totalPadding - 2; // -2 for border
    const columnWidth = Math.floor(availableWidth / numColumns);
    
    return {
        columnWidth: Math.max(columnWidth, 20), // Minimum width of 20
        totalPadding,
        availableWidth
    };
}

/**
 * Create a horizontal line with box drawing characters
 * @param {number} width - Width of the line
 * @param {string} leftChar - Left character
 * @param {string} rightChar - Right character
 * @param {string} fillChar - Fill character
 */
export function createHorizontalLine(width, leftChar = BOX_CHARS.topLeft, rightChar = BOX_CHARS.topRight, fillChar = BOX_CHARS.horizontal) {
    if (width < 2) return '';
    return leftChar + fillChar.repeat(width - 2) + rightChar;
}

/**
 * Create a rounded horizontal line
 * @param {number} width - Width of the line
 * @param {boolean} isTop - Whether this is a top border
 * @param {boolean} isDouble - Whether to use double lines
 */
export function createRoundedHorizontalLine(width, isTop = true, isDouble = false) {
    if (width < 2) return '';

    const leftChar = isTop ?
        (isDouble ? BOX_CHARS.doubleTopLeft : BOX_CHARS.roundedTopLeft) :
        (isDouble ? BOX_CHARS.doubleBottomLeft : BOX_CHARS.roundedBottomLeft);

    const rightChar = isTop ?
        (isDouble ? BOX_CHARS.doubleTopRight : BOX_CHARS.roundedTopRight) :
        (isDouble ? BOX_CHARS.doubleBottomRight : BOX_CHARS.roundedBottomRight);

    const fillChar = isDouble ? BOX_CHARS.doubleHorizontal : BOX_CHARS.horizontal;

    return leftChar + fillChar.repeat(width - 2) + rightChar;
}

/**
 * Create a double-line horizontal line
 * @param {number} width - Width of the line
 * @param {boolean} isTop - Whether this is a top border
 */
export function createDoubleHorizontalLine(width, isTop = true) {
    if (width < 2) return '';

    const leftChar = isTop ? BOX_CHARS.doubleTopLeft : BOX_CHARS.doubleBottomLeft;
    const rightChar = isTop ? BOX_CHARS.doubleTopRight : BOX_CHARS.doubleBottomRight;

    return leftChar + BOX_CHARS.doubleHorizontal.repeat(width - 2) + rightChar;
}

/**
 * Create a vertical border line
 * @param {string} content - Content to wrap
 * @param {number} width - Total width
 * @param {string} borderChar - Border character
 */
export function createVerticalLine(content, width, borderChar = BOX_CHARS.vertical) {
    const contentLength = stripAnsi(content).length;
    const padding = Math.max(0, width - contentLength - 2);
    const leftPadding = Math.floor(padding / 2);
    const rightPadding = padding - leftPadding;

    return borderChar + ' '.repeat(leftPadding) + content + ' '.repeat(rightPadding) + borderChar;
}

/**
 * Create a double vertical border line
 * @param {string} content - Content to wrap
 * @param {number} width - Total width
 */
export function createDoubleVerticalLine(content, width) {
    const contentLength = stripAnsi(content).length;
    const padding = Math.max(0, width - contentLength - 2);
    const leftPadding = Math.floor(padding / 2);
    const rightPadding = padding - leftPadding;

    return BOX_CHARS.doubleVertical + ' '.repeat(leftPadding) + content + ' '.repeat(rightPadding) + BOX_CHARS.doubleVertical;
}

/**
 * Strip ANSI escape codes from string to get actual length
 * @param {string} str - String with potential ANSI codes
 */
export function stripAnsi(str) {
    return str.replace(/\u001b\[[0-9;]*m/g, '');
}

/**
 * Truncate text to fit within specified width
 * @param {string} text - Text to truncate
 * @param {number} maxWidth - Maximum width
 * @param {string} ellipsis - Ellipsis character(s)
 */
export function truncateText(text, maxWidth, ellipsis = '...') {
    if (stripAnsi(text).length <= maxWidth) {
        return text;
    }
    
    const truncateLength = maxWidth - ellipsis.length;
    if (truncateLength <= 0) {
        return ellipsis.substring(0, maxWidth);
    }
    
    // Handle ANSI codes properly when truncating
    let result = '';
    let visibleLength = 0;
    let inAnsiCode = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        if (char === '\u001b') {
            inAnsiCode = true;
        }
        
        if (inAnsiCode) {
            result += char;
            if (char === 'm') {
                inAnsiCode = false;
            }
        } else {
            if (visibleLength >= truncateLength) {
                break;
            }
            result += char;
            visibleLength++;
        }
    }
    
    return result + ellipsis;
}

/**
 * Center text within a given width
 * @param {string} text - Text to center
 * @param {number} width - Total width
 */
export function centerText(text, width) {
    const textLength = stripAnsi(text).length;
    if (textLength >= width) {
        return text;
    }
    
    const padding = width - textLength;
    const leftPadding = Math.floor(padding / 2);
    const rightPadding = padding - leftPadding;
    
    return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding);
}

/**
 * Create a box around content
 * @param {string[]} lines - Array of content lines
 * @param {number} width - Box width
 * @param {string} title - Optional title for the box
 */
export function createBox(lines, width, title = '') {
    const result = [];
    
    // Top border
    if (title) {
        const titleLine = ` ${title} `;
        const titleLength = stripAnsi(titleLine).length;
        const remainingWidth = width - titleLength - 2;
        const leftBorder = Math.floor(remainingWidth / 2);
        const rightBorder = remainingWidth - leftBorder;
        
        result.push(
            BOX_CHARS.horizontal.repeat(leftBorder) + 
            titleLine + 
            BOX_CHARS.horizontal.repeat(rightBorder)
        );
    } else {
        result.push(createHorizontalLine(width));
    }
    
    // Content lines
    lines.forEach(line => {
        result.push(createVerticalLine(line, width));
    });
    
    // Bottom border
    result.push(createHorizontalLine(width, BOX_CHARS.bottomLeft, BOX_CHARS.bottomRight));
    
    return result;
}

/**
 * Clear the terminal screen
 */
export function clearScreen() {
    process.stdout.write('\x1b[2J\x1b[0f');
}

/**
 * Move cursor to specific position
 * @param {number} row - Row position (1-based)
 * @param {number} col - Column position (1-based)
 */
export function moveCursor(row, col) {
    process.stdout.write(`\x1b[${row};${col}H`);
}

/**
 * Hide cursor
 */
export function hideCursor() {
    process.stdout.write('\x1b[?25l');
}

/**
 * Show cursor
 */
export function showCursor() {
    process.stdout.write('\x1b[?25h');
}

/**
 * Get status emoji and color for task status
 * @param {string} status - Task status
 */
export function getStatusDisplay(status) {
    switch (status) {
        case 'pending':
            return { emoji: '📋', color: chalk.yellow, name: 'PENDING' };
        case 'in-progress':
            return { emoji: '🔄', color: chalk.blue, name: 'IN PROGRESS' };
        case 'done':
            return { emoji: '✅', color: chalk.green, name: 'DONE' };
        default:
            return { emoji: '❓', color: chalk.gray, name: status.toUpperCase() };
    }
}

/**
 * Get priority display with color and symbol
 * @param {string} priority - Task priority
 */
export function getPriorityDisplay(priority) {
    switch (priority) {
        case 'high':
            return { symbol: '🔴', color: chalk.red, text: 'High' };
        case 'medium':
            return { symbol: '🟡', color: chalk.yellow, text: 'Medium' };
        case 'low':
            return { symbol: '🟢', color: chalk.green, text: 'Low' };
        default:
            return { symbol: '⚪', color: chalk.gray, text: priority || 'Unknown' };
    }
}
