"use client";

import { useState, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════
   SOUND LEVEL METER PAGE
   Real-time dB SPL meter with frequency spectrum
   ═══════════════════════════════════════════════════ */

// Noise level classifications (Vietnamese)
const NOISE_LEVELS = [
    { min: 0, max: 30, label: "Yên tĩnh", emoji: "🤫", bg: "rgba(16,185,129,0.1)", color: "#10b981" },
    { min: 30, max: 60, label: "Bình thường", emoji: "✓", bg: "rgba(59,130,246,0.1)", color: "#3b82f6" },
    { min: 60, max: 85, label: "Ồn", emoji: "🔊", bg: "rgba(245,158,11,0.1)", color: "#f59e0b" },
    { min: 85, max: 110, label: "Rất ồn", emoji: "🔔", bg: "rgba(249,115,22,0.1)", color: "#f97316" },
    { min: 110, max: 140, label: "Nguy hiểm", emoji: "⚠️", bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
];

// Reference noise levels
const REFERENCE_SOUNDS = [
    { db: 10, sound: "Thì thầm", icon: "👂" },
    { db: 30, sound: "Yên tĩnh trong nhà", icon: "🏠" },
    { db: 50, sound: "Cuộc trò chuyện bình thường", icon: "🗣️" },
    { db: 60, sound: "Máy hút bụi", icon: "🧹" },
    { db: 70, sound: "Xe ô tô đang chạy", icon: "🚗" },
    { db: 80, sound: "Loa ngoài nghe nhạc", icon: "🔊" },
    { db: 85, sound: "Giao thông cao tốc", icon: "🛣️" },
    { db: 95, sound: "Buồng máy bay cạnh động cơ", icon: "✈️" },
    { db: 110, sound: "Âm thanh từ máy cắt cỏ", icon: "⚙️" },
    { db: 130, sound: "Sấm sét gần", icon: "⚡" },
];

function getNoiseLevel(db) {
    for (const level of NOISE_LEVELS) {
        if (db >= level.min && db <= level.max) return level;
    }
    return NOISE_LEVELS[NOISE_LEVELS.length - 1];
}

export default function SoundLevelMeterPage() {
    const [isListening, setIsListening] = useState(false);
    const [currentDb, setCurrentDb] = useState(0);
    const [minDb, setMinDb] = useState(null);
    const [maxDb, setMaxDb] = useState(null);
    const [avgDb, setAvgDb] = useState(0);
    const [freqData, setFreqData] = useState(null);
    const [error, setError] = useState(null);

    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const streamRef = useRef(null);
    const animationIdRef = useRef(null);
    const dbHistoryRef = useRef([]);

    const startMeter = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });
            streamRef.current = stream;

            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            audioContextRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            analyserRef.current = analyser;

            setIsListening(true);
            dbHistoryRef.current = [];
            setMinDb(null);
            setMaxDb(null);
            setAvgDb(0);

            measureSound(analyser);
        } catch (err) {
            if (err.name === "NotAllowedError") {
                setError("Bạn cần cấp quyền truy cập microphone.");
            } else if (err.name === "NotFoundError") {
                setError("Không tìm thấy microphone trên thiết bị này.");
            } else {
                setError("Lỗi: " + err.message);
            }
        }
    };

    const stopMeter = () => {
        if (animationIdRef.current) {
            cancelAnimationFrame(animationIdRef.current);
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
        setIsListening(false);
        setCurrentDb(0);
        setFreqData(null);
    };

    const measureSound = (analyser) => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const measure = () => {
            analyser.getByteFrequencyData(dataArray);

            // Calculate RMS (Root Mean Square) from frequency domain
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const normalized = dataArray[i] / 255;
                sum += normalized * normalized;
            }
            const rms = Math.sqrt(sum / dataArray.length);

            // Convert to dB SPL (approximate: -20 * log10(threshold) + 20 * log10(RMS))
            // Typical threshold ~20µPa, adjusted for browser audio context
            const db = Math.max(0, Math.min(130, 20 * Math.log10(Math.max(0.001, rms)) + 94));

            setCurrentDb(Math.round(db * 10) / 10);
            setFreqData(Array.from(dataArray));

            // Track min/max/avg
            dbHistoryRef.current.push(db);
            if (dbHistoryRef.current.length > 100) {
                dbHistoryRef.current.shift();
            }

            const newMin = Math.min(...dbHistoryRef.current);
            const newMax = Math.max(...dbHistoryRef.current);
            const newAvg =
                dbHistoryRef.current.reduce((a, b) => a + b, 0) / dbHistoryRef.current.length;

            setMinDb(Math.round(newMin * 10) / 10);
            setMaxDb(Math.round(newMax * 10) / 10);
            setAvgDb(Math.round(newAvg * 10) / 10);

            animationIdRef.current = requestAnimationFrame(measure);
        };

        measure();
    };

    const noiseLevel = getNoiseLevel(currentDb);

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "linear-gradient(135deg,#0a0f1e,#0f1b35)",
                fontFamily: "'Inter',sans-serif",
                color: "#e8ecf4",
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                .g { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; }
                .btn-primary { padding: 14px 32px; background: linear-gradient(135deg,#00d4ff,#7c3aed); border: none; color: #fff; border-radius: 20px; font-weight: 700; cursor: pointer; transition: all 0.3s; }
                .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,212,255,0.4); }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-outline { padding: 10px 20px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #e8ecf4; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
                .btn-outline:hover { background: rgba(255,255,255,0.1); }
                @keyframes pulse-meter { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
                .pulse { animation: pulse-meter 1s ease-in-out infinite; }
            `}</style>

            {/* Nav */}
            <nav style={{ padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <a href="/" style={{ fontSize: "1.4rem", fontWeight: 800, textDecoration: "none", color: "#fff" }}>
                    PAH<span style={{ color: "#00d4ff" }}>.</span>
                </a>
                <a href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.82rem" }}>
                    ← Trang chủ
                </a>
            </nav>

            <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px 80px" }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 40 }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>📏</div>
                    <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", fontWeight: 800, marginBottom: 8 }}>
                        Đo Độ Ồn (Sound Level Meter)
                    </h1>
                    <p style={{ color: "#94a3b8", fontSize: "0.95rem", maxWidth: 600, margin: "0 auto" }}>
                        Đo độ ồn của không gian xung quanh với độ chính xác cao. Giúp bạn nhận thức môi trường tiếng ồn để bảo vệ thính giác.
                    </p>
                </div>

                {/* Main Meter */}
                <div className="g" style={{ padding: 40, marginBottom: 32, textAlign: "center" }}>
                    {/* Large dB Display */}
                    <div
                        style={{
                            marginBottom: 24,
                            padding: 24,
                            background: noiseLevel.bg,
                            border: `2px solid ${noiseLevel.color}`,
                            borderRadius: 20,
                        }}
                    >
                        <div style={{ fontSize: "0.9rem", color: "#94a3b8", marginBottom: 8 }}>
                            Mức độ ồn hiện tại
                        </div>
                        <div style={{ fontSize: "5rem", fontWeight: 800, color: noiseLevel.color, marginBottom: 8, lineHeight: 1 }}>
                            {currentDb.toFixed(1)}
                        </div>
                        <div style={{ fontSize: "1rem", color: noiseLevel.color, fontWeight: 700 }}>
                            dB SPL — {noiseLevel.emoji} {noiseLevel.label}
                        </div>
                    </div>

                    {/* Control Buttons */}
                    <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24, flexWrap: "wrap" }}>
                        <button
                            className="btn-primary"
                            onClick={startMeter}
                            disabled={isListening}
                            style={{ opacity: isListening ? 0.5 : 1 }}
                        >
                            🎤 Bắt Đầu Đo
                        </button>
                        <button
                            className="btn-outline"
                            onClick={stopMeter}
                            disabled={!isListening}
                            style={{ opacity: !isListening ? 0.5 : 1, color: isListening ? "#ef4444" : "#e8ecf4" }}
                        >
                            ⏹️ Dừng Đo
                        </button>
                    </div>

                    {error && (
                        <div style={{
                            padding: "12px 16px",
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.2)",
                            borderRadius: 12,
                            color: "#ef4444",
                            fontSize: "0.85rem",
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Status */}
                    {isListening && (
                        <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <div style={{
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                background: "#ef4444",
                                animation: "pulse-meter 0.8s ease-in-out infinite",
                            }} />
                            <span style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: 600 }}>Đang ghi âm...</span>
                        </div>
                    )}
                </div>

                {/* Spectrum Visualizer */}
                {freqData && (
                    <div className="g" style={{ padding: 24, marginBottom: 32 }}>
                        <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 16 }}>
                            📊 Phổ Tần Số Thực Thời
                        </h3>
                        <div style={{
                            display: "flex",
                            alignItems: "flex-end",
                            gap: 2,
                            height: 120,
                            background: "rgba(255,255,255,0.02)",
                            padding: 12,
                            borderRadius: 12,
                            overflow: "hidden",
                        }}>
                            {freqData.slice(0, 64).map((val, i) => (
                                <div
                                    key={i}
                                    style={{
                                        flex: 1,
                                        height: `${(val / 255) * 100}%`,
                                        background: `hsl(${(i / 64) * 360}, 100%, 50%)`,
                                        borderRadius: "2px 2px 0 0",
                                        opacity: 0.7,
                                        transition: "height 0.1s linear",
                                    }}
                                />
                            ))}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 8, textAlign: "center" }}>
                            Trầm ← | → Cao
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                {isListening && minDb !== null && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 32 }}>
                        {[
                            { label: "Thấp nhất", value: minDb, emoji: "📉" },
                            { label: "Cao nhất", value: maxDb, emoji: "📈" },
                            { label: "Trung bình", value: avgDb, emoji: "📊" },
                        ].map((stat, i) => (
                            <div key={i} className="g" style={{ padding: 16, textAlign: "center" }}>
                                <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>{stat.emoji}</div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 4 }}>{stat.label}</div>
                                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#00d4ff" }}>
                                    {stat.value} <span style={{ fontSize: "0.8rem" }}>dB</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Reference Chart */}
                <div className="g" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 16 }}>
                        📋 Bảng Tham Chiếu Mức Độ Ồn
                    </h3>
                    <div style={{ display: "grid", gap: 10 }}>
                        {REFERENCE_SOUNDS.map((ref, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10 }}>
                                <span style={{ fontSize: "1.2rem" }}>{ref.icon}</span>
                                <span style={{ flex: 1, fontSize: "0.85rem", color: "#e8ecf4" }}>{ref.sound}</span>
                                <div style={{
                                    padding: "4px 12px",
                                    background: "rgba(0,212,255,0.1)",
                                    border: "1px solid rgba(0,212,255,0.2)",
                                    borderRadius: 8,
                                    fontSize: "0.78rem",
                                    fontWeight: 700,
                                    color: "#00d4ff",
                                }}>
                                    {ref.db} dB
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{
                        marginTop: 16,
                        padding: "12px 14px",
                        background: "rgba(16,185,129,0.1)",
                        border: "1px solid rgba(16,185,129,0.2)",
                        borderRadius: 10,
                        fontSize: "0.82rem",
                        color: "#10b981",
                        lineHeight: 1.6,
                    }}>
                        💡 <strong>Lưu ý:</strong> Mức độ ồn trên 85 dB kéo dài có thể gây tổn thương thính giác. Sử dụng bảo vệ tai trong môi trường ồn.
                    </div>
                </div>
            </main>
        </div>
    );
}
