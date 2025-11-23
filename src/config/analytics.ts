/**
 * Analytics and monitoring configuration
 * Centralized settings for error tracking, performance monitoring, and rate limiting
 */

export const analyticsConfig = {
  // Error monitoring
  errorTracking: {
    enabled: true,
    sampleRate: 1.0, // 100% sampling in development/staging
    ignoredErrors: [
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',
      'Network request failed', // Common network errors
    ],
    maxStackTraceLength: 10,
    maxBreadcrumbs: 30,
    environment: process.env.NODE_ENV || 'development',
  },

  // Performance monitoring
  performance: {
    enabled: true,
    sampleRate: 0.1, // 10% sampling to reduce overhead
    slowQueryThreshold: 1000, // 1 second
    slowRequestThreshold: 2000, // 2 seconds
    memoryUsageTracking: true,
    trackingIntervalMs: 60000, // 1 minute
  },

  // Rate limiting
  rateLimiting: {
    enabled: true,
    storage: 'memory', // 'memory' | 'redis'
    keyPrefix: 'rl:',
    
    // Default configurations
    defaults: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },

    // Endpoint-specific configurations
    endpoints: {
      '/api/auth/*': {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 5,
      },
      '/api/search/*': {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 10,
      },
      '/api/analytics/*': {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 20,
      },
      '/api/monitoring/*': {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 30,
      },
    },
  },

  // Event tracking
  events: {
    enabled: true,
    bufferSize: 100, // Batch events before writing
    flushInterval: 5000, // 5 seconds
    
    // Event categories to track
    categories: {
      user: true,      // User actions (login, signup, etc.)
      document: true,  // Document operations (create, update, view)
      search: true,    // Search queries and results
      api: true,       // API requests and responses  
      error: true,     // Error events
      performance: true, // Performance metrics
      security: true,  // Security events (rate limiting, unauthorized access)
    },
  },

  // Dashboard and reporting
  dashboard: {
    enabled: true,
    refreshInterval: 30000, // 30 seconds
    
    // Data retention periods
    retention: {
      errors: 30, // days
      performance: 7, // days
      events: 90, // days
      logs: 7, // days
    },

    // Alert thresholds
    alerts: {
      errorRate: 5, // percentage
      responseTime: 2000, // milliseconds
      memoryUsage: 80, // percentage
      diskUsage: 85, // percentage
    },
  },

  // Privacy and compliance
  privacy: {
    // PII scrubbing patterns
    scrubPatterns: [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, // Credit card
      /\b\d{3}-\d{3}-\d{4}\b/g, // Phone number
    ],
    
    // Fields to always exclude
    excludeFields: [
      'password',
      'token', 
      'secret',
      'key',
      'authorization',
      'cookie',
    ],

    // Enable data anonymization
    anonymizeIPs: true,
    saltKey: process.env.ANALYTICS_SALT || 'default-salt-key',
  },
};

/**
 * Get analytics configuration based on environment
 */
export function getAnalyticsConfig() {
  const config = { ...analyticsConfig };

  // Adjust for production
  if (process.env.NODE_ENV === 'production') {
    // Reduce performance sampling in production
    config.performance.sampleRate = 0.01; // 1%
    
    // Enable more aggressive rate limiting
    config.rateLimiting.defaults.maxRequests = 50;
    
    // Shorter retention in production (cost optimization)
    config.dashboard.retention.performance = 3; // days
    config.dashboard.retention.logs = 3; // days
  }

  // Adjust for testing
  if (process.env.NODE_ENV === 'test') {
    // Disable most analytics in tests
    config.errorTracking.enabled = false;
    config.performance.enabled = false;
    config.events.enabled = false;
  }

  return config;
}

/**
 * Check if specific analytics feature is enabled
 */
export function isAnalyticsEnabled(feature: keyof typeof analyticsConfig): boolean {
  const config = getAnalyticsConfig();
  return (config[feature] as any)?.enabled ?? false;
}

/**
 * Get rate limit configuration for specific endpoint
 */
export function getRateLimitConfig(endpoint: string) {
  const config = getAnalyticsConfig();
  
  // Find matching endpoint pattern
  for (const [pattern, endpointConfig] of Object.entries(config.rateLimiting.endpoints)) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    if (regex.test(endpoint)) {
      return {
        ...config.rateLimiting.defaults,
        ...endpointConfig,
      };
    }
  }
  
  return config.rateLimiting.defaults;
}

/**
 * Scrub sensitive data from objects
 */
export function scrubSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(scrubSensitiveData);
  }

  const config = getAnalyticsConfig();
  const scrubbed = { ...data };

  // Remove excluded fields
  for (const field of config.privacy.excludeFields) {
    if (field in scrubbed) {
      scrubbed[field] = '[REDACTED]';
    }
  }

  // Apply scrubbing patterns to string values
  for (const [key, value] of Object.entries(scrubbed)) {
    if (typeof value === 'string') {
      let scrubbedValue = value;
      for (const pattern of config.privacy.scrubPatterns) {
        scrubbedValue = scrubbedValue.replace(pattern, '[REDACTED]');
      }
      scrubbed[key] = scrubbedValue;
    } else if (typeof value === 'object') {
      scrubbed[key] = scrubSensitiveData(value);
    }
  }

  return scrubbed;
}

export type AnalyticsConfig = typeof analyticsConfig;
