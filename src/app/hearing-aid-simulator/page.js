"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db, isConfigured } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { trackSimulatorUsed } from "@/lib/analytics";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS & PURE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const FREQ_BANDS = [250, 500, 1000, 2000, 3000, 4000, 6000, 8000];

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

// NAL-NL2 Prescription (cleaned up: removed dead pta3 variable)
function calcNAL_NL2(audiogram) {
  const nalOffsets = {
    250: -8, 500: -5, 1000: 0, 2000: 2,
    3000: 3, 4000: 2, 6000: 0, 8000: -2
  };
  const gains = {};
  FREQ_BANDS.forEach(freq => {
    const hl = audiogram[freq] || 0;
    if (hl <= 15) {
      gains[freq] = 0;
    } else {
      let gain = 0.46 * hl + (nalOffsets[freq] || 0);
      if (hl > 60) gain *= 0.85;
      if (hl > 80) gain *= 0.75;
      gain *= 0.85; // 65 dB SPL input level adjustment
      gains[freq] = Math.round(Math.max(0, Math.min(gain, 60)));
    }
  });
  return gains;
}

// DSL v5 Prescription
function calcDSL_v5(audiogram) {
  const dslOffsets = {
    250: -3, 500: 0, 1000: 2, 2000: 4,
    3000: 5, 4000: 4, 6000: 2, 8000: 0
  };
  const gains = {};
  FREQ_BANDS.forEach(freq => {
    const hl = audiogram[freq] || 0;
    if (hl <= 15) {
      gains[freq] = 0;
    } else {
      let gain = 0.55 * hl + (dslOffsets[freq] || 0);
      if (hl > 50) gain *= 0.9;
      if (hl > 70) gain *= 0.8;
      gains[freq] = Math.round(Math.max(0, Math.min(gain, 60)));
    }
  });
  return gains;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function HearingAidSimulator() {
  const { user } = useAuth();

  // ─── UI FLOW ───
  const [headphoneWarningDismissed, setHeadphoneWarningDismissed] = useState(false);

  // ─── AUDIO STATE ───
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState(null);

  // ─── FITTING STATE ───
  const [activePreset, setActivePreset] = useState("off");
  const [audiogram, setAudiogram] = useState(DEFAULT_AUDIOGRAM);
  const [hasUserAudiogram, setHasUserAudiogram] = useState(false);
  const [customGains, setCustomGains] = useState(
    Object.fromEntries(FREQ_BANDS.map(f => [f, 0]))
  );

  // ─── WDRC STATE (NEW) ───
  const [compressionEnabled, setCompressionEnabled] = useState(true);
  const [wdrcThreshold, setWdrcThreshold] = useState(-30);
  const [wdrcRatio, setWdrcRatio] = useState(3);
  const [wdrcAttack, setWdrcAttack] = useState(0.005);
  const [wdrcRelease, setWdrcRelease] = useState(0.1);

  // ─── MASTER VOLUME ───
  const [masterVolume, setMasterVolume] = useState(80);

  // ─── REFS ───
  const audioCtxRef = useRef(null);
  const micStreamRef = useRef(null);
  const filtersRef = useRef([]);
  const compressorRef = useRef(null);
  const gainRef = useRef(null);

  // ─── DERIVED HELPER ───
  const getActiveGains = () => {
    if (activePreset === "nal") return calcNAL_NL2(audiogram);
    if (activePreset === "dsl") return calcDSL_v5(audiogram);
    if (activePreset === "custom") return { ...customGains };
    return {};
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Load user audiogram from Firestore on login
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

  // Apply gains when preset/audiogram/customGains change
  useEffect(() => {
    if (!filtersRef.current.length || !audioCtxRef.current) return;
    applyGainsToFilters(getActiveGains());
  }, [activePreset, audiogram, customGains]);

  // Master volume live update
  useEffect(() => {
    const ctx = audioCtxRef.current;
    const gain = gainRef.current;
    if (!ctx || !gain) return;
    gain.gain.setTargetAtTime(masterVolume / 100, ctx.currentTime, 0.05);
  }, [masterVolume]);

  // WDRC params live update
  useEffect(() => {
    const comp = compressorRef.current;
    const ctx = audioCtxRef.current;
    if (!comp || !ctx) return;
    const t = ctx.currentTime;
    comp.threshold.setTargetAtTime(compressionEnabled ? wdrcThreshold : 0, t, 0.05);
    comp.ratio.setTargetAtTime(compressionEnabled ? wdrcRatio : 1, t, 0.05);
    comp.attack.setTargetAtTime(wdrcAttack, t, 0.05);
    comp.release.setTargetAtTime(wdrcRelease, t, 0.05);
  }, [compressionEnabled, wdrcThreshold, wdrcRatio, wdrcAttack, wdrcRelease]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACKS
  // ═══════════════════════════════════════════════════════════════════════════

  const applyGainsToFilters = useCallback((gains) => {
    const ctx = audioCtxRef.current;
    if (!ctx || !filtersRef.current.length) return;
    filtersRef.current.forEach((filter, i) => {
      const freq = FREQ_BANDS[i];
      const gainVal = gains[freq] || 0;
      filter.gain.setTargetAtTime(gainVal, ctx.currentTime, 0.05);
    });
  }, []);

  const startListening = useCallback(async () => {
    setMicError(null);
    try {
      // Request stereo, fallback gracefully for iOS
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000,
            channelCount: { ideal: 2 },
          }
        });
      } catch (err) {
        // iOS Safari fallback: try minimal constraints
        if (err.name === "TypeError" || err.name === "NotSupportedError") {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw err;
        }
      }
      micStreamRef.current = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext({ sampleRate: 48000 });

      // iOS Safari: resume suspended context
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      audioCtxRef.current = ctx;

      // Source
      const source = ctx.createMediaStreamSource(stream);

      // 8-band parametric EQ
      const filters = FREQ_BANDS.map(freq => {
        const filter = ctx.createBiquadFilter();
        filter.type = "peaking";
        filter.frequency.value = freq;
        filter.Q.value = freq < 1000 ? 1.5 : 2.0;
        filter.gain.value = 0;
        return filter;
      });
      filtersRef.current = filters;

      // WDRC Compressor
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = compressionEnabled ? wdrcThreshold : 0;
      compressor.knee.value = 20;
      compressor.ratio.value = compressionEnabled ? wdrcRatio : 1;
      compressor.attack.value = wdrcAttack;
      compressor.release.value = wdrcRelease;
      compressorRef.current = compressor;

      // Master gain
      const masterGain = ctx.createGain();
      masterGain.gain.value = masterVolume / 100;
      gainRef.current = masterGain;

      // ╔════════════════════════════════════════════════════════╗
      // ║ STEREO FIX: ChannelMerger(2) guarantees stereo output ║
      // ╚════════════════════════════════════════════════════════╝
      const stereoMerger = ctx.createChannelMerger(2);

      // Wire the chain
      let node = source;
      filters.forEach(f => {
        node.connect(f);
        node = f;
      });
      node.connect(compressor);
      compressor.connect(masterGain);

      // Connect masterGain to BOTH channels of stereo merger
      masterGain.connect(stereoMerger, 0, 0); // → left ear
      masterGain.connect(stereoMerger, 0, 1); // → right ear
      stereoMerger.connect(ctx.destination);

      // Apply current prescription immediately
      applyGainsToFilters(getActiveGains());

      trackSimulatorUsed({ profile: activePreset });
      setIsListening(true);
    } catch (err) {
      console.error("Mic error:", err);
      if (err.name === "NotAllowedError") {
        setMicError("Bạn cần cho phép truy cập microphone để sử dụng tính năng này.");
      } else if (err.name === "NotFoundError") {
        setMicError("Không tìm thấy microphone. Hãy kết nối microphone và thử lại.");
      } else if (err.name === "NotSupportedError") {
        setMicError("Trình duyệt của bạn không hỗ trợ Web Audio API. Vui lòng dùng Chrome, Firefox, Safari hoặc Edge.");
      } else {
        setMicError("Lỗi microphone: " + (err.message || "Không xác định"));
      }
    }
  }, [compressionEnabled, wdrcThreshold, wdrcRatio, wdrcAttack, wdrcRelease, masterVolume, activePreset, audiogram, customGains, applyGainsToFilters]);

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
    setIsListening(false);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handlePresetChange = (presetId) => {
    setActivePreset(presetId);
    if (presetId === "custom") {
      const allZero = FREQ_BANDS.every(f => !customGains[f]);
      if (allZero) {
        const seed = activePreset === "nal"
          ? calcNAL_NL2(audiogram)
          : activePreset === "dsl"
            ? calcDSL_v5(audiogram)
            : calcNAL_NL2(audiogram);
        setCustomGains(seed);
      }
    }
  };

  const handleCustomGainChange = (freq, value) => {
    setCustomGains(prev => ({ ...prev, [freq]: Number(value) }));
  };

  const handleAudiogramChange = (freq, value) => {
    setAudiogram(prev => ({ ...prev, [freq]: Number(value) }));
  };

  const resetWdrcDefaults = () => {
    setWdrcThreshold(-30);
    setWdrcRatio(3);
    setWdrcAttack(0.005);
    setWdrcRelease(0.1);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const displayGains = getActiveGains();

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
        input[type="range"]::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: #00d4ff; cursor: pointer; border: 2px solid #0a0f1e;
        }
        input[type="number"] {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; color: #e8ecf4; padding: 8px; outline: none;
        }
        .glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; }
        .btn-preset { transition: all 0.25s; cursor: pointer; }
        .btn-preset:hover { transform: translateY(-2px); }
        @keyframes pulse-mic { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); } 50% { box-shadow: 0 0 0 15px rgba(239,68,68,0); } }
      `}</style>

      {/* HEADPHONE WARNING OVERLAY */}
      {!headphoneWarningDismissed && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(10,15,30,0.97)",
          backdropFilter: "blur(20px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            maxWidth: 520, width: "100%",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 24, padding: "40px 32px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🎧</div>

            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 20 }}>
              Đeo Tai Nghe Trước Khi Bắt Đầu
            </h2>

            {/* Green recommendation */}
            <div style={{
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.25)",
              borderRadius: 12, padding: "14px 18px", marginBottom: 12, textAlign: "left"
            }}>
              <div style={{ color: "#10b981", fontWeight: 700, fontSize: "0.9rem", marginBottom: 4 }}>
                ✓ Khuyên dùng: Tai nghe có dây
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.8rem", lineHeight: 1.5 }}>
                Cho trải nghiệm trợ thính tốt nhất — không độ trễ, không tiếng vang.
              </div>
            </div>

            {/* Red warning: speakers */}
            <div style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 12, padding: "14px 18px", marginBottom: 12, textAlign: "left"
            }}>
              <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.9rem", marginBottom: 4 }}>
                ⚠ Cảnh báo: Loa ngoài gây hú
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.8rem", lineHeight: 1.5 }}>
                Nếu dùng loa ngoài (không phải tai nghe), âm thanh khuếch đại sẽ chạy ngược lại mic tạo vòng lặp phản hồi (hú) cực kỳ lớn.
              </div>
            </div>

            {/* Yellow warning: Bluetooth */}
            <div style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: 12, padding: "14px 18px", marginBottom: 24, textAlign: "left"
            }}>
              <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: "0.9rem", marginBottom: 4 }}>
                ⚠ Tai nghe Bluetooth: Độ trễ 100-300ms
              </div>
              <div style={{ color: "#94a3b8", fontSize: "0.8rem", lineHeight: 1.5 }}>
                Tai nghe Bluetooth có độ trễ cao. Bạn sẽ nghe tiếng vang/echo. Không phù hợp để nghe trợ thính realtime.
              </div>
            </div>

            <button
              onClick={() => setHeadphoneWarningDismissed(true)}
              style={{
                width: "100%", padding: "16px",
                background: "linear-gradient(135deg,#00d4ff,#7c3aed)",
                border: "none", borderRadius: 14, color: "#fff",
                fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                boxShadow: "0 8px 20px rgba(0,212,255,0.25)"
              }}
            >
              ✓ Tôi đã đeo tai nghe — Bắt đầu
            </button>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav style={{ padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <a href="/" style={{ fontSize: "1.4rem", fontWeight: 800, textDecoration: "none", color: "#fff" }}>PAH<span style={{ color: "#00d4ff" }}>.</span></a>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="/hearing-test" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.85rem" }}>🎧 Đo thính lực</a>
          <a href="/" style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.85rem" }}>← Trang chủ</a>
        </div>
      </nav>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 20px 80px" }}>
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-block", padding: "5px 14px", background: "rgba(0,212,255,0.1)", color: "#00d4ff", borderRadius: 30, fontSize: "0.8rem", fontWeight: 600, marginBottom: 12 }}>
            Real-time Audio Processing
          </div>
          <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, marginBottom: 12 }}>
            🦻 Giả Lập Máy Trợ Thính
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.95rem", maxWidth: 620, margin: "0 auto", lineHeight: 1.6 }}>
            Thu âm thanh qua micro → xử lý khuếch đại theo thính lực đồ (NAL-NL2 / DSL v5) → phát qua tai nghe. <strong style={{ color: "#00d4ff" }}>Đeo tai nghe (tốt nhất là có dây) trước khi bật.</strong>
          </p>
        </div>

        {/* MIC CONTROL */}
        <div className="glass" style={{ padding: 28, marginBottom: 24, textAlign: "center" }}>
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
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 12 }}>
            {isListening ? "Đeo tai nghe để nghe âm thanh đã khuếch đại" : "Cần cho phép truy cập microphone"}
          </div>
          {micError && (
            <div style={{ marginTop: 12, padding: "10px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#ef4444", fontSize: "0.85rem" }}>
              ⚠️ {micError}
            </div>
          )}
          <button
            onClick={() => setHeadphoneWarningDismissed(false)}
            style={{ background: "none", border: "none", color: "#64748b", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline", marginTop: 8 }}
          >
            Xem lại cảnh báo tai nghe
          </button>
        </div>

        {/* 2-COLUMN GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          {/* LEFT: Presets + Audiogram */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Presets */}
            <div className="glass" style={{ padding: 24 }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 14 }}>📋 Công thức khuếch đại</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
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
              {/* WDRC Toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
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

            {/* Audiogram Input */}
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
                        fontSize: "0.85rem"
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

          {/* RIGHT: EQ + Custom + Volume */}
          <div className="glass" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>🎛️ Equalizer — Mức khuếch đại (dB)</h3>
              <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                {activePreset === "off" ? "Không xử lý" : activePreset === "custom" ? "Tùy chỉnh" : activePreset.toUpperCase()}
              </span>
            </div>

            {/* EQ Bar Chart */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: 220, padding: "0 8px", marginBottom: 20, position: "relative" }}>
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
                    <div style={{ fontSize: "0.65rem", color: gain > 0 ? "#fff" : "#475569", fontWeight: 700, marginBottom: 4 }}>
                      {gain > 0 ? `+${gain}` : "0"}
                    </div>
                    <div style={{
                      width: "60%", maxWidth: 36,
                      height: `${barHeight}%`, minHeight: 4,
                      background: `linear-gradient(to top, ${barColor}, ${barColor}88)`,
                      borderRadius: "6px 6px 2px 2px",
                      transition: "height 0.4s ease, background 0.3s",
                      boxShadow: gain > 0 ? `0 0 12px ${barColor}40` : "none"
                    }} />
                    <div style={{ fontSize: "0.62rem", color: "#64748b", marginTop: 6, whiteSpace: "nowrap" }}>
                      {freq >= 1000 ? (freq / 1000) + "k" : freq}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Sliders */}
            {activePreset === "custom" && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, marginBottom: 16 }}>
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

            {/* Master Volume */}
            <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 12 }}>
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

        {/* WDRC CONTROLS */}
        {compressionEnabled && (
          <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>⚙️ WDRC — Cài Đặt Nên Động</h3>
              <button
                onClick={resetWdrcDefaults}
                style={{
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, padding: "6px 12px", color: "#94a3b8", fontSize: "0.75rem",
                  cursor: "pointer", transition: "0.2s"
                }}
              >
                ↺ Đặt lại mặc định
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Threshold */}
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 6 }}>Threshold (Ngưỡng nén)</div>
                <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: 8 }}>{wdrcThreshold} dB</div>
                <input type="range" min="-60" max="0" step="1"
                  value={wdrcThreshold}
                  onChange={e => setWdrcThreshold(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Ratio */}
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 6 }}>Ratio (Tỷ lệ nén)</div>
                <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: 8 }}>{wdrcRatio.toFixed(1)}:1</div>
                <input type="range" min="1" max="20" step="0.5"
                  value={wdrcRatio}
                  onChange={e => setWdrcRatio(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Attack */}
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 6 }}>Attack (Tấn công)</div>
                <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: 8 }}>{(wdrcAttack * 1000).toFixed(1)} ms</div>
                <input type="range" min="0.001" max="0.1" step="0.001"
                  value={wdrcAttack}
                  onChange={e => setWdrcAttack(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Release */}
              <div>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 6 }}>Release (Giải phóng)</div>
                <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: 8 }}>{(wdrcRelease * 1000).toFixed(0)} ms</div>
                <input type="range" min="0.01" max="1" step="0.01"
                  value={wdrcRelease}
                  onChange={e => setWdrcRelease(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* COMPARISON TABLE */}
        <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
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
