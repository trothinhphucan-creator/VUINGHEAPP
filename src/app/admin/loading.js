export default function AdminLoading() {
    return (
        <div style={{
            minHeight: "100vh", background: "#0a0f1e", padding: "60px 20px",
            display: "flex", alignItems: "center", justifyContent: "center",
        }}>
            <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
                <div className="skeleton" style={{ width: 64, height: 64, borderRadius: "50%", margin: "0 auto 20px" }} />
                <div className="skeleton" style={{ width: 200, height: 20, borderRadius: 6, margin: "0 auto 10px" }} />
                <div className="skeleton" style={{ width: 280, height: 14, borderRadius: 6, margin: "0 auto 24px" }} />
                <div className="skeleton" style={{ width: 180, height: 44, borderRadius: 10, margin: "0 auto" }} />
            </div>
            <style>{`
                .skeleton {
                    background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                }
                @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
            `}</style>
        </div>
    );
}
