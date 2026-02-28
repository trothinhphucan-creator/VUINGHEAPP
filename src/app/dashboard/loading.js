export default function DashboardLoading() {
    return (
        <div style={{
            minHeight: "100vh", background: "#0a0f1e", padding: "80px 20px 40px",
            display: "flex", justifyContent: "center",
        }}>
            <div style={{ maxWidth: 700, width: "100%" }}>
                {/* Header skeleton */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 32 }}>
                    <div className="skeleton" style={{ width: 48, height: 48, borderRadius: "50%" }} />
                    <div>
                        <div className="skeleton" style={{ width: 160, height: 18, borderRadius: 6, marginBottom: 6 }} />
                        <div className="skeleton" style={{ width: 220, height: 14, borderRadius: 6 }} />
                    </div>
                </div>
                {/* Tab bar */}
                <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
                    {[100, 80, 90].map((w, i) => (
                        <div key={i} className="skeleton" style={{ width: w, height: 36, borderRadius: 8 }} />
                    ))}
                </div>
                {/* Cards */}
                {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton" style={{ width: "100%", height: 100, borderRadius: 16, marginBottom: 12 }} />
                ))}
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
