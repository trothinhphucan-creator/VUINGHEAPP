/**
 * Input Component
 * Text input with consistent PAH styling
 */

import { COMPONENT_STYLES } from "@/lib/brand-tokens";

export function Input({
  type = "text",
  placeholder = "",
  value,
  onChange,
  disabled = false,
  error = false,
  label,
  size = "md",
  ...props
}) {
  const baseStyle = COMPONENT_STYLES.input.base;

  const sizeStyles = {
    sm: { padding: "8px 10px", fontSize: "0.85rem" },
    md: { padding: "10px 14px", fontSize: "0.95rem" },
    lg: { padding: "12px 16px", fontSize: "1rem" },
  };

  const inputStyle = {
    ...baseStyle,
    ...sizeStyles[size],
    borderColor: error ? "#ef4444" : "rgba(255,255,255,0.1)",
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? "not-allowed" : "auto",
  };

  return (
    <div style={{ width: "100%" }}>
      {label && (
        <label style={{
          display: "block",
          color: "#94a3b8",
          fontSize: "0.82rem",
          fontWeight: 600,
          marginBottom: 6,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}>
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={inputStyle}
        {...props}
      />
      {error && (
        <p style={{
          color: "#ef4444",
          fontSize: "0.8rem",
          marginTop: 4,
          margin: "4px 0 0",
        }}>
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}

export default Input;
