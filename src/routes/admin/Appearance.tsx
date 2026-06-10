import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ExternalLink, Image as ImageIcon, Instagram, LayoutTemplate, Palette, RotateCcw, Type } from 'lucide-react';
import { useStore } from '@/lib/store';
import { HEADING_FONTS, STOREFRONT_TEMPLATES, THEMES, resolveStoreTheme, type ThemeOverrides } from '@/lib/themes';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { MiniStorefront } from '@/components/storefront/MiniStorefront';
import { toast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/dashboard';
import { cn } from '@/lib/cn';
import { prepareImageDataUrl } from '@/lib/images';
import { useAdminContext } from './shared';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  tagline: z.string().min(3, 'Add a short tagline'),
  logoEmoji: z.string().optional(),
  logoUrl: z.string().optional(),
  announcement: z.string().max(120, 'Keep it short').optional(),
  about: z.string().max(2000).optional(),
  shippingType: z.enum(['FLAT', 'FREE_OVER', 'PICKUP']),
  shippingFlatText: z.string().optional(),
  shippingFreeOverText: z.string().optional(),
  themeId: z.string().min(1),
  storefrontTemplate: z.enum(['editorial', 'boutique', 'market', 'lookbook']),
  paletteMode: z.enum(['preset', 'custom']),
  customBg: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  customSurface: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  customText: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  customPrimary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  customAccent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  customSoft: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  customLine: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  customRadius: z.number().min(0).max(32),
  buttonStyle: z.enum(['solid', 'outline', 'pill']),
  headingFont: z.string().optional(),
  instagram: z.string().optional(),
  whatsapp: z.string().optional(),
  tiktok: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const LOGO_EMOJIS = ['🛍️', '☕', '🪴', '🧵', '🎨', '📚', '✨', '⚡'];
const inputCls = 'h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent';

const colorFields = [
  { key: 'customBg', label: 'Page', token: 'bg' },
  { key: 'customSurface', label: 'Panels', token: 'surface' },
  { key: 'customText', label: 'Text', token: 'text' },
  { key: 'customPrimary', label: 'Primary', token: 'primary' },
  { key: 'customAccent', label: 'Accent', token: 'accent' },
  { key: 'customSoft', label: 'Soft', token: 'soft' },
  { key: 'customLine', label: 'Lines', token: 'line' },
] as const;

const overridesFromValues = (values: FormValues): ThemeOverrides => ({
  bg: values.customBg,
  surface: values.customSurface,
  text: values.customText,
  primary: values.customPrimary,
  accent: values.customAccent,
  soft: values.customSoft,
  line: values.customLine,
  radius: `${Math.round(values.customRadius)}px`,
  buttonStyle: values.buttonStyle,
  headingFont: values.headingFont || undefined,
  instagram: values.instagram || undefined,
  whatsapp: values.whatsapp || undefined,
  tiktok: values.tiktok || undefined,
});

const colorDefaultsFor = (themeId: string, overrides?: ThemeOverrides | null) => {
  const theme = resolveStoreTheme(themeId, overrides);
  return {
    customBg: theme.bg,
    customSurface: theme.surface,
    customText: theme.text,
    customPrimary: theme.primary,
    customAccent: theme.accent,
    customSoft: theme.soft,
    customLine: theme.line,
    customRadius: Number.parseInt(theme.radius, 10) || 0,
  };
};

export default function Appearance() {
  const { storeId, store } = useAdminContext();
  const products = useStore((s) => s.products);
  const updateStore = useStore((s) => s.updateStore);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const existingOverrides = store.themeOverrides as Record<string, string> | null | undefined;

  const defaults: FormValues = {
    name: store.name,
    tagline: store.tagline,
    logoEmoji: store.logoEmoji,
    logoUrl: store.logoUrl,
    announcement: store.announcement || '',
    about: store.about || '',
    shippingType: store.shipping?.type || 'FLAT',
    shippingFlatText: store.shipping?.flatCents ? (store.shipping.flatCents / 100).toString() : '',
    shippingFreeOverText: store.shipping?.freeOverCents ? (store.shipping.freeOverCents / 100).toString() : '',
    themeId: store.themeId,
    storefrontTemplate: store.storefrontTemplate || 'editorial',
    paletteMode: store.themeOverrides ? 'custom' : 'preset',
    buttonStyle: (existingOverrides?.buttonStyle as 'solid' | 'outline' | 'pill') || 'solid',
    headingFont: existingOverrides?.headingFont || '',
    instagram: existingOverrides?.instagram || '',
    whatsapp: existingOverrides?.whatsapp || '',
    tiktok: existingOverrides?.tiktok || '',
    ...colorDefaultsFor(store.themeId, store.themeOverrides),
  };

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const values = watch();
  const shippingType = watch('shippingType');
  const paletteMode = watch('paletteMode');
  const storeProducts = products.filter((p) => p.storeId === storeId);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await prepareImageDataUrl(file, { maxDimension: 512, maxBytes: 420_000 });
      setValue('logoUrl', dataUrl, { shouldDirty: true });
      setValue('logoEmoji', undefined, { shouldDirty: true });
      toast({ title: 'Logo ready', description: 'Save changes to publish it.', type: 'success' });
    } catch (error) {
      toast({ title: 'Could not use image', description: error instanceof Error ? error.message : 'Try a smaller image.', type: 'error' });
    } finally {
      event.target.value = '';
    }
  };

  const onSubmit = (data: FormValues) => {
    const {
      shippingType,
      shippingFlatText,
      shippingFreeOverText,
      paletteMode: _paletteMode,
      customBg,
      customSurface,
      customText,
      customPrimary,
      customAccent,
      customSoft,
      customLine,
      customRadius,
      buttonStyle: _b,
      headingFont: _h,
      instagram: _i,
      whatsapp: _w,
      tiktok: _t,
      ...patch
    } = data;
    const shipping = {
      type: shippingType,
      flatCents: shippingType === 'PICKUP' ? 0 : shippingFlatText ? Math.round(parseFloat(shippingFlatText) * 100) : 0,
      freeOverCents: shippingType === 'FREE_OVER' && shippingFreeOverText ? Math.round(parseFloat(shippingFreeOverText) * 100) : undefined,
    };
    const themeOverrides = overridesFromValues(data);
    updateStore(store.id, { ...patch, themeOverrides, shipping });
    reset(data);
    toast({ title: 'Storefront updated', type: 'success' });
  };

  const selectTheme = (themeId: string) => {
    setValue('themeId', themeId, { shouldDirty: true });
    const next = colorDefaultsFor(themeId);
    Object.entries(next).forEach(([key, value]) => {
      setValue(key as keyof FormValues, value as never, { shouldDirty: true });
    });
  };

  const usePresetPalette = () => {
    setValue('paletteMode', 'preset', { shouldDirty: true });
    const next = colorDefaultsFor(values.themeId);
    Object.entries(next).forEach(([key, value]) => {
      setValue(key as keyof FormValues, value as never, { shouldDirty: true });
    });
  };

  const previewOverrides = overridesFromValues(values);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="pb-24">
      <PageHeader
        title="Appearance"
        subtitle="Brand, theme, and design settings for your storefront."
        action={
          <Button type="button" variant="ghost" className="gap-2 border border-line" onClick={() => window.open(`/#/s/${store.slug}`, '_blank')}>
            <ExternalLink className="h-4 w-4" /> View live
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          {/* Brand */}
          <Section title="Brand">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Store name" error={errors.name?.message}>
                <Input {...register('name')} />
              </FormField>
              <FormField label="Tagline" error={errors.tagline?.message}>
                <Input {...register('tagline')} />
              </FormField>
              <FormField label="Announcement bar" error={errors.announcement?.message}>
                <Input {...register('announcement')} placeholder="e.g. Free shipping this weekend" />
              </FormField>
              <FormField label="Template">
                <input type="hidden" {...register('storefrontTemplate')} />
                <div className="flex h-10 items-center text-sm font-semibold text-muted">{STOREFRONT_TEMPLATES.find((t) => t.id === values.storefrontTemplate)?.name || 'Editorial'}</div>
              </FormField>
            </div>

            <div className="mt-4">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">Logo</p>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-paper text-3xl">
                  {values.logoUrl ? <img src={values.logoUrl} alt="" className="h-full w-full object-cover" /> : (values.logoEmoji || '🛍️')}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {LOGO_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => { setValue('logoEmoji', emoji, { shouldDirty: true }); setValue('logoUrl', undefined, { shouldDirty: true }); }}
                        className={cn('flex h-8 w-8 items-center justify-center rounded-lg border bg-paper', values.logoEmoji === emoji && !values.logoUrl ? 'border-ink bg-line/50' : 'border-line hover:border-ink/30')}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs font-bold text-ink hover:bg-paper">
                    <ImageIcon className="h-3 w-3" /> Upload logo
                    <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <FormField label="About & policies" error={errors.about?.message}>
                <Textarea {...register('about')} rows={4} placeholder="Tell customers about your shop, fulfillment, and policies…" />
              </FormField>
            </div>
          </Section>

          {/* Templates */}
          <Section title="Templates">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {STOREFRONT_TEMPLATES.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  onClick={() => setValue('storefrontTemplate', template.id, { shouldDirty: true })}
                  className={cn('rounded-xl border-2 bg-paper p-4 text-left transition-all', values.storefrontTemplate === template.id ? 'border-ink shadow-sm' : 'border-line hover:border-ink/30')}
                >
                  <div className="mb-2 flex items-center gap-2 text-ink">
                    <LayoutTemplate className="h-4 w-4" />
                    <span className="font-bold">{template.name}</span>
                  </div>
                  <div className="text-sm font-semibold text-ink">{template.vibe}</div>
                  <div className="mt-0.5 text-xs leading-5 text-muted">{template.description}</div>
                  <TemplateDiagram id={template.id} />
                </button>
              ))}
            </div>
          </Section>

          {/* Theme presets */}
          <Section title="Theme presets">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {THEMES.map((theme) => (
                <button
                  type="button"
                  key={theme.id}
                  onClick={() => selectTheme(theme.id)}
                  className={cn('rounded-xl border-2 p-4 text-left transition-all', values.themeId === theme.id ? 'border-ink shadow-sm' : 'border-line hover:border-ink/30')}
                  style={{ backgroundColor: theme.surface, color: theme.text }}
                >
                  <div className="mb-3 flex gap-2">
                    <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: theme.bg }} />
                    <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: theme.primary }} />
                    <span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: theme.accent }} />
                  </div>
                  <div className="font-bold">{theme.name}</div>
                  <div className="text-xs opacity-70">{theme.vibe}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* Custom colours */}
          <Section title="Custom colours">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper p-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-sm font-bold text-ink">Palette mode</p>
                  <p className="text-xs text-muted">{paletteMode === 'custom' ? 'Using your custom colors.' : 'Using the selected preset.'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant={paletteMode === 'preset' ? 'accent' : 'ghost'} className="h-9 border border-line px-3" onClick={usePresetPalette}>Preset</Button>
                <Button type="button" variant={paletteMode === 'custom' ? 'accent' : 'ghost'} className="h-9 border border-line px-3" onClick={() => setValue('paletteMode', 'custom', { shouldDirty: true })}>Custom</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {colorFields.map((field) => (
                <label key={field.key} className="rounded-xl border border-line bg-paper p-3">
                  <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted">{field.label}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={values[field.key]}
                      onChange={(e) => {
                        setValue(field.key, e.target.value, { shouldDirty: true, shouldValidate: true });
                        setValue('paletteMode', 'custom', { shouldDirty: true });
                      }}
                      className="h-9 w-10 cursor-pointer rounded border border-line bg-transparent"
                    />
                    <Input
                      {...register(field.key)}
                      onChange={(e) => {
                        setValue(field.key, e.target.value, { shouldDirty: true, shouldValidate: true });
                        setValue('paletteMode', 'custom', { shouldDirty: true });
                      }}
                      className="h-9 font-mono text-xs"
                    />
                  </div>
                </label>
              ))}
              <label className="rounded-xl border border-line bg-paper p-3">
                <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted">Corners</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="32"
                    value={values.customRadius}
                    onChange={(e) => {
                      setValue('customRadius', Number(e.target.value), { shouldDirty: true });
                      setValue('paletteMode', 'custom', { shouldDirty: true });
                    }}
                    className="min-w-0 flex-1"
                  />
                  <span className="w-12 text-right text-xs font-bold text-muted">{values.customRadius}px</span>
                </div>
              </label>
            </div>
            <Button type="button" variant="ghost" className="mt-4 gap-2 border border-line" onClick={usePresetPalette}>
              <RotateCcw className="h-4 w-4" /> Reset to preset colours
            </Button>
          </Section>

          {/* Design details */}
          <Section title="Design details">
            <div className="space-y-6">
              {/* Button style */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted">Button style</p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'solid', label: 'Solid', preview: 'bg-ink text-paper rounded' },
                    { value: 'outline', label: 'Outline', preview: 'border-2 border-ink text-ink rounded' },
                    { value: 'pill', label: 'Pill', preview: 'bg-ink text-paper rounded-full' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setValue('buttonStyle', opt.value, { shouldDirty: true })}
                      className={cn(
                        'rounded-xl border-2 p-4 text-left transition-all flex flex-col gap-3',
                        values.buttonStyle === opt.value ? 'border-ink shadow-sm bg-paper' : 'border-line hover:border-ink/30 bg-paper',
                      )}
                    >
                      <div className={cn('inline-flex h-8 items-center justify-center px-4 text-[11px] font-black uppercase tracking-wider', opt.preview)}>
                        Shop
                      </div>
                      <span className="text-xs font-bold text-ink">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Heading font */}
              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5" /> Heading font
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                  {HEADING_FONTS.map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setValue('headingFont', font.id, { shouldDirty: true })}
                      className={cn(
                        'rounded-xl border-2 p-3 text-left transition-all',
                        values.headingFont === font.id ? 'border-ink shadow-sm bg-paper' : 'border-line hover:border-ink/30 bg-paper',
                      )}
                    >
                      <p className="text-base font-black leading-tight tracking-tight" style={{ fontFamily: font.id }}>Aa</p>
                      <p className="mt-1 text-[10px] font-bold text-muted">{font.label}</p>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-muted">Applies to store name, taglines, and headings. Leave unset to use the theme default.</p>
              </div>
            </div>
          </Section>

          {/* Social links */}
          <Section title="Social links">
            <p className="mb-4 text-sm text-muted">Links appear as icons in your storefront footer.</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField label="Instagram">
                <div className="relative">
                  <Instagram className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input {...register('instagram')} placeholder="@yourstore" className="ps-9" />
                </div>
              </FormField>
              <FormField label="WhatsApp">
                <div className="relative">
                  <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">WA</span>
                  <Input {...register('whatsapp')} placeholder="+962791234567" className="ps-10" />
                </div>
              </FormField>
              <FormField label="TikTok">
                <div className="relative">
                  <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">TT</span>
                  <Input {...register('tiktok')} placeholder="@yourstore" className="ps-10" />
                </div>
              </FormField>
            </div>
          </Section>

          {/* Shipping */}
          <Section title="Shipping">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Shipping type" error={errors.shippingType?.message}>
                <select {...register('shippingType')} className={inputCls}>
                  <option value="FLAT">Flat rate</option>
                  <option value="FREE_OVER">Flat rate, free over threshold</option>
                  <option value="PICKUP">Pickup only</option>
                </select>
              </FormField>
              {shippingType !== 'PICKUP' && (
                <FormField label="Flat shipping ($)" error={errors.shippingFlatText?.message}>
                  <Input {...register('shippingFlatText')} type="number" step="0.01" placeholder="0.00" />
                </FormField>
              )}
              {shippingType === 'FREE_OVER' && (
                <FormField label="Free shipping over ($)" error={errors.shippingFreeOverText?.message}>
                  <Input {...register('shippingFreeOverText')} type="number" step="0.01" placeholder="75.00" />
                </FormField>
              )}
            </div>
          </Section>
        </div>

        {/* Live preview */}
        <div className="hidden xl:block">
          <div className="sticky top-28">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Live preview</span>
            </div>
            <div className="aspect-[4/5] max-h-[760px] overflow-hidden rounded-[20px] border border-line shadow-xl">
              <MiniStorefront
                store={{
                  ...store,
                  name: values.name,
                  tagline: values.tagline,
                  logoEmoji: values.logoEmoji,
                  logoUrl: values.logoUrl,
                  announcement: values.announcement,
                  about: values.about,
                  themeId: values.themeId,
                  storefrontTemplate: values.storefrontTemplate,
                  themeOverrides: previewOverrides,
                }}
                products={storeProducts.length > 0 ? storeProducts.slice(0, 6) : [
                  { name: 'Summer Dress', priceCents: 3500, imageEmoji: '👗' },
                  { name: 'Linen Tote', priceCents: 1800, imageEmoji: '👜' },
                  { name: 'Silk Scarf', priceCents: 2200, imageEmoji: '🧣' },
                  { name: 'Straw Hat', priceCents: 1500, imageEmoji: '🪖' },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky unsaved bar */}
      {isDirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 md:px-8">
            <span className="flex items-center gap-2 text-sm font-bold text-ink">
              <span className="h-2 w-2 rounded-full bg-accent" /> Unsaved changes
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="border border-line" onClick={() => reset(defaults)}>Discard</Button>
              <Button type="submit" variant="accent">Save changes</Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function TemplateDiagram({ id }: { id: FormValues['storefrontTemplate'] }) {
  const common = 'rounded bg-current opacity-20';
  if (id === 'market') {
    return (
      <div className="mt-4 grid grid-cols-4 gap-1 text-ink">
        <span className={cn(common, 'col-span-4 h-3')} />
        {Array.from({ length: 8 }).map((_, i) => <span key={i} className={cn(common, 'h-8')} />)}
      </div>
    );
  }
  if (id === 'lookbook') {
    return (
      <div className="mt-4 grid grid-cols-3 gap-1 text-ink">
        <span className={cn(common, 'col-span-2 row-span-2 h-16')} />
        <span className={cn(common, 'h-7')} />
        <span className={cn(common, 'h-8')} />
        <span className={cn(common, 'col-span-3 h-4')} />
      </div>
    );
  }
  if (id === 'boutique') {
    return (
      <div className="mt-4 grid grid-cols-2 gap-1 text-ink">
        <span className={cn(common, 'h-14')} />
        <span className={cn(common, 'h-14')} />
        <span className={cn(common, 'h-8')} />
        <span className={cn(common, 'h-8')} />
      </div>
    );
  }
  return (
    <div className="mt-4 grid grid-cols-3 gap-1 text-ink">
      <span className={cn(common, 'col-span-3 h-10')} />
      <span className={cn(common, 'h-9')} />
      <span className={cn(common, 'h-9')} />
      <span className={cn(common, 'h-9')} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm md:p-6">
      <h2 className="mb-4 font-heading text-2xl font-black tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}
