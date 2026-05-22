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

    if (typeof clockWidget !== 'undefined' && clockWidget) {
        clockWidget.applySettings(config, { reset: !clockWidget.isRunning });
    }
}

let clockWidget = {
    initialized: false,
    isRunning: false,
    isPaused: false,
    isBreakPhase: false,
    totalSeconds: POMODORO_DEFAULTS.workMinutes * 60,
    remainingSeconds: POMODORO_DEFAULTS.workMinutes * 60,
    sessionCount: 0,
    timerInterval: null,

    init() {
        if (this.initialized) {
            this.render();
            return;
        }

        const config = getPomodoroConfig();
        this.totalSeconds = config.workMinutes * 60;
        this.remainingSeconds = this.totalSeconds;

        document.addEventListener('languageChanged', () => {
            this.render();
            this.updateButtonTexts();
        });

        this.initialized = true;
        this.render();
        this.updateButtonTexts();
    },

    applySettings(config, options = { reset: true }) {
        const nextWork = Math.max(1, parseInt(config.workMinutes, 10) || POMODORO_DEFAULTS.workMinutes);
        const nextBreak = Math.max(1, parseInt(config.breakMinutes, 10) || POMODORO_DEFAULTS.breakMinutes);

        if (options.reset) {
            this.isBreakPhase = false;
            this.isRunning = false;
            this.isPaused = false;
            this.totalSeconds = nextWork * 60;
            this.remainingSeconds = this.totalSeconds;
            this.stopInterval();
            this.setStatus('pomodoro-ready');
        }

        this.renderMeta(nextWork, nextBreak);
        this.render();
        this.updateButtonTexts();
    },

    toggleStartStop() {
        if (!this.isRunning) {
            this.startTimer();
            return;
        }

        this.stopTimer();
    },

    togglePauseResume() {
        if (!this.isRunning) return;

        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.playPhaseSound('paused');
            this.stopInterval();
            this.setStatus('pomodoro-paused');
        } else {
            this.playPhaseSound('resumed');
            this.startInterval();
            this.setStatus(this.isBreakPhase ? 'pomodoro-break-running' : 'pomodoro-work-running');
        }

        this.updateButtonTexts();
    },

    skipPhase() {
        if (!this.isRunning) return;

        const config = getPomodoroConfig();
        this.playPhaseSound('skip');

        if (this.isBreakPhase) {
            this.isBreakPhase = false;
            this.totalSeconds = config.workMinutes * 60;
            this.remainingSeconds = this.totalSeconds;
        } else {
            this.isBreakPhase = true;
            this.totalSeconds = config.breakMinutes * 60;
            this.remainingSeconds = this.totalSeconds;
            this.sessionCount += 1;
        }

        this.render();
        this.renderMeta(config.workMinutes, config.breakMinutes);
    },

    startTimer() {
        const config = getPomodoroConfig();
        const wasStopped = !this.isRunning;
        if (this.remainingSeconds <= 0) {
            this.isBreakPhase = false;
            this.totalSeconds = config.workMinutes * 60;
            this.remainingSeconds = this.totalSeconds;
        }

        if (!this.isBreakPhase && this.remainingSeconds === this.totalSeconds && this.totalSeconds !== config.workMinutes * 60) {
            this.totalSeconds = config.workMinutes * 60;
            this.remainingSeconds = this.totalSeconds;
        }

        this.isRunning = true;
        this.isPaused = false;
        this.startInterval();

        if (wasStopped) {
            this.playPhaseSound('work-start');
        }

        this.setStatus(this.isBreakPhase ? 'pomodoro-break-running' : 'pomodoro-work-running');
        this.updateButtonTexts();
        this.render();
    },

    stopTimer() {
        const config = getPomodoroConfig();
        this.isRunning = false;
        this.isPaused = false;
        this.isBreakPhase = false;
        this.totalSeconds = config.workMinutes * 60;
        this.remainingSeconds = this.totalSeconds;
        this.stopInterval();
        this.setStatus('pomodoro-ready');
        this.updateButtonTexts();
        this.render();
    },

    startInterval() {
        this.stopInterval();
        this.timerInterval = setInterval(() => {
            this.tick();
        }, 1000);
    },

    stopInterval() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    tick() {
        if (!this.isRunning || this.isPaused) return;

        this.remainingSeconds -= 1;

        if (this.remainingSeconds <= 0) {
            this.handlePhaseComplete();
            return;
        }

        this.render();
    },

    handlePhaseComplete() {
        const justFinishedBreak = this.isBreakPhase;
        const config = getPomodoroConfig();

        if (!justFinishedBreak) {
            this.playPhaseSound('work-end');
        }

        if (justFinishedBreak) {
            this.isBreakPhase = false;
            this.totalSeconds = config.workMinutes * 60;
            this.remainingSeconds = this.totalSeconds;
            this.setStatus('pomodoro-work-started');

            setTimeout(() => {
                this.playPhaseSound('work-start');
            }, 520);
        } else {
            this.isBreakPhase = true;
            this.totalSeconds = config.breakMinutes * 60;
            this.remainingSeconds = this.totalSeconds;
            this.sessionCount += 1;
            this.setStatus('pomodoro-break-started');
        }

        this.render();
        this.renderMeta(config.workMinutes, config.breakMinutes);
    },

    playPhaseSound(phaseType) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();
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

        setTimeout(() => {
            if (ctx.state !== 'closed') {
                ctx.close().catch(() => {});
            }
        }, 1800);
    },

    getStatusTextKey() {
        if (this.isRunning && !this.isPaused) {
            return this.isBreakPhase ? 'pomodoro-break-running' : 'pomodoro-work-running';
        }
        if (this.isPaused) {
            return 'pomodoro-paused';
        }
        return 'pomodoro-ready';
    },

    setStatus(key) {
        const el = document.getElementById('pomodoroStatusText');
        if (!el) return;

        const lang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'en';
        const value = translations[lang] && translations[lang][key] ? translations[lang][key] : '';
        if (value) {
            el.textContent = value;
        }
    },

    formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },

    updateButtonTexts() {
        const startStopText = document.getElementById('pomodoroStartStopText');
        const pauseResumeText = document.getElementById('pomodoroPauseResumeText');
        const startStopBtn = document.getElementById('pomodoroStartStopBtn');
        const pauseResumeBtn = document.getElementById('pomodoroPauseResumeBtn');
        const skipBtn = document.getElementById('pomodoroSkipBtn');

        const lang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'en';
        const tr = translations[lang] || translations.en;

        if (startStopText) {
            startStopText.textContent = this.isRunning ? tr['pomodoro-stop'] : tr['pomodoro-start'];
        }

        if (pauseResumeText) {
            pauseResumeText.textContent = this.isPaused ? tr['pomodoro-resume'] : tr['pomodoro-pause'];
        }

        if (pauseResumeBtn) {
            pauseResumeBtn.disabled = !this.isRunning;
        }

        if (skipBtn) {
            skipBtn.disabled = !this.isRunning;
        }

        if (startStopBtn) {
            const icon = startStopBtn.querySelector('i');
            if (icon) {
                icon.className = this.isRunning ? 'fas fa-stop' : 'fas fa-play';
            }
        }

        if (pauseResumeBtn) {
            const icon = pauseResumeBtn.querySelector('i');
            if (icon) {
                icon.className = this.isPaused ? 'fas fa-play' : 'fas fa-pause';
            }
        }
    },

    renderMeta(workMinutes, breakMinutes) {
        const workDisplay = document.getElementById('pomodoroWorkDisplay');
        const breakDisplay = document.getElementById('pomodoroBreakDisplay');
        const sessionCountDisplay = document.getElementById('pomodoroSessionCount');
        const phaseLabel = document.getElementById('pomodoroPhaseLabel');

        const lang = typeof currentLanguage !== 'undefined' ? currentLanguage : 'en';
        const tr = translations[lang] || translations.en;

        if (workDisplay) {
            workDisplay.textContent = lang === 'tr' ? `${workMinutes} dk` : `${workMinutes} min`;
        }

        if (breakDisplay) {
            breakDisplay.textContent = lang === 'tr' ? `${breakMinutes} dk` : `${breakMinutes} min`;
        }

        if (sessionCountDisplay) {
            sessionCountDisplay.textContent = String(this.sessionCount);
        }

        if (phaseLabel) {
            phaseLabel.textContent = this.isBreakPhase ? tr['pomodoro-break-phase'] : tr['pomodoro-work-phase'];
        }
    },

    renderProgress() {
        const progressFill = document.getElementById('pomodoroProgressFill');
        if (!progressFill || this.totalSeconds <= 0) return;

        const completedRatio = ((this.totalSeconds - this.remainingSeconds) / this.totalSeconds) * 100;
        progressFill.style.width = `${Math.max(0, Math.min(100, completedRatio))}%`;
    },

    render() {
        const timerEl = document.getElementById('pomodoroTime');
        if (timerEl) {
            timerEl.textContent = this.formatTime(this.remainingSeconds);
        }

        const config = getPomodoroConfig();
        this.renderMeta(config.workMinutes, config.breakMinutes);
        this.renderProgress();
        this.setStatus(this.getStatusTextKey());
        this.updateButtonTexts();
    },

    destroy() {
        this.stopInterval();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    clockWidget.init();
});
