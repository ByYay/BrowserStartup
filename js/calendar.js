function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

function getWeekdays() {
    if (currentLanguage === 'tr') {
        return ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    } else {
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    }
}

function getMonthNames() {
    if (currentLanguage === 'tr') {
        return ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
               'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    } else {
        return ['January', 'February', 'March', 'April', 'May', 'June',
               'July', 'August', 'September', 'October', 'November', 'December'];
    }
}

function generateCalendar() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const monthNames = getMonthNames();
    const calendarMonth = document.getElementById('calendarMonth');
    calendarMonth.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    const weekdays = getWeekdays();
    const calendarWeekdays = document.getElementById('calendarWeekdays');
    calendarWeekdays.innerHTML = '';
    
    weekdays.forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'weekday-label';
        dayElement.textContent = day;
        calendarWeekdays.appendChild(dayElement);
    });
    
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    const endDate = new Date(lastDayOfMonth);
    
    const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7;
    startDate.setDate(startDate.getDate() - firstDayWeekday);
    
    const lastDayWeekday = (lastDayOfMonth.getDay() + 6) % 7;
    endDate.setDate(endDate.getDate() + (6 - lastDayWeekday));
    
    const calendarWeeks = document.getElementById('calendarWeeks');
    calendarWeeks.innerHTML = '';
    
    let currentDate = new Date(startDate);
    const todayStr = today.toDateString();
    
    while (currentDate <= endDate) {
        const weekDiv = document.createElement('div');
        weekDiv.className = 'calendar-week';
        
        for (let i = 0; i < 7; i++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'week-day';
            dayDiv.textContent = currentDate.getDate();
            
            if (currentDate.toDateString() === todayStr) {
                dayDiv.classList.add('today');
            }
            
            if (currentDate.getMonth() !== currentMonth) {
                dayDiv.classList.add('other-month');
            }
            
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                dayDiv.classList.add('weekend');
            }
            
            weekDiv.appendChild(dayDiv);
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        calendarWeeks.appendChild(weekDiv);
    }
    
    const currentWeekNumber = getWeekNumber(today);
    const weekNumberElement = document.getElementById('currentWeekNumber');
    weekNumberElement.textContent = `W${currentWeekNumber}`;
}

function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    
    const locale = currentLanguage === 'tr' ? 'tr-TR' : 'en-US';
    document.getElementById('datetime').textContent = now.toLocaleDateString(locale, options);
}
