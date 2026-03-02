import { useState } from "react";
import { Input } from "./Input";

export default {
  title: "Components/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    type: {
      control: { type: "select" },
      options: ["text", "email", "tel", "date", "number"],
    },
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
    },
    disabled: { control: "boolean" },
    error: { control: "text" },
  },
};

export const Default = {
  args: {
    placeholder: "Nhập text...",
    label: "Họ tên",
  },
};

export const Email = {
  args: {
    type: "email",
    placeholder: "email@example.com",
    label: "Email",
  },
};

export const Phone = {
  args: {
    type: "tel",
    placeholder: "0912 345 678",
    label: "Số điện thoại",
  },
};

export const Date = {
  args: {
    type: "date",
    label: "Ngày hẹn",
  },
};

export const Number = {
  args: {
    type: "number",
    placeholder: "0",
    label: "Tuổi",
  },
};

export const WithError = {
  args: {
    placeholder: "Nhập email...",
    label: "Email",
    error: "Email không hợp lệ",
  },
};

export const Disabled = {
  args: {
    placeholder: "Disabled input",
    label: "Disabled",
    disabled: true,
  },
};

export const Small = {
  args: {
    size: "sm",
    placeholder: "Small input",
    label: "Small",
  },
};

export const Large = {
  args: {
    size: "lg",
    placeholder: "Large input",
    label: "Large",
  },
};

export const Interactive = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <div style={{ width: "300px" }}>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type something..."
          label="Interactive Input"
        />
        <p style={{ marginTop: "10px", color: "#94a3b8" }}>Value: {value}</p>
      </div>
    );
  },
};

export const BookingForm = {
  render: () => (
    <div style={{ width: "400px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <Input
        type="text"
        placeholder="Nguyễn Văn A"
        label="Họ và tên *"
      />
      <Input
        type="tel"
        placeholder="0912 345 678"
        label="Số điện thoại *"
      />
      <Input
        type="email"
        placeholder="email@example.com"
        label="Email"
      />
      <Input
        type="date"
        label="Ngày hẹn *"
      />
    </div>
  ),
};
