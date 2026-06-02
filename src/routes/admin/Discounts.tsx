import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Discount } from '@/lib/types';
import { getDiscountStatus } from '@/lib/checkout';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { BadgePercent, Pencil, Plus, Trash2 } from 'lucide-react';

const formSchema = z.object({
  code: z.string().min(2, 'Code is required'),
  type: z.enum(['PERCENT', 'FIXED', 'FREE_SHIPPING']),
  valueText: z.string().optional(),
  minSubtotalText: z.string().optional(),
  usageLimitText: z.string().optional(),
  expiresDate: z.string().optional(),
  active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Discounts() {
  const storeId = useOutletContext<string>();
  const { discounts, stores, addDiscount, updateDiscount, deleteDiscount } = useStore();
  const store = stores.find((s) => s.id === storeId);
  const storeDiscounts = discounts.filter((d) => d.storeId === storeId).sort((a, b) => b.createdAt - a.createdAt);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      type: 'PERCENT',
      valueText: '10',
      minSubtotalText: '',
      usageLimitText: '',
      expiresDate: '',
      active: true,
    },
  });

  const selectedType = form.watch('type');

  const handleOpenModal = (discount?: Discount) => {
    form.reset({
      code: discount?.code || '',
      type: discount?.type || 'PERCENT',
      valueText: discount?.type === 'FREE_SHIPPING' ? '' : discount?.type === 'FIXED' ? ((discount.value || 0) / 100).toString() : (discount?.value ?? 10).toString(),
      minSubtotalText: discount?.minSubtotalCents ? (discount.minSubtotalCents / 100).toString() : '',
      usageLimitText: discount?.usageLimit ? discount.usageLimit.toString() : '',
      expiresDate: discount?.expiresAt ? new Date(discount.expiresAt).toISOString().slice(0, 10) : '',
      active: discount?.active ?? true,
    });
    setEditingId(discount?.id || null);
    setIsModalOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    const code = data.code.trim().toUpperCase();
    const duplicate = storeDiscounts.some((d) => d.code === code && d.id !== editingId);
    if (duplicate) {
      form.setError('code', { message: 'Code must be unique for this store' });
      return;
    }

    const value = data.type === 'FREE_SHIPPING'
      ? 0
      : data.type === 'FIXED'
        ? Math.round(parseFloat(data.valueText || '0') * 100)
        : Math.round(parseFloat(data.valueText || '0'));

    if (data.type === 'PERCENT' && (value <= 0 || value > 100)) {
      form.setError('valueText', { message: 'Percent must be between 1 and 100' });
      return;
    }
    if (data.type === 'FIXED' && value <= 0) {
      form.setError('valueText', { message: 'Fixed amount must be greater than 0' });
      return;
    }

    const payload = {
      code,
      type: data.type,
      value,
      minSubtotalCents: data.minSubtotalText ? Math.round(parseFloat(data.minSubtotalText) * 100) : undefined,
      usageLimit: data.usageLimitText ? parseInt(data.usageLimitText, 10) : undefined,
      expiresAt: data.expiresDate ? new Date(`${data.expiresDate}T23:59:59`).getTime() : undefined,
      active: data.active,
    };

    if (editingId) {
      updateDiscount(editingId, payload);
      toast({ title: 'Discount updated', type: 'success' });
    } else {
      addDiscount(storeId, payload);
      toast({ title: 'Discount created', type: 'success' });
    }
    setIsModalOpen(false);
  };

  const statusClass = (status: string) => status === 'Valid'
    ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';

  if (!store) return null;

  return (
    <div className="animate-fade-in flex flex-col h-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-line pb-6 mb-8 gap-4">
        <div>
          <h2 className="font-heading font-black text-4xl text-ink tracking-tight mb-2">Discounts</h2>
          <p className="text-muted text-lg">Create promo codes for checkout.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="font-bold shrink-0 shadow-xs">
          <Plus className="w-4 h-4 mr-2" /> New Discount
        </Button>
      </div>

      {storeDiscounts.length === 0 ? (
        <EmptyState
          icon={BadgePercent}
          title="No discount codes yet"
          description="Create percent, fixed amount, or free shipping codes for this store."
          action={<Button onClick={() => handleOpenModal()}><Plus className="w-4 h-4 mr-2" /> Create a code</Button>}
        />
      ) : (
        <div className="space-y-3">
          {storeDiscounts.map((discount) => {
            const status = getDiscountStatus(discount, Number.MAX_SAFE_INTEGER);
            return (
              <div key={discount.id} className="bg-surface border border-line rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-mono text-lg font-black text-ink">{discount.code}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${statusClass(status)}`}>{status}</span>
                  </div>
                  <div className="text-sm text-muted flex flex-wrap gap-x-4 gap-y-1">
                    <span>{discount.type === 'PERCENT' ? `${discount.value}% off` : discount.type === 'FIXED' ? `${money(discount.value, store.currency)} off` : 'Free shipping'}</span>
                    {discount.minSubtotalCents ? <span>Min {money(discount.minSubtotalCents, store.currency)}</span> : <span>No minimum</span>}
                    <span>Used {discount.usedCount}{discount.usageLimit ? ` / ${discount.usageLimit}` : ''}</span>
                    {discount.expiresAt && <span>Expires {new Date(discount.expiresAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenModal(discount)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    if (window.confirm(`Delete ${discount.code}?`)) {
                      deleteDiscount(discount.id);
                      toast({ title: 'Discount deleted' });
                    }
                  }}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Discount' : 'New Discount'}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Code" error={form.formState.errors.code?.message}>
              <Input {...form.register('code')} placeholder="WELCOME10" className="uppercase" />
            </Field>
            <Field label="Type" error={form.formState.errors.type?.message}>
              <select {...form.register('type')} className="w-full h-10 rounded-md border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent">
                <option value="PERCENT">Percent off</option>
                <option value="FIXED">Fixed amount</option>
                <option value="FREE_SHIPPING">Free shipping</option>
              </select>
            </Field>

            {selectedType !== 'FREE_SHIPPING' && (
              <Field label={selectedType === 'PERCENT' ? 'Percent value' : 'Fixed amount ($)'} error={form.formState.errors.valueText?.message}>
                <Input {...form.register('valueText')} type="number" step={selectedType === 'PERCENT' ? '1' : '0.01'} placeholder={selectedType === 'PERCENT' ? '10' : '5.00'} />
              </Field>
            )}

            <Field label="Minimum subtotal ($)" error={form.formState.errors.minSubtotalText?.message}>
              <Input {...form.register('minSubtotalText')} type="number" step="0.01" placeholder="Optional" />
            </Field>
            <Field label="Usage limit" error={form.formState.errors.usageLimitText?.message}>
              <Input {...form.register('usageLimitText')} type="number" step="1" placeholder="Optional" />
            </Field>
            <Field label="Expiry date" error={form.formState.errors.expiresDate?.message}>
              <Input {...form.register('expiresDate')} type="date" />
            </Field>
          </div>

          <label className="flex items-center gap-3 p-3 border border-line rounded-lg cursor-pointer hover:bg-line/20 transition-colors">
            <input type="checkbox" {...form.register('active')} className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-ink">Active</span>
              <span className="text-xs text-muted">Allow customers to apply this code.</span>
            </div>
          </label>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="solid">{editingId ? 'Save Changes' : 'Create Discount'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
