"use client";

import { useState, useEffect } from "react";
import { db, auth, googleProvider, isConfigured } from "@/lib/firebase";
import {
    collection, getDocs, orderBy, query, doc, updateDoc,
    where, limit, serverTimestamp
} from "firebase/firestore";
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";

const TABS = [
    { id: "overview", icon: "📊", label: "Tổng quan" },
    { id: "users", icon: "👥", label: "Người dùng" },
    { id: "results", icon: "🦻", label: "Kết quả đo" },
    { id: "bookings", icon: "📅", label: "Đặt lịch" },
    { id: "settings", icon: "⚙️", label: "Cài đặt" },
];

function classifyLevel(avg) {
    if (avg <= 25) return { label: "Bình thường", color: "#10b981" };
    if (avg <= 40) return { label: "Nhẹ", color: "#eab308" };
    if (avg <= 55) return { label: "Trung bình", color: "#f97316" };
    if (avg <= 70) return { label: "Nặng", color: "#ef4444" };
    return { label: "Sâu", color: "#a855f7" };
}

function calcPTA(earResults) {
    const freqs = [500, 1000, 2000, 4000];
    const vals = freqs.filter(f => earResults?.[f] !== undefined).map(f => earResults[f]);
    if (!vals.length) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function formatDate(ts) {
    if (!ts) return "-";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ── Admin login via Firebase Google Auth ── */
function LoginScreen({ onLogin }) {
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const handleGoogleLogin = async () => {
        if (!isConfigured || !auth) {
            setErr("Firebase chưa được cấu hình.");
            return;
        }
        setLoading(true);
        setErr("");
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            // Check admin role in Firestore
            const { getDoc, doc: firestoreDoc } = await import("firebase/firestore");
            const userSnap = await getDoc(firestoreDoc(db, "users", user.uid));
            if (userSnap.exists() && userSnap.data().role === "admin") {
                onLogin(user);
            } else {
                await firebaseSignOut(auth);
                setErr("Tài khoản này không có quyền admin. Liên hệ quản trị viên.");
            }
        } catch (e) {
            console.error("Admin login error:", e);
            setErr("Đăng nhập thất bại. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#0a0f1e,#0f1b35)", fontFamily: "'Inter',sans-serif" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "48px 40px", maxWidth: 400, width: "90%", textAlign: "center" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
                <h2 style={{ color: "#e8ecf4", margin: "0 0 8px", fontSize: "1.5rem" }}>Admin Dashboard</h2>
                <p style={{ color: "#64748b", margin: "0 0 28px", fontSize: "0.9rem" }}>Phúc An Hearing — Quản trị hệ thống</p>
                {err && <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: "0 0 16px", padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)" }}>{err}</p>}
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    style={{ width: "100%", padding: "13px", background: loading ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#00d4ff,#7c3aed)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    {loading ? "Đang xác thực..." : <><svg width="20" height="20" viewBox="0 0 24 24"><path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Đăng nhập với Google</>}
                </button>
                <div style={{ marginTop: 24 }}>
                    <a href="/" style={{ color: "#64748b", fontSize: "0.85rem", textDecoration: "none" }}>← Trang chủ</a>
                </div>
            </div>
        </div>
    );
}

/* ── Overview ── */
function OverviewTab({ users, results, bookings }) {
    const totalTests = results.length;
    const totalBookings = bookings.length;
    const totalUsers = users.length;
    const avgPTA = results.length ? Math.round(
        results.reduce((acc, r) => acc + Math.max(calcPTA(r.results?.right || {}), calcPTA(r.results?.left || {})), 0) / results.length
    ) : 0;
    const convRate = totalTests > 0 ? Math.round((totalBookings / totalTests) * 100) : 0;

    // Week-over-week trend calculation
    const now = Date.now();
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    const toMs = (ts) => ts?.toDate ? ts.toDate().getTime() : (ts?.seconds ? ts.seconds * 1000 : 0);

    const thisWeekTests = results.filter(r => now - toMs(r.createdAt) < WEEK).length;
    const lastWeekTests = results.filter(r => {
        const ms = toMs(r.createdAt);
        return ms && now - ms >= WEEK && now - ms < 2 * WEEK;
    }).length;
    const testDelta = lastWeekTests > 0 ? Math.round(((thisWeekTests - lastWeekTests) / lastWeekTests) * 100) : null;

    const thisWeekBookings = bookings.filter(b => now - toMs(b.createdAt) < WEEK).length;
    const lastWeekBookings = bookings.filter(b => {
        const ms = toMs(b.createdAt);
        return ms && now - ms >= WEEK && now - ms < 2 * WEEK;
    }).length;
    const bookingDelta = lastWeekBookings > 0 ? Math.round(((thisWeekBookings - lastWeekBookings) / lastWeekBookings) * 100) : null;

    // Top time slots
    const slotCounts = {};
    bookings.forEach(b => {
        if (b.preferredTime) slotCounts[b.preferredTime] = (slotCounts[b.preferredTime] || 0) + 1;
    });
    const topSlots = Object.entries(slotCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const stats = [
        { icon: "👥", label: "Người dùng", value: totalUsers, color: "#00d4ff" },
        { icon: "🦻", label: "Lượt đo", value: totalTests, color: "#7c3aed" },
        { icon: "📅", label: "Lịch hẹn", value: totalBookings, color: "#10b981" },
        { icon: "📊", label: "TB ngưỡng nghe", value: avgPTA + " dB", color: "#f59e0b" },
        { icon: "🎯", label: "Tỷ lệ đặt lịch", value: convRate + "%", color: "#ec4899" },
    ];
    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, marginBottom: 28 }}>
                {stats.map(s => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px" }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Trend Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 28 }}>
                {/* Tests Trend */}
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px" }}>
                    <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 12 }}>Lượt đo tuần này</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#7c3aed", marginBottom: 8 }}>{thisWeekTests}</div>
                    <div style={{ fontSize: "0.8rem", color: testDelta === null ? "#64748b" : testDelta >= 0 ? "#10b981" : "#ef4444" }}>
                        {testDelta === null ? "Tuần đầu" : testDelta >= 0 ? `▲ +${testDelta}%` : `▼ ${testDelta}%`}
                    </div>
                </div>

                {/* Bookings Trend */}
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px" }}>
                    <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 12 }}>Lịch hẹn tuần này</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#10b981", marginBottom: 8 }}>{thisWeekBookings}</div>
                    <div style={{ fontSize: "0.8rem", color: bookingDelta === null ? "#64748b" : bookingDelta >= 0 ? "#10b981" : "#ef4444" }}>
                        {bookingDelta === null ? "Tuần đầu" : bookingDelta >= 0 ? `▲ +${bookingDelta}%` : `▼ ${bookingDelta}%`}
                    </div>
                </div>
            </div>

            {/* Top Time Slots */}
            {topSlots.length > 0 && (
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px", marginBottom: 28 }}>
                    <h3 style={{ color: "#e8ecf4", margin: "0 0 14px", fontSize: "0.95rem", fontWeight: 700 }}>⏰ Khung giờ phổ biến</h3>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {topSlots.map(([slot, count]) => (
                            <div key={slot} style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", color: "#00d4ff", fontWeight: 600 }}>
                                {slot} <span style={{ color: "#64748b" }}>({count})</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <h3 style={{ color: "#e8ecf4", margin: "0 0 12px" }}>📋 Lượt đo gần nhất</h3>
            <ResultsTable results={results.slice(0, 10)} />
        </div>
    );
}

/* ── Users Tab ── */
function UsersTab({ users }) {
    const [search, setSearch] = useState("");
    const filtered = users.filter(u =>
        (u.displayName || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase())
    );
    return (
        <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm..." style={{ flex: 1, padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#e8ecf4", fontSize: "0.9rem", outline: "none" }} />
                <span style={{ color: "#64748b", fontSize: "0.85rem" }}>{filtered.length} người dùng</span>
            </div>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                            {["Avatar", "Tên", "Email", "Ngày đăng ký", "Role"].map(h => (
                                <th key={h} style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600, textAlign: "left" }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(u => (
                            <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <td style={{ padding: "10px 12px" }}>
                                    {u.photoURL ? <img src={u.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: "50%" }} /> : <span style={{ width: 32, height: 32, borderRadius: "50%", background: "#334155", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>👤</span>}
                                </td>
                                <td style={{ padding: "10px 12px", color: "#e8ecf4", fontWeight: 600 }}>{u.displayName || "-"}</td>
                                <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{u.email}</td>
                                <td style={{ padding: "10px 12px", color: "#64748b" }}>{formatDate(u.createdAt)}</td>
                                <td style={{ padding: "10px 12px" }}>
                                    <span style={{ padding: "3px 10px", borderRadius: 20, background: u.role === "admin" ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.06)", color: u.role === "admin" ? "#00d4ff" : "#94a3b8", fontSize: "0.78rem", fontWeight: 600 }}>{u.role || "user"}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/* ── Results Table ── */
function ResultsTable({ results }) {
    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        {["Thời gian", "Người dùng", "Tai phải", "Tai trái", "Đánh giá tổng"].map(h => (
                            <th key={h} style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600, textAlign: "left" }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {results.map(r => {
                        const rPTA = calcPTA(r.results?.right || {});
                        const lPTA = calcPTA(r.results?.left || {});
                        const overall = classifyLevel(Math.max(rPTA, lPTA));
                        return (
                            <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <td style={{ padding: "10px 12px", color: "#64748b" }}>{formatDate(r.createdAt)}</td>
                                <td style={{ padding: "10px 12px", color: "#e8ecf4" }}>{r.displayName || r.email || "-"}</td>
                                <td style={{ padding: "10px 12px", color: "#ef4444", fontWeight: 600 }}>{rPTA} dB</td>
                                <td style={{ padding: "10px 12px", color: "#3b82f6", fontWeight: 600 }}>{lPTA} dB</td>
                                <td style={{ padding: "10px 12px" }}><span style={{ color: overall.color, fontWeight: 600 }}>{overall.label}</span></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

/* ── Bookings Tab ── */
function BookingsTab({ bookings, onStatusChange }) {
    const [filter, setFilter] = useState("all");
    const STATUS_COLORS = {
        pending: { bg: "rgba(245,158,11,0.1)", color: "#f59e0b", label: "Chờ xử lý" },
        confirmed: { bg: "rgba(16,185,129,0.1)", color: "#10b981", label: "Đã xác nhận" },
        cancelled: { bg: "rgba(239,68,68,0.1)", color: "#ef4444", label: "Đã huỷ" },
    };
    const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

    return (
        <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {["all", "pending", "confirmed", "cancelled"].map(s => (
                    <button key={s} onClick={() => setFilter(s)} style={{
                        padding: "6px 16px", borderRadius: 20, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", border: "1px solid",
                        background: filter === s ? "rgba(0,212,255,0.15)" : "transparent",
                        borderColor: filter === s ? "rgba(0,212,255,0.4)" : "rgba(255,255,255,0.1)",
                        color: filter === s ? "#00d4ff" : "#94a3b8",
                    }}>
                        {s === "all" ? `Tất cả (${bookings.length})` : `${STATUS_COLORS[s]?.label} (${bookings.filter(b => b.status === s).length})`}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div style={{ color: "#94a3b8", textAlign: "center", padding: 48 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
                    <p>Chưa có lịch hẹn nào.</p>
                    <p style={{ fontSize: "0.82rem", color: "#64748b" }}>Lịch hẹn sẽ xuất hiện khi bệnh nhân đặt lịch qua trang đặt hẹn.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {filtered.map(b => {
                        const st = STATUS_COLORS[b.status] || STATUS_COLORS.pending;
                        return (
                            <div key={b.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "18px 20px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                            <span style={{ fontWeight: 700, color: "#e8ecf4", fontSize: "1rem" }}>{b.name || "—"}</span>
                                            <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "4px 16px", fontSize: "0.84rem", color: "#94a3b8" }}>
                                            <span>📞 {b.phone || "—"}</span>
                                            <span>✉️ {b.email || "—"}</span>
                                            <span>📅 {b.preferredDate || "Chưa chọn"} {b.preferredTime || ""}</span>
                                            <span>🕐 {formatDate(b.createdAt)}</span>
                                        </div>
                                        {b.note && <div style={{ marginTop: 8, fontSize: "0.83rem", color: "#64748b", padding: "6px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8 }}>💬 {b.note}</div>}
                                    </div>
                                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                        {b.status !== "confirmed" && (
                                            <button onClick={() => onStatusChange(b.id, "confirmed")} style={{ padding: "7px 14px", borderRadius: 10, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>✅ Xác nhận</button>
                                        )}
                                        {b.status !== "cancelled" && (
                                            <button onClick={() => onStatusChange(b.id, "cancelled")} style={{ padding: "7px 14px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>✕ Huỷ</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/* ── Settings Tab ── */
function SettingsTab() {
    const [saved, setSaved] = useState(false);
    const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
    return (
        <div style={{ maxWidth: 580 }}>
            <h3 style={{ color: "#e8ecf4", margin: "0 0 20px" }}>⚙️ Cài đặt hệ thống</h3>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
                <h4 style={{ color: "#94a3b8", margin: "0 0 16px", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>🔊 Tần số kiểm tra</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {[250, 500, 1000, 2000, 4000, 8000].map(f => (
                        <label key={f} style={{ display: "flex", alignItems: "center", gap: 6, color: "#e8ecf4", cursor: "pointer", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: "0.85rem" }}>
                            <input type="checkbox" defaultChecked style={{ accentColor: "#00d4ff" }} /> {f} Hz
                        </label>
                    ))}
                </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
                <h4 style={{ color: "#94a3b8", margin: "0 0 16px", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>⏱ Thông số Hughson-Westlake</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {[["Số lần phát âm", "setting-pulse-count", "3"], ["Thời lượng âm (ms)", "setting-pulse-duration", "250"], ["Thời gian chờ (ms)", "setting-wait", "1500"]].map(([lbl, id, val]) => (
                        <div key={id}>
                            <label style={{ color: "#94a3b8", fontSize: "0.8rem", display: "block", marginBottom: 4 }}>{lbl}</label>
                            <input type="number" id={id} defaultValue={val} style={{ width: "100%", padding: "8px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#e8ecf4", fontSize: "0.9rem", outline: "none" }} />
                        </div>
                    ))}
                </div>
            </div>
            <button onClick={save} style={{ padding: "12px 28px", background: saved ? "#10b981" : "linear-gradient(135deg,#00d4ff,#7c3aed)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, cursor: "pointer", transition: "background 0.3s" }}>
                {saved ? "✅ Đã lưu!" : "💾 Lưu cài đặt"}
            </button>
        </div>
    );
}

/* ── Main Admin Dashboard ── */
export default function AdminPage() {
    const [adminUser, setAdminUser] = useState(null);
    const [tab, setTab] = useState("overview");
    const [users, setUsers] = useState([]);
    const [results, setResults] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!adminUser) return;
        const loadAll = async () => {
            setLoading(true);
            try {
                const [usersSnap, resultsSnap, bookingsSnap] = await Promise.all([
                    getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(100))),
                    getDocs(query(collection(db, "testResults"), orderBy("createdAt", "desc"), limit(200))),
                    getDocs(query(collection(db, "bookings"), orderBy("createdAt", "desc"), limit(200))),
                ]);
                setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setResults(resultsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setBookings(bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error("Admin fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, [adminUser]);

    const handleStatusChange = async (bookingId, newStatus) => {
        try {
            await updateDoc(doc(db, "bookings", bookingId), { status: newStatus, updatedAt: serverTimestamp() });
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b));
        } catch (e) {
            console.error("Status update error:", e);
        }
    };

    const handleLogout = async () => {
        if (auth) await firebaseSignOut(auth);
        setAdminUser(null);
    };

    if (!adminUser) return <LoginScreen onLogin={setAdminUser} />;

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0f1e,#0f1b35)", fontFamily: "'Inter',sans-serif", color: "#e8ecf4" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>

            <div style={{ display: "flex", minHeight: "100vh" }}>
                {/* Sidebar */}
                <aside style={{ width: 220, background: "rgba(255,255,255,0.03)", borderRight: "1px solid rgba(255,255,255,0.07)", padding: "24px 0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                    <div style={{ padding: "0 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ fontWeight: 800, fontSize: "1.1rem", background: "linear-gradient(135deg,#00d4ff,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PAH Admin</div>
                        <div style={{ color: "#64748b", fontSize: "0.75rem", marginTop: 2 }}>Quản trị hệ thống</div>
                        <div style={{ color: "#475569", fontSize: "0.72rem", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adminUser.email}</div>
                    </div>
                    <nav style={{ padding: "16px 12px", flex: 1 }}>
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", marginBottom: 4, background: tab === t.id ? "rgba(0,212,255,0.1)" : "transparent", border: tab === t.id ? "1px solid rgba(0,212,255,0.2)" : "1px solid transparent", borderRadius: 10, color: tab === t.id ? "#00d4ff" : "#94a3b8", fontWeight: tab === t.id ? 600 : 400, fontSize: "0.88rem", cursor: "pointer", textAlign: "left" }}>
                                <span>{t.icon}</span>{t.label}
                                {t.id === "bookings" && bookings.filter(b => b.status === "pending").length > 0 && (
                                    <span style={{ marginLeft: "auto", background: "#f59e0b", color: "#000", borderRadius: "50%", width: 18, height: 18, fontSize: "0.7rem", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        {bookings.filter(b => b.status === "pending").length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </nav>
                    <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                        <a href="/" style={{ color: "#64748b", fontSize: "0.8rem", textDecoration: "none", display: "block", marginBottom: 6 }}>← Trang chủ</a>
                        <a href="/hearing-test" style={{ color: "#64748b", fontSize: "0.8rem", textDecoration: "none", display: "block", marginBottom: 8 }}>🎧 Đo thính lực</a>
                        <button onClick={handleLogout} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", borderRadius: 8, padding: "6px 12px", fontSize: "0.78rem", cursor: "pointer", width: "100%" }}>Đăng xuất</button>
                    </div>
                </aside>

                {/* Main content */}
                <main style={{ flex: 1, padding: "32px 28px", overflow: "auto" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
                        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>
                            {TABS.find(t => t.id === tab)?.icon} {TABS.find(t => t.id === tab)?.label}
                        </h1>
                        {loading && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: "0.85rem" }}>
                                <div style={{ width: 16, height: 16, border: "2px solid rgba(0,212,255,0.2)", borderTop: "2px solid #00d4ff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                                Đang tải...
                            </div>
                        )}
                    </div>

                    {tab === "overview" && <OverviewTab users={users} results={results} bookings={bookings} />}
                    {tab === "users" && <UsersTab users={users} />}
                    {tab === "results" && <ResultsTable results={results} />}
                    {tab === "bookings" && <BookingsTab bookings={bookings} onStatusChange={handleStatusChange} />}
                    {tab === "settings" && <SettingsTab />}
                </main>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
