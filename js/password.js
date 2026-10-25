const CLIPBOARD_CLEAR_DELAY = 30000;
let copyTimeout = null;

const characterSets = {
    numbers: '0123456789',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};
const SIMILAR_CHARACTERS = '0O1lI|';

// crypto.getRandomValues ile [0, max) aralığında yansız rastgele tam sayı (rejection sampling)
function secureRandomInt(max) {
    const limit = Math.floor(0x100000000 / max) * max;
    const buffer = new Uint32Array(1);
    do {
        crypto.getRandomValues(buffer);
    } while (buffer[0] >= limit);
    return buffer[0] % max;
}

function getRandomChar(str) {
    return str.charAt(secureRandomInt(str.length));
}

// Fisher–Yates karıştırma
function shuffleString(str) {
    const chars = str.split('');
    for (let i = chars.length - 1; i > 0; i--) {
        const j = secureRandomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
}

function updateLength() {
    document.getElementById('lengthValue').textContent = document.getElementById('lengthSlider').value;
    generatePassword();
}

function generatePassword() {
    const length = parseInt(document.getElementById('lengthSlider').value, 10);
    const excludeSimilar = document.getElementById('excludeSimilar').checked;
    const options = {
        numbers: document.getElementById('includeNumbers').checked,
        uppercase: document.getElementById('includeUppercase').checked,
        lowercase: document.getElementById('includeLowercase').checked,
        special: document.getElementById('includeSpecial').checked
    };

    // Seçili her küme için (gerekirse benzer karakterler çıkarılmış) karakter havuzu
    const pools = Object.keys(options)
        .filter(name => options[name])
        .map(name => excludeSimilar
            ? [...characterSets[name]].filter(c => !SIMILAR_CHARACTERS.includes(c)).join('')
            : characterSets[name])
        .filter(pool => pool.length > 0);

    const output = document.getElementById('passwordOutput');
    if (pools.length === 0) {
        output.value = '';
        updatePasswordStrength('');
        return;
    }

    const charset = pools.join('');
    // Her seçili kümeden en az bir karakter garanti edilir
    let password = pools.map(pool => getRandomChar(pool)).join('');
    while (password.length < length) {
        password += getRandomChar(charset);
    }

    output.value = shuffleString(password);
    updatePasswordStrength(output.value);
    resetCopyButton();
}

function calculatePasswordStrength(password) {
    let score = 0;
    const length = password.length;

    if (length >= 8) score += 1;
    if (length >= 12) score += 1;
    if (length >= 16) score += 1;
    if (length >= 20) score += 1;

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    score += [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
    if (hasLower && hasUpper && hasDigit) score += 1;
    if (hasLower && hasUpper && hasDigit && hasSpecial) score += 2;

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

    let strengthClass = 'strength-weak';
    if (score >= 7) strengthClass = 'strength-strong';
    else if (score >= 5) strengthClass = 'strength-good';
    else if (score >= 3) strengthClass = 'strength-fair';

    strengthContainer.className = `password-strength ${strengthClass}`;
    strengthText.textContent = t('strength-levels')[score];
}

function updatePasswordStrengthText() {
    const passwordOutput = document.getElementById('passwordOutput');
    if (passwordOutput && passwordOutput.value) {
        updatePasswordStrength(passwordOutput.value);
    }
}

// Pano yalnızca hâlâ bizim kopyaladığımız şifreyi içeriyorsa temizlenir.
// Okuma izni yoksa (izin penceresi açmamak için sorulmaz) eski davranışla temizlenir.
async function clearClipboardIfUnchanged(copiedValue) {
    try {
        const permission = await navigator.permissions.query({ name: 'clipboard-read' });
        if (permission.state === 'granted') {
            const current = await navigator.clipboard.readText();
            if (current !== copiedValue) return;
        }
    } catch (e) {
        // permissions API desteklenmiyor: temizlemeye devam et
    }

    try {
        await navigator.clipboard.writeText('');
    } catch (e) {
        // Sekme odakta değilse yazma başarısız olur; bu durumda dokunmuyoruz
    }
}

function scheduleClipboardClear(copiedValue) {
    if (copyTimeout) clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => {
        copyTimeout = null;
        clearClipboardIfUnchanged(copiedValue);
    }, CLIPBOARD_CLEAR_DELAY);
}

function flashCopiedState() {
    const copyBtn = document.getElementById('copyBtn');
    copyBtn.classList.add('copied');
    setTimeout(() => copyBtn.classList.remove('copied'), 2000);
}

async function copyPassword() {
    const passwordOutput = document.getElementById('passwordOutput');
    const password = passwordOutput.value;
    if (!password) return;

    try {
        await navigator.clipboard.writeText(password);
    } catch (error) {
        passwordOutput.select();
        document.execCommand('copy');
    }

    flashCopiedState();
    scheduleClipboardClear(password);
}

function resetCopyButton() {
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) copyBtn.classList.remove('copied');
}

// Sayfada başka bir şey kopyalanırsa bekleyen temizlemeyi iptal et
document.addEventListener('copy', (event) => {
    if (copyTimeout && event.target.id !== 'passwordOutput') {
        clearTimeout(copyTimeout);
        copyTimeout = null;
    }
});

document.addEventListener('keydown', (event) => {
    const passwordWidget = document.getElementById('passwordWidget');
    if (!passwordWidget.classList.contains('active')) return;

    if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
        event.preventDefault();
        generatePassword();
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'c' && event.target.id === 'passwordOutput') {
        event.preventDefault();
        copyPassword();
    }
});
