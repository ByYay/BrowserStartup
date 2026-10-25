let currentEditingShortcut = null;
let shortcutContextMenu = null;
let selectedCustomColor = '#3498db';

// Popüler renk paleti
const colorPalette = [
    '#e74c3c', '#c0392b', '#d35400', '#e67e22', '#f39c12',
    '#f1c40f', '#2ecc71', '#27ae60', '#16a085', '#1abc9c',
    '#3498db', '#2980b9', '#9b59b6', '#8e44ad', '#34495e',
    '#2c3e50', '#95a5a6', '#7f8c8d', '#e91e63', '#9c27b0',
    '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
    '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b',
    '#ffc107', '#ff9800', '#ff5722', '#795548', '#607d8b'
];

// Varsayılan kısayollar
const DEFAULT_SHORTCUTS = [
    { id: 'google', name: 'Google', url: 'https://google.com', icon: 'img:https://www.google.com/favicon.ico', color: 'translate' },
    { id: 'youtube', name: 'YouTube', url: 'https://youtube.com', icon: 'fab fa-youtube', color: 'youtube' },
    { id: 'twitter', name: 'X / Twitter', url: 'https://x.com', icon: 'fab fa-x-twitter', color: 'github' },
    { id: 'github', name: 'GitHub', url: 'https://github.com', icon: 'fab fa-github', color: 'github' },
    { id: 'gmail', name: 'Gmail', url: 'https://gmail.com', icon: 'img:https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico', color: 'gmail' },
    { id: 'reddit', name: 'Reddit', url: 'https://reddit.com', icon: 'fab fa-reddit', color: '' },
    { id: 'instagram', name: 'Instagram', url: 'https://instagram.com', icon: 'fab fa-instagram', color: '' },
    { id: 'linkedin', name: 'LinkedIn', url: 'https://linkedin.com', icon: 'fab fa-linkedin', color: 'linkedin' },
    { id: 'wikipedia', name: 'Wikipedia', url: 'https://wikipedia.org', icon: 'fab fa-wikipedia-w', color: '' },
    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com', icon: 'fas fa-microchip', color: 'chatgpt' },
];

// localStorage bozuksa ya da eksik alanlı kayıt varsa sayfa çökmesin
function loadShortcuts() {
    try {
        const saved = JSON.parse(localStorage.getItem('shortcuts'));
        if (Array.isArray(saved)) {
            return saved
                .filter(s => s && typeof s.name === 'string' && typeof s.url === 'string')
                .map((s, i) => ({
                    ...s,
                    id: s.id ? String(s.id) : `custom_${Date.now()}_${i}`,
                    icon: typeof s.icon === 'string' && s.icon.trim() ? s.icon : 'fas fa-globe'
                }));
        }
    } catch (e) {
        console.warn('Saved shortcuts are corrupted, restoring defaults:', e);
    }
    const defaults = structuredClone(DEFAULT_SHORTCUTS);
    localStorage.setItem('shortcuts', JSON.stringify(defaults));
    return defaults;
}

let shortcuts = loadShortcuts();

function isSafeShortcutUrl(url) {
    return /^(https?|file):\/\//i.test(url);
}

function initShortcuts() {
    shortcutContextMenu = document.getElementById('shortcutContextMenu');
    renderShortcuts();
    initColorPalette();
    initShortcutSpotlight();

    document.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('click', hideContextMenu);
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        hideContextMenu();
        if (isShortcutModalOpen()) closeShortcutModal();
    });

    document.getElementById('shortcutIcon').addEventListener('input', updateShortcutIconPreview);
    document.getElementById('shortcutIconFile').addEventListener('change', handleShortcutIconFile);

    const modalOverlay = document.getElementById('shortcutModalOverlay');
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeShortcutModal();
    });
}

function renderShortcuts() {
    const shortcutsContainer = document.querySelector('.shortcuts');
    shortcutsContainer.replaceChildren(...shortcuts.map(createShortcutElement));
}

function createShortcutElement(shortcut) {
    const a = document.createElement('a');
    a.href = isSafeShortcutUrl(shortcut.url) ? shortcut.url : '#';
    a.className = `shortcut ${shortcut.color || ''}`;
    a.dataset.shortcutId = shortcut.id;

    const hasCustomColor = shortcut.color === 'custom' && shortcut.customColor;
    if (hasCustomColor) {
        a.style.setProperty('--custom-color', shortcut.customColor);
        a.classList.add('custom-color');
    }

    if (shortcut.icon.startsWith('img:')) {
        const img = document.createElement('img');
        img.src = shortcut.icon.slice(4);
        img.alt = '';
        a.appendChild(img);
    } else {
        const i = document.createElement('i');
        i.className = shortcut.icon;
        i.setAttribute('aria-hidden', 'true');
        if (hasCustomColor) i.style.color = shortcut.customColor;
        a.appendChild(i);
    }

    const span = document.createElement('span');
    span.textContent = shortcut.name;
    a.appendChild(span);

    return a;
}

function handleRightClick(e) {
    const shortcut = e.target.closest('.shortcut');
    if (!shortcut) return;

    e.preventDefault();
    currentEditingShortcut = shortcut.dataset.shortcutId;

    // Klavyedeki menü tuşuyla açılınca fare koordinatı olmaz: kısayolun konumunu kullan
    if (e.clientX === 0 && e.clientY === 0) {
        const rect = shortcut.getBoundingClientRect();
        showContextMenu(rect.left, rect.bottom);
    } else {
        showContextMenu(e.clientX, e.clientY);
    }
}

// x, y ekran koordinatı; menü ölçeklenmiş body içinde konumlandığı için ölçeğe bölünür
function showContextMenu(x, y) {
    const scale = getPageScale();
    shortcutContextMenu.style.display = 'block';
    shortcutContextMenu.style.left = (x / scale) + 'px';
    shortcutContextMenu.style.top = (y / scale) + 'px';

    const rect = shortcutContextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        shortcutContextMenu.style.left = ((x - rect.width) / scale) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
        shortcutContextMenu.style.top = ((y - rect.height) / scale) + 'px';
    }
    shortcutContextMenu.querySelector('.context-menu-item').focus({ preventScroll: true });
}

function hideContextMenu() {
    if (shortcutContextMenu) shortcutContextMenu.style.display = 'none';
}

function isShortcutModalOpen() {
    return document.getElementById('shortcutModalOverlay').style.display === 'flex';
}

function openShortcutModal(titleKey) {
    document.querySelector('#shortcutModal .modal-header h3').textContent = t(titleKey);
    updateShortcutIconPreview();
    document.getElementById('shortcutModalOverlay').style.display = 'flex';
    document.getElementById('shortcutName').focus({ preventScroll: true });
}

function editShortcut() {
    hideContextMenu();

    const shortcut = shortcuts.find(s => s.id === currentEditingShortcut);
    if (!shortcut) return;

    document.getElementById('shortcutName').value = shortcut.name;
    document.getElementById('shortcutUrl').value = shortcut.url;
    document.getElementById('shortcutIcon').value = shortcut.icon;

    if (shortcut.customColor) {
        document.getElementById('shortcutColor').value = 'custom';
        selectColor(shortcut.customColor);
    } else {
        document.getElementById('shortcutColor').value = shortcut.color || '';
    }
    toggleCustomColorPicker();

    openShortcutModal('edit-shortcut-title');
}

function addNewShortcut() {
    hideContextMenu();
    currentEditingShortcut = null;

    document.getElementById('shortcutName').value = '';
    document.getElementById('shortcutUrl').value = '';
    document.getElementById('shortcutIcon').value = 'fas fa-globe';
    document.getElementById('shortcutColor').value = '';
    document.getElementById('colorPickerGroup').style.display = 'none';
    selectedCustomColor = '#3498db';

    openShortcutModal('add-shortcut');
}

function deleteShortcut() {
    hideContextMenu();

    const shortcut = shortcuts.find(s => s.id === currentEditingShortcut);
    if (!shortcut) return;

    if (confirm(`${t('confirm-delete')} "${shortcut.name}"?`)) {
        shortcuts = shortcuts.filter(s => s.id !== currentEditingShortcut);
        saveShortcuts();
        renderShortcuts();
    }
}

function closeShortcutModal() {
    document.getElementById('shortcutModalOverlay').style.display = 'none';
    currentEditingShortcut = null;
}

function saveShortcut() {
    const name = document.getElementById('shortcutName').value.trim();
    const url = document.getElementById('shortcutUrl').value.trim();
    const icon = document.getElementById('shortcutIcon').value.trim();
    const color = document.getElementById('shortcutColor').value;

    if (!name || !url || !icon) {
        alert(t('fill-required-fields'));
        return;
    }

    if (!/^https?:\/\//i.test(url)) {
        alert(t('invalid-url'));
        return;
    }

    let shortcut = shortcuts.find(s => s.id === currentEditingShortcut);
    if (!shortcut) {
        shortcut = { id: 'custom_' + Date.now() };
        shortcuts.push(shortcut);
    }

    shortcut.name = name;
    shortcut.url = url;
    shortcut.icon = icon;
    shortcut.color = color;
    if (color === 'custom') {
        shortcut.customColor = selectedCustomColor;
    } else {
        delete shortcut.customColor;
    }

    saveShortcuts();
    renderShortcuts();
    closeShortcutModal();
}

function saveShortcuts() {
    localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
}

// ── Bilgisayardan ikon seçme ──────────────────────────────────
// Tarayıcı seçilen dosyanın gerçek yolunu vermez, eklenti sayfaları da file://
// görsellerini açamaz. Bu yüzden görsel küçültülüp "img:data:..." olarak ikonun
// içine gömülür; localStorage'da az yer kaplar ve .yay yedeğine de girer.
const SHORTCUT_ICON_MAX_SIZE = 128;
const SHORTCUT_ICON_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function chooseShortcutIconFile() {
    document.getElementById('shortcutIconFile').click();
}

async function imageFileToIconDataUrl(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, SHORTCUT_ICON_MAX_SIZE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    // WebP hem küçük hem saydamlığı korur
    return canvas.toDataURL('image/webp', 0.9);
}

async function handleShortcutIconFile(event) {
    const input = event.target;
    const file = input.files[0];
    // Aynı dosya tekrar seçilebilsin
    input.value = '';
    if (!file) return;

    if (!SHORTCUT_ICON_TYPES.includes(file.type)) {
        alert(t('icon-file-invalid'));
        return;
    }

    try {
        document.getElementById('shortcutIcon').value = 'img:' + await imageFileToIconDataUrl(file);
        updateShortcutIconPreview();
        // Ad boşsa dosya adını öner
        const nameInput = document.getElementById('shortcutName');
        if (!nameInput.value.trim()) nameInput.value = file.name.replace(/\.[^.]+$/, '');
    } catch (error) {
        console.warn('Icon image could not be read:', error);
        alert(t('icon-file-error'));
    }
}

function updateShortcutIconPreview() {
    const value = document.getElementById('shortcutIcon').value.trim();
    const preview = document.getElementById('shortcutIconPreview');

    if (value.startsWith('img:')) {
        const img = document.createElement('img');
        img.src = value.slice(4);
        img.alt = '';
        preview.replaceChildren(img);
    } else {
        const i = document.createElement('i');
        i.className = value || 'fas fa-globe';
        preview.replaceChildren(i);
    }
}

function initColorPalette() {
    const paletteContainer = document.getElementById('colorPalette');

    colorPalette.forEach(color => {
        const colorSwatch = document.createElement('button');
        colorSwatch.type = 'button';
        colorSwatch.className = 'color-swatch';
        colorSwatch.style.backgroundColor = color;
        colorSwatch.dataset.color = color;
        colorSwatch.title = color;
        colorSwatch.setAttribute('aria-label', color);
        paletteContainer.appendChild(colorSwatch);
    });

    paletteContainer.addEventListener('click', (e) => {
        const swatch = e.target.closest('.color-swatch');
        if (swatch) selectColor(swatch.dataset.color);
    });
}

function highlightSwatch(color) {
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.toggle('selected', swatch.dataset.color === color);
    });
}

function selectColor(color) {
    selectedCustomColor = color;
    document.getElementById('customColorInput').value = color;
    document.getElementById('hexColorInput').value = color;
    updateColorPreview(color);
    highlightSwatch(color);
}

function toggleCustomColorPicker() {
    const isCustom = document.getElementById('shortcutColor').value === 'custom';
    document.getElementById('colorPickerGroup').style.display = isCustom ? 'block' : 'none';
    if (isCustom) updateColorPreview(selectedCustomColor);
}

function updateColorFromInput() {
    selectColor(document.getElementById('customColorInput').value);
}

function updateColorFromHex() {
    const hexInput = document.getElementById('hexColorInput');
    let hex = hexInput.value.trim();
    if (!hex.startsWith('#')) hex = '#' + hex;

    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        selectColor(hex.toLowerCase());
    } else {
        hexInput.value = selectedCustomColor;
    }
}

function updateColorPreview(color) {
    const preview = document.getElementById('colorPreview');
    preview.style.color = color;
    preview.style.borderColor = color;
    preview.style.background = `linear-gradient(135deg, ${color}20, ${color}10)`;
}

// ── Cursor Spotlight — tema rengine göre ──────────────────────
function getSpotlightColorForTheme() {
    const body = document.body;
    if (body.classList.contains('midnight-mode')) return 'rgba(180, 140, 255, 0.28)';
    if (body.classList.contains('dark-mode')) return 'rgba(220, 230, 255, 0.22)';
    return 'rgba(99, 155, 255, 0.30)';
}

// Kartlar yeniden çizilse de çalışsın diye dinleyiciler kapsayıcıda
function initShortcutSpotlight() {
    const container = document.querySelector('.shortcuts');
    let activeCard = null;

    container.addEventListener('mousemove', (e) => {
        const card = e.target.closest('.shortcut');
        if (activeCard && activeCard !== card) activeCard.style.setProperty('--so', '0');
        activeCard = card;
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const scale = getPageScale();
        card.style.setProperty('--sx', ((e.clientX - rect.left) / scale) + 'px');
        card.style.setProperty('--sy', ((e.clientY - rect.top) / scale) + 'px');
        card.style.setProperty('--so', '1');
        card.style.setProperty('--sc', getSpotlightColorForTheme());
    });

    container.addEventListener('mouseleave', () => {
        if (activeCard) activeCard.style.setProperty('--so', '0');
        activeCard = null;
    });
}
