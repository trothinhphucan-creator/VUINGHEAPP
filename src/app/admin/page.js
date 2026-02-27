"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection, getDocs, orderBy, query, deleteDoc, doc, updateDoc,
    where, limit
} from "firebase/firestore";

const ADMIN_PASSWORD = "Pahr@2026";

const TABS = [
    { id: "overview", icon: "📊", label: "Tổng quan" },
    { id: "users", icon: "👥", label: "Người dùng" },
    { id: "results", icon: "🦻", label: "Kết quả đo" },
    { id: "bookings", icon: "📅", label: "Đặt lịch" },
    { id: "settings", icon: "⚙️", label: "Cài đặt" },
];

/* ── classifyLevel ── */
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

/* ── Admin login ── */
function LoginScreen({ onLogin }) {
    const [pwd, setPwd] = useState("");
    const [err, setErr] = useState("");
    const handleSubmit = (e) => {
        e.preventDefault();
        if (pwd === ADMIN_PASSWORD) onLogin();
        else { setErr("Mật khẩu không đúng!"); setPwd(""); }
    };
    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#0a0f1e,#0f1b35)", fontFamily: "'Inter',sans-serif" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "48px 40px", maxWidth: 400, width: "90%", textAlign: "center" }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>🔒</div>
                <h2 style={{ color: "#e8ecf4", margin: "0 0 8px", fontSize: "1.5rem" }}>Admin Dashboard</h2>
                <p style={{ color: "#64748b", margin: "0 0 28px", fontSize: "0.9rem" }}>Phúc An Hearing — Quản trị hệ thống</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password" value={pwd} onChange={e => setPwd(e.target.value)}
                        placeholder="Nhập mật khẩu admin..."
                        style={{ width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#e8ecf4", fontSize: "1rem", marginBottom: 12, outline: "none" }}
                        autoFocus
                    />
                    {err && <p style={{ color: "#ef4444", fontSize: "0.85rem", margin: "0 0 12px" }}>{err}</p>}
                    <button type="submit" style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg,#00d4ff,#7c3aed)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: "1rem", cursor: "pointer" }}>
                        Đăng nhập
                    </button>
                </form>
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
    const stats = [
        { icon: "👥", label: "Người dùng", value: totalUsers, color: "#00d4ff" },
        { icon: "🦻", label: "Lượt đo", value: totalTests, color: "#7c3aed" },
        { icon: "📅", label: "Lịch hẹn", value: totalBookings, color: "#10b981" },
        { icon: "📊", label: "TB ngưỡng nghe", value: avgPTA + " dB", color: "#f59e0b" },
    ];
    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
                {stats.map(s => (
                    <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px" }}>
                        <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>
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

/* ── Results Table (shared) ── */
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
    const [authed, setAuthed] = useState(false);
    const [tab, setTab] = useState("overview");
    const [users, setUsers] = useState([]);
    const [results, setResults] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!authed) return;
        const loadAll = async () => {
            setLoading(true);
            try {
                const [usersSnap, resultsSnap] = await Promise.all([
                    getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(100))),
                    getDocs(query(collection(db, "testResults"), orderBy("createdAt", "desc"), limit(200))),
                ]);
                setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                setResults(resultsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error("Admin fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, [authed]);

    if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0f1e,#0f1b35)", fontFamily: "'Inter',sans-serif", color: "#e8ecf4" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
      `}</style>

            {/* Sidebar + content layout */}
            <div style={{ display: "flex", minHeight: "100vh" }}>
                {/* Sidebar */}
                <aside style={{ width: 220, background: "rgba(255,255,255,0.03)", borderRight: "1px solid rgba(255,255,255,0.07)", padding: "24px 0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                    <div style={{ padding: "0 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ fontWeight: 800, fontSize: "1.1rem", background: "linear-gradient(135deg,#00d4ff,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>PAH Admin</div>
                        <div style={{ color: "#64748b", fontSize: "0.75rem", marginTop: 2 }}>Quản trị hệ thống</div>
                    </div>
                    <nav style={{ padding: "16px 12px", flex: 1 }}>
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", marginBottom: 4, background: tab === t.id ? "rgba(0,212,255,0.1)" : "transparent", border: tab === t.id ? "1px solid rgba(0,212,255,0.2)" : "1px solid transparent", borderRadius: 10, color: tab === t.id ? "#00d4ff" : "#94a3b8", fontWeight: tab === t.id ? 600 : 400, fontSize: "0.88rem", cursor: "pointer", textAlign: "left" }}>
                                <span>{t.icon}</span>{t.label}
                            </button>
                        ))}
                    </nav>
                    <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                        <a href="/" style={{ color: "#64748b", fontSize: "0.8rem", textDecoration: "none", display: "block", marginBottom: 6 }}>← Trang chủ</a>
                        <a href="/hearing-test" style={{ color: "#64748b", fontSize: "0.8rem", textDecoration: "none", display: "block" }}>🎧 Đo thính lực</a>
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
                    {tab === "bookings" && (
                        <div style={{ color: "#94a3b8", textAlign: "center", padding: 48 }}>
                            <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
                            <p>Lịch đặt hẹn sẽ hiển thị ở đây khi có dữ liệu từ form đặt lịch.</p>
                        </div>
                    )}
                    {tab === "settings" && <SettingsTab />}
                </main>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
