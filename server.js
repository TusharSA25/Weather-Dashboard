const express = require('express');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();

// Move config after dotenv.config()
const config = {
    port: process.env.PORT || 3000,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // Limit each IP to 100 requests per windowMs
    openWeatherBaseUrl: 'https://api.openweathermap.org/data/2.5',
    openWeatherGeoUrl: 'http://api.openweathermap.org/geo/1.0'
};

const PORT = config.port;

// Check for API key at startup
if (!process.env.OPENWEATHER_API_KEY) {
    console.error('⚠️  ERROR: OPENWEATHER_API_KEY is not set in environment variables');
    console.error('   Please create a .env file with your OpenWeatherMap API key:');
    console.error('   OPENWEATHER_API_KEY=your_api_key_here');
    console.error('   Get your API key from: https://openweathermap.org/api');
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:", "https://tile.openweathermap.org"],
            connectSrc: ["'self'", "https://api.openweathermap.org", "https://tile.openweathermap.org"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve static files from root directory
app.use(express.static(__dirname));

// Helper function to check API key
const checkApiKey = (req, res, next) => {
    if (!process.env.OPENWEATHER_API_KEY) {
        return res.status(500).json({ 
            error: 'API key not configured',
            message: 'OpenWeatherMap API key is not set on the server'
        });
    }
    next();
};

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        hasApiKey: !!process.env.OPENWEATHER_API_KEY
    });
});

// Weather API proxy endpoint
app.get('/api/weather/:city', checkApiKey, async (req, res) => {
    try {
        const { city } = req.params;
        const apiKey = process.env.OPENWEATHER_API_KEY;
        
        const response = await fetch(
            `${config.openWeatherBaseUrl}/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenWeatherMap API Error:', response.status, errorText);
            return res.status(404).json({ 
                error: 'City not found',
                message: `Could not find weather data for ${city}`
            });
        }
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Weather API error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to fetch weather data'
        });
    }
});

// Forecast API proxy endpoint
app.get('/api/forecast/:city', checkApiKey, async (req, res) => {
    try {
        const { city } = req.params;
        const apiKey = process.env.OPENWEATHER_API_KEY;
        
        const response = await fetch(
            `${config.openWeatherBaseUrl}/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
        );
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenWeatherMap Forecast API Error:', response.status, errorText);
            return res.status(404).json({ 
                error: 'Forecast not found',
                message: `Could not find forecast data for ${city}`
            });
        }
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Forecast API error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to fetch forecast data'
        });
    }
});

// Air quality API proxy endpoint
app.get('/api/air-quality/:city', checkApiKey, async (req, res) => {
    try {
        const { city } = req.params;
        const apiKey = process.env.OPENWEATHER_API_KEY;
        
        // First get coordinates for the city
        const geoResponse = await fetch(
            `${config.openWeatherGeoUrl}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`
        );
        
        if (!geoResponse.ok) {
            return res.status(404).json({ 
                error: 'City not found',
                message: `Could not find coordinates for ${city}`
            });
        }
        
        const geoData = await geoResponse.json();
        if (geoData.length === 0) {
            return res.status(404).json({ 
                error: 'City not found',
                message: `Could not find coordinates for ${city}`
            });
        }
        
        const { lat, lon } = geoData[0];
        
        // Get air quality data
        const aqResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
        );
        
        if (!aqResponse.ok) {
            return res.status(500).json({ 
                error: 'Air quality data not available',
                message: 'Failed to fetch air quality data'
            });
        }
        
        const aqData = await aqResponse.json();
        res.json({
            city: city,
            coordinates: { lat, lon },
            airQuality: aqData
        });
    } catch (error) {
        console.error('Air quality API error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to fetch air quality data'
        });
    }
});

// Geocoding API proxy endpoint
app.get('/api/geocode/:city', checkApiKey, async (req, res) => {
    try {
        const { city } = req.params;
        const apiKey = process.env.OPENWEATHER_API_KEY;
        
        const response = await fetch(
            `${config.openWeatherGeoUrl}/direct?q=${encodeURIComponent(city)}&limit=5&appid=${apiKey}`
        );
        
        if (!response.ok) {
            return res.status(500).json({ 
                error: 'Geocoding failed',
                message: 'Failed to get city coordinates'
            });
        }
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Geocoding API error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to get city coordinates'
        });
    }
});

// Search suggestions endpoint
app.get('/api/suggestions/:query', checkApiKey, async (req, res) => {
    try {
        const { query } = req.params;
        if (query.length < 2) {
            return res.json([]);
        }
        
        const apiKey = process.env.OPENWEATHER_API_KEY;
        
        const response = await fetch(
            `${config.openWeatherGeoUrl}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`
        );
        
        if (!response.ok) {
            return res.json([]);
        }
        
        const data = await response.json();
        const suggestions = data.map(item => ({
            name: item.name,
            country: item.country,
            state: item.state,
            displayName: item.state ? `${item.name}, ${item.state}, ${item.country}` : `${item.name}, ${item.country}`
        }));
        
        res.json(suggestions);
    } catch (error) {
        console.error('Suggestions API error:', error);
        res.json([]);
    }
});

// Weather alerts endpoint
app.get('/api/alerts/:city', checkApiKey, async (req, res) => {
    try {
        const { city } = req.params;
        const apiKey = process.env.OPENWEATHER_API_KEY;
        
        // Get coordinates first
        const geoResponse = await fetch(
            `${config.openWeatherGeoUrl}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`
        );
        
        if (!geoResponse.ok) {
            return res.status(404).json({ 
                error: 'City not found',
                message: `Could not find coordinates for ${city}`
            });
        }
        
        const geoData = await geoResponse.json();
        if (geoData.length === 0) {
            return res.status(404).json({ 
                error: 'City not found',
                message: `Could not find coordinates for ${city}`
            });
        }
        
        const { lat, lon } = geoData[0];
        
        // Get weather alerts using One Call API 3.0 (requires subscription)
        const alertsResponse = await fetch(
            `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,daily&appid=${apiKey}`
        );
        
        if (!alertsResponse.ok) {
            // Fallback - return empty alerts if One Call API is not available
            return res.json({ 
                city: city,
                alerts: [],
                note: 'Weather alerts require One Call API 3.0 subscription'
            });
        }
        
        const alertsData = await alertsResponse.json();
        res.json({
            city: city,
            alerts: alertsData.alerts || []
        });
    } catch (error) {
        console.error('Alerts API error:', error);
        res.json({ 
            city: req.params.city,
            alerts: [],
            error: 'Failed to fetch alerts'
        });
    }
});

// API endpoint to expose the OpenWeatherMap API key (for client-side map tiles)
app.get('/api/config', (req, res) => {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
        console.error('API key not found in environment variables');
        return res.status(500).json({ error: 'API key not found' });
    }
    console.log('API key successfully fetched for client');
    res.json({ OPENWEATHER_API_KEY: apiKey });
});

// Serve the main HTML file for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: 'Something went wrong on the server'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Weather Dashboard Server running on port ${PORT}`);
    console.log(`📱 Frontend: http://localhost:${PORT}`);
    console.log(`🔌 API: http://localhost:${PORT}/api`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    if (!process.env.OPENWEATHER_API_KEY) {
        console.log(`⚠️  Warning: No OPENWEATHER_API_KEY found in environment variables`);
        console.log(`   Create a .env file with: OPENWEATHER_API_KEY=your_api_key_here`);
        console.log(`   Get your API key from: https://openweathermap.org/api`);
    } else {
        console.log(`✅ OpenWeatherMap API key loaded successfully`);
    }
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});