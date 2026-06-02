import React, { useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStore } from '@/lib/store';
import { THEMES } from '@/lib/themes';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Field } from '@/components/ui/Field';
import { MiniStorefront } from '@/components/storefront/MiniStorefront';
import { toast } from '@/components/ui/Toast';
import { Image as ImageIcon, Save, ExternalLink } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2),
  tagline: z.string().min(3),
  logoEmoji: z.string().optional(),
  logoUrl: z.string().optional(),
  announcement: z.string().optional(),
  about: z.string().optional(),
  shippingType: z.enum(['FLAT', 'FREE_OVER', 'PICKUP']),
  shippingFlatText: z.string().optional(),
  shippingFreeOverText: z.string().optional(),
  themeId: z.string().min(1),
});

type FormValues = z.infer<typeof formSchema>;

export default function Appearance() {
  const storeId = useOutletContext<string>();
  const navigate = useNavigate();
  const { stores, products, updateStore } = useStore();
  
  const store = stores.find(s => s.id === storeId);
  const storeProducts = products.filter(p => p.storeId === storeId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!store) return null;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
    },
    mode: 'onChange',
  });

  const { formState: { isDirty, isValid }, setValue } = form;
  const values = form.watch();
  const shippingType = form.watch('shippingType');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'Image too large', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('logoUrl', reader.result as string, { shouldDirty: true });
        setValue('logoEmoji', undefined, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: FormValues) => {
    const { shippingType, shippingFlatText, shippingFreeOverText, ...storePatch } = data;
    const shipping = {
      type: shippingType,
      flatCents: shippingType === 'PICKUP' ? 0 : shippingFlatText ? Math.round(parseFloat(shippingFlatText) * 100) : 0,
      freeOverCents: shippingType === 'FREE_OVER' && shippingFreeOverText ? Math.round(parseFloat(shippingFreeOverText) * 100) : undefined,
    };
    updateStore(store.id, { ...storePatch, shipping });
    form.reset(data);
    toast({ title: 'Appearance updated', type: 'success' });
  };

  return (
    <div className="animate-fade-in flex flex-col h-full lg:flex-row gap-12">
      <div className="flex-1 max-w-xl">
        <div className="border-b border-line pb-6 mb-8">
          <h2 className="font-heading font-black text-4xl text-ink tracking-tight mb-2">Appearance</h2>
          <p className="text-muted text-lg">Customize your storefront's brand and theme.</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          
          <div className="space-y-6">
             <div className="flex items-center gap-2 mb-2">
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Brand Details</span>
               <div className="h-px bg-line flex-1" />
             </div>
             
             <Field label="Store Name" error={form.formState.errors.name?.message}>
               <Input {...form.register('name')} />
             </Field>
             
             <Field label="Tagline" error={form.formState.errors.tagline?.message}>
               <Input {...form.register('tagline')} />
             </Field>

             <Field label="Announcement" error={form.formState.errors.announcement?.message}>
               <Input {...form.register('announcement')} placeholder="e.g. Free shipping this weekend" />
             </Field>

             <Field label="About & policies" error={form.formState.errors.about?.message}>
               <Textarea {...form.register('about')} placeholder="Tell customers about your shop, fulfillment, and policies..." rows={5} />
             </Field>

             <Field label="Logo">
                <div className="flex gap-4 items-center mt-2">
                   <div className="w-16 h-16 rounded-xl border border-line flex items-center justify-center bg-paper overflow-hidden text-3xl">
                     {values.logoUrl ? <img src={values.logoUrl} className="w-full h-full object-cover" /> : values.logoEmoji || '🛍️'}
                   </div>
                   <div className="flex flex-col gap-2">
                     <div className="flex gap-2 flex-wrap">
                       {['🛍️','☕','🪴','🧵','🎨','📚', '✨', '⚡'].map(emo => (
                         <button key={emo} type="button" onClick={() => { setValue('logoEmoji', emo, { shouldDirty: true }); setValue('logoUrl', undefined, { shouldDirty: true }); }} className={`w-8 h-8 rounded bg-paper border flex items-center justify-center ${values.logoEmoji === emo && !values.logoUrl ? 'border-ink bg-line/50' : 'border-line hover:border-ink/30'}`}>
                           {emo}
                         </button>
                       ))}
                     </div>
                     <div className="flex items-center gap-3">
                       <span className="text-[10px] text-muted uppercase font-bold">OR</span>
                       <Button type="button" size="sm" variant="ghost" className="border border-line shadow-sm h-7 text-xs px-2" onClick={() => fileInputRef.current?.click()}>
                         <ImageIcon className="w-3 h-3 mr-1.5" /> Upload Logo
                       </Button>
                       <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                     </div>
                   </div>
                </div>
             </Field>
          </div>

          <div className="space-y-6">
             <div className="flex items-center gap-2 mb-2">
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Design Theme</span>
               <div className="h-px bg-line flex-1" />
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {THEMES.map(theme => (
                  <div 
                    key={theme.id}
                    onClick={() => setValue('themeId', theme.id, { shouldDirty: true })}
                    className={`cursor-pointer rounded-xl p-4 border-2 transition-all ${values.themeId === theme.id ? 'border-ink shadow-sm' : 'border-line hover:border-ink/30'}`}
                    style={{ backgroundColor: theme.surface, color: theme.text }}
                  >
                    <div className="flex gap-2 mb-4">
                      <div className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: theme.bg }} />
                      <div className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: theme.primary }} />
                      <div className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: theme.accent }} />
                    </div>
                    <div className="font-bold">{theme.name}</div>
                  </div>
                ))}
            </div>
          </div>

          <div className="space-y-6">
             <div className="flex items-center gap-2 mb-2">
               <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Shipping</span>
               <div className="h-px bg-line flex-1" />
             </div>

             <Field label="Shipping type" error={form.formState.errors.shippingType?.message}>
               <select {...form.register('shippingType')} className="w-full h-10 rounded-md border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent">
                 <option value="FLAT">Flat rate</option>
                 <option value="FREE_OVER">Flat rate, free over threshold</option>
                 <option value="PICKUP">Pickup only</option>
               </select>
             </Field>

             {shippingType !== 'PICKUP' && (
               <Field label="Flat shipping ($)" error={form.formState.errors.shippingFlatText?.message}>
                 <Input {...form.register('shippingFlatText')} type="number" step="0.01" placeholder="0.00" />
               </Field>
             )}

             {shippingType === 'FREE_OVER' && (
               <Field label="Free shipping over ($)" error={form.formState.errors.shippingFreeOverText?.message}>
                 <Input {...form.register('shippingFreeOverText')} type="number" step="0.01" placeholder="75.00" />
               </Field>
             )}
          </div>

          <div className="pt-6 border-t border-line flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => navigate(`/s/${store.slug}`)}>
               <ExternalLink className="w-4 h-4 mr-2" /> View Live Storefront
            </Button>
            <Button type="submit" variant="solid" disabled={!isDirty || !isValid}>
               <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </form>
      </div>

      <div className="hidden lg:block lg:w-[400px] xl:w-[500px] sticky top-24 self-start">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Live Preview</span>
        </div>
        <div className="w-full aspect-[4/5] max-h-[800px] flex shadow-xl border border-line rounded-[20px] overflow-hidden">
           <MiniStorefront 
             store={{ ...store, ...values }} 
             products={storeProducts.length > 0 ? storeProducts.slice(0, 4) : [{ name: 'Sample Item', priceCents: 1500, imageEmoji: '✨' }]} 
           />
        </div>
      </div>
    </div>
  );
}
