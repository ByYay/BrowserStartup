const WEATHER_CACHE_TTL = 30 * 60 * 1000;      // 30 dakika
const LOCATION_CACHE_TTL = 24 * 60 * 60 * 1000; // 1 gün

const WEATHER_CONFIG = {
    weatherApiKey: localStorage.getItem('weatherApiKey') || '',
    weatherApiUrl: 'https://api.weatherapi.com/v1'
};

const DEFAULT_LOCATION = {
    city: 'Istanbul',
    country: 'Turkey',
    latitude: 41.0082,
    longitude: 28.9784
};

let weatherState = { status: 'loading', data: null };
let weatherInitialized = false;
let weatherUpdateInterval = null;
let weatherRequest = null;
let locationRequest = null;

// ---------- Önbellek yardımcıları ----------

function readCache(key, ttl) {
    try {
        const entry = JSON.parse(localStorage.getItem(key));
        if (entry && Date.now() - entry.timestamp < ttl) return entry.data;
    } catch (e) {
        // Bozuk önbellek: yok say
    }
    return null;
}

function writeCache(key, data) {
    localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
}

function clearWeatherCache() {
    localStorage.removeItem('weatherCache');
}

// ---------- Konum (IP tabanlı, günde en fazla bir kez) ----------

const IP_LOCATION_SERVICES = [
    {
        url: 'https://ipapi.co/json/',
        parse: d => ({ city: d.city, country: d.country_name, latitude: d.latitude, longitude: d.longitude })
    },
    {
        url: 'https://ipwho.is/',
        parse: d => ({ city: d.city, country: d.country, latitude: d.latitude, longitude: d.longitude })
    }
];

async function fetchLocationFromIP() {
    for (const service of IP_LOCATION_SERVICES) {
        try {
            const response = await fetch(service.url);
            if (!response.ok) continue;
            const location = service.parse(await response.json());
            if (location.city && Number.isFinite(location.latitude) && Number.isFinite(location.longitude)) {
                return location;
            }
        } catch (e) {
            // Sıradaki servisi dene
        }
    }
    return null;
}

function getUserLocation() {
    const cached = readCache('weatherLocation', LOCATION_CACHE_TTL);
    if (cached) return Promise.resolve(cached);
    if (locationRequest) return locationRequest;

    locationRequest = fetchLocationFromIP().then(location => {
        locationRequest = null;
        if (!location) return DEFAULT_LOCATION;
        writeCache('weatherLocation', location);
        updateLocationForThemes(location.latitude, location.longitude);
        return location;
    });
    return locationRequest;
}

// Otomatik tema konumu önbellekten zaten okur (themes.js); önbellek yoksa ya da
// süresi dolduysa günde bir kez IP'den konum al
function initWeatherLocationForTheme() {
    if (currentTheme === 'auto' && !readCache('weatherLocation', LOCATION_CACHE_TTL)) {
        getUserLocation();
    }
}

// ---------- Hava durumu kaynakları ----------

const WEATHER_CONDITIONS = {
    '01d': { icon: 'fas fa-sun', class: 'weather-sunny' },
    '01n': { icon: 'fas fa-moon', class: 'weather-clear' },
    '02d': { icon: 'fas fa-cloud-sun', class: 'weather-partly-cloudy' },
    '02n': { icon: 'fas fa-cloud-moon', class: 'weather-partly-cloudy' },
    '03d': { icon: 'fas fa-cloud', class: 'weather-cloudy' },
    '04d': { icon: 'fas fa-cloud', class: 'weather-cloudy' },
    '09d': { icon: 'fas fa-cloud-rain', class: 'weather-rainy' },
    '10d': { icon: 'fas fa-cloud-sun-rain', class: 'weather-rainy' },
    '10n': { icon: 'fas fa-cloud-moon-rain', class: 'weather-rainy' },
    '11d': { icon: 'fas fa-bolt', class: 'weather-stormy' },
    '13d': { icon: 'fas fa-snowflake', class: 'weather-snowy' },
    '50d': { icon: 'fas fa-smog', class: 'weather-misty' }
};
const WEATHER_CONDITION_CLASSES = [...new Set(Object.values(WEATHER_CONDITIONS).map(c => c.class))];

// Open-Meteo WMO kodları → [ikon, açıklama anahtarı]
function mapOpenMeteoCode(code, isDay) {
    if (code === 0 || code === 1) return [isDay ? '01d' : '01n', isDay ? 'weather-sunny' : 'weather-clear'];
    if (code === 2) return [isDay ? '02d' : '02n', 'weather-partly-cloudy'];
    if (code === 3) return ['04d', 'weather-cloudy'];
    if (code === 45 || code === 48) return ['50d', 'weather-misty'];
    if (code >= 51 && code <= 57) return ['09d', 'weather-rainy'];
    if (code >= 61 && code <= 67) return [isDay ? '10d' : '10n', 'weather-rainy'];
    if (code >= 71 && code <= 77) return ['13d', 'weather-snowy'];
    if (code >= 80 && code <= 82) return ['09d', 'weather-rainy'];
    if (code === 85 || code === 86) return ['13d', 'weather-snowy'];
    if (code >= 95) return ['11d', 'weather-stormy'];
    return [isDay ? '01d' : '01n', 'weather-sunny'];
}

// WeatherAPI.com koşul kodları → ikon
function mapWeatherApiCode(code, isDay) {
    if (code === 1000) return isDay ? '01d' : '01n';
    if (code === 1003) return isDay ? '02d' : '02n';
    if (code === 1006 || code === 1009) return '04d';
    if ([1030, 1135, 1147].includes(code)) return '50d';
    if ([1087, 1273, 1276, 1279, 1282].includes(code)) return '11d';
    if ([1066, 1069, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237,
         1249, 1252, 1255, 1258, 1261, 1264].includes(code)) return '13d';
    if ([1072, 1150, 1153, 1168, 1171, 1198, 1201, 1240, 1243, 1246].includes(code)) return '09d';
    if (code >= 1063) return isDay ? '10d' : '10n';
    return isDay ? '01d' : '01n';
}

function mapWeatherDescription(description) {
    const desc = (description || '').toLowerCase();
    if (desc.includes('thunder') || desc.includes('storm')) return 'weather-stormy';
    if (desc.includes('snow') || desc.includes('sleet') || desc.includes('ice')) return 'weather-snowy';
    if (desc.includes('rain') || desc.includes('drizzle') || desc.includes('shower')) return 'weather-rainy';
    if (desc.includes('mist') || desc.includes('fog')) return 'weather-misty';
    if (desc.includes('partly')) return 'weather-partly-cloudy';
    if (desc.includes('cloud') || desc.includes('overcast')) return 'weather-cloudy';
    if (desc.includes('clear')) return 'weather-clear';
    return 'weather-sunny';
}

function mapWttrCode(code) {
    const c = parseInt(code, 10);
    if (c === 113) return '01d';
    if (c === 116) return '02d';
    if (c === 119 || c === 122) return '04d';
    if ([143, 248, 260].includes(c)) return '50d';
    if ([200, 386, 389, 392, 395].includes(c)) return '11d';
    if ([179, 182, 185, 227, 230, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(c)) return '13d';
    return '10d';
}

async function fetchFromWeatherAPI(location) {
    const url = `${WEATHER_CONFIG.weatherApiUrl}/forecast.json?key=${encodeURIComponent(WEATHER_CONFIG.weatherApiKey)}` +
        `&q=${location.latitude},${location.longitude}&days=5&aqi=no`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`WeatherAPI ${response.status}`);
    const data = await response.json();

    return {
        location: `${data.location.name}, ${data.location.country}`,
        current: {
            temp: data.current.temp_c,
            feelsLike: data.current.feelslike_c,
            descriptionKey: mapWeatherDescription(data.current.condition.text),
            icon: mapWeatherApiCode(data.current.condition.code, data.current.is_day),
            humidity: data.current.humidity,
            pressure: data.current.pressure_mb,
            visibility: data.current.vis_km,
            windSpeed: data.current.wind_kph
        },
        forecast: data.forecast.forecastday.map(day => ({
            date: day.date,
            icon: mapWeatherApiCode(day.day.condition.code, 1),
            high: day.day.maxtemp_c,
            low: day.day.mintemp_c
        }))
    };
}

async function fetchFromOpenMeteo(location) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}` +
        '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,surface_pressure,wind_speed_10m,visibility' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5';
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Open-Meteo ${response.status}`);
    const { current, daily } = await response.json();
    const [icon, descriptionKey] = mapOpenMeteoCode(current.weather_code, current.is_day);

    return {
        location: `${location.city}, ${location.country}`,
        current: {
            temp: current.temperature_2m,
            feelsLike: current.apparent_temperature,
            descriptionKey,
            icon,
            humidity: current.relative_humidity_2m,
            pressure: current.surface_pressure,
            visibility: Number.isFinite(current.visibility) ? current.visibility / 1000 : null,
            windSpeed: current.wind_speed_10m
        },
        forecast: daily.time.map((date, i) => ({
            date,
            icon: mapOpenMeteoCode(daily.weather_code[i], 1)[0],
            high: daily.temperature_2m_max[i],
            low: daily.temperature_2m_min[i]
        }))
    };
}

async function fetchFromWttr(location) {
    const response = await fetch(`https://wttr.in/${location.latitude},${location.longitude}?format=j1`);
    if (!response.ok) throw new Error(`wttr.in ${response.status}`);
    const data = await response.json();
    const current = data.current_condition[0];

    return {
        location: `${location.city}, ${location.country}`,
        current: {
            temp: parseInt(current.temp_C, 10),
            feelsLike: parseInt(current.FeelsLikeC, 10),
            descriptionKey: mapWeatherDescription(current.weatherDesc[0].value),
            icon: mapWttrCode(current.weatherCode),
            humidity: parseInt(current.humidity, 10),
            pressure: parseInt(current.pressure, 10),
            visibility: parseInt(current.visibility, 10),
            windSpeed: parseInt(current.windspeedKmph, 10)
        },
        forecast: data.weather.map(day => ({
            date: day.date,
            icon: mapWttrCode(day.hourly[4].weatherCode),
            high: parseInt(day.maxtempC, 10),
            low: parseInt(day.mintempC, 10)
        }))
    };
}

async function fetchWeather(location) {
    const sources = [fetchFromOpenMeteo, fetchFromWttr];
    if (WEATHER_CONFIG.weatherApiKey) sources.unshift(fetchFromWeatherAPI);

    for (const source of sources) {
        try {
            return await source(location);
        } catch (error) {
            console.warn('Weather source failed:', error.message);
        }
    }
    return null;
}

async function loadWeatherData({ force = false } = {}) {
    if (!force) {
        const cached = readCache('weatherCache', WEATHER_CACHE_TTL);
        if (cached) {
            weatherState = { status: 'ready', data: cached };
            updateWeatherDisplay();
            return;
        }
    }
    if (weatherRequest) return weatherRequest;

    weatherRequest = (async () => {
        const location = await getUserLocation();
        const data = await fetchWeather(location);
        if (data) {
            data.updatedAt = Date.now();
            writeCache('weatherCache', data);
            weatherState = { status: 'ready', data };
        } else if (weatherState.status !== 'ready') {
            // Gerçek veri yoksa uydurma veri göstermek yerine "alınamadı" durumuna geç
            weatherState = { status: 'error', data: null };
        }
        updateWeatherDisplay();
    })().finally(() => {
        weatherRequest = null;
    });
    return weatherRequest;
}

function initWeatherWidget() {
    if (weatherInitialized) {
        // Sekmeye dönüldüğünde önbellek bayatsa yenile
        loadWeatherData();
        return;
    }
    weatherInitialized = true;
    loadWeatherData();
    weatherUpdateInterval = setInterval(() => {
        // Gizli sekmede boşuna istek atma; görünür olunca önbellek kontrolü yapılır
        if (!document.hidden) loadWeatherData();
    }, WEATHER_CACHE_TTL);
}

// ---------- Görüntüleme ----------

function formatWeatherValue(value, unit) {
    return Number.isFinite(value) ? `${Math.round(value)}${unit}` : '--';
}

function getForecastDayName(dateString) {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (dateString === todayKey) return t('today');

    const [year, month, day] = dateString.split('-').map(Number);
    const englishDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(year, month - 1, day).getDay()];
    return t('day-names')[englishDay];
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setWeatherIcon(container, iconClass) {
    const icon = document.createElement('i');
    icon.className = iconClass;
    container.replaceChildren(icon);
}

function updateWeatherDisplay() {
    const container = document.querySelector('.weather-container');
    container.classList.remove(...WEATHER_CONDITION_CLASSES);

    if (weatherState.status !== 'ready') {
        const isError = weatherState.status === 'error';
        setText('weatherLocation', '--');
        setText('tempValue', '--');
        setText('weatherDescription', t(isError ? 'weather-unavailable' : 'weather-loading'));
        setText('feelsLike', '--');
        ['visibility', 'humidity', 'windSpeed', 'pressure'].forEach(id => setText(id, '--'));
        setText('weatherUpdateTime', '');
        setWeatherIcon(document.getElementById('weatherIcon'), isError ? 'fas fa-circle-exclamation' : 'fas fa-spinner fa-spin');
        document.getElementById('forecastContainer').replaceChildren();
        return;
    }

    const { current, forecast, location, updatedAt } = weatherState.data;
    const condition = WEATHER_CONDITIONS[current.icon] || WEATHER_CONDITIONS['01d'];

    setText('weatherLocation', location);
    setText('tempValue', Number.isFinite(current.temp) ? Math.round(current.temp) : '--');
    setText('weatherDescription', t(current.descriptionKey));
    setText('feelsLike', formatWeatherValue(current.feelsLike, '°C'));
    setText('visibility', formatWeatherValue(current.visibility, ' km'));
    setText('humidity', formatWeatherValue(current.humidity, '%'));
    setText('windSpeed', formatWeatherValue(current.windSpeed, ' km/h'));
    setText('pressure', formatWeatherValue(current.pressure, ' hPa'));
    setWeatherIcon(document.getElementById('weatherIcon'), condition.icon);
    container.classList.add(condition.class);

    const minutesAgo = (Date.now() - updatedAt) / 60000;
    setText('weatherUpdateTime', minutesAgo < 1
        ? t('updated-now')
        : t('updated-at', { time: new Date(updatedAt).toLocaleTimeString(t('locale'), { hour: '2-digit', minute: '2-digit' }) }));

    updateForecast(forecast);
}

function updateForecast(forecast) {
    const forecastContainer = document.getElementById('forecastContainer');
    forecastContainer.replaceChildren();

    forecast.slice(0, 5).forEach(day => {
        const condition = WEATHER_CONDITIONS[day.icon] || WEATHER_CONDITIONS['01d'];
        const item = document.createElement('div');
        item.className = 'forecast-item';

        const dayName = document.createElement('div');
        dayName.className = 'forecast-day';
        dayName.textContent = getForecastDayName(day.date);

        const iconWrap = document.createElement('div');
        iconWrap.className = 'forecast-icon';
        setWeatherIcon(iconWrap, condition.icon);

        const temps = document.createElement('div');
        temps.className = 'forecast-temps';
        const high = document.createElement('div');
        high.className = 'forecast-high';
        high.textContent = formatWeatherValue(day.high, '°');
        const low = document.createElement('div');
        low.className = 'forecast-low';
        low.textContent = formatWeatherValue(day.low, '°');
        temps.append(high, low);

        item.append(dayName, iconWrap, temps);
        forecastContainer.appendChild(item);
    });
}
