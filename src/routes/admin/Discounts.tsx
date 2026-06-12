import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgePercent, Check, ChevronDown, ImageIcon, Layers, Package,
  Plus, Search, Tag, Trash2, Truck, X, Zap,
} from 'lucide-react';
import { parseMoney, toMajor } from '@shared/money';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { cn } from '@/lib/cn';
import { prepareImageDataUrl } from '@/lib/images';
import { getDiscountStatus } from '@/lib/checkout';
import type { Discount, DiscountDetails, DiscountType, Product } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/dashboard';
import { ResourceTable, Column } from '@/components/ui/ResourceTable';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { useFocusParam } from '@/lib/useFocusParam';
import { useAdminContext, useStoreDiscounts, useStoreProducts } from './shared';

// ---------------------------------------------------------------------------
// Offer type definitions
// ---------------------------------------------------------------------------
type OfferMeta = {
  type: DiscountType;
  icon: React.ElementType;
  label: string;
  tagline: string;
  color: string;
};

const OFFER_TYPES: OfferMeta[] = [
  { type: 'PERCENT',       icon: BadgePercent, label: 'Percent off',     tagline: 'e.g. 20% off the total order',             color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { type: 'FIXED',         icon: Tag,          label: 'Fixed amount',    tagline: 'e.g. JOD 5 off',                           color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { type: 'FREE_SHIPPING', icon: Truck,        label: 'Free shipping',   tagline: 'Remove delivery fees at checkout',          color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { type: 'BXGY',          icon: Layers,       label: 'Quantity deal',   tagline: 'Buy X+ items, get Y% off the cart',        color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { type: 'TIERED',        icon: Zap,          label: 'Spend tiers',     tagline: 'The more they spend, the bigger the deal', color: 'text-rose-600 bg-rose-50 border-rose-200' },
];

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------
type Tier = { minText: string; pct: string };

type FormState = {
  type: DiscountType;
  name: string;
  imageDataUrl: string | null;
  code: string;
  percent: string;
  fixedAmount: string;
  buyQty: string;
  bxgyPct: string;
  tiers: Tier[];
  selectedProductIds: string[];
  minSubtotal: string;
  usageLimit: string;
  expiresAt: string;
  active: boolean;
};

function blankForm(type: DiscountType = 'PERCENT'): FormState {
  return {
    type,
    name: '', imageDataUrl: null, code: '',
    percent: '10', fixedAmount: '', buyQty: '3', bxgyPct: '15',
    tiers: [{ minText: '', pct: '' }],
    selectedProductIds: [],
    minSubtotal: '', usageLimit: '', expiresAt: '', active: true,
  };
}

function formFromDiscount(d: Discount, currency: string): FormState {
  const det = d.details as (DiscountDetails & Record<string, unknown>) | undefined;
  const tiers: Tier[] = det && 'tiers' in det && Array.isArray(det.tiers)
    ? (det.tiers as { minCents: number; pct: number }[]).map((t) => ({
        minText: String(toMajor(t.minCents, currency)),
        pct: String(t.pct),
      }))
    : [{ minText: '', pct: '' }];
  return {
    type: d.type,
    name: d.name ?? '',
    imageDataUrl: null,
    code: d.code,
    percent: d.type === 'PERCENT' ? String(d.value) : '10',
    fixedAmount: d.type === 'FIXED' ? String(toMajor(d.value, currency)) : '',
    buyQty: det && 'buyQty' in det ? String(det.buyQty) : '3',
    bxgyPct: det && 'discountPct' in det ? String(det.discountPct) : '15',
    tiers,
    selectedProductIds: d.productIds ?? [],
    minSubtotal: d.minSubtotalCents ? String(toMajor(d.minSubtotalCents, currency)) : '',
    usageLimit: d.usageLimit != null ? String(d.usageLimit) : '',
    expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString().slice(0, 10) : '',
    active: d.active,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const statusTone = (s: string) =>
  s === 'Valid'        ? 'border-green-200 bg-green-50 text-green-700'
  : s === 'Inactive'  ? 'border-line bg-paper text-muted'
  : 'border-amber-200 bg-amber-50 text-amber-700';

const offerLabel = (d: Discount, currency: string) => {
  if (d.type === 'PERCENT') return `${d.value}% off`;
  if (d.type === 'FIXED') return `${money(d.value, currency)} off`;
  if (d.type === 'FREE_SHIPPING') return 'Free shipping';
  const det = d.details as (DiscountDetails & Record<string, unknown>) | undefined;
  if (d.type === 'BXGY' && det && 'buyQty' in det) return `Buy ${det.buyQty}+, ${det.discountPct}% off`;
  if (d.type === 'TIERED' && det && 'tiers' in det) {
    const t = (det.tiers as { minCents: number; pct: number }[]);
    return `${t.length} tier${t.length !== 1 ? 's' : ''}`;
  }
  return '—';
};

function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted">
        {label}{required && <span className="text-accent">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600"><X className="h-3 w-3" />{error}</p>}
    </div>
  );
}

const inputCls = 'h-10 w-full rounded-md border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent';

function MoneyField({ label, value, onChange, currency, hint }: {
  label: string; value: string; onChange: (v: string) => void; currency: string; hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">{currency}</span>
        <Input type="number" step="0.001" min="0" value={value} onChange={(e) => onChange(e.target.value)} className="ps-12" />
      </div>
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Offer type picker
// ---------------------------------------------------------------------------
function OfferTypePicker({ value, onChange }: { value: DiscountType; onChange: (t: DiscountType) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
      {OFFER_TYPES.map((meta) => {
        const Icon = meta.icon;
        const active = value === meta.type;
        return (
          <button
            key={meta.type}
            type="button"
            onClick={() => onChange(meta.type)}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-3 text-start transition-all',
              active ? `${meta.color} shadow-sm ring-1 ring-current/30` : 'border-line bg-surface hover:border-ink/20',
            )}
          >
            <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border', active ? meta.color : 'border-line bg-paper text-muted')}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span>
              <span className={cn('block text-xs font-black', active ? '' : 'text-ink')}>{meta.label}</span>
              <span className="mt-0.5 block text-[10px] leading-tight text-muted">{meta.tagline}</span>
            </span>
            {active && <Check className="ms-auto h-3.5 w-3.5 shrink-0 self-center" />}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Image picker (compact)
// ---------------------------------------------------------------------------
function ImagePicker({ value, existing, onChange }: {
  value: string | null; existing?: string; onChange: (url: string | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const preview = value || existing;

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await prepareImageDataUrl(file, { maxDimension: 800, maxBytes: 300_000 });
      onChange(dataUrl);
    } catch (err) {
      toast({ title: 'Could not use image', description: err instanceof Error ? err.message : undefined, type: 'error' });
    } finally { e.target.value = ''; }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-paper text-2xl">
        {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-muted" />}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-paper">
          <ImageIcon className="h-3 w-3" /> {preview ? 'Replace' : 'Upload image'}
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onUpload} />
        </label>
        {preview && (
          <button type="button" onClick={() => onChange(null)} className="rounded-md border border-line px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier builder
// ---------------------------------------------------------------------------
function TierBuilder({ tiers, onChange, currency }: { tiers: Tier[]; onChange: (t: Tier[]) => void; currency: string }) {
  const set = (i: number, patch: Partial<Tier>) =>
    onChange(tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  return (
    <div className="space-y-2">
      {tiers.map((tier, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 rounded-xl border border-line bg-paper/60 p-2">
          <div className="relative">
            <span className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted">{currency}</span>
            <Input type="number" min="0" step="0.001" value={tier.minText} onChange={(e) => set(i, { minText: e.target.value })} placeholder="Min spend" className="ps-9 h-9 text-xs" />
          </div>
          <div className="relative">
            <Input type="number" min="1" max="100" value={tier.pct} onChange={(e) => set(i, { pct: e.target.value })} placeholder="% off" className="pe-7 h-9 text-xs" />
            <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted">%</span>
          </div>
          <button type="button" onClick={() => onChange(tiers.filter((_, idx) => idx !== i))}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line bg-paper text-muted hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      {tiers.length < 5 && (
        <button type="button" onClick={() => onChange([...tiers, { minText: '', pct: '' }])}
          className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-line px-3 py-2 text-xs font-bold text-muted hover:border-ink/30 hover:text-ink">
          <Plus className="h-3.5 w-3.5" /> Add tier
        </button>
      )}
      <p className="text-[10px] text-muted">The highest qualifying tier applies at checkout.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product picker
// ---------------------------------------------------------------------------
function ProductPicker({ selected, products, currency, onChange }: {
  selected: string[];
  products: Product[];
  currency: string;
  onChange: (ids: string[]) => void;
}) {
  const [scope, setScope] = useState<'all' | 'specific'>(selected.length > 0 ? 'specific' : 'all');
  const [query, setQuery] = useState('');

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return products.filter((p) =>
      !q || p.name.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q),
    );
  }, [products, query]);

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
      <p className="text-xs font-black text-ink">Applies to</p>

      {/* Scope toggle */}
      <div className="grid grid-cols-2 gap-2">
        {([['all', 'All products', 'Discount applies to every product in the cart'] as const,
           ['specific', 'Specific products', 'Only selected products count toward this offer'] as const]).map(([val, label, hint]) => (
          <button
            key={val}
            type="button"
            onClick={() => {
              setScope(val);
              if (val === 'all') onChange([]);
            }}
            className={cn(
              'flex flex-col items-start rounded-xl border p-3 text-start transition-all',
              scope === val
                ? 'border-accent bg-accent/5 shadow-sm ring-1 ring-accent/30'
                : 'border-line bg-paper hover:border-ink/20',
            )}
          >
            <span className="flex w-full items-center justify-between">
              <span className="text-xs font-black text-ink">{label}</span>
              {scope === val && <Check className="h-3.5 w-3.5 text-accent" />}
            </span>
            <span className="mt-0.5 text-[10px] leading-tight text-muted">{hint}</span>
          </button>
        ))}
      </div>

      {/* Product list */}
      {scope === 'specific' && (
        <div className="space-y-2">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-lg border border-line bg-paper ps-9 pe-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Selected chips */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((id) => {
                const p = products.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <span key={id} className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/5 px-2 py-0.5 text-[10px] font-bold text-accent">
                    {p.name}
                    <button type="button" onClick={() => toggle(id)} className="hover:text-red-500">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                );
              })}
              {selected.length > 1 && (
                <button type="button" onClick={() => onChange([])}
                  className="rounded-full border border-line px-2 py-0.5 text-[10px] font-bold text-muted hover:text-red-500">
                  Clear all
                </button>
              )}
            </div>
          )}

          {/* Scrollable product list */}
          <div className="max-h-56 overflow-y-auto rounded-xl border border-line bg-paper divide-y divide-line">
            {filtered.length === 0 && (
              <p className="py-6 text-center text-xs text-muted">No products found</p>
            )}
            {filtered.map((p) => {
              const checked = selected.includes(p.id);
              return (
                <label key={p.id} className={cn(
                  'flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/5',
                  checked && 'bg-accent/5',
                )}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} className="h-4 w-4 accent-accent shrink-0" />
                  <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-paper text-sm">
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                      : <Package className="h-3.5 w-3.5 text-muted" />}
                  </div>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-xs font-bold text-ink">{p.name}</span>
                    {p.category && <span className="text-[10px] text-muted">{p.category}</span>}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-muted">{money(p.priceCents, currency)}</span>
                </label>
              );
            })}
          </div>

          {selected.length > 0 && (
            <p className="text-[10px] text-muted">
              {selected.length} product{selected.length !== 1 ? 's' : ''} selected — discount applies only to these items in the cart.
            </p>
          )}
          {selected.length === 0 && (
            <p className="text-[10px] text-red-500">Select at least one product, or switch to "All products".</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Advanced section toggle
// ---------------------------------------------------------------------------
function AdvancedSection({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-paper px-4 py-2.5 text-xs font-bold text-muted hover:text-ink">
        <span>Limits & expiry (optional)</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="mt-3 space-y-4">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Offer drawer
// ---------------------------------------------------------------------------
function OfferDrawer({ open, onClose, editing, storeDiscounts, storeProducts, currency }: {
  open: boolean; onClose: () => void;
  editing: Discount | null;
  storeDiscounts: Discount[];
  storeProducts: Product[];
  currency: string;
}) {
  const addDiscount = useStore((s) => s.addDiscount);
  const updateDiscount = useStore((s) => s.updateDiscount);
  const { storeId } = useAdminContext();

  const [form, setForm] = useState<FormState>(() => blankForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(editing ? formFromDiscount(editing, currency) : blankForm());
  }, [open, editing, currency]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    const code = form.code.trim().toUpperCase();
    if (!code) { e.code = 'Code is required'; }
    else if (storeDiscounts.some((d) => d.code === code && d.id !== editing?.id)) {
      e.code = 'Code already exists for this store';
    }
    if (form.type === 'PERCENT') {
      const v = Number(form.percent);
      if (!form.percent || v < 1 || v > 100) e.percent = 'Enter 1–100';
    }
    if (form.type === 'FIXED') {
      const v = parseMoney(form.fixedAmount, currency) ?? 0;
      if (v <= 0) e.fixedAmount = 'Enter an amount greater than 0';
    }
    if (form.type === 'BXGY') {
      if (!form.buyQty || Number(form.buyQty) < 2) e.buyQty = 'Must be at least 2';
      const p = Number(form.bxgyPct);
      if (!form.bxgyPct || p < 1 || p > 100) e.bxgyPct = 'Enter 1–100';
    }
    if (form.type === 'TIERED') {
      const valid = form.tiers.filter((t) => t.minText && t.pct);
      if (valid.length === 0) e.tiers = 'Add at least one tier';
    }
    return e;
  };

  const buildPayload = () => {
    const type = form.type;
    let value = 0;
    let details: string | undefined;

    if (type === 'PERCENT') value = Math.round(Number(form.percent));
    if (type === 'FIXED') value = parseMoney(form.fixedAmount, currency) ?? 0;
    if (type === 'BXGY') {
      details = JSON.stringify({ buyQty: Math.round(Number(form.buyQty)), discountPct: Math.round(Number(form.bxgyPct)) });
    }
    if (type === 'TIERED') {
      const tiers = form.tiers
        .filter((t) => t.minText && t.pct)
        .map((t) => ({ minCents: parseMoney(t.minText, currency) ?? 0, pct: Math.round(Number(t.pct)) }))
        .sort((a, b) => a.minCents - b.minCents);
      details = JSON.stringify({ tiers });
    }

    const productIds = form.selectedProductIds.length > 0
      ? JSON.stringify(form.selectedProductIds)
      : null;

    return {
      name: form.name.trim() || undefined,
      imageUrl: form.imageDataUrl || (editing?.imageUrl && !form.imageDataUrl ? editing.imageUrl : undefined),
      details: details ?? null,
      productIds,
      code: form.code.trim().toUpperCase(),
      type,
      value,
      minSubtotalCents: form.minSubtotal ? (parseMoney(form.minSubtotal, currency) ?? undefined) : undefined,
      usageLimit: form.usageLimit ? (Number(form.usageLimit) || undefined) : undefined,
      expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).getTime() : undefined,
      active: form.active,
    };
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      if (editing) {
        updateDiscount(storeId, editing.id, payload as unknown as Partial<Discount>);
        toast({ title: 'Offer updated', type: 'success' });
      } else {
        addDiscount(storeId, payload as unknown as Omit<Discount, 'id' | 'storeId' | 'createdAt' | 'usedCount'>);
        toast({ title: 'Offer created', type: 'success' });
      }
      onClose();
    } catch {
      toast({ title: 'Could not save offer', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const meta = OFFER_TYPES.find((m) => m.type === form.type)!;
  const borderColor = meta.color.split(' ').find((c) => c.startsWith('border')) ?? 'border-line';
  const textColor  = meta.color.split(' ').find((c) => c.startsWith('text'))   ?? 'text-ink';

  return (
    <Drawer
      isOpen={open}
      onClose={onClose}
      title={editing ? 'Edit offer' : 'New offer'}
      description={editing ? (editing.name || editing.code) : 'Set up a promo code or deal for your store.'}
      className="max-w-2xl"
      footer={
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" className="border border-line" onClick={onClose}>
            <X className="h-4 w-4 me-1" /> Cancel
          </Button>
          <div className="flex-1" />
          <Button type="submit" form="offer-form" variant="accent" disabled={submitting}>
            <Check className="h-4 w-4 me-1" /> {editing ? 'Save changes' : 'Create offer'}
          </Button>
        </div>
      }
    >
      <form id="offer-form" onSubmit={onSubmit} className="space-y-6">

        {/* Offer type picker */}
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Offer type</p>
          <OfferTypePicker value={form.type} onChange={(t) => set('type', t)} />
        </div>

        {/* Display info */}
        <div className="rounded-2xl border border-line bg-surface p-4 space-y-4">
          <p className="text-xs font-black text-ink">Display</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Offer name" hint="Shown on the storefront (e.g. Summer Sale)">
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Bundle Deal" />
            </Field>
            <Field label="Promo code" required error={errors.code}>
              <Input
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="SAVE20"
                className={cn(errors.code && 'border-red-400')}
              />
            </Field>
          </div>
          <Field label="Offer image" hint="Shown when the customer applies the code (optional)">
            <ImagePicker value={form.imageDataUrl} existing={editing?.imageUrl} onChange={(url) => set('imageDataUrl', url)} />
          </Field>
        </div>

        {/* Type-specific fields */}
        <div className={cn('rounded-2xl border p-4 space-y-4', borderColor, 'bg-surface')}>
          <p className={cn('text-xs font-black', textColor)}>{meta.label}</p>

          {form.type === 'PERCENT' && (
            <Field label="Percent off" required error={errors.percent}>
              <div className="relative">
                <Input type="number" min="1" max="100" step="1" value={form.percent}
                  onChange={(e) => set('percent', e.target.value)} placeholder="20"
                  className={cn('pe-8', errors.percent && 'border-red-400')} />
                <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">%</span>
              </div>
            </Field>
          )}

          {form.type === 'FIXED' && (
            <MoneyField label="Amount off" value={form.fixedAmount} onChange={(v) => set('fixedAmount', v)} currency={currency} />
          )}

          {form.type === 'FREE_SHIPPING' && (
            <p className="text-sm text-muted">This code removes all shipping fees when applied at checkout.</p>
          )}

          {form.type === 'BXGY' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Minimum item count" required error={errors.buyQty} hint="Customer needs at least this many items in their cart">
                <div className="relative">
                  <Input type="number" min="2" step="1" value={form.buyQty}
                    onChange={(e) => set('buyQty', e.target.value)} placeholder="3"
                    className={cn('pe-14', errors.buyQty && 'border-red-400')} />
                  <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">items</span>
                </div>
              </Field>
              <Field label="Discount applied" required error={errors.bxgyPct}>
                <div className="relative">
                  <Input type="number" min="1" max="100" step="1" value={form.bxgyPct}
                    onChange={(e) => set('bxgyPct', e.target.value)} placeholder="15"
                    className={cn('pe-8', errors.bxgyPct && 'border-red-400')} />
                  <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted">%</span>
                </div>
              </Field>
            </div>
          )}

          {form.type === 'TIERED' && (
            <Field label="Spend tiers" error={errors.tiers} hint="Set minimum spend amounts and the % off each tier unlocks">
              <div className="mt-2">
                <div className="mb-2 grid grid-cols-[1fr_1fr_auto] gap-2 px-2">
                  <span className="text-[10px] font-bold uppercase text-muted">Min spend ({currency})</span>
                  <span className="text-[10px] font-bold uppercase text-muted">Discount %</span>
                  <span />
                </div>
                <TierBuilder tiers={form.tiers} onChange={(t) => set('tiers', t)} currency={currency} />
              </div>
            </Field>
          )}
        </div>

        {/* Product scoping */}
        <ProductPicker
          selected={form.selectedProductIds}
          products={storeProducts}
          currency={currency}
          onChange={(ids) => set('selectedProductIds', ids)}
        />

        {/* Advanced / limits */}
        <AdvancedSection>
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyField
              label="Minimum order subtotal"
              value={form.minSubtotal}
              onChange={(v) => set('minSubtotal', v)}
              currency={currency}
              hint="Leave blank for no minimum"
            />
            <Field label="Usage limit" hint="Max total redemptions (blank = unlimited)">
              <Input type="number" min="1" step="1" value={form.usageLimit}
                onChange={(e) => set('usageLimit', e.target.value)} placeholder="Unlimited" />
            </Field>
            <Field label="Expiry date" hint="Code stops working after this date">
              <input type="date" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)}
                className={cn(inputCls, 'cursor-pointer')} />
            </Field>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-paper px-4 py-3 hover:bg-line/10">
            <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="h-4 w-4 accent-accent" />
            <span className="text-sm font-bold text-ink">Active</span>
            <span className="ms-auto text-xs text-muted">Customers can apply this code at checkout</span>
          </label>
        </AdvancedSection>

      </form>
    </Drawer>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function Discounts() {
  const { storeId, store } = useAdminContext();
  const deleteDiscount = useStore((s) => s.deleteDiscount);
  const scopedDiscounts = useStoreDiscounts(storeId);
  const scopedProducts  = useStoreProducts(storeId);
  const currency = store.currency;

  const [editing, setEditing] = useState<Discount | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleting, setDeleting] = useState<Discount | null>(null);
  const [focusId, clearFocus] = useFocusParam();

  const storeDiscounts = useMemo(
    () => [...scopedDiscounts].sort((a, b) => b.createdAt - a.createdAt),
    [scopedDiscounts],
  );
  const storeProducts = useMemo(
    () => [...scopedProducts].sort((a, b) => a.name.localeCompare(b.name)),
    [scopedProducts],
  );

  useEffect(() => {
    if (!focusId) return;
    const d = storeDiscounts.find((x) => x.id === focusId);
    if (d) { setEditing(d); setDrawerOpen(true); }
    clearFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const openCreate = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit   = (d: Discount) => { setEditing(d); setDrawerOpen(true); };

  const columns: Column<Discount>[] = [
    {
      key: 'code', label: 'Offer', sortable: true,
      render: (d) => {
        const meta = OFFER_TYPES.find((m) => m.type === d.type);
        const Icon = meta?.icon ?? Tag;
        const textCol = meta?.color.split(' ').find((c) => c.startsWith('text'));
        return (
          <div className="flex items-center gap-2">
            {d.imageUrl && (
              <img src={d.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg border border-line object-cover" />
            )}
            <div>
              {d.name && <p className="text-xs font-black text-ink leading-none">{d.name}</p>}
              <div className="flex items-center gap-1.5 mt-0.5">
                <Icon className={cn('h-3 w-3', textCol)} />
                <span className="font-mono text-sm font-black text-ink">{d.code}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'value', label: 'Reward',
      render: (d) => <span className="text-sm text-muted">{offerLabel(d, currency)}</span>,
      sortValue: (d) => d.type,
    },
    {
      key: 'productIds', label: 'Products', hideOnMobile: true,
      render: (d) => {
        const count = d.productIds?.length ?? 0;
        return count > 0
          ? <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[10px] font-bold text-ink">{count} product{count !== 1 ? 's' : ''}</span>
          : <span className="text-xs text-muted">All</span>;
      },
    },
    {
      key: 'usedCount', label: 'Used', align: 'right', sortable: true,
      render: (d) => <span className="font-semibold">{d.usedCount}{d.usageLimit ? ` / ${d.usageLimit}` : ''}</span>,
    },
    {
      key: 'expiresAt', label: 'Expires', align: 'right', hideOnMobile: true, sortable: true,
      sortValue: (d) => d.expiresAt ?? Number.MAX_SAFE_INTEGER,
      render: (d) => <span className="text-muted">{d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '—'}</span>,
    },
    {
      key: 'active', label: 'Status', align: 'right',
      render: (d) => {
        const status = getDiscountStatus(d, Number.MAX_SAFE_INTEGER);
        return (
          <span className={cn('rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-widest', statusTone(status))}>
            {status}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offers & Discounts"
        subtitle="Promo codes and deals customers can apply at checkout."
        action={
          <Button variant="accent" className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New offer
          </Button>
        }
      />

      <ResourceTable
        rows={storeDiscounts}
        columns={columns}
        getId={(d) => d.id}
        searchKeys={['code']}
        searchPlaceholder="Search by code or name"
        onRowClick={openEdit}
        onEdit={openEdit}
        onDelete={(d) => setDeleting(d)}
        emptyIcon={BadgePercent}
        emptyTitle="No offers yet"
        emptyText="Create percent off, fixed amount, free shipping, quantity deals, and spend-tier offers."
        emptyAction={<Button variant="accent" onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Create an offer</Button>}
      />

      <OfferDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editing={editing}
        storeDiscounts={storeDiscounts}
        storeProducts={storeProducts}
        currency={currency}
      />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete this offer?"
        description={deleting ? `Code "${deleting.code}" will no longer work at checkout.` : ''}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) { deleteDiscount(storeId, deleting.id); toast({ title: 'Offer deleted' }); }
          setDeleting(null);
        }}
      />
    </div>
  );
}
