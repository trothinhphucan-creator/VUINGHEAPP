"use client";

import { useState, useEffect } from "react";
import { isInAppBrowser, getInAppBrowserName, openInExternalBrowser, copyCurrentUrl } from "@/lib/in-app-browser";

/**
 * Full-screen guard shown when user opens the app in an in-app browser.
 * Prompts to open in external browser (Safari / Chrome).
 */
export default function InAppBrowserGuard() {
    const [isInApp, setIsInApp] = useState(false);
    const [appName, setAppName] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isInAppBrowser()) {
            setIsInApp(true);
            setAppName(getInAppBrowserName());
        }
    }, []);

    if (!isInApp) return null;

    const handleCopy = async () => {
        const ok = await copyCurrentUrl();
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #0a0f1e, #0f1b35, #1a0f2e)",
            fontFamily: "'Inter', sans-serif", color: "#e8ecf4",
            padding: 20,
        }}>
            <style>{`
                @keyframes guardIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:none; } }
                @keyframes bounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
            `}</style>

            <div style={{
                maxWidth: 420, width: "100%", textAlign: "center",
                animation: "guardIn 0.4s ease-out",
            }}>
                {/* Icon */}
                <div style={{ fontSize: 64, marginBottom: 16, animation: "bounce 2s ease-in-out infinite" }}>🌐</div>

                <h1 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: 12, lineHeight: 1.3 }}>
                    Mở bằng trình duyệt
                </h1>

                <p style={{ color: "#94a3b8", fontSize: "0.92rem", marginBottom: 24, lineHeight: 1.7 }}>
                    Bạn đang mở trang này từ <strong style={{ color: "#00d4ff" }}>{appName}</strong>.
                    Để đăng nhập Google và sử dụng đầy đủ tính năng, hãy mở bằng trình duyệt ngoài (Safari hoặc Chrome).
                </p>

                {/* Step-by-step instructions */}
                <div style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 18, padding: "20px 24px",
                    textAlign: "left", marginBottom: 24,
                }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 14, color: "#e8ecf4" }}>
                        📋 Cách mở:
                    </div>
                    {[
                        { step: "1", text: "Nhấn nút \"Mở trình duyệt\" bên dưới" },
                        { step: "2", text: `Hoặc nhấn ⋮ / ⋯ (góc trên phải) → "Mở trong trình duyệt"` },
                        { step: "3", text: "Hoặc sao chép link → dán vào Safari / Chrome" },
                    ].map((item, i) => (
                        <div key={i} style={{
                            display: "flex", gap: 12, alignItems: "flex-start",
                            marginBottom: i < 2 ? 10 : 0,
                        }}>
                            <span style={{
                                background: "rgba(0,212,255,0.15)",
                                color: "#00d4ff", fontWeight: 700,
                                width: 26, height: 26, borderRadius: "50%",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "0.78rem", flexShrink: 0,
                            }}>{item.step}</span>
                            <span style={{ fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.5, paddingTop: 3 }}>
                                {item.text}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Action buttons */}
                <div style={{ display: "grid", gap: 10 }}>
                    <button
                        onClick={openInExternalBrowser}
                        style={{
                            width: "100%", padding: "16px 24px",
                            background: "linear-gradient(135deg, #00d4ff, #7c3aed)",
                            border: "none", borderRadius: 16,
                            color: "#fff", fontSize: "1rem", fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 8px 30px rgba(0,212,255,0.3)",
                            transition: "all 0.3s",
                            fontFamily: "'Inter', sans-serif",
                        }}
                    >
                        🌐 Mở trình duyệt
                    </button>

                    <button
                        onClick={handleCopy}
                        style={{
                            width: "100%", padding: "14px 24px",
                            background: copied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)",
                            border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`,
                            borderRadius: 14,
                            color: copied ? "#10b981" : "#94a3b8",
                            fontSize: "0.92rem", fontWeight: 600,
                            cursor: "pointer", transition: "all 0.3s",
                            fontFamily: "'Inter', sans-serif",
                        }}
                    >
                        {copied ? "✓ Đã sao chép link!" : "📋 Sao chép link"}
                    </button>
                </div>

                {/* Footer */}
                <p style={{ marginTop: 20, fontSize: "0.75rem", color: "#475569", lineHeight: 1.6 }}>
                    Google không cho phép đăng nhập từ trình duyệt trong ứng dụng vì lý do bảo mật.
                </p>
            </div>
        </div>
    );
}
