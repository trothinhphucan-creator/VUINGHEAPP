"use client";

import { useState, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════
   SOUND METER EMBEDDABLE WIDGET
   Standalone sound level meter for iframe embedding
   ═══════════════════════════════════════════════════ */

const NOISE_LEVELS = [
    { min: 0, max: 30, label: "Yên tĩnh", emoji: "🤫", color: "#10b981" },
    { min: 30, max: 60, label: "Bình thường", emoji: "✓", color: "#3b82f6" },
    { min: 60, max: 85, label: "Ồn", emoji: "🔊", color: "#f59e0b" },
    { min: 85, max: 110, label: "Rất ồn", emoji: "🔔", color: "#f97316" },
    { min: 110, max: 140, label: "Nguy hiểm", emoji: "⚠️", color: "#ef4444" },
];

function getNoiseLevel(db) {
    for (const level of NOISE_LEVELS) {
        if (db >= level.min && db <= level.max) return level;
    }
    return NOISE_LEVELS[NOISE_LEVELS.length - 1];
}

export default function SoundMeterWidget() {
    const [isListening, setIsListening] = useState(false);
    const [currentDb, setCurrentDb] = useState(0);
    const [freqData, setFreqData] = useState(null);
    const [error, setError] = useState(null);

    const audioCtxRef = useRef(null);
    const analyserRef = useRef(null);
    const streamRef = useRef(null);
    const animIdRef = useRef(null);

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
            audioCtxRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 2048;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            analyserRef.current = analyser;

            setIsListening(true);
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
        if (animIdRef.current) {
            cancelAnimationFrame(animIdRef.current);
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
        }
        setIsListening(false);
        setCurrentDb(0);
        setFreqData(null);
    };

    const measureSound = (analyser) => {
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const measure = () => {
            analyser.getByteFrequencyData(dataArray);

            // Calculate RMS from frequency domain
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const normalized = dataArray[i] / 255;
                sum += normalized * normalized;
            }
            const rms = Math.sqrt(sum / dataArray.length);

            // Convert to dB SPL
            const db = Math.max(0, Math.min(130, 20 * Math.log10(Math.max(0.001, rms)) + 94));

            setCurrentDb(Math.round(db * 10) / 10);
            setFreqData(Array.from(dataArray));

            animIdRef.current = requestAnimationFrame(measure);
        };

        measure();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isListening) {
                stopMeter();
            }
        };
    }, []);

    const noiseLevel = getNoiseLevel(currentDb);

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                background: "linear-gradient(135deg,#0a0f1e,#0f1b35)",
                fontFamily: "'Inter',sans-serif",
                color: "#e8ecf4",
                margin: 0,
                padding: 0,
                overflow: "hidden",
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { overflow: hidden; }
                .btn-primary { padding: clamp(10px, 3vw, 14px) clamp(20px, 5vw, 32px); background: linear-gradient(135deg,#00d4ff,#7c3aed); border: none; color: #fff; border-radius: 20px; font-weight: 700; cursor: pointer; transition: all 0.3s; font-size: clamp(0.8rem, 2vw, 1rem); }
                .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,212,255,0.4); }
                .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                @keyframes pulse-meter { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
                .pulse { animation: pulse-meter 0.8s ease-in-out infinite; }
            `}</style>

            {/* Header Strip */}
            <div style={{
                padding: "clamp(8px, 2vw, 16px) clamp(12px, 3vw, 24px)",
                background: "rgba(255,255,255,0.03)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
            }}>
                <div style={{ fontSize: "clamp(0.75rem, 2vw, 0.9rem)", fontWeight: 600, color: "#64748b" }}>
                    📏 Đo Độ Ồn
                </div>
                <a
                    href="https://hearingtest.vuinghe.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        fontSize: "clamp(0.65rem, 1.5vw, 0.75rem)",
                        color: "#00d4ff",
                        textDecoration: "none",
                        fontWeight: 500,
                    }}
                >
                    PAH
                </a>
            </div>

            {/* Main Content */}
            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                padding: "clamp(12px, 4vw, 24px)",
                overflow: "auto",
            }}>
                {/* dB Display */}
                <div style={{
                    textAlign: "center",
                    marginBottom: "clamp(8px, 3vw, 20px)",
                    padding: "clamp(12px, 3vw, 20px)",
                    background: `${getNoiseLevel(currentDb).color}20`,
                    border: `2px solid ${getNoiseLevel(currentDb).color}`,
                    borderRadius: 20,
                    minWidth: "90%",
                    maxWidth: 280,
                }}>
                    <div style={{ fontSize: "clamp(1rem, 2.5vw, 1.2rem)", color: "#94a3b8", marginBottom: 6 }}>
                        Mức độ ồn
                    </div>
                    <div style={{
                        fontSize: "clamp(2.5rem, 8vw, 4rem)",
                        fontWeight: 800,
                        color: noiseLevel.color,
                        marginBottom: 4,
                        lineHeight: 1,
                    }}>
                        {currentDb.toFixed(1)}
                    </div>
                    <div style={{
                        fontSize: "clamp(0.75rem, 2vw, 0.9rem)",
                        color: noiseLevel.color,
                        fontWeight: 700,
                    }}>
                        dB SPL — {noiseLevel.emoji} {noiseLevel.label}
                    </div>
                </div>

                {/* Spectrum Visualizer */}
                {freqData && (
                    <div style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: "clamp(1px, 0.5vw, 2px)",
                        height: "clamp(60px, 15vw, 120px)",
                        width: "90%",
                        maxWidth: 280,
                        background: "rgba(255,255,255,0.02)",
                        padding: "clamp(6px, 1.5vw, 12px)",
                        borderRadius: 12,
                        overflow: "hidden",
                        marginBottom: "clamp(12px, 3vw, 20px)",
                    }}>
                        {freqData.slice(0, 48).map((val, i) => (
                            <div
                                key={i}
                                style={{
                                    flex: 1,
                                    height: `${(val / 255) * 100}%`,
                                    background: `hsl(${(i / 48) * 360}, 100%, 50%)`,
                                    borderRadius: "2px 2px 0 0",
                                    opacity: 0.7,
                                    transition: "height 0.1s linear",
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Control Button */}
                <button
                    className="btn-primary"
                    onClick={isListening ? stopMeter : startMeter}
                    style={{
                        minWidth: "clamp(100px, 30vw, 200px)",
                        marginBottom: "clamp(8px, 2vw, 16px)",
                    }}
                >
                    {isListening ? "⏹️ Dừng" : "🎤 Bắt đầu"}
                </button>

                {/* Listening Indicator */}
                {isListening && (
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: "clamp(0.7rem, 1.5vw, 0.85rem)",
                        color: "#ef4444",
                        fontWeight: 600,
                    }}>
                        <div style={{
                            width: "clamp(6px, 1vw, 10px)",
                            height: "clamp(6px, 1vw, 10px)",
                            borderRadius: "50%",
                            background: "#ef4444",
                            animation: "pulse-meter 0.8s ease-in-out infinite",
                        }} />
                        <span>Đang ghi âm...</span>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div style={{
                        padding: "clamp(8px, 2vw, 12px) clamp(12px, 2.5vw, 16px)",
                        background: "rgba(239,68,68,0.1)",
                        border: "1px solid rgba(239,68,68,0.2)",
                        borderRadius: 12,
                        color: "#ef4444",
                        fontSize: "clamp(0.7rem, 1.5vw, 0.85rem)",
                        textAlign: "center",
                        marginTop: "clamp(8px, 2vw, 12px)",
                        maxWidth: 280,
                    }}>
                        ⚠️ {error}
                    </div>
                )}
            </div>

            {/* Footer Attribution */}
            <div style={{
                padding: "clamp(6px, 1.5vw, 12px)",
                textAlign: "center",
                fontSize: "clamp(0.6rem, 1.2vw, 0.75rem)",
                color: "#64748b",
                borderTop: "1px solid rgba(255,255,255,0.05)",
                flexShrink: 0,
            }}>
                Cung cấp bởi{" "}
                <a
                    href="https://hearingtest.vuinghe.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#00d4ff", textDecoration: "none", fontWeight: 600 }}
                >
                    PAH
                </a>
            </div>
        </div>
    );
}
