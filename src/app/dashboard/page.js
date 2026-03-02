"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { db, isConfigured } from "@/lib/firebase";
import {
    collection, query, where, orderBy, getDocs, deleteDoc, doc, addDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { jsPDF } from "jspdf";

/* ═══════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════ */
const FREQS = [250, 500, 1000, 2000, 4000, 8000];
const DB_MIN = -10, DB_MAX = 120;
const PAD = { top: 50, right: 60, bottom: 25, left: 50 };
const TABS = [
    { id: "results", label: "📊 Kết quả đo", icon: "📊" },
    { id: "manual", label: "✏️ Nhập thủ công", icon: "✏️" },
    { id: "profiles", label: "👤 Hồ sơ", icon: "👤" },
];

const SESSION_COLORS = [
    { right: "#ef4444", left: "#3b82f6" },
    { right: "#f97316", left: "#06b6d4" },
    { right: "#eab308", left: "#8b5cf6" },
    { right: "#84cc16", left: "#ec4899" },
    { right: "#a3a3a3", left: "#737373" },
];

function calcPTA(ear) {
    const f = [500, 1000, 2000, 4000];
    const v = f.filter(x => ear?.[x] !== undefined).map(x => ear[x]);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
}

function classify(avg) {
    if (avg <= 15) return { label: "Bình thường", color: "#10b981", emoji: "✅", cls: "normal" };
    if (avg <= 25) return { label: "Gần bình thường", color: "#84cc16", emoji: "🟢", cls: "normal" };
    if (avg <= 40) return { label: "Nhẹ", color: "#f59e0b", emoji: "🟡", cls: "mild" };
    if (avg <= 55) return { label: "Trung bình", color: "#f97316", emoji: "🟠", cls: "moderate" };
    if (avg <= 70) return { label: "TB-Nặng", color: "#ef4444", emoji: "🔴", cls: "severe" };
    if (avg <= 90) return { label: "Nặng", color: "#dc2626", emoji: "🔴", cls: "severe" };
    return { label: "Sâu", color: "#9333ea", emoji: "🟣", cls: "profound" };
}

/* ═══════════════════════════════════════════════════
   PTA TREND CHART (over time)
   ═══════════════════════════════════════════════════ */
function drawTrendChart(canvas, sessions) {
    if (!canvas || sessions.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.min(canvas.parentElement.clientWidth - 8, 740);
    const H = 180;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    const c = canvas.getContext("2d");
    c.scale(dpr, dpr);

    const pd = { top: 28, right: 14, bottom: 32, left: 44 };
    const pw = W - pd.left - pd.right, ph = H - pd.top - pd.bottom;

    // Data points (chronological — oldest first)
    const sorted = [...sessions].reverse();
    const points = sorted.map(s => ({
        date: s.createdAt?.toDate ? s.createdAt.toDate() : new Date(),
        rPTA: calcPTA(s.results?.right || {}),
        lPTA: calcPTA(s.results?.left || {}),
    }));
    const maxPTA = Math.max(60, ...points.map(p => Math.max(p.rPTA, p.lPTA))) + 10;
    const minPTA = Math.max(0, Math.min(...points.map(p => Math.min(p.rPTA, p.lPTA))) - 5);

    // Background
    c.fillStyle = "#f8fafc"; c.fillRect(0, 0, W, H);

    // Normal zone
    const normalTop = pd.top + ((minPTA) / (maxPTA - minPTA)) * ph;
    const normalBot = pd.top + ((25 - minPTA) / (maxPTA - minPTA)) * ph;
    c.fillStyle = "rgba(16,185,129,0.08)";
    c.fillRect(pd.left, normalTop, pw, Math.min(normalBot - normalTop, ph));

    // Grid lines
    const gridSteps = [0, 15, 25, 40, 55, 70].filter(v => v >= minPTA && v <= maxPTA);
    c.strokeStyle = "#e2e8f0"; c.lineWidth = 0.5; c.font = "10px Inter,sans-serif"; c.fillStyle = "#94a3b8"; c.textAlign = "right";
    for (const g of gridSteps) {
        const y = pd.top + ((g - minPTA) / (maxPTA - minPTA)) * ph;
        c.beginPath(); c.moveTo(pd.left, y); c.lineTo(pd.left + pw, y); c.stroke();
        c.fillText(g + " dB", pd.left - 4, y + 3);
    }

    // X axis dates
    c.textAlign = "center"; c.fillStyle = "#94a3b8";
    const xStep = pw / Math.max(points.length - 1, 1);
    points.forEach((p, i) => {
        const x = pd.left + i * xStep;
        const label = p.date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
        c.fillText(label, x, H - 6);
    });

    // Draw lines
    const drawLine = (key, color) => {
        c.strokeStyle = color; c.lineWidth = 2; c.beginPath();
        points.forEach((p, i) => {
            const x = pd.left + i * xStep;
            const y = pd.top + ((p[key] - minPTA) / (maxPTA - minPTA)) * ph;
            if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        });
        c.stroke();
        // Dots
        points.forEach((p, i) => {
            const x = pd.left + i * xStep;
            const y = pd.top + ((p[key] - minPTA) / (maxPTA - minPTA)) * ph;
            c.fillStyle = "#fff"; c.beginPath(); c.arc(x, y, 4, 0, Math.PI * 2); c.fill();
            c.fillStyle = color; c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill();
            c.font = "bold 9px Inter,sans-serif"; c.textAlign = "center"; c.fillText(p[key], x, y - 8);
        });
    };
    drawLine("rPTA", "#ef4444");
    drawLine("lPTA", "#3b82f6");

    // Title
    c.fillStyle = "#334155"; c.font = "bold 11px Inter,sans-serif"; c.textAlign = "left";
    c.fillText("PTA theo thời gian", pd.left, 16);
}

/* ═══════════════════════════════════════════════════
   AUDIOGRAM CANVAS RENDERER
   ═══════════════════════════════════════════════════ */
function fToX(f, pw) { return PAD.left + ((Math.log2(f) - Math.log2(100)) / (Math.log2(10000) - Math.log2(100))) * pw; }
function dToY(d, ph) { return PAD.top + ((d - DB_MIN) / (DB_MAX - DB_MIN)) * ph; }

function drawAudiogram(canvas, sessions, selected) {
    const dpr = window.devicePixelRatio || 1;
    const W = Math.min(canvas.parentElement.clientWidth - 8, 740);
    const H = Math.min(W * 0.65, 460);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    const c = canvas.getContext("2d");
    c.scale(dpr, dpr);
    const pw = W - PAD.left - PAD.right, ph = H - PAD.top - PAD.bottom;

    c.fillStyle = "#f8fafc"; c.fillRect(PAD.left, PAD.top, pw, ph);
    // Severity bands
    [[-10, 25, "rgba(16,185,129,0.08)"], [25, 40, "rgba(234,179,8,0.06)"], [40, 55, "rgba(249,115,22,0.08)"],
    [55, 70, "rgba(239,68,68,0.08)"], [70, 90, "rgba(239,68,68,0.12)"], [90, 120, "rgba(168,85,247,0.1)"]]
        .forEach(([min, max, clr]) => { c.fillStyle = clr; c.fillRect(PAD.left, dToY(min, ph), pw, dToY(max, ph) - dToY(min, ph)); });
    // Grid
    FREQS.forEach(f => {
        const x = fToX(f, pw);
        c.strokeStyle = "#dde1e7"; c.lineWidth = 0.5;
        c.beginPath(); c.moveTo(x, PAD.top); c.lineTo(x, PAD.top + ph); c.stroke();
        c.fillStyle = "#0088cc"; c.font = "bold 10px Inter,sans-serif"; c.textAlign = "center";
        c.fillText(f >= 1000 ? f / 1000 + "k" : f, x, PAD.top - 8);
    });
    for (let d = 0; d <= 120; d += 10) {
        const y = dToY(d, ph);
        c.strokeStyle = d % 20 === 0 ? "#bbb" : "#e5e9f0"; c.lineWidth = d % 20 === 0 ? 0.6 : 0.3;
        c.beginPath(); c.moveTo(PAD.left, y); c.lineTo(PAD.left + pw, y); c.stroke();
        if (d % 10 === 0) { c.fillStyle = "#555"; c.font = "9px Inter,sans-serif"; c.textAlign = "right"; c.fillText(d, PAD.left - 5, y + 3); }
    }
    c.fillStyle = "#0088cc"; c.font = "bold 10px Inter,sans-serif"; c.textAlign = "center";
    c.fillText("Tần số (Hz)", PAD.left + pw / 2, 14);
    c.strokeStyle = "#aab"; c.lineWidth = 1; c.strokeRect(PAD.left, PAD.top, pw, ph);

    // Draw selected sessions
    const shown = sessions.filter((_, i) => selected.includes(i));
    [...shown].reverse().forEach(sess => {
        const idx = sessions.indexOf(sess);
        const clr = SESSION_COLORS[Math.min(idx, SESSION_COLORS.length - 1)];
        const alpha = Math.max(0.3, 1 - idx * 0.15);
        drawEarLine(c, sess.results?.right, clr.right, "O", pw, ph, alpha);
        drawEarLine(c, sess.results?.left, clr.left, "X", pw, ph, alpha);
    });
}

function drawEarLine(c, earData, color, sym, pw, ph, alpha) {
    if (!earData) return;
    const pts = FREQS.filter(f => earData[f] !== undefined).map(f => ({ x: fToX(f, pw), y: dToY(earData[f], ph), db: earData[f] }));
    if (!pts.length) return;
    c.globalAlpha = alpha;
    c.strokeStyle = color; c.lineWidth = 2.5; c.lineJoin = "round";
    c.beginPath(); pts.forEach((p, i) => i === 0 ? c.moveTo(p.x, p.y) : c.lineTo(p.x, p.y)); c.stroke();
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
        c.fillStyle = color; c.font = "bold 8px Inter,sans-serif"; c.textAlign = "center"; c.fillText(p.db + "dB", p.x, p.y - 14);
    });
    c.globalAlpha = 1;
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function DashboardPage() {
    const { user, loading, signInWithGoogle, signOut } = useAuth();
    const router = useRouter();
    const [sessions, setSessions] = useState([]);
    const [selected, setSelected] = useState([0]);
    const [fetching, setFetching] = useState(false);
    const [tab, setTab] = useState("results");
    const [deleting, setDeleting] = useState(null);
    const [canvas, setCanvas] = useState(null);
    const [trendCanvas, setTrendCanvas] = useState(null);
    const [saving, setSaving] = useState(false);

    // Manual audiogram input state
    const [manualRight, setManualRight] = useState({});
    const [manualLeft, setManualLeft] = useState({});
    const [manualLabel, setManualLabel] = useState("");
    const [manualDate, setManualDate] = useState(new Date().toISOString().split("T")[0]);

    // Profile state
    const [profile, setProfile] = useState({ name: "", age: "", notes: "" });
    const [profileSaved, setProfileSaved] = useState(false);

    // Fetch results
    useEffect(() => {
        if (!user || !isConfigured || !db) return;
        const fetchResults = async () => {
            setFetching(true);
            try {
                const q = query(collection(db, "testResults"), where("uid", "==", user.uid), orderBy("createdAt", "desc"));
                const snap = await getDocs(q);
                setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setSelected([0]);
            } catch (e) { console.error(e); }
            setFetching(false);
        };
        fetchResults();
    }, [user]);

    // Re-fetch profile
    useEffect(() => {
        if (!user || !isConfigured || !db) return;
        const loadProfile = async () => {
            try {
                const { getDoc } = await import("firebase/firestore");
                const snap = await getDoc(doc(db, "userProfiles", user.uid));
                if (snap.exists()) { setProfile(snap.data()); setProfileSaved(true); }
            } catch (e) { console.error(e); }
        };
        loadProfile();
    }, [user]);

    // Draw audiogram
    useEffect(() => {
        if (!canvas || !sessions.length) return;
        drawAudiogram(canvas, sessions, selected);
        const h = () => drawAudiogram(canvas, sessions, selected);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, [canvas, sessions, selected]);

    // Draw trend chart
    useEffect(() => {
        if (!trendCanvas || sessions.length < 2) return;
        drawTrendChart(trendCanvas, sessions);
        const h = () => drawTrendChart(trendCanvas, sessions);
        window.addEventListener("resize", h);
        return () => window.removeEventListener("resize", h);
    }, [trendCanvas, sessions]);

    // Delete a result
    const handleDelete = async (id) => {
        if (!confirm("Bạn có chắc muốn xóa kết quả này?")) return;
        setDeleting(id);
        try {
            await deleteDoc(doc(db, "testResults", id));
            setSessions(prev => prev.filter(s => s.id !== id));
            setSelected([0]);
        } catch (e) { console.error(e); alert("Lỗi khi xóa: " + e.message); }
        setDeleting(null);
    };

    // Save manual audiogram
    const handleSaveManual = async () => {
        if (!user || !isConfigured || !db) return;
        const hasRight = FREQS.some(f => manualRight[f] !== undefined && manualRight[f] !== "");
        const hasLeft = FREQS.some(f => manualLeft[f] !== undefined && manualLeft[f] !== "");
        if (!hasRight && !hasLeft) { alert("Vui lòng nhập ít nhất 1 giá trị ngưỡng nghe."); return; }

        // Validate range -10 to 120 dB HL
        for (const f of FREQS) {
            for (const [side, data] of [["phải", manualRight], ["trái", manualLeft]]) {
                if (data[f] !== undefined && data[f] !== "") {
                    const v = Number(data[f]);
                    if (isNaN(v) || v < -10 || v > 120) {
                        alert(`Giá trị ${f} Hz tai ${side} không hợp lệ. Phải trong khoảng -10 đến 120 dB HL.`);
                        return;
                    }
                }
            }
        }

        // Warn on unusual inter-frequency gap (>40 dB between adjacent frequencies)
        const checkGap = (data, side) => {
            const vals = FREQS.map(f => data[f] !== undefined && data[f] !== "" ? Number(data[f]) : null);
            for (let i = 0; i < vals.length - 1; i++) {
                if (vals[i] !== null && vals[i + 1] !== null && Math.abs(vals[i] - vals[i + 1]) > 40) {
                    return `Tai ${side}: chênh lệch ${FREQS[i]}–${FREQS[i + 1]} Hz là ${Math.abs(vals[i] - vals[i + 1])} dB (> 40 dB).`;
                }
            }
            return null;
        };
        const gapWarnings = [checkGap(manualRight, "phải"), checkGap(manualLeft, "trái")].filter(Boolean);
        if (gapWarnings.length > 0) {
            if (!confirm(`⚠️ Cảnh báo bất thường:\n${gapWarnings.join("\n")}\n\nBạn vẫn muốn lưu?`)) return;
        }

        setSaving(true);
        try {
            const rightData = {}, leftData = {};
            FREQS.forEach(f => {
                if (manualRight[f] !== undefined && manualRight[f] !== "") rightData[f] = Math.round(Math.min(120, Math.max(-10, Number(manualRight[f]))));
                if (manualLeft[f] !== undefined && manualLeft[f] !== "") leftData[f] = Math.round(Math.min(120, Math.max(-10, Number(manualLeft[f]))));
            });
            const ev = classify(Math.max(calcPTA(rightData), calcPTA(leftData)));
            await addDoc(collection(db, "testResults"), {
                uid: user.uid, email: user.email, displayName: user.displayName,
                results: { right: rightData, left: leftData },
                evaluationLabel: ev.label,
                rightPTA: calcPTA(rightData), leftPTA: calcPTA(leftData),
                source: "manual",
                label: manualLabel || "Nhập thủ công",
                createdAt: serverTimestamp(),
            });
            // Refresh
            const q = query(collection(db, "testResults"), where("uid", "==", user.uid), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setSelected([0]);
            setManualRight({}); setManualLeft({}); setManualLabel(""); setTab("results");
            alert("✅ Đã lưu thính lực đồ!");
        } catch (e) { console.error(e); alert("Lỗi: " + e.message); }
        setSaving(false);
    };

    // Save profile
    const handleSaveProfile = async () => {
        if (!user || !isConfigured || !db) return;
        setSaving(true);
        try {
            const { setDoc } = await import("firebase/firestore");
            await setDoc(doc(db, "userProfiles", user.uid), {
                ...profile, uid: user.uid, email: user.email, updatedAt: serverTimestamp(),
            }, { merge: true });
            setProfileSaved(true);
            alert("✅ Đã lưu hồ sơ!");
        } catch (e) { console.error(e); alert("Lỗi: " + e.message); }
        setSaving(false);
    };

    // Screenshot audiogram
    const handleScreenshot = () => {
        if (!canvas) return;
        const link = document.createElement("a");
        link.download = `audiogram_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };

    // Format date for PDF
    const formatDatePDF = (ts) => {
        if (!ts) return "—";
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    // Export PDF audiogram
    const handleExportPDF = () => {
        if (!canvas || !sessions.length || !selected.length) return;
        const session = sessions[selected[0]];
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        const dpr = window.devicePixelRatio || 1;

        // Header bar
        pdf.setFillColor(10, 15, 30);
        pdf.rect(0, 0, 210, 28, "F");
        pdf.setTextColor(0, 212, 255);
        pdf.setFontSize(18);
        pdf.setFont(undefined, "bold");
        pdf.text("PAH — Phúc An Hearing", 10, 16);
        pdf.setTextColor(148, 163, 184);
        pdf.setFontSize(8);
        pdf.setFont(undefined, "normal");
        pdf.text("hearingtest.pah.vn  |  ĐT: 0818 788 000", 10, 24);

        // Patient info
        pdf.setTextColor(30, 50, 80);
        pdf.setFontSize(10);
        pdf.text("Họ tên: " + (session.displayName || "—"), 10, 38);
        pdf.text("Email: " + (session.email || "—"), 10, 45);
        pdf.text("Ngày đo: " + formatDatePDF(session.createdAt), 10, 52);

        // PTA Results
        const rPTA = Math.round(calcPTA(session.results?.right || {}));
        const lPTA = Math.round(calcPTA(session.results?.left || {}));
        const overall = classify(Math.max(rPTA, lPTA));
        pdf.setFontSize(11);
        pdf.setFont(undefined, "bold");
        pdf.setTextColor(20, 20, 20);
        pdf.text(`Tai phải (PTA): ${rPTA} dB HL — ${classify(rPTA).label}`, 10, 64);
        pdf.text(`Tai trái  (PTA): ${lPTA} dB HL — ${classify(lPTA).label}`, 10, 72);
        pdf.setFontSize(13);
        pdf.text(`Đánh giá tổng: ${overall.label}`, 10, 82);

        // Audiogram image
        const imgW = 180;
        const imgH = imgW * (canvas.height / canvas.width / dpr);
        pdf.addImage(imgData, "PNG", 15, 90, imgW, Math.min(imgH, 110));

        // Footer
        pdf.setFontSize(8);
        pdf.setFont(undefined, "normal");
        pdf.setTextColor(120, 120, 120);
        pdf.text(
            "Đây là kết quả sàng lọc ban đầu, không thay thế chẩn đoán lâm sàng. Tư vấn: Ths. Chu Đức Hải",
            10,
            285
        );

        pdf.save(`PAH_Audiogram_${session.id?.slice(0, 8)}_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    // ── AUTH SCREENS ──
    if (loading) return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0f1e" }}>
            <div style={{ textAlign: "center", color: "#e8ecf4" }}>
                <div style={{ width: 40, height: 40, border: "3px solid rgba(0,212,255,0.2)", borderTop: "3px solid #00d4ff", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
                Đang xác thực...
            </div>
        </div>
    );

    if (!user) return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#0a0f1e,#0f1b35)", fontFamily: "'Inter',sans-serif" }}>
            <div className="g" style={{ padding: "48px 40px", textAlign: "center", maxWidth: 420, width: "90%" }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🔐</div>
                <h2 style={{ color: "#e8ecf4", fontSize: "1.4rem", fontWeight: 700, marginBottom: 12 }}>Đăng nhập để xem kết quả</h2>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: 28, lineHeight: 1.6 }}>
                    Xem lịch sử đo, so sánh audiogram, quản lý hồ sơ thính lực cá nhân.
                </p>
                <button onClick={signInWithGoogle}
                    style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "14px 28px", background: "#fff", border: "none", borderRadius: 14, color: "#1a1a1a", fontSize: "1rem", fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
                    <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                    Đăng nhập bằng Google
                </button>
                <div style={{ marginTop: 24 }}><a href="/" style={{ color: "#64748b", fontSize: "0.85rem", textDecoration: "none" }}>← Trang chủ</a></div>
            </div>
        </div>
    );

    // ── MAIN DASHBOARD ──
    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0f1e,#0f1b35,#1a0f2e)", fontFamily: "'Inter',sans-serif", color: "#e8ecf4" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
                .fi { animation: fadeUp 0.4s ease both; }
                .g { background: rgba(255,255,255,0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; }
                .btn { padding: 10px 20px; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; }
                .btn:hover { transform: translateY(-1px); }
                .btn-primary { background: linear-gradient(135deg,#00d4ff,#7c3aed); color: #fff; box-shadow: 0 4px 15px rgba(0,212,255,0.25); }
                .btn-danger { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }
                .btn-outline { background: rgba(255,255,255,0.05); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); }
                .tab { padding: 10px 18px; border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; background: rgba(255,255,255,0.02); color: #64748b; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: all 0.2s; }
                .tab.active { background: rgba(0,212,255,0.08); border-color: rgba(0,212,255,0.3); color: #00d4ff; }
                input[type="number"] { width: 100%; padding: 8px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #e8ecf4; font-size: 0.85rem; text-align: center; outline: none; }
                input[type="number"]:focus { border-color: rgba(0,212,255,0.4); }
                input[type="text"], input[type="date"], textarea { width: 100%; padding: 10px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #e8ecf4; font-size: 0.9rem; outline: none; }
                input:focus, textarea:focus { border-color: rgba(0,212,255,0.4); }
            `}</style>

            {/* Nav */}
            <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(10,15,30,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff" }}>PAH<span style={{ color: "#00d4ff" }}>.</span></span>
                </a>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <a href="/hearing-test" className="btn btn-outline" style={{ fontSize: "0.78rem", padding: "6px 14px" }}>🎧 Đo thính lực</a>
                    <a href="/hearing-aid-simulator" className="btn btn-outline" style={{ fontSize: "0.78rem", padding: "6px 14px", textDecoration: "none" }}>🦻 Simulator</a>
                    {user.photoURL && <img src={user.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(0,212,255,0.3)" }} />}
                    <button onClick={signOut} className="btn btn-outline" style={{ fontSize: "0.78rem", padding: "6px 14px" }}>Đăng xuất</button>
                </div>
            </nav>

            <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 16px 80px" }}>
                {/* Header */}
                <div className="fi" style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: "clamp(1.3rem, 3vw, 1.7rem)", fontWeight: 800, marginBottom: 4 }}>
                        Xin chào, {user.displayName?.split(" ")[0] || "bạn"} 👋
                    </h1>
                    <p style={{ color: "#64748b", fontSize: "0.85rem" }}>Quản lý kết quả đo thính lực và hồ sơ cá nhân</p>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                    {TABS.map(t => (
                        <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ══════ TAB: RESULTS ══════ */}
                {tab === "results" && (
                    <div className="fi">
                        {fetching && (
                            <div style={{ textAlign: "center", padding: 48, color: "#64748b" }}>
                                <div style={{ width: 32, height: 32, border: "3px solid rgba(0,212,255,0.2)", borderTop: "3px solid #00d4ff", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 10px" }} />
                                Đang tải...
                            </div>
                        )}

                        {!fetching && sessions.length === 0 && (
                            <div className="g" style={{ padding: "48px 24px", textAlign: "center" }}>
                                <div style={{ fontSize: 48, marginBottom: 12 }}>🎧</div>
                                <h3 style={{ marginBottom: 8 }}>Chưa có lần đo nào</h3>
                                <p style={{ color: "#64748b", marginBottom: 20 }}>Đo thính lực hoặc nhập thủ công để bắt đầu</p>
                                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                                    <a href="/hearing-test" className="btn btn-primary" style={{ textDecoration: "none" }}>🎧 Đo thính lực</a>
                                    <button className="btn btn-outline" onClick={() => setTab("manual")}>✏️ Nhập thủ công</button>
                                </div>
                            </div>
                        )}

                        {!fetching && sessions.length > 0 && (
                            <>
                                {/* Audiogram */}
                                <div className="g" style={{ padding: 20, marginBottom: 16 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                                        <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>📈 Thính Lực Đồ So Sánh</h2>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button className="btn btn-outline" onClick={handleScreenshot} style={{ fontSize: "0.75rem", padding: "6px 12px" }}>
                                                📸 Chụp ảnh
                                            </button>
                                            <button className="btn btn-outline" onClick={handleExportPDF} style={{ fontSize: "0.75rem", padding: "6px 12px" }}>
                                                📄 Xuất PDF
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ background: "#f8fafc", borderRadius: 10, overflow: "hidden" }}>
                                        <canvas ref={setCanvas} style={{ display: "block", maxWidth: "100%" }} />
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, fontSize: "0.75rem", color: "#94a3b8" }}>
                                        <span><span style={{ color: "#ef4444", fontWeight: 700 }}>O ─</span> Tai Phải</span>
                                        <span><span style={{ color: "#3b82f6", fontWeight: 700 }}>X ─</span> Tai Trái</span>
                                    </div>
                                </div>

                                {/* PTA Trend Chart (2+ sessions) */}
                                {sessions.length >= 2 && (
                                    <div className="g" style={{ padding: 20, marginBottom: 16 }}>
                                        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 12 }}>📉 Xu hướng PTA theo thời gian</h2>
                                        <div style={{ background: "#f8fafc", borderRadius: 10, overflow: "hidden" }}>
                                            <canvas ref={setTrendCanvas} style={{ display: "block", maxWidth: "100%" }} />
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, fontSize: "0.75rem", color: "#94a3b8" }}>
                                            <span><span style={{ color: "#ef4444", fontWeight: 700 }}>● ─</span> PTA Tai Phải</span>
                                            <span><span style={{ color: "#3b82f6", fontWeight: 700 }}>● ─</span> PTA Tai Trái</span>
                                            <span><span style={{ background: "rgba(16,185,129,0.15)", padding: "1px 6px", borderRadius: 3 }}>■</span> Vùng bình thường</span>
                                        </div>
                                    </div>
                                )}

                                {/* Session list */}
                                <div className="g" style={{ padding: 20 }}>
                                    <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 14 }}>🗂 Lịch sử đo ({sessions.length})</h2>
                                    <div style={{ display: "grid", gap: 10 }}>
                                        {sessions.map((sess, idx) => {
                                            const rPTA = calcPTA(sess.results?.right || {});
                                            const lPTA = calcPTA(sess.results?.left || {});
                                            const rLvl = classify(rPTA), lLvl = classify(lPTA);
                                            const date = sess.createdAt?.toDate?.() || new Date(sess.createdAt || Date.now());
                                            const isSel = selected.includes(idx);
                                            const clr = SESSION_COLORS[Math.min(idx, SESSION_COLORS.length - 1)];
                                            const isManual = sess.source === "manual";
                                            return (
                                                <div key={sess.id} style={{
                                                    padding: "14px 16px", borderRadius: 14, cursor: "pointer",
                                                    background: isSel ? "rgba(0,212,255,0.06)" : "rgba(255,255,255,0.02)",
                                                    border: `1px solid ${isSel ? "rgba(0,212,255,0.3)" : "rgba(255,255,255,0.05)"}`,
                                                    transition: "all 0.2s"
                                                }} onClick={() => setSelected(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                                        {/* Checkbox */}
                                                        <div style={{
                                                            width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                                                            border: `2px solid ${isSel ? "#00d4ff" : "rgba(255,255,255,0.15)"}`,
                                                            background: isSel ? "rgba(0,212,255,0.15)" : "transparent",
                                                            display: "flex", alignItems: "center", justifyContent: "center"
                                                        }}>
                                                            {isSel && <span style={{ color: "#00d4ff", fontSize: 12 }}>✓</span>}
                                                        </div>
                                                        {/* Color dots */}
                                                        <div style={{ display: "flex", gap: 3 }}>
                                                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: clr.right }} />
                                                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: clr.left }} />
                                                        </div>
                                                        {/* Info */}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>
                                                                {isManual ? "✏️ " : ""}{sess.label || (idx === 0 ? "Lần đo gần nhất" : `Lần đo #${sessions.length - idx}`)}
                                                            </div>
                                                            <div style={{ color: "#64748b", fontSize: "0.75rem", marginTop: 2 }}>
                                                                {date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })} · {date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                                            </div>
                                                        </div>
                                                        {/* PTA badges */}
                                                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                                            <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: `${rLvl.color}15`, color: rLvl.color }}>
                                                                P: {rPTA}dB
                                                            </span>
                                                            <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: `${lLvl.color}15`, color: lLvl.color }}>
                                                                T: {lPTA}dB
                                                            </span>
                                                        </div>
                                                        {/* Delete button */}
                                                        <button
                                                            className="btn btn-danger"
                                                            onClick={e => { e.stopPropagation(); handleDelete(sess.id); }}
                                                            disabled={deleting === sess.id}
                                                            style={{ fontSize: "0.72rem", padding: "4px 10px", flexShrink: 0 }}>
                                                            {deleting === sess.id ? "..." : "🗑"}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ══════ TAB: MANUAL INPUT ══════ */}
                {tab === "manual" && (
                    <div className="fi">
                        <div className="g" style={{ padding: 24, marginBottom: 16 }}>
                            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 6 }}>✏️ Nhập Thính Lực Đồ Thủ Công</h2>
                            <p style={{ color: "#64748b", fontSize: "0.82rem", marginBottom: 20 }}>
                                Nhập giá trị ngưỡng nghe (dB HL) từ phiếu đo thính lực tại phòng khám hoặc audiogram có sẵn.
                            </p>

                            {/* Label */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ fontSize: "0.82rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>Ghi chú / Nguồn</label>
                                <input type="text" placeholder="VD: Đo tại PAH Hà Nội, 28/02/2026" value={manualLabel}
                                    onChange={e => setManualLabel(e.target.value)} />
                            </div>

                            {/* Frequency grid */}
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: 8, textAlign: "left", color: "#64748b", width: 80 }}>Tai</th>
                                            {FREQS.map(f => (
                                                <th key={f} style={{ padding: 8, textAlign: "center", color: "#94a3b8", whiteSpace: "nowrap" }}>
                                                    {f >= 1000 ? f / 1000 + "k" : f} Hz
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: 8, fontWeight: 600, color: "#ef4444" }}>👉 Phải</td>
                                            {FREQS.map(f => (
                                                <td key={f} style={{ padding: 4 }}>
                                                    <input type="number" min="-10" max="120" step="5"
                                                        value={manualRight[f] ?? ""} placeholder="—"
                                                        onChange={e => setManualRight(p => ({ ...p, [f]: e.target.value }))} />
                                                </td>
                                            ))}
                                        </tr>
                                        <tr>
                                            <td style={{ padding: 8, fontWeight: 600, color: "#3b82f6" }}>👈 Trái</td>
                                            {FREQS.map(f => (
                                                <td key={f} style={{ padding: 4 }}>
                                                    <input type="number" min="-10" max="120" step="5"
                                                        value={manualLeft[f] ?? ""} placeholder="—"
                                                        onChange={e => setManualLeft(p => ({ ...p, [f]: e.target.value }))} />
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
                                <button className="btn btn-primary" onClick={handleSaveManual} disabled={saving}>
                                    {saving ? "Đang lưu..." : "💾 Lưu Thính Lực Đồ"}
                                </button>
                                <button className="btn btn-outline" onClick={() => { setManualRight({}); setManualLeft({}); setManualLabel(""); }}>
                                    🔄 Xóa trắng
                                </button>
                            </div>
                        </div>

                        <div style={{ padding: "12px 16px", background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: 12, fontSize: "0.82rem", color: "#94a3b8" }}>
                            💡 <strong style={{ color: "#00d4ff" }}>Mẹo:</strong> Nếu bạn có ảnh audiogram, hãy đọc các giá trị ngưỡng nghe tại mỗi tần số rồi nhập vào bảng trên. Giá trị thường từ -10 đến 120 dB HL.
                        </div>
                    </div>
                )}

                {/* ══════ TAB: PROFILES ══════ */}
                {tab === "profiles" && (
                    <div className="fi">
                        <div className="g" style={{ padding: 24, marginBottom: 16 }}>
                            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 16 }}>👤 Hồ Sơ Thính Lực</h2>

                            <div style={{ display: "grid", gap: 14 }}>
                                <div>
                                    <label style={{ fontSize: "0.82rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>Họ và tên</label>
                                    <input type="text" value={profile.name || ""} placeholder={user.displayName || ""}
                                        onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: "0.82rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>Tuổi</label>
                                        <input type="number" value={profile.age || ""} placeholder="VD: 45"
                                            onChange={e => setProfile(p => ({ ...p, age: e.target.value }))}
                                            style={{ textAlign: "left" }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: "0.82rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>Giới tính</label>
                                        <select value={profile.gender || ""} onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))}
                                            style={{ width: "100%", padding: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e8ecf4", fontSize: "0.9rem" }}>
                                            <option value="">Chọn...</option>
                                            <option value="male">Nam</option>
                                            <option value="female">Nữ</option>
                                            <option value="other">Khác</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.82rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>Tiền sử / Ghi chú y khoa</label>
                                    <textarea rows={3} value={profile.notes || ""} placeholder="VD: Tiếp xúc tiếng ồn lâu năm, đã đeo máy trợ thính bên phải..."
                                        onChange={e => setProfile(p => ({ ...p, notes: e.target.value }))} />
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.82rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>Tình trạng sức nghe hiện tại</label>
                                    <select value={profile.hearingStatus || ""} onChange={e => setProfile(p => ({ ...p, hearingStatus: e.target.value }))}
                                        style={{ width: "100%", padding: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e8ecf4", fontSize: "0.9rem" }}>
                                        <option value="">Chọn...</option>
                                        <option value="normal">Bình thường</option>
                                        <option value="mild">Giảm nhẹ</option>
                                        <option value="moderate">Giảm trung bình</option>
                                        <option value="severe">Giảm nặng</option>
                                        <option value="aid_user">Đang dùng máy trợ thính</option>
                                        <option value="implant">Đã cấy ốc tai điện tử</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: "0.82rem", color: "#94a3b8", display: "block", marginBottom: 4 }}>Thương hiệu máy trợ thính (nếu có)</label>
                                    <input type="text" value={profile.aidBrand || ""} placeholder="VD: Phonak, Oticon, Signia..."
                                        onChange={e => setProfile(p => ({ ...p, aidBrand: e.target.value }))} />
                                </div>
                            </div>

                            <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving} style={{ marginTop: 20 }}>
                                {saving ? "Đang lưu..." : "💾 Lưu Hồ Sơ"}
                            </button>
                            {profileSaved && <span style={{ marginLeft: 12, fontSize: "0.82rem", color: "#10b981" }}>✓ Đã lưu</span>}
                        </div>

                        {/* Stats */}
                        <div className="g" style={{ padding: 20 }}>
                            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: 14 }}>📊 Tổng quan</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                                {[
                                    { label: "Số lần đo", value: sessions.length, icon: "🎧" },
                                    { label: "Nhập thủ công", value: sessions.filter(s => s.source === "manual").length, icon: "✏️" },
                                    { label: "PTA gần nhất", value: sessions[0] ? Math.max(calcPTA(sessions[0].results?.right || {}), calcPTA(sessions[0].results?.left || {})) + " dB" : "—", icon: "📈" },
                                ].map((s, i) => (
                                    <div key={i} style={{ padding: 14, background: "rgba(255,255,255,0.03)", borderRadius: 12, textAlign: "center" }}>
                                        <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                                        <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#00d4ff" }}>{s.value}</div>
                                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
