// ==================== VOCABULARY (KELİME DEFTERİ) ====================
// Varsayılan görünüm rastgele kelime kartıdır; ekleme/düzenleme ayrı bir görünümdedir.
// Kartlar "torba" yöntemiyle gösterilir: her kelime bir turda bir kez çıkar, tur
// bitince torba yeniden karıştırılır ve yeni turun ilk kelimesi son gösterilenle aynı
// olamaz. Böylece bir kelime art arda gelmez ve hepsi eşit sıklıkta görünür.
// Torba localStorage'da tutulduğu için her yeni sekme sıradaki kelimeyle açılır.

const VOCAB_WORDS_KEY = 'vocabWords';
const VOCAB_QUEUE_KEY = 'vocabQueue';
const VOCAB_LAST_KEY = 'vocabLast';
const VOCAB_TRANSLATE_DELAY = 600;
const VOCAB_FADE_DURATION = 280; // css/vocab.css .vocab-card.fading ve .vocab-view-* ile aynı
// Translator API bazı ortamlarda yanıt vermeden bekleyebiliyor; arayüz takılı kalmasın
const VOCAB_TRANSLATE_TIMEOUT = 15000;

let vocabWords = loadVocabWords();
let vocabCurrentId = null;
let vocabFlipped = false;
let vocabCardFading = false;
let vocabViewSwitching = false;
let vocabView = 'cards';
let vocabEditingId = null;
// Kullanıcı anlamı kendisi yazdıysa otomatik çeviri üzerine yazmasın
let vocabMeaningTouched = false;
let vocabTranslateTimer = null;
let vocabTranslateRequest = 0;
let vocabTranslatorPromise = null;

// ---------- Depolama ----------

// Aynı milisaniyede eklenen kelimeler de (ör. içe aktarma) ayrı kimlik alır
function createVocabId() {
    return `w_${crypto.randomUUID()}`;
}

function loadVocabWords() {
    try {
        const saved = JSON.parse(localStorage.getItem(VOCAB_WORDS_KEY));
        if (Array.isArray(saved)) {
            const seenIds = new Set();
            return saved
                .filter(w => w && typeof w.word === 'string' && w.word.trim())
                .map(w => {
                    let id = w.id ? String(w.id) : '';
                    if (!id || seenIds.has(id)) id = createVocabId();
                    seenIds.add(id);
                    return {
                        id,
                        word: w.word.trim(),
                        meaning: typeof w.meaning === 'string' ? w.meaning.trim() : ''
                    };
                });
        }
    } catch (e) {
        console.warn('Saved vocabulary is corrupted, starting empty:', e);
    }
    return [];
}

function saveVocabWords() {
    localStorage.setItem(VOCAB_WORDS_KEY, JSON.stringify(vocabWords));
}

function findVocabWord(id) {
    return vocabWords.find(w => w.id === id);
}

// ---------- Kart sırası (torba) ----------

function shuffleArray(items) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = secureRandomInt(i + 1);
        [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
}

function readVocabQueue() {
    try {
        const queue = JSON.parse(localStorage.getItem(VOCAB_QUEUE_KEY));
        if (Array.isArray(queue)) return queue.filter(id => findVocabWord(id));
    } catch (e) {
        // Bozuk sıra: yeniden karıştırılır
    }
    return [];
}

function writeVocabQueue(queue) {
    localStorage.setItem(VOCAB_QUEUE_KEY, JSON.stringify(queue));
}

function nextVocabId() {
    if (vocabWords.length === 0) return null;

    const lastId = localStorage.getItem(VOCAB_LAST_KEY);
    let queue = readVocabQueue();

    if (queue.length === 0) {
        queue = shuffleArray(vocabWords.map(w => w.id));
        // Yeni turun ilk kartı bir önceki turun son kartı olmasın
        if (queue.length > 1 && queue[0] === lastId) {
            const swapWith = 1 + secureRandomInt(queue.length - 1);
            [queue[0], queue[swapWith]] = [queue[swapWith], queue[0]];
        }
    }

    const id = queue.shift();
    writeVocabQueue(queue);
    localStorage.setItem(VOCAB_LAST_KEY, id);
    return id;
}

function showNextVocabCard() {
    vocabCurrentId = nextVocabId();
    vocabFlipped = false;
    renderVocabCard();
}

// Turdaki ilerleme: bu turda gösterilen kart sayısı / toplam
function getVocabRoundPosition() {
    return vocabWords.length - readVocabQueue().length;
}

// ---------- Otomatik çeviri (Chrome'un yerleşik Translator API'si) ----------

function isVocabTranslatorSupported() {
    return 'Translator' in self;
}

function withVocabTimeout(promise) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Translator timed out')), VOCAB_TRANSLATE_TIMEOUT);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function getVocabTranslator() {
    if (!isVocabTranslatorSupported()) return null;

    if (!vocabTranslatorPromise) {
        vocabTranslatorPromise = (async () => {
            const options = { sourceLanguage: 'en', targetLanguage: 'tr' };
            const availability = await withVocabTimeout(Translator.availability(options));
            if (availability === 'unavailable') return null;
            return Translator.create({
                ...options,
                monitor(m) {
                    m.addEventListener('downloadprogress', e => {
                        setVocabStatus(t('vocab-downloading', { percent: Math.round(e.loaded * 100) }));
                    });
                }
            });
        })();
    }

    try {
        return await vocabTranslatorPromise;
    } catch (error) {
        // Dil paketi indirmesi kullanıcı etkileşimi ister; bir sonraki denemede tekrar oluşturulsun
        vocabTranslatorPromise = null;
        throw error;
    }
}

async function translateVocabWord({ manual = false } = {}) {
    const word = document.getElementById('vocabWordInput').value.trim();
    const meaningInput = document.getElementById('vocabMeaningInput');
    if (!word) return;
    if (!manual && vocabMeaningTouched) return;

    if (!isVocabTranslatorSupported()) {
        if (manual) setVocabStatus(t('vocab-translate-unsupported'));
        return;
    }

    const request = ++vocabTranslateRequest;
    setVocabStatus(t('vocab-translating'));

    try {
        const translator = await getVocabTranslator();
        if (!translator) {
            setVocabStatus(t('vocab-translate-unsupported'));
            return;
        }
        const meaning = await withVocabTimeout(translator.translate(word));
        // Bu arada kelime değiştiyse eski sonucu yazma
        if (request !== vocabTranslateRequest) return;
        meaningInput.value = meaning;
        vocabMeaningTouched = false;
        setVocabStatus(t('vocab-translated'));
    } catch (error) {
        if (request !== vocabTranslateRequest) return;
        console.warn('Vocabulary translation failed:', error);
        setVocabStatus(t('vocab-translate-failed'));
    }
}

function scheduleVocabTranslation() {
    clearTimeout(vocabTranslateTimer);
    vocabTranslateRequest++;
    vocabTranslateTimer = setTimeout(() => translateVocabWord(), VOCAB_TRANSLATE_DELAY);
}

// ---------- Görünümler ----------

function setVocabStatus(message) {
    document.getElementById('vocabStatus').textContent = message || '';
}

// Dile bağlı, JS'in yazdığı metinler (görünüm butonu ve form butonu)
function updateVocabLabels() {
    const toggle = document.getElementById('vocabViewToggle');
    toggle.querySelector('i').className = vocabView === 'manage' ? 'fas fa-clone' : 'fas fa-pen';
    toggle.querySelector('span').textContent = t(vocabView === 'manage' ? 'vocab-show-cards' : 'vocab-manage');

    const editing = Boolean(findVocabWord(vocabEditingId));
    document.getElementById('vocabSubmitText').textContent = t(editing ? 'save' : 'vocab-add');
    document.getElementById('vocabSubmitBtn').querySelector('i').className = editing ? 'fas fa-check' : 'fas fa-plus';
    document.getElementById('vocabCancelEditBtn').hidden = !editing;
}

function setVocabView(view) {
    vocabView = view === 'manage' ? 'manage' : 'cards';
    document.getElementById('vocabCardsView').hidden = vocabView !== 'cards';
    document.getElementById('vocabManageView').hidden = vocabView !== 'manage';
    updateVocabLabels();

    if (vocabView === 'manage') {
        renderVocabList();
        document.getElementById('vocabWordInput').focus({ preventScroll: true });
    } else {
        resetVocabForm();
        if (!findVocabWord(vocabCurrentId)) showNextVocabCard();
        else renderVocabCard();
    }
}

function getVocabViewElement(view) {
    return document.getElementById(view === 'manage' ? 'vocabManageView' : 'vocabCardsView');
}

// Kart geçişindeki gibi: mevcut görünüm solar, diğeri yumuşakça belirir
function switchVocabView(view) {
    if (vocabViewSwitching || view === vocabView) return;

    const current = getVocabViewElement(vocabView);
    vocabViewSwitching = true;
    current.classList.add('vocab-view-leaving');

    setTimeout(() => {
        current.classList.remove('vocab-view-leaving');
        setVocabView(view);

        const next = getVocabViewElement(view);
        next.classList.remove('vocab-view-entering');
        void next.offsetWidth;
        next.classList.add('vocab-view-entering');
        vocabViewSwitching = false;
    }, VOCAB_FADE_DURATION);
}

function toggleVocabView() {
    switchVocabView(vocabView === 'manage' ? 'cards' : 'manage');
}

function openVocabManage() {
    switchVocabView('manage');
}

function renderVocabCount() {
    const key = vocabWords.length === 1 ? 'vocab-count-one' : 'vocab-count';
    document.getElementById('vocabCount').textContent = t(key, { count: vocabWords.length });
}

function renderVocabCard() {
    renderVocabCount();

    const empty = vocabWords.length === 0;
    document.getElementById('vocabEmpty').hidden = !empty;
    document.getElementById('vocabCardArea').hidden = empty;
    if (empty) return;

    const word = findVocabWord(vocabCurrentId);
    if (!word) {
        showNextVocabCard();
        return;
    }

    const card = document.getElementById('vocabCard');
    card.classList.toggle('flipped', vocabFlipped);
    card.setAttribute('aria-pressed', String(vocabFlipped));
    document.getElementById('vocabCardWord').textContent = word.word;
    document.getElementById('vocabCardBackWord').textContent = word.word;
    document.getElementById('vocabCardMeaning').textContent = word.meaning || t('vocab-no-meaning');
    document.getElementById('vocabCardMeaning').classList.toggle('missing', !word.meaning);

    document.getElementById('vocabProgress').textContent = `${getVocabRoundPosition()} / ${vocabWords.length}`;
}

// İlk tıklama anlamı gösterir, ikincisi kartı soldurup sıradaki kelimeye geçer
function handleVocabCardClick() {
    if (vocabCardFading || !findVocabWord(vocabCurrentId)) return;

    if (!vocabFlipped) {
        vocabFlipped = true;
        renderVocabCard();
        return;
    }

    const card = document.getElementById('vocabCard');
    vocabCardFading = true;
    card.classList.add('fading');

    setTimeout(() => {
        // Kart görünmezken ön yüze dönüşü animasyonsuz yap, sonra yeni kelimeyle belir
        card.classList.add('instant');
        showNextVocabCard();
        void card.offsetWidth;
        card.classList.remove('instant', 'fading');
        vocabCardFading = false;
    }, VOCAB_FADE_DURATION);
}

function renderVocabList() {
    renderVocabCount();

    const list = document.getElementById('vocabList');
    const sorted = [...vocabWords].sort((a, b) => a.word.localeCompare(b.word, 'en'));

    list.replaceChildren(...sorted.map(word => {
        const item = document.createElement('li');
        item.className = 'vocab-list-item';
        item.classList.toggle('editing', word.id === vocabEditingId);

        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'vocab-list-text';
        edit.dataset.action = 'editVocabWord';
        edit.dataset.arg = word.id;
        edit.title = t('vocab-edit');

        const en = document.createElement('span');
        en.className = 'vocab-list-word';
        en.textContent = word.word;
        const tr = document.createElement('span');
        tr.className = 'vocab-list-meaning';
        tr.textContent = word.meaning || '—';
        edit.append(en, tr);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'vocab-icon-btn danger';
        remove.dataset.action = 'deleteVocabWord';
        remove.dataset.arg = word.id;
        remove.title = t('delete');
        remove.setAttribute('aria-label', `${t('delete')}: ${word.word}`);
        remove.innerHTML = '<i class="fas fa-trash" aria-hidden="true"></i>';

        item.append(edit, remove);
        return item;
    }));

    document.getElementById('vocabListEmpty').hidden = vocabWords.length > 0;
}

// ---------- Ekleme / düzenleme / silme ----------

function resetVocabForm() {
    vocabEditingId = null;
    vocabMeaningTouched = false;
    clearTimeout(vocabTranslateTimer);
    vocabTranslateRequest++;
    document.getElementById('vocabWordInput').value = '';
    document.getElementById('vocabMeaningInput').value = '';
    updateVocabLabels();
    setVocabStatus(isVocabTranslatorSupported() ? '' : t('vocab-translate-unsupported'));
}

function submitVocabWord() {
    const wordInput = document.getElementById('vocabWordInput');
    const word = wordInput.value.trim();
    const meaning = document.getElementById('vocabMeaningInput').value.trim();

    if (!word) {
        setVocabStatus(t('vocab-word-required'));
        wordInput.focus({ preventScroll: true });
        return;
    }

    const duplicate = vocabWords.find(w => w.word.toLowerCase() === word.toLowerCase() && w.id !== vocabEditingId);
    if (duplicate) {
        setVocabStatus(t('vocab-duplicate', { word: duplicate.word }));
        return;
    }

    const editing = findVocabWord(vocabEditingId);
    if (editing) {
        editing.word = word;
        editing.meaning = meaning;
    } else {
        const id = createVocabId();
        vocabWords.push({ id, word, meaning });
        // Yeni kelime bu turda da çıksın: sıranın rastgele bir yerine ekle
        const queue = readVocabQueue();
        queue.splice(secureRandomInt(queue.length + 1), 0, id);
        writeVocabQueue(queue);
    }

    saveVocabWords();
    const savedMessage = t(editing ? 'vocab-updated' : 'vocab-added', { word });
    resetVocabForm();
    setVocabStatus(savedMessage);
    renderVocabList();
    wordInput.focus({ preventScroll: true });
}

function editVocabWord(id) {
    const word = findVocabWord(id);
    if (!word) return;

    vocabEditingId = id;
    vocabMeaningTouched = true;
    clearTimeout(vocabTranslateTimer);
    document.getElementById('vocabWordInput').value = word.word;
    document.getElementById('vocabMeaningInput').value = word.meaning;
    updateVocabLabels();
    setVocabStatus(t('vocab-editing', { word: word.word }));
    renderVocabList();
    document.getElementById('vocabMeaningInput').focus({ preventScroll: true });
}

function cancelVocabEdit() {
    resetVocabForm();
    renderVocabList();
}

function deleteVocabWord(id) {
    const word = findVocabWord(id);
    if (!word || !confirm(`${t('confirm-delete')} "${word.word}"?`)) return;

    vocabWords = vocabWords.filter(w => w.id !== id);
    saveVocabWords();
    writeVocabQueue(readVocabQueue());
    if (vocabEditingId === id) resetVocabForm();
    if (vocabCurrentId === id) vocabCurrentId = null;
    renderVocabList();
}

function manualTranslateVocabWord() {
    clearTimeout(vocabTranslateTimer);
    translateVocabWord({ manual: true });
}

// Dışa/içe aktarma (settings.js) için
function getVocabularyForExport() {
    return vocabWords.map(({ word, meaning }) => ({ word, meaning }));
}

// Kimlikler dışa aktarılmaz; sayfa yenilenince loadVocabWords yeni kimlik verir
function importVocabulary(words) {
    if (!Array.isArray(words)) return;
    localStorage.setItem(VOCAB_WORDS_KEY, JSON.stringify(words));
    localStorage.removeItem(VOCAB_QUEUE_KEY);
    localStorage.removeItem(VOCAB_LAST_KEY);
}

// ---------- Başlatma ----------

// Kısayollardaki gibi fareyi izleyen hafif parlama (renk temaya göre, shortcuts.js)
function initVocabCardSpotlight() {
    const card = document.getElementById('vocabCard');

    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const scale = getPageScale();
        card.style.setProperty('--sx', ((e.clientX - rect.left) / scale) + 'px');
        card.style.setProperty('--sy', ((e.clientY - rect.top) / scale) + 'px');
        card.style.setProperty('--sc', getSpotlightColorForTheme());
        card.style.setProperty('--so', '1');
    });
    card.addEventListener('mouseleave', () => card.style.setProperty('--so', '0'));
}

function renderVocab() {
    if (vocabView === 'manage') renderVocabList();
    else renderVocabCard();
}

function initVocab() {
    const wordInput = document.getElementById('vocabWordInput');
    const meaningInput = document.getElementById('vocabMeaningInput');

    wordInput.addEventListener('input', () => {
        if (!vocabMeaningTouched) meaningInput.value = '';
        if (wordInput.value.trim()) scheduleVocabTranslation();
        else setVocabStatus('');
    });
    meaningInput.addEventListener('input', () => {
        vocabMeaningTouched = meaningInput.value.trim() !== '';
        clearTimeout(vocabTranslateTimer);
        vocabTranslateRequest++;
    });
    [wordInput, meaningInput].forEach(input => input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.isComposing) {
            event.preventDefault();
            submitVocabWord();
        } else if (event.key === 'Escape' && vocabEditingId) {
            event.stopPropagation();
            cancelVocabEdit();
        }
    }));

    document.addEventListener('languageChanged', () => {
        updateVocabLabels();
        renderVocab();
    });

    initVocabCardSpotlight();

    // Her yeni sekmede sıradaki kelimeyle başla
    vocabCurrentId = nextVocabId();
    setVocabView('cards');
}
