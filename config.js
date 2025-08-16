// Configuration file for Weather Dashboard
const config = {
    // Server configuration
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    
    // API configuration
    openWeatherApiKey: process.env.OPENWEATHER_API_KEY || '00abf2e7b7fbf40d903afbe8043c29b7',
    openWeatherBaseUrl: 'https://api.openweathermap.org/data/2.5',
    openWeatherGeoUrl: 'https://api.openweathermap.org/geo/1.0',
    
    // Rate limiting
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // requests per window
    
    // Caching
    cacheEnabled: true,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    
    // Security
    corsOrigin: process.env.CORS_ORIGIN || '*',
    
    // Logging
    debug: process.env.DEBUG === 'true' || false
};

module.exports = config;
