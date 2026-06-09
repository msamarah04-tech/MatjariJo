export type Theme = {
  id: string;
  name: string;
  vibe: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  accent: string;
  soft: string;
  line: string;
  radius: string;
  font: string;
  hero: string;
};

export type StorefrontTemplate = {
  id: 'editorial' | 'boutique' | 'market' | 'lookbook';
  name: string;
  vibe: string;
  description: string;
};

export type ThemeOverrides = Partial<Pick<Theme, 'bg' | 'surface' | 'text' | 'primary' | 'accent' | 'soft' | 'line' | 'radius'>> & {
  buttonStyle?: 'solid' | 'outline' | 'pill';
  headingFont?: string;
  instagram?: string;
  whatsapp?: string;
  tiktok?: string;
};

export const THEMES: Theme[] = [
  {
    id: 'mono',
    name: 'Mono',
    vibe: 'Minimal & Editorial',
    bg: '#ffffff',
    surface: '#fafafa',
    text: '#000000',
    muted: '#737373',
    primary: '#000000',
    accent: '#000000',
    soft: '#f5f5f5',
    line: '#e5e5e5',
    radius: '0px',
    font: 'var(--font-sans)',
    hero: 'var(--font-fraunces)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    vibe: 'Warm & Friendly',
    bg: '#fffbf7',
    surface: '#ffffff',
    text: '#43241b',
    muted: '#b58b7f',
    primary: '#ff7754',
    accent: '#ff9b7d',
    soft: '#ffebe6',
    line: '#f2e1db',
    radius: '16px',
    font: 'var(--font-sans)',
    hero: 'var(--font-outfit)',
  },
  {
    id: 'forest',
    name: 'Forest',
    vibe: 'Earthy & Organic',
    bg: '#f4f5f0',
    surface: '#ffffff',
    text: '#1a3322',
    muted: '#687e6c',
    primary: '#2d5a3f',
    accent: '#cf6347',
    soft: '#e6ede8',
    line: '#dde3dc',
    radius: '8px',
    font: 'var(--font-sans)',
    hero: 'var(--font-heading)',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    vibe: 'Fresh & Clean',
    bg: '#f2f8fc',
    surface: '#ffffff',
    text: '#11293a',
    muted: '#637e96',
    primary: '#1c6f9e',
    accent: '#0bc2b6',
    soft: '#e1eff7',
    line: '#d7e6f0',
    radius: '12px',
    font: 'var(--font-sans)',
    hero: 'var(--font-outfit)',
  },
  {
    id: 'blossom',
    name: 'Blossom',
    vibe: 'Soft & Giftable',
    bg: '#fff8fb',
    surface: '#ffffff',
    text: '#402232',
    muted: '#8f6477',
    primary: '#d84f8a',
    accent: '#3aa6a1',
    soft: '#fde8f1',
    line: '#f0d6e2',
    radius: '18px',
    font: 'var(--font-sans)',
    hero: 'var(--font-fraunces)',
  },
  {
    id: 'citrus',
    name: 'Citrus',
    vibe: 'Bright & Fresh',
    bg: '#fcfff5',
    surface: '#ffffff',
    text: '#28320f',
    muted: '#6f7f48',
    primary: '#8bbf24',
    accent: '#f28c28',
    soft: '#edf8cf',
    line: '#dfeabc',
    radius: '10px',
    font: 'var(--font-sans)',
    hero: 'var(--font-outfit)',
  },
  {
    id: 'clay',
    name: 'Clay',
    vibe: 'Handmade & Grounded',
    bg: '#fbf7f1',
    surface: '#fffdf9',
    text: '#35261d',
    muted: '#8b7566',
    primary: '#a95637',
    accent: '#2f7567',
    soft: '#efe1d5',
    line: '#e6d4c4',
    radius: '6px',
    font: 'var(--font-sans)',
    hero: 'var(--font-display)',
  },
  {
    id: 'tech',
    name: 'Tech',
    vibe: 'Sharp & Modern',
    bg: '#f7fafc',
    surface: '#ffffff',
    text: '#101827',
    muted: '#667085',
    primary: '#2457ff',
    accent: '#00a88f',
    soft: '#e9eefc',
    line: '#d9e2ef',
    radius: '4px',
    font: 'var(--font-sans)',
    hero: 'var(--font-outfit)',
  },
  {
    id: 'royal',
    name: 'Royal',
    vibe: 'Elegant & Premium',
    bg: '#fbfaf7',
    surface: '#ffffff',
    text: '#211a2c',
    muted: '#70657e',
    primary: '#5c3b91',
    accent: '#b98a2e',
    soft: '#eee7f6',
    line: '#ded5e8',
    radius: '12px',
    font: 'var(--font-sans)',
    hero: 'var(--font-fraunces)',
  },
  {
    id: 'pearl',
    name: 'Pearl',
    vibe: 'Quiet & Refined',
    bg: '#f8f8f6',
    surface: '#ffffff',
    text: '#1f2523',
    muted: '#68716e',
    primary: '#49645d',
    accent: '#c17f59',
    soft: '#ecefeb',
    line: '#dde2df',
    radius: '14px',
    font: 'var(--font-sans)',
    hero: 'var(--font-heading)',
  },
  {
    id: 'mocha',
    name: 'Mocha',
    vibe: 'Cozy & Artisanal',
    bg: '#fdfbf7',
    surface: '#f5f2eb',
    text: '#3b2f2f',
    muted: '#8b7f7f',
    primary: '#6b4f4f',
    accent: '#a67c52',
    soft: '#efece4',
    line: '#eaddcc',
    radius: '4px',
    font: 'var(--font-sans)',
    hero: 'var(--font-display)',
  },
  {
    id: 'noir',
    name: 'Noir',
    vibe: 'Dark & Luxe',
    bg: '#121212',
    surface: '#1e1e1e',
    text: '#f5f5f5',
    muted: '#a3a3a3',
    primary: '#d4af37',
    accent: '#d4af37',
    soft: '#2a2a2a',
    line: '#333333',
    radius: '0px',
    font: 'var(--font-sans)',
    hero: 'var(--font-sans)',
  }
];

export const getTheme = (id: string) => THEMES.find(t => t.id === id) ?? THEMES[0];

export const STOREFRONT_TEMPLATES: StorefrontTemplate[] = [
  {
    id: 'editorial',
    name: 'Editorial',
    vibe: 'Big story, balanced grid',
    description: 'Best for fashion, gifts, and brands that lead with a strong tagline.',
  },
  {
    id: 'boutique',
    name: 'Boutique',
    vibe: 'Polished showroom',
    description: 'A refined split hero and spacious cards for premium stores.',
  },
  {
    id: 'market',
    name: 'Market',
    vibe: 'Fast catalog browsing',
    description: 'Denser filters and product cards for stores with many SKUs.',
  },
  {
    id: 'lookbook',
    name: 'Lookbook',
    vibe: 'Image-first collection',
    description: 'Visual, immersive sections for apparel, decor, and lifestyle products.',
  },
];

export const getStorefrontTemplate = (id?: string) =>
  STOREFRONT_TEMPLATES.find((template) => template.id === id) ?? STOREFRONT_TEMPLATES[0];

export const HEADING_FONTS = [
  { id: 'var(--font-fraunces)', name: 'Fraunces', label: 'Serif' },
  { id: 'var(--font-outfit)', name: 'Outfit', label: 'Geometric' },
  { id: 'var(--font-heading)', name: 'Heading', label: 'Display' },
  { id: 'var(--font-display)', name: 'Display', label: 'Slab' },
  { id: 'var(--font-sans)', name: 'Sans', label: 'Clean' },
];

const isHex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value);
const isRadius = (value: unknown): value is string => typeof value === 'string' && /^(0|[1-9]\d?)px$/.test(value);

export function resolveStoreTheme(themeId?: string, overrides?: ThemeOverrides | null): Theme {
  const base = getTheme(themeId || 'mono');
  if (!overrides) return base;
  return {
    ...base,
    bg: isHex(overrides.bg) ? overrides.bg : base.bg,
    surface: isHex(overrides.surface) ? overrides.surface : base.surface,
    text: isHex(overrides.text) ? overrides.text : base.text,
    primary: isHex(overrides.primary) ? overrides.primary : base.primary,
    accent: isHex(overrides.accent) ? overrides.accent : base.accent,
    soft: isHex(overrides.soft) ? overrides.soft : base.soft,
    line: isHex(overrides.line) ? overrides.line : base.line,
    radius: isRadius(overrides.radius) ? overrides.radius : base.radius,
    hero: overrides.headingFont || base.hero,
  };
}
