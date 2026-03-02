# Refactoring Guide: Using brand-tokens.js

**Purpose**: Show how to refactor existing components to use centralized design tokens
**Status**: Template for future refactoring
**Priority**: Medium (all pages functional, just cleaner code)

---

## 🎯 Quick Start

### Before (Hardcoded Colors)
```javascript
<div style={{
  background: "#0a0f1e",
  color: "#e8ecf4",
  padding: "20px 24px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.08)"
}}>
  Content
</div>
```

### After (Using brand-tokens)
```javascript
import { COLORS, SPACING, RADIUS } from "@/lib/brand-tokens";

<div style={{
  background: COLORS.bg.primary,
  color: COLORS.neutral.softWhite,
  padding: `${SPACING[20]} ${SPACING[24]}`,
  borderRadius: RADIUS.xl,
  border: `1px solid ${COLORS.border.medium}`
}}>
  Content
</div>
```

---

## 📋 Refactoring Checklist

- [ ] Import tokens: `import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from "@/lib/brand-tokens";`
- [ ] Replace hardcoded colors with `COLORS.*`
- [ ] Replace hardcoded padding/margin with `SPACING.*`
- [ ] Replace hardcoded border-radius with `RADIUS.*`
- [ ] Replace hardcoded fonts with `TYPOGRAPHY.*`
- [ ] Replace hardcoded box-shadows with `SHADOWS.*`
- [ ] Test visually (no visual changes expected)
- [ ] Commit: "refactor: Use brand-tokens in [component]"

---

## 🔄 Mapping Reference

### Colors
```javascript
// Status Colors
COLORS.status.pending    → #f59e0b
COLORS.status.confirmed  → #10b981
COLORS.status.cancelled  → #ef4444

// Healthcare Severity
COLORS.healthcare.normal      → #10b981
COLORS.healthcare.mild        → #f59e0b
COLORS.healthcare.moderate    → #f97316
COLORS.healthcare.severe      → #dc2626
COLORS.healthcare.profound    → #9333ea

// Neutral Text
COLORS.neutral.softWhite   → #e8ecf4 (primary text)
COLORS.neutral.lightGray   → #94a3b8 (secondary text)
COLORS.neutral.mediumGray  → #64748b (tertiary text)

// Backgrounds
COLORS.bg.primary      → #0a0f1e
COLORS.bg.secondary    → rgba(255,255,255,0.03)
COLORS.bg.hover        → rgba(255,255,255,0.06)
```

### Spacing
```javascript
SPACING[2]  → 2px
SPACING[4]  → 4px
SPACING[8]  → 8px
SPACING[12] → 12px
SPACING[16] → 16px
SPACING[20] → 20px
SPACING[24] → 24px
SPACING[28] → 28px
SPACING[32] → 32px
```

### Border Radius
```javascript
RADIUS.sm    → 4px    (subtle)
RADIUS.base  → 8px    (inputs, small)
RADIUS.md    → 10px   (buttons)
RADIUS.lg    → 12px   (CTAs)
RADIUS.xl    → 14px   (tabs, cards)
RADIUS["2xl"] → 16px  (large cards)
RADIUS["3xl"] → 20px  (extra large)
RADIUS.full  → 9999px (pills)
```

### Shadows
```javascript
SHADOWS.sm       → 0 2px 4px rgba(0, 0, 0, 0.1)
SHADOWS.md       → 0 4px 12px rgba(0, 0, 0, 0.15)
SHADOWS.lg       → 0 8px 24px rgba(0, 0, 0, 0.2)
SHADOWS.gradient → -10px 9px 10px rgba(0, 212, 255, 0.15)
```

---

## 🔧 Refactoring Examples

### Example 1: Card Component
```javascript
// Before
<div style={{
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 16,
  padding: "18px 20px"
}}>

// After
import { COLORS, SPACING, RADIUS } from "@/lib/brand-tokens";

<div style={{
  background: COLORS.bg.secondary,
  border: `1px solid ${COLORS.border.medium}`,
  borderRadius: RADIUS.xl,
  padding: `${SPACING[18]} ${SPACING[20]}`
}}>
```

### Example 2: Button Component
```javascript
// Before
const buttonStyle = {
  padding: "10px 20px",
  borderRadius: 12,
  fontWeight: 700,
  background: "linear-gradient(135deg,#00d4ff,#7c3aed)",
  color: "#fff",
  boxShadow: "0 4px 15px rgba(0, 212, 255, 0.25)",
};

// After
import { COLORS, SPACING, RADIUS, TYPOGRAPHY } from "@/lib/brand-tokens";

const buttonStyle = {
  padding: `${SPACING[10]} ${SPACING[20]}`,
  borderRadius: RADIUS.lg,
  fontWeight: TYPOGRAPHY.weight.bold,
  background: COLORS.primary.gradient,
  color: COLORS.neutral.white,
  boxShadow: "0 4px 15px rgba(0, 212, 255, 0.25)",
};
```

### Example 3: Input Field
```javascript
// Before
const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  color: "#e8ecf4",
  fontSize: "0.9rem",
  outline: "none"
};

// After
import { COLORS, SPACING, RADIUS } from "@/lib/brand-tokens";

const inputStyle = {
  width: "100%",
  padding: `${SPACING[10]} ${SPACING[14]}`,
  background: COLORS.bg.secondary,
  border: `1px solid ${COLORS.border.light}`,
  borderRadius: RADIUS.md,
  color: COLORS.neutral.softWhite,
  fontSize: "0.9rem",
  outline: "none"
};
```

### Example 4: Status Badge
```javascript
// Before
const STATUS_COLORS = {
  pending: { bg: "rgba(245,158,11,0.1)", color: "#f59e0b", label: "Chờ xử lý" },
  confirmed: { bg: "rgba(16,185,129,0.1)", color: "#10b981", label: "Đã xác nhận" },
  cancelled: { bg: "rgba(239,68,68,0.1)", color: "#ef4444", label: "Đã huỷ" },
};

// After
import { COLORS, HEALTH_STATUS } from "@/lib/brand-tokens";

// Already available in brand-tokens!
<Badge type="pending" />
<Badge type="confirmed" />
<Badge type="cancelled" />
```

---

## 📂 Priority Pages to Refactor

### Priority 1 (High Impact)
1. **admin/page.js** (~500 lines)
   - Replace STATUS_COLORS hardcoding
   - Use COLORS.healthcare for severity
   - Apply SPACING throughout
   - Update all borderRadius to RADIUS tokens

2. **dashboard/page.js** (~600 lines)
   - Replace all color hex values with COLORS.*
   - Update typography sizes with clamp()
   - Consolidate shadow definitions

### Priority 2 (Medium Impact)
3. **booking/page.js** (~200 lines)
   - Use COLORS and SPACING throughout
   - Apply RADIUS to form elements
   - Update inputStyle to use brand-tokens

### Priority 3 (Low Impact)
4. **Other pages/components**
   - hearing-test/page.js
   - hearing-aid-simulator/page.js
   - layout.js

---

## ✅ Testing After Refactoring

```bash
# 1. Visual regression test
npm run dev
# → Visit http://localhost:3000/admin
# → Verify all colors, spacing, borders match before refactoring

# 2. Storybook visual verification
npm run storybook
# → Compare component stories with refactored pages

# 3. Component behavior test
npm test
# → Ensure all tests pass (no logic changes, only styling)
```

---

## 💾 Git Workflow

```bash
# For each refactored file
git add src/app/admin/page.js
git commit -m "refactor: Use brand-tokens in admin dashboard

- Replaced hardcoded colors with COLORS.*
- Applied SPACING tokens to padding/margin
- Updated border-radius to RADIUS tokens
- No visual or behavioral changes (styling only)"

git push origin master:main
```

---

## 📊 Refactoring Impact

| Page | Lines | Colors | Sizes | Radius | Effort |
|------|-------|--------|-------|--------|--------|
| admin/page.js | 476 | 20+ | 15+ | 10+ | 2-3h |
| dashboard/page.js | 650 | 25+ | 20+ | 8+ | 2-3h |
| booking/page.js | 200 | 10+ | 8+ | 5+ | 1h |
| **Total** | **1326** | **55+** | **43+** | **23+** | **5-7h** |

---

## 🚀 Future Benefits

✅ **Maintainability**: Change brand colors in 1 file, updates everywhere
✅ **Consistency**: No more color drift or typos
✅ **Scale**: Easy to add new themes (dark/light/high-contrast)
✅ **Design Sync**: Tokens file can be auto-generated from Figma
✅ **Team Alignment**: Single source of truth for design decisions

---

## 📖 Related Files

- `src/lib/brand-tokens.js` - Token definitions
- `BRAND_GUIDELINE.md` - Design system documentation
- `design-tokens.json` - Figma/tool export format
- `src/components/Button.jsx` - Already using brand-tokens (example)
- `src/components/Badge.jsx` - Already using brand-tokens (example)
- `src/components/Input.jsx` - Already using brand-tokens (example)

---

## ❓ FAQ

**Q: Will refactoring break anything?**
A: No - only styling changes, zero logic changes. Test with `npm run dev` to verify.

**Q: How do I handle dynamic values?**
```javascript
// Template strings work fine
padding: `${SPACING[16]} ${SPACING[24]}`
color: COLORS.status[status] // dynamic key access
```

**Q: What about responsive sizes?**
```javascript
// Use clamp() (already in TYPOGRAPHY.size)
fontSize: "clamp(1rem, 2vw, 1.2rem)" // from brand-tokens
```

**Q: Can I override tokens locally?**
```javascript
// Yes, but not recommended
const customColor = "#ff0000";
// Prefer adding to brand-tokens.js instead
```

---

## 🎓 Learning Resources

- [Design Tokens Best Practices](https://www.smashingmagazine.com/2022/04/design-tokens-visual-studio-code/)
- [Token Studio for Figma](https://tokens.studio/)
- [CSS-in-JS + Design Tokens Pattern](https://www.styled-components.com/)

---

**Completed By**: Claude Code
**Target Completion**: Q2 2026
**Estimated Effort**: 5-7 hours
