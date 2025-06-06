import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import chalk from 'chalk';
import { findAvailablePort } from '../utils/port-utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Start TaskHero Web Interface
 * @param {Object} options - Configuration options
 * @param {number} options.port - Port to run on (will auto-discover if not specified)
 * @param {boolean} options.dev - Development mode with hot reload
 * @param {boolean} options.noOpen - Don't open browser automatically
 */
export async function startWebInterface(options = {}) {
	console.log(chalk.blue('🚀 Starting TaskHero Web Interface...'));

	// Auto-discover port if not specified (single port for both web and API)
	let port = options.port;

	if (!port) {
		try {
			port = await findAvailablePort(3000);
			console.log(chalk.green(`🔍 Found available port: ${port}`));
		} catch (error) {
			console.log(
				chalk.yellow('⚠️  Could not find available port, using 3000')
			);
			port = 3000;
		}
	}

	const updatedOptions = { ...options, port };
	const isDev = options.dev;

	if (isDev) {
		return startDevelopmentMode(updatedOptions);
	} else {
		return startProductionMode(updatedOptions);
	}
}

/**
 * Start in development mode with hot reload
 */
async function startDevelopmentMode(options) {
	const port = options.port || 3000;

	console.log(chalk.yellow('📦 Development mode: Starting with hot reload...'));
	console.log(chalk.gray('Frontend: http://localhost:5173'));
	console.log(chalk.gray('Backend: http://localhost:3001'));

	const webappPath = path.join(__dirname, '../../kanban-app');

	// Check if kanban-app exists
	try {
		await fs.access(webappPath);
	} catch (error) {
		console.error(chalk.red('❌ Error: kanban-app directory not found'));
		console.error(chalk.gray('Expected location:', webappPath));
		process.exit(1);
	}

	// Install dependencies if needed
	await ensureWebappDependencies(webappPath);

	// Start both frontend and backend
	console.log(chalk.blue('🔄 Starting development servers...'));

	const child = spawn('npm', ['run', 'dev:full'], {
		cwd: webappPath,
		stdio: 'inherit',
		shell: true
	});

	// Open browser after a delay
	if (!options.noOpen) {
		setTimeout(async () => {
			try {
				const open = (await import('open')).default;
				await open('http://localhost:5173');
				console.log(chalk.green('🌐 Browser opened to http://localhost:5173'));
			} catch (error) {
				console.log(
					chalk.yellow('💡 Open your browser to: http://localhost:5173')
				);
			}
		}, 3000);
	}

	// Handle process termination
	process.on('SIGINT', () => {
		console.log(chalk.yellow('\n🛑 Shutting down development servers...'));
		child.kill('SIGINT');
		process.exit(0);
	});

	return child;
}

/**
 * Start in production mode with built app
 */
async function startProductionMode(options) {
	const port = options.port || 3000;

	console.log(chalk.blue('🏭 Production mode: Serving built application...'));

	// Build the webapp if needed
	await buildWebApp();

	// Create Express app
	const app = express();

	// Security and middleware
	app.use(express.json({ limit: '10mb' }));
	app.use(express.urlencoded({ extended: true }));

	// Serve static files from dist
	const distPath = path.join(__dirname, '../../kanban-app/dist');

	try {
		await fs.access(distPath);
		app.use(express.static(distPath));
		console.log(chalk.green('✅ Serving static files from:', distPath));
	} catch (error) {
		console.error(chalk.red('❌ Error: Built webapp not found at:', distPath));
		console.error(
			chalk.yellow('💡 Run "npm run web:build" first or use --dev flag')
		);
		process.exit(1);
	}

	// API routes - integrate with kanban-app API
	try {
		// Mount API routes with port configuration
		const apiMiddleware = await createApiMiddleware(options);
		
		// Mount the entire kanban-app API server at root, since it already has /api routes
		app.use('/', apiMiddleware);

		// Ensure app.locals are properly copied from the integrated API
		if (apiMiddleware.locals) {
			Object.assign(app.locals, apiMiddleware.locals);
		}

		console.log(chalk.green('✅ Using TaskHero API server'));
		console.log(chalk.green('✅ API routes mounted'));
		console.log(chalk.green(`✅ TaskMaster integration: ${app.locals.taskMasterInitialized ? 'Active' : 'Fallback'}`));
	} catch (error) {
		console.error(chalk.red('❌ Error loading API routes:'), error.message);
		console.error(
			chalk.yellow('💡 Make sure kanban-app/server/index.js exists')
		);

		// Fallback API
		app.use('/api', createFallbackApi());
	}

	// Health check endpoint
	app.get('/health', (req, res) => {
		res.json({
			status: 'healthy',
			service: 'TaskHero Web Interface',
			version: process.env.npm_package_version || '0.16.1',
			uptime: process.uptime(),
			timestamp: new Date().toISOString(),
			mode: 'production'
		});
	});

	// SPA fallback - serve index.html for all non-API routes
	app.get('*', (req, res) => {
		res.sendFile(path.join(distPath, 'index.html'));
	});

	// Error handling
	app.use((err, req, res, next) => {
		console.error(chalk.red('Server Error:'), err);
		res.status(500).json({
			error: 'Internal Server Error',
			message:
				process.env.NODE_ENV === 'development'
					? err.message
					: 'Something went wrong'
		});
	});

	// Start server
	const server = app.listen(port, () => {
		console.log(chalk.green('✅ TaskHero Web Interface running!'));
		console.log(chalk.blue(`📊 Kanban Board: http://localhost:${port}`));
		console.log(chalk.blue(`🔌 API: http://localhost:${port}/api`));
		console.log(chalk.blue(`🏥 Health: http://localhost:${port}/health`));
		console.log(chalk.gray(`⏰ Started at: ${new Date().toISOString()}`));

		// Open browser
		if (!options.noOpen) {
			setTimeout(async () => {
				try {
					const open = (await import('open')).default;
					await open(`http://localhost:${port}`);
					console.log(
						chalk.green(`🌐 Browser opened to http://localhost:${port}`)
					);
				} catch (error) {
					console.log(
						chalk.yellow(`💡 Open your browser to: http://localhost:${port}`)
					);
				}
			}, 1000);
		}
	});

	// Handle graceful shutdown
	process.on('SIGINT', () => {
		console.log(chalk.yellow('\n🛑 Shutting down server...'));
		server.close(() => {
			console.log(chalk.green('✅ Server shut down gracefully'));
			process.exit(0);
		});
	});

	return server;
}

/**
 * Build the webapp if needed
 */
async function buildWebApp() {
	const webappPath = path.join(__dirname, '../../kanban-app');
	const distPath = path.join(webappPath, 'dist');

	try {
		// Check if dist exists and is recent
		const distStats = await fs.stat(distPath);
		const packageStats = await fs.stat(path.join(webappPath, 'package.json'));

		// If dist is newer than package.json, assume it's up to date
		if (distStats.mtime > packageStats.mtime) {
			console.log(chalk.green('✅ Using existing build'));
			return;
		}
	} catch (error) {
		// dist doesn't exist, need to build
	}

	console.log(chalk.blue('🔨 Building webapp...'));

	// Ensure dependencies are installed
	await ensureWebappDependencies(webappPath);

	// Build the app
	const buildProcess = spawn('npm', ['run', 'build'], {
		cwd: webappPath,
		stdio: 'inherit',
		shell: true
	});

	return new Promise((resolve, reject) => {
		buildProcess.on('close', (code) => {
			if (code === 0) {
				console.log(chalk.green('✅ Webapp built successfully'));
				resolve();
			} else {
				console.error(chalk.red('❌ Build failed with code:', code));
				reject(new Error(`Build failed with code ${code}`));
			}
		});
	});
}

/**
 * Ensure webapp dependencies are installed
 */
async function ensureWebappDependencies(webappPath) {
	const nodeModulesPath = path.join(webappPath, 'node_modules');

	try {
		await fs.access(nodeModulesPath);
		console.log(chalk.green('✅ Webapp dependencies found'));
	} catch (error) {
		console.log(chalk.blue('📦 Installing webapp dependencies...'));

		const installProcess = spawn('npm', ['install'], {
			cwd: webappPath,
			stdio: 'inherit',
			shell: true
		});

		return new Promise((resolve, reject) => {
			installProcess.on('close', (code) => {
				if (code === 0) {
					console.log(chalk.green('✅ Dependencies installed'));
					resolve();
				} else {
					console.error(chalk.red('❌ Failed to install dependencies'));
					reject(new Error(`npm install failed with code ${code}`));
				}
			});
		});
	}
}

/**
 * Create API middleware that integrates with kanban-app API
 */
async function createApiMiddleware(options = {}) {
	try {
		// Always use integrated mode to avoid duplicate servers
		// Import the existing API server from kanban-app
		const serverPath = path.join(
			__dirname,
			'../../kanban-app/src/api/server.js'
		);

		// Check if the server file exists
		await fs.access(serverPath);

		// Import the API functions but prevent auto-startup
		process.env.SKIP_API_STARTUP = 'true';
		const apiModule = await import('../../kanban-app/src/api/server.js');

		// If the module exports an Express app, use its routes
		if (apiModule.default && typeof apiModule.default.use === 'function') {
			const apiApp = apiModule.default;
			
			// Since we're in integrated mode, we need to manually trigger the initialization
			// that would normally happen during server startup
			try {
				console.log(chalk.blue('🔧 Initializing TaskMaster core for integrated mode...'));
				
				// Call the initialization function directly from the kanban-app server
				// We need to simulate what happens in the startServer function
				const {
					directFunctions,
					listTasksDirect,
					showTaskDirect,
					nextTaskDirect,
					setTaskStatusDirect
				} = await import('../../mcp-server/src/core/task-master-core.js');
				const { findTasksJsonPath } = await import('../../mcp-server/src/core/utils/path-utils.js');
				
				// Create a simple logger for the initialization
				const logger = {
					info: (msg) => console.log(chalk.gray(`   ${msg}`)),
					warn: (msg) => console.log(chalk.yellow(`   ${msg}`)),
					error: (msg) => console.log(chalk.red(`   ${msg}`))
				};
				
				// Resolve project root (similar to what the kanban-app server does)
				const projectRoot = process.cwd();
				const tasksJsonPath = findTasksJsonPath({ projectRoot }, logger);
				
				// Test core functionality by listing tasks
				const testResult = await listTasksDirect({ tasksJsonPath }, logger);
				
				if (testResult.success) {
					// Set the app.locals properly
					apiApp.locals.taskMasterInitialized = true;
					apiApp.locals.projectRoot = projectRoot;
					apiApp.locals.tasksJsonPath = tasksJsonPath;
					
					console.log(chalk.green('✅ TaskMaster core initialized for integrated mode'));
					console.log(chalk.gray(`   Project root: ${projectRoot}`));
					console.log(chalk.gray(`   Tasks file: ${tasksJsonPath}`));
				} else {
					throw new Error(`Core function test failed: ${testResult.error?.message}`);
				}
			} catch (initError) {
				console.log(chalk.yellow('⚠️  TaskMaster core initialization failed, using fallback mode'));
				console.log(chalk.gray(`   Error: ${initError.message}`));
				
				// Set fallback state
				apiApp.locals.taskMasterInitialized = false;
				apiApp.locals.projectRoot = process.cwd();
				apiApp.locals.tasksJsonPath = path.join(process.cwd(), '.taskmaster/tasks/tasks.json');
			}
			
			console.log(chalk.green('✅ Using integrated TaskHero API server'));
			console.log(chalk.gray(`   TaskMaster initialized: ${apiApp.locals?.taskMasterInitialized || false}`));
			
			return apiApp;
		}

		// Otherwise, create routes manually using the existing server logic
		console.log(
			chalk.yellow(
				'⚠️  TaskHero server found but not compatible, using fallback'
			)
		);
		return createTaskHeroApiRoutes();
	} catch (error) {
		console.error(chalk.yellow('⚠️  Using fallback API implementation:'), error.message);
		return createTaskHeroApiRoutes();
	}
}

/**
 * Create TaskHero API routes that integrate with core functionality
 */
function createTaskHeroApiRoutes() {
	const router = express.Router();

	// Add CORS and security middleware
	router.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
		res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
		next();
	});

	// API info endpoint
	router.get('/', (req, res) => {
		res.json({
			message: 'TaskHero Web API',
			version: '1.0.0',
			integration: 'TaskHero Core',
			timestamp: new Date().toISOString(),
			endpoints: [
				'GET /api/tasks - Get all TaskHero tasks',
				'GET /api/tasks/:id - Get TaskHero task by ID',
				'PUT /api/tasks/:id/status - Update task status',
				'GET /api/taskhero/info - Get TaskHero project info'
			]
		});
	});

	// Tasks endpoints - these will integrate with TaskHero core
	router.get('/tasks', async (req, res) => {
		try {
			const tasksData = await readTaskHeroTasks();
			const tasks = tasksData.tasks || [];

			res.json({
				success: true,
				data: tasks,
				count: tasks.length,
				source: 'TaskHero Core',
				timestamp: new Date().toISOString()
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: 'Failed to fetch TaskHero tasks',
				message: error.message,
				timestamp: new Date().toISOString()
			});
		}
	});

	// Add v1 API routes for kanban-app compatibility
	router.get('/v1/tasks', async (req, res) => {
		try {
			const tasksData = await readTaskHeroTasks();
			const tasks = tasksData.tasks || [];

			res.json({
				success: true,
				data: {
					tasks: tasks,
					summary: {
						totalTasks: tasks.length,
						statusBreakdown: tasks.reduce((acc, task) => {
							acc[task.status] = (acc[task.status] || 0) + 1;
							return acc;
						}, {})
					}
				},
				source: 'TaskHero Core',
				timestamp: new Date().toISOString()
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: 'Failed to fetch TaskHero tasks',
				message: error.message,
				timestamp: new Date().toISOString()
			});
		}
	});

	router.get('/tasks/:id', async (req, res) => {
		try {
			const { id } = req.params;
			const tasksData = await readTaskHeroTasks();
			const tasks = tasksData.tasks || [];
			const task = tasks.find((t) => t.id === id);

			if (!task) {
				return res.status(404).json({
					success: false,
					error: 'Task not found',
					message: `TaskHero task with ID ${id} does not exist`,
					timestamp: new Date().toISOString()
				});
			}

			res.json({
				success: true,
				data: task,
				source: 'TaskHero Core',
				timestamp: new Date().toISOString()
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: 'Failed to fetch TaskHero task',
				message: error.message,
				timestamp: new Date().toISOString()
			});
		}
	});

	router.put('/tasks/:id/status', async (req, res) => {
		try {
			const { id } = req.params;
			const { status } = req.body;

			if (!status) {
				return res.status(400).json({
					success: false,
					error: 'Validation error',
					message: 'Status is required',
					timestamp: new Date().toISOString()
				});
			}

			const tasksData = await readTaskHeroTasks();
			const tasks = tasksData.tasks || [];
			const taskIndex = tasks.findIndex((t) => t.id === id);

			if (taskIndex === -1) {
				return res.status(404).json({
					success: false,
					error: 'Task not found',
					message: `TaskHero task with ID ${id} does not exist`,
					timestamp: new Date().toISOString()
				});
			}

			// Update task status
			tasks[taskIndex].status = status;
			tasks[taskIndex].updatedAt = new Date().toISOString();

			// Write back to TaskHero
			const writeSuccess = await writeTaskHeroTasks({ ...tasksData, tasks });

			if (!writeSuccess) {
				return res.status(500).json({
					success: false,
					error: 'Failed to update TaskHero task',
					message: 'Could not write to TaskHero tasks file',
					timestamp: new Date().toISOString()
				});
			}

			res.json({
				success: true,
				data: tasks[taskIndex],
				message: 'TaskHero task status updated successfully',
				source: 'TaskHero Core',
				timestamp: new Date().toISOString()
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: 'Failed to update TaskHero task status',
				message: error.message,
				timestamp: new Date().toISOString()
			});
		}
	});

	// Add v1 API status update endpoint for kanban-app compatibility
	router.patch('/v1/tasks/:id/status', async (req, res) => {
		try {
			const { id } = req.params;
			const { status } = req.body;

			if (!status) {
				return res.status(400).json({
					success: false,
					error: 'Validation error',
					message: 'Status is required',
					timestamp: new Date().toISOString()
				});
			}

			const tasksData = await readTaskHeroTasks();
			const tasks = tasksData.tasks || [];
			const taskIndex = tasks.findIndex((t) => t.id === id);

			if (taskIndex === -1) {
				return res.status(404).json({
					success: false,
					error: 'Task not found',
					message: `TaskHero task with ID ${id} does not exist`,
					timestamp: new Date().toISOString()
				});
			}

			// Update task status
			tasks[taskIndex].status = status;
			tasks[taskIndex].updatedAt = new Date().toISOString();

			// Write back to TaskHero
			const writeSuccess = await writeTaskHeroTasks({ ...tasksData, tasks });

			if (!writeSuccess) {
				return res.status(500).json({
					success: false,
					error: 'Failed to update TaskHero task',
					message: 'Could not write to TaskHero tasks file',
					timestamp: new Date().toISOString()
				});
			}

			res.json({
				success: true,
				data: tasks[taskIndex],
				message: 'TaskHero task status updated successfully',
				source: 'TaskHero Core',
				timestamp: new Date().toISOString()
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: 'Failed to update TaskHero task status',
				message: error.message,
				timestamp: new Date().toISOString()
			});
		}
	});

	// TaskHero project info
	router.get('/taskhero/info', async (req, res) => {
		try {
			const tasksData = await readTaskHeroTasks();
			const tasks = tasksData.tasks || [];

			// Calculate statistics
			const statusCounts = tasks.reduce((acc, task) => {
				acc[task.status] = (acc[task.status] || 0) + 1;
				return acc;
			}, {});

			const priorityCounts = tasks.reduce((acc, task) => {
				acc[task.priority] = (acc[task.priority] || 0) + 1;
				return acc;
			}, {});

			res.json({
				success: true,
				data: {
					totalTasks: tasks.length,
					statusBreakdown: statusCounts,
					priorityBreakdown: priorityCounts,
					lastUpdated: tasksData.lastUpdated || null,
					projectName: tasksData.projectName || 'TaskHero Project'
				},
				source: 'TaskHero Core',
				timestamp: new Date().toISOString()
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				error: 'Failed to fetch TaskHero project info',
				message: error.message,
				timestamp: new Date().toISOString()
			});
		}
	});

	return router;
}

/**
 * Create fallback API for when kanban-app server is not available
 */
function createFallbackApi() {
	const router = express.Router();

	router.get('/', (req, res) => {
		res.json({
			message: 'TaskHero Fallback API',
			status: 'limited',
			note: 'Full API not available - using fallback implementation'
		});
	});

	return router;
}

/**
 * Helper function to read TaskHero tasks
 */
async function readTaskHeroTasks() {
	try {
		const tasksPath = path.join(process.cwd(), '.taskmaster/tasks/tasks.json');
		const data = await fs.readFile(tasksPath, 'utf8');
		return JSON.parse(data);
	} catch (error) {
		console.error('Error reading TaskHero tasks:', error);
		return { tasks: [] };
	}
}

/**
 * Helper function to write TaskHero tasks
 */
async function writeTaskHeroTasks(tasksData) {
	try {
		const tasksPath = path.join(process.cwd(), '.taskmaster/tasks/tasks.json');
		await fs.writeFile(tasksPath, JSON.stringify(tasksData, null, 2));
		return true;
	} catch (error) {
		console.error('Error writing TaskHero tasks:', error);
		return false;
	}
}
