/**
 * CORS configuration for TaskHero API
 */

/**
 * CORS configuration options
 */
export const corsConfig = {
  // Allow requests from these origins
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',    // React development server
      'http://localhost:3001',    // API server
      'http://localhost:5173',    // Vite development server
      'http://localhost:8080',    // Alternative development server
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080'
    ];
    
    // Allow localhost with any port for development
    if (origin.match(/^http:\/\/localhost:\d+$/) || 
        origin.match(/^http:\/\/127\.0\.0\.1:\d+$/)) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Reject origin
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  
  // Allow these HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allow these headers
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Project-Root',
    'X-Correlation-ID',
    'X-API-Key'
  ],
  
  // Expose these headers to the client
  exposedHeaders: [
    'X-Correlation-ID',
    'X-Response-Time',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ],
  
  // Allow credentials (cookies, authorization headers)
  credentials: true,
  
  // Cache preflight response for 24 hours
  maxAge: 86400,
  
  // Handle preflight requests
  preflightContinue: false,
  
  // Provide a status code to use for successful OPTIONS requests
  optionsSuccessStatus: 204
};

/**
 * Custom CORS middleware for specific routes
 */
export function customCors(options = {}) {
  const config = { ...corsConfig, ...options };
  
  return (req, res, next) => {
    // Set CORS headers
    const origin = req.headers.origin;
    
    if (config.origin) {
      if (typeof config.origin === 'function') {
        config.origin(origin, (err, allowed) => {
          if (err) {
            return next(err);
          }
          if (allowed) {
            res.setHeader('Access-Control-Allow-Origin', origin || '*');
          }
        });
      } else if (config.origin === true) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
      } else if (typeof config.origin === 'string') {
        res.setHeader('Access-Control-Allow-Origin', config.origin);
      } else if (Array.isArray(config.origin)) {
        if (config.origin.includes(origin)) {
          res.setHeader('Access-Control-Allow-Origin', origin);
        }
      }
    }
    
    if (config.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    
    if (config.exposedHeaders && config.exposedHeaders.length > 0) {
      res.setHeader('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
    }
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      if (config.methods && config.methods.length > 0) {
        res.setHeader('Access-Control-Allow-Methods', config.methods.join(', '));
      }
      
      if (config.allowedHeaders && config.allowedHeaders.length > 0) {
        res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
      }
      
      if (config.maxAge) {
        res.setHeader('Access-Control-Max-Age', config.maxAge.toString());
      }
      
      return res.status(config.optionsSuccessStatus || 204).end();
    }
    
    next();
  };
}

/**
 * CORS configuration for WebSocket connections
 */
export const websocketCorsConfig = {
  origin: function (origin) {
    // Allow requests with no origin
    if (!origin) return true;
    
    // Allow localhost with any port for development
    if (origin.match(/^http:\/\/localhost:\d+$/) || 
        origin.match(/^http:\/\/127\.0\.0\.1:\d+$/)) {
      return true;
    }
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173'
    ];
    
    return allowedOrigins.includes(origin);
  }
};
