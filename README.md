# 🌤️ Weather Dashboard

A beautiful, responsive weather dashboard with a powerful backend proxy server that displays current weather conditions, forecasts, air quality, and weather alerts for cities worldwide.

## ✨ Features

### Frontend
- **Modern UI/UX**: Beautiful gradient design with glassmorphism effects
- **Responsive Design**: Works perfectly on all devices (desktop, tablet, mobile)
- **Real-time Search**: Auto-complete suggestions for cities worldwide
- **Current Weather**: Temperature, humidity, wind speed, and weather description
- **5-Day Forecast**: Detailed daily weather predictions
- **Air Quality Data**: Real-time air quality index and pollutant levels
- **Weather Alerts**: Active weather warnings and advisories
- **Search History**: Track your recent searches
- **Smooth Animations**: Elegant transitions and hover effects

### Backend
- **Express.js Server**: Fast and reliable Node.js backend
- **API Proxy**: Secure proxy to OpenWeatherMap API
- **Rate Limiting**: Protection against API abuse
- **Security Headers**: Helmet.js for enhanced security
- **CORS Support**: Cross-origin resource sharing enabled
- **Compression**: Gzip compression for faster responses
- **Error Handling**: Comprehensive error handling and logging
- **Environment Configuration**: Flexible configuration management

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd weather-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional)
   Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=3000
   OPENWEATHER_API_KEY=your_api_key_here
   DEBUG=false
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔑 API Key Setup

1. **Get a free API key** from [OpenWeatherMap](https://openweathermap.org/api)
2. **Set the environment variable**:
   ```bash
   export OPENWEATHER_API_KEY=your_api_key_here
   ```
   Or add it to your `.env` file

## 📁 Project Structure

```
weather-dashboard/
├── server.js          # Express.js backend server
├── config.js          # Configuration settings
├── index.html         # Main HTML file
├── style.css          # CSS styles and animations
├── script.js          # Frontend JavaScript logic
├── package.json       # Dependencies and scripts
└── README.md          # Project documentation
```

## 🌐 API Endpoints

### Weather Data
- `GET /api/weather/:city` - Current weather for a city
- `GET /api/forecast/:city` - 5-day forecast for a city
- `GET /api/air-quality/:city` - Air quality data for a city
- `GET /api/alerts/:city` - Weather alerts for a city

### Utility
- `GET /api/geocode/:city` - City coordinates
- `GET /api/suggestions/:query` - City search suggestions
- `GET /api/health` - Server health check

## 🎨 Customization

### Styling
- Modify `style.css` to change colors, fonts, and layouts
- Update CSS variables for consistent theming
- Add new animations and transitions

### Functionality
- Extend `script.js` with new weather features
- Add more API endpoints in `server.js`
- Implement caching and database storage

### Configuration
- Update `config.js` for different environments
- Modify rate limiting and security settings
- Add new API integrations

## 🔧 Development

### Available Scripts
```bash
npm start      # Start production server
npm run dev    # Start development server with nodemon
npm test       # Run tests (placeholder)
```

### Development Features
- **Hot Reload**: Server restarts automatically on file changes
- **Error Logging**: Detailed error messages in development
- **API Testing**: Test endpoints with tools like Postman or curl

## 🚀 Deployment

### Environment Variables
```bash
NODE_ENV=production
PORT=3000
OPENWEATHER_API_KEY=your_production_api_key
CORS_ORIGIN=https://yourdomain.com
```

### Production Considerations
- Use a process manager like PM2
- Set up reverse proxy (nginx/Apache)
- Enable HTTPS with SSL certificates
- Monitor server performance and logs
- Set up proper logging and error tracking

## 🛡️ Security Features

- **Rate Limiting**: Prevents API abuse
- **Security Headers**: Helmet.js protection
- **CORS Configuration**: Controlled cross-origin access
- **Input Validation**: Sanitized API parameters
- **Error Handling**: No sensitive information leakage

## 📱 Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- [OpenWeatherMap](https://openweathermap.org/) for weather data API
- [Express.js](https://expressjs.com/) for the backend framework
- [Inter Font](https://rsms.me/inter/) for beautiful typography

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/weather-dashboard/issues) page
2. Create a new issue with detailed information
3. Include your Node.js version and operating system

---

**Made with ❤️ and ☕ by [Your Name]**
