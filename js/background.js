// ==================== BACKGROUND MANAGEMENT MODULE ====================

const backgroundConfig = {
    backgroundType: 'theme', // 'theme' or 'upload'
    themeBackground: 'general',
    selectedImages: [],
    currentImageIndex: 0,
    blur: 5,
    brightness: 100,
    contrast: 100,
    rotationEnabled: false,
    rotationInterval: 5, // saniye
    rotationTimer: null
};

let backgroundDBPromise = null;

function loadBackgroundConfig() {
    const saved = localStorage.getItem('backgroundConfig');
    if (!saved) return;
    try {
        const config = JSON.parse(saved);
        delete config.rotationTimer;
        Object.assign(backgroundConfig, config);
        if (!Array.isArray(backgroundConfig.selectedImages)) backgroundConfig.selectedImages = [];
    } catch (e) {
        console.error('Error loading background config:', e);
    }
}

function saveBackgroundConfig() {
    const { rotationTimer, ...persisted } = backgroundConfig;
    localStorage.setItem('backgroundConfig', JSON.stringify(persisted));
}

// IndexedDB bağlantısı bir kez açılır ve yeniden kullanılır
function openBackgroundDB() {
    if (!backgroundDBPromise) {
        backgroundDBPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open('BrowserStartupDB', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('backgrounds')) {
                    db.createObjectStore('backgrounds', { keyPath: 'fileName' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                backgroundDBPromise = null;
                reject(request.error);
            };
        });
    }
    return backgroundDBPromise;
}

function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function promisifyTransaction(tx) {
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    });
}

async function uploadBackgroundImage() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;

    fileInput.onchange = async function(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            for (const file of files) {
                if (!file.type.startsWith('image/')) {
                    alert(t('images-only'));
                    continue;
                }

                const base64 = await fileToBase64(file);
                await storeBackgroundImage(file.name, base64);

                if (!backgroundConfig.selectedImages.includes(file.name)) {
                    backgroundConfig.selectedImages.push(file.name);
                }
            }

            backgroundConfig.backgroundType = 'upload';
            saveBackgroundConfig();
            updateBackgroundDisplay();
            refreshBackgroundList();
            showSettingsFeedback('background-feedback', t('images-uploaded'));
        } catch (error) {
            console.error('Error uploading background:', error);
            alert(t('image-upload-error'));
        }
    };

    fileInput.click();
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Görseli IndexedDB'ye yazar; IndexedDB yoksa localStorage'a düşer
async function storeBackgroundImage(fileName, base64Data) {
    try {
        const db = await openBackgroundDB();
        const tx = db.transaction('backgrounds', 'readwrite');
        tx.objectStore('backgrounds').put({ fileName, base64Data, timestamp: Date.now() });
        await promisifyTransaction(tx);
        return;
    } catch (e) {
        console.warn('IndexedDB not available, using localStorage:', e);
    }

    try {
        localStorage.setItem(`bg_${fileName}`, base64Data);
    } catch (e) {
        console.error('Storage quota exceeded:', e);
        alert(t('storage-full'));
    }
}

async function getBackgroundImage(fileName) {
    try {
        const db = await openBackgroundDB();
        const result = await promisifyRequest(db.transaction('backgrounds', 'readonly').objectStore('backgrounds').get(fileName));
        if (result) return result.base64Data;
    } catch (e) {
        // localStorage yedeğine düş
    }
    return localStorage.getItem(`bg_${fileName}`);
}

async function getAllStoredBackgrounds() {
    const legacy = Object.keys(localStorage).filter(k => k.startsWith('bg_')).map(k => k.slice(3));
    try {
        const db = await openBackgroundDB();
        const keys = await promisifyRequest(db.transaction('backgrounds', 'readonly').objectStore('backgrounds').getAllKeys());
        return [...new Set([...keys, ...legacy])];
    } catch (e) {
        return legacy;
    }
}

async function deleteBackgroundImage(fileName) {
    try {
        const db = await openBackgroundDB();
        const tx = db.transaction('backgrounds', 'readwrite');
        tx.objectStore('backgrounds').delete(fileName);
        await promisifyTransaction(tx);
    } catch (e) {
        // localStorage'dan silmeye devam et
    }
    localStorage.removeItem(`bg_${fileName}`);

    backgroundConfig.selectedImages = backgroundConfig.selectedImages.filter(f => f !== fileName);
    backgroundConfig.currentImageIndex = 0;
    if (backgroundConfig.selectedImages.length === 0) {
        backgroundConfig.backgroundType = 'theme';
        stopBackgroundRotation();
    }

    saveBackgroundConfig();
    updateBackgroundDisplay();
    refreshBackgroundList();
}

function toggleBackgroundImage(fileName) {
    const index = backgroundConfig.selectedImages.indexOf(fileName);
    if (index > -1) {
        backgroundConfig.selectedImages.splice(index, 1);
    } else {
        backgroundConfig.selectedImages.push(fileName);
    }

    backgroundConfig.currentImageIndex = 0;
    backgroundConfig.backgroundType = backgroundConfig.selectedImages.length > 0 ? 'upload' : 'theme';

    saveBackgroundConfig();
    updateBackgroundDisplay();
    refreshBackgroundList();
}

function getBackgroundFilterValue() {
    return `blur(${backgroundConfig.blur}px) brightness(${backgroundConfig.brightness}%) contrast(${backgroundConfig.contrast}%)`;
}

function removeImageOverlay() {
    const imageOverlay = document.getElementById('imageBackgroundOverlay');
    if (imageOverlay) imageOverlay.remove();
}

async function updateBackgroundDisplay() {
    const body = document.body;
    body.classList.remove('custom-background', 'image-background');
    body.style.backgroundImage = 'none';
    body.style.filter = '';

    const useImage = backgroundConfig.backgroundType === 'upload' && backgroundConfig.selectedImages.length > 0;
    if (!useImage) {
        body.style.backgroundColor = '';
        removeImageOverlay();
        return;
    }

    body.style.backgroundColor = '#000';
    if (backgroundConfig.currentImageIndex >= backgroundConfig.selectedImages.length) {
        backgroundConfig.currentImageIndex = 0;
    }
    const fileName = backgroundConfig.selectedImages[backgroundConfig.currentImageIndex];
    const base64 = await getBackgroundImage(fileName);
    if (!base64) return;

    body.classList.add('image-background');

    let imageOverlay = document.getElementById('imageBackgroundOverlay');
    if (!imageOverlay) {
        imageOverlay = document.createElement('div');
        imageOverlay.id = 'imageBackgroundOverlay';
        imageOverlay.setAttribute('aria-hidden', 'true');
        document.body.insertBefore(imageOverlay, document.body.firstChild);
    }
    imageOverlay.style.backgroundImage = `url("${base64}")`;
    imageOverlay.style.filter = getBackgroundFilterValue();
}

// Kaydırıcılar: görseli yeniden okumadan yalnızca filtreyi günceller
function applyBackgroundFilters() {
    const imageOverlay = document.getElementById('imageBackgroundOverlay');
    if (imageOverlay) imageOverlay.style.filter = getBackgroundFilterValue();
}

function setBackgroundFilter(property, value, min, max) {
    const number = Number(value);
    backgroundConfig[property] = Math.max(min, Math.min(max, Number.isFinite(number) ? number : 0));
    saveBackgroundConfig();
    applyBackgroundFilters();
    updateBackgroundSliderLabels();
}

function setBackgroundBlur(value) {
    setBackgroundFilter('blur', value, 0, 60);
}

function setBackgroundBrightness(value) {
    setBackgroundFilter('brightness', value, 0, 200);
}

function setBackgroundContrast(value) {
    setBackgroundFilter('contrast', value, 0, 200);
}

function startBackgroundRotation() {
    if (backgroundConfig.selectedImages.length <= 1) return;

    clearBackgroundRotationTimer();
    backgroundConfig.rotationEnabled = true;
    saveBackgroundConfig();
    backgroundConfig.rotationTimer = setTimeout(rotateBackgroundImage, backgroundConfig.rotationInterval * 1000);
}

async function rotateBackgroundImage() {
    if (!backgroundConfig.rotationEnabled || backgroundConfig.selectedImages.length === 0) return;

    backgroundConfig.currentImageIndex = (backgroundConfig.currentImageIndex + 1) % backgroundConfig.selectedImages.length;

    const imageOverlay = document.getElementById('imageBackgroundOverlay');
    if (imageOverlay) imageOverlay.style.opacity = '0';

    await new Promise(resolve => setTimeout(resolve, 550));
    await updateBackgroundDisplay();

    const updatedOverlay = document.getElementById('imageBackgroundOverlay');
    if (updatedOverlay) updatedOverlay.style.opacity = '1';

    backgroundConfig.rotationTimer = setTimeout(rotateBackgroundImage, backgroundConfig.rotationInterval * 1000);
}

function stopBackgroundRotation() {
    clearBackgroundRotationTimer();
    const imageOverlay = document.getElementById('imageBackgroundOverlay');
    if (imageOverlay) imageOverlay.style.opacity = '1';
    backgroundConfig.rotationEnabled = false;
    saveBackgroundConfig();
}

function clearBackgroundRotationTimer() {
    if (backgroundConfig.rotationTimer) {
        clearTimeout(backgroundConfig.rotationTimer);
        backgroundConfig.rotationTimer = null;
    }
}

// 1 veya daha az görsel seçiliyse döngüyü kapat
function checkAndDisableRotationIfNeeded() {
    if (backgroundConfig.selectedImages.length <= 1 && backgroundConfig.rotationEnabled) {
        stopBackgroundRotation();
        document.getElementById('backgroundRotationEnabled').checked = false;
    }
}

function setBackgroundRotationInterval(seconds) {
    const interval = parseInt(seconds, 10);
    backgroundConfig.rotationInterval = Math.max(1, Math.min(60, Number.isNaN(interval) ? 5 : interval));
    saveBackgroundConfig();
    updateBackgroundSliderLabels();

    if (backgroundConfig.rotationEnabled && backgroundConfig.selectedImages.length > 1) {
        clearBackgroundRotationTimer();
        backgroundConfig.rotationTimer = setTimeout(rotateBackgroundImage, backgroundConfig.rotationInterval * 1000);
    }
}

function handleBackgroundTypeChange(type) {
    backgroundConfig.backgroundType = type;
    document.getElementById('uploadBackgroundSection').style.display = type === 'upload' ? 'block' : 'none';
    if (type === 'theme') {
        stopBackgroundRotation();
        document.getElementById('backgroundRotationEnabled').checked = false;
    }
    saveBackgroundConfig();
    updateBackgroundDisplay();
}

function handleBackgroundRotationToggle(enabled) {
    backgroundConfig.rotationEnabled = enabled;
    saveBackgroundConfig();

    if (enabled && backgroundConfig.selectedImages.length > 1) {
        startBackgroundRotation();
    } else {
        stopBackgroundRotation();
    }
}

async function initializeBackground() {
    loadBackgroundConfig();

    if (backgroundConfig.backgroundType === 'upload' && backgroundConfig.selectedImages.length > 1) {
        backgroundConfig.currentImageIndex = Math.floor(Math.random() * backgroundConfig.selectedImages.length);
    }

    await updateBackgroundDisplay();

    if (backgroundConfig.rotationEnabled) {
        startBackgroundRotation();
    }

    // Ayarlar panelindeki görsel listesi tıklamaları (dosya adı HTML'e gömülmez)
    const list = document.getElementById('uploadedBackgroundImages');
    list.addEventListener('change', (e) => {
        const item = e.target.closest('.background-item');
        if (item && e.target.type === 'checkbox') toggleBackgroundImage(item.dataset.fileName);
    });
    list.addEventListener('click', (e) => {
        const button = e.target.closest('.background-delete-btn');
        if (button) deleteBackgroundImage(button.closest('.background-item').dataset.fileName);
    });
}

function createBackgroundListItem(fileName, base64, isSelected) {
    const item = document.createElement('div');
    item.className = `background-item ${isSelected ? 'selected' : ''}`;
    item.dataset.fileName = fileName;

    const preview = document.createElement('label');
    preview.className = 'background-preview';
    if (base64) preview.style.backgroundImage = `url("${base64}")`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isSelected;
    checkbox.setAttribute('aria-label', fileName);
    preview.appendChild(checkbox);

    const name = document.createElement('div');
    name.className = 'background-name';
    name.textContent = fileName;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'background-delete-btn';
    deleteButton.title = t('delete');
    deleteButton.setAttribute('aria-label', `${t('delete')}: ${fileName}`);
    const icon = document.createElement('i');
    icon.className = 'fas fa-trash';
    deleteButton.appendChild(icon);

    item.append(preview, name, deleteButton);
    return item;
}

async function refreshBackgroundList() {
    const uploadedContainer = document.getElementById('uploadedBackgroundImages');
    const allBackgrounds = await getAllStoredBackgrounds();

    const items = await Promise.all(allBackgrounds.map(async fileName => createBackgroundListItem(
        fileName,
        await getBackgroundImage(fileName),
        backgroundConfig.selectedImages.includes(fileName)
    )));
    uploadedContainer.replaceChildren(...items);

    document.getElementById('backgroundRotationControls').style.display =
        backgroundConfig.selectedImages.length > 1 ? 'block' : 'none';

    checkAndDisableRotationIfNeeded();
}

function updateBackgroundSliderLabels() {
    document.getElementById('blurValue').textContent = backgroundConfig.blur;
    document.getElementById('brightnessValue').textContent = backgroundConfig.brightness + '%';
    document.getElementById('contrastValue').textContent = backgroundConfig.contrast + '%';
    document.getElementById('rotationIntervalValue').textContent = backgroundConfig.rotationInterval + 's';
}

function loadBackgroundSettingsValues() {
    document.querySelectorAll('input[name="backgroundType"]').forEach(radio => {
        radio.checked = radio.value === backgroundConfig.backgroundType;
    });

    document.getElementById('uploadBackgroundSection').style.display =
        backgroundConfig.backgroundType === 'upload' ? 'block' : 'none';

    document.getElementById('backgroundBlur').value = backgroundConfig.blur;
    document.getElementById('backgroundBrightness').value = backgroundConfig.brightness;
    document.getElementById('backgroundContrast').value = backgroundConfig.contrast;
    document.getElementById('backgroundRotationEnabled').checked = backgroundConfig.rotationEnabled;
    document.getElementById('backgroundRotationInterval').value = backgroundConfig.rotationInterval;
    updateBackgroundSliderLabels();

    refreshBackgroundList();
}

// Export backgrounds to base64 for .yay file
async function getBackgroundsForExport() {
    const backgrounds = {};

    for (let fileName of backgroundConfig.selectedImages) {
        const base64 = await getBackgroundImage(fileName);
        if (base64) {
            backgrounds[fileName] = base64;
        }
    }

    return {
        type: backgroundConfig.backgroundType,
        themeBackground: backgroundConfig.themeBackground,
        selectedImages: backgroundConfig.selectedImages,
        blur: backgroundConfig.blur,
        brightness: backgroundConfig.brightness,
        contrast: backgroundConfig.contrast,
        rotationEnabled: backgroundConfig.rotationEnabled,
        rotationInterval: backgroundConfig.rotationInterval,
        images: backgrounds
    };
}

// Import backgrounds from .yay file
async function importBackgroundsFromExport(backgroundData) {
    if (!backgroundData) return;

    try {
        // Store images if present
        if (backgroundData.images) {
            for (let fileName in backgroundData.images) {
                await storeBackgroundImage(fileName, backgroundData.images[fileName]);
            }
        }

        // Restore configuration
        backgroundConfig.backgroundType = backgroundData.type || 'theme';
        backgroundConfig.themeBackground = backgroundData.themeBackground || 'default';
        backgroundConfig.selectedImages = backgroundData.selectedImages || [];
        backgroundConfig.blur = backgroundData.blur || 5;
        backgroundConfig.brightness = backgroundData.brightness || 100;
        backgroundConfig.contrast = backgroundData.contrast || 100;
        backgroundConfig.rotationEnabled = backgroundData.rotationEnabled || false;
        backgroundConfig.rotationInterval = backgroundData.rotationInterval || 5;

        saveBackgroundConfig();

        // Wait a moment for DOM to be ready
        setTimeout(() => {
            loadBackgroundSettingsValues();
            updateBackgroundDisplay();
        }, 100);
    } catch (error) {
        console.error('Error importing backgrounds:', error);
    }
}
