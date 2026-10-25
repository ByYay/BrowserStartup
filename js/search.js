let isChatGPTMode = localStorage.getItem('chatgpt-mode') === 'true';

const AI_PROVIDERS = {
    chatgpt: { name: 'ChatGPT', icon: 'assets/ai-logos/chatgpt.png', url: 'https://chat.openai.com/' },
    claude: { name: 'Claude', icon: 'assets/ai-logos/claude.png', url: 'https://claude.ai/new' }
};

function getAIProvider() {
    return localStorage.getItem('ai-provider') === 'claude' ? 'claude' : 'chatgpt';
}

function applyAIProviderSetting() {
    const select = document.getElementById('settingsAIProvider');
    if (!Object.hasOwn(AI_PROVIDERS, select.value)) return;
    localStorage.setItem('ai-provider', select.value);
    updateChatGPTUI();
}

function autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

function toggleChatGPT() {
    isChatGPTMode = !isChatGPTMode;
    localStorage.setItem('chatgpt-mode', isChatGPTMode.toString());
    updateChatGPTUI();
}

function updateChatGPTUI() {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const chatgptToggle = document.getElementById('chatgptToggle');
    const searchContainer = document.querySelector('.search-container');
    const providerKey = getAIProvider();
    const provider = AI_PROVIDERS[providerKey];

    searchContainer.dataset.aiProvider = providerKey;
    document.getElementById('searchAIIcon').src = provider.icon;
    chatgptToggle.title = t('ai-toggle-title', { name: provider.name });
    chatgptToggle.setAttribute('aria-label', chatgptToggle.title);
    chatgptToggle.setAttribute('aria-pressed', String(isChatGPTMode));

    [searchInput, searchButton, searchContainer].forEach(el => el.classList.toggle('chatgpt-mode', isChatGPTMode));
    chatgptToggle.classList.toggle('active', isChatGPTMode);

    searchInput.placeholder = t(isChatGPTMode ? `${providerKey}-placeholder` : 'search-placeholder');
    searchButton.textContent = t(isChatGPTMode ? 'chatgpt-button' : 'search-button');
}

function performSearch() {
    const query = document.getElementById('searchInput').value.trim();

    if (isChatGPTMode) {
        const provider = AI_PROVIDERS[getAIProvider()];
        window.location.href = query ? `${provider.url}?q=${encodeURIComponent(query)}` : provider.url;
    } else if (query) {
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
}

function handleSearch(event) {
    // Türkçe/IME birleştirmesi sürerken Enter aramayı tetiklemesin; Shift+Enter yeni satır
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        performSearch();
    }
}

function initSearch() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keydown', handleSearch);
    searchInput.addEventListener('input', () => autoResizeTextarea(searchInput));
    autoResizeTextarea(searchInput);
    updateChatGPTUI();
}
