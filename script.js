// Weather Dashboard JavaScript
class WeatherDashboard {
    constructor() {
        this.baseUrl = window.location.origin; // Use the current server
        this.searchHistory = JSON.parse(localStorage.getItem('weatherSearchHistory')) || [];
        this.currentCity = '';
        this.suggestions = [];
        this.apiKey = null;
        
        this.initializeEventListeners();
        this.displaySearchHistory();
        this.checkServerHealth();
    }

    async checkServerHealth() {
        try {
            const response = await fetch(`${this.baseUrl}/api/health`);
            const health = await response.json();
            
            if (!health.hasApiKey) {
                console.warn('⚠️ Server is running without OpenWeatherMap API key');
                console.warn('Demo mode will be enabled automatically');
                this.enableDemoMode();
            } else {
                console.log('✅ Server is healthy and API key is configured');
            }
        } catch (error) {
            console.error('Failed to check server health:', error);
            console.log('Enabling demo mode as fallback');
            this.enableDemoMode();
        }
    }

    initializeEventListeners() {
        const searchForm = document.getElementById('search-form');
        const cityInput = document.getElementById('city-input');

        if (!searchForm || !cityInput) {
            console.error('Required DOM elements not found');
            return;
        }

        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const city = cityInput.value.trim();
            if (city) {
                this.searchWeather(city);
                cityInput.value = '';
                this.hideSuggestions();
            }
        });

        // Allow Enter key to submit
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchForm.dispatchEvent(new Event('submit'));
            }
        });

        // Handle input changes for auto-complete
        cityInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                this.fetchSuggestions(query);
            } else {
                this.hideSuggestions();
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.header-search')) {
                this.hideSuggestions();
            }
        });
    }

    async searchWeather(city) {
        try {
            this.showLoading();
            
            // Get current weather
            const currentWeather = await this.fetchCurrentWeather(city);
            
            // Get 5-day forecast
            const forecast = await this.fetchForecast(city);
            
            // Get hourly forecast
            const hourlyForecast = await this.fetchHourlyForecast(city);
            
            // Get air quality data
            const airQuality = await this.fetchAirQuality(city);
            
            // Get weather alerts
            const alerts = await this.fetchAlerts(city);
            
            // Display results
            this.displayCurrentWeather(currentWeather);
            this.displayForecast(forecast);
            this.displayHourlyForecast(hourlyForecast);
            this.displayAirQuality(airQuality);
            this.displayAlerts(alerts);
            
            // Fetch and display weather maps
            if (currentWeather.coord) {
                await this.displayWeatherMaps(currentWeather.coord.lat, currentWeather.coord.lon);
            }
            
            // Update search history
            this.addToSearchHistory(city);
            
            this.currentCity = city;
            
        } catch (error) {
            console.error('Error fetching weather:', error);
            this.showError(error.message || 'Failed to fetch weather data. Please try again.');
        }
    }

    async fetchCurrentWeather(city) {
        const response = await fetch(
            `${this.baseUrl}/api/weather/${encodeURIComponent(city)}`
        );
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `City not found: ${city}`);
        }
        
        return await response.json();
    }

    async fetchForecast(city) {
        const response = await fetch(
            `${this.baseUrl}/api/forecast/${encodeURIComponent(city)}`
        );
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Forecast not found for: ${city}`);
        }
        
        const data = await response.json();
        
        // Process forecast data to get daily forecasts
        return this.processForecastData(data);
    }

    async fetchHourlyForecast(city) {
        try {
            const response = await fetch(`${this.baseUrl}/api/forecast/${encodeURIComponent(city)}`);
            if (response.ok) {
                const data = await response.json();
                return this.processHourlyData(data);
            }
        } catch (error) {
            console.error('Error fetching hourly forecast:', error);
        }
        return [];
    }

    async fetchAirQuality(city) {
        try {
            const response = await fetch(`${this.baseUrl}/api/air-quality/${encodeURIComponent(city)}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching air quality:', error);
        }
        return null;
    }

    async fetchAlerts(city) {
        try {
            const response = await fetch(`${this.baseUrl}/api/alerts/${encodeURIComponent(city)}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching alerts:', error);
        }
        return { alerts: [] };
    }

    processForecastData(data) {
        const dailyForecasts = [];
        const processedDays = new Set();
        
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toDateString();
            
            // Only add one forecast per day (at noon if available, otherwise first available)
            if (!processedDays.has(dayKey)) {
                processedDays.add(dayKey);
                dailyForecasts.push({
                    date: date,
                    temp: Math.round(item.main.temp),
                    description: item.weather[0].description,
                    humidity: item.main.humidity,
                    windSpeed: Math.round(item.wind.speed * 3.6), // Convert m/s to km/h
                    icon: item.weather[0].icon
                });
            }
        });
        
        // Return only 5 days
        return dailyForecasts.slice(0, 5);
    }

    processHourlyData(data) {
        const hourlyData = [];
        const now = new Date();
        
        data.list.forEach(item => {
            const itemDate = new Date(item.dt * 1000);
            // Only include next 24 hours
            if (itemDate > now && itemDate <= new Date(now.getTime() + 24 * 60 * 60 * 1000)) {
                hourlyData.push({
                    time: itemDate,
                    temp: Math.round(item.main.temp),
                    description: item.weather[0].description,
                    icon: this.getWeatherIcon(item.weather[0].main),
                    humidity: item.main.humidity,
                    windSpeed: Math.round(item.wind.speed * 3.6)
                });
            }
        });
        
        return hourlyData.slice(0, 24); // Return max 24 hours
    }

    displayCurrentWeather(weatherData) {
        const container = document.getElementById('current-weather-content');
        if (!container) {
            console.error('Current weather container not found');
            return;
        }
        
        const currentDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Update body class for dynamic background
        this.updateWeatherBackground(weatherData.weather[0].main);

        container.innerHTML = `
            <div class="city-info">
                <h3>${weatherData.name}</h3>
                <div class="date">${currentDate}</div>
            </div>
            <div class="weather-details">
                <div class="weather-detail temperature">
                    <div class="weather-icon">🌡️</div>
                    <h4>Temperature</h4>
                    <div class="value">
                        <span>${Math.round(weatherData.main.temp)}</span>
                        <span class="unit">°C</span>
                    </div>
                </div>
                <div class="weather-detail humidity">
                    <div class="weather-icon">💧</div>
                    <h4>Humidity</h4>
                    <div class="value">
                        <span>${weatherData.main.humidity}</span>
                        <span class="unit">%</span>
                    </div>
                </div>
                <div class="weather-detail wind">
                    <div class="weather-icon">💨</div>
                    <h4>Wind Speed</h4>
                    <div class="value">
                        <span>${Math.round(weatherData.wind.speed * 3.6)}</span>
                        <span class="unit">KPH</span>
                    </div>
                </div>
                <div class="weather-detail weather">
                    <div class="weather-icon">${this.getWeatherIcon(weatherData.weather[0].main)}</div>
                    <h4>Weather</h4>
                    <span class="value">${weatherData.weather[0].description}</span>
                </div>
            </div>
        `;

        // Update sun times and UV index
        this.updateSunTimes(weatherData);
        this.updateUVIndex(weatherData);
        this.updateClothingSuggestions(weatherData);
    }

    displayForecast(forecastData) {
        const container = document.getElementById('forecast-content');
        if (!container) {
            console.error('Forecast container not found');
            return;
        }
        
        if (!forecastData || forecastData.length === 0) {
            container.innerHTML = '<div class="forecast-placeholder"><p>No forecast data available</p></div>';
            return;
        }

        const forecastHTML = forecastData.map(day => {
            const dayName = day.date.toLocaleDateString('en-US', { weekday: 'short' });
            const date = day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            return `
                <div class="forecast-card">
                    <div class="day">${dayName}</div>
                    <div class="date">${date}</div>
                    <div class="temp">${day.temp}°C</div>
                    <div class="description">${day.description}</div>
                    <div class="details">
                        <div>Humidity: ${day.humidity}%</div>
                        <div>Wind: ${day.windSpeed} KPH</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = forecastHTML;
    }

    displayHourlyForecast(hourlyData) {
        const container = document.getElementById('hourly-forecast-content');
        if (!container) {
            console.error('Hourly forecast container not found');
            return;
        }
        
        if (!hourlyData || hourlyData.length === 0) {
            container.innerHTML = `
                <div class="hourly-scroll">
                    <div class="hourly-placeholder">
                        <div class="hourly-icon">⏰</div>
                        <p>No hourly forecast available</p>
                    </div>
                </div>
            `;
            return;
        }

        const hourlyHTML = hourlyData.map(hour => {
            const time = hour.time.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
            
            return `
                <div class="hourly-card">
                    <div class="hourly-time">${time}</div>
                    <div class="hourly-icon">${hour.icon}</div>
                    <div class="hourly-temp">${hour.temp}°C</div>
                    <div class="hourly-desc">${hour.description}</div>
                    <div class="hourly-details">
                        <div>💧 ${hour.humidity}%</div>
                        <div>💨 ${hour.windSpeed} KPH</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="hourly-scroll">${hourlyHTML}</div>`;
    }

    displayAirQuality(airQualityData) {
        const container = document.getElementById('air-quality-content');
        if (!container) {
            console.error('Air quality container not found');
            return;
        }
        
        if (!airQualityData || !airQualityData.airQuality) {
            container.innerHTML = `
                <div class="aq-placeholder">
                    <span class="aq-icon">💨</span>
                    <span>Air quality data not available</span>
                </div>
            `;
            return;
        }

        const aq = airQualityData.airQuality.list[0];
        const aqi = aq.main.aqi;
        const components = aq.components;
        
        let aqiText, aqiColor;
        switch(aqi) {
            case 1: aqiText = 'Good'; aqiColor = '#4CAF50'; break;
            case 2: aqiText = 'Fair'; aqiColor = '#FF9800'; break;
            case 3: aqiText = 'Moderate'; aqiColor = '#FF5722'; break;
            case 4: aqiText = 'Poor'; aqiColor = '#9C27B0'; break;
            case 5: aqiText = 'Very Poor'; aqiColor = '#7B1FA2'; break;
            default: aqiText = 'Unknown'; aqiColor = '#9E9E9E';
        }

        container.innerHTML = `
            <div class="aq-display">
                <div class="aq-main">
                    <div class="aq-value" style="color: ${aqiColor}">${aqi}</div>
                    <div class="aq-label" style="color: ${aqiColor}">${aqiText}</div>
                </div>
                <div class="aq-details">
                    <div class="aq-component">
                        <span class="component-name">PM2.5:</span>
                        <span class="component-value">${components.pm2_5} µg/m³</span>
                    </div>
                    <div class="aq-component">
                        <span class="component-name">PM10:</span>
                        <span class="component-value">${components.pm10} µg/m³</span>
                    </div>
                    <div class="aq-component">
                        <span class="component-name">NO₂:</span>
                        <span class="component-value">${components.no2} µg/m³</span>
                    </div>
                </div>
            </div>
        `;
    }

    displayAlerts(alertsData) {
        const container = document.getElementById('alerts-content');
        if (!container) {
            console.error('Alerts container not found');
            return;
        }
        
        if (!alertsData.alerts || alertsData.alerts.length === 0) {
            container.innerHTML = `
                <div class="alert-item">
                    <span class="alert-icon">✅</span>
                    <span class="alert-text">No active weather alerts</span>
                </div>
            `;
            return;
        }

        const alertsHTML = alertsData.alerts.map(alert => `
            <div class="alert-item alert-active">
                <span class="alert-icon">⚠️</span>
                <div class="alert-content">
                    <div class="alert-title">${alert.event}</div>
                    <div class="alert-description">${alert.description}</div>
                    <div class="alert-time">Until: ${new Date(alert.end).toLocaleString()}</div>
                </div>
            </div>
        `).join('');

        container.innerHTML = alertsHTML;
    }

    async displayWeatherMaps(lat, lon) {
        try {
            const apiKey = await this.getApiKey();
            if (!apiKey) {
                console.error('Cannot display weather maps: API key not available');
                return;
            }

            const zoom = 5;
            
            // Temperature map
            const tempMapUrl = `https://tile.openweathermap.org/map/temp_new/${zoom}/${this.getTileX(lon, zoom)}/${this.getTileY(lat, zoom)}.png?appid=${apiKey}`;
            
            // Precipitation map
            const precipMapUrl = `https://tile.openweathermap.org/map/precipitation_new/${zoom}/${this.getTileX(lon, zoom)}/${this.getTileY(lat, zoom)}.png?appid=${apiKey}`;
            
            const tempMapElement = document.getElementById('temperature-map');
            const precipMapElement = document.getElementById('precipitation-map');
            
            if (tempMapElement) {
                tempMapElement.src = tempMapUrl;
                tempMapElement.onerror = () => {
                    tempMapElement.style.display = 'none';
                    console.error('Failed to load temperature map');
                };
            }
            
            if (precipMapElement) {
                precipMapElement.src = precipMapUrl;
                precipMapElement.onerror = () => {
                    precipMapElement.style.display = 'none';
                    console.error('Failed to load precipitation map');
                };
            }
        } catch (error) {
            console.error('Error displaying weather maps:', error);
        }
    }

    getTileX(lon, zoom) {
        return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
    }

    getTileY(lat, zoom) {
        const latRad = lat * Math.PI / 180;
        return Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));
    }

    async getApiKey() {
        if (!this.apiKey) {
            try {
                const response = await fetch(`${this.baseUrl}/api/config`);
                if (!response.ok) {
                    console.error('Failed to fetch API key from server.');
                    return null;
                }
                const data = await response.json();
                this.apiKey = data.OPENWEATHER_API_KEY;
            } catch (error) {
                console.error('Error fetching API key:', error);
                return null;
            }
        }
        return this.apiKey;
    }

    addToSearchHistory(city) {
        // Remove if already exists
        this.searchHistory = this.searchHistory.filter(item => 
            item.toLowerCase() !== city.toLowerCase()
        );
        
        // Add to beginning
        this.searchHistory.unshift(city);
        
        // Keep only last 10 searches
        if (this.searchHistory.length > 10) {
            this.searchHistory = this.searchHistory.slice(0, 10);
        }
        
        // Save to localStorage
        localStorage.setItem('weatherSearchHistory', JSON.stringify(this.searchHistory));
        
        // Update display
        this.displaySearchHistory();
    }

    displaySearchHistory() {
        const historyContainer = document.getElementById('search-history');
        if (!historyContainer) {
            console.error('Search history container not found');
            return;
        }
        
        if (this.searchHistory.length === 0) {
            historyContainer.innerHTML = '<p style="text-align: center; color: #7f8c8d; font-style: italic;">No search history yet</p>';
            return;
        }

        // Create history items without inline event handlers
        const historyHTML = this.searchHistory.map((city, index) => `
            <div class="history-item" data-city="${city}" data-index="${index}">
                ${city}
            </div>
        `).join('');

        historyContainer.innerHTML = historyHTML;

        // Add event listeners to history items
        this.attachHistoryEventListeners();
    }

    // NEW METHOD: Attach event listeners to history items
    attachHistoryEventListeners() {
        const historyItems = document.querySelectorAll('.history-item');
        historyItems.forEach(item => {
            item.addEventListener('click', () => {
                const city = item.getAttribute('data-city');
                if (city) {
                    this.searchWeather(city);
                }
            });
        });
    }

    showLoading() {
        const currentWeatherContainer = document.getElementById('current-weather-content');
        const forecastContainer = document.getElementById('forecast-content');
        
        if (currentWeatherContainer) {
            currentWeatherContainer.innerHTML = '<div class="loading">Loading current weather...</div>';
        }
        if (forecastContainer) {
            forecastContainer.innerHTML = '<div class="loading">Loading forecast...</div>';
        }
    }

    showError(message) {
        const currentWeatherContainer = document.getElementById('current-weather-content');
        const forecastContainer = document.getElementById('forecast-content');
        
        if (currentWeatherContainer) {
            currentWeatherContainer.innerHTML = `<div class="error">${message}</div>`;
        }
        if (forecastContainer) {
            forecastContainer.innerHTML = `<div class="error">${message}</div>`;
        }
    }

    // Auto-complete functionality
    async fetchSuggestions(query) {
        try {
            const response = await fetch(`${this.baseUrl}/api/suggestions/${encodeURIComponent(query)}`);
            if (response.ok) {
                this.suggestions = await response.json();
                this.displaySuggestions();
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        }
    }

    displaySuggestions() {
        const suggestionsContainer = document.getElementById('suggestions-container');
        if (!suggestionsContainer) {
            this.createSuggestionsContainer();
        }
        
        const container = document.getElementById('suggestions-container');
        if (!container) {
            console.error('Suggestions container not found');
            return;
        }
        
        if (this.suggestions.length === 0) {
            container.style.display = 'none';
            return;
        }

        // Create suggestions without inline event handlers
        const suggestionsHTML = this.suggestions.map((suggestion, index) => `
            <div class="suggestion-item" data-city="${suggestion.displayName}" data-index="${index}">
                <span class="suggestion-name">${suggestion.name}</span>
                <span class="suggestion-location">${suggestion.state ? suggestion.state + ', ' : ''}${suggestion.country}</span>
            </div>
        `).join('');

        container.innerHTML = suggestionsHTML;
        container.style.display = 'block';

        // Add event listeners to suggestion items
        this.attachSuggestionEventListeners();
    }

    // NEW METHOD: Attach event listeners to suggestion items
    attachSuggestionEventListeners() {
        const suggestionItems = document.querySelectorAll('.suggestion-item');
        suggestionItems.forEach(item => {
            item.addEventListener('click', () => {
                const cityName = item.getAttribute('data-city');
                if (cityName) {
                    this.selectSuggestion(cityName);
                }
            });
        });
    }

    createSuggestionsContainer() {
        const headerSearch = document.querySelector('.header-search');
        if (!headerSearch) {
            console.error('Header search container not found');
            return;
        }
        
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = 'suggestions-container';
        suggestionsContainer.className = 'suggestions-container';
        headerSearch.appendChild(suggestionsContainer);
    }

    selectSuggestion(cityName) {
        document.getElementById('city-input').value = cityName;
        this.hideSuggestions();
        this.searchWeather(cityName);
    }

    hideSuggestions() {
        const container = document.getElementById('suggestions-container');
        if (container) {
            container.style.display = 'none';
        }
    }

    // Dynamic weather background
    updateWeatherBackground(weatherMain) {
        document.body.className = '';
        document.body.classList.add(`weather-${weatherMain.toLowerCase()}`);
        
        // Add animated background elements
        this.addWeatherElements(weatherMain);
    }

    addWeatherElements(weatherMain) {
        // Remove existing elements
        document.querySelectorAll('.weather-bg-element').forEach(el => el.remove());
        
        switch(weatherMain.toLowerCase()) {
            case 'clear':
            case 'sunny':
                this.addSunRays();
                break;
            case 'clouds':
            case 'cloudy':
                this.addClouds();
                break;
            case 'rain':
            case 'rainy':
                this.addRainDrops();
                break;
            case 'snow':
            case 'snowy':
                this.addSnowFlakes();
                break;
        }
    }

    addSunRays() {
        const sunRays = document.createElement('div');
        sunRays.className = 'weather-bg-element sun-rays';
        document.body.appendChild(sunRays);
    }

    addClouds() {
        for (let i = 0; i < 3; i++) {
            const cloud = document.createElement('div');
            cloud.className = 'weather-bg-element cloud';
            cloud.style.top = `${20 + i * 20}%`;
            cloud.style.animationDelay = `${i * 5}s`;
            document.body.appendChild(cloud);
        }
    }

    addRainDrops() {
        for (let i = 0; i < 20; i++) {
            const drop = document.createElement('div');
            drop.className = 'weather-bg-element rain-drop';
            drop.style.left = `${Math.random() * 100}%`;
            drop.style.animationDelay = `${Math.random() * 2}s`;
            document.body.appendChild(drop);
        }
    }

    addSnowFlakes() {
        for (let i = 0; i < 15; i++) {
            const flake = document.createElement('div');
            flake.className = 'weather-bg-element rain-drop';
            flake.style.left = `${Math.random() * 100}%`;
            flake.style.animationDelay = `${Math.random() * 3}s`;
            flake.style.animation = 'snowFall 3s linear infinite';
            document.body.appendChild(flake);
        }
    }

    // Weather icon mapping
    getWeatherIcon(weatherMain) {
        const iconMap = {
            'Clear': '☀️',
            'Clouds': '☁️',
            'Rain': '🌧️',
            'Snow': '❄️',
            'Thunderstorm': '⛈️',
            'Drizzle': '🌦️',
            'Mist': '🌫️',
            'Fog': '🌫️',
            'Haze': '🌫️',
            'Smoke': '🌫️',
            'Dust': '🌫️',
            'Sand': '🌫️',
            'Ash': '🌫️',
            'Squall': '💨',
            'Tornado': '🌪️'
        };
        return iconMap[weatherMain] || '🌤️';
    }

    // Update sun times
    updateSunTimes(weatherData) {
        if (weatherData.sys && weatherData.sys.sunrise && weatherData.sys.sunset) {
            const sunrise = new Date(weatherData.sys.sunrise * 1000);
            const sunset = new Date(weatherData.sys.sunset * 1000);
            const now = new Date();
            
            const sunriseTime = sunrise.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
            const sunsetTime = sunset.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
            
            // Use more specific selectors to avoid null errors
            const sunriseElement = document.querySelector('#sun-times-content .sun-time:first-child .sun-time-value');
            const sunsetElement = document.querySelector('#sun-times-content .sun-time:last-child .sun-time-value');
            const daylightBar = document.querySelector('#sun-times-content .daylight-bar');
            
            if (sunriseElement) sunriseElement.textContent = sunriseTime;
            if (sunsetElement) sunsetElement.textContent = sunsetTime;
            
            // Calculate daylight progress
            const totalDaylight = sunset - sunrise;
            const elapsedDaylight = now - sunrise;
            const daylightProgress = Math.max(0, Math.min(100, (elapsedDaylight / totalDaylight) * 100));
            
            if (daylightBar) daylightBar.style.width = `${daylightProgress}%`;
        }
    }

    // Update UV index
    updateUVIndex(weatherData) {
        // Simulate UV index based on time and weather
        const hour = new Date().getHours();
        let uvValue = 0;
        let uvLevel = 'Low';
        let uvClass = 'uv-low';
        
        if (hour >= 10 && hour <= 16) {
            if (weatherData.weather[0].main === 'Clear') {
                uvValue = Math.floor(Math.random() * 8) + 3; // 3-10
            } else if (weatherData.weather[0].main === 'Clouds') {
                uvValue = Math.floor(Math.random() * 5) + 2; // 2-6
            } else {
                uvValue = Math.floor(Math.random() * 3) + 1; // 1-3
            }
        } else {
            uvValue = Math.floor(Math.random() * 2); // 0-1
        }
        
        if (uvValue >= 8) { uvLevel = 'Very High'; uvClass = 'uv-very-high'; }
        else if (uvValue >= 6) { uvLevel = 'High'; uvClass = 'uv-high'; }
        else if (uvValue >= 3) { uvLevel = 'Moderate'; uvClass = 'uv-moderate'; }
        else { uvLevel = 'Low'; uvClass = 'uv-low'; }
        
        const uvContainer = document.getElementById('uv-content');
        if (uvContainer) {
            uvContainer.innerHTML = `
                <div class="uv-container">
                    <div class="uv-value ${uvClass}">${uvValue}</div>
                    <div class="uv-label">${uvLevel}</div>
                    <div class="uv-bar">
                        <div class="uv-progress" style="width: ${(uvValue / 11) * 100}%"></div>
                    </div>
                </div>
            `;
        }
    }

    // Update clothing suggestions
    updateClothingSuggestions(weatherData) {
        const temp = weatherData.main.temp;
        const weather = weatherData.weather[0].main;
        const suggestions = [];
        
        if (temp < 5) {
            suggestions.push({ icon: '🧥', text: 'Heavy coat' });
            suggestions.push({ icon: '🧤', text: 'Gloves' });
            suggestions.push({ icon: '🧣', text: 'Scarf' });
        } else if (temp < 15) {
            suggestions.push({ icon: '🧥', text: 'Light jacket' });
            suggestions.push({ icon: '👖', text: 'Long pants' });
        } else if (temp < 25) {
            suggestions.push({ icon: '👕', text: 'T-shirt' });
            suggestions.push({ icon: '👖', text: 'Comfortable pants' });
        } else {
            suggestions.push({ icon: '👕', text: 'Light clothing' });
            suggestions.push({ icon: '🩳', text: 'Shorts' });
        }
        
        if (weather === 'Rain') {
            suggestions.push({ icon: '☔', text: 'Umbrella' });
            suggestions.push({ icon: '👢', text: 'Waterproof shoes' });
        } else if (weather === 'Snow') {
            suggestions.push({ icon: '👢', text: 'Boots' });
            suggestions.push({ icon: '🧤', text: 'Gloves' });
        }
        
        const clothingContainer = document.getElementById('clothing-content');
        if (clothingContainer) {
            clothingContainer.innerHTML = `
                <div class="clothing-suggestions">
                    ${suggestions.map(item => `
                        <div class="clothing-item">
                            <span class="clothing-icon">${item.icon}</span>
                            <div class="clothing-text">${item.text}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    // Demo mode for testing without API key
    enableDemoMode() {
        console.log('Demo mode enabled - using sample data');
        
        // Sample current weather data with enhanced info
        const sampleCurrentWeather = {
            name: 'London',
            main: {
                temp: 18,
                humidity: 65,
                feels_like: 16,
                pressure: 1013
            },
            wind: {
                speed: 5.5,
                deg: 180
            },
            weather: [{
                id: 801,
                main: 'Clouds',
                description: 'Partly cloudy',
                icon: '02d'
            }],
            sys: {
                sunrise: Math.floor(Date.now() / 1000) - 21600, // 6 hours ago
                sunset: Math.floor(Date.now() / 1000) + 21600,  // 6 hours from now
                country: 'GB'
            },
            coord: {
                lat: 51.5074,
                lon: -0.1278
            },
            visibility: 10000,
            dt: Math.floor(Date.now() / 1000)
        };

        // Sample forecast data
        const sampleForecast = [
            {
                date: new Date(Date.now() + 24 * 60 * 60 * 1000),
                temp: 19,
                description: 'Sunny',
                humidity: 60,
                windSpeed: 12,
                icon: '01d'
            },
            {
                date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
                temp: 17,
                description: 'Cloudy',
                humidity: 70,
                windSpeed: 15,
                icon: '03d'
            },
            {
                date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                temp: 20,
                description: 'Rainy',
                humidity: 80,
                windSpeed: 18,
                icon: '10d'
            },
            {
                date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
                temp: 16,
                description: 'Partly cloudy',
                humidity: 65,
                windSpeed: 10,
                icon: '02d'
            },
            {
                date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
                temp: 22,
                description: 'Sunny',
                humidity: 55,
                windSpeed: 8,
                icon: '01d'
            }
        ];

        // Sample hourly data
        const sampleHourly = [];
        for (let i = 1; i <= 24; i++) {
            sampleHourly.push({
                time: new Date(Date.now() + i * 60 * 60 * 1000),
                temp: Math.floor(Math.random() * 10) + 15,
                description: ['Sunny', 'Cloudy', 'Partly cloudy'][Math.floor(Math.random() * 3)],
                icon: ['☀️', '☁️', '⛅'][Math.floor(Math.random() * 3)],
                humidity: Math.floor(Math.random() * 30) + 50,
                windSpeed: Math.floor(Math.random() * 15) + 5
            });
        }

        // Sample air quality data
        const sampleAirQuality = {
            airQuality: {
                list: [{
                    main: {
                        aqi: 2
                    },
                    components: {
                        co: 200.0,
                        no2: 15.0,
                        o3: 45.0,
                        so2: 2.0,
                        pm2_5: 8.0,
                        pm10: 12.0
                    }
                }]
            }
        };

        // Sample alerts data
        const sampleAlerts = {
            alerts: []
        };

        this.displayCurrentWeather(sampleCurrentWeather);
        this.displayForecast(sampleForecast);
        this.displayHourlyForecast(sampleHourly);
        this.displayAirQuality(sampleAirQuality);
        this.displayAlerts(sampleAlerts);
        this.addToSearchHistory('London');
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.weatherDashboard = new WeatherDashboard();
    console.log('Weather Dashboard loaded successfully!');
});

// Add some helpful console messages
console.log('Weather Dashboard JavaScript loaded!');
console.log('To use real weather data, get an API key from OpenWeatherMap and set OPENWEATHER_API_KEY in your .env file');