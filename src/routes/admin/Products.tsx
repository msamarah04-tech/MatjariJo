import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Eye, EyeOff, FileUp, PackageSearch, Plus, Star, TriangleAlert } from 'lucide-react';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { StoreAvatar, PageHeader, SegmentedControl } from '@/components/ui/dashboard';
import { ResourceTable, Column } from '@/components/ui/ResourceTable';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { LOW_STOCK_THRESHOLD, useAdminContext, useStoreProducts } from './shared';
import { isVariableProduct, productPriceRange, productStock } from '@/lib/productOptions';

type StatusFilter = 'ALL' | 'ACTIVE' | 'HIDDEN' | 'NEEDS_DETAILS';

export default function Products() {
  const { storeId, store } = useAdminContext();
  const navigate = useNavigate();
  const updateProduct = useStore((s) => s.updateProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);
  const platformCategories = useStore((s) => s.platformSettings.categories);
  const scopedProducts = useStoreProducts(storeId);

  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [category, setCategory] = useState('ALL');
  const [collection, setCollection] = useState('ALL');
  const [deleting, setDeleting] = useState<Product | null>(null);

  const storeProducts = useMemo(() => [...scopedProducts].sort((a, b) => b.createdAt - a.createdAt), [scopedProducts]);
  const categories = useMemo(() => Array.from(new Set([
    store.category,
    ...platformCategories,
    ...storeProducts.map((p) => p.category?.trim()).filter(Boolean) as string[],
  ])).filter(Boolean).sort((a, b) => a.localeCompare(b)), [platformCategories, store.category, storeProducts]);
  const collections = useMemo(() => Array.from(new Set(storeProducts.map((p) => p.collection?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)), [storeProducts]);

  const needsDetails = (p: Product) => (p.tags || []).includes('needs-details');

  const rows = useMemo(() => storeProducts
    .filter((p) => {
      if (status === 'NEEDS_DETAILS') return needsDetails(p);
      if (status === 'ACTIVE') return p.isActive;
      if (status === 'HIDDEN') return !p.isActive;
      return true;
    })
    .filter((p) => category === 'ALL' || (p.category || store.category) === category)
    .filter((p) => collection === 'ALL' || p.collection === collection),
  [storeProducts, status, category, collection, store.category]);

  const counts = {
    ALL: storeProducts.length,
    ACTIVE: storeProducts.filter((p) => p.isActive).length,
    HIDDEN: storeProducts.filter((p) => !p.isActive).length,
    FEATURED: storeProducts.filter((p) => p.isFeatured).length,
    LOW: storeProducts.filter((p) => p.isActive && productStock(p) <= LOW_STOCK_THRESHOLD).length,
    NEEDS_DETAILS: storeProducts.filter(needsDetails).length,
  };

  const columns: Column<Product>[] = [
    {
      key: 'name',
      label: 'Product',
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <StoreAvatar emoji={p.imageEmoji} url={p.imageUrl} name={p.name} size="sm" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-bold text-ink">
              <span className="truncate">{p.name}</span>
              {p.isFeatured && <Star className="h-3.5 w-3.5 fill-accent text-accent" />}
              {needsDetails(p) && <span title="Needs details — price or description missing"><TriangleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" /></span>}
            </div>
            <div className="truncate text-xs text-muted">{p.details?.brand ? `${p.details.brand} · ` : ''}{p.category || store.category} · {isVariableProduct(p) ? 'Variable' : 'Simple'} · {p.collection || 'No collection'}</div>
            {p.details?.sku && <div className="mt-0.5 font-mono text-[10px] font-bold text-muted">SKU {p.details.sku}</div>}
            {(p.tags || []).length > 0 && (
              <div className="mt-1 flex max-w-md flex-wrap gap-1">
                {p.tags!.slice(0, 3).map((tag) => <span key={tag} className="rounded bg-paper px-1.5 py-0.5 text-[10px] font-bold text-muted ring-1 ring-line">{tag}</span>)}
              </div>
            )}
          </div>
        </div>
      ),
    },
    { key: 'category', label: 'Category', sortable: true, hideOnMobile: true, render: (p) => <span className="font-semibold text-ink">{p.category || store.category}</span> },
    { key: 'brand', label: 'Brand', sortable: true, hideOnMobile: true, sortValue: (p) => p.details?.brand || '', render: (p) => <span className="font-semibold text-muted">{p.details?.brand || '-'}</span> },
    { key: 'status', label: 'Status', sortable: true, hideOnMobile: true, sortValue: (p) => p.details?.status || (p.isActive ? 'ACTIVE' : 'DRAFT'), render: (p) => (
      <span className={cn('rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest', (p.details?.status || (p.isActive ? 'ACTIVE' : 'DRAFT')) === 'ACTIVE' ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : (p.details?.status === 'ARCHIVED' ? 'bg-neutral-100 text-neutral-500 ring-1 ring-line' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'))}>
        {p.details?.status || (p.isActive ? 'Active' : 'Draft')}
      </span>
    ) },
    {
      key: 'priceCents',
      label: 'Price',
      align: 'right',
      sortable: true,
      render: (p) => (
        <div className="text-right">
          {isVariableProduct(p) ? (
            <span className="font-semibold">
              {productPriceRange(p).min === productPriceRange(p).max ? money(productPriceRange(p).min, store.currency) : `${money(productPriceRange(p).min, store.currency)} – ${money(productPriceRange(p).max, store.currency)}`}
            </span>
          ) : (
            <>
              {p.compareAtCents && p.compareAtCents > p.priceCents && <div className="text-xs font-bold text-muted line-through">{money(p.compareAtCents, store.currency)}</div>}
              <span className="font-semibold">{money(p.priceCents, store.currency)}</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'stock',
      label: 'Stock',
      align: 'right',
      sortable: true,
      render: (p) => (
        <span className={cn('font-semibold', p.isActive && p.stock <= LOW_STOCK_THRESHOLD && 'text-amber-600')}>
          {productStock(p)}{p.isActive && productStock(p) <= LOW_STOCK_THRESHOLD && <span className="ml-1 text-[10px] font-bold uppercase">{productStock(p) === 0 ? 'Out' : 'Low'}</span>}
        </span>
      ),
    },
    { key: 'isActive', label: 'Visibility', align: 'right', sortable: true, sortValue: (p) => (p.isActive ? 1 : 0), render: (p) => (
      <div className="flex justify-end">
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-widest', p.isActive ? 'border-green-200 bg-green-50 text-green-700' : 'border-line bg-paper text-muted')}>
          {p.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          {p.isActive ? 'Live' : 'Hidden'}
        </span>
      </div>
    ) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        subtitle="Manage every customer-facing product detail: images, categories, pricing, stock, and storefront visibility."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="border border-line gap-2"
              onClick={() => navigate('import')}
            >
              <FileUp className="h-4 w-4" /> Import Excel
            </Button>
            <Button variant="accent" className="gap-2" onClick={() => navigate('new')}>
              <Plus className="h-4 w-4" /> New product
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <ProductMetric icon={Boxes} label="Products" value={counts.ALL} />
        <ProductMetric icon={Eye} label="Live" value={counts.ACTIVE} />
        <ProductMetric icon={EyeOff} label="Hidden" value={counts.HIDDEN} />
        <ProductMetric icon={Star} label="Featured" value={counts.FEATURED} />
        <ProductMetric icon={TriangleAlert} label="Low stock" value={counts.LOW} tone={counts.LOW > 0 ? 'warn' : 'default'} />
      </div>

      {counts.NEEDS_DETAILS > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <TriangleAlert className="h-5 w-5 shrink-0 text-amber-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-900">
              {counts.NEEDS_DETAILS} product{counts.NEEDS_DETAILS === 1 ? '' : 's'} {counts.NEEDS_DETAILS === 1 ? 'needs' : 'need'} details filled in
            </p>
            <p className="text-xs text-amber-700">
              {counts.NEEDS_DETAILS === 1 ? 'This product is' : 'These products are'} hidden from your storefront until price and other details are completed.
            </p>
          </div>
          <Button
            variant="ghost"
            className="shrink-0 border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs"
            onClick={() => setStatus('NEEDS_DETAILS')}
          >
            View &amp; complete
          </Button>
        </div>
      )}

      <ResourceTable
        rows={rows}
        columns={columns}
        getId={(p) => p.id}
        searchKeys={['name', 'description', 'details', 'category', 'collection', 'tags']}
        searchPlaceholder="Search name, category, tags"
        filters={
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl<StatusFilter>
              value={status}
              onChange={setStatus}
              options={[
                { label: 'All', value: 'ALL', count: counts.ALL },
                { label: 'Active', value: 'ACTIVE', count: counts.ACTIVE },
                { label: 'Hidden', value: 'HIDDEN', count: counts.HIDDEN },
                ...(counts.NEEDS_DETAILS > 0 ? [{ label: 'Needs details', value: 'NEEDS_DETAILS' as StatusFilter, count: counts.NEEDS_DETAILS }] : []),
              ]}
            />
            {categories.length > 0 && (
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="ALL">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {collections.length > 0 && (
              <select value={collection} onChange={(e) => setCollection(e.target.value)} className="h-10 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="ALL">All collections</option>
                {collections.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>
        }
        onRowClick={(p) => navigate(`${p.id}/edit`)}
        onEdit={(p) => navigate(`${p.id}/edit`)}
        onDelete={(p) => setDeleting(p)}
        bulkActions={[
          { label: 'Activate', run: (ids) => { ids.forEach((id) => void updateProduct(storeId, id, { isActive: true }).catch(() => {})); toast({ title: `${ids.length} activated`, type: 'success' }); } },
          { label: 'Hide', run: (ids) => { ids.forEach((id) => void updateProduct(storeId, id, { isActive: false }).catch(() => {})); toast({ title: `${ids.length} hidden` }); } },
          { label: 'Feature', run: (ids) => { ids.forEach((id) => void updateProduct(storeId, id, { isFeatured: true }).catch(() => {})); toast({ title: `${ids.length} featured`, type: 'success' }); } },
          { label: 'Unfeature', run: (ids) => { ids.forEach((id) => void updateProduct(storeId, id, { isFeatured: false }).catch(() => {})); toast({ title: `${ids.length} unfeatured` }); } },
          { label: 'Delete', tone: 'danger', run: (ids) => { ids.forEach((id) => deleteProduct(storeId, id)); toast({ title: `${ids.length} deleted` }); } },
        ]}
        emptyIcon={PackageSearch}
        emptyTitle="No products yet"
        emptyText="Add items to start selling on your storefront."
        emptyAction={
          <div className="flex gap-2 justify-center">
            <Button variant="ghost" className="border border-line gap-2" onClick={() => navigate('import')}>
              <FileUp className="h-4 w-4" /> Import Excel
            </Button>
            <Button variant="accent" onClick={() => navigate('new')}>
              <Plus className="mr-2 h-4 w-4" /> Add your first product
            </Button>
          </div>
        }
      />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete this product?"
        description={deleting ? `"${deleting.name}" will be removed from your storefront. This can't be undone.` : ''}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => { if (deleting) { deleteProduct(storeId, deleting.id); toast({ title: 'Product deleted' }); } setDeleting(null); }}
      />
    </div>
  );
}

function ProductMetric({ icon: Icon, label, value, tone = 'default' }: { icon: typeof Boxes; label: string; value: number; tone?: 'default' | 'warn' }) {
  return (
    <div className={cn('rounded-2xl border bg-surface p-4 shadow-sm', tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-line text-ink')}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-widest opacity-60">{label}</span>
        <Icon className="h-4 w-4 opacity-60" />
      </div>
      <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
    </div>
  );
}
