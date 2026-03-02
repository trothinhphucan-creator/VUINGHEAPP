"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { db, isConfigured } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { trackBookingSubmitted } from "@/lib/analytics";

const TIME_SLOTS = [
    "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00",
    "13:00 - 14:00", "14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00",
];

const BRANCHES = [
    { value: "hanoi",  label: "Hà Nội" },
    { value: "hcm",    label: "TP.HCM" },
    { value: "danang", label: "Đà Nẵng" },
    { value: "online", label: "Tư vấn Online" },
];

function BookingForm() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const testResultId = searchParams.get("resultId") || null;
    const fromTest = searchParams.get("from") === "hearing-test";

    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        preferredDate: "",
        preferredTime: "",
        note: "",
        branch: "hanoi",
    });
    const [status, setStatus] = useState("idle"); // idle | submitting | success | error
    const [errMsg, setErrMsg] = useState("");

    // Pre-fill from Firebase Auth user
    useEffect(() => {
        if (user) {
            setForm(prev => ({
                ...prev,
                name: prev.name || user.displayName || "",
                email: prev.email || user.email || "",
            }));
        }
    }, [user]);

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    // Get tomorrow as min date
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 1);
    const minDateStr = minDate.toISOString().split("T")[0];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { setErrMsg("Vui lòng nhập họ tên."); return; }
        if (!form.phone.trim() || !/^[0-9]{9,11}$/.test(form.phone.replace(/\s/g, ""))) {
            setErrMsg("Số điện thoại không hợp lệ (9-11 chữ số)."); return;
        }
        if (!form.preferredDate) { setErrMsg("Vui lòng chọn ngày hẹn."); return; }
        setErrMsg("");
        setStatus("submitting");

        try {
            if (!isConfigured || !db) throw new Error("Firebase chưa cấu hình");
            await addDoc(collection(db, "bookings"), {
                uid: user?.uid || null,
                name: form.name.trim(),
                phone: form.phone.trim(),
                email: form.email.trim() || user?.email || null,
                preferredDate: form.preferredDate,
                preferredTime: form.preferredTime || null,
                note: form.note.trim() || null,
                branch: form.branch,
                testResultId: testResultId,
                source: fromTest ? "post_test" : "web",
                status: "pending",
                createdAt: serverTimestamp(),
            });
            trackBookingSubmitted({ source: fromTest ? "post_test" : "web" });
            // Send email notification (fire-and-forget)
            fetch("/api/notify-booking", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name.trim(),
                    phone: form.phone.trim(),
                    email: form.email.trim() || user?.email || null,
                    preferredDate: form.preferredDate,
                    preferredTime: form.preferredTime,
                    note: form.note.trim(),
                    branch: form.branch,
                    source: fromTest ? "post_test" : "web",
                }),
            }).catch(() => {});
            setStatus("success");
        } catch (err) {
            console.error("Booking error:", err);
            setErrMsg("Có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ qua Zalo.");
            setStatus("error");
        }
    };

    const inputStyle = {
        width: "100%", padding: "12px 16px",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12, color: "#e8ecf4", fontSize: "0.95rem", outline: "none",
        fontFamily: "inherit",
    };
    const labelStyle = { display: "block", color: "#94a3b8", fontSize: "0.82rem", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" };

    if (status === "success") {
        return (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
                <h2 style={{ color: "#10b981", fontSize: "1.6rem", fontWeight: 800, marginBottom: 12 }}>Đặt lịch thành công!</h2>
                <p style={{ color: "#94a3b8", marginBottom: 8 }}>
                    Phòng khám Phúc An Hearing sẽ liên hệ với bạn trong thời gian sớm nhất.
                </p>
                <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: 32 }}>
                    📞 Nếu cần hỗ trợ ngay: <a href="tel:0818788000" style={{ color: "#00d4ff" }}>0818 788 000</a>
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    <a href="/hearing-test" style={{ padding: "12px 24px", background: "linear-gradient(135deg,#00d4ff,#7c3aed)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, textDecoration: "none", display: "inline-block" }}>
                        🎧 Đo lại thính lực
                    </a>
                    <a href="/" style={{ padding: "12px 24px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#e8ecf4", fontWeight: 600, textDecoration: "none", display: "inline-block" }}>
                        ← Trang chủ
                    </a>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {fromTest && (
                <div style={{ padding: "12px 16px", background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 12, fontSize: "0.85rem", color: "#94a3b8" }}>
                    🦻 Kết quả đo thính lực của bạn đã được lưu và sẽ được đính kèm vào lịch hẹn.
                </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                    <label style={labelStyle}>Họ và tên *</label>
                    <input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)}
                        placeholder="Nguyễn Văn A" required />
                </div>
                <div>
                    <label style={labelStyle}>Số điện thoại *</label>
                    <input style={inputStyle} value={form.phone} onChange={e => set("phone", e.target.value)}
                        placeholder="0912 345 678" type="tel" required />
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                    <label style={labelStyle}>Email</label>
                    <input style={inputStyle} value={form.email} onChange={e => set("email", e.target.value)}
                        placeholder="email@example.com" type="email" />
                </div>
                <div>
                    <label style={labelStyle}>Chi nhánh *</label>
                    <select style={{ ...inputStyle, cursor: "pointer" }} value={form.branch} onChange={e => set("branch", e.target.value)} required>
                        {BRANCHES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                    </select>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                    <label style={labelStyle}>Ngày hẹn *</label>
                    <input style={inputStyle} value={form.preferredDate} onChange={e => set("preferredDate", e.target.value)}
                        type="date" min={minDateStr} required />
                </div>
                <div>
                    <label style={labelStyle}>Khung giờ</label>
                    <select style={{ ...inputStyle, cursor: "pointer" }} value={form.preferredTime} onChange={e => set("preferredTime", e.target.value)}>
                        <option value="">Chọn giờ (tuỳ chọn)</option>
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            <div>
                <label style={labelStyle}>Ghi chú thêm</label>
                <textarea style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
                    value={form.note} onChange={e => set("note", e.target.value)}
                    placeholder="Mô tả triệu chứng, câu hỏi, hoặc yêu cầu đặc biệt..." />
            </div>

            {errMsg && (
                <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#ef4444", fontSize: "0.85rem" }}>
                    ⚠️ {errMsg}
                </div>
            )}

            <button type="submit" disabled={status === "submitting"} style={{
                padding: "14px", background: status === "submitting" ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#00d4ff,#7c3aed)",
                border: "none", borderRadius: 14, color: "#fff", fontWeight: 800, fontSize: "1.05rem",
                cursor: status === "submitting" ? "not-allowed" : "pointer", letterSpacing: "0.02em",
            }}>
                {status === "submitting" ? "Đang gửi..." : "📅 Xác nhận đặt lịch"}
            </button>

            <p style={{ textAlign: "center", color: "#475569", fontSize: "0.8rem", margin: 0 }}>
                Hoặc liên hệ trực tiếp:{" "}
                <a href="https://zalo.me/818788000" target="_blank" rel="noopener noreferrer" style={{ color: "#00d4ff" }}>Zalo</a>
                {" · "}
                <a href="tel:0818788000" style={{ color: "#00d4ff" }}>0818 788 000</a>
            </p>
        </form>
    );
}

export default function BookingPage() {
    return (
        <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0f1e,#0f1b35)", fontFamily: "'Inter',sans-serif", color: "#e8ecf4", padding: "40px 20px" }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'); * { box-sizing: border-box; }`}</style>
            <div style={{ maxWidth: 600, margin: "0 auto" }}>
                {/* Header */}
                <div style={{ textAlign: "center", marginBottom: 36 }}>
                    <a href="/" style={{ color: "#64748b", fontSize: "0.85rem", textDecoration: "none", display: "inline-block", marginBottom: 20 }}>← Trang chủ</a>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
                    <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 8px" }}>Đặt Lịch Hẹn</h1>
                    <p style={{ color: "#94a3b8", margin: 0 }}>Tư vấn và kiểm tra thính lực tại Phúc An Hearing</p>
                </div>

                {/* Info card */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "16px 20px", marginBottom: 24, display: "flex", gap: 20, flexWrap: "wrap" }}>
                    {[
                        { icon: "🕐", text: "Thứ 2 — Thứ 7", sub: "08:00 — 17:00" },
                        { icon: "📍", text: "Phúc An Hearing", sub: "Hà Nội, TP.HCM" },
                        { icon: "🆓", text: "Tư vấn miễn phí", sub: "Không mất phí" },
                    ].map(i => (
                        <div key={i.text} style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 150px" }}>
                            <span style={{ fontSize: 22 }}>{i.icon}</span>
                            <div>
                                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e8ecf4" }}>{i.text}</div>
                                <div style={{ fontSize: "0.76rem", color: "#64748b" }}>{i.sub}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Form */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: "28px 28px" }}>
                    <Suspense fallback={<div style={{ color: "#64748b", textAlign: "center", padding: 24 }}>Đang tải...</div>}>
                        <BookingForm />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
