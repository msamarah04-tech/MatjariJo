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
