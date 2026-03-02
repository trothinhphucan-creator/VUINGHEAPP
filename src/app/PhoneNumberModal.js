"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

/**
 * Phone number collection modal — shown after Google sign-in
 * if user hasn't provided their phone number yet.
 */
export default function PhoneNumberModal() {
    const { user, needsPhone, savePhoneNumber } = useAuth();
    const [phone, setPhone] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    if (!user || !needsPhone) return null;

    const validatePhone = (value) => {
        // Vietnamese phone number: 10 digits, starts with 0
        const cleaned = value.replace(/\D/g, "");
        if (cleaned.length !== 10) return "Số điện thoại phải có 10 chữ số";
        if (!cleaned.startsWith("0")) return "Số điện thoại phải bắt đầu bằng 0";
        return "";
    };

    const formatPhone = (value) => {
        const cleaned = value.replace(/\D/g, "").slice(0, 10);
        return cleaned;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const err = validatePhone(phone);
        if (err) {
            setError(err);
            return;
        }
        setSaving(true);
        setError("");
        const success = await savePhoneNumber(phone);
        if (!success) {
            setError("Không thể lưu số điện thoại. Vui lòng thử lại.");
        }
        setSaving(false);
    };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 10000,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
            fontFamily: "'Inter', sans-serif",
        }}>
            <div style={{
                background: "linear-gradient(135deg, #0f1b35, #1a0f2e)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 24, padding: "36px 32px",
                maxWidth: 420, width: "90%",
                boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
                animation: "phoneModalIn 0.3s ease-out",
            }}>
                <style>{`
                    @keyframes phoneModalIn {
                        from { opacity: 0; transform: translateY(20px) scale(0.95); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                `}</style>

                <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
                    <h2 style={{ color: "#e8ecf4", fontSize: "1.3rem", fontWeight: 700, marginBottom: 8 }}>
                        Nhập số điện thoại
                    </h2>
                    <p style={{ color: "#94a3b8", fontSize: "0.88rem", lineHeight: 1.6 }}>
                        Vui lòng nhập số điện thoại để chúng tôi có thể liên hệ tư vấn khi cần thiết.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* User info display */}
                    <div style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 16px", marginBottom: 20,
                        background: "rgba(255,255,255,0.04)", borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                        {user.photoURL && (
                            <img src={user.photoURL} alt="" style={{
                                width: 36, height: 36, borderRadius: "50%",
                                border: "2px solid rgba(0,212,255,0.3)",
                            }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: "#e8ecf4", fontSize: "0.88rem", fontWeight: 600 }}>
                                {user.displayName || "Người dùng"}
                            </div>
                            <div style={{ color: "#64748b", fontSize: "0.78rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {user.email}
                            </div>
                        </div>
                    </div>

                    {/* Phone input */}
                    <div style={{ marginBottom: 16 }}>
                        <label style={{
                            display: "block", fontSize: "0.82rem",
                            color: "#94a3b8", marginBottom: 6, fontWeight: 500,
                        }}>
                            Số điện thoại <span style={{ color: "#ef4444" }}>*</span>
                        </label>
                        <input
                            type="tel"
                            placeholder="VD: 0818788000"
                            value={phone}
                            onChange={(e) => {
                                setPhone(formatPhone(e.target.value));
                                setError("");
                            }}
                            autoFocus
                            style={{
                                width: "100%", padding: "14px 16px",
                                background: "rgba(255,255,255,0.06)",
                                border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`,
                                borderRadius: 14, color: "#e8ecf4",
                                fontSize: "1.05rem", fontWeight: 500,
                                letterSpacing: "0.5px",
                                outline: "none", transition: "border-color 0.2s",
                                fontFamily: "'Inter', sans-serif",
                            }}
                        />
                        {error && (
                            <div style={{
                                color: "#ef4444", fontSize: "0.8rem",
                                marginTop: 6, paddingLeft: 4,
                            }}>
                                ⚠️ {error}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={saving || phone.length < 10}
                        style={{
                            width: "100%", padding: "14px 24px",
                            background: phone.length >= 10
                                ? "linear-gradient(135deg, #00d4ff, #7c3aed)"
                                : "rgba(255,255,255,0.08)",
                            border: "none", borderRadius: 16,
                            color: phone.length >= 10 ? "#fff" : "#64748b",
                            fontSize: "1rem", fontWeight: 700,
                            cursor: phone.length >= 10 ? "pointer" : "not-allowed",
                            boxShadow: phone.length >= 10 ? "0 8px 25px rgba(0,212,255,0.3)" : "none",
                            transition: "all 0.3s",
                            fontFamily: "'Inter', sans-serif",
                        }}
                    >
                        {saving ? "Đang lưu..." : "✓ Xác nhận"}
                    </button>
                </form>

                <p style={{
                    textAlign: "center", marginTop: 16,
                    fontSize: "0.75rem", color: "#475569", lineHeight: 1.5,
                }}>
                    🔒 Thông tin được bảo mật theo chính sách riêng tư.
                </p>
            </div>
        </div>
    );
}
