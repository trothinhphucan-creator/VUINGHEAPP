export default function NotFound() {
    return (
        <div style={{
            minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
            background: "#0a0f1e", fontFamily: "var(--font-inter), sans-serif", padding: 24,
        }}>
            <div style={{ maxWidth: 440, textAlign: "center" }}>
                <div style={{ fontSize: 64, marginBottom: 12 }}>🔇</div>
                <h1 style={{ color: "#e8ecf4", fontSize: "2rem", fontWeight: 800, marginBottom: 8 }}>
                    404
                </h1>
                <p style={{ color: "#64748b", fontSize: "1rem", marginBottom: 28, lineHeight: 1.7 }}>
                    Trang bạn tìm không tồn tại hoặc đã được di chuyển.
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    <a href="/" style={{
                        padding: "12px 28px", background: "linear-gradient(135deg,#00d4ff,#7c3aed)",
                        borderRadius: 10, color: "#fff", fontWeight: 700, textDecoration: "none", fontSize: "0.9rem",
                    }}>
                        🏠 Về trang chủ
                    </a>
                    <a href="/hearing-test" style={{
                        padding: "12px 28px", background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                        color: "#94a3b8", fontWeight: 600, textDecoration: "none", fontSize: "0.9rem",
                    }}>
                        🎧 Đo thính lực
                    </a>
                </div>
            </div>
        </div>
    );
}
