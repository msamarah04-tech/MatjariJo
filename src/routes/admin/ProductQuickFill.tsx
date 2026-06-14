import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, CheckCircle2, ImageIcon, Loader2, Link2, X,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { prepareImageDataUrl } from '@/lib/images';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { useAdminContext, useStoreProducts } from './shared';
import type { Product } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMinor(text: string, currency: string): number {
  const n = parseFloat(text) || 0;
  const exp = currency === 'JOD' ? 3 : 2;
  return Math.round(n * 10 ** exp);
}

function toDisplay(cents: number, currency: string): string {
  const exp = currency === 'JOD' ? 3 : 2;
  return cents > 0 ? (cents / 10 ** exp).toFixed(exp) : '';
}

// ─── Per-card state ──────────────────────────────────────────────────────────

type CardState = {
  imageUrl: string;
  priceText: string;
  saving: boolean;
  done: boolean;
  dragging: boolean;
  showUrlInput: boolean;
  urlDraft: string;
  urlError: string;
};

// ─── Card ────────────────────────────────────────────────────────────────────

function ProductCard({
  product, storeId, currency, onSaved,
}: {
  product: Product;
  storeId: string;
  currency: string;
  onSaved: (id: string) => void;
}) {
  const updateProduct = useStore((s) => s.updateProduct);
  const fileRef = useRef<HTMLInputElement>(null);

  const [s, setS] = useState<CardState>({
    imageUrl: product.imageUrl || '',
    priceText: toDisplay(product.priceCents, currency),
    saving: false,
    done: false,
    dragging: false,
    showUrlInput: false,
    urlDraft: '',
    urlError: '',
  });
  const patch = (p: Partial<CardState>) => setS((prev) => ({ ...prev, ...p }));

  // ── Image from file ────────────────────────────────────────────────────────
  const applyFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast({ title: 'Choose an image file', type: 'error' }); return; }
    try {
      const dataUrl = await prepareImageDataUrl(file, { maxDimension: 1000, maxBytes: 450_000 });
      patch({ imageUrl: dataUrl });
    } catch {
      toast({ title: 'Could not load image', type: 'error' });
    }
  };

  // ── Drop handler: supports file drops AND URL drops from browser ───────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    patch({ dragging: false });
    const file = e.dataTransfer.files[0];
    if (file) { applyFile(file); return; }
    // Dragging an image from a browser tab sends a URL via text/uri-list
    const uriList = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (uriList?.match(/^https?:\/\//)) patch({ imageUrl: uriList.split('\n')[0].trim() });
  };

  // ── Paste image URL ────────────────────────────────────────────────────────
  const applyUrl = () => {
    const url = s.urlDraft.trim();
    if (!url.match(/^https?:\/\//)) { patch({ urlError: 'Enter a full URL starting with https://' }); return; }
    patch({ imageUrl: url, showUrlInput: false, urlDraft: '', urlError: '' });
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const priceCents = toMinor(s.priceText, currency);
    if (!priceCents) { toast({ title: 'Price is required to save', type: 'error' }); return; }
    patch({ saving: true });
    try {
      const newTags = (product.tags || []).filter((t) => t !== 'needs-details');
      await updateProduct(storeId, product.id, {
        priceCents,
        imageUrl: s.imageUrl || undefined,
        imageEmoji: s.imageUrl ? undefined : (product.imageEmoji || '📦'),
        tags: newTags,
        isActive: true,
      } as Partial<Product>);
      patch({ done: true, saving: false });
      onSaved(product.id);
      toast({ title: `${product.name} saved`, type: 'success' });
    } catch {
      patch({ saving: false });
      toast({ title: 'Could not save product', type: 'error' });
    }
  };

  if (s.done) return null;

  const hasImage = Boolean(s.imageUrl);
  const hasPrice = Boolean(s.priceText && parseFloat(s.priceText) > 0);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">

      {/* ── Image zone ─────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'relative h-44 cursor-pointer select-none transition-colors',
          s.dragging ? 'bg-accent/10 ring-2 ring-inset ring-accent' : 'bg-paper',
        )}
        onDragOver={(e) => { e.preventDefault(); patch({ dragging: true }); }}
        onDragLeave={() => patch({ dragging: false })}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        {hasImage ? (
          <>
            <img src={s.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors hover:bg-ink/25">
              <span className="rounded-lg bg-ink/70 px-2 py-1 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100">Change</span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); patch({ imageUrl: '' }); }}
              className="absolute end-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-white hover:bg-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted">
            <ImageIcon className={cn('h-9 w-9', s.dragging && 'text-accent')} />
            <div className="text-center">
              <p className="text-xs font-bold text-ink">Drop image here</p>
              <p className="text-[11px] text-muted">or click to upload · drag from browser</p>
            </div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f); e.target.value = ''; }}
        />
      </div>

      {/* ── Card body ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate font-bold text-ink">{product.name}</p>
          <p className="text-xs text-muted">{product.category}</p>
        </div>

        {/* URL paste toggle */}
        <div>
          <button
            type="button"
            onClick={() => patch({ showUrlInput: !s.showUrlInput, urlError: '' })}
            className="flex items-center gap-1 text-[11px] font-bold text-accent hover:underline underline-offset-2"
          >
            <Link2 className="h-3 w-3" />
            {s.showUrlInput ? 'Cancel URL' : 'Use image URL instead'}
          </button>
          {s.showUrlInput && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1.5">
                <input
                  type="url"
                  autoFocus
                  placeholder="https://example.com/image.jpg"
                  value={s.urlDraft}
                  onChange={(e) => patch({ urlDraft: e.target.value, urlError: '' })}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyUrl(); }}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={applyUrl}
                  className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-muted hover:border-ink/40 hover:text-ink"
                >
                  Use
                </button>
              </div>
              {s.urlError && <p className="text-[11px] text-red-600 font-semibold">{s.urlError}</p>}
            </div>
          )}
        </div>

        {/* Price input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              min="0"
              step={currency === 'JOD' ? '0.001' : '0.01'}
              placeholder="0.000"
              value={s.priceText}
              onChange={(e) => patch({ priceText: e.target.value })}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm font-semibold text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <span className="text-xs font-bold text-muted">{currency}</span>
        </div>

        {/* Missing indicators */}
        {(!hasImage || !hasPrice) && (
          <div className="flex flex-wrap gap-1">
            {!hasImage && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                No image
              </span>
            )}
            {!hasPrice && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-200">
                Price required
              </span>
            )}
          </div>
        )}

        {/* Save */}
        <Button
          variant="accent"
          className="mt-auto w-full gap-2"
          disabled={s.saving || !hasPrice}
          onClick={handleSave}
        >
          {s.saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          ) : (
            <><Check className="h-4 w-4" /> Save &amp; complete</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductQuickFill() {
  const { storeId, store } = useAdminContext();
  const navigate = useNavigate();
  const allProducts = useStoreProducts(storeId);

  const needsDetails = allProducts.filter((p) => (p.tags || []).includes('needs-details'));
  const total = needsDetails.length;

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const remaining = needsDetails.filter((p) => !savedIds.has(p.id));
  const doneCount = total - remaining.length;

  const handleSaved = (id: string) => setSavedIds((prev) => new Set([...prev, id]));

  // ── All done ───────────────────────────────────────────────────────────────
  if (total === 0 || (doneCount === total && total > 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <CheckCircle2 className="h-14 w-14 text-green-500" />
        <h2 className="mt-4 font-black text-2xl text-ink">
          {total === 0 ? 'No products need details' : 'All products completed!'}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {total === 0
            ? 'Import products from Excel first, then return here to fill them in.'
            : `${doneCount} product${doneCount === 1 ? ' is' : 's are'} now live on your storefront.`}
        </p>
        <Button variant="accent" className="mt-6" onClick={() => navigate(`/admin/${storeId}/products`)}>
          View Products
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-5 -mt-6 flex items-center gap-3 border-b border-line bg-surface/95 px-5 py-3 backdrop-blur md:-mx-8 md:px-8">
        <button
          onClick={() => navigate(`/admin/${storeId}/products`)}
          className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-muted transition-colors hover:bg-paper hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Products
        </button>
        <span className="text-muted">/</span>
        <span className="text-sm font-black text-ink">Quick fill</span>

        {/* Progress */}
        <div className="ms-auto flex items-center gap-3">
          <span className="text-sm font-bold text-muted">{doneCount}/{total} done</span>
          <div className="hidden h-2 w-32 overflow-hidden rounded-full bg-line sm:block">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-300"
              style={{ width: `${(doneCount / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-black text-xl text-ink">Quick fill — {remaining.length} remaining</h1>
        <p className="mt-1 text-sm text-muted">
          Drop an image onto each card (or drag from a browser tab), set the price, and hit Save.
          Products go live automatically once they have a price.
        </p>
      </div>

      {/* ── Card grid ───────────────────────────────────────────────────────── */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {remaining.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            storeId={storeId}
            currency={store.currency}
            onSaved={handleSaved}
          />
        ))}
      </div>
    </div>
  );
}
