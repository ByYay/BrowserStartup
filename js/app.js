function initializeApp() {
    document.documentElement.classList.add('theme-ready');
    
    updateTheme();
    updateLanguage();
    updateThemeToggleUI();
    updateChatGPTUI();
    setGreeting();
    updateDateTime();
    generateCalendar();
    showWidget(currentWidget);
    updateCalculatorDisplay();
    
    updateSettingsButtonLabel();
    
    if (typeof updateSettingsTranslations === 'function') {
        updateSettingsTranslations();
    }
    
    if (typeof clockWidget !== 'undefined') {
        clockWidget.init();
    }
    
    document.getElementById('searchInput').focus();
    
    const liquidIndicator = document.getElementById('liquidIndicator');
    
    if (currentWidget === 'calculator') {
        liquidIndicator.classList.add('calculator-active');
    } else if (currentWidget === 'password') {
        liquidIndicator.classList.add('password-active');
    } else if (currentWidget === 'weather') {
        liquidIndicator.classList.add('weather-active');
    }
    
    if (currentTheme === 'auto') {
        initAutoTheme();
    }

    updateFullscreenIcon();
    
    setInterval(updateDateTime, 1000);
    
    setInterval(generateCalendar, 3600000);
    
    setInterval(() => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) {
            if (currentTheme === 'auto') {
                getSunriseSunsetTimes();
            }
        }
    }, 60000);
}

function updateSettingsButtonLabel() {
    const btn = document.querySelector('.settings-toggle span');
    if (btn) {
        btn.textContent = currentLanguage === 'tr' ? 'Ayarlar' : 'Settings';
    }
}

function updateFullscreenIcon() {
    const icon = document.getElementById('fullscreenIcon');
    if (!icon) return;

    if (document.fullscreenElement) {
        icon.className = 'fas fa-compress';
    } else {
        icon.className = 'fas fa-expand';
    }
}

async function toggleFullscreen() {
    try {
        if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    } catch (error) {
        console.error('Fullscreen mode failed:', error);
    }
}

document.addEventListener('fullscreenchange', updateFullscreenIcon);

window.addEventListener('load', initializeApp);
