// ==================== SETTINGS MODULE ====================

let settingsOpen = false;
let settingsReturnFocus = null;

function getUsername() {
    return localStorage.getItem('username') || '';
}

function getDefaultUsername() {
    return t('default-username');
}

function setUsername(name) {
    if (name && name.trim() !== '') {
        localStorage.setItem('username', name.trim());
    } else {
        localStorage.removeItem('username');
    }
}

// Selamlama, sayfa başlığı ve sekme başlığı kullanıcı adına göre
function setGreeting() {
    const username = getUsername() || getDefaultUsername();
    const greetings = t('greetings');
    const template = greetings[Math.floor(Math.random() * greetings.length)];
    document.getElementById('greeting').textContent = template.replace('{name}', username);
    document.querySelector('.title').textContent = `${t('welcome-base')}, ${username}`;
    document.title = `${t('welcome-base')} - ${username}`;
}

function toggleSettings() {
    if (settingsOpen) {
        closeSettings();
    } else {
        openSettings();
    }
}

function openSettings() {
    settingsOpen = true;
    settingsReturnFocus = document.activeElement;
    document.getElementById('settingsPanel').classList.add('open');
    document.getElementById('settingsOverlay').classList.add('open');
    document.getElementById('settingsToggle').setAttribute('aria-expanded', 'true');
    loadSettingsValues();
    // Panel henüz ekran dışındayken (kayma animasyonu) normal focus() tarayıcının
    // sayfayı yatay kaydırmasına yol açar; preventScroll bunu engeller
    document.getElementById('settingsCloseBtn').focus({ preventScroll: true });
}

function closeSettings() {
    if (!settingsOpen) return;
    settingsOpen = false;
    document.getElementById('settingsPanel').classList.remove('open');
    document.getElementById('settingsOverlay').classList.remove('open');
    document.getElementById('settingsToggle').setAttribute('aria-expanded', 'false');
    if (settingsReturnFocus && settingsReturnFocus.focus) settingsReturnFocus.focus({ preventScroll: true });
}

function loadSettingsValues() {
    const usernameInput = document.getElementById('settingsUsername');
    usernameInput.value = getUsername();
    usernameInput.placeholder = getDefaultUsername();

    document.getElementById('settingsLanguage').value = currentLanguage;
    document.getElementById('settingsAIProvider').value = getAIProvider();

    updateThemeUI();

    const pomodoroConfig = getPomodoroConfig();
    document.getElementById('settingsPomodoroWork').value = pomodoroConfig.workMinutes;
    document.getElementById('settingsPomodoroBreak').value = pomodoroConfig.breakMinutes;

    document.getElementById('settingsWeatherApiKey').value = localStorage.getItem('weatherApiKey') || '';

    loadBackgroundSettingsValues();
}

function saveUsername() {
    setUsername(document.getElementById('settingsUsername').value.trim());
    setGreeting();
    showSettingsFeedback('username-feedback', t('username-saved'));
}

function applyLanguageSetting() {
    setLanguage(document.getElementById('settingsLanguage').value);
}

function setTheme(theme) {
    if (!THEMES.includes(theme)) return;
    currentTheme = theme;
    localStorage.setItem('theme', currentTheme);
    updateTheme();
    updateThemeUI();
}

function updateThemeUI() {
    THEMES.forEach(theme => {
        const btn = document.getElementById('theme' + theme.charAt(0).toUpperCase() + theme.slice(1) + 'Btn');
        const isActive = theme === currentTheme;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
    });
}

function saveWeatherApiKey() {
    const key = document.getElementById('settingsWeatherApiKey').value.trim();
    if (key) {
        localStorage.setItem('weatherApiKey', key);
    } else {
        localStorage.removeItem('weatherApiKey');
    }
    WEATHER_CONFIG.weatherApiKey = key;
    showSettingsFeedback('apikey-feedback', t(key ? 'apikey-saved' : 'apikey-cleared'));

    // Kaynak değişti: önbelleği at, widget açıldıysa yeniden yükle
    clearWeatherCache();
    if (weatherInitialized) loadWeatherData({ force: true });
}

function savePomodoroSettings() {
    const workMinutes = parseInt(document.getElementById('settingsPomodoroWork').value, 10);
    const breakMinutes = parseInt(document.getElementById('settingsPomodoroBreak').value, 10);

    if (!Number.isFinite(workMinutes) || workMinutes < 1 || workMinutes > 180) {
        showSettingsFeedback('pomodoro-feedback', t('pomodoro-work-invalid'));
        return;
    }
    if (!Number.isFinite(breakMinutes) || breakMinutes < 1 || breakMinutes > 120) {
        showSettingsFeedback('pomodoro-feedback', t('pomodoro-break-invalid'));
        return;
    }

    setPomodoroConfig({ workMinutes, breakMinutes });
    showSettingsFeedback('pomodoro-feedback', t('pomodoro-saved'));
}

function showSettingsFeedback(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.style.opacity = '1';
    clearTimeout(el._feedbackTimer);
    el._feedbackTimer = setTimeout(() => { el.style.opacity = '0'; }, 2500);
}

function openAddShortcutFromSettings() {
    closeSettings();
    setTimeout(addNewShortcut, 200);
}

async function clearIndexedDBBackgrounds() {
    try {
        const db = await openBackgroundDB();
        const tx = db.transaction('backgrounds', 'readwrite');
        tx.objectStore('backgrounds').clear();
        await promisifyTransaction(tx);
    } catch (error) {
        console.warn('IndexedDB background cleanup skipped:', error);
    }
}

// Uygulamanın kullandığı tüm anahtarlar (dil hariç; o İngilizce'ye çekilir)
const RESETTABLE_STORAGE_KEYS = [
    'username', 'weatherApiKey', 'ai-provider', 'chatgpt-mode', 'theme', 'current-widget',
    'pomodoroWorkMinutes', 'pomodoroBreakMinutes', 'shortcuts', 'backgroundConfig',
    'sunTimes', 'weatherCache', 'weatherLocation', 'vocabWords', 'vocabQueue', 'vocabLast'
];

async function resetToDefaults() {
    if (!confirm(t('reset-confirm'))) return;

    RESETTABLE_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    localStorage.setItem('language', 'en');
    localStorage.setItem('shortcuts', JSON.stringify(DEFAULT_SHORTCUTS));
    Object.keys(localStorage)
        .filter(key => key.startsWith('bg_'))
        .forEach(key => localStorage.removeItem(key));

    await clearIndexedDBBackgrounds();

    closeSettings();
    location.reload();
}

// ==================== EXPORT / IMPORT (.yay) ====================

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
    const apiKey = localStorage.getItem('weatherApiKey') || '';
    const shortcutsData = JSON.parse(localStorage.getItem('shortcuts') || '[]');
    const language = localStorage.getItem('language') || 'en';
    const theme = localStorage.getItem('theme') || 'auto';
    const pomodoroWorkMinutes = parseInt(localStorage.getItem('pomodoroWorkMinutes') || '25', 10);
    const pomodoroBreakMinutes = parseInt(localStorage.getItem('pomodoroBreakMinutes') || '5', 10);

    // Get background data if available
    let backgrounds = null;
    if (typeof getBackgroundsForExport === 'function') {
        backgrounds = await getBackgroundsForExport();
    }

    const exportObj = {
        _format: 'yay',
        _version: '1.0',
        _exported: new Date().toISOString(),
        username: username,
        apiKey: apiKey,
        language: language,
        theme: theme,
        aiProvider: getAIProvider(),
        pomodoro: {
            workMinutes: Number.isFinite(pomodoroWorkMinutes) ? pomodoroWorkMinutes : 25,
            breakMinutes: Number.isFinite(pomodoroBreakMinutes) ? pomodoroBreakMinutes : 5
        },
        shortcuts: shortcutsData,
        vocabulary: getVocabularyForExport(),
        backgrounds: backgrounds
    };

    const jsonStr = JSON.stringify(exportObj, null, 2);
    const encodedContent = encodeBase64Utf8(jsonStr);
    const blob = new Blob([encodedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'browser-startup-data.yay';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showSettingsFeedback('export-feedback',
        currentLanguage === 'tr' ? 'Veriler dışa aktarıldı!' : 'Data exported!');
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
                if (data.apiKey !== undefined) {
                    if (data.apiKey) localStorage.setItem('weatherApiKey', data.apiKey);
                    else localStorage.removeItem('weatherApiKey');
                }
                if (data.language) localStorage.setItem('language', data.language);
                if (data.theme) localStorage.setItem('theme', data.theme);
                if (data.aiProvider === 'chatgpt' || data.aiProvider === 'claude') {
                    localStorage.setItem('ai-provider', data.aiProvider);
                }
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
                if (Array.isArray(data.vocabulary)) {
                    importVocabulary(data.vocabulary);
                }

                // Import backgrounds if available
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

// Ayarlar panelini ESC ile kapat
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && settingsOpen) {
        closeSettings();
    }
});
