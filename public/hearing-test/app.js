/* ═══════════════════════════════════════════════════
   HEARING TEST — Hughson-Westlake (5 up / 10 down)
   Clinical audiometric method with pulsed tones
   ═══════════════════════════════════════════════════ */

const CONFIG = {
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzRDQStsBhsIOxduV6a7iW4l4u-odAVCsi1icFlVdhBTW6R4ghj7mLwIuPDX7HEF59o/exec',
    CLINIC_NAME: 'Trợ Thính Phúc An Hearing (PAH)',
    CLINIC_ADDRESS: 'Liên hệ qua Zalo để biết chi nhánh gần nhất',
    CLINIC_PHONE: '0818 788 000',
    CLINIC_ZALO: 'https://zalo.me/818788000',
    CLINIC_WEBSITE: 'https://vuinghe.com',
    CLINIC_FACEBOOK: 'https://www.facebook.com/ths.chu.duc.hai/',
    CLINIC_YOUTUBE: 'https://www.youtube.com/@maytrothinhcaocap',
    EXPERT_NAME: 'Ths. Chu Đức Hải',
    EXPERT_TITLE: 'Thạc sĩ Kỹ Thuật Y Sinh Học — ĐHBK Hà Nội',
};

// ── Constants & Configuration ──
// These were constants, now they are variables that can be overridden by Admin settings
let TEST_ORDER = [1000, 2000, 4000, 8000, 500, 250];
const EARS = ['right', 'left'];
let TOTAL_STEPS = TEST_ORDER.length * EARS.length;

const FREQ_LABELS = {
    250: 'Âm trầm', 500: 'Âm trầm-trung', 1000: 'Âm trung',
    2000: 'Âm trung-cao', 4000: 'Âm cao', 8000: 'Âm rất cao'
};

// Hughson-Westlake parameters
const HW_START_LEVEL = 30;   // Start at 30 dB
const HW_STEP_UP = 5;        // Increase 5 dB on miss
const HW_STEP_DOWN = 10;     // Decrease 10 dB on hit
const HW_MIN_LEVEL = -10;    // Minimum dB
const HW_MAX_LEVEL = 80;     // Maximum dB
const HW_REQUIRED_ASCENDING = 2;  // Need 2 out of 3 ascending hits
let HW_PULSE_COUNT = 3;      // 3 tone pulses per presentation
let HW_PULSE_ON_MS = 250;    // Tone on duration
let HW_PULSE_OFF_MS = 250;   // Gap between pulses
let HW_WAIT_AFTER_MS = 1500; // Wait for response after last pulse

// Load Admin Settings from localStorage if available
try {
    const savedConfig = localStorage.getItem('pahr_admin_config');
    if (savedConfig) {
        const conf = JSON.parse(savedConfig);
        if (conf.frequencies && Array.isArray(conf.frequencies)) {
            TEST_ORDER = conf.frequencies;
            TOTAL_STEPS = TEST_ORDER.length * EARS.length;
        }
        if (conf.pulseCount) HW_PULSE_COUNT = parseInt(conf.pulseCount, 10);
        if (conf.pulseDuration) HW_PULSE_ON_MS = HW_PULSE_OFF_MS = parseInt(conf.pulseDuration, 10);
        if (conf.waitDuration) HW_WAIT_AFTER_MS = parseInt(conf.waitDuration, 10);
    }
} catch (e) { console.error('Error loading config', e); }

const FREQ_CORRECTIONS = { 250: 10, 500: 4, 1000: 0, 2000: -3, 4000: -2, 8000: 10 };
const BASE_GAIN = 0.0003;

const SEVERITY_LEVELS = [
    { max: 25, label: 'Bình thường', color: '#10b981', cssClass: 'normal', emoji: '✅' },
    { max: 40, label: 'Giảm nhẹ', color: '#84cc16', cssClass: 'mild', emoji: '🟡' },
    { max: 55, label: 'Giảm trung bình', color: '#f59e0b', cssClass: 'moderate', emoji: '🟠' },
    { max: 70, label: 'Giảm trung bình-nặng', color: '#f97316', cssClass: 'moderate', emoji: '🟠' },
    { max: 90, label: 'Giảm nặng', color: '#ef4444', cssClass: 'severe', emoji: '🔴' },
    { max: 999, label: 'Giảm sâu', color: '#a855f7', cssClass: 'profound', emoji: '🟣' }
];

// ═══════════════════════════════════════════════════
// AUDIO ENGINE
// ═══════════════════════════════════════════════════
class AudioEngine {
    constructor() { this.ctx = null; this.osc = null; this.gainNode = null; this._cancelled = false; }

    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    dBHLtoGain(dBHL, frequency) {
        const correction = FREQ_CORRECTIONS[frequency] || 0;
        return Math.min(BASE_GAIN * Math.pow(10, (dBHL + correction) / 20), 1.0);
    }

    // Play a single short tone burst
    playBurst(frequency, dBHL, ear, durationMs) {
        return new Promise((resolve) => {
            this.init();
            const now = this.ctx.currentTime;
            const dur = durationMs / 1000;
            const gain = this.dBHLtoGain(dBHL, frequency);
            const osc = this.ctx.createOscillator();
            osc.type = 'sine'; osc.frequency.value = frequency;
            const gn = this.ctx.createGain();
            gn.gain.setValueAtTime(0, now);
            gn.gain.linearRampToValueAtTime(gain, now + 0.01);
            gn.gain.setValueAtTime(gain, now + dur - 0.01);
            gn.gain.linearRampToValueAtTime(0, now + dur);
            const pan = this.ctx.createStereoPanner();
            pan.pan.value = ear === 'left' ? -1 : ear === 'right' ? 1 : 0;
            osc.connect(gn); gn.connect(pan); pan.connect(this.ctx.destination);
            osc.start(now); osc.stop(now + dur + 0.02);
            this.osc = osc; this.gainNode = gn;
            setTimeout(resolve, durationMs);
        });
    }

    // Play pulsed tones: 3 short bursts with gaps
    // Returns a promise; can be cancelled via cancel()
    async playPulsedTone(frequency, dBHL, ear) {
        this._cancelled = false;
        for (let i = 0; i < HW_PULSE_COUNT; i++) {
            if (this._cancelled) return;
            await this.playBurst(frequency, dBHL, ear, HW_PULSE_ON_MS);
            if (this._cancelled) return;
            if (i < HW_PULSE_COUNT - 1) {
                await new Promise(r => setTimeout(r, HW_PULSE_OFF_MS));
            }
        }
    }

    cancel() {
        this._cancelled = true;
        this.stopTone();
    }

    stopTone() {
        try {
            if (this.gainNode && this.ctx) this.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.01);
            if (this.osc) { this.osc.stop(this.ctx ? this.ctx.currentTime + 0.02 : 0); this.osc.disconnect(); }
        } catch (e) { /* ignore */ }
        this.osc = null; this.gainNode = null;
    }

    playCalibrationTone() { return this.playBurst(1000, 40, 'both', 2000); }
}

// ═══════════════════════════════════════════════════
// HEARING TEST — Hughson-Westlake Method
// ═══════════════════════════════════════════════════
class HearingTest {
    constructor(audioEngine) {
        this.audio = audioEngine;
        this.results = { right: {}, left: {} };
        this.earIdx = 0;
        this.freqIdx = 0;
        this.completedSteps = 0;

        // Hughson-Westlake state
        this.currentLevel = HW_START_LEVEL;
        this.direction = 'ascending'; // 'ascending' or 'descending'
        this.ascendingHits = 0;       // count of ascending hits at same level
        this.ascendingLevel = null;   // the level being tracked for ascending
        this.isPresenting = false;    // currently presenting tone
        this.responded = false;       // user responded to current presentation
        this._aborted = false;

        // Callbacks
        this.onFreqChange = null;
        this.onEarChange = null;
        this.onComplete = null;
        this.onLevelUpdate = null;
        this.onPulseState = null;  // (isPulsing: bool, pulseNum: int)
    }

    get ear() { return EARS[this.earIdx]; }
    get freq() { return TEST_ORDER[this.freqIdx]; }
    get progress() { return this.completedSteps / TOTAL_STEPS; }
    get stepLabel() { return `${this.completedSteps + 1}/${TOTAL_STEPS}`; }

    abort() {
        this._aborted = true;
        this.audio.cancel();
    }

    // Main test loop for one frequency
    async runFrequency() {
        this.currentLevel = HW_START_LEVEL;
        this.direction = 'descending';
        this.ascendingHits = 0;
        this.ascendingLevel = null;
        this.responded = false;

        if (this.onLevelUpdate) this.onLevelUpdate(this.currentLevel);

        // Initial familiarization: play at clearly audible level
        // Start at 30 dB and begin the procedure
        while (!this._aborted) {
            // Present stimulus
            this.isPresenting = true;
            this.responded = false;
            if (this.onPulseState) this.onPulseState(true, this.currentLevel);

            // Play 3 pulsed tones
            await this.audio.playPulsedTone(this.freq, this.currentLevel, this.ear);
            if (this._aborted) return;

            // Wait for response
            if (this.onPulseState) this.onPulseState(false, this.currentLevel);
            await this._waitForResponse();
            if (this._aborted) return;
            this.isPresenting = false;

            if (this.responded) {
                // HEARD — check if ascending
                if (this.direction === 'ascending') {
                    if (this.ascendingLevel === this.currentLevel) {
                        this.ascendingHits++;
                    } else {
                        this.ascendingLevel = this.currentLevel;
                        this.ascendingHits = 1;
                    }

                    // Check if threshold found: 2 ascending hits at same level
                    if (this.ascendingHits >= HW_REQUIRED_ASCENDING) {
                        // Threshold determined!
                        this.results[this.ear][this.freq] = this.currentLevel;
                        this.completedSteps++;
                        return; // Done with this frequency
                    }
                }

                // Decrease by 10 dB
                this.direction = 'descending';
                this.currentLevel -= HW_STEP_DOWN;
                if (this.currentLevel < HW_MIN_LEVEL) this.currentLevel = HW_MIN_LEVEL;

            } else {
                // NOT HEARD — increase by 5 dB
                this.direction = 'ascending';
                this.currentLevel += HW_STEP_UP;

                // Safety: max level
                if (this.currentLevel > HW_MAX_LEVEL) {
                    // Can't go higher, record as NR (no response)
                    this.results[this.ear][this.freq] = HW_MAX_LEVEL;
                    this.completedSteps++;
                    return;
                }
            }

            if (this.onLevelUpdate) this.onLevelUpdate(this.currentLevel);

            // Brief pause between presentations (randomize slightly)
            const pause = 500 + Math.random() * 500;
            await new Promise(r => setTimeout(r, pause));
        }
    }

    _waitForResponse() {
        return new Promise(resolve => {
            this._resolveWait = resolve;
            this._waitTimer = setTimeout(() => {
                // No response
                this._resolveWait = null;
                resolve();
            }, HW_WAIT_AFTER_MS);
        });
    }

    // Called when user presses "I hear it"
    respondHeard() {
        if (this._aborted) return;
        this.responded = true;
        this.audio.cancel();
        if (this._waitTimer) { clearTimeout(this._waitTimer); this._waitTimer = null; }
        if (this._resolveWait) { this._resolveWait(); this._resolveWait = null; }
    }

    // Run full test sequence
    async runFullTest() {
        this._aborted = false;
        for (this.earIdx = 0; this.earIdx < EARS.length; this.earIdx++) {
            if (this.earIdx > 0 && this.onEarChange) {
                this.onEarChange(this.ear);
                // Wait for user to continue (set by App)
                await new Promise(r => { this._resumeEar = r; });
            }
            for (this.freqIdx = 0; this.freqIdx < TEST_ORDER.length; this.freqIdx++) {
                if (this._aborted) return;
                if (this.onFreqChange) this.onFreqChange();
                await this.runFrequency();
                if (this._aborted) return;
            }
        }
        if (this.onComplete) this.onComplete();
    }

    resumeAfterEarChange() {
        if (this._resumeEar) { this._resumeEar(); this._resumeEar = null; }
    }

    getResults() { return this.results; }
}

// ═══════════════════════════════════════════════════
// EVALUATION ENGINE
// ═══════════════════════════════════════════════════
class EvaluationEngine {
    static classifyLevel(avgDB) {
        for (const l of SEVERITY_LEVELS) { if (avgDB <= l.max) return l; }
        return SEVERITY_LEVELS[SEVERITY_LEVELS.length - 1];
    }
    static getAverage(earResults) {
        const freqs = [500, 1000, 2000, 4000]; let sum = 0, count = 0;
        for (const f of freqs) { if (earResults[f] !== undefined) { sum += earResults[f]; count++; } }
        return count > 0 ? Math.round(sum / count) : 0;
    }
    static evaluate(results) {
        const rAvg = this.getAverage(results.right), lAvg = this.getAverage(results.left);
        const rLevel = this.classifyLevel(rAvg), lLevel = this.classifyLevel(lAvg);
        const worseAvg = Math.max(rAvg, lAvg);
        return { rightAvg: rAvg, leftAvg: lAvg, rightLevel: rLevel, leftLevel: lLevel, overallLevel: this.classifyLevel(worseAvg) };
    }
    static getCommunicationAssessment(results) {
        const e = this.evaluate(results);
        const w = Math.max(e.rightAvg, e.leftAvg);
        const hR = ((results.right[4000] || 0) + (results.right[8000] || 0)) / 2;
        const hL = ((results.left[4000] || 0) + (results.left[8000] || 0)) / 2;
        const hAvg = Math.max(hR, hL);
        return [
            { icon: '🗣️', label: 'Hội thoại yên tĩnh', status: w <= 25 ? 'ok' : w <= 40 ? 'warning' : 'danger', text: w <= 25 ? 'Nghe tốt' : w <= 40 ? 'Đôi khi khó nghe' : 'Rất khó nghe' },
            { icon: '👥', label: 'Hội thoại nhóm', status: w <= 20 ? 'ok' : w <= 35 ? 'warning' : 'danger', text: w <= 20 ? 'Nghe tốt' : w <= 35 ? 'Cần tập trung cao' : 'Rất khó theo dõi' },
            { icon: '📱', label: 'Nghe điện thoại', status: w <= 30 ? 'ok' : w <= 45 ? 'warning' : 'danger', text: w <= 30 ? 'Bình thường' : w <= 45 ? 'Cần tăng âm lượng' : 'Rất khó khăn' },
            { icon: '📺', label: 'Xem TV / Nghe nhạc', status: w <= 25 ? 'ok' : w <= 40 ? 'warning' : 'danger', text: w <= 25 ? 'Bình thường' : w <= 40 ? 'Cần tăng âm lượng' : 'Cần âm lượng rất cao' },
            { icon: '🏙️', label: 'Môi trường ồn', status: w <= 15 ? 'ok' : w <= 30 ? 'warning' : 'danger', text: w <= 15 ? 'Nghe tốt' : w <= 30 ? 'Khó khăn đáng kể' : 'Gần như không nghe được' },
            { icon: '👶', label: 'Nghe giọng trẻ em', status: hAvg <= 25 ? 'ok' : hAvg <= 40 ? 'warning' : 'danger', text: hAvg <= 25 ? 'Nghe rõ' : hAvg <= 40 ? 'Đôi khi bỏ lỡ' : 'Rất khó nghe' },
        ];
    }
    static getClinicalWarnings(results) {
        const warnings = [];
        const e = this.evaluate(results);
        const asym = Math.abs(e.rightAvg - e.leftAvg);
        if (asym > 15) { const worse = e.rightAvg > e.leftAvg ? 'phải' : 'trái'; warnings.push({ type: 'alert', icon: '⚠️', text: `Mất thính lực không đối xứng (chênh ${asym} dB). Tai ${worse} kém hơn. Cần khám chuyên sâu.` }); }
        for (const ear of EARS) { const low = ((results[ear][250] || 0) + (results[ear][500] || 0)) / 2; const high = ((results[ear][4000] || 0) + (results[ear][8000] || 0)) / 2; if (high - low > 20 && high > 30) { warnings.push({ type: 'caution', icon: '📉', text: 'Sụt giảm tần số cao — dấu hiệu mất thính lực do tiếng ồn hoặc lão hóa.' }); break; } }
        const wA = Math.max(e.rightAvg, e.leftAvg);
        if (wA > 40) warnings.push({ type: 'alert', icon: '🏥', text: 'Giảm thính lực trung bình trở lên. Khuyến nghị đo chuyên sâu và tham vấn bác sĩ TMH.' });
        else if (wA > 25) warnings.push({ type: 'caution', icon: '👨‍⚕️', text: 'Giảm thính lực nhẹ. Nên kiểm tra định kỳ và đo chuyên sâu.' });
        for (const ear of EARS) { const t2 = results[ear][2000] || 0, t4 = results[ear][4000] || 0, t8 = results[ear][8000] || 0; if (t4 > t2 + 15 && t4 > t8 + 10) { warnings.push({ type: 'caution', icon: '🔊', text: 'Phát hiện "notch" 4000 Hz — đặc trưng mất thính lực do tiếng ồn.' }); break; } }
        if (warnings.length === 0) warnings.push({ type: 'info', icon: '✅', text: 'Thính lực bình thường. Khuyến nghị kiểm tra định kỳ 1-2 năm/lần.' });
        return warnings;
    }
}

// ═══════════════════════════════════════════════════
// AUDIOGRAM RENDERER — Matching Standard Clinical Style
// ═══════════════════════════════════════════════════
class AudiogramRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.frequencies = [125, 250, 500, 1000, 2000, 4000, 8000];
        this.dbRange = { min: -10, max: 120 };
        this.padding = { top: 60, right: 100, bottom: 30, left: 60 };
    }

    resize() {
        const container = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        const w = Math.min(container.clientWidth - 16, 780), h = Math.min(w * 0.75, 540);
        this.canvas.width = w * dpr; this.canvas.height = h * dpr;
        this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
        this.ctx.scale(dpr, dpr);
        this.w = w; this.h = h;
        this.pw = w - this.padding.left - this.padding.right;
        this.ph = h - this.padding.top - this.padding.bottom;
    }

    freqToX(f) {
        const logMin = Math.log2(100), logMax = Math.log2(10000);
        return this.padding.left + ((Math.log2(f) - logMin) / (logMax - logMin)) * this.pw;
    }
    dbToY(d) {
        return this.padding.top + ((d - this.dbRange.min) / (this.dbRange.max - this.dbRange.min)) * this.ph;
    }

    render(results) {
        this.resize();
        const c = this.ctx;
        c.clearRect(0, 0, this.w, this.h);
        c.fillStyle = '#fdfdfd';
        c.fillRect(this.padding.left, this.padding.top, this.pw, this.ph);
        c.fillStyle = '#e8384f'; c.font = 'bold 16px Inter,sans-serif'; c.textAlign = 'center';
        c.fillText('Audiogram — Thính Lực Đồ Âm Thanh Quen Thuộc', this.w / 2, 22);
        c.fillStyle = '#0088cc'; c.font = '10px Inter,sans-serif';
        c.fillText('Tần số (Hz)', this.padding.left + this.pw / 2, 38);
        this.drawGrid(); this.drawSeverityBands(); this.drawSpeechBanana();
        this.drawSpeechSounds(); this.drawFamiliarSounds(); this.drawSeverityLabels();
        if (results) this.drawResults(results);
    }

    drawGrid() {
        const c = this.ctx;
        for (const f of this.frequencies) {
            const x = this.freqToX(f);
            c.strokeStyle = '#ccc'; c.lineWidth = 0.5;
            c.beginPath(); c.moveTo(x, this.padding.top); c.lineTo(x, this.padding.top + this.ph); c.stroke();
            c.fillStyle = '#0088cc'; c.font = 'bold 11px Inter,sans-serif'; c.textAlign = 'center';
            c.fillText(f, x, this.padding.top - 6);
        }
        for (let d = 0; d <= 120; d += 10) {
            const y = this.dbToY(d);
            c.strokeStyle = d % 20 === 0 ? '#bbb' : '#ddd'; c.lineWidth = d % 20 === 0 ? 0.8 : 0.4;
            c.beginPath(); c.moveTo(this.padding.left, y); c.lineTo(this.padding.left + this.pw, y); c.stroke();
            if (d % 10 === 0) { c.fillStyle = '#555'; c.font = '10px Inter,sans-serif'; c.textAlign = 'right'; c.fillText(d, this.padding.left - 8, y + 3); }
        }
        c.save(); c.translate(14, this.padding.top + this.ph / 2); c.rotate(-Math.PI / 2);
        c.fillStyle = '#555'; c.font = '10px Inter,sans-serif'; c.textAlign = 'center';
        c.fillText('Ngưỡng nghe (dB HL)', 0, 0); c.restore();
        c.strokeStyle = '#999'; c.lineWidth = 1;
        c.strokeRect(this.padding.left, this.padding.top, this.pw, this.ph);
    }

    drawSeverityBands() {
        const c = this.ctx;
        const bands = [
            { min: -10, max: 25, color: 'rgba(200,240,220,0.35)' }, { min: 25, max: 40, color: 'rgba(220,240,200,0.25)' },
            { min: 40, max: 55, color: 'rgba(255,240,200,0.25)' }, { min: 55, max: 70, color: 'rgba(255,225,200,0.25)' },
            { min: 70, max: 90, color: 'rgba(255,210,210,0.25)' }, { min: 90, max: 120, color: 'rgba(230,210,240,0.25)' },
        ];
        for (const b of bands) { c.fillStyle = b.color; c.fillRect(this.padding.left, this.dbToY(b.min), this.pw, this.dbToY(b.max) - this.dbToY(b.min)); }
    }

    drawSpeechBanana() {
        const c = this.ctx;
        const top = [[200, 25], [250, 20], [350, 15], [500, 10], [750, 8], [1000, 5], [1500, 5], [2000, 8], [2500, 12], [3000, 15], [4000, 20], [5000, 30], [6000, 40]];
        const bot = [[200, 55], [250, 55], [350, 55], [500, 50], [750, 50], [1000, 48], [1500, 48], [2000, 50], [2500, 50], [3000, 50], [4000, 50], [5000, 50], [6000, 50]];
        c.beginPath();
        top.forEach((p, i) => { const x = this.freqToX(p[0]), y = this.dbToY(p[1]); i === 0 ? c.moveTo(x, y) : c.lineTo(x, y); });
        for (let i = bot.length - 1; i >= 0; i--) c.lineTo(this.freqToX(bot[i][0]), this.dbToY(bot[i][1]));
        c.closePath(); c.fillStyle = 'rgba(255, 210, 0, 0.45)'; c.fill();
        c.strokeStyle = 'rgba(200, 160, 0, 0.6)'; c.lineWidth = 1.5; c.stroke();
    }

    drawSpeechSounds() {
        const c = this.ctx;
        const sounds = [
            { t: 'j', f: 250, d: 35 }, { t: 'm', f: 300, d: 32 }, { t: 'd', f: 350, d: 38 },
            { t: 'b', f: 350, d: 42 }, { t: 'n', f: 500, d: 35 }, { t: 'ng', f: 450, d: 40 },
            { t: 'ee', f: 300, d: 45 }, { t: 'l', f: 400, d: 48 }, { t: 'u', f: 300, d: 50 },
            { t: 'o', f: 500, d: 40 }, { t: 'a', f: 750, d: 35 }, { t: 'e', f: 600, d: 38 },
            { t: 'i', f: 1000, d: 28 }, { t: 'r', f: 1200, d: 40 }, { t: 'p', f: 800, d: 15 },
            { t: 'g', f: 1000, d: 22 }, { t: 'h', f: 1500, d: 18 }, { t: 'ch', f: 2000, d: 22 },
            { t: 'sh', f: 2500, d: 22 }, { t: 'f', f: 2500, d: 15 }, { t: 's', f: 4000, d: 18 },
            { t: 'th', f: 4500, d: 28 }, { t: 'k', f: 2500, d: 30 },
        ];
        c.textAlign = 'center';
        for (const s of sounds) {
            const x = this.freqToX(s.f), y = this.dbToY(s.d);
            if (x < this.padding.left || x > this.padding.left + this.pw) continue;
            if (y < this.padding.top || y > this.padding.top + this.ph) continue;
            c.font = 'bold 13px Inter,sans-serif'; c.fillStyle = '#555'; c.fillText(s.t, x, y + 5);
        }
    }

    drawFamiliarSounds() {
        const c = this.ctx;
        const sounds = [
            { e: '💧', l: 'Nước nhỏ giọt', f: 200, d: 25 }, { e: '🍃', l: 'Lá xào xạc', f: 1000, d: 8 },
            { e: '🐦', l: 'Chim hót', f: 5000, d: 18 }, { e: '💬', l: 'Thì thầm', f: 2000, d: 22 },
            { e: '🗣️', l: 'Nói chuyện', f: 1000, d: 35 }, { e: '😢', l: 'Tiếng khóc', f: 1200, d: 62 },
            { e: '🐕', l: 'Chó sủa', f: 280, d: 70 }, { e: '🎹', l: 'Piano', f: 1500, d: 80 },
            { e: '🚛', l: 'Xe tải', f: 180, d: 100 }, { e: '🌿', l: 'Máy cắt cỏ', f: 350, d: 96 },
            { e: '🪚', l: 'Cưa máy', f: 2000, d: 110 }, { e: '🏍️', l: 'Xe máy', f: 4500, d: 100 },
            { e: '🔨', l: 'Búa máy', f: 150, d: 118 }, { e: '✈️', l: 'Máy bay', f: 5000, d: 118 },
            { e: '🧨', l: 'Pháo nổ', f: 500, d: 118 }, { e: '🎵', l: 'Ban nhạc', f: 1200, d: 118 },
        ];
        for (const s of sounds) {
            const x = this.freqToX(s.f), y = this.dbToY(s.d);
            if (x < this.padding.left - 5 || x > this.padding.left + this.pw + 5) continue;
            if (y < this.padding.top - 5 || y > this.padding.top + this.ph + 5) continue;
            c.textAlign = 'center'; c.font = '18px sans-serif'; c.fillText(s.e, x, y - 2);
            c.font = '8px Inter,sans-serif'; c.fillStyle = '#777'; c.fillText(s.l, x, y + 13);
        }
    }

    drawSeverityLabels() {
        const c = this.ctx; const x = this.padding.left + this.pw + 8;
        const labels = [
            { text: 'Bình thường', db: 8, color: '#00aacc' }, { text: 'Nhẹ (Mild)', db: 33, color: '#00aacc' },
            { text: 'Trung bình', db: 48, color: '#00aacc' }, { text: 'Nặng (Severe)', db: 73, color: '#00aacc' },
            { text: 'Sâu (Profound)', db: 98, color: '#00aacc' },
        ];
        c.textAlign = 'left';
        for (const l of labels) { c.fillStyle = l.color; c.font = 'bold 11px Inter,sans-serif'; c.fillText(l.text, x, this.dbToY(l.db) + 4); }
    }

    drawResults(results) {
        this.drawEarLine(results.right, '#ef4444', 'O');
        this.drawEarLine(results.left, '#3b82f6', 'X');
    }

    drawEarLine(earData, color, symbol) {
        const c = this.ctx;
        const testFreqs = [250, 500, 1000, 2000, 4000, 8000];
        const pts = [];
        for (const f of testFreqs) {
            if (earData[f] === undefined) continue;
            pts.push({ x: this.freqToX(f), y: this.dbToY(earData[f]), db: earData[f] });
        }
        if (pts.length === 0) return;
        c.strokeStyle = color; c.lineWidth = 2.5; c.lineJoin = 'round'; c.beginPath();
        pts.forEach((p, i) => i === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y)); c.stroke();
        for (const p of pts) {
            if (symbol === 'O') {
                c.fillStyle = '#fff'; c.strokeStyle = color; c.lineWidth = 3;
                c.beginPath(); c.arc(p.x, p.y, 10, 0, Math.PI * 2); c.fill(); c.stroke();
                c.fillStyle = color; c.font = 'bold 11px Inter,sans-serif'; c.textAlign = 'center'; c.fillText('O', p.x, p.y + 4);
            } else {
                const s = 9; c.strokeStyle = color; c.lineWidth = 3; c.beginPath();
                c.moveTo(p.x - s, p.y - s); c.lineTo(p.x + s, p.y + s);
                c.moveTo(p.x + s, p.y - s); c.lineTo(p.x - s, p.y + s); c.stroke();
            }
            c.fillStyle = color; c.font = 'bold 9px Inter,sans-serif'; c.textAlign = 'center'; c.fillText(p.db + ' dB', p.x, p.y - 16);
        }
    }
}

// ═══════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════
class App {
    constructor() {
        this.audio = new AudioEngine();
        this.test = null;
        this.agRenderer = new AudiogramRenderer('audiogram-canvas');
        this.testResults = null;
        this.userData = null;
        this.screen = 'screen-welcome';
        this.adminData = { tests: [], bookings: [] };
        this.init();
        this.initAdmin();
    }

    init() {
        // Welcome
        document.getElementById('btn-start').addEventListener('click', () => {
            this.audio.init();
            this.go('screen-calibration');
            // Auto-play calibration tone after short delay
            setTimeout(() => this.runCalibration(), 500);
        });
        // Footer Admin Link
        const btnAdmin = document.getElementById('btn-admin-login');
        if (btnAdmin) btnAdmin.addEventListener('click', (e) => {
            e.preventDefault();
            this.go('screen-admin-login');
        });
        // Calibration
        document.getElementById('btn-calibration-replay').addEventListener('click', () => this.runCalibration());
        document.getElementById('btn-calibration-ok').addEventListener('click', () => this.startTest());
        // Test: I hear it button
        document.getElementById('btn-hear').addEventListener('click', () => this.onHearClick());
        // Test: ear transition
        document.getElementById('btn-continue-ear').addEventListener('click', () => {
            document.getElementById('ear-transition').style.display = 'none';
            if (this.test) this.test.resumeAfterEarChange();
        });
        // Evaluation
        document.getElementById('btn-view-details').addEventListener('click', () => this.go('screen-userinfo'));
        // User Info
        document.getElementById('form-userinfo').addEventListener('submit', (e) => { e.preventDefault(); this.submitUserInfo(); });
        // Audiogram
        document.getElementById('btn-book-appointment').addEventListener('click', () => this.go('screen-booking'));
        // Booking
        document.getElementById('form-booking').addEventListener('submit', (e) => { e.preventDefault(); this.submitBooking(); });
        const dateInput = document.getElementById('input-date');
        dateInput.min = new Date().toISOString().split('T')[0]; dateInput.value = dateInput.min;
        window.addEventListener('resize', () => { if (this.screen === 'screen-audiogram' && this.testResults) this.agRenderer.render(this.testResults); });
    }

    // ── Admin Features ──
    initAdmin() {
        // Login Submit
        const formLogin = document.getElementById('form-admin-login');
        if (formLogin) {
            formLogin.addEventListener('submit', async (e) => {
                e.preventDefault();
                const pwd = document.getElementById('input-admin-pwd').value;
                if (pwd === 'Pahr@2026') {
                    this.go('screen-admin-dashboard');
                    this.loadAdminSettingsUI();
                    await this.fetchAdminData(pwd);
                } else {
                    alert('Mật khẩu không đúng!');
                }
            });
        }

        // Admin Tabs
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.admin-pane').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.target).classList.add('active');
            });
        });

        // Save Settings
        const formSettings = document.getElementById('form-admin-settings');
        if (formSettings) {
            formSettings.addEventListener('submit', (e) => {
                e.preventDefault();
                const freqs = [];
                document.querySelectorAll('.freq-cb:checked').forEach(cb => {
                    freqs.push(parseInt(cb.value, 10));
                });
                if (freqs.length === 0) {
                    alert('Phải chọn ít nhất 1 tần số!');
                    return;
                }
                const pulseCount = document.getElementById('setting-pulse-count').value;
                const pulseDuration = document.getElementById('setting-pulse-duration').value;
                const waitDuration = document.getElementById('setting-wait-duration').value;

                const configToSave = {
                    frequencies: freqs,
                    pulseCount: pulseCount,
                    pulseDuration: pulseDuration,
                    waitDuration: waitDuration
                };
                localStorage.setItem('pahr_admin_config', JSON.stringify(configToSave));
                alert('Đã lưu cấu hình. Vui lòng tải lại trang để áp dụng.');
                location.reload();
            });
        }

        // Back buttons
        document.querySelectorAll('.btn-admin-back').forEach(btn => {
            btn.addEventListener('click', () => this.go('screen-welcome'));
        });

        const btnRefreshData = document.getElementById('btn-admin-refresh');
        if (btnRefreshData) {
            btnRefreshData.addEventListener('click', () => this.fetchAdminData('Pahr@2026'));
        }
    }

    loadAdminSettingsUI() {
        // Set values based on current active config (which was loaded at top of file)
        TEST_ORDER.forEach(f => {
            const cb = document.getElementById('freq-' + f);
            if (cb) cb.checked = true;
        });
        document.getElementById('setting-pulse-count').value = HW_PULSE_COUNT;
        document.getElementById('setting-pulse-duration').value = HW_PULSE_ON_MS;
        document.getElementById('setting-wait-duration').value = HW_WAIT_AFTER_MS;
    }

    async fetchAdminData(password) {
        const tbodyTest = document.getElementById('admin-tbody-tests');
        const tbodyBook = document.getElementById('admin-tbody-bookings');
        if (!tbodyTest || !tbodyBook) return;

        tbodyTest.innerHTML = '<tr><td colspan="5" style="text-align:center">Đang tải dữ liệu...</td></tr>';
        tbodyBook.innerHTML = '<tr><td colspan="6" style="text-align:center">Đang tải dữ liệu...</td></tr>';

        // Use JSONP to bypass CORS for GET request
        const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
        window[callbackName] = (data) => {
            delete window[callbackName];
            document.body.removeChild(script);

            if (data.success) {
                this.adminData.tests = data.testResults || [];
                this.adminData.bookings = data.bookings || [];
                this.renderAdminData();
            } else {
                alert('Lỗi khi tải dữ liệu: ' + (data.error || 'Unknown error'));
                tbodyTest.innerHTML = '<tr><td colspan="5" style="text-align:center; color: red;">Lỗi: ' + (data.error || 'Unknown') + '</td></tr>';
                tbodyBook.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Lỗi: ' + (data.error || 'Unknown') + '</td></tr>';
            }
        };

        const script = document.createElement('script');
        script.src = `${CONFIG.GOOGLE_SCRIPT_URL}?action=getData&password=${encodeURIComponent(password)}&callback=${callbackName}`;
        script.onerror = () => {
            delete window[callbackName];
            document.body.removeChild(script);
            tbodyTest.innerHTML = '<tr><td colspan="5" style="text-align:center; color: red;">Lỗi kết nối đến Google Script</td></tr>';
            tbodyBook.innerHTML = '<tr><td colspan="6" style="text-align:center; color: red;">Lỗi kết nối đến Google Script</td></tr>';
        };
        document.body.appendChild(script);
    }

    renderAdminData() {
        const tbodyTest = document.getElementById('admin-tbody-tests');
        const tbodyBook = document.getElementById('admin-tbody-bookings');

        if (this.adminData.tests.length === 0) {
            tbodyTest.innerHTML = '<tr><td colspan="5" style="text-align:center">Chưa có kết quả nào</td></tr>';
        } else {
            tbodyTest.innerHTML = this.adminData.tests.map(t => `
                <tr>
                    <td>${t.time}</td>
                    <td><strong>${t.name}</strong><br><small>${t.phone}</small></td>
                    <td>${t.email}</td>
                    <td><span class="admin-badge">${t.evaluation}</span></td>
                    <td><button class="btn btn-sm btn-outline" onclick="alert('Dữ liệu thô: \\n' + '${t.details.replace(/"/g, '&quot;').replace(/'/g, '\\\'')}')">Xem JSON</button></td>
                </tr>
            `).join('');
        }

        if (this.adminData.bookings.length === 0) {
            tbodyBook.innerHTML = '<tr><td colspan="6" style="text-align:center">Chưa có lịch hẹn nào</td></tr>';
        } else {
            tbodyBook.innerHTML = this.adminData.bookings.map(b => `
                <tr>
                    <td>${b.timeBooked}</td>
                    <td><strong>${b.date}</strong><br>${b.timeStr}</td>
                    <td><strong>${b.name}</strong><br><small>${b.phone}</small></td>
                    <td>${b.notes || '-'}</td>
                    <td><span class="admin-badge">${b.evaluation}</span></td>
                    <td><button class="btn btn-sm btn-primary">Gọi ngay</button></td>
                </tr>
            `).join('');
        }
    }

    go(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(id).classList.add('active');
        this.screen = id; window.scrollTo(0, 0);
    }

    // ── Calibration ──
    async runCalibration() {
        const icon = document.getElementById('calibration-status-icon');
        const text = document.getElementById('calibration-status-text');
        icon.textContent = '🔊';
        text.textContent = 'Đang phát âm mẫu 1000 Hz...';
        document.getElementById('calibration-actions').style.display = 'none';

        await this.audio.playCalibrationTone();

        icon.textContent = '✅';
        text.textContent = 'Bạn nghe rõ âm thanh vừa phát không?';
        document.getElementById('calibration-actions').style.display = 'flex';
    }

    // ── Test ──
    startTest() {
        this.test = new HearingTest(this.audio);
        this.go('screen-test');

        this.test.onFreqChange = () => {
            this.updateTestInfo();
            this.updateProgressRing();
            this.setTestState('waiting');
        };
        this.test.onEarChange = (ear) => {
            document.getElementById('ear-transition').style.display = 'flex';
            document.getElementById('ear-transition-title').textContent =
                `Chuyển sang ${ear === 'right' ? 'Tai Phải' : 'Tai Trái'}`;
        };
        this.test.onComplete = () => {
            this.testResults = this.test.getResults();
            this.showEvaluation();
        };
        this.test.onLevelUpdate = (level) => {
            document.getElementById('current-db-value').textContent = level;
        };
        this.test.onPulseState = (isPulsing, level) => {
            if (isPulsing) {
                this.setTestState('pulsing');
            } else {
                this.setTestState('listening');
            }
        };

        this.updateTestInfo();
        this.updateProgressRing();
        this.setTestState('waiting');

        // Start the test
        this.test.runFullTest();
    }

    onHearClick() {
        if (!this.test) return;
        this.test.respondHeard();

        // 1) Haptic: vibrate on Android
        try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) { }

        // 2) Audio click (works on iOS + Android)
        this._playClickSound();

        // 3) Visual feedback — scale + flash
        const btn = document.getElementById('btn-hear');
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 300);
    }

    _playClickSound() {
        try {
            const ctx = this.audio.ctx || new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gn = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 1800;
            gn.gain.setValueAtTime(0.15, ctx.currentTime);
            gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
            osc.connect(gn);
            gn.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.06);
        } catch (e) { }
    }

    setTestState(state) {
        const indicator = document.getElementById('pulse-indicator');
        const statusText = document.getElementById('test-status-text');
        const btn = document.getElementById('btn-hear');

        if (state === 'pulsing') {
            indicator.className = 'sound-wave active';
            statusText.textContent = '🔔 Đang phát âm thanh...';
            btn.disabled = false;
        } else if (state === 'listening') {
            indicator.className = 'sound-wave listening';
            statusText.textContent = '👂 Đang chờ phản hồi...';
            btn.disabled = false;
        } else {
            indicator.className = 'sound-wave';
            statusText.textContent = 'Chuẩn bị phát âm thanh...';
            btn.disabled = false;
        }
    }

    updateTestInfo() {
        const t = this.test;
        document.getElementById('test-freq-value').textContent = t.freq;
        document.getElementById('test-freq-desc').textContent = FREQ_LABELS[t.freq] || '';
        const badge = document.getElementById('test-ear-badge');
        badge.className = 'ear-badge ' + t.ear;
        document.getElementById('test-ear-label').textContent = t.ear === 'right' ? 'Tai Phải' : 'Tai Trái';
        badge.querySelector('.ear-dot').className = 'ear-dot ' + t.ear;
        document.getElementById('ring-ear').textContent = t.ear === 'right' ? 'Tai Phải' : 'Tai Trái';
    }

    updateProgressRing() {
        const circ = 2 * Math.PI * 70;
        document.getElementById('progress-ring-circle').style.strokeDashoffset = circ * (1 - this.test.progress);
        document.getElementById('ring-step').textContent = this.test.stepLabel;
    }

    // ── Evaluation ──
    showEvaluation() {
        const ev = EvaluationEngine.evaluate(this.testResults);
        document.getElementById('eval-emoji').textContent = ev.overallLevel.emoji;
        document.getElementById('eval-level').textContent = ev.overallLevel.label;
        const descs = { normal: 'Thính lực bình thường ở cả hai tai.', mild: 'Giảm thính lực nhẹ. Có thể khó nghe trong môi trường ồn.', moderate: 'Giảm thính lực trung bình. Gặp khó khăn đáng kể. Nên khám chuyên sâu.', severe: 'Giảm thính lực nghiêm trọng. Cần khám chuyên gia thính học ngay.', profound: 'Giảm thính lực rất nặng. Cần can thiệp khẩn cấp.' };
        document.getElementById('eval-desc').textContent = descs[ev.overallLevel.cssClass] || descs.normal;
        document.getElementById('eval-result-card').className = 'eval-result-card ' + ev.overallLevel.cssClass;
        document.getElementById('eval-right-avg').textContent = ev.rightAvg + ' dB HL';
        document.getElementById('eval-right-status').textContent = ev.rightLevel.label;
        document.getElementById('eval-left-avg').textContent = ev.leftAvg + ' dB HL';
        document.getElementById('eval-left-status').textContent = ev.leftLevel.label;
        this.go('screen-evaluation');
    }

    // ── User Info ──
    async submitUserInfo() {
        const name = document.getElementById('input-name').value.trim();
        const email = document.getElementById('input-email').value.trim();
        const phone = document.getElementById('input-phone').value.trim();
        let valid = true;
        ['input-name', 'input-email', 'input-phone'].forEach(id => document.getElementById(id).classList.remove('invalid'));
        if (!name) { document.getElementById('input-name').classList.add('invalid'); valid = false; }
        if (!email || !email.includes('@')) { document.getElementById('input-email').classList.add('invalid'); valid = false; }
        if (!phone || phone.length < 10) { document.getElementById('input-phone').classList.add('invalid'); valid = false; }
        if (!valid) return;
        this.userData = { name, email, phone };
        document.getElementById('form-userinfo').style.display = 'none';
        document.getElementById('form-loading').style.display = 'block';
        await this.sendToGoogle({ type: 'user_info', name, email, phone, results: JSON.stringify(this.testResults), evaluation: EvaluationEngine.evaluate(this.testResults).overallLevel.label, timestamp: new Date().toISOString() });
        this.showAudiogram();
    }

    showAudiogram() {
        this.go('screen-audiogram');
        setTimeout(() => this.agRenderer.render(this.testResults), 100);
        document.getElementById('severity-legend').innerHTML = [
            { l: 'Bình thường (≤25 dB)', c: '#10b981' }, { l: 'Nhẹ (26-40 dB)', c: '#84cc16' },
            { l: 'Trung bình (41-55 dB)', c: '#f59e0b' }, { l: 'TB-Nặng (56-70 dB)', c: '#f97316' },
            { l: 'Nặng (71-90 dB)', c: '#ef4444' }, { l: 'Sâu (>90 dB)', c: '#a855f7' }
        ].map(b => `<div class="severity-tag"><span class="severity-dot" style="background:${b.c}"></span>${b.l}</div>`).join('');
        document.getElementById('communication-assessment').innerHTML = EvaluationEngine.getCommunicationAssessment(this.testResults).map(i =>
            `<div class="assess-card"><span class="assess-icon">${i.icon}</span><span class="assess-label">${i.label}</span><span class="assess-status ${i.status}">${i.text}</span></div>`
        ).join('');
        document.getElementById('clinical-warnings').innerHTML = EvaluationEngine.getClinicalWarnings(this.testResults).map(w =>
            `<div class="warning-card ${w.type}"><span class="warning-card-icon">${w.icon}</span><span>${w.text}</span></div>`
        ).join('');
    }

    // ── Booking ──
    async submitBooking() {
        const date = document.getElementById('input-date').value, time = document.getElementById('input-time').value;
        const notes = document.getElementById('input-notes').value.trim();
        if (!date || !time) return;
        document.getElementById('form-booking').style.display = 'none';
        document.getElementById('booking-loading').style.display = 'block';
        await this.sendToGoogle({ type: 'booking', name: this.userData?.name || '', email: this.userData?.email || '', phone: this.userData?.phone || '', date, time, notes, evaluation: EvaluationEngine.evaluate(this.testResults).overallLevel.label, timestamp: new Date().toISOString() });
        document.getElementById('booking-loading').style.display = 'none';
        document.getElementById('booking-success').style.display = 'block';
        const d = new Date(date + 'T' + time);
        document.getElementById('booking-summary').innerHTML = `<p>📅 ${d.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p><p>🕐 ${time}</p><p>👤 ${this.userData?.name || 'N/A'}</p><p>📱 ${this.userData?.phone || 'N/A'}</p>${notes ? `<p>📝 ${notes}</p>` : ''}`;
    }

    async sendToGoogle(data) {
        if (CONFIG.GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') { console.warn('Google URL not set:', data); await new Promise(r => setTimeout(r, 800)); return; }
        try { await fetch(CONFIG.GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); } catch (e) { console.error(e); }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.hearingApp = new App());
} else {
    window.hearingApp = new App();
}
