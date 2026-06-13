import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, Download, Globe, KeyRound, LifeBuoy, MapPin } from 'lucide-react';
import { useStore } from '@/lib/store';
import { storefrontUrl } from '@/lib/tenant';
import { PLAN_DEFS } from '@shared/plans';
import type { Store } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/ui/dashboard';
import { createSupportTicket, getStoreDataExport } from '@/api/admin.api';
import { useAdminContext } from './shared';

// Mirrors the server's storeSlugSchema (validators.ts) so owners get instant feedback.
const RESERVED_SLUGS = new Set(['www', 'api', 'app', 'admin', 'platform', 'staging']);

const CURRENCIES = ['JOD', 'USD', 'EUR', 'SAR', 'AED', 'KWD', 'BHD', 'QAR', 'OMR', 'EGP', 'GBP'];

const settingsSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  currency: z.string().length(3, 'Pick a currency'),
  slug: z.string()
    .min(2, 'Use at least 2 characters.')
    .max(63, 'Keep it under 64 characters.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens.')
    .refine((value) => !RESERVED_SLUGS.has(value), 'This address is reserved.'),
  contactPhone: z.string().optional(),
  address: z.string().max(300, 'Keep it under 300 characters.').optional(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: z.string()
    .min(10, 'Use at least 10 characters.')
    .regex(/[A-Za-z]/, 'Include at least one letter.')
    .regex(/[0-9]/, 'Include at least one number.'),
  confirmPassword: z.string(),
}).superRefine((value, ctx) => {
  if (value.newPassword !== value.confirmPassword) {
    ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match.' });
  }
  if (value.currentPassword && value.currentPassword === value.newPassword) {
    ctx.addIssue({ code: 'custom', path: ['newPassword'], message: 'Choose a password different from the current one.' });
  }
});

type PasswordValues = z.infer<typeof passwordSchema>;

export default function Settings() {
  const { storeId, store } = useAdminContext();
  const updateStore = useStore((s) => s.updateStore);
  const platformSettings = useStore((s) => s.platformSettings);

  const { register, handleSubmit, watch, formState: { errors, isDirty }, reset } = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: store.name,
      category: store.category || '',
      currency: store.currency || 'JOD',
      slug: store.slug,
      contactPhone: store.contactPhone || '',
      address: store.address || '',
    },
  });

  const slugValue = watch('slug');
  const slugChanged = slugValue !== store.slug;

  const onSubmit = async (data: SettingsValues) => {
    const saved = await updateStore(storeId, {
      name: data.name,
      category: data.category,
      currency: data.currency,
      slug: data.slug,
      contactPhone: data.contactPhone?.trim() || null,
      address: data.address?.trim() || null,
    });
    if (!saved) {
      toast({ title: 'Could not save settings', description: useStore.getState().apiError || 'Please try again.', type: 'error' });
      return;
    }
    reset(data);
    toast({
      title: 'Settings saved',
      description: slugChanged ? 'Your store address changed — old links now point nowhere, so update your bio links.' : undefined,
      type: 'success',
    });
  };

  return (
    <div className="pb-24">
      <PageHeader title="Settings" subtitle="Store details, address, and account security." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Section title="Store details">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Store name" error={errors.name?.message}>
                <Input {...register('name')} />
              </FormField>
              <FormField label="Category" error={errors.category?.message}>
                <Input {...register('category')} placeholder="e.g. Coffee, Fashion, Home" />
              </FormField>
              <FormField label="Currency" error={errors.currency?.message}>
                <select {...register('currency')} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent">
                  {CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
                </select>
              </FormField>
            </div>
          </Section>

          <Section title="Store address" icon={Globe}>
            <FormField label="Store link" error={errors.slug?.message}>
              <Input {...register('slug')} placeholder="my-store" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
            </FormField>
            <p className="mt-2 text-sm font-semibold text-muted">
              Your storefront lives at{' '}
              <a className="font-bold text-accent underline-offset-2 hover:underline" href={storefrontUrl(store.slug)} target="_blank" rel="noreferrer">
                {describeUrl(storefrontUrl(slugValue || store.slug))}
              </a>
            </p>
            {slugChanged && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                Changing the link breaks previously shared URLs and QR codes — the old address stops working immediately.
              </p>
            )}
          </Section>

          <Section title="Contact" icon={MapPin}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Contact phone" error={errors.contactPhone?.message}>
                <Input {...register('contactPhone')} placeholder="07 9xxx xxxx" inputMode="tel" />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Business address" error={errors.address?.message}>
                  <Textarea {...register('address')} rows={2} placeholder="Street, city" />
                </FormField>
              </div>
            </div>
          </Section>

          <PlanSection store={store} supportEmail={platformSettings.supportEmail} />

          <div className="sticky bottom-4 z-10 flex justify-end">
            <Button type="submit" disabled={!isDirty} className="shadow-lg">
              Save settings
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          <PasswordSection />
          <SupportSection storeId={storeId} storeName={store.name} supportEmail={platformSettings.supportEmail} />
          <DataExportSection storeId={storeId} slug={store.slug} />
        </div>
      </div>
    </div>
  );
}

function PlanSection({ store, supportEmail }: { store: Store; supportEmail?: string }) {
  const plan = store.plan ?? 'STARTER';
  const status = store.planStatus ?? 'TRIAL';
  const def = PLAN_DEFS[plan];
  const statusStyles = {
    ACTIVE: 'bg-green-100 text-green-700',
    TRIAL: 'bg-blue-100 text-blue-700',
    PAST_DUE: 'bg-amber-100 text-amber-800',
  } as const;
  return (
    <Section title="Plan & billing" icon={CreditCard}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-2xl font-black tracking-tight text-ink">{plan}</span>
        <span className="text-sm font-bold text-muted">JOD {def.priceMonthlyJod}/mo</span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${statusStyles[status]}`}>
          {status.replace('_', ' ')}
        </span>
      </div>
      <div className="mt-3 space-y-1 text-sm font-semibold text-muted">
        {store.planPaidUntil && (
          <p>{status === 'TRIAL' ? 'Trial ends' : status === 'PAST_DUE' ? 'Payment was due' : 'Paid until'}: <span className="text-ink">{new Date(store.planPaidUntil).toLocaleDateString()}</span></p>
        )}
        <p>Products allowed: <span className="text-ink">{def.maxProducts === null ? 'Unlimited' : def.maxProducts}</span></p>
      </div>
      {status === 'PAST_DUE' && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Your subscription payment is overdue. Your storefront is still live — settle the invoice to keep it that way.
        </p>
      )}
      <p className="mt-4 text-xs font-semibold text-muted">
        Payments are made by CliQ or bank transfer. To pay or change your plan, contact{' '}
        {supportEmail ? <a className="font-bold text-accent hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a> : 'support'}.
      </p>
    </Section>
  );
}

function PasswordSection() {
  const changePassword = useStore((s) => s.changePassword);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: PasswordValues) => {
    try {
      await changePassword(data.currentPassword, data.newPassword);
      reset();
      toast({ title: 'Password changed', description: 'Other signed-in sessions were logged out.', type: 'success' });
    } catch (error) {
      toast({ title: 'Could not change password', description: error instanceof Error ? error.message : 'Please try again.', type: 'error' });
    }
  };

  return (
    <Section title="Password" icon={KeyRound}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Current password" error={errors.currentPassword?.message}>
          <Input type="password" autoComplete="current-password" {...register('currentPassword')} />
        </FormField>
        <FormField label="New password" error={errors.newPassword?.message}>
          <Input type="password" autoComplete="new-password" {...register('newPassword')} />
        </FormField>
        <FormField label="Confirm new password" error={errors.confirmPassword?.message}>
          <Input type="password" autoComplete="new-password" {...register('confirmPassword')} />
        </FormField>
        <Button type="submit" variant="ghost" className="w-full border border-line" disabled={isSubmitting}>
          {isSubmitting ? 'Changing…' : 'Change password'}
        </Button>
      </form>
    </Section>
  );
}

const TICKET_CATEGORIES = [
  { value: 'BILLING', label: 'Billing & payment' },
  { value: 'TECHNICAL', label: 'Technical issue' },
  { value: 'ACCOUNT', label: 'Account' },
  { value: 'FEATURE_REQUEST', label: 'Feature request' },
  { value: 'OTHER', label: 'Other' },
] as const;

const TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
};

function SupportSection({ storeId, storeName, supportEmail }: { storeId: string; storeName: string; supportEmail?: string }) {
  const loadBootstrap = useStore((s) => s.loadBootstrap);
  const allTickets = useStore((s) => s.supportTickets);
  const storeTickets = allTickets.filter((t) => t.storeId === storeId);

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('BILLING');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [view, setView] = useState<'form' | 'history'>('form');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    try {
      await createSupportTicket(storeId, {
        subject: subject.trim(),
        message: message.trim(),
        category,
      });
      setSubmitted(true);
      setSubject('');
      setCategory('BILLING');
      setMessage('');
      toast({ title: 'Support request submitted', description: 'Our team will get back to you by email.', type: 'success' });
      loadBootstrap().catch(() => {});
    } catch {
      toast({ title: 'Could not submit request', description: 'Please try again or email us directly.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Section title="Contact support" icon={LifeBuoy}>
      <div className="mb-4 flex gap-3 border-b border-line pb-3">
        <button onClick={() => setView('form')} className={`text-xs font-black uppercase tracking-widest ${view === 'form' ? 'text-accent' : 'text-muted hover:text-ink'}`}>New request</button>
        <button onClick={() => setView('history')} className={`text-xs font-black uppercase tracking-widest ${view === 'history' ? 'text-accent' : 'text-muted hover:text-ink'}`}>
          My tickets {storeTickets.length > 0 && <span className="ml-1 rounded-full bg-paper px-1.5 py-0.5 text-[10px] font-bold text-muted">{storeTickets.length}</span>}
        </button>
      </div>

      {view === 'form' && (
        submitted ? (
          <div className="py-4 text-center">
            <p className="text-sm font-bold text-ink">Your request was sent.</p>
            <p className="mt-1 text-xs font-semibold text-muted">We'll follow up at the email on your account.</p>
            <button className="mt-3 text-xs font-bold text-accent hover:underline" onClick={() => { setSubmitted(false); setView('history'); }}>View my tickets</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm font-semibold text-muted">
              Have a question or issue? Fill in the form below{supportEmail && <> or email us at <a className="font-bold text-accent hover:underline" href={`mailto:${supportEmail}`}>{supportEmail}</a></>}.
            </p>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent">
                {TICKET_CATEGORIES.map((cat) => <option key={cat.value} value={cat.value}>{cat.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted">Subject</span>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="Briefly describe the issue" className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-muted">Message</span>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required placeholder="Give us as much detail as possible…" />
            </label>
            <Button type="submit" variant="ghost" className="w-full gap-2 border border-line" disabled={submitting || !subject.trim() || !message.trim()}>
              {submitting ? 'Sending…' : 'Submit request'}
            </Button>
          </form>
        )
      )}

      {view === 'history' && (
        storeTickets.length === 0 ? (
          <p className="py-4 text-center text-sm font-semibold text-muted">No tickets submitted yet. <button className="font-bold text-accent hover:underline" onClick={() => setView('form')}>Send a request</button></p>
        ) : (
          <div className="divide-y divide-line">
            {storeTickets.map((ticket) => (
              <div key={ticket.id} className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-ink">{ticket.subject}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'}`}>
                    {TICKET_STATUS_LABELS[ticket.status] ?? ticket.status}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">{ticket.category?.replace('_', ' ')} · {new Date(ticket.createdAt).toLocaleDateString()}</p>
                {ticket.messages && ticket.messages.length > 1 && (
                  <p className="mt-1 text-xs font-semibold text-muted">{ticket.messages.length - 1} reply{ticket.messages.length > 2 ? 'ies' : ''}</p>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </Section>
  );
}

function DataExportSection({ storeId, slug }: { storeId: string; slug: string }) {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const data = await getStoreDataExport(storeId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slug}-data-export.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export ready', description: 'Your store data was downloaded as JSON.', type: 'success' });
    } catch (error) {
      toast({ title: 'Export failed', description: error instanceof Error ? error.message : 'Please try again.', type: 'error' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Section title="Your data" icon={Download}>
      <p className="mb-4 text-sm font-semibold leading-6 text-muted">
        Download a copy of everything stored for this shop — store details, products, orders, and discounts.
      </p>
      <Button type="button" variant="ghost" className="w-full gap-2 border border-line" onClick={download} disabled={downloading}>
        <Download className="h-4 w-4" /> {downloading ? 'Preparing…' : 'Export store data (JSON)'}
      </Button>
    </Section>
  );
}

/** Strip the protocol and trailing slash/hash noise so URLs read cleanly in the UI. */
function describeUrl(url: string) {
  if (url.startsWith('/')) return `${window.location.host}${url}`;
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm md:p-6">
      <h2 className="mb-4 flex items-center gap-2 font-heading text-2xl font-black tracking-tight text-ink">
        {Icon && <Icon className="h-5 w-5 text-muted" />} {title}
      </h2>
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
