import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Đo Thính Lực Online Miễn Phí — Phúc An Hearing";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%", height: "100%",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: "linear-gradient(135deg,#0a0f1e 0%,#0f1b35 50%,#1a0a35 100%)",
                    fontFamily: "sans-serif", padding: 60, position: "relative",
                }}
            >
                {/* Glow blobs */}
                <div style={{ position: "absolute", top: 80, left: 120, width: 300, height: 300, borderRadius: "50%", background: "rgba(0,212,255,0.08)", filter: "blur(80px)" }} />
                <div style={{ position: "absolute", bottom: 80, right: 120, width: 280, height: 280, borderRadius: "50%", background: "rgba(124,58,237,0.1)", filter: "blur(80px)" }} />

                {/* Ear icon */}
                <div style={{ fontSize: 80, marginBottom: 24 }}>🦻</div>

                {/* Headline */}
                <div style={{ fontSize: 52, fontWeight: 900, color: "#ffffff", textAlign: "center", lineHeight: 1.2, marginBottom: 20 }}>
                    Đo Thính Lực Online{" "}
                    <span style={{ background: "linear-gradient(90deg,#00d4ff,#7c3aed)", backgroundClip: "text", color: "transparent" }}>
                        Miễn Phí
                    </span>
                </div>

                {/* Sub */}
                <div style={{ fontSize: 24, color: "#94a3b8", textAlign: "center", marginBottom: 40, maxWidth: 800 }}>
                    Phương pháp Hughson-Westlake chuẩn lâm sàng · 5 phút · Kết quả tức thì
                </div>

                {/* Stats row */}
                <div style={{ display: "flex", gap: 40 }}>
                    {[
                        { val: "6 tần số", sub: "Kiểm tra toàn diện" },
                        { val: "2 tai", sub: "Đo độc lập" },
                        { val: "100% miễn phí", sub: "Không cần tài khoản" },
                    ].map((s) => (
                        <div key={s.val} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: "#00d4ff" }}>{s.val}</div>
                            <div style={{ fontSize: 16, color: "#64748b", marginTop: 4 }}>{s.sub}</div>
                        </div>
                    ))}
                </div>

                {/* Brand */}
                <div style={{ position: "absolute", bottom: 32, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 18, color: "#475569" }}>hearingtest.pah.vn</div>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#475569" }} />
                    <div style={{ fontSize: 18, color: "#475569" }}>Phúc An Hearing (PAH)</div>
                </div>
            </div>
        ),
        { ...size }
    );
}
