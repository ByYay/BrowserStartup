const POMODORO_DEFAULTS = {
    workMinutes: 25,
    breakMinutes: 5
};

function getPomodoroConfig() {
    const workMinutes = parseInt(localStorage.getItem('pomodoroWorkMinutes') || `${POMODORO_DEFAULTS.workMinutes}`, 10);
    const breakMinutes = parseInt(localStorage.getItem('pomodoroBreakMinutes') || `${POMODORO_DEFAULTS.breakMinutes}`, 10);

    return {
        workMinutes: Number.isFinite(workMinutes) && workMinutes > 0 ? workMinutes : POMODORO_DEFAULTS.workMinutes,
        breakMinutes: Number.isFinite(breakMinutes) && breakMinutes > 0 ? breakMinutes : POMODORO_DEFAULTS.breakMinutes
    };
}

function setPomodoroConfig(config) {
    localStorage.setItem('pomodoroWorkMinutes', String(config.workMinutes));
    localStorage.setItem('pomodoroBreakMinutes', String(config.breakMinutes));
    clockWidget.applySettings({ reset: !clockWidget.isRunning });
}

const clockWidget = {
    initialized: false,
    isRunning: false,
    isPaused: false,
    isBreakPhase: false,
    totalSeconds: POMODORO_DEFAULTS.workMinutes * 60,
    remainingSeconds: POMODORO_DEFAULTS.workMinutes * 60,
    // Kalan süre her tick'te bu zaman damgasından hesaplanır; arka plan sekmesinde
    // setInterval yavaşlasa bile sayaç kaymaz
    phaseEndTime: null,
    sessionCount: 0,
    statusKey: 'pomodoro-ready',
    timerInterval: null,
    audioContext: null,

    init() {
        if (this.initialized) {
            this.render();
            return;
        }

        this.totalSeconds = getPomodoroConfig().workMinutes * 60;
        this.remainingSeconds = this.totalSeconds;

        document.getElementById('pomodoroStartStopBtn').addEventListener('click', () => this.toggleStartStop());
        document.getElementById('pomodoroPauseResumeBtn').addEventListener('click', () => this.togglePauseResume());
        document.getElementById('pomodoroSkipBtn').addEventListener('click', () => this.skipPhase());

        document.addEventListener('languageChanged', () => this.render());
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.tick();
        });

        this.initialized = true;
        this.render();
    },

    applySettings(options = { reset: true }) {
        if (options.reset) {
            this.isBreakPhase = false;
            this.isRunning = false;
            this.isPaused = false;
            this.phaseEndTime = null;
            this.totalSeconds = getPomodoroConfig().workMinutes * 60;
            this.remainingSeconds = this.totalSeconds;
            this.stopInterval();
            this.statusKey = 'pomodoro-ready';
        }
        this.render();
    },

    toggleStartStop() {
        if (this.isRunning) {
            this.stopTimer();
        } else {
            this.startTimer();
        }
    },

    togglePauseResume() {
        if (!this.isRunning) return;

        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.remainingSeconds = this.getRemainingSeconds();
            this.phaseEndTime = null;
            this.playPhaseSound('paused');
            this.stopInterval();
            this.statusKey = 'pomodoro-paused';
        } else {
            this.phaseEndTime = Date.now() + this.remainingSeconds * 1000;
            this.playPhaseSound('resumed');
            this.startInterval();
            this.statusKey = this.runningStatusKey();
        }

        this.render();
    },

    skipPhase() {
        if (!this.isRunning) return;
        this.playPhaseSound('skip');
        this.switchPhase(Date.now());
        if (this.isPaused) {
            this.phaseEndTime = null;
        }
        this.statusKey = this.isPaused ? 'pomodoro-paused' : this.runningStatusKey();
        this.render();
    },

    startTimer() {
        const config = getPomodoroConfig();
        this.isBreakPhase = false;
        this.totalSeconds = config.workMinutes * 60;
        this.remainingSeconds = this.totalSeconds;
        this.phaseEndTime = Date.now() + this.totalSeconds * 1000;
        this.isRunning = true;
        this.isPaused = false;
        this.startInterval();
        this.playPhaseSound('work-start');
        this.statusKey = this.runningStatusKey();
        this.render();
    },

    stopTimer() {
        this.isRunning = false;
        this.isPaused = false;
        this.isBreakPhase = false;
        this.phaseEndTime = null;
        this.totalSeconds = getPomodoroConfig().workMinutes * 60;
        this.remainingSeconds = this.totalSeconds;
        this.stopInterval();
        this.statusKey = 'pomodoro-ready';
        this.render();
    },

    startInterval() {
        this.stopInterval();
        this.timerInterval = setInterval(() => this.tick(), 1000);
    },

    stopInterval() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    getRemainingSeconds() {
        if (!this.phaseEndTime) return this.remainingSeconds;
        return Math.max(0, Math.ceil((this.phaseEndTime - Date.now()) / 1000));
    },

    runningStatusKey() {
        return this.isBreakPhase ? 'pomodoro-break-running' : 'pomodoro-work-running';
    },

    // Bir sonraki faza geç; yeni faz verilen andan itibaren başlar
    switchPhase(startTime) {
        const config = getPomodoroConfig();
        if (this.isBreakPhase) {
            this.isBreakPhase = false;
            this.totalSeconds = config.workMinutes * 60;
        } else {
            this.isBreakPhase = true;
            this.totalSeconds = config.breakMinutes * 60;
            this.sessionCount += 1;
        }
        this.remainingSeconds = this.totalSeconds;
        this.phaseEndTime = startTime + this.totalSeconds * 1000;
    },

    tick() {
        if (!this.isRunning || this.isPaused) return;

        // Sekme uzun süre arka planda kaldıysa birden fazla faz geçmiş olabilir
        let completedPhase = false;
        while (this.phaseEndTime <= Date.now()) {
            const finishedBreak = this.isBreakPhase;
            this.switchPhase(this.phaseEndTime);
            this.statusKey = finishedBreak ? 'pomodoro-work-started' : 'pomodoro-break-started';
            completedPhase = true;
        }

        if (completedPhase) {
            if (this.isBreakPhase) {
                this.playPhaseSound('work-end');
            } else {
                this.playPhaseSound('work-start');
            }
        }

        this.remainingSeconds = this.getRemainingSeconds();
        this.render();
    },

    playPhaseSound(phaseType) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        if (!this.audioContext) {
            this.audioContext = new AudioContextClass();
        }
        const ctx = this.audioContext;
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }

        const soundMap = {
            'work-start': [784, 988, 1175],
            'work-end': [659, 554, 440],
            'paused': [440, 392],
            'resumed': [523, 659],
            'skip': [740, 988, 1318]
        };

        const sequence = soundMap[phaseType] || [659, 784, 988];
        let timeOffset = ctx.currentTime;

        sequence.forEach((freq) => {
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, timeOffset);

            gain.gain.setValueAtTime(0.0001, timeOffset);
            gain.gain.exponentialRampToValueAtTime(0.14, timeOffset + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, timeOffset + 0.34);

            oscillator.connect(gain);
            gain.connect(ctx.destination);

            oscillator.start(timeOffset);
            oscillator.stop(timeOffset + 0.36);
            timeOffset += 0.22;
        });
    },

    formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    updateButtons() {
        const startStopBtn = document.getElementById('pomodoroStartStopBtn');
        const pauseResumeBtn = document.getElementById('pomodoroPauseResumeBtn');

        document.getElementById('pomodoroStartStopText').textContent = t(this.isRunning ? 'pomodoro-stop' : 'pomodoro-start');
        document.getElementById('pomodoroPauseResumeText').textContent = t(this.isPaused ? 'pomodoro-resume' : 'pomodoro-pause');
        document.getElementById('pomodoroSkipText').textContent = t('pomodoro-skip');

        pauseResumeBtn.disabled = !this.isRunning;
        document.getElementById('pomodoroSkipBtn').disabled = !this.isRunning;

        startStopBtn.querySelector('i').className = this.isRunning ? 'fas fa-stop' : 'fas fa-play';
        pauseResumeBtn.querySelector('i').className = this.isPaused ? 'fas fa-play' : 'fas fa-pause';
    },

    renderMeta() {
        const config = getPomodoroConfig();
        const unit = t('minutes-short');
        document.getElementById('pomodoroWorkDisplay').textContent = `${config.workMinutes} ${unit}`;
        document.getElementById('pomodoroBreakDisplay').textContent = `${config.breakMinutes} ${unit}`;
        document.getElementById('pomodoroSessionCount').textContent = String(this.sessionCount);
        document.getElementById('pomodoroPhaseLabel').textContent = t(this.isBreakPhase ? 'pomodoro-break-phase' : 'pomodoro-work-phase');
    },

    renderProgress() {
        const progressFill = document.getElementById('pomodoroProgressFill');
        if (this.totalSeconds <= 0) return;
        const completedRatio = ((this.totalSeconds - this.remainingSeconds) / this.totalSeconds) * 100;
        progressFill.style.width = `${Math.max(0, Math.min(100, completedRatio))}%`;
    },

    render() {
        document.getElementById('pomodoroTime').textContent = this.formatTime(this.remainingSeconds);
        document.getElementById('pomodoroStatusText').textContent = t(this.statusKey);
        this.renderMeta();
        this.renderProgress();
        this.updateButtons();
    }
};
