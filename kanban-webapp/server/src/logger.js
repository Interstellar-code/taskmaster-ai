/**
 * logger.js
 * Logger utility for the API server, following MCP server pattern
 */

/**
 * Creates a logger instance with consistent formatting
 * @param {string} [prefix='API'] - Prefix for log messages
 * @returns {Object} Logger object with info, warn, error, debug methods
 */
export function createLogger(prefix = 'API') {
	const timestamp = () => new Date().toISOString();
	
	return {
		info: (message, ...args) => {
			console.log(`[${timestamp()}] [${prefix}] INFO: ${message}`, ...args);
		},
		warn: (message, ...args) => {
			console.warn(`[${timestamp()}] [${prefix}] WARN: ${message}`, ...args);
		},
		error: (message, ...args) => {
			console.error(`[${timestamp()}] [${prefix}] ERROR: ${message}`, ...args);
		},
		debug: (message, ...args) => {
			if (process.env.NODE_ENV === 'development') {
				console.log(`[${timestamp()}] [${prefix}] DEBUG: ${message}`, ...args);
			}
		}
	};
}

/**
 * Default logger instance
 */
export const logger = createLogger('TaskMaster-API');

export default logger;
