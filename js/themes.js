const THEMES = ['auto', 'light', 'dark', 'midnight'];

let currentTheme = localStorage.getItem('theme');
if (!THEMES.includes(currentTheme)) {
    currentTheme = 'auto';
}

let sunriseTime = null;
let sunsetTime = null;
let sunTimesDate = null;
let autoThemeInterval = null;
let sunTimesRequest = null;
let currentLatitude = 41.0082; // Varsayılan: İstanbul
let currentLongitude = 28.9784;

// Önbellek koordinata göre tutulur; konum ~10 km değişmedikçe aynı gün tekrar istek atılmaz
function sunCacheKey() {
    return `${currentLatitude.toFixed(1)},${currentLongitude.toFixed(1)}`;
}

function getDefaultSunTimes() {
    const now = new Date();
    return {
        sunrise: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0),
        sunset: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 30)
    };
}

function getCachedSunTimes() {
    try {
        const data = JSON.parse(localStorage.getItem('sunTimes'));
        if (data && data.date === new Date().toDateString() && data.location === sunCacheKey()) {
            return { sunrise: new Date(data.sunrise), sunset: new Date(data.sunset) };
        }
    } catch (e) {
        // Bozuk önbellek: yok say, yeniden alınacak
    }
    return null;
}

function cacheSunTimes(sunrise, sunset) {
    localStorage.setItem('sunTimes', JSON.stringify({
        date: new Date().toDateString(),
        location: sunCacheKey(),
        sunrise: sunrise.toISOString(),
        sunset: sunset.toISOString()
    }));
}

function updateLocationForThemes(lat, lng) {
    currentLatitude = Number(lat);
    currentLongitude = Number(lng);
    if (currentTheme === 'auto') {
        loadSunTimes();
    }
}

async function fetchSunriseSunsetTimes() {
    try {
        const response = await fetch(`https://api.sunrise-sunset.org/json?lat=${currentLatitude}&lng=${currentLongitude}&formatted=0`);
        const data = await response.json();
        if (data.status === 'OK') {
            const sunrise = new Date(data.results.sunrise);
            const sunset = new Date(data.results.sunset);
            cacheSunTimes(sunrise, sunset);
            return { sunrise, sunset };
        }
    } catch (error) {
        console.warn('Sunrise/sunset fetch failed:', error);
    }
    return null;
}

// Önce önbellek ya da varsayılan saatlerle hemen uygular; önbellek yoksa arka planda bir kez API'ye sorar
function loadSunTimes() {
    const cached = getCachedSunTimes();
    const times = cached || getDefaultSunTimes();
    sunriseTime = times.sunrise;
    sunsetTime = times.sunset;
    sunTimesDate = new Date().toDateString();
    applyAutoTheme();

    if (cached || sunTimesRequest) return;

    sunTimesRequest = fetchSunriseSunsetTimes().then(fresh => {
        sunTimesRequest = null;
        if (fresh) {
            sunriseTime = fresh.sunrise;
            sunsetTime = fresh.sunset;
            applyAutoTheme();
        }
    });
}

function getAutoTheme() {
    if (!sunriseTime || !sunsetTime) return 'light';
    const now = Date.now();
    return now >= sunriseTime.getTime() && now < sunsetTime.getTime() ? 'light' : 'dark';
}

function applyThemeClasses(theme) {
    [document.documentElement, document.body].forEach(el => {
        el.classList.remove('dark-mode', 'midnight-mode');
        if (theme === 'dark') el.classList.add('dark-mode');
        if (theme === 'midnight') el.classList.add('midnight-mode');
    });
}

function applyAutoTheme() {
    if (currentTheme !== 'auto') return;
    applyThemeClasses(getAutoTheme());
}

function initAutoTheme() {
    loadSunTimes();
    if (autoThemeInterval) clearInterval(autoThemeInterval);
    autoThemeInterval = setInterval(() => {
        // Gün değiştiyse yeni günün saatlerini al
        if (sunTimesDate !== new Date().toDateString()) {
            loadSunTimes();
        } else {
            applyAutoTheme();
        }
    }, 60000);
}

function updateTheme() {
    if (currentTheme === 'auto') {
        initAutoTheme();
        return;
    }

    if (autoThemeInterval) {
        clearInterval(autoThemeInterval);
        autoThemeInterval = null;
    }
    applyThemeClasses(currentTheme);
}

// weather.js'in önbelleğe aldığı konum varsa ilk hesaplamada onu kullan
// (yoksa varsayılan koordinatla önbellek ıskalanır ve gereksiz istek atılır)
function loadSavedThemeLocation() {
    try {
        const entry = JSON.parse(localStorage.getItem('weatherLocation'));
        if (entry && entry.data && Number.isFinite(entry.data.latitude) && Number.isFinite(entry.data.longitude)) {
            currentLatitude = entry.data.latitude;
            currentLongitude = entry.data.longitude;
        }
    } catch (e) {
        // Bozuk önbellek: varsayılan konum kullanılır
    }
}

// Script'ler body sonunda yüklendiği için body hazır: temayı ilk boyamadan önce uygula
loadSavedThemeLocation();
updateTheme();
