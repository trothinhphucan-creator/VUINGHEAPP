import { Button } from "./Button";
import { COLORS } from "@/lib/brand-tokens";

export default {
  title: "Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#0a0f1e" },
        { name: "light", value: "#ffffff" },
      ],
    },
  },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["primary", "secondary", "danger"],
    },
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
    },
    disabled: {
      control: "boolean",
    },
    children: {
      control: "text",
    },
  },
};

export const Primary = {
  args: {
    variant: "primary",
    size: "md",
    children: "📅 Đặt lịch",
  },
};

export const Secondary = {
  args: {
    variant: "secondary",
    size: "md",
    children: "← Quay lại",
  },
};

export const Danger = {
  args: {
    variant: "danger",
    size: "md",
    children: "✕ Huỷ",
  },
};

export const Small = {
  args: {
    variant: "primary",
    size: "sm",
    children: "📸 Chụp ảnh",
  },
};

export const Large = {
  args: {
    variant: "primary",
    size: "lg",
    children: "🎧 Đo thính lực",
  },
};

export const Disabled = {
  args: {
    variant: "primary",
    size: "md",
    children: "Đang xử lý...",
    disabled: true,
  },
};

export const AllVariants = {
  render: () => (
    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

export const AllSizes = {
  render: () => (
    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
