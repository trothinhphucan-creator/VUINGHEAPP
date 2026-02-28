"use client";

export default function Error({ error, reset }) {
    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            background: "#0a0f1e", fontFamily: "var(--font-inter), sans-serif", padding: 24,
        }}>
            <div style={{
                maxWidth: 480, textAlign: "center", background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20, padding: "40px 32px",
            }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                <h2 style={{ color: "#e8ecf4", fontSize: "1.3rem", fontWeight: 700, marginBottom: 12 }}>
                    Có lỗi xảy ra
                </h2>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.7, marginBottom: 24 }}>
                    Ứng dụng gặp sự cố không mong muốn. Vui lòng thử lại hoặc quay về trang chủ.
                </p>
                {process.env.NODE_ENV === "development" && error?.message && (
                    <pre style={{
                        background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                        borderRadius: 8, padding: 12, fontSize: "0.72rem", color: "#ef4444",
                        textAlign: "left", overflow: "auto", maxHeight: 120, marginBottom: 20,
                    }}>
                        {error.message}
                    </pre>
                )}
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                    <button
                        onClick={reset}
                        style={{
                            padding: "10px 24px", background: "linear-gradient(135deg,#00d4ff,#7c3aed)",
                            border: "none", borderRadius: 10, color: "#fff", fontWeight: 700,
                            fontSize: "0.9rem", cursor: "pointer",
                        }}
                    >
                        🔄 Thử lại
                    </button>
                    <a
                        href="/"
                        style={{
                            padding: "10px 24px", background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                            color: "#94a3b8", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none",
                        }}
                    >
                        🏠 Trang chủ
                    </a>
                </div>
            </div>
        </div>
    );
}
