/**
 * Board Controls Handler for Kanban Board
 * Manages board-level controls like filtering, search, focus cycling, etc.
 */

import chalk from 'chalk';

/**
 * BoardControlsHandler class for managing board controls
 */
export class BoardControlsHandler {
	constructor(kanbanBoard) {
		this.kanbanBoard = kanbanBoard;
		this.filters = {
			status: null,
			priority: null,
			prdSource: null,
			hasSubtasks: null,
			hasDependencies: null
		};
		this.searchQuery = '';
		this.isFilterMode = false;
		this.isSearchMode = false;
		this.focusMode = 'board'; // 'board', 'details', 'help'
		this.originalTasks = [];
	}

	/**
	 * Toggle filter mode (F key)
	 */
	toggleFilter() {
		this.isFilterMode = !this.isFilterMode;

		if (this.isFilterMode) {
			this.showFilterMenu();
		} else {
			this.clearAllFilters();
		}

		return {
			success: true,
			filterMode: this.isFilterMode,
			message: this.isFilterMode
				? 'Filter mode enabled'
				: 'Filter mode disabled'
		};
	}

	/**
	 * Show filter menu
	 */
	showFilterMenu() {
		console.clear();
		console.log(chalk.blue.bold('\n╭─── Filter Options ───╮'));
		console.log(chalk.blue('│ 1. Filter by Status   │'));
		console.log(chalk.blue('│ 2. Filter by Priority │'));
		console.log(chalk.blue('│ 3. Filter by PRD       │'));
		console.log(chalk.blue('│ 4. Has Subtasks        │'));
		console.log(chalk.blue('│ 5. Has Dependencies    │'));
		console.log(chalk.blue('│ C. Clear All Filters   │'));
		console.log(chalk.blue('│ ESC. Exit Filter Mode  │'));
		console.log(chalk.blue('╰───────────────────────╯'));

		console.log(chalk.white('\nCurrent Filters:'));
		this.displayCurrentFilters();

		console.log(chalk.dim('\nPress a number to set filter, or ESC to exit...'));

		setTimeout(() => {
			this.kanbanBoard.render();
		}, 5000);
	}

	/**
	 * Display current active filters
	 */
	displayCurrentFilters() {
		const activeFilters = [];

		if (this.filters.status) {
			activeFilters.push(`Status: ${this.filters.status}`);
		}
		if (this.filters.priority) {
			activeFilters.push(`Priority: ${this.filters.priority}`);
		}
		if (this.filters.prdSource !== null) {
			activeFilters.push(`PRD: ${this.filters.prdSource ? 'Yes' : 'No'}`);
		}
		if (this.filters.hasSubtasks !== null) {
			activeFilters.push(
				`Subtasks: ${this.filters.hasSubtasks ? 'Yes' : 'No'}`
			);
		}
		if (this.filters.hasDependencies !== null) {
			activeFilters.push(
				`Dependencies: ${this.filters.hasDependencies ? 'Yes' : 'No'}`
			);
		}

		if (activeFilters.length === 0) {
			console.log(chalk.gray('  No active filters'));
		} else {
			activeFilters.forEach((filter) => {
				console.log(chalk.yellow(`  • ${filter}`));
			});
		}
	}

	/**
	 * Apply status filter
	 * @param {string} status - Status to filter by
	 */
	applyStatusFilter(status) {
		this.filters.status = status;
		this.applyFilters();

		return {
			success: true,
			filter: 'status',
			value: status,
			message: `Filtered by status: ${status}`
		};
	}

	/**
	 * Apply priority filter
	 * @param {string} priority - Priority to filter by
	 */
	applyPriorityFilter(priority) {
		this.filters.priority = priority;
		this.applyFilters();

		return {
			success: true,
			filter: 'priority',
			value: priority,
			message: `Filtered by priority: ${priority}`
		};
	}

	/**
	 * Apply PRD source filter
	 * @param {boolean} hasPrd - Whether to show tasks with PRD source
	 */
	applyPrdFilter(hasPrd) {
		this.filters.prdSource = hasPrd;
		this.applyFilters();

		return {
			success: true,
			filter: 'prdSource',
			value: hasPrd,
			message: `Filtered by PRD source: ${hasPrd ? 'Yes' : 'No'}`
		};
	}

	/**
	 * Apply subtasks filter
	 * @param {boolean} hasSubtasks - Whether to show tasks with subtasks
	 */
	applySubtasksFilter(hasSubtasks) {
		this.filters.hasSubtasks = hasSubtasks;
		this.applyFilters();

		return {
			success: true,
			filter: 'hasSubtasks',
			value: hasSubtasks,
			message: `Filtered by subtasks: ${hasSubtasks ? 'Yes' : 'No'}`
		};
	}

	/**
	 * Apply dependencies filter
	 * @param {boolean} hasDependencies - Whether to show tasks with dependencies
	 */
	applyDependenciesFilter(hasDependencies) {
		this.filters.hasDependencies = hasDependencies;
		this.applyFilters();

		return {
			success: true,
			filter: 'hasDependencies',
			value: hasDependencies,
			message: `Filtered by dependencies: ${hasDependencies ? 'Yes' : 'No'}`
		};
	}

	/**
	 * Apply all active filters to tasks
	 */
	applyFilters() {
		if (this.originalTasks.length === 0) {
			this.originalTasks = [...this.kanbanBoard.tasks];
		}

		let filteredTasks = [...this.originalTasks];

		// Apply status filter
		if (this.filters.status) {
			filteredTasks = filteredTasks.filter(
				(task) => task.status === this.filters.status
			);
		}

		// Apply priority filter
		if (this.filters.priority) {
			filteredTasks = filteredTasks.filter(
				(task) => task.priority === this.filters.priority
			);
		}

		// Apply PRD source filter
		if (this.filters.prdSource !== null) {
			filteredTasks = filteredTasks.filter((task) =>
				this.filters.prdSource ? !!task.prdSource : !task.prdSource
			);
		}

		// Apply subtasks filter
		if (this.filters.hasSubtasks !== null) {
			filteredTasks = filteredTasks.filter((task) =>
				this.filters.hasSubtasks
					? task.subtasks && task.subtasks.length > 0
					: !task.subtasks || task.subtasks.length === 0
			);
		}

		// Apply dependencies filter
		if (this.filters.hasDependencies !== null) {
			filteredTasks = filteredTasks.filter((task) =>
				this.filters.hasDependencies
					? task.dependencies && task.dependencies.length > 0
					: !task.dependencies || task.dependencies.length === 0
			);
		}

		// Apply search query if active
		if (this.searchQuery) {
			const query = this.searchQuery.toLowerCase();
			filteredTasks = filteredTasks.filter(
				(task) =>
					task.title.toLowerCase().includes(query) ||
					(task.description &&
						task.description.toLowerCase().includes(query)) ||
					task.id.toString().includes(query)
			);
		}

		// Update board with filtered tasks
		this.kanbanBoard.tasks = filteredTasks;
		this.kanbanBoard.boardLayout.loadTasks(filteredTasks);
	}

	/**
	 * Clear all filters
	 */
	clearAllFilters() {
		this.filters = {
			status: null,
			priority: null,
			prdSource: null,
			hasSubtasks: null,
			hasDependencies: null
		};

		this.searchQuery = '';

		// Restore original tasks
		if (this.originalTasks.length > 0) {
			this.kanbanBoard.tasks = [...this.originalTasks];
			this.kanbanBoard.boardLayout.loadTasks(this.kanbanBoard.tasks);
			this.originalTasks = [];
		}

		return {
			success: true,
			message: 'All filters cleared'
		};
	}

	/**
	 * Open search mode (/ key)
	 */
	async openSearch() {
		this.isSearchMode = true;

		console.clear();
		console.log(chalk.blue.bold('\n╭─── Search Tasks ───╮'));
		console.log(chalk.blue('│ Enter search query: │'));
		console.log(chalk.blue('╰────────────────────╯'));

		if (this.searchQuery) {
			console.log(chalk.white(`Current query: "${this.searchQuery}"`));
		}

		console.log(
			chalk.dim('\nType to search, Enter to apply, ESC to cancel...')
		);

		try {
			const query = await this.getSearchInput();
			if (query !== null) {
				this.setSearchQuery(query);
				console.log(chalk.green(`\n✓ Search applied: "${query}"`));
			} else {
				console.log(chalk.yellow('\n✗ Search cancelled'));
			}
		} catch (error) {
			console.log(chalk.red(`\n✗ Search error: ${error.message}`));
		}

		this.isSearchMode = false;

		setTimeout(() => {
			this.kanbanBoard.render();
		}, 1000);

		return {
			success: true,
			searchMode: false,
			message: 'Search completed'
		};
	}

	/**
	 * Get search input from user
	 */
	async getSearchInput() {
		return new Promise((resolve) => {
			const stdin = process.stdin;
			stdin.setRawMode(true);
			stdin.resume();
			stdin.setEncoding('utf8');

			let input = '';

			const cleanup = () => {
				stdin.setRawMode(false);
				stdin.pause();
				stdin.removeListener('data', onData);
			};

			const onData = (key) => {
				if (key === '\u0003' || key === '\u001b') {
					// Ctrl+C or Escape
					cleanup();
					resolve(null);
				} else if (key === '\r' || key === '\n') {
					// Enter
					cleanup();
					resolve(input.trim());
				} else if (key === '\u0008' || key === '\u007f') {
					// Backspace
					if (input.length > 0) {
						input = input.slice(0, -1);
						process.stdout.write('\b \b');
					}
				} else if (key.length === 1 && key >= ' ') {
					// Printable character
					input += key;
					process.stdout.write(key);
				}
			};

			stdin.on('data', onData);
			process.stdout.write('\n> ');
		});
	}

	/**
	 * Set search query
	 * @param {string} query - Search query
	 */
	setSearchQuery(query) {
		this.searchQuery = query.trim();
		this.applyFilters();

		return {
			success: true,
			query: this.searchQuery,
			message: this.searchQuery
				? `Searching for: "${this.searchQuery}"`
				: 'Search cleared'
		};
	}

	/**
	 * Cycle focus between different board areas (Tab key)
	 */
	cycleFocus() {
		const focusModes = ['board', 'details', 'help'];
		const currentIndex = focusModes.indexOf(this.focusMode);
		const nextIndex = (currentIndex + 1) % focusModes.length;
		this.focusMode = focusModes[nextIndex];

		console.log(chalk.cyan(`Focus: ${this.focusMode.toUpperCase()}`));

		setTimeout(() => {
			this.kanbanBoard.render();
		}, 1000);

		return {
			success: true,
			focusMode: this.focusMode,
			message: `Focus switched to: ${this.focusMode}`
		};
	}

	/**
	 * Get current board state
	 */
	getBoardState() {
		return {
			isFilterMode: this.isFilterMode,
			isSearchMode: this.isSearchMode,
			focusMode: this.focusMode,
			activeFilters: this.getActiveFilters(),
			searchQuery: this.searchQuery,
			filteredTaskCount: this.kanbanBoard.tasks.length,
			originalTaskCount:
				this.originalTasks.length || this.kanbanBoard.tasks.length
		};
	}

	/**
	 * Get active filters
	 */
	getActiveFilters() {
		const active = {};

		Object.keys(this.filters).forEach((key) => {
			if (this.filters[key] !== null) {
				active[key] = this.filters[key];
			}
		});

		return active;
	}

	/**
	 * Reset board controls to default state
	 */
	reset() {
		this.isFilterMode = false;
		this.isSearchMode = false;
		this.focusMode = 'board';
		this.clearAllFilters();

		return {
			success: true,
			message: 'Board controls reset to default'
		};
	}
}

/**
 * Create a board controls handler instance
 */
export function createBoardControlsHandler(kanbanBoard) {
	return new BoardControlsHandler(kanbanBoard);
}
