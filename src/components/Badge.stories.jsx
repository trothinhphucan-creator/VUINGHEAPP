import { Badge } from "./Badge";
import { HEALTH_STATUS, HEARING_SEVERITY } from "@/lib/brand-tokens";

export default {
  title: "Components/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
};

export const StatusPending = {
  args: {
    type: "pending",
    label: "Chờ xử lý",
  },
};

export const StatusConfirmed = {
  args: {
    type: "confirmed",
    label: "Đã xác nhận",
  },
};

export const StatusCancelled = {
  args: {
    type: "cancelled",
    label: "Đã huỷ",
  },
};

export const HearingNormal = {
  args: {
    type: "normal",
    label: "✅ Bình thường",
  },
};

export const HearingMild = {
  args: {
    type: "mild",
    label: "🟡 Nhẹ",
  },
};

export const HearingModerate = {
  args: {
    type: "moderate",
    label: "🟠 Trung bình",
  },
};

export const HearingModeratenSevere = {
  args: {
    type: "moderateSevere",
    label: "🔴 TB-Nặng",
  },
};

export const HearingSevere = {
  args: {
    type: "severe",
    label: "🔴 Nặng",
  },
};

export const HearingProfound = {
  args: {
    type: "profound",
    label: "🟣 Sâu",
  },
};

export const AllStatuses = {
  render: () => (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <Badge type="pending" label="Chờ xử lý" />
      <Badge type="confirmed" label="Đã xác nhận" />
      <Badge type="cancelled" label="Đã huỷ" />
    </div>
  ),
};

export const AllSeverities = {
  render: () => (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <Badge type="normal" label="Bình thường" />
      <Badge type="mild" label="Nhẹ" />
      <Badge type="moderate" label="Trung bình" />
      <Badge type="moderateSevere" label="TB-Nặng" />
      <Badge type="severe" label="Nặng" />
      <Badge type="profound" label="Sâu" />
    </div>
  ),
};

export const Sizes = {
  render: () => (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <Badge type="pending" size="sm" label="Small" />
      <Badge type="pending" size="md" label="Medium" />
      <Badge type="pending" size="lg" label="Large" />
    </div>
  ),
};
