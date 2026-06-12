import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, TriangleAlert, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';
import { PageHeader } from './shared';

const schema = z.object({
  platformName: z.string().min(1, 'Platform name is required').max(40),
  defaultCurrency: z.string().min(3, 'Use a 3-letter code').max(4),
  supportEmail: z.string().email('Enter a valid email'),
  globalAnnouncement: z.string().max(200).optional(),
  autoFlagThreshold: z.coerce.number().int().min(1, 'Min 1').max(50, 'Max 50'),
  auditCap: z.coerce.number().int().min(20, 'Min 20').max(1000, 'Max 1000'),
  maintenanceMode: z.boolean(),
});

type FormValues = z.input<typeof schema>;

export default function Settings() {
  const settings = useStore((s) => s.platformSettings);
  const updatePlatformSettings = useStore((s) => s.updatePlatformSettings);
  const [categories, setCategories] = useState<string[]>(settings.categories);
  const [categoryDraft, setCategoryDraft] = useState('');

  const defaults: FormValues = {
    platformName: settings.platformName,
    defaultCurrency: settings.defaultCurrency,
    supportEmail: settings.supportEmail,
    globalAnnouncement: settings.globalAnnouncement || '',
    autoFlagThreshold: settings.autoFlagThreshold,
    auditCap: settings.auditCap,
    maintenanceMode: settings.maintenanceMode,
  };

  const { register, handleSubmit, watch, reset, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const categoriesChanged = JSON.stringify(categories) !== JSON.stringify(settings.categories);
  const dirty = isDirty || categoriesChanged;
  const maintenanceOn = watch('maintenanceMode');

  // Warn on tab close while there are unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const addCategory = () => {
    const value = categoryDraft.trim();
    if (value && !categories.includes(value)) setCategories((current) => [...current, value]);
    setCategoryDraft('');
  };

  const onSubmit = (values: FormValues) => {
    if (categories.length === 0) {
      toast({ title: 'Add at least one category', type: 'error' });
      return;
    }
    updatePlatformSettings({
      platformName: values.platformName,
      defaultCurrency: values.defaultCurrency.toUpperCase(),
      supportEmail: values.supportEmail,
      globalAnnouncement: values.globalAnnouncement,
      autoFlagThreshold: Number(values.autoFlagThreshold),
      auditCap: Number(values.auditCap),
      maintenanceMode: values.maintenanceMode,
      categories,
    });
    reset({ ...values });
    toast({ title: 'Settings saved', type: 'success' });
  };

  const resetAll = () => {
    reset(defaults);
    setCategories(settings.categories);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-24">
      <PageHeader title="Settings" subtitle="Global marketplace defaults. Payout fields arrive with the backend integration." />

      {maintenanceOn && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          <TriangleAlert className="h-4 w-4 shrink-0" /> Preview: customers will see a maintenance notice on every storefront.
        </div>
      )}

      <Section title="General" subtitle="Identity and customer-facing defaults.">
        <Grid>
          <FormField label="Platform name" error={errors.platformName?.message}>
            <input {...register('platformName')} className={inputCls} />
          </FormField>
          <FormField label="Default currency" error={errors.defaultCurrency?.message}>
            <input {...register('defaultCurrency')} className={cn(inputCls, 'uppercase')} maxLength={4} />
          </FormField>
          <FormField label="Support email" error={errors.supportEmail?.message}>
            <input {...register('supportEmail')} type="email" className={inputCls} />
          </FormField>
          <FormField label="Global announcement" error={errors.globalAnnouncement?.message}>
            <input {...register('globalAnnouncement')} placeholder="Optional banner across storefronts" className={inputCls} />
          </FormField>
        </Grid>

        <div className="mt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Categories</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 text-sm font-semibold text-ink">
                {category}
                <button type="button" onClick={() => setCategories((current) => current.filter((c) => c !== category))} aria-label={`Remove ${category}`} className="text-muted hover:text-red-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {categories.length === 0 && <span className="text-sm text-muted">No categories yet.</span>}
          </div>
          <div className="flex gap-2">
            <input
              value={categoryDraft}
              onChange={(event) => setCategoryDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCategory(); } }}
              placeholder="Add a category"
              className={cn(inputCls, 'max-w-xs')}
            />
            <Button type="button" variant="ghost" className="gap-1.5 border border-line" onClick={addCategory}><Plus className="h-4 w-4" /> Add</Button>
          </div>
        </div>
      </Section>


      <Section title="Content" subtitle="Operational toggles for the whole marketplace.">
        <label className="flex items-center gap-3 rounded-xl border border-line bg-paper p-4">
          <input type="checkbox" {...register('maintenanceMode')} className="h-4 w-4 accent-accent" />
          <span>
            <span className="block text-sm font-bold text-ink">Maintenance mode</span>
            <span className="block text-xs text-muted">Show a maintenance notice to customers across all storefronts.</span>
          </span>
        </label>
      </Section>

      <Section title="Moderation" subtitle="Tune automated review thresholds and retention.">
        <Grid>
          <FormField label="Auto-flag threshold (open flags / store)" error={errors.autoFlagThreshold?.message}>
            <input {...register('autoFlagThreshold')} type="number" className={inputCls} />
          </FormField>
          <FormField label="Audit log cap (entries)" error={errors.auditCap?.message}>
            <input {...register('auditCap')} type="number" className={inputCls} />
          </FormField>
        </Grid>
      </Section>

      {/* Sticky unsaved-changes bar */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 md:px-8">
            <span className="flex items-center gap-2 text-sm font-bold text-ink">
              <span className="h-2 w-2 rounded-full bg-accent" /> You have unsaved changes
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="border border-line" onClick={resetAll}>Discard</Button>
              <Button type="submit" variant="accent">Save settings</Button>
            </div>
          </div>
        </div>
      )}

      {!dirty && (
        <div className="flex justify-end">
          <Button type="submit" variant="accent">Save settings</Button>
        </div>
      )}
    </form>
  );
}

const inputCls = 'h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent';

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm md:p-6">
      <div className="mb-4">
        <h2 className="font-heading text-2xl font-black tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
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
