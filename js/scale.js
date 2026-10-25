// ==================== PAGE SCALE ====================
// Yatay pencerede düzen hiç değişmez; pencere, düzenin sığdığı en küçük boyuttan
// küçükse tüm sayfa sığacak kadar (ve yalnızca o kadar) küçülür.
// Dikey pencerede içerikler alt alta dizilir ve dikey kaydırılır; yalnızca genişlik
// tek sütunu almıyorsa küçülür.
// body, viewport / ölçek boyutunda yerleşip scale() ile küçültülür; böylece fixed
// öğeler (ayarlar, butonlar) de birlikte ölçeklenir.
const LAYOUT_MIN_WIDTH = 1500;   // iki sütunlu düzenin taşmadan sığdığı genişlik
const LAYOUT_MIN_HEIGHT = 850;   // ve yükseklik
const STACKED_MIN_WIDTH = 760;   // alt alta düzende en geniş öğe (widget) + kenar boşluğu

let pageScale = 1;

function getPageScale() {
    return pageScale;
}

function updatePageScale() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const stacked = height > width;

    document.documentElement.classList.toggle('layout-stacked', stacked);
    pageScale = stacked
        ? Math.min(1, width / STACKED_MIN_WIDTH)
        : Math.min(1, width / LAYOUT_MIN_WIDTH, height / LAYOUT_MIN_HEIGHT);
    document.documentElement.style.setProperty('--page-scale', pageScale);
}

let pageScaleFrame = null;
window.addEventListener('resize', () => {
    if (pageScaleFrame) return;
    pageScaleFrame = requestAnimationFrame(() => {
        pageScaleFrame = null;
        updatePageScale();
    });
});

// İlk boyamadan önce uygula ki sayfa büyük açılıp küçülmesin
updatePageScale();
