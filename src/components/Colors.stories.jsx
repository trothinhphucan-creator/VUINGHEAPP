import { COLORS, HEARING_SEVERITY, HEALTH_STATUS } from "@/lib/brand-tokens";

export default {
  title: "Design Tokens/Colors",
  parameters: {
    layout: "fullscreen",
  },
};

function ColorBox({ hex, name, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <div
        style={{
          width: "120px",
          height: "120px",
          background: hex,
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
      />
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "#e8ecf4", fontWeight: 600, fontSize: "0.9rem" }}>
          {name}
        </div>
        <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontFamily: "monospace" }}>
          {hex}
        </div>
        {label && (
          <div style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "4px" }}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
}

export const PrimaryColors = {
  render: () => (
    <div style={{ padding: "40px", background: "#0a0f1e", minHeight: "100vh" }}>
      <h2 style={{ color: "#e8ecf4", marginBottom: "32px" }}>Primary Colors</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "32px" }}>
        <ColorBox hex={COLORS.primary.cyan} name="Cyan" label="Primary Action" />
        <ColorBox hex={COLORS.primary.purple} name="Purple" label="Secondary Action" />
      </div>
    </div>
  ),
};

export const NeutralColors = {
  render: () => (
    <div style={{ padding: "40px", background: "#0a0f1e", minHeight: "100vh" }}>
      <h2 style={{ color: "#e8ecf4", marginBottom: "32px" }}>Neutral Colors</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "32px" }}>
        <ColorBox hex={COLORS.neutral.white} name="White" label="Primary Text" />
        <ColorBox hex={COLORS.neutral.softWhite} name="Soft White" label="Text" />
        <ColorBox hex={COLORS.neutral.lightGray} name="Light Gray" label="Secondary Text" />
        <ColorBox hex={COLORS.neutral.mediumGray} name="Medium Gray" label="Tertiary Text" />
        <ColorBox hex={COLORS.neutral.darkGray} name="Dark Gray" label="Borders" />
        <ColorBox hex={COLORS.neutral.darkNavy} name="Dark Navy" label="Background" />
      </div>
    </div>
  ),
};

export const HealthcareColors = {
  render: () => (
    <div style={{ padding: "40px", background: "#0a0f1e", minHeight: "100vh" }}>
      <h2 style={{ color: "#e8ecf4", marginBottom: "32px" }}>Healthcare Colors (Hearing Loss Severity)</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "32px" }}>
        <ColorBox hex={COLORS.healthcare.normal} name="Normal" label="≤ 25 dB HL" />
        <ColorBox hex={COLORS.healthcare.mild} name="Mild" label="26-40 dB HL" />
        <ColorBox hex={COLORS.healthcare.moderate} name="Moderate" label="41-55 dB HL" />
        <ColorBox hex={COLORS.healthcare.moderateSevere} name="Moderate-Severe" label="56-70 dB HL" />
        <ColorBox hex={COLORS.healthcare.severe} name="Severe" label="71-90 dB HL" />
        <ColorBox hex={COLORS.healthcare.profound} name="Profound" label="> 90 dB HL" />
      </div>
    </div>
  ),
};

export const StatusColors = {
  render: () => (
    <div style={{ padding: "40px", background: "#0a0f1e", minHeight: "100vh" }}>
      <h2 style={{ color: "#e8ecf4", marginBottom: "32px" }}>Status Colors</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "32px" }}>
        <ColorBox hex={COLORS.status.pending} name="Pending" label="Chờ xử lý" />
        <ColorBox hex={COLORS.status.confirmed} name="Confirmed" label="Đã xác nhận" />
        <ColorBox hex={COLORS.status.cancelled} name="Cancelled" label="Đã huỷ" />
      </div>
    </div>
  ),
};

export const LightModeColors = {
  render: () => (
    <div style={{ padding: "40px", background: "#ffffff", minHeight: "100vh" }}>
      <h2 style={{ color: "#0f172a", marginBottom: "32px" }}>Light Mode Colors</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "32px" }}>
        <ColorBox hex={COLORS.light.bg.primary} name="Background Primary" label="Light Mode" />
        <ColorBox hex={COLORS.light.bg.secondary} name="Background Secondary" label="Cards" />
        <ColorBox hex={COLORS.light.bg.tertiary} name="Background Tertiary" label="Hover" />
        <ColorBox hex={COLORS.light.text.primary} name="Text Primary" label="Headings" />
        <ColorBox hex={COLORS.light.text.secondary} name="Text Secondary" label="Body" />
        <ColorBox hex={COLORS.light.text.tertiary} name="Text Tertiary" label="Secondary" />
      </div>
    </div>
  ),
};

export const Palette = {
  render: () => (
    <div style={{ padding: "40px", background: "#0a0f1e", minHeight: "100vh" }}>
      <h2 style={{ color: "#e8ecf4", marginBottom: "48px" }}>Complete Color Palette</h2>

      <div style={{ marginBottom: "60px" }}>
        <h3 style={{ color: "#94a3b8", fontSize: "0.95rem", marginBottom: "24px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Primary</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
          <ColorBox hex={COLORS.primary.cyan} name="Cyan" label="#00d4ff" />
          <ColorBox hex={COLORS.primary.purple} name="Purple" label="#7c3aed" />
        </div>
      </div>

      <div style={{ marginBottom: "60px" }}>
        <h3 style={{ color: "#94a3b8", fontSize: "0.95rem", marginBottom: "24px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Healthcare Severity</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
          <ColorBox hex={COLORS.healthcare.normal} name="Normal" label="✅" />
          <ColorBox hex={COLORS.healthcare.mild} name="Mild" label="🟡" />
          <ColorBox hex={COLORS.healthcare.moderate} name="Moderate" label="🟠" />
          <ColorBox hex={COLORS.healthcare.moderateSevere} name="Moderate-Severe" label="🔴" />
          <ColorBox hex={COLORS.healthcare.severe} name="Severe" label="🔴" />
          <ColorBox hex={COLORS.healthcare.profound} name="Profound" label="🟣" />
        </div>
      </div>

      <div>
        <h3 style={{ color: "#94a3b8", fontSize: "0.95rem", marginBottom: "24px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Neutrals</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "24px" }}>
          <ColorBox hex={COLORS.neutral.white} name="White" label="#ffffff" />
          <ColorBox hex={COLORS.neutral.softWhite} name="Soft White" label="#e8ecf4" />
          <ColorBox hex={COLORS.neutral.lightGray} name="Light Gray" label="#94a3b8" />
          <ColorBox hex={COLORS.neutral.mediumGray} name="Medium Gray" label="#64748b" />
          <ColorBox hex={COLORS.neutral.darkGray} name="Dark Gray" label="#334155" />
          <ColorBox hex={COLORS.neutral.darkNavy} name="Dark Navy" label="#0a0f1e" />
        </div>
      </div>
    </div>
  ),
};
