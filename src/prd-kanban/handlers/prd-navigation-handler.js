/**
 * PRD Navigation Handler
 * Following the exact same pattern as task Kanban navigation handler
 */

import chalk from 'chalk';

/**
 * PRD NavigationHandler class for managing board navigation
 */
export class PRDNavigationHandler {
	constructor(boardLayout) {
		this.boardLayout = boardLayout;
		this.statusOrder = ['pending', 'in-progress', 'done'];
		this.navigationHistory = [];
		this.maxHistorySize = 10;
	}

	/**
	 * Move to the next column (right arrow)
	 */
	moveToNextColumn() {
		// Use board layout's navigation
		this.boardLayout.moveToNextColumn();

		this.addToHistory('column', this.boardLayout.currentColumnIndex);

		return {
			success: true,
			currentColumn: this.statusOrder[this.boardLayout.currentColumnIndex]
		};
	}

	/**
	 * Move to the previous column (left arrow)
	 */
	moveToPreviousColumn() {
		// Use board layout's navigation
		this.boardLayout.moveToPreviousColumn();

		this.addToHistory('column', this.boardLayout.currentColumnIndex);

		return {
			success: true,
			currentColumn: this.statusOrder[this.boardLayout.currentColumnIndex]
		};
	}

	/**
	 * Move selection up within current column
	 */
	moveSelectionUp() {
		const currentColumn = this.getCurrentColumn();
		if (!currentColumn || !currentColumn.hasPRDs()) {
			return { success: false, reason: 'No PRDs in current column' };
		}

		const moved = currentColumn.moveSelectionUp();
		if (moved) {
			this.addToHistory('prd', currentColumn.selectedPRDIndex);
		}

		return {
			success: moved,
			currentColumn: this.statusOrder[this.boardLayout.currentColumnIndex],
			selectedPRD: currentColumn.getSelectedPRD()
		};
	}

	/**
	 * Move selection down within current column
	 */
	moveSelectionDown() {
		const currentColumn = this.getCurrentColumn();
		if (!currentColumn || !currentColumn.hasPRDs()) {
			return { success: false, reason: 'No PRDs in current column' };
		}

		const moved = currentColumn.moveSelectionDown();
		if (moved) {
			this.addToHistory('prd', currentColumn.selectedPRDIndex);
		}

		return {
			success: moved,
			currentColumn: this.statusOrder[this.boardLayout.currentColumnIndex],
			selectedPRD: currentColumn.getSelectedPRD()
		};
	}

	/**
	 * Jump to a specific column by status
	 * @param {string} status - Target status ('pending', 'in-progress', 'done')
	 */
	jumpToColumn(status) {
		const targetIndex = this.statusOrder.indexOf(status);
		if (targetIndex === -1) {
			return { success: false, reason: `Invalid status: ${status}` };
		}

		const oldColumn = this.getCurrentColumn();
		if (oldColumn) {
			oldColumn.clearSelection();
			this.addToHistory('column', this.boardLayout.currentColumnIndex);
		}

		this.boardLayout.currentColumnIndex = targetIndex;

		const newColumn = this.getCurrentColumn();
		if (newColumn) {
			newColumn.setActive(true);
			if (newColumn.hasPRDs()) {
				newColumn.setSelectedPRD(0);
			}
		}

		return {
			success: true,
			currentColumn: status,
			hasSelection: newColumn && newColumn.hasPRDs()
		};
	}

	/**
	 * Get current active column
	 */
	getCurrentColumn() {
		return this.boardLayout.getCurrentColumn();
	}

	/**
	 * Get current column status
	 */
	getCurrentStatus() {
		return this.boardLayout.getCurrentStatus();
	}

	/**
	 * Get currently selected PRD
	 */
	getSelectedPRD() {
		const currentColumn = this.getCurrentColumn();
		return currentColumn ? currentColumn.getSelectedPRD() : null;
	}

	/**
	 * Navigate to specific PRD by ID
	 */
	navigateToPRD(prdId) {
		// Search for PRD across all columns
		for (
			let columnIndex = 0;
			columnIndex < this.statusOrder.length;
			columnIndex++
		) {
			const status = this.statusOrder[columnIndex];
			const column = this.boardLayout.columns.get(status);

			if (column) {
				const prd = column.findPRD(prdId);
				if (prd) {
					// Found the PRD, navigate to it
					const oldColumn = this.getCurrentColumn();
					if (oldColumn) {
						oldColumn.setActive(false);
					}

					this.boardLayout.currentColumnIndex = columnIndex;
					column.setActive(true);

					const prdIndex = column.prds.findIndex((p) => p.id === prdId);
					if (prdIndex !== -1) {
						column.setSelectedPRD(prdIndex);
					}

					this.addToHistory('navigation', {
						column: columnIndex,
						prd: prdIndex
					});

					return {
						success: true,
						column: status,
						prd: prd
					};
				}
			}
		}

		return { success: false, reason: `PRD ${prdId} not found` };
	}

	/**
	 * Add action to navigation history
	 */
	addToHistory(type, data) {
		this.navigationHistory.push({
			type,
			data,
			timestamp: Date.now()
		});

		// Keep history size manageable
		if (this.navigationHistory.length > this.maxHistorySize) {
			this.navigationHistory.shift();
		}
	}

	/**
	 * Get navigation history
	 */
	getHistory() {
		return [...this.navigationHistory];
	}

	/**
	 * Clear navigation history
	 */
	clearHistory() {
		this.navigationHistory = [];
	}

	/**
	 * Go back to previous navigation state
	 */
	goBack() {
		if (this.navigationHistory.length < 2) {
			return { success: false, reason: 'No previous navigation state' };
		}

		// Remove current state
		this.navigationHistory.pop();

		// Get previous state
		const previousState =
			this.navigationHistory[this.navigationHistory.length - 1];

		if (previousState.type === 'column') {
			const targetIndex = previousState.data;
			if (targetIndex >= 0 && targetIndex < this.statusOrder.length) {
				const oldColumn = this.getCurrentColumn();
				if (oldColumn) {
					oldColumn.setActive(false);
				}

				this.boardLayout.currentColumnIndex = targetIndex;
				const newColumn = this.getCurrentColumn();
				if (newColumn) {
					newColumn.setActive(true);
					if (newColumn.hasPRDs()) {
						newColumn.setSelectedPRD(0);
					}
				}
			}

			return {
				success: true,
				type: 'column',
				currentColumn: this.statusOrder[this.boardLayout.currentColumnIndex]
			};
		} else if (previousState.type === 'prd') {
			const currentColumn = this.getCurrentColumn();
			if (currentColumn && currentColumn.hasPRDs()) {
				const targetIndex = Math.min(
					previousState.data,
					currentColumn.prds.length - 1
				);
				currentColumn.setSelectedPRD(targetIndex);
			}

			return {
				success: true,
				type: 'prd',
				currentColumn: this.statusOrder[this.boardLayout.currentColumnIndex],
				selectedPRD: currentColumn ? currentColumn.getSelectedPRD() : null
			};
		}

		return { success: false, reason: 'Unknown navigation type' };
	}

	/**
	 * Reset navigation to initial state
	 */
	reset() {
		const oldColumn = this.getCurrentColumn();
		if (oldColumn) {
			oldColumn.clearSelection();
			oldColumn.setActive(false);
		}

		this.boardLayout.currentColumnIndex = 0;
		this.clearHistory();

		const newColumn = this.getCurrentColumn();
		if (newColumn) {
			newColumn.setActive(true);
			if (newColumn.hasPRDs()) {
				newColumn.setSelectedPRD(0);
			}
		}

		return {
			success: true,
			currentColumn: this.statusOrder[0]
		};
	}

	/**
	 * Get navigation statistics
	 */
	getNavigationStats() {
		const currentColumn = this.getCurrentColumn();
		const totalColumns = this.statusOrder.length;
		const currentColumnIndex = this.boardLayout.currentColumnIndex;
		const totalPRDsInColumn = currentColumn ? currentColumn.getPRDCount() : 0;
		const selectedPRDIndex = currentColumn
			? currentColumn.selectedPRDIndex
			: -1;

		return {
			totalColumns,
			currentColumnIndex,
			currentColumn: this.statusOrder[currentColumnIndex],
			totalPRDsInColumn,
			selectedPRDIndex,
			hasSelection: selectedPRDIndex >= 0,
			historyLength: this.navigationHistory.length
		};
	}

	/**
	 * Get current position info for status bar
	 */
	getCurrentPositionInfo() {
		const stats = this.getNavigationStats();
		const selectedPRD = this.getSelectedPRD();

		return {
			column: `${stats.currentColumn} (${stats.currentColumnIndex + 1}/${stats.totalColumns})`,
			prd: selectedPRD
				? `${selectedPRD.id} (${stats.selectedPRDIndex + 1}/${stats.totalPRDsInColumn})`
				: 'None',
			hasSelection: stats.hasSelection
		};
	}
}

/**
 * Create a PRD navigation handler instance
 */
export function createPRDNavigationHandler(boardLayout) {
	return new PRDNavigationHandler(boardLayout);
}
