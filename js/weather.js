let weatherData = null;
let weatherUpdateInterval = null;
let currentLocationData = null;

const WEATHER_CONFIG = {
    weatherApiKey: localStorage.getItem('weatherApiKey') || '',
    weatherApiUrl: 'https://api.weatherapi.com/v1',
    
    openWeatherKey: localStorage.getItem('weatherApiKey') || '',
    openWeatherUrl: 'https://api.openweathermap.org/data/2.5',
    
    city: 'Istanbul',
    country: 'Turkey'
};

async function getUserLocationFromIP() {
    try {
        console.log('🌍 Getting user location from IP...');
        
        const ipServices = [
            'https://ipapi.co/json/',
            'https://ipwhois.app/json/',
            'https://ip-api.com/json/',
            'https://freegeoip.app/json/'
        ];
        
        for (const service of ipServices) {
            try {
                const response = await fetch(service);
                if (response.ok) {
                    const data = await response.json();
                    console.log('📍 Location data received:', data);
                    
                    let locationInfo = null;
                    
                    if (data.city && data.country) {
                        locationInfo = {
                            city: data.city,
                            country: data.country,
                            countryCode: data.country_code || data.country_code,
                            latitude: data.latitude || data.lat,
                            longitude: data.longitude || data.lon || data.lng,
                            timezone: data.timezone,
                            region: data.region || data.region_name
                        };
                    } else if (data.regionName && data.country) {
                        locationInfo = {
                            city: data.city,
                            country: data.country,
                            countryCode: data.countryCode,
                            latitude: data.lat,
                            longitude: data.lon,
                            timezone: data.timezone,
                            region: data.regionName
                        };
                    }
                    
                    if (locationInfo && locationInfo.city && locationInfo.latitude && locationInfo.longitude) {
                        console.log('✅ Location detected:', locationInfo);
                        console.log(`🌍 Auto-detected location: ${locationInfo.city}, ${locationInfo.country}`);
                        console.log(`📍 Coordinates: ${locationInfo.latitude}, ${locationInfo.longitude}`);
                        
                        currentLocationData = locationInfo;
                        
                        WEATHER_CONFIG.city = locationInfo.city;
                        WEATHER_CONFIG.country = locationInfo.country;
                        WEATHER_CONFIG.latitude = locationInfo.latitude;
                        WEATHER_CONFIG.longitude = locationInfo.longitude;
                        WEATHER_CONFIG.timezone = locationInfo.timezone;
                        
                        if (typeof updateLocationForThemes === 'function') {
                            updateLocationForThemes(locationInfo.latitude, locationInfo.longitude);
                        } else if (typeof window.updateLocationForThemes === 'function') {
                            window.updateLocationForThemes(locationInfo.latitude, locationInfo.longitude);
                        }
                        
                        return locationInfo;
                    }
                }
            } catch (error) {
                console.log(`❌ ${service} failed:`, error);
                continue;
            }
        }
        
        console.log('🔄 All IP services failed, using default Istanbul location');
        return null;
        
    } catch (error) {
        console.log('❌ IP geolocation failed:', error);
        return null;
    }
}

async function loadWeatherData() {
    console.log('🌤️ Loading weather data...');
    
    try {
        await getUserLocationFromIP();
        
        let weatherData = await fetchFromWeatherAPI();
        if (weatherData) {
            console.log('✅ WeatherAPI.com success - REAL DATA FROM YOUR API!');
            window.weatherData = weatherData;
            updateWeatherDisplay();
            return;
        }
        
        weatherData = await fetchFromOpenWeather();
        if (weatherData) {
            console.log('✅ OpenWeatherMap success!');
            window.weatherData = weatherData;
            updateWeatherDisplay();
            return;
        }
        
        weatherData = await fetchFromPublicWeatherService();
        if (weatherData) {
            console.log('✅ Open-Meteo/wttr.in success - PUBLIC DATA!');
            window.weatherData = weatherData;
            updateWeatherDisplay();
            return;
        }
        
        weatherData = await fetchWeatherFromPublicSource();
        if (weatherData) {
            console.log('✅ wttr.in direct success!');
            window.weatherData = weatherData;
            updateWeatherDisplay();
            return;
        }
    } catch (error) {
        console.log('❌ All weather sources failed:', error);
    }
    
    console.log('📊 Using demo data (fallback)');
    const demoWeatherData = generateRealisticWeatherData();
    window.weatherData = demoWeatherData;
    updateWeatherDisplay();
}

function generateRealisticWeatherData() {
    const now = new Date();
    const currentHour = now.getHours();
    
    let baseTemp = 20;
    if (currentHour >= 6 && currentHour < 12) baseTemp = 18 + (currentHour - 6) * 2;
    else if (currentHour >= 12 && currentHour < 18) baseTemp = 28 - (currentHour - 12) * 0.5;
    else if (currentHour >= 18 && currentHour < 22) baseTemp = 25 - (currentHour - 18) * 2;
    else baseTemp = 15 + Math.random() * 3;
    
    const temp = Math.round(baseTemp + (Math.random() - 0.5) * 4);
    const feelsLike = temp + Math.round((Math.random() - 0.5) * 6);
    
    let condition, icon;
    if (temp > 25) {
        condition = 'weather-sunny';
        icon = currentHour >= 6 && currentHour < 19 ? '01d' : '01n';
    } else if (temp > 15) {
        condition = 'weather-partly-cloudy';
        icon = currentHour >= 6 && currentHour < 19 ? '02d' : '02n';
    } else {
        condition = 'weather-cloudy';
        icon = '03d';
    }
    
    const locationName = currentLocationData ? 
        `${currentLocationData.city}, ${currentLocationData.country}` : 
        'Istanbul, Turkey';
    
    return {
        location: locationName,
        current: {
            temp: temp,
            feelsLike: feelsLike,
            descriptionKey: condition,
            icon: icon,
            humidity: Math.round(45 + Math.random() * 30),
            pressure: Math.round(1010 + Math.random() * 30),
            visibility: Math.round(8 + Math.random() * 7),
            windSpeed: Math.round(5 + Math.random() * 15),
            windDirection: getRandomWindDirection()
        },
        forecast: generateRealisticForecast(temp)
    };
}

function generateRealisticForecast(currentTemp) {
    const forecast = [];
    const today = new Date();
    
    for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        let high = currentTemp + Math.round((Math.random() - 0.5) * 8);
        let low = high - Math.round(5 + Math.random() * 5);
        
        high = Math.max(10, Math.min(35, high));
        low = Math.max(5, Math.min(high - 3, low));
        
        let icon;
        if (high > 25) icon = '01d';
        else if (high > 20) icon = '02d';
        else if (high > 15) icon = '03d';
        else icon = '10d';
        
        forecast.push({
            dayKey: i === 0 ? 'today' : null,
            day: i === 0 ? null : getDayAbbreviation(i),
            icon: icon,
            high: high,
            low: low
        });
    }
    
    return forecast;
}

async function fetchFromPublicWeatherService() {
    try {
        console.log('🌐 Trying public weather services...');
        
        const lat = WEATHER_CONFIG.latitude || 41.0082;
        const lng = WEATHER_CONFIG.longitude || 28.9784;
        const city = WEATHER_CONFIG.city || 'Istanbul';
        
        const endpoints = [
            {
                url: `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`,
                type: 'open-meteo'
            },
            {
                url: `https://wttr.in/${encodeURIComponent(city)}?format=j1`,
                type: 'wttr'
            }
        ];
        
        for (const endpoint of endpoints) {
            try {
                console.log(`🔄 Trying ${endpoint.type}...`);
                const response = await fetch(endpoint.url);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ ${endpoint.type} data received:`, data);
                    
                    if (endpoint.type === 'open-meteo') {
                        return parseOpenMeteoData(data);
                    } else if (endpoint.type === 'wttr') {
                        return parseWttrData(data);
                    }
                }
            } catch (e) {
                console.log(`❌ ${endpoint.type} failed:`, e);
                continue;
            }
        }
    } catch (error) {
        console.log('❌ All public weather services failed:', error);
    }
    return null;
}

function parseOpenMeteoData(data) {
    try {
        const current = data.current;
        const daily = data.daily;
        
        const weatherCode = current.weather_code;
        const icon = mapOpenMeteoWeatherCode(weatherCode);
        const condition = mapWeatherDescription(getWeatherDescriptionFromCode(weatherCode));
        
        console.log('🌤️ Open-Meteo current:', current);
        console.log('📅 Open-Meteo daily:', daily);
        
        const locationName = currentLocationData ? 
            `${currentLocationData.city}, ${currentLocationData.country}` : 
            'Istanbul, Turkey';
        
        return {
            location: locationName,
            current: {
                temp: Math.round(current.temperature_2m),
                feelsLike: Math.round(current.apparent_temperature),
                descriptionKey: condition,
                icon: icon,
                humidity: Math.round(current.relative_humidity_2m),
                pressure: Math.round(current.surface_pressure),
                visibility: 10,
                windSpeed: Math.round(current.wind_speed_10m),
                windDirection: getWindDirection(current.wind_direction_10m)
            },
            forecast: daily.time.slice(0, 5).map((date, index) => ({
                dayKey: index === 0 ? 'today' : null,
                day: index === 0 ? null : getDayAbbreviation(index),
                icon: mapOpenMeteoWeatherCode(daily.weather_code[index]),
                high: Math.round(daily.temperature_2m_max[index]),
                low: Math.round(daily.temperature_2m_min[index])
            }))
        };
    } catch (error) {
        console.log('❌ Error parsing Open-Meteo data:', error);
        return null;
    }
}

function parseWttrData(data) {
    try {
        const current = data.current_condition[0];
        const weather = data.weather;
        
        console.log('🌤️ wttr.in current:', current);
        console.log('📅 wttr.in weather:', weather);
        
        const locationName = currentLocationData ? 
            `${currentLocationData.city}, ${currentLocationData.country}` : 
            'Istanbul, Turkey';
        
        return {
            location: locationName,
            current: {
                temp: parseInt(current.temp_C),
                feelsLike: parseInt(current.FeelsLikeC),
                descriptionKey: mapWeatherDescription(current.weatherDesc[0].value),
                icon: mapWeatherIcon(current.weatherCode),
                humidity: parseInt(current.humidity),
                pressure: parseInt(current.pressure),
                visibility: parseInt(current.visibility),
                windSpeed: parseInt(current.windspeedKmph),
                windDirection: current.winddir16Point
            },
            forecast: weather.slice(0, 5).map((day, index) => ({
                dayKey: index === 0 ? 'today' : null,
                day: index === 0 ? null : getDayAbbreviation(index),
                icon: mapWeatherIcon(day.hourly[4].weatherCode),
                high: parseInt(day.maxtempC),
                low: parseInt(day.mintempC)
            }))
        };
    } catch (error) {
        console.log('❌ Error parsing wttr.in data:', error);
        return null;
    }
}

function mapOpenMeteoWeatherCode(code) {
    const codeMap = {
        0: '01d',
        1: '01d',
        2: '02d',
        3: '03d',
        45: '50d',
        48: '50d',
        51: '09d',
        53: '09d',
        55: '09d',
        61: '10d',
        63: '10d',
        65: '10d',
        80: '09d',
        81: '09d',
        82: '09d',
        95: '11d',
        96: '11d',
        99: '11d'
    };
    
    return codeMap[code] || '01d';
}

function getWeatherDescriptionFromCode(code) {
    const descriptions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with hail',
        99: 'Thunderstorm with heavy hail'
    };
    
    return descriptions[code] || 'Clear sky';
}

function parsePublicWeatherData(data) {
    try {
        if (data.current_condition) {
            const current = data.current_condition[0];
            return {
                location: 'Istanbul, Turkey',
                current: {
                    temp: parseInt(current.temp_C),
                    feelsLike: parseInt(current.FeelsLikeC),
                    descriptionKey: mapWeatherDescription(current.weatherDesc[0].value),
                    icon: mapWeatherIcon(current.weatherCode),
                    humidity: parseInt(current.humidity),
                    pressure: parseInt(current.pressure),
                    visibility: parseInt(current.visibility),
                    windSpeed: parseInt(current.windspeedKmph),
                    windDirection: current.winddir16Point
                },
                forecast: generateRealisticForecast(parseInt(current.temp_C))
            };
        }
    } catch (error) {
        console.log('Error parsing public weather data:', error);
    }
    return null;
}

async function fetchFromWeatherAPI() {
    try {
        console.log('🔑 Checking WeatherAPI key...');
        
        if (WEATHER_CONFIG.weatherApiKey === 'YOUR_API_KEY_HERE') {
            console.log('❌ WeatherAPI key not configured. Get yours from: https://www.weatherapi.com/');
            return null;
        }
        
        console.log('✅ WeatherAPI key found, making request...');
        
        const currentUrl = `${WEATHER_CONFIG.weatherApiUrl}/current.json?key=${WEATHER_CONFIG.weatherApiKey}&q=${WEATHER_CONFIG.city}&aqi=no`;
        const forecastUrl = `${WEATHER_CONFIG.weatherApiUrl}/forecast.json?key=${WEATHER_CONFIG.weatherApiKey}&q=${WEATHER_CONFIG.city}&days=5&aqi=no`;
        
        console.log('📡 Current URL:', currentUrl);
        console.log('📡 Forecast URL:', forecastUrl);
        
        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(currentUrl),
            fetch(forecastUrl)
        ]);
        
        console.log('📊 Current response status:', currentResponse.status);
        console.log('📊 Forecast response status:', forecastResponse.status);
        
        if (!currentResponse.ok || !forecastResponse.ok) {
            console.log('❌ WeatherAPI request failed:', currentResponse.status, forecastResponse.status);
            
            const currentError = await currentResponse.text();
            const forecastError = await forecastResponse.text();
            console.log('❌ Current error:', currentError);
            console.log('❌ Forecast error:', forecastError);
            
            throw new Error('WeatherAPI request failed');
        }
        
        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();
        
        console.log('🌤️ WeatherAPI current data:', currentData);
        console.log('📅 WeatherAPI forecast data:', forecastData);
        
        return {
            location: `${currentData.location.name}, ${currentData.location.country}`,
            current: {
                temp: Math.round(currentData.current.temp_c),
                feelsLike: Math.round(currentData.current.feelslike_c),
                descriptionKey: mapWeatherDescription(currentData.current.condition.text),
                icon: mapWeatherIconFromCondition(currentData.current.condition.code, currentData.current.is_day),
                humidity: currentData.current.humidity,
                pressure: currentData.current.pressure_mb,
                visibility: currentData.current.vis_km,
                windSpeed: currentData.current.wind_kph,
                windDirection: currentData.current.wind_dir
            },
            forecast: forecastData.forecast.forecastday.map((day, index) => ({
                dayKey: index === 0 ? 'today' : null,
                day: index === 0 ? null : getDayAbbreviation(index),
                icon: mapWeatherIconFromCondition(day.day.condition.code, 1),
                high: Math.round(day.day.maxtemp_c),
                low: Math.round(day.day.mintemp_c)
            }))
        };
    } catch (error) {
        console.log('❌ WeatherAPI failed with error:', error);
        return null;
    }
}

async function fetchFromOpenWeather() {
    try {
        if (WEATHER_CONFIG.openWeatherKey === 'YOUR_API_KEY_HERE') {
            console.log('OpenWeatherMap key not configured. Get yours from: https://openweathermap.org/api');
            return null;
        }
        
        const currentUrl = `${WEATHER_CONFIG.openWeatherUrl}/weather?q=${WEATHER_CONFIG.city}&appid=${WEATHER_CONFIG.openWeatherKey}&units=metric`;
        const forecastUrl = `${WEATHER_CONFIG.openWeatherUrl}/forecast?q=${WEATHER_CONFIG.city}&appid=${WEATHER_CONFIG.openWeatherKey}&units=metric`;
        
        const [currentResponse, forecastResponse] = await Promise.all([
            fetch(currentUrl),
            fetch(forecastUrl)
        ]);
        
        if (!currentResponse.ok || !forecastResponse.ok) {
            throw new Error('OpenWeatherMap request failed');
        }
        
        const currentData = await currentResponse.json();
        const forecastData = await forecastResponse.json();
        
        const dailyForecast = [];
        const processedDays = new Set();
        
        forecastData.list.forEach((item, index) => {
            const date = new Date(item.dt * 1000);
            const dateStr = date.toDateString();
            
            if (!processedDays.has(dateStr) && dailyForecast.length < 4) {
                const hour = date.getHours();
                if (hour >= 11 && hour <= 13) {
                    dailyForecast.push({
                        dayKey: dailyForecast.length === 0 ? 'today' : null,
                        day: dailyForecast.length === 0 ? null : getDayAbbreviation(dailyForecast.length),
                        icon: item.weather[0].icon,
                        high: Math.round(item.main.temp_max),
                        low: Math.round(item.main.temp_min)
                    });
                    processedDays.add(dateStr);
                }
            }
        });
        
        return {
            location: `${currentData.name}, ${currentData.sys.country}`,
            current: {
                temp: Math.round(currentData.main.temp),
                feelsLike: Math.round(currentData.main.feels_like),
                descriptionKey: mapWeatherDescription(currentData.weather[0].description),
                icon: currentData.weather[0].icon,
                humidity: currentData.main.humidity,
                pressure: currentData.main.pressure,
                visibility: currentData.visibility / 1000,
                windSpeed: Math.round(currentData.wind.speed * 3.6),
                windDirection: getWindDirection(currentData.wind.deg)
            },
            forecast: dailyForecast
        };
    } catch (error) {
        console.log('OpenWeatherMap failed:', error);
        return null;
    }
}

const weatherConditions = {
    '01d': { icon: 'fas fa-sun', class: 'weather-sunny', descKey: 'weather-sunny' },
    '01n': { icon: 'fas fa-moon', class: 'weather-clear', descKey: 'weather-clear' },
    '02d': { icon: 'fas fa-cloud-sun', class: 'weather-partly-cloudy', descKey: 'weather-cloudy' },
    '02n': { icon: 'fas fa-cloud-moon', class: 'weather-partly-cloudy', descKey: 'weather-cloudy' },
    '03d': { icon: 'fas fa-cloud', class: 'weather-cloudy', descKey: 'weather-cloudy' },
    '03n': { icon: 'fas fa-cloud', class: 'weather-cloudy', descKey: 'weather-cloudy' },
    '04d': { icon: 'fas fa-cloud', class: 'weather-cloudy', descKey: 'weather-cloudy' },
    '04n': { icon: 'fas fa-cloud', class: 'weather-cloudy', descKey: 'weather-cloudy' },
    '09d': { icon: 'fas fa-cloud-rain', class: 'weather-rainy', descKey: 'weather-rainy' },
    '09n': { icon: 'fas fa-cloud-rain', class: 'weather-rainy', descKey: 'weather-rainy' },
    '10d': { icon: 'fas fa-cloud-sun-rain', class: 'weather-rainy', descKey: 'weather-rainy' },
    '10n': { icon: 'fas fa-cloud-moon-rain', class: 'weather-rainy', descKey: 'weather-rainy' },
    '11d': { icon: 'fas fa-bolt', class: 'weather-stormy', descKey: 'weather-stormy' },
    '11n': { icon: 'fas fa-bolt', class: 'weather-stormy', descKey: 'weather-stormy' },
    '13d': { icon: 'fas fa-snowflake', class: 'weather-snowy', descKey: 'weather-snowy' },
    '13n': { icon: 'fas fa-snowflake', class: 'weather-snowy', descKey: 'weather-snowy' },
    '50d': { icon: 'fas fa-smog', class: 'weather-misty', descKey: 'weather-misty' },
    '50n': { icon: 'fas fa-smog', class: 'weather-misty', descKey: 'weather-misty' }
};

function mapWeatherIconFromCondition(code, isDay) {
    const conditionMap = {
        1000: isDay ? '01d' : '01n',
        1003: isDay ? '02d' : '02n',
        1006: '03d',
        1009: '04d',
        1030: '50d',
        1063: '10d',
        1066: '13d',
        1069: '13d',
        1072: '09d',
        1087: '11d',
        1114: '13d',
        1117: '13d',
        1135: '50d',
        1147: '50d',
        1150: '09d',
        1153: '09d',
        1168: '09d',
        1171: '09d',
        1180: '10d',
        1183: '10d',
        1186: '10d',
        1189: '10d',
        1192: '10d',
        1195: '10d',
        1198: '09d',
        1201: '09d',
        1204: '13d',
        1207: '13d',
        1210: '13d',
        1213: '13d',
        1216: '13d',
        1219: '13d',
        1222: '13d',
        1225: '13d',
        1237: '13d',
        1240: '09d',
        1243: '09d',
        1246: '09d',
        1249: '13d',
        1252: '13d',
        1255: '13d',
        1258: '13d',
        1261: '13d',
        1264: '13d',
        1273: '11d',
        1276: '11d',
        1279: '11d',
        1282: '11d'
    };
    
    return conditionMap[code] || (isDay ? '01d' : '01n');
}

function getWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
}

function getRandomWeatherCondition() {
    const conditions = ['weather-sunny', 'weather-cloudy', 'weather-rainy', 'weather-partly-cloudy'];
    return conditions[Math.floor(Math.random() * conditions.length)];
}

function getRandomWeatherIcon() {
    const icons = ['01d', '02d', '03d', '04d', '09d', '10d', '11d'];
    return icons[Math.floor(Math.random() * icons.length)];
}

function getRandomWindDirection() {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.floor(Math.random() * directions.length)];
}

function generateRandomForecast() {
    const forecast = [];
    
    for (let i = 0; i < 4; i++) {
        forecast.push({
            dayKey: i === 0 ? 'today' : null,
            day: i === 0 ? null : getDayAbbreviation(i),
            icon: getRandomWeatherIcon(),
            high: Math.floor(Math.random() * 15) + 20,
            low: Math.floor(Math.random() * 10) + 10
        });
    }
    
    return forecast;
}

function getDayAbbreviation(dayOffset) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + dayOffset);
    return days[targetDate.getDay()];
}

function mapWeatherDescription(description) {
    const desc = description.toLowerCase();
    if (desc.includes('sunny') || desc.includes('clear')) return 'weather-sunny';
    if (desc.includes('cloud')) return 'weather-cloudy';
    if (desc.includes('rain') || desc.includes('shower')) return 'weather-rainy';
    if (desc.includes('storm') || desc.includes('thunder')) return 'weather-stormy';
    if (desc.includes('snow')) return 'weather-snowy';
    if (desc.includes('mist') || desc.includes('fog')) return 'weather-misty';
    return 'weather-sunny';
}

function mapWeatherIcon(weatherCode) {
    const code = parseInt(weatherCode);
    if (code >= 200 && code < 300) return '11d';
    if (code >= 300 && code < 400) return '09d';
    if (code >= 500 && code < 600) return '10d';
    if (code >= 600 && code < 700) return '13d';
    if (code >= 700 && code < 800) return '50d';
    if (code === 800) return '01d';
    if (code > 800) return '02d';
    return '01d';
}

function initWeatherWidget() {
    loadWeatherData();
    weatherUpdateInterval = setInterval(loadWeatherData, 1800000);
}

async function fetchWeatherFromRSS() {
    try {
        const rssUrl = 'https://www.mgm.gov.tr/forecast/rss.aspx?m=istanbul';
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        
        const response = await fetch(proxyUrl + encodeURIComponent(rssUrl));
        if (!response.ok) throw new Error('RSS fetch failed');
        
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        const items = xmlDoc.querySelectorAll('item');
        if (items.length > 0) {
            const title = items[0].querySelector('title').textContent;
            const description = items[0].querySelector('description').textContent;
            
            const tempMatch = description.match(/(\d+)°C/);
            const temp = tempMatch ? parseInt(tempMatch[1]) : 25;
            
            return {
                location: 'Istanbul, Turkey',
                current: {
                    temp: temp,
                    feelsLike: temp + 2,
                    descriptionKey: extractWeatherFromText(description),
                    icon: getIconFromTemp(temp),
                    humidity: 65,
                    pressure: 1013,
                    visibility: 10,
                    windSpeed: 12,
                    windDirection: 'NW'
                },
                forecast: generateRandomForecast()
            };
        }
    } catch (error) {
        console.log('RSS weather fetch failed:', error);
    }
    return null;
}

function extractWeatherFromText(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('güneşli') || lowerText.includes('açık')) return 'weather-sunny';
    if (lowerText.includes('bulutlu')) return 'weather-cloudy';
    if (lowerText.includes('yağmur')) return 'weather-rainy';
    if (lowerText.includes('kar')) return 'weather-snowy';
    return 'weather-sunny';
}

function getIconFromTemp(temp) {
    if (temp > 25) return '01d';
    if (temp > 15) return '02d';
    if (temp > 5) return '03d';
    return '13d';
}

function updateWeatherDisplay() {
    if (!window.weatherData) {
        console.log('❌ No weather data available');
        return;
    }
    
    console.log('🔄 Updating weather display...', window.weatherData);
    
    const { current, forecast, location } = window.weatherData;
    
    const locationElement = document.getElementById('weatherLocation');
    if (locationElement) {
        locationElement.textContent = location;
    }
    
    const tempElement = document.getElementById('tempValue');
    if (tempElement) {
        tempElement.textContent = Math.round(current.temp);
    }
    
    const weatherDesc = document.getElementById('weatherDescription');
    if (weatherDesc && current.descriptionKey && translations[getCurrentLanguage()][current.descriptionKey]) {
        weatherDesc.textContent = translations[getCurrentLanguage()][current.descriptionKey];
        weatherDesc.setAttribute('data-tr', current.descriptionKey);
    }
    
    const feelsLikeElement = document.getElementById('feelsLike');
    if (feelsLikeElement) {
        feelsLikeElement.textContent = `${Math.round(current.feelsLike)}°C`;
    }
    
    const condition = weatherConditions[current.icon] || weatherConditions['01d'];
    const weatherIcon = document.getElementById('weatherIcon');
    if (weatherIcon) {
        weatherIcon.innerHTML = `<i class="${condition.icon}"></i>`;
    }
    
    const weatherContainer = document.querySelector('.weather-container');
    if (weatherContainer) {
        weatherContainer.className = weatherContainer.className.replace(/weather-\w+/g, '');
        weatherContainer.classList.add(condition.class);
    }
    
    const visibilityElement = document.getElementById('visibility');
    if (visibilityElement) {
        visibilityElement.textContent = `${current.visibility} km`;
    }
    
    const humidityElement = document.getElementById('humidity');
    if (humidityElement) {
        humidityElement.textContent = `${current.humidity}%`;
    }
    
    const windSpeedElement = document.getElementById('windSpeed');
    if (windSpeedElement) {
        windSpeedElement.textContent = `${current.windSpeed} km/h`;
    }
    
    const pressureElement = document.getElementById('pressure');
    if (pressureElement) {
        pressureElement.textContent = `${current.pressure} hPa`;
    }
    
    console.log('📊 Updating forecast with:', forecast);
    updateForecast(forecast);
    
    const updateTimeElement = document.getElementById('weatherUpdateTime');
    if (updateTimeElement) {
        updateTimeElement.textContent = translations[getCurrentLanguage()]['updated-now'] || 'Updated now';
    }
    
    console.log('✅ Weather display updated successfully');
}

function updateForecast(forecast) {
    const forecastContainer = document.getElementById('forecastContainer');
    if (!forecastContainer) {
        console.log('❌ Forecast container not found');
        return;
    }
    
    if (!forecast || !Array.isArray(forecast)) {
        console.log('❌ Invalid forecast data:', forecast);
        return;
    }
    
    console.log('📅 Updating forecast items:', forecast);
    forecastContainer.innerHTML = '';
    
    forecast.forEach((day, index) => {
        const condition = weatherConditions[day.icon] || weatherConditions['01d'];
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        
        let dayName;
        if (day.dayKey) {
            dayName = translations[getCurrentLanguage()][day.dayKey] || day.dayKey;
        } else if (day.day && translations[getCurrentLanguage()]['day-names'] && translations[getCurrentLanguage()]['day-names'][day.day]) {
            dayName = translations[getCurrentLanguage()]['day-names'][day.day];
        } else {
            dayName = day.day || `Day ${index + 1}`;
        }
        
        console.log(`📅 Day ${index}: ${dayName}, High: ${day.high}°, Low: ${day.low}°, Icon: ${day.icon}`);
        
        forecastItem.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <div class="forecast-icon">
                <i class="${condition.icon}"></i>
            </div>
            <div class="forecast-temps">
                <div class="forecast-high">${day.high}°</div>
                <div class="forecast-low">${day.low}°</div>
            </div>
        `;
        
        forecastContainer.appendChild(forecastItem);
    });
    
    console.log('✅ Forecast updated successfully');
}

const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

function getUserLocationWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                console.log(`User location: ${latitude}, ${longitude}`);
                loadWeatherData();
            },
            (error) => {
                console.log('Location access denied, using default city');
                loadWeatherData();
            }
        );
    } else {
        loadWeatherData();
    }
}

function getMotivationalMessage(condition) {
    const messages = {
        sunny: [
            "☀️ Perfect day to achieve your goals!",
            "🌟 Sunshine and success await you!",
            "✨ Let your brilliance shine like the sun!"
        ],
        cloudy: [
            "☁️ Every cloud has a silver lining!",
            "🌤️ Great things happen on cloudy days too!",
            "💪 Turn this cloudy day into opportunity!"
        ],
        rainy: [
            "🌧️ Rain brings growth and new beginnings!",
            "💧 Perfect weather for reflection and planning!",
            "🌱 Let this rain nurture your dreams!"
        ],
        snowy: [
            "❄️ Every snowflake is unique, just like you!",
            "⛄ Winter is the time for warm achievements!",
            "🏔️ Cool weather, hot productivity!"
        ]
    };
    
    const conditionType = condition.includes('sunny') ? 'sunny' :
                         condition.includes('cloudy') ? 'cloudy' :
                         condition.includes('rainy') ? 'rainy' :
                         condition.includes('snowy') ? 'snowy' : 'sunny';
    
    const messageArray = messages[conditionType];
    return messageArray[Math.floor(Math.random() * messageArray.length)];
}

function showWeatherMotivation() {
    if (!weatherData) return;
    
    const condition = weatherConditions[weatherData.current.icon]?.class || 'sunny';
    const message = getMotivationalMessage(condition);
    
    console.log(message);
}

function cleanupWeatherWidget() {
    if (weatherUpdateInterval) {
        clearInterval(weatherUpdateInterval);
        weatherUpdateInterval = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('weatherWidget')) {
        setTimeout(initWeatherWidget, 500);
    }
});

window.addEventListener('beforeunload', cleanupWeatherWidget);
