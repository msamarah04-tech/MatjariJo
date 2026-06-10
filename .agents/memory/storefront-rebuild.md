---
name: Storefront rebuild patterns
description: Key decisions from the 4-template storefront and admin Appearance redesign
---

## Template heroes

Each template has a genuinely distinct hero layout:
- **editorial**: 2-col grid, text left with large heading + category badge + trust badges + CTA, featured product 4:5 image right
- **boutique**: 2-col grid, text+CTA left column, full-bleed product image right (no border/padding)
- **market**: compact bar (no full-height hero), store name + inline category chips — products start immediately
- **lookbook**: full-bleed featured image as background with gradient overlay + white text + white pill CTA

## Product card design

- Flush image (no outer padding), aspect ratio varies by template: market=square, boutique=3:4, editorial/lookbook=4:5
- First lookbook card gets `col-span-2 aspect-[16/9]` via `[&>*:first-child]:sm:col-span-2`
- CTA always visible at bottom (not hover-only)
- `getCtaClass(buttonStyle?)` returns full Tailwind string for solid/outline/pill

## getCtaClass helper

```ts
function getCtaClass(style?: string): string {
  const base = 'inline-flex h-11 w-full items-center justify-center text-[11px] font-black uppercase tracking-[0.12em] ...';
  if (style === 'outline') return `${base} rounded-[var(--c-radius)] border-2 border-[var(--c-text)] ...`;
  if (style === 'pill') return `${base} rounded-full bg-[var(--c-primary)] text-white ...`;
  return `${base} rounded-[var(--c-radius)] bg-[var(--c-text)] text-[var(--c-bg)] ...`; // solid
}
```

## Footer social links

Read from `store.themeOverrides` cast as `Record<string, string>` — keys: `instagram`, `whatsapp`, `tiktok`.
- Instagram: href is URL if starts with `http`, else `https://instagram.com/{handle}`
- WhatsApp: `https://wa.me/{digits only}`
- TikTok: href is URL if starts with `http`, else `https://tiktok.com/@{handle}`

## Mobile menu

Header includes a hamburger → drawer for mobile (md:hidden). Controlled by `mobileMenuOpen` state.

**Why:** The old storefront had no mobile nav drawer; users on small screens couldn't access About.
