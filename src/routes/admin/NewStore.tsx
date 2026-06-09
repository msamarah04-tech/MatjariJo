import { useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/Toast';
import { ArrowRight, CheckCircle2, ClipboardList, Store } from 'lucide-react';

const requestSchema = z.object({
  ownerName: z.string().min(2, 'Name is required'),
  ownerEmail: z.string().email('Valid email required'),
  storeName: z.string().min(2, 'Website name is required'),
  category: z.string().min(1, 'Category is required'),
  tagline: z.string().min(3, 'Tagline is required'),
  notes: z.string().optional(),
  // The owner chooses their own admin sign-in (used after the request is approved).
  username: z.string().trim().toLowerCase()
    .min(3, 'At least 3 characters')
    .max(60)
    .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, 'Lowercase letters, numbers, and hyphens only'),
  password: z.string()
    .min(10, 'At least 10 characters')
    .regex(/[A-Za-z]/, 'Include at least one letter')
    .regex(/[0-9]/, 'Include at least one number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match',
});

type RequestValues = z.infer<typeof requestSchema>;

export default function NewStore() {
  const submitShopRequest = useStore((s) => s.submitShopRequest);
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      ownerName: '',
      ownerEmail: '',
      storeName: '',
      category: '',
      tagline: '',
      notes: '',
      username: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RequestValues) => {
    try {
      const { confirmPassword: _confirm, ...payload } = data;
      await submitShopRequest(payload);
      setSubmitted(true);
      form.reset();
      toast({ title: 'Website request sent', description: 'The website team will review it and create the website from the standard template.', type: 'success' });
    } catch (error) {
      toast({ title: 'Could not send request', description: error instanceof Error ? error.message : 'Try again later.', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <Link to="/" className="font-logo text-3xl font-black tracking-tighter">
            PLINTH<span className="text-accent">.</span>
          </Link>
          <Link to="/sign-in" className="text-sm font-bold text-muted hover:text-ink">
            Shop owner sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl grid-cols-1 gap-10 px-4 py-12 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-muted">
            <ClipboardList className="h-3.5 w-3.5" />
            Website request
          </div>
          <h1 className="font-heading text-6xl font-black leading-[0.9] tracking-tight md:text-7xl">
            Request a website. We build it from the standard template.
          </h1>
          <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-muted">
            Tell us what the business needs. The website team reviews the request, creates the storefront from the standard template, and then gives the shop owner access to Admin for products, orders, discounts, appearance, and analytics.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StepCard title="1. Request" text="Submit website details." />
            <StepCard title="2. We create" text="The website team fills the standard template." />
            <StepCard title="3. You manage" text="Use Admin after approval." />
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm md:p-8">
          {submitted ? (
            <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="font-heading text-4xl font-black tracking-tight">Request received</h2>
              <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-muted">
                Your request is now waiting in the private team queue for the website owner and team to review.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => setSubmitted(false)} variant="accent">Submit another request</Button>
                <Link to="/" className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-bold text-muted hover:text-ink">
                  Back home
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <div className="flex items-center gap-3 border-b border-line pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-heading text-3xl font-black tracking-tight">Website details</h2>
                  <p className="text-sm font-semibold text-muted">This does not create a live website yet.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field label="Your name" error={form.formState.errors.ownerName?.message}>
                  <Input {...form.register('ownerName')} placeholder="e.g. Sara Ahmed" />
                </Field>
                <Field label="Email" error={form.formState.errors.ownerEmail?.message}>
                  <Input {...form.register('ownerEmail')} type="email" placeholder="you@example.com" />
                </Field>
                <Field label="Website name" error={form.formState.errors.storeName?.message}>
                  <Input {...form.register('storeName')} placeholder="e.g. Coastal Goods" />
                </Field>
                <Field label="Category" error={form.formState.errors.category?.message}>
                  <Input {...form.register('category')} placeholder="e.g. Fashion, Coffee, Art" />
                </Field>
                <Field label="Tagline" error={form.formState.errors.tagline?.message} className="md:col-span-2">
                  <Input {...form.register('tagline')} placeholder="A short line for the website" />
                </Field>
                <Field label="Notes for the website team" error={form.formState.errors.notes?.message} className="md:col-span-2">
                  <Textarea {...form.register('notes')} rows={5} placeholder="Products or services, style, pages, policies, delivery needs..." />
                </Field>
              </div>

              <div className="rounded-xl border border-line bg-paper p-4">
                <div className="mb-1 text-sm font-black text-ink">Choose your admin sign-in</div>
                <p className="mb-4 text-xs font-semibold leading-5 text-muted">
                  You'll use these to manage the store after it's approved. Keep them safe — the password is stored hashed and can't be recovered (only reset).
                </p>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Field label="Username" error={form.formState.errors.username?.message}>
                    <Input {...form.register('username')} autoComplete="username" placeholder="e.g. coastal-goods" />
                  </Field>
                  <div className="hidden md:block" />
                  <Field label="Password" error={form.formState.errors.password?.message}>
                    <Input {...form.register('password')} type="password" autoComplete="new-password" placeholder="At least 10 chars, a letter & a number" />
                  </Field>
                  <Field label="Confirm password" error={form.formState.errors.confirmPassword?.message}>
                    <Input {...form.register('confirmPassword')} type="password" autoComplete="new-password" placeholder="Re-enter password" />
                  </Field>
                </div>
              </div>

              <Button type="submit" variant="accent" size="lg" className="w-full">
                Send website request <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

function StepCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="font-black text-ink">{title}</div>
      <div className="mt-1 text-sm font-semibold text-muted">{text}</div>
    </div>
  );
}
