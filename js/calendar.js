function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function generateCalendar() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    document.getElementById('calendarMonth').textContent = `${t('months')[currentMonth]} ${currentYear}`;

    const calendarWeekdays = document.getElementById('calendarWeekdays');
    calendarWeekdays.innerHTML = '';
    t('weekdays').forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'weekday-label';
        dayElement.textContent = day;
        calendarWeekdays.appendChild(dayElement);
    });

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDayOfMonth);
    const endDate = new Date(lastDayOfMonth);

    const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7; // Pazartesi = 0
    startDate.setDate(startDate.getDate() - firstDayWeekday);

    const lastDayWeekday = (lastDayOfMonth.getDay() + 6) % 7;
    endDate.setDate(endDate.getDate() + (6 - lastDayWeekday));

    const calendarWeeks = document.getElementById('calendarWeeks');
    calendarWeeks.innerHTML = '';

    const currentDate = new Date(startDate);
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

    document.getElementById('currentWeekNumber').textContent = `W${getWeekNumber(today)}`;
}

function updateDateTime() {
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    document.getElementById('datetime').textContent = new Date().toLocaleDateString(t('locale'), options);
}
