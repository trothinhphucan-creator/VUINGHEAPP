# 🎨 PAH - Phúc An Hearing Brand Guideline

**Version**: 1.0
**Last Updated**: 2026-03-02
**Brand**: Phúc An Hearing (PAH / Vũi Nghe)
**Domain**: vuinghe.com | hearingtest.pah.vn | hearingtest.vuinghe.com

---

## 📋 Table of Contents
1. [Brand Overview](#brand-overview)
2. [Logo & Identity](#logo--identity)
3. [Color Palette](#color-palette)
4. [Typography](#typography)
5. [Components & Patterns](#components--patterns)
6. [Healthcare-Specific Colors](#healthcare-specific-colors)
7. [Usage Guidelines](#usage-guidelines)
8. [Do's & Don'ts](#dos--donts)

---

## 🏥 Brand Overview

**Mission**: Cung cấp giải pháp kiểm tra thính lực hiện đại, chuyên nghiệp cho người Việt
**Tone**: Professional, Trustworthy, Approachable, Modern
**Audience**: Elderly (50+), Healthcare Professionals, Families
**Platform**: Web Application (Next.js), Desktop & Mobile

---

## 🎭 Logo & Identity

### Primary Logo
- **File**: `Brand Design PA Logo white clear rectg.png`
- **Color**: White on dark/brand background
- **Usage**: Header navigation, brand mark
- **Size**: Min 40px height for readability

### Secondary Logo (Cyan Variant)
- **File**: `Logo-PAHR-Cyan-white-BG-1.png`
- **Colors**: Cyan + White
- **Usage**: Marketing materials, light backgrounds
- **Size**: Min 32px height

### Logo Spacing (Clearance)
```
Top:    1x logo height
Bottom: 1x logo height
Left:   1.5x logo height
Right:  1.5x logo height
```

**DO**: Use official logos only
**DON'T**: Stretch, rotate, or add effects to logos

---

## 🎨 Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Cyan** | `#00d4ff` | 0, 212, 255 | Primary action, links, accents |
| **Purple** | `#7c3aed` | 124, 58, 237 | Secondary action, gradients |
| **White** | `#ffffff` | 255, 255, 255 | Text on dark, backgrounds |
| **Dark Navy** | `#0a0f1e` | 10, 15, 30 | Main background |

### Gradient (Primary)
```
linear-gradient(135deg, #00d4ff, #7c3aed)
```
**Usage**: Buttons, CTAs, hero sections

### Secondary Colors (Neutral)

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Soft White** | `#e8ecf4` | 232, 236, 244 | Primary text |
| **Light Gray** | `#94a3b8` | 148, 163, 184 | Secondary text |
| **Medium Gray** | `#64748b` | 100, 116, 139 | Tertiary text |
| **Dark Gray** | `#334155` | 51, 65, 85 | Borders, dividers |
| **BG Secondary** | `rgba(255,255,255,0.03)` | - | Card backgrounds |

---

## 🏥 Healthcare-Specific Colors

Used for hearing loss severity classification (International Standard):

| Level | Color | Hex | Meaning | PTA (dB) |
|-------|-------|-----|---------|----------|
| **Normal** | Green | `#10b981` | ≤ 25 dB HL | No hearing loss |
| **Mild** | Amber | `#f59e0b` | 26-40 dB HL | Slight difficulty |
| **Moderate** | Orange | `#f97316` | 41-55 dB HL | Moderate loss |
| **Moderate-Severe** | Red | `#ef4444` | 56-70 dB HL | Significant loss |
| **Severe** | Dark Red | `#dc2626` | 71-90 dB HL | Severe loss |
| **Profound** | Purple | `#9333ea` | > 90 dB HL | Profound loss |

**Usage**: Audiogram severity bands, status badges, patient classifications

---

## 📝 Typography

### Font Family
- **Primary**: `Inter` (Google Fonts)
- **Secondary**: `Roboto` (Google Fonts for body text)
- **Monospace**: `Monaco, Courier New` (code, data)

### Font Weights
```css
/* Import in CSS */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
```

| Weight | Usage | Example |
|--------|-------|---------|
| **300** Light | Subtle text | "Quản trị hệ thống" |
| **400** Regular | Body text | Paragraphs, descriptions |
| **500** Medium | Emphasis | Labels, form text |
| **600** Semibold | Highlights | Section headers |
| **700** Bold | Primary headers | Page titles, CTAs |
| **800** Extrabold | Hero text | Landing page title |

### Font Sizes (Responsive)

```css
/* Using clamp() for responsive sizing */
h1: clamp(1.3rem, 3vw, 1.7rem);    /* 20.8px → 27.2px */
h2: clamp(1.1rem, 2.5vw, 1.4rem);  /* 17.6px → 22.4px */
h3: clamp(1rem, 2vw, 1.2rem);      /* 16px → 19.2px */
h4: clamp(0.95rem, 1.5vw, 1.1rem); /* 15.2px → 17.6px */
body: clamp(0.85rem, 1vw, 1rem);   /* 13.6px → 16px */
small: clamp(0.75rem, 0.8vw, 0.9rem); /* 12px → 14.4px */
```

### Line Height
```css
heading: 1.2;  /* Tighter for headers */
body: 1.6;     /* Comfortable for reading */
form: 1.5;     /* Balance for inputs */
```

---

## 🧩 Components & Patterns

### Buttons

#### Primary Button (CTA)
```css
background: linear-gradient(135deg, #00d4ff, #7c3aed);
color: #ffffff;
padding: 12px 28px;
border-radius: 12px;
font-weight: 700;
box-shadow: 0 4px 15px rgba(0, 212, 255, 0.25);
```

#### Secondary Button (Outline)
```css
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
color: #94a3b8;
padding: 10px 20px;
border-radius: 12px;
font-weight: 600;
```

#### Danger Button
```css
background: rgba(239, 68, 68, 0.1);
border: 1px solid rgba(239, 68, 68, 0.2);
color: #ef4444;
padding: 10px 20px;
border-radius: 12px;
font-weight: 600;
```

### Card Component
```css
background: rgba(255, 255, 255, 0.03);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 20px;
padding: 20px 24px;
```

### Input Fields
```css
background: rgba(255, 255, 255, 0.06);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 10px;
color: #e8ecf4;
padding: 10px 14px;
font-size: 0.95rem;
```

### Focus State
```css
border-color: rgba(0, 212, 255, 0.4);
box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
```

### Badges & Tags

#### Status Badges
```
Pending:   bg: rgba(245, 158, 11, 0.1),  color: #f59e0b
Confirmed: bg: rgba(16, 185, 129, 0.1),  color: #10b981
Cancelled: bg: rgba(239, 68, 68, 0.1),   color: #ef4444
```

#### Branch Badges
```
Hà Nội:        🏢 Hà Nội        (color: #00d4ff)
TP.HCM:        🏢 TP.HCM        (color: #7c3aed)
Đà Nẵng:       🏢 Đà Nẵng       (color: #f59e0b)
Online/Tư vấn: 📞 Tư vấn Online (color: #10b981)
```

### Spacing Scale
```css
2px   /* Micro */
4px   /* Extra small */
6px   /* Small */
8px   /* Base unit */
12px  /* Comfortable */
16px  /* Standard */
20px  /* Large */
24px  /* Extra large */
28px  /* Massive */
32px  /* Huge */
```

### Border Radius
```css
4px   /* Subtle */
8px   /* Inputs, small elements */
10px  /* Buttons, moderate elements */
12px  /* CTAs, important elements */
14px  /* Tabs, cards */
16px  /* Large cards */
20px  /* Extra large components */
```

### Shadows
```css
subtle:   0 2px 4px rgba(0, 0, 0, 0.1);
medium:   0 4px 12px rgba(0, 0, 0, 0.15);
strong:   0 8px 24px rgba(0, 0, 0, 0.2);
gradient: -10px 9px 10px rgba(0, 212, 255, 0.15);
```

### Animations
```css
transition: all 0.2s ease;
transform: translateY(-1px);  /* On hover */
animation: fadeUp 0.4s ease both;
```

---

## 💬 Copy Style

### Tone of Voice
- **Professional**: Medical accuracy, credible information
- **Warm**: Approachable, supportive tone
- **Clear**: Simple Vietnamese, no jargon (explain when needed)
- **Action-Oriented**: Direct CTAs, clear next steps

### Common Phrases
- ✅ "Đặt lịch khám" (Book appointment)
- ✅ "Đo thính lực miễn phí" (Free hearing test)
- ✅ "Tư vấn chuyên gia" (Expert consultation)
- ❌ Avoid: Medical jargon, technical terms without explanation

---

## 🛠️ Usage Guidelines

### Background Combinations
```
✅ Dark Navy (#0a0f1e) + Cyan (#00d4ff) → High contrast, professional
✅ Dark Navy (#0a0f1e) + White (#e8ecf4) → Readable, clean
✅ Gradient (Cyan→Purple) + Dark Navy → Modern, attractive
❌ Light backgrounds + Dark Navy text → Low contrast, hard to read
```

### Text Colors on Backgrounds
```
On #0a0f1e (Dark Navy):
  ✅ #ffffff (White) - primary headings
  ✅ #e8ecf4 (Soft White) - body text
  ✅ #94a3b8 (Light Gray) - secondary text
  ❌ #333333 (Dark Gray) - too dark to read

On #ffffff (White):
  ✅ #0a0f1e (Dark Navy) - primary text
  ✅ #334155 (Dark Gray) - secondary text
  ❌ #e8ecf4 (Soft White) - invisible
```

### Icon Guidelines
- **Style**: Emoji or Lucide Icons (consistent)
- **Size**: Scale with text (16px, 20px, 24px)
- **Color**: Inherit from text color or use accent colors
- **Usage**: Enhance readability, not decoration

---

## ✅ Do's & Don'ts

### DO ✅
- ✅ Use cyan (#00d4ff) for primary CTAs (buttons, links)
- ✅ Use purple (#7c3aed) for secondary actions
- ✅ Maintain 1.5:1 minimum contrast ratio (WCAG)
- ✅ Use Inter for UI, Roboto for body copy
- ✅ Apply gradient sparingly (hero, CTAs only)
- ✅ Use healthcare severity colors consistently
- ✅ Maintain 8px spacing grid throughout
- ✅ Test on mobile devices (responsive design)
- ✅ Use official logo files from brand assets
- ✅ Keep whitespace proportional (50% of content)

### DON'T ❌
- ❌ Don't change logo colors or proportions
- ❌ Don't use more than 3 colors in one UI section
- ❌ Don't pair dark text on dark backgrounds
- ❌ Don't use rainbow gradients (unprofessional)
- ❌ Don't use Comic Sans, Georgia, or serif fonts
- ❌ Don't mix serif + sans-serif fonts
- ❌ Don't add drop shadows to text
- ❌ Don't use opacity <0.6 for text (unreadable)
- ❌ Don't animate text (distracting)
- ❌ Don't use red alone (accessibility issue)

---

## 📱 Responsive Design

### Breakpoints
```css
mobile:  < 640px    /* Default */
tablet:  640-1024px /* iPad size */
desktop: > 1024px   /* Desktop screens */
```

### Mobile-First Approach
```css
/* Start with mobile */
font-size: 0.95rem;
padding: 12px;

/* Enhance for tablet */
@media (min-width: 640px) {
  font-size: 1rem;
  padding: 16px;
}

/* Full features for desktop */
@media (min-width: 1024px) {
  font-size: 1.1rem;
  padding: 20px;
}
```

---

## ♿ Accessibility

### Color Contrast
- **AA Standard**: 4.5:1 for text, 3:1 for graphics
- **AAA Standard**: 7:1 for text, 4.5:1 for graphics

### Testing Tools
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Stark (browser plugin): https://www.getstark.co/

### WCAG 2.1 Compliance
- [ ] Use semantic HTML (`<button>`, `<nav>`, `<header>`)
- [ ] Add alt text to images
- [ ] Keyboard navigation working
- [ ] Focus indicators visible
- [ ] Color not sole means of conveying info (use icons)

---

## 🎯 Implementation Examples

### Example 1: Booking Form
```jsx
<form style={{ display: "flex", flexDirection: "column", gap: 20 }}>
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
    <input
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        color: "#e8ecf4",
        padding: "10px 14px",
      }}
      placeholder="Họ tên"
    />
    <input
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        color: "#e8ecf4",
        padding: "10px 14px",
      }}
      placeholder="Số điện thoại"
    />
  </div>
  <button
    style={{
      background: "linear-gradient(135deg,#00d4ff,#7c3aed)",
      color: "#fff",
      padding: "14px",
      border: "none",
      borderRadius: 14,
      fontWeight: 800,
      cursor: "pointer",
    }}
  >
    Đặt lịch
  </button>
</form>
```

### Example 2: Status Badge
```jsx
const STATUS_COLORS = {
  pending: { bg: "rgba(245,158,11,0.1)", color: "#f59e0b", label: "Chờ xử lý" },
  confirmed: { bg: "rgba(16,185,129,0.1)", color: "#10b981", label: "Đã xác nhận" },
  cancelled: { bg: "rgba(239,68,68,0.1)", color: "#ef4444", label: "Đã huỷ" },
};

<span
  style={{
    padding: "2px 10px",
    borderRadius: 20,
    background: STATUS_COLORS[status].bg,
    color: STATUS_COLORS[status].color,
    fontWeight: 700,
  }}
>
  {STATUS_COLORS[status].label}
</span>
```

### Example 3: Healthcare Severity Color
```jsx
function classify(pta) {
  if (pta <= 25) return { label: "Bình thường", color: "#10b981" };
  if (pta <= 40) return { label: "Nhẹ", color: "#f59e0b" };
  if (pta <= 55) return { label: "Trung bình", color: "#f97316" };
  if (pta <= 70) return { label: "Nặng", color: "#ef4444" };
  return { label: "Sâu", color: "#9333ea" };
}
```

---

## 🌙 Dark Mode & Light Mode

### Dark Mode (Default)
```css
/* Background Colors */
Primary: #0a0f1e
Secondary: rgba(255, 255, 255, 0.03)

/* Text Colors */
Primary: #e8ecf4
Secondary: #94a3b8
Tertiary: #64748b
```

### Light Mode (Coming Soon)
```css
/* Background Colors */
Primary: #ffffff
Secondary: #f8fafc
Tertiary: #e2e8f0

/* Text Colors */
Primary: #0f172a
Secondary: #334155
Tertiary: #64748b
```

### Implementation
```javascript
import { getTheme } from "@/lib/brand-tokens";

// Dark mode (default)
const darkTheme = getTheme("dark");

// Light mode
const lightTheme = getTheme("light");

// Apply theme
<div style={{ background: darkTheme.bg, color: darkTheme.text }}>
  Content
</div>
```

---

## 🎬 Storybook Component Library

**Available**: `npm run storybook`
**Port**: http://localhost:6006

**Components Documented:**
- ✅ Buttons (Primary, Secondary, Danger)
- ✅ Badges (Status, Healthcare Severity)
- ✅ Inputs (Text, Email, Date, Phone)
- ✅ Color Palette Showcase

**Usage:**
```bash
npm run storybook      # Run locally
npm run build-storybook # Build static site
```

---

## 📞 Brand Contact

**Phúc An Hearing (PAH)**
- 🌐 Website: vuinghe.com | hearingtest.pah.vn
- 📞 Phone: 0818 788 000
- 📧 Email: phucan.hearing@vuinghe.com
- 👨‍⚕️ Founder: Ths. Chu Đức Hải (Audiologist)
- 📍 Locations: Hà Nội, TP.HCM, Đà Nẵng + Online

---

## 📄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-02 | Initial brand guideline based on vuinghe.com + PAH App |

**Next Review**: Q2 2026

---

## 📎 Brand Assets Checklist

- [ ] Logo (White variant)
- [ ] Logo (Cyan variant)
- [ ] Founder photo (Ths. Chu Đức Hải)
- [ ] Clinic interior photos
- [ ] Hearing aid product images
- [ ] Customer testimonial photos
- [ ] UI component library
- [ ] Icon set (Lucide or emoji)
- [ ] Font files (Inter, Roboto)
- [ ] Color swatches (.aco, .ase, .json)

---

**Created by**: Claude Code | PAH Development Team
**License**: Internal Use Only
**Last Updated**: 2026-03-02
