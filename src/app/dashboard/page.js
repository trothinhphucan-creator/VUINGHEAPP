"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

// ── Color palette for multiple test sessions ──
const SESSION_COLORS = [
    { right: "#ef4444", left: "#3b82f6" },   // red / blue — latest
    { right: "#f97316", left: "#06b6d4" },   // orange / cyan
    { right: "#eab308", left: "#8b5cf6" },   // yellow / purple
    { right: "#84cc16", left: "#ec4899" },   // green / pink
    { right: "#a3a3a3", left: "#737373" },   // grey — oldest
];

// ── Audiogram frequencies and dB axis ──
const FREQS = [250, 500, 1000, 2000, 4000, 8000];
const DB_MIN = -10, DB_MAX = 120;
const PAD = { top: 56, right: 106, bottom: 28, left: 60 };

function freqToX(f, pw) {
    const logMin = Math.log2(100), logMax = Math.log2(10000);
    return PAD.left + ((Math.log2(f) - logMin) / (logMax - logMin)) * pw;
}
function dbToY(d, ph) {
    return PAD.top + ((d - DB_MIN) / (DB_MAX - DB_MIN)) * ph;
}

// ── Audiogram canvas renderer ──
function drawAudiogram(canvas, sessions, selected) {
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.min(container.clientWidth - 8, 760);
    const H = Math.min(W * 0.62, 500);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    const c = canvas.getContext("2d");
    c.scale(dpr, dpr);
    const pw = W - PAD.left - PAD.right;
    const ph = H - PAD.top - PAD.bottom;

    // Background
    c.fillStyle = "#f8fafc";
    c.fillRect(PAD.left, PAD.top, pw, ph);

    // Severity bands
    const bands = [
        { min: -10, max: 25, color: "rgba(16,185,129,0.08)" },
        { min: 25, max: 40, color: "rgba(132,204,22,0.08)" },
        { min: 40, max: 55, color: "rgba(245,158,11,0.08)" },
        { min: 55, max: 70, color: "rgba(249,115,22,0.10)" },
        { min: 70, max: 90, color: "rgba(239,68,68,0.10)" },
        { min: 90, max: 120, color: "rgba(168,85,247,0.10)" },
    ];
    bands.forEach(b => {
        c.fillStyle = b.color;
        c.fillRect(PAD.left, dbToY(b.min, ph), pw, dbToY(b.max, ph) - dbToY(b.min, ph));
    });

    // Grid lines + labels
    FREQS.forEach(f => {
        const x = freqToX(f, pw);
        c.strokeStyle = "#dde1e7"; c.lineWidth = 0.6;
        c.beginPath(); c.moveTo(x, PAD.top); c.lineTo(x, PAD.top + ph); c.stroke();
        c.fillStyle = "#0088cc"; c.font = "bold 10px Inter,sans-serif"; c.textAlign = "center";
        c.fillText(f >= 1000 ? f / 1000 + "k" : f, x, PAD.top - 8);
    });
    for (let d = 0; d <= 120; d += 10) {
        const y = dbToY(d, ph);
        c.strokeStyle = d % 20 === 0 ? "#c0c7d0" : "#e5e9f0";
        c.lineWidth = d % 20 === 0 ? 0.8 : 0.4;
        c.beginPath(); c.moveTo(PAD.left, y); c.lineTo(PAD.left + pw, y); c.stroke();
        if (d % 10 === 0) { c.fillStyle = "#555"; c.font = "9px Inter,sans-serif"; c.textAlign = "right"; c.fillText(d, PAD.left - 6, y + 3); }
    }
    // Axis labels
    c.fillStyle = "#0088cc"; c.font = "bold 10px Inter,sans-serif"; c.textAlign = "center";
    c.fillText("Tần số (Hz)", PAD.left + pw / 2, 14);
    c.save(); c.translate(12, PAD.top + ph / 2); c.rotate(-Math.PI / 2);
    c.fillStyle = "#555"; c.font = "9px Inter,sans-serif"; c.textAlign = "center";
    c.fillText("Ngưỡng nghe (dB HL)", 0, 0); c.restore();
    // Border
    c.strokeStyle = "#aab"; c.lineWidth = 1;
    c.strokeRect(PAD.left, PAD.top, pw, ph);
    // Severity right labels
    [["Bình thường", 8], ["Nhẹ", 32], ["TB", 47], ["Nặng", 62], ["Sâu", 95]].forEach(([lbl, db]) => {
        c.fillStyle = "#888"; c.font = "9px Inter,sans-serif"; c.textAlign = "left";
        c.fillText(lbl, PAD.left + pw + 6, dbToY(db, ph) + 3);
    });

    // Draw sessions (oldest first, newest on top)
    const toShow = sessions.filter((_, i) => selected.includes(i));
    toShow.reverse().forEach((sess, revIdx) => {
        const realIdx = sessions.indexOf(sess);
        const color = SESSION_COLORS[Math.min(realIdx, SESSION_COLORS.length - 1)];
        const alpha = 1 - realIdx * 0.18;
        // right ear
        drawEarLine(c, sess.results.right, color.right, "O", pw, ph, alpha);
        // left ear
        drawEarLine(c, sess.results.left, color.left, "X", pw, ph, alpha);
    });
}

function drawEarLine(c, earData, color, sym, pw, ph, alpha) {
    if (!earData) return;
    const pts = FREQS.filter(f => earData[f] !== undefined)
        .map(f => ({ x: freqToX(f, pw), y: dbToY(earData[f], ph), db: earData[f] }));
    if (!pts.length) return;
    c.globalAlpha = alpha;
    c.strokeStyle = color; c.lineWidth = 2; c.lineJoin = "round";
    c.beginPath();
    pts.forEach((p, i) => i === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y));
    c.stroke();
    pts.forEach(p => {
        if (sym === "O") {
            c.fillStyle = "#fff"; c.strokeStyle = color; c.lineWidth = 2.5;
            c.beginPath(); c.arc(p.x, p.y, 8, 0, Math.PI * 2); c.fill(); c.stroke();
            c.fillStyle = color; c.font = "bold 10px Inter,sans-serif"; c.textAlign = "center"; c.fillText("O", p.x, p.y + 4);
        } else {
            const s = 7; c.strokeStyle = color; c.lineWidth = 2.5; c.beginPath();
            c.moveTo(p.x - s, p.y - s); c.lineTo(p.x + s, p.y + s);
            c.moveTo(p.x + s, p.y - s); c.lineTo(p.x - s, p.y + s); c.stroke();
        }
    });
    c.globalAlpha = 1;
}

// ── Average dB across speech frequencies (PTA) ──
function calcPTA(earResults) {
    const freqs = [500, 1000, 2000, 4000];
    const vals = freqs.filter(f => earResults?.[f] !== undefined).map(f => earResults[f]);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function classifyLevel(avg) {
    if (avg <= 25) return { label: "Bình thường", cls: "level-normal", emoji: "✅" };
    if (avg <= 40) return { label: "Nhẹ (Mild)", cls: "level-mild", emoji: "🟡" };
    if (avg <= 55) return { label: "Trung bình", cls: "level-moderate", emoji: "🟠" };
    if (avg <= 70) return { label: "Nặng (Severe)", cls: "level-severe", emoji: "🔴" };
    return { label: "Sâu (Profound)", cls: "level-profound", emoji: "🚨" };
}

export default function DashboardPage() {
    const { user, loading, signInWithGoogle, signOut } = useAuth();
    const router = useRouter();
    const [sessions, setSessions] = useState([]);
    const [selected, setSelected] = useState([0]);
    const [fetching, setFetching] = useState(false);
    const [canvas, setCanvas] = useState(null);

    // Fetch test results from Firestore
    useEffect(() => {
        if (!user) return;
        const fetchResults = async () => {
            setFetching(true);
            try {
                const q = query(
                    collection(db, "testResults"),
                    where("uid", "==", user.uid),
                    orderBy("createdAt", "desc")
                );
                const snap = await getDocs(q);
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setSessions(data);
                setSelected([0]);
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setFetching(false);
            }
        };
        fetchResults();
    }, [user]);

    // Redraw audiogram when selection or sessions change
    useEffect(() => {
        if (!canvas || !sessions.length) return;
        drawAudiogram(canvas, sessions, selected);
    }, [canvas, sessions, selected]);

    const toggleSession = (idx) => {
        setSelected(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary, #0a0f1e)" }}>
                <div style={{ textAlign: "center", color: "#e8ecf4" }}>
                    <div style={{ width: 48, height: 48, border: "4px solid rgba(0,212,255,0.2)", borderTop: "4px solid #00d4ff", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
                    <p>Đang xác thực...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0a0f1e 0%, #0f1b35 100%)", fontFamily: "'Inter', sans-serif" }}>
                <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "48px 40px", textAlign: "center", maxWidth: 420, width: "90%" }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>🔐</div>
                    <h2 style={{ color: "#e8ecf4", fontSize: "1.6rem", fontWeight: 700, margin: "0 0 12px" }}>Đăng nhập để xem kết quả</h2>
                    <p style={{ color: "#94a3b8", fontSize: "0.95rem", margin: "0 0 32px", lineHeight: 1.6 }}>Đăng nhập bằng Google để xem lịch sử đo thính lực, so sánh audiogram qua các lần đo và nhận tư vấn cá nhân hóa.</p>
                    <button
                        onClick={signInWithGoogle}
                        style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "14px 28px", background: "#fff", border: "none", borderRadius: 14, color: "#1a1a1a", fontSize: "1rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        Đăng nhập bằng Google
                    </button>
                    <div style={{ marginTop: 24 }}>
                        <a href="/" style={{ color: "#64748b", fontSize: "0.85rem", textDecoration: "none" }}>← Quay lại trang chủ</a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0f1e 0%, #0f1b35 100%)", fontFamily: "'Inter', sans-serif", color: "#e8ecf4" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px);} to { opacity:1; transform:none;} }
        .fadein { animation: fadeUp 0.5s ease both; }
        .session-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 16px 20px; cursor: pointer; transition: all 0.3s; }
        .session-card:hover { background: rgba(255,255,255,0.08); }
        .session-card.selected { border-color: rgba(0,212,255,0.4); background: rgba(0,212,255,0.06); }
        .level-normal  { color: #10b981; }
        .level-mild    { color: #eab308; }
        .level-moderate{ color: #f97316; }
        .level-severe  { color: #ef4444; }
        .level-profound{ color: #a855f7; }
        .tag { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 600; }
        .tag-normal  { background: rgba(16,185,129,0.15); color: #10b981; }
        .tag-mild    { background: rgba(234,179,8,0.15); color: #eab308; }
        .tag-moderate{ background: rgba(249,115,22,0.15); color: #f97316; }
        .tag-severe  { background: rgba(239,68,68,0.15); color: #ef4444; }
        .tag-profound{ background: rgba(168,85,247,0.15); color: #a855f7; }
        .cb-color { display: inline-block; width: 14px; height: 14px; border-radius: 4px; margin-right: 4px; }
        .dash-section { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; padding: 28px; margin-bottom: 24px; }
      `}</style>

            {/* Top Nav */}
            <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(10,15,30,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "14px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "1.2rem", fontWeight: 800, background: "linear-gradient(135deg, #00d4ff, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PAH</span>
                    <span style={{ color: "#64748b", fontSize: "0.85rem" }}>Phúc An Hearing</span>
                </a>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid rgba(0,212,255,0.3)" }} />}
                    <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{user.displayName || user.email}</span>
                    <button onClick={signOut} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#94a3b8", fontSize: "0.82rem", cursor: "pointer" }}>Đăng xuất</button>
                </div>
            </nav>

            <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 20px" }}>
                {/* Header */}
                <div className="fadein" style={{ marginBottom: 32 }}>
                    <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: 0, background: "linear-gradient(135deg, #e8ecf4, #00d4ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        📊 Lịch sử Thính Lực
                    </h1>
                    <p style={{ color: "#64748b", margin: "8px 0 0", fontSize: "0.9rem" }}>Xem và so sánh các lần đo thính lực của bạn</p>
                </div>

                {fetching && (
                    <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
                        <div style={{ width: 36, height: 36, border: "3px solid rgba(0,212,255,0.2)", borderTop: "3px solid #00d4ff", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                        Đang tải dữ liệu...
                    </div>
                )}

                {!fetching && sessions.length === 0 && (
                    <div className="dash-section fadein" style={{ textAlign: "center", padding: "56px 24px" }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>🎧</div>
                        <h3 style={{ color: "#e8ecf4", margin: "0 0 8px" }}>Chưa có lần đo nào</h3>
                        <p style={{ color: "#64748b", margin: "0 0 24px" }}>Thực hiện đo thính lực đầu tiên để xem kết quả tại đây</p>
                        <a href="/hearing-test" style={{ display: "inline-block", padding: "12px 28px", background: "linear-gradient(135deg, #00d4ff, #7c3aed)", borderRadius: 14, color: "#fff", textDecoration: "none", fontWeight: 600 }}>
                            🎧 Đo thính lực ngay
                        </a>
                    </div>
                )}

                {!fetching && sessions.length > 0 && (
                    <>
                        {/* Audiogram comparison */}
                        <div className="dash-section fadein">
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#e8ecf4" }}>📈 Thính Lực Đồ So Sánh</h2>
                                <div style={{ display: "flex", gap: 12, fontSize: "0.8rem", color: "#94a3b8" }}>
                                    <span><span style={{ display: "inline-block", width: 20, height: 3, background: "#ef4444", borderRadius: 2, verticalAlign: "middle", marginRight: 4 }} />○ Tai phải</span>
                                    <span><span style={{ display: "inline-block", width: 20, height: 3, background: "#3b82f6", borderRadius: 2, verticalAlign: "middle", marginRight: 4 }} />✕ Tai trái</span>
                                </div>
                            </div>
                            <div style={{ background: "#f8fafc", borderRadius: 12, overflow: "hidden" }}>
                                <canvas ref={setCanvas} style={{ display: "block", maxWidth: "100%" }} />
                            </div>
                        </div>

                        {/* Session selector */}
                        <div className="dash-section fadein">
                            <h2 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 700, color: "#e8ecf4" }}>🗂 Chọn lần đo để so sánh</h2>
                            <div style={{ display: "grid", gap: 12 }}>
                                {sessions.map((sess, idx) => {
                                    const rPTA = calcPTA(sess.results?.right || {});
                                    const lPTA = calcPTA(sess.results?.left || {});
                                    const rLvl = classifyLevel(rPTA);
                                    const lLvl = classifyLevel(lPTA);
                                    const date = sess.createdAt?.toDate?.() || new Date(sess.createdAt || Date.now());
                                    const isSelected = selected.includes(idx);
                                    const color = SESSION_COLORS[Math.min(idx, SESSION_COLORS.length - 1)];
                                    return (
                                        <div key={sess.id} className={"session-card" + (isSelected ? " selected" : "")} onClick={() => toggleSession(idx)}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                                {/* Checkbox visual */}
                                                <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${isSelected ? "#00d4ff" : "rgba(255,255,255,0.2)"}`, background: isSelected ? "rgba(0,212,255,0.15)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                    {isSelected && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#00d4ff" strokeWidth="2" fill="none" /></svg>}
                                                </div>
                                                {/* Session color dot */}
                                                <div style={{ display: "flex", gap: 4 }}>
                                                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: color.right, display: "inline-block", marginTop: 2 }} />
                                                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: color.left, display: "inline-block", marginTop: 2 }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                                                        {idx === 0 ? "🆕 Lần đo gần nhất" : `Lần đo #${sessions.length - idx}`}
                                                    </div>
                                                    <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: 2 }}>
                                                        {date.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} · {date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                                    </div>
                                                </div>
                                                <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                                                    <div style={{ textAlign: "center" }}>
                                                        <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: 2 }}>Tai phải</div>
                                                        <span className={`tag tag-${rLvl.cls.replace("level-", "")}`}>{rLvl.emoji} {rPTA} dB</span>
                                                    </div>
                                                    <div style={{ textAlign: "center" }}>
                                                        <div style={{ fontSize: "0.7rem", color: "#64748b", marginBottom: 2 }}>Tai trái</div>
                                                        <span className={`tag tag-${lLvl.cls.replace("level-", "")}`}>{lLvl.emoji} {lPTA} dB</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Latest session detail */}
                        {sessions[selected[0] ?? 0] && (() => {
                            const sess = sessions[selected[0] ?? 0];
                            const rPTA = calcPTA(sess.results?.right || {});
                            const lPTA = calcPTA(sess.results?.left || {});
                            const rLvl = classifyLevel(rPTA);
                            const lLvl = classifyLevel(lPTA);
                            return (
                                <div className="dash-section fadein">
                                    <h2 style={{ margin: "0 0 20px", fontSize: "1.1rem", fontWeight: 700, color: "#e8ecf4" }}>🎯 Kết quả chi tiết</h2>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                                        {[{ label: "Tai Phải", pta: rPTA, lvl: rLvl, dotColor: "#ef4444" }, { label: "Tai Trái", pta: lPTA, lvl: lLvl, dotColor: "#3b82f6" }].map(ear => (
                                            <div key={ear.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "20px 24px", textAlign: "center" }}>
                                                <div style={{ width: 12, height: 12, borderRadius: "50%", background: ear.dotColor, margin: "0 auto 8px" }} />
                                                <div style={{ color: "#94a3b8", fontSize: "0.8rem", marginBottom: 4 }}>{ear.label}</div>
                                                <div className={ear.lvl.cls} style={{ fontSize: "2rem", fontWeight: 800 }}>{ear.pta}<span style={{ fontSize: "0.9rem", fontWeight: 400 }}> dB</span></div>
                                                <div className={ear.lvl.cls} style={{ fontSize: "0.85rem", fontWeight: 600, marginTop: 4 }}>{ear.lvl.emoji} {ear.lvl.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ padding: "16px 20px", background: "rgba(0,212,255,0.05)", borderRadius: 14, border: "1px solid rgba(0,212,255,0.15)" }}>
                                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                                            <img src="https://vuinghe.com/wp-content/uploads/2022/01/Untitled-1-01-1-1.png" alt="Ths. Chu Đức Hải" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#e8ecf4" }}>Tư vấn của Ths. Chu Đức Hải</div>
                                                <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "6px 0 0", lineHeight: 1.6 }}>
                                                    {Math.max(rPTA, lPTA) <= 25
                                                        ? "Thính lực của bạn nằm trong giới hạn bình thường. Hãy duy trì bằng cách tránh tiếng ồn lớn và kiểm tra định kỳ 1-2 năm/lần."
                                                        : Math.max(rPTA, lPTA) <= 40
                                                            ? "Bạn có dấu hiệu giảm thính lực nhẹ. Bạn có thể gặp khó khăn trong môi trường ồn. Tôi khuyến nghị đo chuyên sâu để có đánh giá chính xác hơn."
                                                            : "Bạn có dấu hiệu giảm thính lực đáng kể. Tôi khuyến nghị đến gặp chuyên gia thính học sớm để được đo chuyên sâu và tư vấn giải pháp phù hợp."}
                                                </p>
                                                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                                                    <a href="https://zalo.me/818788000" target="_blank" rel="noopener noreferrer" style={{ padding: "8px 16px", background: "#00d4ff", borderRadius: 10, color: "#0a0f1e", textDecoration: "none", fontSize: "0.82rem", fontWeight: 700 }}>💬 Tư vấn Zalo</a>
                                                    <a href="/hearing-test" style={{ padding: "8px 16px", background: "rgba(255,255,255,0.08)", borderRadius: 10, color: "#e8ecf4", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600 }}>🔁 Đo lại</a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
