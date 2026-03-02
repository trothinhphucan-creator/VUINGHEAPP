/**
 * Button Component
 * Reusable button with multiple variants and states
 */

import { COMPONENT_STYLES, COLORS } from "@/lib/brand-tokens";

export function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  children,
  onClick,
  ...props
}) {
  const baseStyle = COMPONENT_STYLES.button.base;
  const variantStyle = COMPONENT_STYLES.button[variant] || COMPONENT_STYLES.button.primary;

  const sizeStyles = {
    sm: { padding: "6px 14px", fontSize: "0.75rem" },
    md: { padding: "10px 20px", fontSize: "0.85rem" },
    lg: { padding: "14px 28px", fontSize: "1rem" },
  };

  const buttonStyle = {
    ...baseStyle,
    ...variantStyle,
    ...sizeStyles[size],
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };

  return (
    <button
      style={buttonStyle}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
