/**
 * Badge Component
 * Display status, severity, or labels with consistent styling
 */

import { COMPONENT_STYLES, HEALTH_STATUS, HEARING_SEVERITY } from "@/lib/brand-tokens";

export function Badge({
  variant = "status",
  type = "pending",
  label,
  color,
  bgColor,
  children,
  size = "md",
  ...props
}) {
  // Pre-configured badge types
  const typeConfigs = {
    ...HEALTH_STATUS,
    ...HEARING_SEVERITY,
  };

  const config = typeConfigs[type];
  const textColor = color || config?.color || "#94a3b8";
  const bgCol = bgColor || config?.bg || "rgba(255,255,255,0.1)";
  const text = label || children || config?.label || type;

  const sizeStyles = {
    sm: { padding: "2px 8px", fontSize: "0.7rem" },
    md: { padding: "2px 10px", fontSize: "0.75rem" },
    lg: { padding: "4px 12px", fontSize: "0.85rem" },
  };

  const badgeStyle = {
    padding: sizeStyles[size].padding,
    fontSize: sizeStyles[size].fontSize,
    borderRadius: "20px",
    fontWeight: 700,
    background: bgCol,
    color: textColor,
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    whiteSpace: "nowrap",
  };

  return <span style={badgeStyle} {...props}>{text}</span>;
}

export default Badge;
