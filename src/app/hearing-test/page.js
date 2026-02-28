"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db, isConfigured } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { trackTestStarted, trackTestCompleted } from "@/lib/analytics";

/* ═══════════════════════════════════════════════════
   CONSTANTS & CONFIGURATION
   ═══════════════════════════════════════════════════ */
const TEST_FREQS = [1000, 2000, 4000, 8000, 500, 250];
const EARS = ["right", "left"];
const FREQ_LABELS = { 250: "Trầm", 500: "Trầm-Trung", 1000: "Trung", 2000: "Trung-Cao", 4000: "Cao", 8000: "Rất Cao" };
const EAR_LABELS = { right: "Phải", left: "Trái" };
const EAR_ICONS = { right: "👉", left: "👈" };

// Hughson-Westlake parameters — optimized for speed while maintaining clinical accuracy
const HW = {
    START_LEVEL: 40,        // Start at 40dB (more audible)
    STEP_UP: 5,             // +5 dB on miss
    STEP_DOWN: 10,          // -10 dB on hear
    MIN_LEVEL: -10,
    MAX_LEVEL: 90,
    REQUIRED_ASCENDING: 2,  // 2 of 3 ascending responses (ASHA standard)
    PULSE_COUNT: 2,         // 2 pulses (saves ~400ms per presentation vs 3)
    PULSE_ON_MS: 200,       // 200ms per pulse (clinical standard)
    PULSE_OFF_MS: 150,      // 150ms gap (slightly shorter)
    WAIT_AFTER_MS: 1500,    // 1.5s response window (adequate for online screening)
    INTER_STIM_MIN: 500,    // Shorter random inter-stimulus interval
    INTER_STIM_MAX: 1200,
    MAX_REVERSALS: 5,       // 5 reversals before forcing threshold
    FAMILIARIZATION_LEVEL: 40,
    ADAPTIVE_START: true,   // Use previous threshold to start next frequency
};

// Frequency calibration offsets (dB SPL relative to 1kHz for typical consumer headphones)
const FREQ_CORRECTIONS = { 250: 12, 500: 5, 1000: 0, 2000: -4, 4000: -3, 8000: 14 };
const BASE_GAIN = 0.0003;

// Age-norm reference (ISO 7029:2017 / WHO — median PTA & upper-normal threshold)
const AGE_NORMS = [
    { label: "18–29 tuổi", median: 4,  normal: 20, note: "Thính lực đỉnh cao" },
    { label: "30–39 tuổi", median: 8,  normal: 25, note: "Bình thường" },
    { label: "40–49 tuổi", median: 14, normal: 30, note: "Lão hóa nhẹ" },
    { label: "50–59 tuổi", median: 22, normal: 38, note: "Lão hóa tự nhiên" },
    { label: "60–69 tuổi", median: 32, normal: 48, note: "Lão hóa trung bình" },
    { label: "70+ tuổi",   median: 45, normal: 60, note: "Lão hóa tiến triển" },
];

// Severity classification
const SEVERITY = [
    { max: 15, label: "Bình thường", color: "#10b981", emoji: "✅", bg: "rgba(16,185,129,0.1)" },
    { max: 25, label: "Gần bình thường", color: "#84cc16", emoji: "🟢", bg: "rgba(132,204,22,0.1)" },
    { max: 40, label: "Giảm nhẹ", color: "#f59e0b", emoji: "🟡", bg: "rgba(245,158,11,0.1)" },
    { max: 55, label: "Giảm trung bình", color: "#f97316", emoji: "🟠", bg: "rgba(249,115,22,0.1)" },
    { max: 70, label: "Giảm trung bình-nặng", color: "#ef4444", emoji: "🔴", bg: "rgba(239,68,68,0.1)" },
    { max: 90, label: "Giảm nặng", color: "#dc2626", emoji: "🔴", bg: "rgba(220,38,38,0.1)" },
    { max: 999, label: "Giảm sâu", color: "#9333ea", emoji: "🟣", bg: "rgba(147,51,234,0.1)" },
];

/* ═══════════════════════════════════════════════════
   AUDIO ENGINE
   ═══════════════════════════════════════════════════ */
class AudioEngine {
    constructor() {
        this.ctx = null;
        this._cancelled = false;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === "suspended") this.ctx.resume();
    }

    dBHLtoGain(dBHL, freq) {
        const corr = FREQ_CORRECTIONS[freq] || 0;
        return Math.min(BASE_GAIN * Math.pow(10, (dBHL + corr) / 20), 1.0);
    }

    playBurst(freq, dBHL, ear, durationMs) {
        return new Promise((resolve) => {
            this.init();
            const now = this.ctx.currentTime;
            const dur = durationMs / 1000;
            const gain = this.dBHLtoGain(dBHL, freq);

            const osc = this.ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.value = freq;

            const gn = this.ctx.createGain();
            // Smooth ramp to avoid clicks
            gn.gain.setValueAtTime(0, now);
            gn.gain.linearRampToValueAtTime(gain, now + 0.015);
            gn.gain.setValueAtTime(gain, now + dur - 0.015);
            gn.gain.linearRampToValueAtTime(0, now + dur);

            const pan = this.ctx.createStereoPanner();
            pan.pan.value = ear === "left" ? -1 : ear === "right" ? 1 : 0;

            osc.connect(gn);
            gn.connect(pan);
            pan.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + dur + 0.02);

            setTimeout(resolve, durationMs);
        });
    }

    async playPulsedTone(freq, dBHL, ear) {
        this._cancelled = false;
        for (let i = 0; i < HW.PULSE_COUNT; i++) {
            if (this._cancelled) return;
            await this.playBurst(freq, dBHL, ear, HW.PULSE_ON_MS);
            if (this._cancelled) return;
            if (i < HW.PULSE_COUNT - 1) {
                await this._delay(HW.PULSE_OFF_MS);
            }
        }
    }

    playCalibrationTone(ear = "both") {
        return this.playBurst(1000, 40, ear, 1500);
    }

    cancel() { this._cancelled = true; }
    _delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

/* ═══════════════════════════════════════════════════
   EVALUATION ENGINE
   ═══════════════════════════════════════════════════ */
function classify(avg) {
    for (const s of SEVERITY) { if (avg <= s.max) return s; }
    return SEVERITY[SEVERITY.length - 1];
}

function getPTA(earResults) {
    const ptaFreqs = [500, 1000, 2000, 4000];
    let sum = 0, count = 0;
    ptaFreqs.forEach(f => { if (earResults[f] !== undefined) { sum += earResults[f]; count++; } });
    return count > 0 ? Math.round(sum / count) : 0;
}

function evaluate(results) {
    const rPTA = getPTA(results.right), lPTA = getPTA(results.left);
    return {
        rightPTA: rPTA, leftPTA: lPTA,
        rightLevel: classify(rPTA), leftLevel: classify(lPTA),
        overallLevel: classify(Math.max(rPTA, lPTA)),
        worsePTA: Math.max(rPTA, lPTA),
    };
}

function getWarnings(results) {
    const e = evaluate(results);
    const warnings = [];
    const asym = Math.abs(e.rightPTA - e.leftPTA);
    if (asym > 15) {
        const worse = e.rightPTA > e.leftPTA ? "phải" : "trái";
        warnings.push({ type: "alert", text: `Mất thính lực không đối xứng (chênh ${asym}dB). Tai ${worse} kém hơn. Cần khám chuyên sâu.` });
    }
    for (const ear of EARS) {
        const low = ((results[ear][250] || 0) + (results[ear][500] || 0)) / 2;
        const high = ((results[ear][4000] || 0) + (results[ear][8000] || 0)) / 2;
        if (high - low > 20 && high > 30) {
            warnings.push({ type: "caution", text: "Sụt giảm tần số cao — dấu hiệu mất thính lực do tiếng ồn hoặc lão hóa." });
            break;
        }
    }
    for (const ear of EARS) {
        const t2 = results[ear][2000] || 0, t4 = results[ear][4000] || 0, t8 = results[ear][8000] || 0;
        if (t4 > t2 + 15 && t4 > t8 + 10) {
            warnings.push({ type: "alert", text: "Phát hiện \"notch\" 4kHz — đặc trưng nghe kém do tiếng ồn." });
            break;
        }
    }
    if (e.worsePTA > 40) warnings.push({ type: "alert", text: "Giảm thính lực trung bình trở lên. Khuyến nghị đo chuyên sâu tại phòng đo chuẩn." });
    else if (e.worsePTA > 25) warnings.push({ type: "caution", text: "Giảm thính lực nhẹ. Nên kiểm tra định kỳ và đo chuyên sâu." });
    if (warnings.length === 0) warnings.push({ type: "ok", text: "Thính lực trong giới hạn bình thường. Khuyến nghị kiểm tra 1-2 năm/lần." });
    return warnings;
}

function getCommAssessment(results) {
    const e = evaluate(results);
    const w = e.worsePTA;
    const hR = ((results.right[4000] || 0) + (results.right[8000] || 0)) / 2;
    const hL = ((results.left[4000] || 0) + (results.left[8000] || 0)) / 2;
    const hAvg = Math.max(hR, hL);
    return [
        { icon: "🗣️", label: "Hội thoại yên tĩnh", status: w <= 25 ? "ok" : w <= 40 ? "warn" : "bad", text: w <= 25 ? "Nghe tốt" : w <= 40 ? "Đôi khi khó nghe" : "Rất khó nghe" },
        { icon: "👥", label: "Hội thoại nhóm", status: w <= 20 ? "ok" : w <= 35 ? "warn" : "bad", text: w <= 20 ? "Nghe tốt" : w <= 35 ? "Cần tập trung cao" : "Rất khó theo dõi" },
        { icon: "📱", label: "Nghe điện thoại", status: w <= 30 ? "ok" : w <= 45 ? "warn" : "bad", text: w <= 30 ? "Bình thường" : w <= 45 ? "Cần tăng âm lượng" : "Rất khó khăn" },
        { icon: "🏙️", label: "Môi trường ồn", status: w <= 15 ? "ok" : w <= 30 ? "warn" : "bad", text: w <= 15 ? "Nghe tốt" : w <= 30 ? "Khó khăn đáng kể" : "Gần như không nghe" },
        { icon: "👶", label: "Giọng trẻ em", status: hAvg <= 25 ? "ok" : hAvg <= 40 ? "warn" : "bad", text: hAvg <= 25 ? "Nghe rõ" : hAvg <= 40 ? "Đôi khi bỏ lỡ" : "Rất khó nghe" },
    ];
}

function getRecommendations(results) {
    const e = evaluate(results);
    const w = e.worsePTA;
    const asym = Math.abs(e.rightPTA - e.leftPTA);
    const hfAvg = Math.max(
        ((results.right[4000] || 0) + (results.right[8000] || 0)) / 2,
        ((results.left[4000] || 0) + (results.left[8000] || 0)) / 2
    );
    const recs = [];

    if (w <= 15) {
        recs.push({ icon: "✅", title: "Thính lực tốt", text: "Kiểm tra lại sau 1–2 năm. Bảo vệ tai khỏi tiếng ồn lớn.", priority: "low" });
    } else if (w <= 25) {
        recs.push({ icon: "📅", title: "Kiểm tra chuyên sâu", text: "Nên đo tại phòng đo chuẩn để xác nhận. Theo dõi 6 tháng/lần.", priority: "medium" });
    } else if (w <= 40) {
        recs.push({ icon: "🦻", title: "Tư vấn máy trợ thính", text: "Nghe kém nhẹ có thể cải thiện đáng kể với máy trợ thính. Đặt lịch tư vấn miễn phí.", priority: "high" });
        recs.push({ icon: "🔊", title: "Thử mô phỏng máy trợ thính", text: "Trải nghiệm hiệu quả máy trợ thính ngay trên trang web.", priority: "medium", link: "/hearing-aid-simulator" });
    } else if (w <= 55) {
        recs.push({ icon: "🏥", title: "Cần can thiệp sớm", text: "Giảm thính lực trung bình ảnh hưởng rõ rệt giao tiếp hàng ngày. Máy trợ thính được khuyến nghị mạnh.", priority: "high" });
    } else {
        recs.push({ icon: "🚨", title: "Cần khám chuyên khoa ngay", text: "Giảm thính lực mức nặng, cần can thiệp chuyên sâu. Liên hệ chuyên gia thính học.", priority: "urgent" });
    }

    if (asym > 15) {
        recs.push({ icon: "⚕️", title: "Kiểm tra chuyên khoa tai mũi họng", text: `Chênh lệch 2 tai ${asym} dB — có thể cần khám chuyên sâu loại trừ bệnh lý.`, priority: "high" });
    }
    if (hfAvg > 35) {
        recs.push({ icon: "🔇", title: "Bảo vệ thính giác tần số cao", text: "Hạn chế tiếp xúc tiếng ồn lớn, sử dụng bảo vệ tai khi cần.", priority: "medium" });
    }
    if (w > 25) {
        recs.push({ icon: "👨‍👩‍👧", title: "Thông báo người thân", text: "Chia sẻ kết quả với gia đình để họ hiểu và hỗ trợ giao tiếp tốt hơn.", priority: "low" });
    }

    return recs;
}

/* ═══════════════════════════════════════════════════
   SCREENS
   ═══════════════════════════════════════════════════ */
const SCREENS = { WELCOME: 0, CALIBRATION: 1, TESTING: 2, EAR_SWITCH: 3, RESULTS: 4 };

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function HearingTestPage() {
    const { user, signInWithGoogle } = useAuth();
    const [screen, setScreen] = useState(SCREENS.WELCOME);
    const [testState, setTestState] = useState({
        ear: "right", freq: 1000, level: HW.START_LEVEL,
        progress: 0, isPulsing: false, totalSteps: TEST_FREQS.length * EARS.length,
    });
    const [results, setResults] = useState(null);
    const [calibDone, setCalibDone] = useState(false);
    const [calibPlaying, setCalibPlaying] = useState(false);

    const audioRef = useRef(null);
    const testRef = useRef(null); // mutable test state for async loop
    const resolveResponseRef = useRef(null);

    // Initialize audio engine
    useEffect(() => {
        audioRef.current = new AudioEngine();
        return () => {
            if (testRef.current) testRef.current.aborted = true;
            audioRef.current?.cancel();
        };
    }, []);

    // ── CALIBRATION ──
    const playCalibration = useCallback(async (ear) => {
        if (!audioRef.current) return;
        audioRef.current.init();
        setCalibPlaying(true);
        try {
            await audioRef.current.playCalibrationTone(ear);
        } catch (e) { /* ignore */ }
        setCalibPlaying(false);
    }, []);

    // ── HUGHSON-WESTLAKE TEST ──
    const startTest = useCallback(async () => {
        if (!audioRef.current) return;
        const audio = audioRef.current;
        audio.init();
        trackTestStarted();

        const allResults = { right: {}, left: {} };
        const state = {
            aborted: false,
            responded: false,
        };
        testRef.current = state;

        let completedSteps = 0;
        const totalSteps = TEST_FREQS.length * EARS.length;

        for (let earIdx = 0; earIdx < EARS.length; earIdx++) {
            const ear = EARS[earIdx];

            // Ear switch screen
            if (earIdx > 0) {
                setScreen(SCREENS.EAR_SWITCH);
                await new Promise(r => { state.resumeEar = r; });
                if (state.aborted) return;
            }

            // Track thresholds for adaptive starting level
            let lastThreshold = HW.START_LEVEL;

            for (let freqIdx = 0; freqIdx < TEST_FREQS.length; freqIdx++) {
                if (state.aborted) return;
                const freq = TEST_FREQS[freqIdx];

                setTestState(prev => ({
                    ...prev,
                    ear, freq,
                    progress: completedSteps / totalSteps,
                }));

                // Adaptive starting level: use previous threshold ±10 dB (faster convergence)
                let level;
                if (HW.ADAPTIVE_START && freqIdx > 0) {
                    // Start 10 dB above last threshold (descending approach)
                    level = Math.min(HW.MAX_LEVEL, Math.max(HW.MIN_LEVEL, lastThreshold + 10));
                } else {
                    level = HW.START_LEVEL;
                }

                // Familiarization: play at clearly audible level first (only first freq per ear)
                if (freqIdx === 0) {
                    state.responded = false;
                    setTestState(prev => ({ ...prev, level: HW.FAMILIARIZATION_LEVEL, isPulsing: true }));
                    await audio.playPulsedTone(freq, HW.FAMILIARIZATION_LEVEL, ear);
                    if (state.aborted) return;
                    setTestState(prev => ({ ...prev, isPulsing: false }));
                    await waitForResponse(state, 2000);
                    if (state.aborted) return;
                    await audio._delay(300 + Math.random() * 300);
                }

                let direction = "descending";
                let ascendingHits = 0;
                let ascendingLevel = null;
                let reversals = 0;
                let presentations = 0;
                const MAX_PRESENTATIONS = 20; // Safety cap

                // Main loop
                while (!state.aborted && presentations < MAX_PRESENTATIONS) {
                    presentations++;
                    state.responded = false;
                    setTestState(prev => ({ ...prev, level, isPulsing: true }));

                    // Play pulsed tone
                    await audio.playPulsedTone(freq, level, ear);
                    if (state.aborted) return;

                    setTestState(prev => ({ ...prev, isPulsing: false }));

                    // Wait for response
                    await waitForResponse(state, HW.WAIT_AFTER_MS);
                    if (state.aborted) return;

                    if (state.responded) {
                        // HEARD
                        if (direction === "ascending") {
                            if (ascendingLevel === level) {
                                ascendingHits++;
                            } else {
                                ascendingLevel = level;
                                ascendingHits = 1;
                            }
                            if (ascendingHits >= HW.REQUIRED_ASCENDING) {
                                allResults[ear][freq] = level;
                                lastThreshold = level;
                                completedSteps++;
                                break; // Threshold found
                            }
                        }
                        const prevDir = direction;
                        direction = "descending";
                        if (prevDir === "ascending") reversals++;
                        level = Math.max(HW.MIN_LEVEL, level - HW.STEP_DOWN);
                    } else {
                        // NOT HEARD
                        const prevDir = direction;
                        direction = "ascending";
                        if (prevDir === "descending") reversals++;
                        level += HW.STEP_UP;
                        if (level > HW.MAX_LEVEL) {
                            allResults[ear][freq] = HW.MAX_LEVEL; // NR
                            lastThreshold = HW.MAX_LEVEL;
                            completedSteps++;
                            break;
                        }
                    }

                    // Safety: too many reversals
                    if (reversals >= HW.MAX_REVERSALS) {
                        allResults[ear][freq] = level;
                        lastThreshold = level;
                        completedSteps++;
                        break;
                    }

                    setTestState(prev => ({ ...prev, level }));

                    // Random inter-stimulus interval (shorter for faster test)
                    const pause = HW.INTER_STIM_MIN + Math.random() * (HW.INTER_STIM_MAX - HW.INTER_STIM_MIN);
                    await audio._delay(pause);
                }

                // Safety: max presentations exceeded
                if (presentations >= MAX_PRESENTATIONS && !allResults[ear][freq]) {
                    allResults[ear][freq] = level;
                    lastThreshold = level;
                    completedSteps++;
                }
            }
        }

        if (!state.aborted) {
            setResults(allResults);
            setTestState(prev => ({ ...prev, progress: 1 }));

            // Save to Firestore
            if (user && isConfigured && db) {
                try {
                    const ev = evaluate(allResults);
                    await addDoc(collection(db, "testResults"), {
                        uid: user.uid, email: user.email, displayName: user.displayName,
                        results: allResults, evaluationLabel: ev.overallLevel.label,
                        rightPTA: ev.rightPTA, leftPTA: ev.leftPTA,
                        createdAt: serverTimestamp(),
                    });
                } catch (e) { console.error("Save error:", e); }
            }

            const ev = evaluate(allResults);
            trackTestCompleted({ pta: Math.round(Math.max(ev.rightPTA, ev.leftPTA)), severity: ev.overallLevel.label });
            setScreen(SCREENS.RESULTS);
        }
    }, [user]);

    function waitForResponse(state, timeoutMs) {
        return new Promise(resolve => {
            resolveResponseRef.current = resolve;
            const timer = setTimeout(() => {
                resolveResponseRef.current = null;
                resolve();
            }, timeoutMs);
            state._clearWait = () => { clearTimeout(timer); resolveResponseRef.current = null; resolve(); };
        });
    }

    const onHear = useCallback(() => {
        const state = testRef.current;
        if (!state) return;
        state.responded = true;
        audioRef.current?.cancel();
        if (state._clearWait) state._clearWait();
    }, []);

    const onResumeEar = useCallback(() => {
        const state = testRef.current;
        if (state?.resumeEar) { state.resumeEar(); state.resumeEar = null; }
        setScreen(SCREENS.TESTING);
    }, []);

    const restartTest = useCallback(() => {
        if (testRef.current) testRef.current.aborted = true;
        audioRef.current?.cancel();
        setResults(null);
        setTestState({
            ear: "right", freq: 1000, level: HW.START_LEVEL,
            progress: 0, isPulsing: false, totalSteps: TEST_FREQS.length * EARS.length,
        });
        setScreen(SCREENS.WELCOME);
    }, []);

    /* ═══════════════════════════════════════════════ */
    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0f1e,#0f1b35,#1a0f2e)", fontFamily: "'Inter',sans-serif", color: "#e8ecf4" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                .g { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; }
                @keyframes pulse-hear { 0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,212,255,0.4); } 50% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(0,212,255,0); } }
                @keyframes ring-anim { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
                @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .fade-in { animation: fade-in 0.5s ease-out; }
                .btn-primary { padding: 16px 36px; background: linear-gradient(135deg,#00d4ff,#7c3aed); border: none; color: #fff; border-radius: 30px; font-weight: 700; font-size: 1rem; cursor: pointer; box-shadow: 0 8px 25px rgba(0,212,255,0.3); transition: all 0.3s; }
                .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,212,255,0.4); }
                .btn-outline { padding: 12px 28px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #e8ecf4; border-radius: 20px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .btn-outline:hover { background: rgba(255,255,255,0.1); }
            `}</style>

            {/* Nav */}
            <nav style={{ padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <a href="/" style={{ fontSize: "1.4rem", fontWeight: 800, textDecoration: "none", color: "#fff" }}>PAH<span style={{ color: "#00d4ff" }}>.</span></a>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {user ? (
                        <a href="/dashboard" className="btn-outline" style={{ fontSize: "0.82rem", padding: "8px 16px" }}>📊 Dashboard</a>
                    ) : (
                        <button onClick={() => signInWithGoogle()} className="btn-outline" style={{ fontSize: "0.82rem", padding: "8px 16px" }}>
                            Đăng nhập Google
                        </button>
                    )}
                    <a href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.82rem" }}>← Trang chủ</a>
                </div>
            </nav>

            <main style={{ maxWidth: 800, margin: "0 auto", padding: "40px 20px 80px" }}>

                {/* ══════ SCREEN: WELCOME ══════ */}
                {screen === SCREENS.WELCOME && (
                    <div className="fade-in" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 64, marginBottom: 16 }}>🎧</div>
                        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, marginBottom: 12 }}>
                            Kiểm Tra Thính Lực Online
                        </h1>
                        <p style={{ color: "#94a3b8", marginBottom: 8, fontSize: "0.95rem" }}>
                            Phương pháp Hughson-Westlake chuẩn lâm sàng
                        </p>
                        <p style={{ color: "#64748b", fontSize: "0.82rem", marginBottom: 32, maxWidth: 500, margin: "0 auto 32px" }}>
                            Đo ngưỡng nghe 6 tần số × 2 tai. Cần tai nghe và môi trường yên tĩnh. Thời gian: ~5 phút.
                        </p>

                        {/* Requirements */}
                        <div className="g" style={{ padding: 28, textAlign: "left", marginBottom: 28 }}>
                            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 16 }}>Chuẩn bị trước khi đo:</h3>
                            {[
                                { icon: "🎧", text: "Đeo tai nghe (headphone hoặc earphone)", important: true },
                                { icon: "🔇", text: "Tìm nơi yên tĩnh, tắt TV / nhạc nền" },
                                { icon: "🔊", text: "Đặt âm lượng thiết bị khoảng 70-80%", important: true },
                                { icon: "📱", text: "Không sử dụng loa ngoài" },
                            ].map((item, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, padding: "8px 12px", background: item.important ? "rgba(0,212,255,0.05)" : "transparent", borderRadius: 10 }}>
                                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                                    <span style={{ fontSize: "0.88rem", color: item.important ? "#e8ecf4" : "#94a3b8" }}>{item.text}</span>
                                </div>
                            ))}
                        </div>

                        {!user && (
                            <div style={{ marginBottom: 24, padding: "12px 18px", background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.12)", borderRadius: 14, display: "inline-flex", alignItems: "center", gap: 10, fontSize: "0.85rem" }}>
                                <span>💡</span>
                                <span style={{ color: "#94a3b8" }}>Đăng nhập để lưu & so sánh kết quả qua thời gian</span>
                            </div>
                        )}

                        <div>
                            <button className="btn-primary" onClick={() => setScreen(SCREENS.CALIBRATION)}>
                                🎧 Bắt Đầu Kiểm Tra
                            </button>
                        </div>
                    </div>
                )}

                {/* ══════ SCREEN: CALIBRATION ══════ */}
                {screen === SCREENS.CALIBRATION && (
                    <div className="fade-in" style={{ textAlign: "center" }}>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 8 }}>🔊 Hiệu Chỉnh Âm Lượng</h2>
                        <p style={{ color: "#94a3b8", marginBottom: 28, fontSize: "0.9rem", maxWidth: 500, margin: "0 auto 28px" }}>
                            Nghe âm kiểm tra ở 1000Hz (âm trung) để đảm bảo âm lượng thiết bị phù hợp. Bạn cần nghe rõ nhưng không quá to.
                        </p>

                        <div className="g" style={{ padding: 32, marginBottom: 28 }}>
                            {/* Volume instruction */}
                            <div style={{ marginBottom: 24, padding: "16px 20px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 14 }}>
                                <div style={{ fontWeight: 700, color: "#f59e0b", marginBottom: 6, fontSize: "0.9rem" }}>⚙️ Cách chỉnh âm lượng tự động:</div>
                                <div style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.7 }}>
                                    1. Nhấn <strong style={{ color: "#e8ecf4" }}>Phát âm thử</strong> bên dưới<br />
                                    2. Nếu <strong style={{ color: "#ef4444" }}>không nghe thấy</strong> → tăng âm lượng thiết bị<br />
                                    3. Nếu <strong style={{ color: "#f59e0b" }}>quá to</strong> → giảm âm lượng<br />
                                    4. Mục tiêu: <strong style={{ color: "#10b981" }}>nghe rõ ràng ở mức vừa phải</strong>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
                                <button className="btn-outline" disabled={calibPlaying}
                                    onClick={() => playCalibration("right")}
                                    style={{ opacity: calibPlaying ? 0.5 : 1 }}>
                                    {calibPlaying ? "🔊 Đang phát..." : "👉 Phát tai phải"}
                                </button>
                                <button className="btn-outline" disabled={calibPlaying}
                                    onClick={() => playCalibration("left")}
                                    style={{ opacity: calibPlaying ? 0.5 : 1 }}>
                                    {calibPlaying ? "🔊 Đang phát..." : "👈 Phát tai trái"}
                                </button>
                            </div>

                            <label style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", cursor: "pointer" }}>
                                <input type="checkbox" checked={calibDone} onChange={e => setCalibDone(e.target.checked)}
                                    style={{ width: 18, height: 18, accentColor: "#00d4ff" }} />
                                <span style={{ fontSize: "0.9rem" }}>Tôi nghe rõ cả hai tai ở mức vừa phải</span>
                            </label>
                        </div>

                        <button className="btn-primary" disabled={!calibDone}
                            onClick={() => { setScreen(SCREENS.TESTING); setTimeout(startTest, 500); }}
                            style={{ opacity: calibDone ? 1 : 0.4 }}>
                            ✓ Bắt Đầu Đo
                        </button>
                    </div>
                )}

                {/* ══════ SCREEN: TESTING ══════ */}
                {screen === SCREENS.TESTING && (
                    <div className="fade-in" style={{ textAlign: "center" }}>
                        {/* Progress bar */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                    {EAR_ICONS[testState.ear]} Tai {EAR_LABELS[testState.ear]}
                                </span>
                                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                                    {Math.round(testState.progress * 100)}%
                                </span>
                            </div>
                            <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
                                <div style={{
                                    height: "100%", width: `${testState.progress * 100}%`,
                                    background: "linear-gradient(90deg,#00d4ff,#7c3aed)",
                                    borderRadius: 10, transition: "width 0.5s"
                                }} />
                            </div>
                        </div>

                        {/* Current frequency info */}
                        <div className="g" style={{ padding: 20, marginBottom: 24 }}>
                            <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 4 }}>Tần số đang đo</div>
                            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#00d4ff" }}>
                                {testState.freq >= 1000 ? (testState.freq / 1000) + " kHz" : testState.freq + " Hz"}
                            </div>
                            <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{FREQ_LABELS[testState.freq]}</div>
                        </div>

                        {/* Pulsing indicator */}
                        <div style={{ position: "relative", display: "inline-block", marginBottom: 24 }}>
                            {testState.isPulsing && (
                                <>
                                    <div style={{
                                        position: "absolute", inset: -20,
                                        borderRadius: "50%", border: "2px solid rgba(0,212,255,0.3)",
                                        animation: "ring-anim 1.5s ease-out infinite"
                                    }} />
                                    <div style={{
                                        position: "absolute", inset: -10,
                                        borderRadius: "50%", border: "2px solid rgba(0,212,255,0.5)",
                                        animation: "ring-anim 1.5s ease-out infinite 0.3s"
                                    }} />
                                </>
                            )}
                            <div style={{
                                width: 100, height: 100, borderRadius: "50%",
                                background: testState.isPulsing ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.03)",
                                border: `2px solid ${testState.isPulsing ? "#00d4ff" : "rgba(255,255,255,0.08)"}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 36, transition: "all 0.3s"
                            }}>
                                {testState.isPulsing ? "🔊" : "🔇"}
                            </div>
                        </div>

                        <div style={{ marginBottom: 8, fontSize: "0.9rem", color: testState.isPulsing ? "#00d4ff" : "#64748b", fontWeight: 600, minHeight: 24 }}>
                            {testState.isPulsing ? "Đang phát âm..." : "Chờ phát âm tiếp theo..."}
                        </div>

                        {/* HEAR BUTTON */}
                        <button onClick={onHear}
                            style={{
                                width: "100%", maxWidth: 400, padding: "20px 32px",
                                background: "linear-gradient(135deg,#10b981,#059669)",
                                border: "none", borderRadius: 20, color: "#fff",
                                fontSize: "1.15rem", fontWeight: 800, cursor: "pointer",
                                boxShadow: "0 8px 25px rgba(16,185,129,0.3)",
                                animation: testState.isPulsing ? "pulse-hear 2s infinite" : "none",
                                transition: "all 0.2s", marginBottom: 16,
                            }}>
                            ✋ TÔI NGHE THẤY
                        </button>

                        <p style={{ fontSize: "0.78rem", color: "#475569" }}>
                            Nếu không nghe thấy gì, không cần nhấn. Hệ thống sẽ tự động tiếp tục.
                        </p>

                        <button className="btn-outline" onClick={restartTest} style={{ marginTop: 16, fontSize: "0.8rem", padding: "8px 20px" }}>
                            ✕ Dừng kiểm tra
                        </button>
                    </div>
                )}

                {/* ══════ SCREEN: EAR SWITCH ══════ */}
                {screen === SCREENS.EAR_SWITCH && (
                    <div className="fade-in" style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 64, marginBottom: 16 }}>👈</div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 12 }}>Chuyển sang Tai Trái</h2>
                        <p style={{ color: "#94a3b8", marginBottom: 8 }}>Tai phải đã hoàn tất!</p>
                        <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: 32 }}>
                            Đảm bảo tai nghe bên trái đang đeo đúng. Nhấn tiếp tục khi sẵn sàng.
                        </p>
                        <button className="btn-primary" onClick={onResumeEar}>
                            ▶ Tiếp Tục — Tai Trái
                        </button>
                    </div>
                )}

                {/* ══════ SCREEN: RESULTS ══════ */}
                {screen === SCREENS.RESULTS && results && (
                    <ResultsScreen results={results} user={user} onRestart={restartTest} />
                )}
            </main>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   RESULTS SCREEN (separate component for clarity)
   ═══════════════════════════════════════════════════ */
function ResultsScreen({ results, user, onRestart }) {
    const canvasRef = useRef(null);
    const [ageGroup, setAgeGroup] = useState(null);
    const ev = evaluate(results);
    const warnings = getWarnings(results);
    const comms = getCommAssessment(results);
    const recs = getRecommendations(results);

    // Draw audiogram on mount
    useEffect(() => {
        if (canvasRef.current) drawAudiogram(canvasRef.current, results);
        const handleResize = () => { if (canvasRef.current) drawAudiogram(canvasRef.current, results); };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [results]);

    return (
        <div className="fade-in">
            <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>{ev.overallLevel.emoji}</div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 8 }}>Kết Quả Kiểm Tra</h2>
                <div style={{
                    display: "inline-block", padding: "6px 18px",
                    background: ev.overallLevel.bg, border: `1px solid ${ev.overallLevel.color}40`,
                    borderRadius: 30, color: ev.overallLevel.color, fontWeight: 700
                }}>
                    {ev.overallLevel.label}
                </div>
            </div>

            {/* PTA Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                {[{ ear: "Tai Phải", pta: ev.rightPTA, level: ev.rightLevel, icon: "👉" },
                { ear: "Tai Trái", pta: ev.leftPTA, level: ev.leftLevel, icon: "👈" }].map((e, i) => (
                    <div key={i} className="g" style={{ padding: 20, textAlign: "center" }}>
                        <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 4 }}>{e.icon} {e.ear}</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: e.level.color }}>{e.pta}<span style={{ fontSize: "0.9rem" }}> dB</span></div>
                        <div style={{ fontSize: "0.82rem", color: e.level.color, fontWeight: 600 }}>{e.level.label}</div>
                    </div>
                ))}
            </div>

            {/* Age-norm comparison */}
            <div className="g" style={{ padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>📈 So sánh theo độ tuổi</h3>
                <select
                    value={ageGroup ?? ""}
                    onChange={e => setAgeGroup(e.target.value === "" ? null : Number(e.target.value))}
                    style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8ecf4", fontSize: "0.85rem", fontFamily: "inherit", cursor: "pointer", marginBottom: 12 }}>
                    <option value="">— Chọn độ tuổi của bạn —</option>
                    {AGE_NORMS.map((n, i) => <option key={i} value={i}>{n.label} — {n.note}</option>)}
                </select>
                {ageGroup !== null && (() => {
                    const norm = AGE_NORMS[ageGroup];
                    const pta = ev.worsePTA;
                    const above = pta > norm.normal;
                    const diffFromMedian = pta - norm.median;
                    return (
                        <div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                                    <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: 2 }}>Trung vị nhóm tuổi</div>
                                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#94a3b8" }}>{norm.median} <span style={{ fontSize: "0.75rem" }}>dB</span></div>
                                </div>
                                <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
                                    <div style={{ fontSize: "0.72rem", color: "#64748b", marginBottom: 2 }}>Ngưỡng bình thường</div>
                                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#94a3b8" }}>&lt;{norm.normal} <span style={{ fontSize: "0.75rem" }}>dB</span></div>
                                </div>
                            </div>
                            {/* Bar */}
                            <div style={{ position: "relative", height: 14, background: "rgba(255,255,255,0.04)", borderRadius: 7, overflow: "hidden", marginBottom: 8 }}>
                                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${(norm.normal / 120) * 100}%`, background: "rgba(16,185,129,0.15)", borderRight: "2px dashed #10b981" }} />
                                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${Math.min((pta / 120) * 100, 100)}%`, background: above ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "#10b981", borderRadius: 7, transition: "width 0.5s ease" }} />
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#475569", marginBottom: 10 }}>
                                <span>0 dB</span>
                                <span style={{ color: "#10b981" }}>Bình thường &lt;{norm.normal} dB</span>
                                <span>120 dB</span>
                            </div>
                            <div style={{ padding: "8px 12px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 600, background: above ? "rgba(239,68,68,0.07)" : "rgba(16,185,129,0.07)", border: `1px solid ${above ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`, color: above ? "#ef4444" : "#10b981" }}>
                                {above
                                    ? `PTA của bạn (${pta} dB) cao hơn ${pta - norm.normal} dB so với ngưỡng bình thường nhóm ${norm.label}`
                                    : `PTA của bạn (${pta} dB) trong ngưỡng bình thường nhóm ${norm.label}${diffFromMedian > 5 ? ` · cao hơn trung vị ${diffFromMedian} dB` : ""}`
                                }
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Audiogram */}
            <div className="g" style={{ padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12, textAlign: "center" }}>📊 Thính Lực Đồ (Audiogram)</h3>
                <div style={{ background: "#fdfdfd", borderRadius: 12, overflow: "hidden" }}>
                    <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 10, fontSize: "0.78rem" }}>
                    <span><span style={{ color: "#ef4444", fontWeight: 700 }}>O ─</span> Tai Phải</span>
                    <span><span style={{ color: "#3b82f6", fontWeight: 700 }}>X ─</span> Tai Trái</span>
                </div>
            </div>

            {/* Frequency detail table */}
            <div className="g" style={{ padding: 20, marginBottom: 20, overflowX: "auto" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>📋 Chi tiết từng tần số</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                            <th style={{ padding: 8, textAlign: "left", color: "#64748b" }}>Hz</th>
                            {TEST_FREQS.sort((a, b) => a - b).map(f => (
                                <th key={f} style={{ padding: 8, textAlign: "center", color: "#94a3b8" }}>
                                    {f >= 1000 ? (f / 1000) + "k" : f}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {EARS.map(ear => (
                            <tr key={ear} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <td style={{ padding: 8, fontWeight: 600, color: ear === "right" ? "#ef4444" : "#3b82f6" }}>
                                    {ear === "right" ? "👉 Phải" : "👈 Trái"}
                                </td>
                                {TEST_FREQS.sort((a, b) => a - b).map(f => {
                                    const val = results[ear][f];
                                    const sev = classify(val || 0);
                                    return (
                                        <td key={f} style={{ padding: 8, textAlign: "center", color: sev.color, fontWeight: 700 }}>
                                            {val !== undefined ? val + " dB" : "—"}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Clinical warnings */}
            <div className="g" style={{ padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>🩺 Nhận xét lâm sàng</h3>
                {warnings.map((w, i) => (
                    <div key={i} style={{
                        padding: "10px 14px", marginBottom: 8, borderRadius: 12, fontSize: "0.85rem",
                        background: w.type === "alert" ? "rgba(239,68,68,0.06)" : w.type === "caution" ? "rgba(245,158,11,0.06)" : "rgba(16,185,129,0.06)",
                        border: `1px solid ${w.type === "alert" ? "rgba(239,68,68,0.15)" : w.type === "caution" ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)"}`,
                        color: "#e8ecf4"
                    }}>
                        {w.type === "alert" ? "⚠️ " : w.type === "caution" ? "📉 " : "✅ "}{w.text}
                    </div>
                ))}
            </div>

            {/* Communication assessment */}
            <div className="g" style={{ padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>🗣️ Đánh giá khả năng giao tiếp</h3>
                <div style={{ display: "grid", gap: 8 }}>
                    {comms.map((c, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
                            <span style={{ fontSize: 20 }}>{c.icon}</span>
                            <span style={{ flex: 1, fontSize: "0.85rem" }}>{c.label}</span>
                            <span style={{
                                fontSize: "0.78rem", fontWeight: 700, padding: "3px 10px", borderRadius: 8,
                                background: c.status === "ok" ? "rgba(16,185,129,0.1)" : c.status === "warn" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                                color: c.status === "ok" ? "#10b981" : c.status === "warn" ? "#f59e0b" : "#ef4444",
                            }}>
                                {c.text}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Smart Recommendations */}
            <div className="g" style={{ padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 12 }}>💡 Khuyến nghị dành cho bạn</h3>
                <div style={{ display: "grid", gap: 10 }}>
                    {recs.map((r, i) => (
                        <div key={i} style={{
                            display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px",
                            borderRadius: 12,
                            background: r.priority === "urgent" ? "rgba(239,68,68,0.06)" : r.priority === "high" ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${r.priority === "urgent" ? "rgba(239,68,68,0.15)" : r.priority === "high" ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.06)"}`,
                        }}>
                            <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1.2 }}>{r.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#e8ecf4", marginBottom: 3 }}>{r.title}</div>
                                <div style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.6 }}>{r.text}</div>
                                {r.link && (
                                    <a href={r.link} style={{
                                        display: "inline-block", marginTop: 6, padding: "4px 12px",
                                        background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)",
                                        borderRadius: 6, fontSize: "0.75rem", color: "#00d4ff", textDecoration: "none", fontWeight: 600,
                                    }}>
                                        Thử ngay →
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div style={{ textAlign: "center", marginTop: 8 }}>
                <a href={`/booking?from=hearing-test${ev?.resultId ? `&resultId=${ev.resultId}` : ""}`}
                    className="btn-primary"
                    style={{ textDecoration: "none", display: "inline-block", marginBottom: 12, padding: "16px 36px", fontSize: "1.05rem" }}>
                    📅 Đặt Lịch Hẹn Miễn Phí
                </a>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <a href="/hearing-aid-simulator" className="btn-outline" style={{ textDecoration: "none", display: "inline-block" }}>
                        🦻 Thử Máy Trợ Thính
                    </a>
                    <button className="btn-outline" onClick={onRestart}>🔄 Đo Lại</button>
                    {user && <a href="/dashboard" className="btn-outline" style={{ textDecoration: "none" }}>📊 Dashboard</a>}
                    <a href="https://zalo.me/818788000" target="_blank" rel="noopener noreferrer" className="btn-outline">
                        💬 Zalo Tư Vấn
                    </a>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   AUDIOGRAM RENDERER (Canvas)
   ═══════════════════════════════════════════════════ */
function drawAudiogram(canvas, results) {
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.min(container.clientWidth, 760);
    const h = Math.min(w * 0.7, 500);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    const c = canvas.getContext("2d");
    c.scale(dpr, dpr);

    const pad = { top: 50, right: 60, bottom: 25, left: 50 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;
    const freqs = [125, 250, 500, 1000, 2000, 4000, 8000];
    const dbMin = -10, dbMax = 120;

    const fToX = (f) => pad.left + ((Math.log2(f) - Math.log2(100)) / (Math.log2(10000) - Math.log2(100))) * pw;
    const dToY = (d) => pad.top + ((d - dbMin) / (dbMax - dbMin)) * ph;

    // Background
    c.fillStyle = "#fdfdfd";
    c.fillRect(pad.left, pad.top, pw, ph);

    // Severity bands
    const bands = [
        { min: -10, max: 15, color: "rgba(200,240,220,0.35)" },
        { min: 15, max: 25, color: "rgba(210,240,210,0.3)" },
        { min: 25, max: 40, color: "rgba(220,240,200,0.25)" },
        { min: 40, max: 55, color: "rgba(255,240,200,0.25)" },
        { min: 55, max: 70, color: "rgba(255,225,200,0.25)" },
        { min: 70, max: 90, color: "rgba(255,210,210,0.25)" },
        { min: 90, max: 120, color: "rgba(230,210,240,0.25)" },
    ];
    bands.forEach(b => {
        c.fillStyle = b.color;
        c.fillRect(pad.left, dToY(b.min), pw, dToY(b.max) - dToY(b.min));
    });

    // Speech banana
    const top = [[200, 25], [350, 15], [500, 10], [1000, 5], [2000, 8], [3000, 15], [5000, 30]];
    const bot = [[200, 55], [350, 55], [500, 50], [1000, 48], [2000, 50], [3000, 50], [5000, 50]];
    c.beginPath();
    top.forEach((p, i) => { i === 0 ? c.moveTo(fToX(p[0]), dToY(p[1])) : c.lineTo(fToX(p[0]), dToY(p[1])); });
    for (let i = bot.length - 1; i >= 0; i--) c.lineTo(fToX(bot[i][0]), dToY(bot[i][1]));
    c.closePath();
    c.fillStyle = "rgba(255,210,0,0.35)";
    c.fill();
    c.strokeStyle = "rgba(200,160,0,0.5)";
    c.lineWidth = 1;
    c.stroke();
    c.textAlign = "center";
    c.fillStyle = "rgba(180,140,0,0.7)";
    c.font = "bold 10px Inter,sans-serif";
    c.fillText("Vùng lời nói", fToX(700), dToY(32));

    // Grid
    freqs.forEach(f => {
        const x = fToX(f);
        c.strokeStyle = "#ddd";
        c.lineWidth = 0.5;
        c.beginPath(); c.moveTo(x, pad.top); c.lineTo(x, pad.top + ph); c.stroke();
        c.fillStyle = "#0088cc";
        c.font = "bold 10px Inter,sans-serif";
        c.textAlign = "center";
        c.fillText(f >= 1000 ? (f / 1000) + "k" : f, x, pad.top - 8);
    });
    for (let d = 0; d <= 120; d += 10) {
        const y = dToY(d);
        c.strokeStyle = d % 20 === 0 ? "#ccc" : "#eee";
        c.lineWidth = d % 20 === 0 ? 0.6 : 0.3;
        c.beginPath(); c.moveTo(pad.left, y); c.lineTo(pad.left + pw, y); c.stroke();
        if (d % 20 === 0) {
            c.fillStyle = "#666";
            c.font = "9px Inter,sans-serif";
            c.textAlign = "right";
            c.fillText(d, pad.left - 6, y + 3);
        }
    }

    // Axes labels
    c.fillStyle = "#0088cc";
    c.font = "bold 11px Inter,sans-serif";
    c.textAlign = "center";
    c.fillText("Tần số (Hz)", pad.left + pw / 2, pad.top - 25);
    c.save();
    c.translate(12, pad.top + ph / 2);
    c.rotate(-Math.PI / 2);
    c.fillStyle = "#666";
    c.font = "9px Inter,sans-serif";
    c.fillText("Ngưỡng nghe (dB HL)", 0, 0);
    c.restore();

    // Border
    c.strokeStyle = "#aaa";
    c.lineWidth = 1;
    c.strokeRect(pad.left, pad.top, pw, ph);

    // Severity labels on right
    const sevLabels = [
        { text: "Bình thường", db: 5 }, { text: "Nhẹ", db: 33 },
        { text: "Trung bình", db: 48 }, { text: "Nặng", db: 73 }, { text: "Sâu", db: 105 },
    ];
    c.textAlign = "left";
    sevLabels.forEach(l => {
        c.fillStyle = "#0088cc";
        c.font = "bold 9px Inter,sans-serif";
        c.fillText(l.text, pad.left + pw + 6, dToY(l.db) + 3);
    });

    // Draw results
    const testFreqs = [250, 500, 1000, 2000, 4000, 8000];
    const drawEar = (earData, color, symbol) => {
        const pts = [];
        testFreqs.forEach(f => {
            if (earData[f] !== undefined) pts.push({ x: fToX(f), y: dToY(earData[f]), db: earData[f] });
        });
        if (pts.length === 0) return;
        // Line
        c.strokeStyle = color;
        c.lineWidth = 2.5;
        c.lineJoin = "round";
        c.beginPath();
        pts.forEach((p, i) => i === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y));
        c.stroke();
        // Symbols
        pts.forEach(p => {
            if (symbol === "O") {
                c.fillStyle = "#fff";
                c.strokeStyle = color;
                c.lineWidth = 2.5;
                c.beginPath();
                c.arc(p.x, p.y, 9, 0, Math.PI * 2);
                c.fill();
                c.stroke();
                c.fillStyle = color;
                c.font = "bold 10px Inter,sans-serif";
                c.textAlign = "center";
                c.fillText("O", p.x, p.y + 4);
            } else {
                const s = 8;
                c.strokeStyle = color;
                c.lineWidth = 2.5;
                c.beginPath();
                c.moveTo(p.x - s, p.y - s); c.lineTo(p.x + s, p.y + s);
                c.moveTo(p.x + s, p.y - s); c.lineTo(p.x - s, p.y + s);
                c.stroke();
            }
            c.fillStyle = color;
            c.font = "bold 8px Inter,sans-serif";
            c.textAlign = "center";
            c.fillText(p.db + "dB", p.x, p.y - 14);
        });
    };

    drawEar(results.right, "#ef4444", "O");
    drawEar(results.left, "#3b82f6", "X");
}
