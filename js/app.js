// ==================== ACTION DISPATCHER ====================
// HTML'de satır içi onclick="" yerine data-action kullanılır. Bu hem kodu tek yerde
// toplar hem de Chrome eklentisi (Manifest V3) CSP'si ile uyumludur.
//   data-action="fonksiyonAdı"   çağrılacak global fonksiyon
//   data-arg="değer"             (isteğe bağlı) sabit argüman
//   data-on="input|change"       (isteğe bağlı) tetikleyici olay, varsayılan click
// data-arg yoksa form öğelerinde değer (checkbox'ta checked) argüman olarak geçer.
function handleActionEvent(event) {
    const el = event.target.closest('[data-action]');
    if (!el || (el.dataset.on || 'click') !== event.type) return;

    const handler = window[el.dataset.action];
    if (typeof handler !== 'function') {
        console.warn(`Unknown action: ${el.dataset.action}`);
        return;
    }

    let arg = el.dataset.arg;
    if (arg === undefined && el.matches('input, select, textarea')) {
        arg = el.type === 'checkbox' ? el.checked : el.value;
    }
    handler(arg);
}

['click', 'input', 'change'].forEach(type => document.addEventListener(type, handleActionEvent));

// ==================== FULLSCREEN ====================

function updateFullscreenIcon() {
    document.getElementById('fullscreenIcon').className = document.fullscreenElement ? 'fas fa-compress' : 'fas fa-expand';
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

// ==================== INIT ====================
// Tüm modüller burada, tek seferde ve belirli bir sırayla başlatılır.
function initializeApp() {
    applyStaticTranslations();
    setGreeting();
    updateDateTime();
    initSearch();
    initShortcuts();
    clockWidget.init();
    initVocab();
    initWidgets();
    initializeBackground();
    initWeatherLocationForTheme();
    updateFullscreenIcon();

    document.documentElement.classList.add('theme-ready');
    // preventScroll: dar ekranda odak sayfayı ortadan başlatmasın
    document.getElementById('searchInput').focus({ preventScroll: true });

    document.addEventListener('fullscreenchange', updateFullscreenIcon);

    // Saat ve takvim: saniyede bir saat, gün değişince takvim
    let lastDate = new Date().toDateString();
    setInterval(() => {
        updateDateTime();
        const today = new Date().toDateString();
        if (today !== lastDate) {
            lastDate = today;
            generateCalendar();
        }
    }, 1000);
}

// Script'ler body'nin sonunda olduğu için DOM hazır; harici fontları/görselleri beklemeye gerek yok
initializeApp();
