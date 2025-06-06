import net from 'net';

/**
 * Check if a port is available
 * @param {number} port - Port to check
 * @returns {Promise<boolean>} - True if port is available
 */
function isPortAvailable(port) {
	return new Promise((resolve) => {
		const server = net.createServer();

		server.listen(port, () => {
			server.close(() => {
				resolve(true);
			});
		});

		server.on('error', () => {
			resolve(false);
		});
	});
}

/**
 * Find an available port starting from a given port
 * @param {number} startPort - Starting port to check
 * @param {number} maxAttempts - Maximum number of ports to try (default: 100)
 * @returns {Promise<number>} - Available port number
 */
async function findAvailablePort(startPort, maxAttempts = 100) {
	for (let i = 0; i < maxAttempts; i++) {
		const port = startPort + i;
		const available = await isPortAvailable(port);
		if (available) {
			return port;
		}
	}
	throw new Error(
		`No available port found starting from ${startPort} (tried ${maxAttempts} ports)`
	);
}

/**
 * Find two consecutive available ports (useful for API + Web server)
 * @param {number} startPort - Starting port to check
 * @param {number} maxAttempts - Maximum number of port pairs to try (default: 50)
 * @returns {Promise<{apiPort: number, webPort: number}>} - Two consecutive available ports
 */
async function findConsecutiveAvailablePorts(startPort, maxAttempts = 50) {
	for (let i = 0; i < maxAttempts; i++) {
		const apiPort = startPort + i * 2;
		const webPort = apiPort + 1;

		const apiAvailable = await isPortAvailable(apiPort);
		const webAvailable = await isPortAvailable(webPort);

		if (apiAvailable && webAvailable) {
			return { apiPort, webPort };
		}
	}
	throw new Error(
		`No consecutive available ports found starting from ${startPort} (tried ${maxAttempts} pairs)`
	);
}

/**
 * Find the next available port set for TaskHero (API on even port, Web on next odd port)
 * Default strategy: API on 3002, 3004, 3006, etc. Web on 3003, 3005, 3007, etc.
 * @param {number} basePort - Base port to start from (default: 3000)
 * @returns {Promise<{apiPort: number, webPort: number}>} - Available port pair
 */
async function findTaskHeroPortSet(basePort = 3000) {
	// Start from the next even port if basePort is odd
	const startApiPort = basePort % 2 === 0 ? basePort + 2 : basePort + 1;

	for (let i = 0; i < 50; i++) {
		const apiPort = startApiPort + i * 2;
		const webPort = apiPort + 1;

		const apiAvailable = await isPortAvailable(apiPort);
		const webAvailable = await isPortAvailable(webPort);

		if (apiAvailable && webAvailable) {
			return { apiPort, webPort };
		}
	}

	throw new Error(
		`No available TaskHero port set found starting from ${basePort}`
	);
}

/**
 * Get the default port configuration for TaskHero
 * @returns {Promise<{apiPort: number, webPort: number}>} - Default or next available ports
 */
async function getTaskHeroDefaultPorts() {
	// Try the default ports first
	const defaultApiPort = 3003;
	const defaultWebPort = 3000;

	const apiAvailable = await isPortAvailable(defaultApiPort);
	const webAvailable = await isPortAvailable(defaultWebPort);

	if (apiAvailable && webAvailable) {
		return { apiPort: defaultApiPort, webPort: defaultWebPort };
	}

	// If defaults are not available, find the next available set
	return await findTaskHeroPortSet(3000);
}

export {
	isPortAvailable,
	findAvailablePort,
	findConsecutiveAvailablePorts,
	findTaskHeroPortSet,
	getTaskHeroDefaultPorts
};
