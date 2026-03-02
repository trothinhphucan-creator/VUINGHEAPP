export default function SoundLevelMeterLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#0a0f1e,#0f1b35)",
        fontFamily: "'Inter',sans-serif",
        color: "#e8ecf4",
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>

      {/* Nav */}
      <nav style={{ padding: "16px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>PAH.</div>
        <div style={{ width: 60, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.05)" }} />
      </nav>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px 80px" }}>
        {/* Header Shimmer */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 80, height: 80, borderRadius: 12, background: "rgba(255,255,255,0.05)", margin: "0 auto 16px" }} />
          <div style={{ width: 400, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)", margin: "0 auto 16px" }} className="shimmer" />
          <div style={{ width: 500, height: 16, borderRadius: 6, background: "rgba(255,255,255,0.03)", margin: "0 auto" }} />
        </div>

        {/* Main Meter Shimmer */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 40, marginBottom: 32, textAlign: "center" }}>
          <div style={{ width: "100%", height: 160, borderRadius: 20, background: "rgba(255,255,255,0.03)", marginBottom: 24 }} className="shimmer" />
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
            <div style={{ width: 140, height: 44, borderRadius: 20, background: "rgba(255,255,255,0.05)" }} className="shimmer" />
            <div style={{ width: 140, height: 44, borderRadius: 20, background: "rgba(255,255,255,0.05)" }} className="shimmer" />
          </div>
        </div>

        {/* Spectrum Shimmer */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 24, marginBottom: 32 }}>
          <div style={{ width: 200, height: 20, borderRadius: 8, background: "rgba(255,255,255,0.05)", marginBottom: 16 }} className="shimmer" />
          <div style={{ width: "100%", height: 120, borderRadius: 12, background: "rgba(255,255,255,0.03)" }} className="shimmer" />
        </div>

        {/* Reference Chart Shimmer */}
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 24 }}>
          <div style={{ width: 250, height: 20, borderRadius: 8, background: "rgba(255,255,255,0.05)", marginBottom: 16 }} className="shimmer" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.05)" }} />
              <div style={{ flex: 1, height: 16, borderRadius: 6, background: "rgba(255,255,255,0.05)" }} className="shimmer" />
              <div style={{ width: 60, height: 24, borderRadius: 8, background: "rgba(255,255,255,0.05)" }} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
