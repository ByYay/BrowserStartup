let isChatGPTMode = localStorage.getItem('chatgpt-mode') === 'true';

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
    
    if (isChatGPTMode) {
        searchInput.classList.add('chatgpt-mode');
        searchButton.classList.add('chatgpt-mode');
        searchContainer.classList.add('chatgpt-mode');
        chatgptToggle.classList.add('active');
        
        if (currentLanguage === 'tr') {
            searchInput.placeholder = translations[currentLanguage]['chatgpt-placeholder'];
            searchButton.textContent = translations[currentLanguage]['chatgpt-button'];
        } else {
            searchInput.placeholder = translations[currentLanguage]['chatgpt-placeholder'];
            searchButton.textContent = translations[currentLanguage]['chatgpt-button'];
        }
    } else {
        searchInput.classList.remove('chatgpt-mode');
        searchButton.classList.remove('chatgpt-mode');
        searchContainer.classList.remove('chatgpt-mode');
        chatgptToggle.classList.remove('active');
        
        if (currentLanguage === 'tr') {
            searchInput.placeholder = translations[currentLanguage]['search-placeholder'];
            searchButton.textContent = translations[currentLanguage]['search-button'];
        } else {
            searchInput.placeholder = translations[currentLanguage]['search-placeholder'];
            searchButton.textContent = translations[currentLanguage]['search-button'];
        }
    }
}

function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (isChatGPTMode) {
        if (query) {
            const encodedQuery = encodeURIComponent(query);
            window.location.href = `https://chat.openai.com/?q=${encodedQuery}`;
        } else {
            window.location.href = 'https://chat.openai.com/';
        }
    } else {
        if (query) {
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        }
    }
}

function handleSearch(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        performSearch();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    updateChatGPTUI();
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            autoResizeTextarea(this);
        });
        
        autoResizeTextarea(searchInput);
    }
});
