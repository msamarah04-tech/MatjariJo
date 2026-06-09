import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { BadgePercent, Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { getDiscountStatus } from '@/lib/checkout';
import { Discount } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/dashboard';
import { ResourceTable, Column } from '@/components/ui/ResourceTable';
import { FieldDef, ResourceFormDrawer } from '@/components/ui/ResourceFormDrawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { useFocusParam } from '@/lib/useFocusParam';
import { cn } from '@/lib/cn';
import { useAdminContext, useStoreDiscounts } from './shared';

const typeLabel = (d: Discount, currency: string) =>
  d.type === 'PERCENT' ? `${d.value}% off` : d.type === 'FIXED' ? `${money(d.value, currency)} off` : 'Free shipping';

const statusTone = (status: string) =>
  status === 'Valid' ? 'border-green-200 bg-green-50 text-green-700' : status === 'Inactive' ? 'border-line bg-paper text-muted' : 'border-amber-200 bg-amber-50 text-amber-700';

export default function Discounts() {
  const { storeId, store } = useAdminContext();
  const addDiscount = useStore((s) => s.addDiscount);
  const updateDiscount = useStore((s) => s.updateDiscount);
  const deleteDiscount = useStore((s) => s.deleteDiscount);
  const scopedDiscounts = useStoreDiscounts(storeId);

  const [editing, setEditing] = useState<Discount | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleting, setDeleting] = useState<Discount | null>(null);
  const [focusId, clearFocus] = useFocusParam();

  const storeDiscounts = useMemo(() => [...scopedDiscounts].sort((a, b) => b.createdAt - a.createdAt), [scopedDiscounts]);

  useEffect(() => {
    if (!focusId) return;
    const discount = storeDiscounts.find((d) => d.id === focusId);
    if (discount) { setEditing(discount); setDrawerOpen(true); }
    clearFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const editingId = editing?.id ?? null;
  const schema = useMemo(() => z.object({
    code: z.string().min(2, 'Code is required').refine(
      (code) => !storeDiscounts.some((d) => d.code === code.trim().toUpperCase() && d.id !== editingId),
      'Code already exists for this store'
    ),
    type: z.enum(['PERCENT', 'FIXED', 'FREE_SHIPPING']),
    valuePercent: z.string().optional(),
    valueFixed: z.string().optional(),
    minSubtotalCents: z.union([z.literal(''), z.coerce.number().nonnegative()]).optional(),
    usageLimit: z.union([z.literal(''), z.coerce.number().int().positive('Must be > 0')]).optional(),
    expiresAt: z.string().optional(),
    active: z.boolean().optional(),
  }).superRefine((data, ctx) => {
    if (data.type === 'PERCENT') {
      const v = Number(data.valuePercent);
      if (!data.valuePercent || Number.isNaN(v) || v <= 0 || v > 100) ctx.addIssue({ code: 'custom', path: ['valuePercent'], message: 'Enter 1–100' });
    }
    if (data.type === 'FIXED') {
      const v = Number(data.valueFixed);
      if (!data.valueFixed || Number.isNaN(v) || v <= 0) ctx.addIssue({ code: 'custom', path: ['valueFixed'], message: 'Must be greater than 0' });
    }
  }), [storeDiscounts, editingId]);

  const fields: FieldDef[] = [
    { name: 'code', label: 'Code', required: true, placeholder: 'WELCOME10' },
    { name: 'type', label: 'Type', type: 'select', options: [
      { value: 'PERCENT', label: 'Percent off' },
      { value: 'FIXED', label: 'Fixed amount' },
      { value: 'FREE_SHIPPING', label: 'Free shipping' },
    ] },
    { name: 'valuePercent', label: 'Percent off', type: 'number', step: '1', placeholder: '10', show: (v) => v.type === 'PERCENT' },
    { name: 'valueFixed', label: 'Amount off', type: 'money', show: (v) => v.type === 'FIXED' },
    { name: 'minSubtotalCents', label: 'Minimum subtotal', type: 'money', hint: 'Optional' },
    { name: 'usageLimit', label: 'Usage limit', type: 'number', placeholder: 'Optional' },
    { name: 'expiresAt', label: 'Expiry date', type: 'date' },
    { name: 'active', label: 'Active', type: 'checkbox', hint: 'Customers can apply this code at checkout.' },
  ];

  const onSubmit = (values: Record<string, unknown>) => {
    const type = values.type as Discount['type'];
    const value = type === 'PERCENT' ? Number(values.valuePercent) : type === 'FIXED' ? (values.valueFixed as number) : 0;
    const payload = {
      code: (values.code as string).trim().toUpperCase(),
      type,
      value,
      minSubtotalCents: values.minSubtotalCents as number | undefined,
      usageLimit: values.usageLimit as number | undefined,
      expiresAt: values.expiresAt ? new Date(`${values.expiresAt as string}T23:59:59`).getTime() : undefined,
      active: (values.active as boolean) ?? true,
    };
    if (editing) { updateDiscount(storeId, editing.id, payload); toast({ title: 'Discount updated', type: 'success' }); }
    else { addDiscount(storeId, payload); toast({ title: 'Discount created', type: 'success' }); }
  };

  const columns: Column<Discount>[] = [
    { key: 'code', label: 'Code', sortable: true, render: (d) => <span className="font-mono text-base font-black text-ink">{d.code}</span> },
    { key: 'value', label: 'Reward', render: (d) => <span className="text-muted">{typeLabel(d, store.currency)}</span>, sortValue: (d) => d.type },
    { key: 'minSubtotalCents', label: 'Minimum', align: 'right', hideOnMobile: true, render: (d) => <span className="text-muted">{d.minSubtotalCents ? money(d.minSubtotalCents, store.currency) : '—'}</span> },
    { key: 'usedCount', label: 'Used', align: 'right', sortable: true, render: (d) => <span className="font-semibold">{d.usedCount}{d.usageLimit ? ` / ${d.usageLimit}` : ''}</span> },
    { key: 'expiresAt', label: 'Expires', align: 'right', hideOnMobile: true, sortable: true, sortValue: (d) => d.expiresAt ?? Number.MAX_SAFE_INTEGER, render: (d) => <span className="text-muted">{d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '—'}</span> },
    { key: 'active', label: 'Status', align: 'right', render: (d) => {
      const status = getDiscountStatus(d, Number.MAX_SAFE_INTEGER);
      return <span className={cn('rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-widest', statusTone(status))}>{status}</span>;
    } },
  ];

  const openCreate = () => { setEditing(null); setDrawerOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Discounts"
        subtitle="Promo codes customers can apply at checkout."
        action={<Button variant="accent" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" /> New discount</Button>}
      />

      <ResourceTable
        rows={storeDiscounts}
        columns={columns}
        getId={(d) => d.id}
        searchKeys={['code']}
        searchPlaceholder="Search by code"
        onRowClick={(d) => { setEditing(d); setDrawerOpen(true); }}
        onEdit={(d) => { setEditing(d); setDrawerOpen(true); }}
        onDelete={(d) => setDeleting(d)}
        emptyIcon={BadgePercent}
        emptyTitle="No discount codes yet"
        emptyText="Create percent, fixed amount, or free-shipping codes for this store."
        emptyAction={<Button variant="accent" onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Create a code</Button>}
      />

      <ResourceFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? 'Edit discount' : 'New discount'}
        description={editing ? editing.code : 'Create a checkout promo code.'}
        record={editing}
        fields={fields}
        schema={schema}
        defaultValues={{ code: '', type: 'PERCENT', valuePercent: '10', valueFixed: '', minSubtotalCents: '', usageLimit: '', expiresAt: '', active: true }}
        toForm={(r) => ({
          valuePercent: r.type === 'PERCENT' ? String(r.value) : '',
          valueFixed: r.type === 'FIXED' ? String((r.value as number) / 100) : '',
          expiresAt: r.expiresAt ? new Date(r.expiresAt as number).toISOString().slice(0, 10) : '',
        })}
        onSubmit={onSubmit}
        submitLabel={editing ? 'Save changes' : 'Create discount'}
      />

      <ConfirmDialog
        isOpen={Boolean(deleting)}
        title="Delete this discount?"
        description={deleting ? `Code “${deleting.code}” will no longer work at checkout.` : ''}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleting(null)}
        onConfirm={() => { if (deleting) { deleteDiscount(storeId, deleting.id); toast({ title: 'Discount deleted' }); } setDeleting(null); }}
      />
    </div>
  );
}
