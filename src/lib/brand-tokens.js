/**
 * PAH Brand Design Tokens
 * Central source of truth for colors, typography, spacing, etc.
 * Last updated: 2026-03-02
 */

export const BRAND = {
  name: "Phúc An Hearing (PAH)",
  domain: "vuinghe.com",
};

// ═══════════════════════════════════════════════════════
// COLOR PALETTE
// ═══════════════════════════════════════════════════════

export const COLORS = {
  // Primary Colors
  primary: {
    cyan: "#00d4ff",
    purple: "#7c3aed",
    gradient: "linear-gradient(135deg, #00d4ff, #7c3aed)",
  },

  // Neutrals
  neutral: {
    white: "#ffffff",
    softWhite: "#e8ecf4",
    lightGray: "#94a3b8",
    mediumGray: "#64748b",
    darkGray: "#334155",
    darkNavy: "#0a0f1e",
  },

  // Light Mode Colors
  light: {
    bg: {
      primary: "#ffffff",
      secondary: "#f8fafc",
      tertiary: "#e2e8f0",
    },
    text: {
      primary: "#0f172a",
      secondary: "#334155",
      tertiary: "#64748b",
    },
    border: {
      light: "#e2e8f0",
      medium: "#cbd5e1",
      dark: "#94a3b8",
    },
  },

  // Healthcare Severity (PTA Classification)
  healthcare: {
    normal: "#10b981",      // ≤ 25 dB HL - Green
    mild: "#f59e0b",        // 26-40 dB HL - Amber
    moderate: "#f97316",    // 41-55 dB HL - Orange
    moderateSevere: "#ef4444", // 56-70 dB HL - Red
    severe: "#dc2626",      // 71-90 dB HL - Dark Red
    profound: "#9333ea",    // > 90 dB HL - Purple
  },

  // Status Colors
  status: {
    pending: "#f59e0b",
    confirmed: "#10b981",
    cancelled: "#ef4444",
  },

  // Backgrounds
  bg: {
    primary: "#0a0f1e",
    secondary: "rgba(255,255,255,0.03)",
    hover: "rgba(255,255,255,0.06)",
    disabled: "rgba(255,255,255,0.02)",
  },

  // Borders
  border: {
    light: "rgba(255,255,255,0.1)",
    medium: "rgba(255,255,255,0.08)",
    dark: "rgba(255,255,255,0.15)",
  },
};

// ═══════════════════════════════════════════════════════
// TYPOGRAPHY
// ═══════════════════════════════════════════════════════

export const TYPOGRAPHY = {
  font: {
    primary: "'Inter', sans-serif",
    secondary: "'Roboto', sans-serif",
    mono: "'Monaco', 'Courier New', monospace",
  },

  weight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  size: {
    xs: "clamp(0.75rem, 0.8vw, 0.9rem)",    // 12px - 14.4px
    sm: "clamp(0.85rem, 1vw, 1rem)",        // 13.6px - 16px
    base: "clamp(0.95rem, 1.5vw, 1.1rem)",  // 15.2px - 17.6px
    lg: "clamp(1rem, 2vw, 1.2rem)",         // 16px - 19.2px
    xl: "clamp(1.1rem, 2.5vw, 1.4rem)",     // 17.6px - 22.4px
    "2xl": "clamp(1.3rem, 3vw, 1.7rem)",    // 20.8px - 27.2px
  },

  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },

  letterSpacing: {
    normal: "0em",
    wide: "0.04em",
    wider: "0.08em",
  },
};

// ═══════════════════════════════════════════════════════
// SPACING SCALE
// ═══════════════════════════════════════════════════════

export const SPACING = {
  2: "2px",
  4: "4px",
  6: "6px",
  8: "8px",
  10: "10px",
  12: "12px",
  14: "14px",
  16: "16px",
  18: "18px",
  20: "20px",
  24: "24px",
  28: "28px",
  32: "32px",
  40: "40px",
  48: "48px",
};

// ═══════════════════════════════════════════════════════
// BORDER RADIUS
// ═══════════════════════════════════════════════════════

export const RADIUS = {
  sm: "4px",
  base: "8px",
  md: "10px",
  lg: "12px",
  xl: "14px",
  "2xl": "16px",
  "3xl": "20px",
  full: "9999px",
};

// ═══════════════════════════════════════════════════════
// SHADOWS
// ═══════════════════════════════════════════════════════

export const SHADOWS = {
  none: "none",
  sm: "0 2px 4px rgba(0, 0, 0, 0.1)",
  md: "0 4px 12px rgba(0, 0, 0, 0.15)",
  lg: "0 8px 24px rgba(0, 0, 0, 0.2)",
  gradient: "-10px 9px 10px rgba(0, 212, 255, 0.15)",
  glow: "0 0 0 3px rgba(0, 212, 255, 0.1)",
};

// ═══════════════════════════════════════════════════════
// COMPONENT STYLES
// ═══════════════════════════════════════════════════════

export const COMPONENT_STYLES = {
  // Button Styles
  button: {
    base: {
      padding: "10px 20px",
      border: "none",
      borderRadius: RADIUS.lg,
      fontWeight: TYPOGRAPHY.weight.semibold,
      cursor: "pointer",
      transition: "all 0.2s ease",
      fontSize: TYPOGRAPHY.size.base,
    },
    primary: {
      background: COLORS.primary.gradient,
      color: COLORS.neutral.white,
      boxShadow: `0 4px 15px rgba(0, 212, 255, 0.25)`,
    },
    secondary: {
      background: COLORS.bg.secondary,
      border: `1px solid ${COLORS.border.light}`,
      color: COLORS.neutral.lightGray,
    },
    danger: {
      background: "rgba(239, 68, 68, 0.1)",
      border: "1px solid rgba(239, 68, 68, 0.2)",
      color: COLORS.status.cancelled,
    },
  },

  // Input Styles
  input: {
    base: {
      width: "100%",
      padding: "10px 14px",
      background: COLORS.bg.secondary,
      border: `1px solid ${COLORS.border.light}`,
      borderRadius: RADIUS.base,
      color: COLORS.neutral.softWhite,
      fontSize: TYPOGRAPHY.size.base,
      outline: "none",
      fontFamily: TYPOGRAPHY.font.primary,
      transition: "border-color 0.2s ease",
    },
    focus: {
      borderColor: "rgba(0, 212, 255, 0.4)",
      boxShadow: "0 0 0 3px rgba(0, 212, 255, 0.1)",
    },
  },

  // Card Styles
  card: {
    base: {
      background: COLORS.bg.secondary,
      backdropFilter: "blur(20px)",
      border: `1px solid ${COLORS.border.medium}`,
      borderRadius: RADIUS.xl,
      padding: "20px 24px",
    },
  },

  // Badge Styles
  badge: {
    pending: {
      bg: "rgba(245, 158, 11, 0.1)",
      color: COLORS.status.pending,
    },
    confirmed: {
      bg: "rgba(16, 185, 129, 0.1)",
      color: COLORS.status.confirmed,
    },
    cancelled: {
      bg: "rgba(239, 68, 68, 0.1)",
      color: COLORS.status.cancelled,
    },
    branch: {
      bg: "rgba(124, 58, 237, 0.1)",
      color: COLORS.primary.purple,
    },
  },
};

// ═══════════════════════════════════════════════════════
// STATUS & SEVERITY CLASSIFICATIONS
// ═══════════════════════════════════════════════════════

export const HEALTH_STATUS = {
  pending: { label: "Chờ xử lý", color: COLORS.status.pending },
  confirmed: { label: "Đã xác nhận", color: COLORS.status.confirmed },
  cancelled: { label: "Đã huỷ", color: COLORS.status.cancelled },
};

export const HEARING_SEVERITY = {
  normal: { label: "Bình thường", color: COLORS.healthcare.normal, pta: "≤ 25 dB" },
  mild: { label: "Nhẹ", color: COLORS.healthcare.mild, pta: "26-40 dB" },
  moderate: { label: "Trung bình", color: COLORS.healthcare.moderate, pta: "41-55 dB" },
  moderateSevere: { label: "TB-Nặng", color: COLORS.healthcare.moderateSevere, pta: "56-70 dB" },
  severe: { label: "Nặng", color: COLORS.healthcare.severe, pta: "71-90 dB" },
  profound: { label: "Sâu", color: COLORS.healthcare.profound, pta: "> 90 dB" },
};

export const PIPELINE_STAGES = [
  { value: "new", label: "Mới", color: "#94a3b8" },
  { value: "contacted", label: "Đã liên hệ", color: COLORS.primary.cyan },
  { value: "visited", label: "Đã đến khám", color: "#f59e0b" },
  { value: "sold", label: "Đã bán", color: COLORS.status.confirmed },
  { value: "follow_up", label: "Theo dõi", color: COLORS.primary.purple },
];

export const BRANCHES = [
  { value: "hanoi", label: "Hà Nội", emoji: "🏢" },
  { value: "hcm", label: "TP.HCM", emoji: "🏢" },
  { value: "danang", label: "Đà Nẵng", emoji: "🏢" },
  { value: "online", label: "Tư vấn Online", emoji: "📞" },
];

// ═══════════════════════════════════════════════════════
// RESPONSIVE BREAKPOINTS
// ═══════════════════════════════════════════════════════

export const BREAKPOINTS = {
  mobile: 0,
  tablet: 640,
  desktop: 1024,
  wide: 1280,
};

export const MEDIA_QUERIES = {
  mobile: "@media (max-width: 639px)",
  tablet: "@media (min-width: 640px) and (max-width: 1023px)",
  desktop: "@media (min-width: 1024px)",
  wide: "@media (min-width: 1280px)",
};

// ═══════════════════════════════════════════════════════
// TRANSITIONS & ANIMATIONS
// ═══════════════════════════════════════════════════════

export const TRANSITIONS = {
  fast: "0.15s ease",
  base: "0.2s ease",
  slow: "0.3s ease",
};

export const ANIMATIONS = {
  fadeUp: "fadeUp 0.4s ease both",
  spin: "spin 1s linear infinite",
  pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
};

// ═══════════════════════════════════════════════════════
// EXPORT HELPER FUNCTION
// ═══════════════════════════════════════════════════════

/**
 * Get contrast-appropriate text color based on background
 * @param {string} bgColor - Background color hex or rgb
 * @returns {string} - Text color (white or dark navy)
 */
export function getTextColor(bgColor) {
  // Simple luminance calculation
  if (bgColor.includes("#")) {
    const hex = bgColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? COLORS.neutral.darkNavy : COLORS.neutral.softWhite;
  }
  return COLORS.neutral.softWhite;
}

/**
 * Theme configuration for dark/light modes
 * @param {string} mode - "dark" or "light"
 * @returns {object} - Complete theme colors
 */
export function getTheme(mode = "dark") {
  const themes = {
    dark: {
      bg: COLORS.bg.primary,
      text: COLORS.neutral.softWhite,
      textSecondary: COLORS.neutral.lightGray,
      border: COLORS.border.light,
      card: COLORS.bg.secondary,
    },
    light: {
      bg: COLORS.light.bg.primary,
      text: COLORS.light.text.primary,
      textSecondary: COLORS.light.text.secondary,
      border: COLORS.light.border.light,
      card: COLORS.light.bg.secondary,
    },
  };
  return themes[mode] || themes.dark;
}

export default {
  BRAND,
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  COMPONENT_STYLES,
  HEALTH_STATUS,
  HEARING_SEVERITY,
  PIPELINE_STAGES,
  BRANCHES,
  BREAKPOINTS,
  MEDIA_QUERIES,
  TRANSITIONS,
  ANIMATIONS,
};
