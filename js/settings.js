let settingsOpen = false;

function getUsername() {
    return localStorage.getItem('username') || '';
}

function getDefaultUsername() {
    return currentLanguage === 'tr' ? 'Kullanıcı' : 'User';
}

function setUsername(name) {
    if (name && name.trim() !== '') {
        localStorage.setItem('username', name.trim());
    } else {
        localStorage.removeItem('username');
    }
}

function setGreeting() {
    const savedUsername = getUsername();
    if (!savedUsername) {
        const greetingEl = document.getElementById('greeting');
        if (greetingEl) {
            greetingEl.textContent = 'Stay focused and productive.';
        }

        const titleEl = document.querySelector('.title');
        if (titleEl) {
            titleEl.textContent = 'Custom New Tab Dashboard';
        }

        document.title = 'Custom New Tab Dashboard';
        return;
    }

    const username = savedUsername;
    const lang = currentLanguage;
    const greetings = translations[lang].greetings;
    const template = greetings[Math.floor(Math.random() * greetings.length)];
    const greeting = template.replace('{name}', username);
    document.getElementById('greeting').textContent = greeting;

    const titleEl = document.querySelector('.title');
    if (titleEl) {
        const base = lang === 'tr' ? 'Hoş Geldin' : 'Welcome';
        titleEl.textContent = base + ', ' + username;
    }
    const tabBase = lang === 'tr' ? 'Hoş Geldin' : 'Welcome';
    document.title = tabBase + ' - ' + username;
}

function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    const overlay = document.getElementById('settingsOverlay');
    settingsOpen = !settingsOpen;
    if (settingsOpen) {
        panel.classList.add('open');
        overlay.classList.add('open');
        loadSettingsValues();
    } else {
        panel.classList.remove('open');
        overlay.classList.remove('open');
    }
}

function closeSettings() {
    const panel = document.getElementById('settingsPanel');
    const overlay = document.getElementById('settingsOverlay');
    settingsOpen = false;
    panel.classList.remove('open');
    overlay.classList.remove('open');
}

function loadSettingsValues() {
    const usernameInput = document.getElementById('settingsUsername');
    if (usernameInput) {
        usernameInput.value = getUsername();
        usernameInput.placeholder = getDefaultUsername();
    }

    const langSelect = document.getElementById('settingsLanguage');
    if (langSelect) {
        langSelect.value = currentLanguage;
    }

    updateThemeUI();

    if (typeof getPomodoroConfig === 'function') {
        const pomodoroConfig = getPomodoroConfig();
        const workInput = document.getElementById('settingsPomodoroWork');
        const breakInput = document.getElementById('settingsPomodoroBreak');
        if (workInput) workInput.value = pomodoroConfig.workMinutes;
        if (breakInput) breakInput.value = pomodoroConfig.breakMinutes;
    }

    const apiKeyInput = document.getElementById('settingsWeatherApiKey');
    if (apiKeyInput) {
        const savedKey = localStorage.getItem('weatherApiKey') || '';
        apiKeyInput.value = savedKey;
    }

    if (typeof loadBackgroundSettingsValues === 'function') {
        loadBackgroundSettingsValues();
    }
}

function saveUsername() {
    const input = document.getElementById('settingsUsername');
    const name = input ? input.value.trim() : '';
    setUsername(name);
    setGreeting();
    showSettingsFeedback('username-feedback', currentLanguage === 'tr' ? 'Kullanıcı adı kaydedildi!' : 'Username saved!');
}

function applyLanguageSetting() {
    const select = document.getElementById('settingsLanguage');
    if (!select) return;
    const newLang = select.value;
    if (newLang !== currentLanguage) {
        currentLanguage = newLang;
        localStorage.setItem('language', currentLanguage);
        updateLanguage();
        updateLanguageToggleUI();
        updateDateTime();
        loadSettingsValues();
        updateSettingsTranslations();
    }
}

function setTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('theme', currentTheme);
    
    if (currentTheme !== 'auto' && autoThemeInterval) {
        clearInterval(autoThemeInterval);
        autoThemeInterval = null;
    }
    
    updateTheme();
    updateThemeUI();
    
    if (currentTheme === 'auto') {
        initAutoTheme();
    }
}

function updateThemeUI() {
    const themes = ['auto', 'light', 'dark', 'midnight'];
    themes.forEach(theme => {
        const btn = document.getElementById('theme' + theme.charAt(0).toUpperCase() + theme.slice(1) + 'Btn');
        if (btn) {
            if (theme === currentTheme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
}

function saveWeatherApiKey() {
    const input = document.getElementById('settingsWeatherApiKey');
    const key = input ? input.value.trim() : '';
    if (key) {
        localStorage.setItem('weatherApiKey', key);
        if (typeof WEATHER_CONFIG !== 'undefined') {
            WEATHER_CONFIG.weatherApiKey = key;
            WEATHER_CONFIG.openWeatherKey = key;
        }
        showSettingsFeedback('apikey-feedback', currentLanguage === 'tr' ? 'API anahtarı kaydedildi!' : 'API key saved!');
    } else {
        localStorage.removeItem('weatherApiKey');
        if (typeof WEATHER_CONFIG !== 'undefined') {
            WEATHER_CONFIG.weatherApiKey = '';
            WEATHER_CONFIG.openWeatherKey = '';
        }
        showSettingsFeedback('apikey-feedback', currentLanguage === 'tr' ? 'API anahtarı temizlendi.' : 'API key cleared.');
    }
}

function savePomodoroSettings() {
    const workInput = document.getElementById('settingsPomodoroWork');
    const breakInput = document.getElementById('settingsPomodoroBreak');

    const workMinutes = parseInt(workInput ? workInput.value : '25', 10);
    const breakMinutes = parseInt(breakInput ? breakInput.value : '5', 10);

    if (!Number.isFinite(workMinutes) || workMinutes < 1 || workMinutes > 180) {
        showSettingsFeedback('pomodoro-feedback', currentLanguage === 'tr' ? 'Çalışma süresi 1-180 arasında olmalı.' : 'Work duration must be between 1-180.');
        return;
    }

    if (!Number.isFinite(breakMinutes) || breakMinutes < 1 || breakMinutes > 120) {
        showSettingsFeedback('pomodoro-feedback', currentLanguage === 'tr' ? 'Mola süresi 1-120 arasında olmalı.' : 'Break duration must be between 1-120.');
        return;
    }

    if (typeof setPomodoroConfig === 'function') {
        setPomodoroConfig({ workMinutes, breakMinutes });
    } else {
        localStorage.setItem('pomodoroWorkMinutes', String(workMinutes));
        localStorage.setItem('pomodoroBreakMinutes', String(breakMinutes));
    }

    showSettingsFeedback('pomodoro-feedback', currentLanguage === 'tr' ? 'Pomodoro süreleri kaydedildi!' : 'Pomodoro durations saved!');
}

function showSettingsFeedback(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2500);
}

function openAddShortcutFromSettings() {
    closeSettings();
    setTimeout(() => {
        addNewShortcut();
    }, 200);
}

async function clearIndexedDBBackgrounds() {
    try {
        let db;

        if (typeof openBackgroundDB === 'function') {
            db = await openBackgroundDB();
        } else {
            db = await new Promise((resolve, reject) => {
                const request = indexedDB.open('BrowserStartupDB', 1);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        await new Promise((resolve, reject) => {
            const tx = db.transaction('backgrounds', 'readwrite');
            const store = tx.objectStore('backgrounds');
            const clearRequest = store.clear();

            clearRequest.onsuccess = () => resolve();
            clearRequest.onerror = () => reject(clearRequest.error);
        });
    } catch (error) {
        console.warn('IndexedDB background cleanup skipped:', error);
    }
}

async function resetToDefaults() {
    const confirmMsg = currentLanguage === 'tr'
        ? 'Tüm ayarlar varsayılana döndürülsün mü? Kısayollar, kullanıcı adı, API anahtarı ve arka plan ayarları sıfırlanacak.'
        : 'Reset all settings to defaults? Shortcuts, username, API key, and background settings will be reset.';
    if (!confirm(confirmMsg)) return;

    localStorage.removeItem('username');
    localStorage.removeItem('weatherApiKey');
    localStorage.setItem('language', 'en');
    localStorage.removeItem('pomodoroWorkMinutes');
    localStorage.removeItem('pomodoroBreakMinutes');
    if (typeof DEFAULT_SHORTCUTS !== 'undefined') {
        localStorage.setItem('shortcuts', JSON.stringify(DEFAULT_SHORTCUTS));
    } else {
        localStorage.removeItem('shortcuts');
    }
    
    localStorage.removeItem('backgroundConfig');
    
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('bg_')) {
            localStorage.removeItem(key);
        }
    });

    await clearIndexedDBBackgrounds();

    closeSettings();
    location.reload();
}

function encodeBase64Utf8(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
}

function decodeBase64Utf8(base64Text) {
    const normalized = (base64Text || '').replace(/\s+/g, '');
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}

async function exportData() {
    const username = getUsername();
    const shortcutsData = JSON.parse(localStorage.getItem('shortcuts') || '[]');
    const language = localStorage.getItem('language') || 'en';
    const theme = localStorage.getItem('theme') || 'auto';
    const pomodoroWorkMinutes = parseInt(localStorage.getItem('pomodoroWorkMinutes') || '25', 10);
    const pomodoroBreakMinutes = parseInt(localStorage.getItem('pomodoroBreakMinutes') || '5', 10);

    let backgrounds = null;
    if (typeof getBackgroundsForExport === 'function') {
        backgrounds = await getBackgroundsForExport();
    }

    const exportObj = {
        _format: 'yay',
        _version: '1.0',
        _exported: new Date().toISOString(),
        username: username,
        language: language,
        theme: theme,
        pomodoro: {
            workMinutes: Number.isFinite(pomodoroWorkMinutes) ? pomodoroWorkMinutes : 25,
            breakMinutes: Number.isFinite(pomodoroBreakMinutes) ? pomodoroBreakMinutes : 5
        },
        shortcuts: shortcutsData,
        backgrounds: backgrounds
    };

    const jsonStr = JSON.stringify(exportObj, null, 2);
    const encodedContent = encodeBase64Utf8(jsonStr);
    const blob = new Blob([encodedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom-new-tab-dashboard-data.yay';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSettingsFeedback('export-feedback', 'Data exported. API keys were not included.');
}

async function importData() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.yay';
    fileInput.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.name.endsWith('.yay')) {
            alert(currentLanguage === 'tr'
                ? 'Sadece .yay uzantılı dosyalar desteklenir!'
                : 'Only .yay files are supported!');
            return;
        }
        const reader = new FileReader();
        reader.onload = async function(ev) {
            try {
                const fileContent = (ev.target.result || '').toString().trim();
                let data;

                try {
                    const decoded = decodeBase64Utf8(fileContent);
                    data = JSON.parse(decoded);
                } catch (decodeErr) {
                    data = JSON.parse(fileContent);
                }

                if (data._format !== 'yay') {
                    alert(currentLanguage === 'tr'
                        ? 'Geçersiz .yay dosyası!'
                        : 'Invalid .yay file!');
                    return;
                }
                const confirmMsg = currentLanguage === 'tr'
                    ? 'Mevcut veriler üzerine yazılacak. Devam edilsin mi?'
                    : 'Existing data will be overwritten. Continue?';
                if (!confirm(confirmMsg)) return;

                if (data.username !== undefined) {
                    if (data.username) localStorage.setItem('username', data.username);
                    else localStorage.removeItem('username');
                }
                if (data.language) localStorage.setItem('language', data.language);
                if (data.theme) localStorage.setItem('theme', data.theme);
                if (data.pomodoro) {
                    const workMinutes = parseInt(data.pomodoro.workMinutes, 10);
                    const breakMinutes = parseInt(data.pomodoro.breakMinutes, 10);
                    if (Number.isFinite(workMinutes) && workMinutes > 0) {
                        localStorage.setItem('pomodoroWorkMinutes', String(workMinutes));
                    }
                    if (Number.isFinite(breakMinutes) && breakMinutes > 0) {
                        localStorage.setItem('pomodoroBreakMinutes', String(breakMinutes));
                    }
                }
                if (data.shortcuts && Array.isArray(data.shortcuts)) {
                    localStorage.setItem('shortcuts', JSON.stringify(data.shortcuts));
                }

                if (data.backgrounds && typeof importBackgroundsFromExport === 'function') {
                    await importBackgroundsFromExport(data.backgrounds);
                }

                showSettingsFeedback('import-feedback',
                    currentLanguage === 'tr' ? 'Veriler içe aktarıldı!' : 'Data imported!');
                setTimeout(() => location.reload(), 1200);
            } catch (err) {
                alert(currentLanguage === 'tr'
                    ? 'Dosya okunamadı: ' + err.message
                    : 'Could not read file: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    fileInput.click();
}

function updateSettingsTranslations() {
    const lang = currentLanguage;
    const t = {
        tr: {
            'settings-title': 'Ayarlar',
            'settings-username-label': 'Kullanıcı Adı',
            'settings-username-placeholder': 'Kullanıcı',
            'settings-username-save': 'Kaydet',
            'settings-language-label': 'Dil / Language',
            'settings-theme-label': 'Tema',
            'settings-pomodoro-label': 'Pomodoro',
            'settings-pomodoro-work-label': 'Çalışma Süresi (dakika)',
            'settings-pomodoro-break-label': 'Mola Süresi (dakika)',
            'settings-pomodoro-save': 'Kaydet',
            'settings-background-label': 'Arka Plan',
            'settings-bg-theme-option': 'Tema Arka Planı',
            'settings-bg-upload-option': 'Görsel Yükle',
            'settings-bg-upload-btn-text': 'Görsel Yükle',
            'settings-bg-light-blue': 'Açık Mavi',
            'settings-bg-light-gradient': 'Açık Gradyan',
            'settings-bg-dark-gradient': 'Koyu Gradyan',
            'settings-bg-midnight-gradient': 'Gece Yarısı Gradyanı',
            'settings-bg-blur-label': 'Bulanıklık:',
            'settings-bg-brightness-label': 'Parlaklık:',
            'settings-bg-contrast-label': 'Kontras:',
            'settings-bg-images-label': 'Görseller',
            'settings-bg-rotation-label': 'Dönüşümü Etkinleştir',
            'settings-bg-interval-label': 'Aralık:',
            'settings-weather-label': 'Hava Durumu API Anahtarı',
            'settings-weather-placeholder': 'WeatherAPI.com API anahtarı',
            'settings-weather-save': 'Kaydet',
            'settings-weather-info': 'weatherapi.com adresinden ücretsiz alabilirsiniz.',
            'settings-shortcuts-label': 'Kısayollar',
            'settings-add-shortcut': '+ Yeni Kısayol Ekle',
            'settings-data-label': 'Veri Yönetimi',
            'settings-export': '⬆ Dışa Aktar (.yay)',
            'settings-import': '⬇ İçe Aktar (.yay)',
            'settings-reset': '↺ Varsayılan Ayarlara Döndür',
        },
        en: {
            'settings-title': 'Settings',
            'settings-username-label': 'Username',
            'settings-username-placeholder': 'User',
            'settings-username-save': 'Save',
            'settings-language-label': 'Language / Dil',
            'settings-theme-label': 'Theme',
            'settings-pomodoro-label': 'Pomodoro',
            'settings-pomodoro-work-label': 'Work Duration (minutes)',
            'settings-pomodoro-break-label': 'Break Duration (minutes)',
            'settings-pomodoro-save': 'Save',
            'settings-background-label': 'Background',
            'settings-bg-theme-option': 'Theme Background',
            'settings-bg-upload-option': 'Upload Images',
            'settings-bg-upload-btn-text': 'Upload Images',
            'settings-bg-light-blue': 'Light Blue',
            'settings-bg-light-gradient': 'Light Gradient',
            'settings-bg-dark-gradient': 'Dark Gradient',
            'settings-bg-midnight-gradient': 'Midnight Gradient',
            'settings-bg-blur-label': 'Blur:',
            'settings-bg-brightness-label': 'Brightness:',
            'settings-bg-contrast-label': 'Contrast:',
            'settings-bg-images-label': 'Images',
            'settings-bg-rotation-label': 'Enable Rotation',
            'settings-bg-interval-label': 'Interval:',
            'settings-weather-label': 'Weather API Key',
            'settings-weather-placeholder': 'WeatherAPI.com API key',
            'settings-weather-save': 'Save',
            'settings-weather-info': 'Get a free key at weatherapi.com.',
            'settings-shortcuts-label': 'Shortcuts',
            'settings-add-shortcut': '+ Add New Shortcut',
            'settings-data-label': 'Data Management',
            'settings-export': '⬆ Export (.yay)',
            'settings-import': '⬇ Import (.yay)',
            'settings-reset': '↺ Reset to Defaults',
        }
    };
    const strings = t[lang] || t['en'];
    Object.keys(strings).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = strings[id];
        } else {
            el.textContent = strings[id];
        }
    });

    const datatrElements = document.querySelectorAll('[data-tr]');
    datatrElements.forEach(el => {
        const trKey = el.getAttribute('data-tr');
        if (strings[trKey]) {
            el.textContent = strings[trKey];
        }
    });

    const usernameInput = document.getElementById('settingsUsername');
    if (usernameInput) usernameInput.placeholder = getDefaultUsername();
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && settingsOpen) {
        closeSettings();
    }
});

window.addEventListener('load', function() {
    const savedKey = localStorage.getItem('weatherApiKey');
    if (savedKey && typeof WEATHER_CONFIG !== 'undefined') {
        WEATHER_CONFIG.weatherApiKey = savedKey;
        WEATHER_CONFIG.openWeatherKey = savedKey;
    }
});
