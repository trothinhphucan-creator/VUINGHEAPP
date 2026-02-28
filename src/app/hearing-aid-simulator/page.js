"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db, isConfigured } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";

/* ─────────────────────────────────────────────────
   NAL-NL2 & DSL v5 Prescription Algorithms
   ───────────────────────────────────────────────── */

// Standard audiometric frequencies (Hz)
const FREQ_BANDS = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];

// NAL-NL2 simplified prescription: insertion gain per frequency for given hearing loss (dB HL)
// Based on published NAL-NL2 fitting rationale (Keidser et al., 2011)
function calcNAL_NL2(audiogram) {
    const gains = {};
    // NAL-NL2 target gain ≈ 0.46 × HL + frequency-dependent offset
    // Lower frequencies get less gain; higher frequencies get more
    const nalOffsets = {
        250: -8, 500: -5, 1000: 0, 2000: 2,
        3000: 3, 4000: 2, 6000: 0, 8000: -2
    };
    // 3-frequency average (500, 1000, 2000)
    const pta3 = ((audiogram[500] || 0) + (audiogram[1000] || 0) + (audiogram[2000] || 0)) / 3;

    FREQ_BANDS.forEach(freq => {
        const hl = audiogram[freq] || 0;
        if (hl <= 15) {
            gains[freq] = 0; // Normal hearing, no gain needed
        } else {
            // NAL-NL2 core formula (simplified)
            let gain = 0.46 * hl + (nalOffsets[freq] || 0);
            // Reduce gain for severe loss (compression)
            if (hl > 60) gain = gain * 0.85;
            if (hl > 80) gain = gain * 0.75;
            // Level-dependent: less gain for conversational level
            gain = gain * 0.85; // 65 dB SPL input level adjustment
            gains[freq] = Math.round(Math.max(0, Math.min(gain, 60)));
        }
    });
    return gains;
}

// DSL v5.0 prescription: Desired Sensation Level (Scollie et al., 2005)
// Targets mid-level speech at comfortable loudness
function calcDSL_v5(audiogram) {
    const gains = {};
    // DSL v5 generally prescribes more gain than NAL-NL2, especially at low/mid frequencies
    const dslOffsets = {
        250: -3, 500: 0, 1000: 2, 2000: 4,
        3000: 5, 4000: 4, 6000: 2, 8000: 0
    };

    FREQ_BANDS.forEach(freq => {
        const hl = audiogram[freq] || 0;
        if (hl <= 15) {
            gains[freq] = 0;
        } else {
            // DSL v5 targets higher gain than NAL
            let gain = 0.55 * hl + (dslOffsets[freq] || 0);
            // WDRC compression for moderate-severe loss
            if (hl > 50) gain = gain * 0.9;
            if (hl > 70) gain = gain * 0.8;
            gains[freq] = Math.round(Math.max(0, Math.min(gain, 65)));
        }
    });
    return gains;
}

// Default audiogram: mild-moderate high-frequency loss (common presbycusis pattern)
const DEFAULT_AUDIOGRAM = {
    250: 15, 500: 20, 1000: 25, 2000: 40,
    3000: 50, 4000: 55, 6000: 60, 8000: 65
};

const PRESETS = [
    { id: "off", label: "Tắt", desc: "Không xử lý — nghe thẳng qua mic", icon: "🔇", color: "#64748b" },
    { id: "nal", label: "NAL-NL2", desc: "Công thức chuẩn quốc tế cho người lớn", icon: "🦻", color: "#00d4ff" },
    { id: "dsl", label: "DSL v5", desc: "Tối ưu cho trẻ em & nghe kém nặng", icon: "👶", color: "#a855f7" },
    { id: "custom", label: "Tùy chỉnh", desc: "Tự điều chỉnh EQ theo ý bạn", icon: "🎛️", color: "#f59e0b" },
];

/* ─────────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────────── */
export default function HearingAidSimulator() {
    const { user } = useAuth();
    const [activePreset, setActivePreset] = useState("off");
    const [isListening, setIsListening] = useState(false);
    const [micError, setMicError] = useState(null);
    const [audiogram, setAudiogram] = useState(DEFAULT_AUDIOGRAM);
    const [customGains, setCustomGains] = useState({});
    const [prescribedGains, setPrescribedGains] = useState({});
    const [hasUserAudiogram, setHasUserAudiogram] = useState(false);
    const [compressionEnabled, setCompressionEnabled] = useState(true);
    const [masterVolume, setMasterVolume] = useState(80);

    const audioCtxRef = useRef(null);
    const micStreamRef = useRef(null);
    const sourceRef = useRef(null);
    const filtersRef = useRef([]);
    const compressorRef = useRef(null);
    const gainRef = useRef(null);

    // Load latest audiogram from Firestore if user logged in
    useEffect(() => {
        if (!user || !isConfigured || !db) return;
        const loadAudiogram = async () => {
            try {
                const q = query(
                    collection(db, "testResults"),
                    where("uid", "==", user.uid),
                    orderBy("createdAt", "desc"),
                    limit(1)
                );
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    // Use worst ear (higher thresholds)
                    const r = data.results?.right || {};
                    const l = data.results?.left || {};
                    const merged = {};
                    FREQ_BANDS.forEach(f => {
                        const rv = r[f] ?? 999;
                        const lv = l[f] ?? 999;
                        if (rv < 999 || lv < 999) {
                            merged[f] = Math.max(rv < 999 ? rv : 0, lv < 999 ? lv : 0);
                        }
                    });
                    if (Object.keys(merged).length >= 3) {
                        setAudiogram(prev => ({ ...prev, ...merged }));
                        setHasUserAudiogram(true);
                    }
                }
            } catch (e) {
                console.error("Load audiogram error:", e);
            }
        };
        loadAudiogram();
    }, [user]);

    // Recalculate prescribed gains when audiogram or preset changes
    useEffect(() => {
        let gains = {};
        if (activePreset === "nal") {
            gains = calcNAL_NL2(audiogram);
        } else if (activePreset === "dsl") {
            gains = calcDSL_v5(audiogram);
        } else if (activePreset === "custom") {
            gains = { ...customGains };
        }
        setPrescribedGains(gains);

        // Apply to live filters if running
        if (filtersRef.current.length > 0 && audioCtxRef.current) {
            applyGainsToFilters(gains);
        }
    }, [audiogram, activePreset, customGains]);

    const applyGainsToFilters = useCallback((gains) => {
        filtersRef.current.forEach((filter, i) => {
            const freq = FREQ_BANDS[i];
            const gainVal = gains[freq] || 0;
            const ctx = audioCtxRef.current;
            if (ctx) {
                filter.gain.setTargetAtTime(gainVal, ctx.currentTime, 0.05);
            }
        });
        // Master volume
        if (gainRef.current && audioCtxRef.current) {
            gainRef.current.gain.setTargetAtTime(masterVolume / 100, audioCtxRef.current.currentTime, 0.05);
        }
    }, [masterVolume]);

    // Apply master volume changes
    useEffect(() => {
        if (gainRef.current && audioCtxRef.current) {
            gainRef.current.gain.setTargetAtTime(masterVolume / 100, audioCtxRef.current.currentTime, 0.05);
        }
    }, [masterVolume]);

    // Apply compression toggle
    useEffect(() => {
        if (compressorRef.current && audioCtxRef.current) {
            const ctx = audioCtxRef.current;
            if (compressionEnabled) {
                compressorRef.current.threshold.setValueAtTime(-30, ctx.currentTime);
                compressorRef.current.ratio.setValueAtTime(3, ctx.currentTime);
            } else {
                compressorRef.current.threshold.setValueAtTime(0, ctx.currentTime);
                compressorRef.current.ratio.setValueAtTime(1, ctx.currentTime);
            }
        }
    }, [compressionEnabled]);

    const startListening = useCallback(async () => {
        setMicError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 48000
                }
            });
            micStreamRef.current = stream;

            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const ctx = new AudioContext({ sampleRate: 48000 });
            audioCtxRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);
            sourceRef.current = source;

            // Create 8-band parametric EQ (one per audiometric frequency)
            const filters = FREQ_BANDS.map((freq, i) => {
                const filter = ctx.createBiquadFilter();
                filter.type = "peaking";
                filter.frequency.value = freq;
                // Q factor: narrower bands at higher frequencies for precision
                filter.Q.value = freq < 1000 ? 1.5 : 2.0;
                filter.gain.value = 0;
                return filter;
            });
            filtersRef.current = filters;

            // WDRC Compressor (Wide Dynamic Range Compression)
            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.value = compressionEnabled ? -30 : 0;
            compressor.knee.value = 20;
            compressor.ratio.value = compressionEnabled ? 3 : 1;
            compressor.attack.value = 0.005;  // Fast attack for speech
            compressor.release.value = 0.1;   // Moderate release
            compressorRef.current = compressor;

            // Master gain
            const masterGain = ctx.createGain();
            masterGain.gain.value = masterVolume / 100;
            gainRef.current = masterGain;

            // Connect chain: mic → EQ bands → compressor → master gain → speakers
            let lastNode = source;
            filters.forEach(f => {
                lastNode.connect(f);
                lastNode = f;
            });
            lastNode.connect(compressor);
            compressor.connect(masterGain);
            masterGain.connect(ctx.destination);

            // Apply current prescription
            applyGainsToFilters(prescribedGains);

            setIsListening(true);
        } catch (err) {
            console.error("Mic error:", err);
            if (err.name === "NotAllowedError") {
                setMicError("Bạn cần cho phép truy cập microphone để sử dụng tính năng này.");
            } else if (err.name === "NotFoundError") {
                setMicError("Không tìm thấy microphone. Hãy kết nối microphone và thử lại.");
            } else {
                setMicError("Lỗi microphone: " + err.message);
            }
        }
    }, [prescribedGains, applyGainsToFilters, masterVolume, compressionEnabled]);

    const stopListening = useCallback(() => {
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(t => t.stop());
            micStreamRef.current = null;
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }
        filtersRef.current = [];
        compressorRef.current = null;
        gainRef.current = null;
        sourceRef.current = null;
        setIsListening(false);
    }, []);

    const handlePresetChange = (presetId) => {
        setActivePreset(presetId);
        if (presetId === "custom" && Object.keys(customGains).length === 0) {
            // Initialize custom gains from current prescription
            setCustomGains(activePreset === "nal" ? calcNAL_NL2(audiogram) : calcDSL_v5(audiogram));
        }
    };

    const handleCustomGainChange = (freq, value) => {
        setCustomGains(prev => ({ ...prev, [freq]: Number(value) }));
    };

    const handleAudiogramChange = (freq, value) => {
        setAudiogram(prev => ({ ...prev, [freq]: Number(value) }));
    };

    // Get the currently displayed gains
    const displayGains = activePreset === "off" ? {} : prescribedGains;

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0f1e 0%,#0f1b35 50%,#1a0f2e 100%)", fontFamily: "'Inter', sans-serif", color: "#e8ecf4" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                input[type="range"] {
                    -webkit-appearance: none; appearance: none;
                    background: rgba(255,255,255,0.1); border-radius: 8px; height: 6px; outline: none;
                }
                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
                    background: #00d4ff; cursor: pointer; border: 2px solid #0a0f1e;
                    box-shadow: 0 0 8px rgba(0,212,255,0.4);
                }
                .glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; }
                .btn-preset { transition: all 0.25s; cursor: pointer; }
                .btn-preset:hover { transform: translateY(-2px); }
                @keyframes pulse-mic { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 15px rgba(239,68,68,0); } }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>

            {/* Nav */}
            <nav style={{ padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <a href="/" style={{ fontSize: "1.4rem", fontWeight: 800, textDecoration: "none", color: "#fff" }}>PAH<span style={{ color: "#00d4ff" }}>.</span></a>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <a href="/hearing-test" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.85rem" }}>🎧 Đo thính lực</a>
                    <a href="/" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.85rem" }}>← Trang chủ</a>
                </div>
            </nav>

            <main style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 20px 80px" }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 36 }}>
                    <div style={{ display: "inline-block", padding: "5px 14px", background: "rgba(0,212,255,0.1)", color: "#00d4ff", borderRadius: 30, fontSize: "0.8rem", fontWeight: 600, marginBottom: 12 }}>
                        Real-time Processing
                    </div>
                    <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, marginBottom: 12 }}>
                        🦻 Giả Lập Máy Trợ Thính
                    </h1>
                    <p style={{ color: "#94a3b8", fontSize: "0.95rem", maxWidth: 620, margin: "0 auto", lineHeight: 1.6 }}>
                        Thu âm thanh qua micro → xử lý khuếch đại tần số theo thính lực đồ (NAL-NL2 / DSL v5) → phát lại qua tai nghe. <strong style={{ color: "#00d4ff" }}>Đeo tai nghe trước khi bật.</strong>
                    </p>
                </div>

                {/* ── MIC CONTROL ── */}
                <div className="glass" style={{ padding: 28, marginBottom: 20, textAlign: "center" }}>
                    <button
                        onClick={isListening ? stopListening : startListening}
                        style={{
                            width: 80, height: 80, borderRadius: "50%",
                            background: isListening ? "linear-gradient(135deg,#ef4444,#f97316)" : "linear-gradient(135deg,#00d4ff,#7c3aed)",
                            border: "none", color: "#fff", fontSize: 32, cursor: "pointer",
                            animation: isListening ? "pulse-mic 2s infinite" : "none",
                            boxShadow: isListening ? "0 0 30px rgba(239,68,68,0.3)" : "0 0 30px rgba(0,212,255,0.2)",
                            marginBottom: 12, transition: "all 0.3s"
                        }}
                    >
                        {isListening ? "⏹" : "🎤"}
                    </button>
                    <div style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 4 }}>
                        {isListening ? "🔴 Đang nghe — Âm thanh đang được xử lý" : "Nhấn để bật microphone"}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                        {isListening ? "Đeo tai nghe để nghe âm thanh đã khuếch đại" : "Cần cho phép truy cập microphone"}
                    </div>
                    {micError && (
                        <div style={{ marginTop: 12, padding: "10px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#ef4444", fontSize: "0.85rem" }}>
                            ⚠️ {micError}
                        </div>
                    )}
                </div>

                {/* ── LAYOUT: 2 columns ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

                    {/* LEFT: Prescription + Audiogram */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        {/* Prescription presets */}
                        <div className="glass" style={{ padding: 24 }}>
                            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 14 }}>📋 Công thức khuếch đại</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                {PRESETS.map(p => (
                                    <button key={p.id} className="btn-preset"
                                        onClick={() => handlePresetChange(p.id)}
                                        style={{
                                            padding: "14px 12px", textAlign: "left",
                                            background: activePreset === p.id ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.015)",
                                            border: `1.5px solid ${activePreset === p.id ? p.color : "rgba(255,255,255,0.05)"}`,
                                            borderRadius: 14, position: "relative", overflow: "hidden"
                                        }}>
                                        {activePreset === p.id && <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: p.color }} />}
                                        <div style={{ fontSize: 22, marginBottom: 6 }}>{p.icon}</div>
                                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: activePreset === p.id ? "#fff" : "#94a3b8" }}>{p.label}</div>
                                        <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 2 }}>{p.desc}</div>
                                    </button>
                                ))}
                            </div>
                            {/* Compression toggle */}
                            <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                                <div>
                                    <div style={{ fontSize: "0.82rem", fontWeight: 600 }}>WDRC Compression</div>
                                    <div style={{ fontSize: "0.7rem", color: "#64748b" }}>Nén dải động rộng</div>
                                </div>
                                <label style={{ position: "relative", width: 44, height: 24, cursor: "pointer" }}>
                                    <input type="checkbox" checked={compressionEnabled} onChange={e => setCompressionEnabled(e.target.checked)}
                                        style={{ opacity: 0, width: 0, height: 0 }} />
                                    <span style={{
                                        position: "absolute", inset: 0, background: compressionEnabled ? "#00d4ff" : "rgba(255,255,255,0.15)",
                                        borderRadius: 12, transition: "0.3s"
                                    }}>
                                        <span style={{
                                            position: "absolute", top: 3, left: compressionEnabled ? 23 : 3,
                                            width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "0.3s"
                                        }} />
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Audiogram input */}
                        <div className="glass" style={{ padding: 24 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                                <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>📊 Thính lực đồ (dB HL)</h3>
                                {hasUserAudiogram && (
                                    <span style={{ fontSize: "0.7rem", padding: "3px 8px", background: "rgba(16,185,129,0.15)", color: "#10b981", borderRadius: 8, fontWeight: 600 }}>
                                        ✓ Từ kết quả đo
                                    </span>
                                )}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                                {FREQ_BANDS.map(freq => (
                                    <div key={freq} style={{ textAlign: "center" }}>
                                        <label style={{ fontSize: "0.7rem", color: "#64748b", display: "block", marginBottom: 4 }}>
                                            {freq >= 1000 ? (freq / 1000) + "k" : freq}
                                        </label>
                                        <input
                                            type="number" min="0" max="120" step="5"
                                            value={audiogram[freq] || 0}
                                            onChange={e => handleAudiogramChange(freq, e.target.value)}
                                            style={{
                                                width: "100%", padding: "8px 4px", textAlign: "center",
                                                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                                                borderRadius: 8, color: "#e8ecf4", fontSize: "0.85rem", outline: "none"
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                            {!user && (
                                <div style={{ marginTop: 10, fontSize: "0.75rem", color: "#64748b", textAlign: "center" }}>
                                    💡 <a href="/hearing-test" style={{ color: "#00d4ff", textDecoration: "none" }}>Đo thính lực</a> rồi đăng nhập để tự động nạp kết quả
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: EQ Visualizer + Volume */}
                    <div className="glass" style={{ padding: 24 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>🎛️ Equalizer — Mức khuếch đại (dB)</h3>
                            <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                                {activePreset === "off" ? "Không xử lý" : activePreset === "custom" ? "Tùy chỉnh" : activePreset.toUpperCase()}
                            </span>
                        </div>

                        {/* EQ sliders — vertical bar chart style */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: 220, padding: "0 8px", marginBottom: 20, position: "relative" }}>
                            {/* Grid lines */}
                            {[0, 15, 30, 45, 60].map(v => (
                                <div key={v} style={{
                                    position: "absolute", left: 0, right: 0,
                                    bottom: `${(v / 60) * 100}%`,
                                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                                    fontSize: "0.6rem", color: "#475569", paddingLeft: 2
                                }}>
                                    {v > 0 && <span style={{ position: "absolute", top: -8, left: -2 }}>{v}</span>}
                                </div>
                            ))}
                            {FREQ_BANDS.map((freq, i) => {
                                const gain = displayGains[freq] || 0;
                                const barHeight = Math.max(2, (gain / 60) * 100);
                                const barColor = gain === 0 ? "rgba(255,255,255,0.1)"
                                    : activePreset === "nal" ? "#00d4ff"
                                        : activePreset === "dsl" ? "#a855f7"
                                            : "#f59e0b";
                                return (
                                    <div key={freq} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, position: "relative", zIndex: 2 }}>
                                        {/* Gain value */}
                                        <div style={{ fontSize: "0.65rem", color: gain > 0 ? "#fff" : "#475569", fontWeight: 700, marginBottom: 4 }}>
                                            {gain > 0 ? `+${gain}` : "0"}
                                        </div>
                                        {/* Bar */}
                                        <div style={{
                                            width: "60%", maxWidth: 36,
                                            height: `${barHeight}%`, minHeight: 4,
                                            background: `linear-gradient(to top, ${barColor}, ${barColor}88)`,
                                            borderRadius: "6px 6px 2px 2px",
                                            transition: "height 0.4s ease, background 0.3s",
                                            boxShadow: gain > 0 ? `0 0 12px ${barColor}40` : "none"
                                        }} />
                                        {/* Freq label */}
                                        <div style={{ fontSize: "0.62rem", color: "#64748b", marginTop: 6, whiteSpace: "nowrap" }}>
                                            {freq >= 1000 ? (freq / 1000) + "k" : freq}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Custom sliders (only in custom mode) */}
                        {activePreset === "custom" && (
                            <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
                                <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginBottom: 12 }}>Kéo thanh trượt để điều chỉnh:</div>
                                {FREQ_BANDS.map(freq => (
                                    <div key={freq} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                        <span style={{ width: 36, fontSize: "0.72rem", color: "#64748b", textAlign: "right" }}>
                                            {freq >= 1000 ? (freq / 1000) + "k" : freq}
                                        </span>
                                        <input type="range" min="0" max="60" step="1"
                                            value={customGains[freq] || 0}
                                            onChange={e => handleCustomGainChange(freq, e.target.value)}
                                            style={{ flex: 1 }}
                                        />
                                        <span style={{ width: 32, fontSize: "0.72rem", color: "#f59e0b", fontWeight: 700, textAlign: "right" }}>
                                            +{customGains[freq] || 0}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Master volume */}
                        <div style={{ marginTop: 16, padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                <span style={{ fontSize: "0.82rem", fontWeight: 600 }}>🔊 Âm lượng tổng</span>
                                <span style={{ fontSize: "0.82rem", color: "#00d4ff", fontWeight: 700 }}>{masterVolume}%</span>
                            </div>
                            <input type="range" min="0" max="150" step="5"
                                value={masterVolume}
                                onChange={e => setMasterVolume(Number(e.target.value))}
                                style={{ width: "100%" }}
                            />
                            {masterVolume > 100 && (
                                <div style={{ fontSize: "0.7rem", color: "#f97316", marginTop: 4 }}>⚠️ Âm lượng &gt;100% có thể gây hú (feedback)</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── COMPARISON TABLE ── */}
                <div className="glass" style={{ padding: 24, marginTop: 20 }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 14 }}>📖 So sánh NAL-NL2 vs DSL v5</h3>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                    <th style={{ padding: "8px 12px", textAlign: "left", color: "#64748b" }}>Tiêu chí</th>
                                    <th style={{ padding: "8px 12px", textAlign: "left", color: "#00d4ff" }}>NAL-NL2</th>
                                    <th style={{ padding: "8px 12px", textAlign: "left", color: "#a855f7" }}>DSL v5</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ["Đối tượng", "Người lớn", "Trẻ em & người lớn"],
                                    ["Mức khuếch đại", "Vừa phải — ưu tiên thoải mái", "Cao hơn — ưu tiên nghe rõ"],
                                    ["Tần số thấp", "Giảm gain (chống ồn)", "Giữ gain cao hơn"],
                                    ["Nén âm", "Nhẹ hơn", "Mạnh hơn (WDRC)"],
                                    ["Xuất xứ", "NAL, Australia", "UWO, Canada"],
                                ].map(([label, nal, dsl], i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{label}</td>
                                        <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{nal}</td>
                                        <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{dsl}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* CTA */}
                <div style={{ marginTop: 28, textAlign: "center" }}>
                    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                        <a href="/hearing-test" style={{
                            display: "inline-block", padding: "14px 32px",
                            background: "linear-gradient(135deg,#00d4ff,#7c3aed)",
                            color: "#fff", textDecoration: "none", borderRadius: 30,
                            fontWeight: 700, boxShadow: "0 8px 20px rgba(0,212,255,0.25)"
                        }}>🎧 Đo Thính Lực Chính Xác</a>
                        <a href="https://zalo.me/818788000" target="_blank" rel="noopener noreferrer" style={{
                            display: "inline-block", padding: "14px 32px",
                            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)",
                            color: "#e8ecf4", textDecoration: "none", borderRadius: 30, fontWeight: 600
                        }}>💬 Tư Vấn Chuyên Gia</a>
                    </div>
                </div>
            </main>
        </div>
    );
}
