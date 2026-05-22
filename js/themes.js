let currentTheme = localStorage.getItem('theme') || 'auto';
const themes = ['auto', 'light', 'dark', 'midnight'];
const themeNames = {
    auto: 'Auto',
    light: 'Light',
    dark: 'Dark', 
    midnight: 'Midnight'
};
const themeIcons = {
    auto: 'fas fa-adjust',
    light: 'fas fa-sun',
    dark: 'fas fa-moon',
    midnight: 'fas fa-star'
};

let sunriseTime = null;
let sunsetTime = null;
let autoThemeInterval = null;
let currentLatitude = 41.0082;
let currentLongitude = 28.9784;

function getDefaultSunTimes() {
    const now = new Date();
    return {
        sunrise: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0),
        sunset: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 30)
    };
}

function getCachedSunTimes() {
    const cached = localStorage.getItem('sunTimes');
    const today = new Date().toDateString();
    
    if (cached) {
        const data = JSON.parse(cached);
        if (data.date === today) {
            return {
                sunrise: new Date(data.sunrise),
                sunset: new Date(data.sunset)
            };
        }
    }
    return null;
}

function cacheSunTimes(sunrise, sunset) {
    const data = {
        date: new Date().toDateString(),
        sunrise: sunrise.toISOString(),
        sunset: sunset.toISOString()
    };
    localStorage.setItem('sunTimes', JSON.stringify(data));
}

function updateLocationForThemes(lat, lng) {
    currentLatitude = lat;
    currentLongitude = lng;
    console.log(`📍 Updated theme location to: ${lat}, ${lng}`);
    
    if (currentTheme === 'auto') {
        initAutoTheme();
    }
}

window.updateLocationForThemes = updateLocationForThemes;

function toggleTheme() {
    const currentIndex = themes.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    currentTheme = themes[nextIndex];
    localStorage.setItem('theme', currentTheme);
    
    if (currentTheme !== 'auto' && autoThemeInterval) {
        clearInterval(autoThemeInterval);
        autoThemeInterval = null;
    }
    
    updateTheme();
    updateThemeToggleUI();
    
    if (currentTheme === 'auto') {
        initAutoTheme();
    }
}

async function getSunriseSunsetTimes() {
    try {
        console.log(`🌅 Getting sunrise/sunset times for: ${currentLatitude}, ${currentLongitude}`);
        
        const response = await fetch(`https://api.sunrise-sunset.org/json?lat=${currentLatitude}&lng=${currentLongitude}&formatted=0`);
        const data = await response.json();
        
        if (data.status === 'OK') {
            const sunrise = new Date(data.results.sunrise);
            const sunset = new Date(data.results.sunset);
            
            sunriseTime = sunrise;
            sunsetTime = sunset;
            
            cacheSunTimes(sunrise, sunset);
            
            console.log(`🌅 Sunrise: ${sunrise.toLocaleTimeString()}, Sunset: ${sunset.toLocaleTimeString()}`);
            return true;
        }
    } catch (error) {
        console.error('Error fetching sunrise/sunset times:', error);
        
        const cached = getCachedSunTimes();
        if (cached) {
            sunriseTime = cached.sunrise;
            sunsetTime = cached.sunset;
            console.log('Using cached sunrise/sunset times');
            return true;
        }
        
        const defaults = getDefaultSunTimes();
        sunriseTime = defaults.sunrise;
        sunsetTime = defaults.sunset;
        console.log('Using fallback sunrise/sunset times');
        return false;
    }
}

function getAutoTheme() {
    if (!sunriseTime || !sunsetTime) {
        return 'light';
    }
    
    const now = new Date();
    const currentTime = now.getTime();
    const sunrise = sunriseTime.getTime();
    const sunset = sunsetTime.getTime();
    
    if (currentTime >= sunrise && currentTime < sunset) {
        return 'light';
    } else {
        return 'dark';
    }
}

async function initAutoTheme() {
    console.log('Initializing auto theme...');
    
    const cached = getCachedSunTimes();
    if (cached) {
        sunriseTime = cached.sunrise;
        sunsetTime = cached.sunset;
        console.log('Using cached times for immediate theme application');
    } else {
        const defaults = getDefaultSunTimes();
        sunriseTime = defaults.sunrise;
        sunsetTime = defaults.sunset;
        console.log('Using default times for immediate theme application');
    }
    
    applyAutoTheme();
    
    getSunriseSunsetTimes().then(() => {
        applyAutoTheme();
    });
    
    if (autoThemeInterval) {
        clearInterval(autoThemeInterval);
    }
    autoThemeInterval = setInterval(applyAutoTheme, 60000);
}

function applyAutoTheme() {
    if (currentTheme !== 'auto') return;
    
    const autoTheme = getAutoTheme();
    console.log(`Auto theme: ${autoTheme} (based on time: ${new Date().toLocaleTimeString()})`);
    
    document.body.classList.remove('dark-mode', 'midnight-mode');
    document.documentElement.classList.remove('dark-mode', 'midnight-mode');
    
    if (autoTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.documentElement.classList.add('dark-mode');
    }
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
    
    document.body.classList.remove('dark-mode', 'midnight-mode');
    document.documentElement.classList.remove('dark-mode', 'midnight-mode');
    
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.documentElement.classList.add('dark-mode');
    } else if (currentTheme === 'midnight') {
        document.body.classList.add('midnight-mode');
        document.documentElement.classList.add('midnight-mode');
    }
}

function updateThemeToggleUI() {
    const themeDisplay = document.getElementById('theme-display');
    const themeIcon = document.getElementById('theme-icon');
    
    if (themeDisplay && themeIcon) {
        const currentLang = (typeof getCurrentLanguage === 'function') ? getCurrentLanguage() : 
                           (window.currentLanguage || 'en');
        
        const themeTranslations = {
            'auto': { 'tr': 'Otomatik', 'en': 'Auto' },
            'light': { 'tr': 'Açık', 'en': 'Light' },
            'dark': { 'tr': 'Koyu', 'en': 'Dark' },
            'midnight': { 'tr': 'Gece', 'en': 'Midnight' }
        };
        
        const themeText = themeTranslations[currentTheme] ? 
                         themeTranslations[currentTheme][currentLang] || themeTranslations[currentTheme]['en'] :
                         themeNames[currentTheme];
        
        themeDisplay.textContent = themeText;
        themeIcon.className = `theme-icon ${themeIcons[currentTheme]}`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing theme...');
    
    if (currentTheme === 'auto') {
        initAutoTheme();
    } else {
        updateTheme();
    }
    
    updateThemeToggleUI();
});

if (currentTheme === 'auto') {
    const cached = getCachedSunTimes();
    if (cached) {
        sunriseTime = cached.sunrise;
        sunsetTime = cached.sunset;
    } else {
        const defaults = getDefaultSunTimes();
        sunriseTime = defaults.sunrise;
        sunsetTime = defaults.sunset;
    }
    
    const autoTheme = getAutoTheme();
    if (autoTheme === 'dark') {
        document.documentElement.classList.add('dark-mode');
        document.addEventListener('DOMContentLoaded', function() {
            document.body.classList.add('dark-mode');
        });
    }
}
