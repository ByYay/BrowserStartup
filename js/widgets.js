const WIDGETS = ['calendar', 'vocab', 'password', 'weather', 'clock'];

let currentWidget = localStorage.getItem('current-widget');
if (!WIDGETS.includes(currentWidget)) {
    currentWidget = 'calendar';
}

function showWidget(widgetType) {
    if (!WIDGETS.includes(widgetType)) return;

    WIDGETS.forEach(name => {
        const isActive = name === widgetType;
        document.getElementById(`${name}Widget`).classList.toggle('active', isActive);
        const toggle = document.getElementById(`${name}Toggle`);
        toggle.classList.toggle('active', isActive);
        toggle.setAttribute('aria-selected', String(isActive));
        toggle.tabIndex = isActive ? 0 : -1;
    });

    const liquidIndicator = document.getElementById('liquidIndicator');
    WIDGETS.forEach(name => liquidIndicator.classList.remove(`${name}-active`));
    if (widgetType !== 'calendar') {
        liquidIndicator.classList.add(`${widgetType}-active`);
    }

    if (widgetType === 'calendar') {
        generateCalendar();
    } else if (widgetType === 'vocab') {
        renderVocab();
    } else if (widgetType === 'password') {
        if (!document.getElementById('passwordOutput').value) generatePassword();
    } else if (widgetType === 'weather') {
        initWeatherWidget();
    } else if (widgetType === 'clock') {
        clockWidget.render();
    }

    currentWidget = widgetType;
    localStorage.setItem('current-widget', currentWidget);
}

// Sekme listesinde ok tuşlarıyla gezinme (WAI-ARIA tabs deseni)
function handleWidgetTabKeys(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tab = event.target.closest('.widget-toggle-btn');
    if (!tab) return;

    event.preventDefault();
    const index = WIDGETS.indexOf(currentWidget);
    let next = index;
    if (event.key === 'ArrowLeft') next = (index - 1 + WIDGETS.length) % WIDGETS.length;
    if (event.key === 'ArrowRight') next = (index + 1) % WIDGETS.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = WIDGETS.length - 1;

    showWidget(WIDGETS[next]);
    document.getElementById(`${WIDGETS[next]}Toggle`).focus();
}

function initWidgets() {
    document.querySelector('.widget-toggle').addEventListener('keydown', handleWidgetTabKeys);
    showWidget(currentWidget);
}
