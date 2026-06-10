---
name: ThemeOverrides extension
description: New fields added to ThemeOverrides without any DB schema change
---

## Current ThemeOverrides type (src/lib/themes.ts)

```ts
type ThemeOverrides = Partial<Pick<Theme, 'bg'|'surface'|'text'|'primary'|'accent'|'soft'|'line'|'radius'>> & {
  buttonStyle?: 'solid' | 'outline' | 'pill';
  headingFont?: string;       // CSS var string e.g. 'var(--font-fraunces)'
  instagram?: string;         // handle or full URL
  whatsapp?: string;          // phone number with country code
  tiktok?: string;            // handle or full URL
};
```

## How it works

- All fields stored in the existing `themeOverrides` JSON column on the Store model — no migration needed
- `resolveStoreTheme` validates color/radius fields; non-color fields are passed through
- `headingFont` override replaces `theme.hero` in the resolved theme object
- In Storefront, read non-color fields by casting: `(store.themeOverrides as Record<string,string>)?.buttonStyle`

## Admin form

In Appearance.tsx, `overridesFromValues()` always writes themeOverrides (not null) since it now includes design fields. This means `paletteMode: 'preset'` still writes color fields but also preserves buttonStyle/social/font.

**Why:** Avoids losing non-color overrides when user switches back to "preset" palette mode.

## HEADING_FONTS array (themes.ts)

5 options: Fraunces (Serif), Outfit (Geometric), Heading (Display), Display (Slab), Sans (Clean).
Used in admin font picker — renders "Aa" in each font as the visual preview.
