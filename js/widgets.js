let currentWidget = localStorage.getItem('current-widget') || 'calendar';

function showWidget(widgetType) {
    document.querySelectorAll('.widget-content').forEach(widget => {
        widget.classList.remove('active');
    });
    
    document.querySelectorAll('.widget-toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const liquidIndicator = document.getElementById('liquidIndicator');
    
    if (widgetType === 'calendar') {
        document.getElementById('calendarWidget').classList.add('active');
        document.getElementById('calendarToggle').classList.add('active');
        liquidIndicator.classList.remove('calculator-active', 'password-active', 'weather-active', 'clock-active');
        generateCalendar();
    } else if (widgetType === 'calculator') {
        document.getElementById('calculatorWidget').classList.add('active');
        document.getElementById('calculatorToggle').classList.add('active');
        liquidIndicator.classList.remove('password-active', 'weather-active', 'clock-active');
        liquidIndicator.classList.add('calculator-active');
        updateCalculatorDisplay();
    } else if (widgetType === 'password') {
        document.getElementById('passwordWidget').classList.add('active');
        document.getElementById('passwordToggle').classList.add('active');
        liquidIndicator.classList.remove('calculator-active', 'weather-active', 'clock-active');
        liquidIndicator.classList.add('password-active');
        if (typeof generatePassword === 'function') {
            generatePassword();
        }
    } else if (widgetType === 'weather') {
        document.getElementById('weatherWidget').classList.add('active');
        document.getElementById('weatherToggle').classList.add('active');
        liquidIndicator.classList.remove('calculator-active', 'password-active', 'clock-active');
        liquidIndicator.classList.add('weather-active');
        if (typeof initWeatherWidget === 'function') {
            initWeatherWidget();
        }
    } else if (widgetType === 'clock') {
        document.getElementById('clockWidget').classList.add('active');
        document.getElementById('clockToggle').classList.add('active');
        liquidIndicator.classList.remove('calculator-active', 'password-active', 'weather-active');
        liquidIndicator.classList.add('clock-active');
        
        if (typeof clockWidget !== 'undefined') {
            clockWidget.init();
        }
    }
    
    currentWidget = widgetType;
    localStorage.setItem('current-widget', currentWidget);
}

document.addEventListener('DOMContentLoaded', function() {
    const savedWidget = localStorage.getItem('current-widget') || 'calendar';
    showWidget(savedWidget);
});
