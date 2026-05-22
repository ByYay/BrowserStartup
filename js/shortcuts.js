let currentEditingShortcut = null;
let shortcutContextMenu = null;
let selectedCustomColor = '#3498db';

const colorPalette = [
    '#e74c3c', '#c0392b', '#d35400', '#e67e22', '#f39c12',
    '#f1c40f', '#2ecc71', '#27ae60', '#16a085', '#1abc9c',
    '#3498db', '#2980b9', '#9b59b6', '#8e44ad', '#34495e',
    '#2c3e50', '#95a5a6', '#7f8c8d', '#e91e63', '#9c27b0',
    '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
    '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b',
    '#ffc107', '#ff9800', '#ff5722', '#795548', '#607d8b'
];

const DEFAULT_SHORTCUTS = [
    { id: 'google', name: 'Google', url: 'https://google.com', icon: 'img:https://www.google.com/favicon.ico', color: 'translate' },
    { id: 'github', name: 'GitHub', url: 'https://github.com', icon: 'fab fa-github', color: 'github' },
    { id: 'youtube', name: 'YouTube', url: 'https://youtube.com', icon: 'fab fa-youtube', color: 'youtube' },
    { id: 'gmail', name: 'Gmail', url: 'https://gmail.com', icon: 'img:https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico', color: 'gmail' },
    { id: 'stackoverflow', name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: 'fab fa-stack-overflow', color: 'stackoverflow' },
    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com', icon: 'fas fa-microchip', color: 'chatgpt' },
];

let shortcuts = JSON.parse(localStorage.getItem('shortcuts'));
if (!shortcuts) {
    shortcuts = DEFAULT_SHORTCUTS;
    localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
}

function initShortcuts() {
    renderShortcuts();
    addShortcutEventListeners();
    initColorPalette();
    shortcutContextMenu = document.getElementById('shortcutContextMenu');
}

function renderShortcuts() {
    const shortcutsContainer = document.querySelector('.shortcuts');
    if (!shortcutsContainer) return;

    shortcutsContainer.innerHTML = '';

    shortcuts.forEach(shortcut => {
        const shortcutElement = createShortcutElement(shortcut);
        shortcutsContainer.appendChild(shortcutElement);
    });
}

function createShortcutElement(shortcut) {
    const a = document.createElement('a');
    a.href = shortcut.url;
    a.className = `shortcut ${shortcut.color || ''}`;
    a.dataset.shortcutId = shortcut.id;
    a.setAttribute('data-tr-title', shortcut.name);

    if (shortcut.color === 'custom' && shortcut.customColor) {
        a.style.setProperty('--custom-color', shortcut.customColor);
        a.classList.add('custom-color');
    }

    if (shortcut.icon.startsWith('img:')) {
        const img = document.createElement('img');
        img.src = shortcut.icon.replace('img:', '');
        img.alt = shortcut.name;
        a.appendChild(img);
    } else {
        const i = document.createElement('i');
        i.className = shortcut.icon;
        
        if (shortcut.color === 'custom' && shortcut.customColor) {
            i.style.color = shortcut.customColor;
        }
        
        a.appendChild(i);
    }

    const span = document.createElement('span');
    span.textContent = shortcut.name;
    a.appendChild(span);

    return a;
}

function addShortcutEventListeners() {
    document.addEventListener('contextmenu', handleRightClick);
    document.addEventListener('click', hideContextMenu);
}

function handleRightClick(e) {
    const shortcut = e.target.closest('.shortcut');
    if (shortcut) {
        e.preventDefault();
        currentEditingShortcut = shortcut.dataset.shortcutId;
        showContextMenu(e.pageX, e.pageY);
    }
}

function showContextMenu(x, y) {
    if (!shortcutContextMenu) return;

    shortcutContextMenu.style.display = 'block';
    shortcutContextMenu.style.left = x + 'px';
    shortcutContextMenu.style.top = y + 'px';

    const rect = shortcutContextMenu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        shortcutContextMenu.style.left = (x - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
        shortcutContextMenu.style.top = (y - rect.height) + 'px';
    }
}

function hideContextMenu() {
    if (shortcutContextMenu) {
        shortcutContextMenu.style.display = 'none';
    }
}

function editShortcut() {
    hideContextMenu();
    
    const shortcut = shortcuts.find(s => s.id === currentEditingShortcut);
    if (!shortcut) return;

    document.getElementById('shortcutName').value = shortcut.name;
    document.getElementById('shortcutUrl').value = shortcut.url;
    document.getElementById('shortcutIcon').value = shortcut.icon.startsWith('img:') ? shortcut.icon : shortcut.icon;
    
    if (shortcut.customColor) {
        document.getElementById('shortcutColor').value = 'custom';
        selectedCustomColor = shortcut.customColor;
        document.getElementById('customColorInput').value = shortcut.customColor;
        document.getElementById('hexColorInput').value = shortcut.customColor;
        toggleCustomColorPicker();
        selectColor(shortcut.customColor);
    } else {
        document.getElementById('shortcutColor').value = shortcut.color || '';
        toggleCustomColorPicker();
    }

    const currentLang = (typeof getCurrentLanguage === 'function') ? getCurrentLanguage() : 
                       (window.currentLanguage || 'en');
    
    const editTitle = translations[currentLang]?.['edit-shortcut-title'] || 'Edit Shortcut';
    document.querySelector('#shortcutModal .modal-header h3').textContent = editTitle;

    document.getElementById('shortcutModalOverlay').style.display = 'flex';
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

    const currentLang = (typeof getCurrentLanguage === 'function') ? getCurrentLanguage() : 
                       (window.currentLanguage || 'en');
    
    const addTitle = translations[currentLang]?.['add-shortcut'] || 'Add New Shortcut';
    document.querySelector('#shortcutModal .modal-header h3').textContent = addTitle;

    document.getElementById('shortcutModalOverlay').style.display = 'flex';
}

function deleteShortcut() {
    hideContextMenu();
    
    if (!currentEditingShortcut) return;

    const shortcut = shortcuts.find(s => s.id === currentEditingShortcut);
    if (!shortcut) return;

    const currentLang = (typeof getCurrentLanguage === 'function') ? getCurrentLanguage() : 
                       (window.currentLanguage || 'en');
    
    const deleteText = translations[currentLang]?.['confirm-delete'] || 'Are you sure you want to delete';
    const confirmMessage = `${deleteText} "${shortcut.name}"?`;

    if (confirm(confirmMessage)) {
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

    const currentLang = (typeof getCurrentLanguage === 'function') ? getCurrentLanguage() : 
                       (window.currentLanguage || 'en');

    if (!name || !url || !icon) {
        const message = translations[currentLang]?.['fill-required-fields'] || 'Please fill in all required fields.';
        alert(message);
        return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const message = translations[currentLang]?.['invalid-url'] || 'Please enter a valid URL starting with http:// or https://';
        alert(message);
        return;
    }

    if (currentEditingShortcut) {
        const shortcut = shortcuts.find(s => s.id === currentEditingShortcut);
        if (shortcut) {
            shortcut.name = name;
            shortcut.url = url;
            shortcut.icon = icon;
            
            if (color === 'custom') {
                shortcut.color = 'custom';
                shortcut.customColor = selectedCustomColor;
            } else {
                shortcut.color = color;
                delete shortcut.customColor;
            }
        }
    } else {
        const newId = 'custom_' + Date.now();
        const newShortcut = {
            id: newId,
            name: name,
            url: url,
            icon: icon,
            color: color
        };
        
        if (color === 'custom') {
            newShortcut.customColor = selectedCustomColor;
        }
        
        shortcuts.push(newShortcut);
    }

    saveShortcuts();
    renderShortcuts();
    closeShortcutModal();
}

function saveShortcuts() {
    localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
}

document.addEventListener('DOMContentLoaded', function() {
    const modalOverlay = document.getElementById('shortcutModalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                closeShortcutModal();
            }
        });
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeShortcutModal();
    }
});

window.addEventListener('load', initShortcuts);

function initColorPalette() {
    const paletteContainer = document.getElementById('colorPalette');
    if (!paletteContainer) return;

    paletteContainer.innerHTML = '';
    
    colorPalette.forEach(color => {
        const colorSwatch = document.createElement('div');
        colorSwatch.className = 'color-swatch';
        colorSwatch.style.backgroundColor = color;
        colorSwatch.setAttribute('data-color', color);
        colorSwatch.title = color;
        
        colorSwatch.addEventListener('click', () => {
            selectColor(color);
        });
        
        paletteContainer.appendChild(colorSwatch);
    });
}

function selectColor(color) {
    selectedCustomColor = color;
    document.getElementById('customColorInput').value = color;
    document.getElementById('hexColorInput').value = color;
    updateColorPreview(color);
    
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.remove('selected');
    });
    
    const selectedSwatch = document.querySelector(`[data-color="${color}"]`);
    if (selectedSwatch) {
        selectedSwatch.classList.add('selected');
    }
}

function toggleCustomColorPicker() {
    const colorSelect = document.getElementById('shortcutColor');
    const colorPickerGroup = document.getElementById('colorPickerGroup');
    
    if (colorSelect.value === 'custom') {
        colorPickerGroup.style.display = 'block';
        updateColorPreview(selectedCustomColor);
    } else {
        colorPickerGroup.style.display = 'none';
    }
}

function updateColorFromInput() {
    const color = document.getElementById('customColorInput').value;
    document.getElementById('hexColorInput').value = color;
    selectedCustomColor = color;
    updateColorPreview(color);
    
    const matchingSwatch = document.querySelector(`[data-color="${color}"]`);
    document.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.classList.remove('selected');
    });
    if (matchingSwatch) {
        matchingSwatch.classList.add('selected');
    }
}

function updateColorFromHex() {
    const hexInput = document.getElementById('hexColorInput');
    let hex = hexInput.value.trim();
    
    if (!hex.startsWith('#')) {
        hex = '#' + hex;
    }
    
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    if (hexPattern.test(hex)) {
        document.getElementById('customColorInput').value = hex;
        selectedCustomColor = hex;
        updateColorPreview(hex);
        hexInput.value = hex;
        
        const matchingSwatch = document.querySelector(`[data-color="${hex}"]`);
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.classList.remove('selected');
        });
        if (matchingSwatch) {
            matchingSwatch.classList.add('selected');
        }
    } else {
        hexInput.value = selectedCustomColor;
    }
}

function updateColorPreview(color) {
    const preview = document.getElementById('colorPreview');
    if (preview) {
        preview.style.color = color;
        preview.style.borderColor = color;
        preview.style.background = `linear-gradient(135deg, ${color}20, ${color}10)`;
    }
}

function getSpotlightColorForTheme() {
    const body = document.body;
    if (body.classList.contains('midnight-mode')) {
        return 'rgba(180, 140, 255, 0.28)';
    } else if (body.classList.contains('dark-mode')) {
        return 'rgba(220, 230, 255, 0.22)';
    } else {
        return 'rgba(99, 155, 255, 0.30)';
    }
}

function initShortcutSpotlight() {
    const container = document.querySelector('.shortcuts');
    if (!container) return;
    if (container._spotlightInit) return;
    container._spotlightInit = true;

    container.addEventListener('mousemove', function(e) {
        const card = e.target.closest('.shortcut');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const color = getSpotlightColorForTheme();
        card.style.setProperty('--sx', x + 'px');
        card.style.setProperty('--sy', y + 'px');
        card.style.setProperty('--so', '1');
        card.style.setProperty('--sc', color);
    });

    container.addEventListener('mouseleave', function() {
        container.querySelectorAll('.shortcut').forEach(c => {
            c.style.setProperty('--so', '0');
        });
    });

    container.querySelectorAll('.shortcut').forEach(card => {
        card.addEventListener('mouseleave', function() {
            card.style.setProperty('--so', '0');
        });
    });
}

window.addEventListener('load', () => setTimeout(initShortcutSpotlight, 250));
