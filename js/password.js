let copyTimeout = null;

const characterSets = {
    numbers: '0123456789',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    special: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    similar: '0Ol1Il|'
};

function initPasswordGenerator() {
    generatePassword();
}

function updateLength() {
    const slider = document.getElementById('lengthSlider');
    const lengthValue = document.getElementById('lengthValue');
    
    if (slider && lengthValue) {
        lengthValue.textContent = slider.value;
        generatePassword();
    }
}

function generatePassword() {
    const length = parseInt(document.getElementById('lengthSlider').value);
    const includeNumbers = document.getElementById('includeNumbers').checked;
    const includeUppercase = document.getElementById('includeUppercase').checked;
    const includeLowercase = document.getElementById('includeLowercase').checked;
    const includeSpecial = document.getElementById('includeSpecial').checked;
    const excludeSimilar = document.getElementById('excludeSimilar').checked;
    
    let charset = '';
    
    if (includeNumbers) charset += characterSets.numbers;
    if (includeUppercase) charset += characterSets.uppercase;
    if (includeLowercase) charset += characterSets.lowercase;
    if (includeSpecial) charset += characterSets.special;
    
    if (excludeSimilar) {
        for (let char of characterSets.similar) {
            charset = charset.replace(new RegExp(char, 'g'), '');
        }
    }
    
    if (charset.length === 0) {
        document.getElementById('passwordOutput').value = '';
        updatePasswordStrength('');
        return;
    }
    
    let password = '';
    
    const guaranteedChars = [];
    if (includeNumbers) guaranteedChars.push(getRandomChar(excludeSimilar ? characterSets.numbers.replace(/[0]/g, '') : characterSets.numbers));
    if (includeUppercase) guaranteedChars.push(getRandomChar(excludeSimilar ? characterSets.uppercase.replace(/[O]/g, '') : characterSets.uppercase));
    if (includeLowercase) guaranteedChars.push(getRandomChar(excludeSimilar ? characterSets.lowercase.replace(/[l]/g, '') : characterSets.lowercase));
    if (includeSpecial) guaranteedChars.push(getRandomChar(characterSets.special));
    
    for (let char of guaranteedChars) {
        password += char;
    }
    
    for (let i = password.length; i < length; i++) {
        password += getRandomChar(charset);
    }
    
    password = shuffleString(password);
    
    document.getElementById('passwordOutput').value = password;
    
    updatePasswordStrength(password);
    
    resetCopyButton();
}

function getRandomChar(str) {
    if (!str) return '';
    return str.charAt(getSecureRandomInt(str.length));
}

function shuffleString(str) {
    const chars = str.split('');

    for (let i = chars.length - 1; i > 0; i--) {
        const j = getSecureRandomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
}

function getSecureRandomInt(max) {
    if (!Number.isInteger(max) || max <= 0) {
        throw new Error('max must be a positive integer');
    }

    const cryptoObj = globalThis.crypto;
    if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
        throw new Error('Web Crypto API is not available');
    }

    const randomValues = new Uint32Array(1);
    const range = 0x100000000;
    const limit = range - (range % max);

    do {
        cryptoObj.getRandomValues(randomValues);
    } while (randomValues[0] >= limit);

    return randomValues[0] % max;
}

function calculatePasswordStrength(password) {
    let score = 0;
    const length = password.length;
    
    if (length >= 8) score += 1;
    if (length >= 12) score += 1;
    if (length >= 16) score += 1;
    if (length >= 20) score += 1;
    
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    
    if (/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(password)) score += 1;
    if (/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])/.test(password)) score += 2;
    
    if (length < 6) score = Math.max(0, score - 2);
    if (length < 4) score = 0;
    
    return Math.min(score, 10);
}

function updatePasswordStrength(password) {
    const strengthText = document.getElementById('strengthText');
    const strengthContainer = document.querySelector('.password-strength');
    
    if (!password) {
        strengthContainer.className = 'password-strength';
        strengthText.textContent = '';
        return;
    }
    
    const score = calculatePasswordStrength(password);
    const currentLang = window.getCurrentLanguage ? window.getCurrentLanguage() : 'en';
    
    const strengthLevels = {
        tr: {
            0: 'Çok Zayıf',
            1: 'Çok Zayıf', 
            2: 'Zayıf',
            3: 'Zayıf',
            4: 'Orta',
            5: 'Orta',
            6: 'İyi',
            7: 'İyi',
            8: 'Güçlü',
            9: 'Güçlü',
            10: 'Çok Güçlü'
        },
        en: {
            0: 'Very Weak',
            1: 'Very Weak',
            2: 'Weak', 
            3: 'Weak',
            4: 'Fair',
            5: 'Fair',
            6: 'Good',
            7: 'Good',
            8: 'Strong',
            9: 'Strong',
            10: 'Very Strong'
        }
    };
    
    let strengthClass = 'strength-weak';
    if (score >= 7) strengthClass = 'strength-strong';
    else if (score >= 5) strengthClass = 'strength-good';
    else if (score >= 3) strengthClass = 'strength-fair';
    
    strengthContainer.className = `password-strength ${strengthClass}`;
    const strengthLevel = strengthLevels[currentLang] ? strengthLevels[currentLang][score] : strengthLevels['en'][score];
    strengthText.textContent = strengthLevel || 'Unknown';
}

function updatePasswordStrengthText() {
    const passwordOutput = document.getElementById('passwordOutput');
    if (passwordOutput && passwordOutput.value) {
        updatePasswordStrength(passwordOutput.value);
    }
}

async function copyPassword() {
    const passwordOutput = document.getElementById('passwordOutput');
    const copyBtn = document.getElementById('copyBtn');
    
    if (!passwordOutput.value) {
        return;
    }
    
    try {
        await navigator.clipboard.writeText(passwordOutput.value);
        
        copyBtn.classList.add('copied');
        
        if (copyTimeout) {
            clearTimeout(copyTimeout);
        }
        
        copyTimeout = setTimeout(async () => {
            try {
                await navigator.clipboard.writeText('');
                console.log('🔒 Clipboard cleared for security after 30 seconds');
            } catch (error) {
                console.log('Could not clear clipboard:', error);
            }
        }, 30000);
        
        setTimeout(() => {
            copyBtn.classList.remove('copied');
        }, 2000);
        
    } catch (error) {
        console.error('Failed to copy password:', error);
        
        passwordOutput.select();
        document.execCommand('copy');
        copyBtn.classList.add('copied');
        
        copyTimeout = setTimeout(() => {
            console.log('🔒 Clipboard security timeout reached (30s)');
        }, 30000);
        
        setTimeout(() => {
            copyBtn.classList.remove('copied');
        }, 2000);
    }
}

function resetCopyButton() {
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.classList.remove('copied');
    }
}

document.addEventListener('keydown', (event) => {
    const passwordWidget = document.getElementById('passwordWidget');
    if (!passwordWidget || !passwordWidget.classList.contains('active')) {
        return;
    }
    
    if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
        event.preventDefault();
        generatePassword();
    }
    
    if ((event.ctrlKey || event.metaKey) && event.key === 'c' && event.target.id === 'passwordOutput') {
        event.preventDefault();
        copyPassword();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('passwordWidget')) {
        initPasswordGenerator();
    }
});
