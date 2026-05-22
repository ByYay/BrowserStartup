const backgroundConfig = {
    backgroundType: 'theme',
    themeBackground: 'general',
    selectedImages: [],
    currentImageIndex: 0,
    blur: 5,
    brightness: 100,
    contrast: 100,
    rotationEnabled: false,
    rotationInterval: 5,
    rotationTimer: null
};

function loadBackgroundConfig() {
    const saved = localStorage.getItem('backgroundConfig');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            Object.assign(backgroundConfig, config);
        } catch (e) {
            console.error('Error loading background config:', e);
        }
    }
}

function saveBackgroundConfig() {
    localStorage.setItem('backgroundConfig', JSON.stringify(backgroundConfig));
}

function getThemeBackgrounds() {
    return {
        'general': { name: 'General', value: 'default' }
    };
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
            for (let file of files) {
                if (!file.type.startsWith('image/')) {
                    alert(currentLanguage === 'tr' 
                        ? 'Lütfen sadece görsel dosyası seçiniz!' 
                        : 'Please select only image files!');
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
            
            showSettingsFeedback('background-feedback',
                currentLanguage === 'tr'
                    ? 'Görseller yüklendi!'
                    : 'Images uploaded!');
        } catch (error) {
            console.error('Error uploading background:', error);
            alert(currentLanguage === 'tr'
                ? 'Görsel yüklenirken hata oluştu!'
                : 'Error uploading image!');
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

async function storeBackgroundImage(fileName, base64Data) {
    try {
        if (typeof indexedDB !== 'undefined') {
            const db = await openBackgroundDB();
            const tx = db.transaction('backgrounds', 'readwrite');
            const store = tx.objectStore('backgrounds');
            await store.put({ fileName, base64Data, timestamp: Date.now() });
            return;
        }
    } catch (e) {
        console.warn('IndexedDB not available, using localStorage:', e);
    }
    
    try {
        localStorage.setItem(`bg_${fileName}`, base64Data);
    } catch (e) {
        console.error('Storage quota exceeded:', e);
        alert(currentLanguage === 'tr'
            ? 'Depolama alanı dolu!'
            : 'Storage space exceeded!');
    }
}

function openBackgroundDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('BrowserStartupDB', 1);
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('backgrounds')) {
                db.createObjectStore('backgrounds', { keyPath: 'fileName' });
            }
        };
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getBackgroundImage(fileName) {
    try {
        const db = await openBackgroundDB();
        const tx = db.transaction('backgrounds', 'readonly');
        const store = tx.objectStore('backgrounds');
        const request = store.get(fileName);
        
        return new Promise((resolve) => {
            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result.base64Data);
                } else {
                    resolve(localStorage.getItem(`bg_${fileName}`));
                }
            };
            request.onerror = () => {
                resolve(localStorage.getItem(`bg_${fileName}`));
            };
        });
    } catch (e) {
        return localStorage.getItem(`bg_${fileName}`);
    }
}

async function getAllStoredBackgrounds() {
    const images = [];
    
    try {
        const db = await openBackgroundDB();
        const tx = db.transaction('backgrounds', 'readonly');
        const store = tx.objectStore('backgrounds');
        const request = store.getAll();
        
        return new Promise((resolve) => {
            request.onsuccess = () => {
                const items = request.result;
                resolveWithItems(items);
            };
            
            function resolveWithItems(items) {
                resolve(items.map(item => item.fileName));
            }
        });
    } catch (e) {
        const keys = Object.keys(localStorage);
        return keys
            .filter(k => k.startsWith('bg_'))
            .map(k => k.replace('bg_', ''));
    }
}

async function deleteBackgroundImage(fileName) {
    try {
        const db = await openBackgroundDB();
        const tx = db.transaction('backgrounds', 'readwrite');
        const store = tx.objectStore('backgrounds');
        store.delete(fileName);
    } catch (e) {
        console.log('Trying localStorage deletion');
    }
    
    localStorage.removeItem(`bg_${fileName}`);
    
    backgroundConfig.selectedImages = backgroundConfig.selectedImages.filter(f => f !== fileName);
    
    if (backgroundConfig.selectedImages.length === 0) {
        backgroundConfig.backgroundType = 'theme';
        stopBackgroundRotation();
    }
    
    saveBackgroundConfig();
    updateBackgroundDisplay();
    refreshBackgroundList();
    checkAndDisableRotationIfNeeded();
}

function toggleThemeBackground(themeName) {
    backgroundConfig.backgroundType = 'theme';
    backgroundConfig.themeBackground = themeName;
    backgroundConfig.selectedImages = [];
    stopBackgroundRotation();
    
    const imageOverlay = document.getElementById('imageBackgroundOverlay');
    if (imageOverlay) {
        imageOverlay.remove();
    }
    
    saveBackgroundConfig();
    updateBackgroundDisplay();
    
    const themeButtons = document.querySelectorAll('.theme-bg-btn');
    themeButtons.forEach(btn => btn.classList.remove('active'));
    
    const selectedBtn = Array.from(themeButtons).find(btn => btn.getAttribute('data-theme') === themeName);
    if (selectedBtn) selectedBtn.classList.add('active');
    
    refreshBackgroundList();
    
    showSettingsFeedback('background-feedback',
        currentLanguage === 'tr'
            ? 'Tema seçildi!'
            : 'Theme selected!');
}

function toggleBackgroundImage(fileName) {
    const index = backgroundConfig.selectedImages.indexOf(fileName);
    if (index > -1) {
        backgroundConfig.selectedImages.splice(index, 1);
    } else {
        backgroundConfig.selectedImages.push(fileName);
    }
    
    if (backgroundConfig.selectedImages.length > 0) {
        backgroundConfig.backgroundType = 'upload';
        backgroundConfig.currentImageIndex = 0;
    } else {
        backgroundConfig.backgroundType = 'theme';
    }
    
    saveBackgroundConfig();
    updateBackgroundDisplay();
    refreshBackgroundList();
    checkAndDisableRotationIfNeeded();
}

async function updateBackgroundDisplay() {
    const body = document.body;
    
    body.classList.remove('custom-background', 'image-background');
    
    body.style.backgroundImage = 'none';
    body.style.filter = '';
    
    if (backgroundConfig.backgroundType === 'theme') {
        body.style.backgroundColor = '';
        const imageOverlay = document.getElementById('imageBackgroundOverlay');
        if (imageOverlay) {
            imageOverlay.remove();
        }
    } else if (backgroundConfig.backgroundType === 'upload' && backgroundConfig.selectedImages.length > 0) {
        body.style.backgroundColor = '#000';
        const fileName = backgroundConfig.selectedImages[backgroundConfig.currentImageIndex];
        const base64 = await getBackgroundImage(fileName);
        
        if (base64) {
            body.classList.add('image-background');
            
            const filterValue = `blur(${backgroundConfig.blur}px) brightness(${backgroundConfig.brightness}%) contrast(${backgroundConfig.contrast}%)`;
            
            let imageOverlay = document.getElementById('imageBackgroundOverlay');
            
            if (!imageOverlay) {
                imageOverlay = document.createElement('div');
                imageOverlay.id = 'imageBackgroundOverlay';
                imageOverlay.style.cssText = `
                    position: fixed;
                    top: -40px;
                    left: -40px;
                    width: calc(100% + 80px);
                    height: calc(100% + 80px);
                    background-image: url('${base64}');
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    background-attachment: fixed;
                    z-index: -1;
                    filter: ${filterValue};
                    opacity: 1;
                    transition: opacity 0.55s ease-in-out;
                `;
                document.body.insertBefore(imageOverlay, document.body.firstChild);
            } else {
                imageOverlay.style.backgroundImage = `url('${base64}')`;
                imageOverlay.style.filter = filterValue;
            }
        }
    }
}

function setBackgroundBlur(value) {
    backgroundConfig.blur = Math.max(0, Math.min(60, value));
    saveBackgroundConfig();
    updateBackgroundDisplay();
}

function setBackgroundBrightness(value) {
    backgroundConfig.brightness = Math.max(0, Math.min(200, value));
    saveBackgroundConfig();
    updateBackgroundDisplay();
}

function setBackgroundContrast(value) {
    backgroundConfig.contrast = Math.max(0, Math.min(200, value));
    saveBackgroundConfig();
    updateBackgroundDisplay();
}

function startBackgroundRotation() {
    if (backgroundConfig.selectedImages.length <= 1) {
        return;
    }

    clearBackgroundRotationTimer();
    
    backgroundConfig.rotationEnabled = true;
    saveBackgroundConfig();

    backgroundConfig.rotationTimer = setTimeout(rotateBackgroundImage, backgroundConfig.rotationInterval * 1000);
}

async function rotateBackgroundImage() {
    if (!backgroundConfig.rotationEnabled || backgroundConfig.selectedImages.length === 0) {
        return;
    }
    
    if (backgroundConfig.selectedImages.length === 1) {
        backgroundConfig.currentImageIndex = 0;
    } else {
        backgroundConfig.currentImageIndex = (backgroundConfig.currentImageIndex + 1) % backgroundConfig.selectedImages.length;
    }
    
    const imageOverlay = document.getElementById('imageBackgroundOverlay');
    if (imageOverlay) {
        imageOverlay.style.opacity = '0';
    }
    
    await new Promise(resolve => setTimeout(resolve, 550));
    
    await updateBackgroundDisplay();
    
    const updatedOverlay = document.getElementById('imageBackgroundOverlay');
    if (updatedOverlay) {
        updatedOverlay.style.opacity = '1';
    }
    
    backgroundConfig.rotationTimer = setTimeout(rotateBackgroundImage, backgroundConfig.rotationInterval * 1000);
}

function stopBackgroundRotation() {
    clearBackgroundRotationTimer();

    const imageOverlay = document.getElementById('imageBackgroundOverlay');
    if (imageOverlay) {
        imageOverlay.style.opacity = '1';
    }

    backgroundConfig.rotationEnabled = false;
    saveBackgroundConfig();
}

function clearBackgroundRotationTimer() {
    if (backgroundConfig.rotationTimer) {
        clearTimeout(backgroundConfig.rotationTimer);
        backgroundConfig.rotationTimer = null;
    }
}

function checkAndDisableRotationIfNeeded() {
    if (backgroundConfig.selectedImages.length <= 1 && backgroundConfig.rotationEnabled) {
        backgroundConfig.rotationEnabled = false;
        saveBackgroundConfig();
        stopBackgroundRotation();
        const rotationCheckbox = document.getElementById('backgroundRotationEnabled');
        if (rotationCheckbox) {
            rotationCheckbox.checked = false;
        }
    }
}

function setBackgroundRotationInterval(seconds) {
    const interval = parseInt(seconds, 10);
    backgroundConfig.rotationInterval = Math.max(1, Math.min(60, Number.isNaN(interval) ? 5 : interval));
    saveBackgroundConfig();
    
    if (backgroundConfig.rotationEnabled && backgroundConfig.selectedImages.length > 1) {
        clearBackgroundRotationTimer();
        backgroundConfig.rotationTimer = setTimeout(rotateBackgroundImage, backgroundConfig.rotationInterval * 1000);
    }
}

function handleBackgroundTypeChange(type) {
    backgroundConfig.backgroundType = type;
    const uploadSection = document.getElementById('uploadBackgroundSection');
    if (uploadSection) {
        uploadSection.style.display = type === 'upload' ? 'block' : 'none';
    }
    if (type === 'theme') {
        stopBackgroundRotation();
        const rotationCheckbox = document.getElementById('backgroundRotationEnabled');
        if (rotationCheckbox) {
            rotationCheckbox.checked = false;
        }
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
    
    if (backgroundConfig.rotationEnabled && backgroundConfig.selectedImages.length > 0) {
        startBackgroundRotation();
    }
}

async function refreshBackgroundList() {
    const uploadedContainer = document.getElementById('uploadedBackgroundImages');
    if (!uploadedContainer) return;
    
    uploadedContainer.innerHTML = '';
    
    const allBackgrounds = await getAllStoredBackgrounds();
    
    for (let fileName of allBackgrounds) {
        const isSelected = backgroundConfig.selectedImages.includes(fileName);
        const item = document.createElement('div');
        item.className = `background-item ${isSelected ? 'selected' : ''}`;
        
        const base64 = await getBackgroundImage(fileName);
        
        item.innerHTML = `
            <div class="background-preview" style="background-image: url('${base64}');">
                <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleBackgroundImage('${fileName}')">
            </div>
            <div class="background-name">${fileName}</div>
            <button class="background-delete-btn" onclick="deleteBackgroundImage('${fileName}')" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        uploadedContainer.appendChild(item);
    }
    
    const rotationControls = document.getElementById('backgroundRotationControls');
    if (rotationControls) {
        rotationControls.style.display = backgroundConfig.selectedImages.length > 1 ? 'block' : 'none';
    }
    
    checkAndDisableRotationIfNeeded();
}

function loadBackgroundSettingsValues() {
    const bgTypeRadios = document.querySelectorAll('input[name="backgroundType"]');
    bgTypeRadios.forEach(radio => {
        if (radio.value === backgroundConfig.backgroundType) {
            radio.checked = true;
        }
    });
    
    const uploadSection = document.getElementById('uploadBackgroundSection');
    if (uploadSection) {
        uploadSection.style.display = backgroundConfig.backgroundType === 'upload' ? 'block' : 'none';
    }
    
    const blurSlider = document.getElementById('backgroundBlur');
    if (blurSlider) {
        blurSlider.value = backgroundConfig.blur;
        updateBlurValue();
    }
    
    const brightnessSlider = document.getElementById('backgroundBrightness');
    if (brightnessSlider) {
        brightnessSlider.value = backgroundConfig.brightness;
        updateBrightnessValue();
    }
    
    const contrastSlider = document.getElementById('backgroundContrast');
    if (contrastSlider) {
        contrastSlider.value = backgroundConfig.contrast;
        updateContrastValue();
    }
    
    const rotationEnabledCheckbox = document.getElementById('backgroundRotationEnabled');
    if (rotationEnabledCheckbox) {
        rotationEnabledCheckbox.checked = backgroundConfig.rotationEnabled;
    }
    
    const rotationIntervalSlider = document.getElementById('backgroundRotationInterval');
    if (rotationIntervalSlider) {
        rotationIntervalSlider.value = backgroundConfig.rotationInterval;
        updateRotationIntervalValue();
    }
    
    if (backgroundConfig.rotationEnabled && backgroundConfig.selectedImages.length > 1) {
        stopBackgroundRotation();
        startBackgroundRotation();
    }
    
    refreshBackgroundList();
}

function updateBlurValue() {
    const slider = document.getElementById('backgroundBlur');
    const value = document.getElementById('blurValue');
    if (value) value.textContent = slider.value;
}

function updateBrightnessValue() {
    const slider = document.getElementById('backgroundBrightness');
    const value = document.getElementById('brightnessValue');
    if (value) value.textContent = slider.value + '%';
}

function updateContrastValue() {
    const slider = document.getElementById('backgroundContrast');
    const value = document.getElementById('contrastValue');
    if (value) value.textContent = slider.value + '%';
}

function updateRotationIntervalValue() {
    const slider = document.getElementById('backgroundRotationInterval');
    const value = document.getElementById('rotationIntervalValue');
    if (value) value.textContent = slider.value + 's';
}

function updateThemeBackgroundButtons() {
    const themeButtons = document.querySelectorAll('.theme-bg-btn');
    themeButtons.forEach(btn => btn.classList.remove('active'));
    
    const selectedBtn = Array.from(themeButtons).find(btn => btn.getAttribute('data-theme') === backgroundConfig.themeBackground);
    if (selectedBtn) selectedBtn.classList.add('active');
}

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

async function importBackgroundsFromExport(backgroundData) {
    if (!backgroundData) return;
    
    try {
        if (backgroundData.images) {
            for (let fileName in backgroundData.images) {
                await storeBackgroundImage(fileName, backgroundData.images[fileName]);
            }
        }
        
        backgroundConfig.backgroundType = backgroundData.type || 'theme';
        backgroundConfig.themeBackground = backgroundData.themeBackground || 'default';
        backgroundConfig.selectedImages = backgroundData.selectedImages || [];
        backgroundConfig.blur = backgroundData.blur || 5;
        backgroundConfig.brightness = backgroundData.brightness || 100;
        backgroundConfig.contrast = backgroundData.contrast || 100;
        backgroundConfig.rotationEnabled = backgroundData.rotationEnabled || false;
        backgroundConfig.rotationInterval = backgroundData.rotationInterval || 5;
        
        saveBackgroundConfig();
        
        setTimeout(() => {
            loadBackgroundSettingsValues();
            updateBackgroundDisplay();
        }, 100);
    } catch (error) {
        console.error('Error importing backgrounds:', error);
    }
}

window.addEventListener('load', initializeBackground);
