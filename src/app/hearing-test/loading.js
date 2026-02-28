export default function HearingTestLoading() {
    return (
        <div style={{
            minHeight: "100vh", background: "#0a0f1e", padding: "40px 20px",
            display: "flex", alignItems: "center", justifyContent: "center",
        }}>
            <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
                <div style={{
                    width: 56, height: 56, border: "3px solid rgba(0,212,255,0.15)",
                    borderTop: "3px solid #00d4ff", borderRadius: "50%",
                    animation: "spin 1s linear infinite", margin: "0 auto 20px",
                }} />
                <div style={{ color: "#e8ecf4", fontWeight: 700, fontSize: "1.1rem", marginBottom: 8 }}>
                    Đang tải bài đo thính lực...
                </div>
                <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
                    Vui lòng đeo tai nghe và chờ trong giây lát
                </div>
            </div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }`}</style>
        </div>
    );
}
