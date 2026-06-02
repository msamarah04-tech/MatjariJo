import React, { useState, useRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Product } from '@/lib/types';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { PackageSearch, Plus, Image as ImageIcon, Pencil, Trash2, Tag } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  collection: z.string().optional(),
  priceText: z.string().min(1, 'Price is required').refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: 'Must be a valid positive price' }),
  compareAtText: z.string().optional().refine(val => !val || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), { message: 'Must be a valid positive price' }),
  stockText: z.string().refine(val => !isNaN(parseInt(val, 10)) && parseInt(val, 10) >= 0, { message: 'Must be a valid positive integer' }),
  imageEmoji: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Products() {
  const storeId = useOutletContext<string>();
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  
  const storeProducts = products.filter(p => p.storeId === storeId).sort((a, b) => b.createdAt - a.createdAt);
  const collections = Array.from(new Set(storeProducts.map(p => p.collection?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      priceText: '',
      compareAtText: '',
      stockText: '10',
      collection: '',
      imageEmoji: '📦',
      isActive: true,
      isFeatured: false,
    }
  });

  const handleOpenModal = (product?: Product) => {
    form.reset();
    if (product) {
      setEditingId(product.id);
      form.setValue('name', product.name);
      form.setValue('description', product.description || '');
      form.setValue('collection', product.collection || '');
      form.setValue('priceText', (product.priceCents / 100).toString());
      form.setValue('compareAtText', product.compareAtCents ? (product.compareAtCents / 100).toString() : '');
      form.setValue('stockText', product.stock.toString());
      form.setValue('imageEmoji', product.imageEmoji || '📦');
      form.setValue('imageUrl', product.imageUrl);
      form.setValue('isActive', product.isActive);
      form.setValue('isFeatured', product.isFeatured ?? false);
    } else {
      setEditingId(null);
      form.setValue('imageEmoji', '📦');
      form.setValue('stockText', '10');
      form.setValue('collection', '');
      form.setValue('compareAtText', '');
      form.setValue('isActive', true);
      form.setValue('isFeatured', false);
    }
    setIsModalOpen(true);
  };

  const onSubmit = (data: FormValues) => {
    const priceCents = Math.round(parseFloat(data.priceText) * 100);
    const compareAtCents = data.compareAtText ? Math.round(parseFloat(data.compareAtText) * 100) : undefined;
    const stock = parseInt(data.stockText, 10);

    const payload = {
      name: data.name,
      description: data.description,
      collection: data.collection?.trim() || '',
      priceCents,
      compareAtCents: compareAtCents && compareAtCents > priceCents ? compareAtCents : undefined,
      stock,
      imageEmoji: data.imageEmoji,
      imageUrl: data.imageUrl,
      isActive: data.isActive,
      isFeatured: data.isFeatured,
    };

    if (editingId) {
      updateProduct(editingId, payload);
      toast({ title: 'Product updated' });
    } else {
      addProduct(storeId, payload);
      toast({ title: 'Product added' });
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProduct(id);
      toast({ title: 'Product deleted' });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'Image too large', description: 'Under 2MB please.', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('imageUrl', reader.result as string);
        form.setValue('imageEmoji', undefined);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="animate-fade-in flex flex-col h-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-line pb-6 mb-8 gap-4">
        <div>
          <h2 className="font-heading font-black text-4xl text-ink tracking-tight mb-2">Products</h2>
          <p className="text-muted text-lg">Manage your storefront inventory.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="font-bold shrink-0 shadow-xs">
          <Plus className="w-4 h-4 mr-2" /> New Product
        </Button>
      </div>

      {storeProducts.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No products yet"
          description="Add some items to start selling on your storefront."
          action={<Button onClick={() => handleOpenModal()}><Plus className="w-4 h-4 mr-2" /> Add your first product</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {storeProducts.map(p => (
            <div key={p.id} className={`group flex flex-col bg-surface border border-line rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md ${!p.isActive && 'opacity-60 grayscale-[0.5]'}`}>
              <div className="w-full aspect-[4/3] bg-paper flex items-center justify-center text-5xl relative border-b border-line overflow-hidden">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                   <span>{p.imageEmoji}</span>
                )}
                {!p.isActive && (
                  <div className="absolute top-2 left-2 bg-ink/80 backdrop-blur text-surface text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                    Hidden
                  </div>
                )}
                {p.isFeatured && (
                  <div className="absolute bottom-2 left-2 bg-accent text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                    Featured
                  </div>
                )}
                {p.compareAtCents && p.compareAtCents > p.priceCents && (
                  <div className="absolute bottom-2 right-2 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                    Sale
                  </div>
                )}
                
                {/* Actions overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button onClick={() => handleOpenModal(p)} className="p-1.5 bg-surface text-ink rounded hover:bg-line/50 shadow-sm transition-colors" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 bg-surface text-red-600 rounded hover:bg-red-50 shadow-sm transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start gap-4 mb-2">
                  <h3 className="font-bold text-ink leading-tight">{p.name}</h3>
                  <span className="font-mono font-bold text-ink text-right">
                    {p.compareAtCents && p.compareAtCents > p.priceCents && (
                      <span className="block text-[11px] text-muted line-through">{money(p.compareAtCents)}</span>
                    )}
                    {money(p.priceCents)}
                  </span>
                </div>
                <p className="text-sm text-muted line-clamp-2 mb-4 flex-1">{p.description || <span className="opacity-50 italic">No description</span>}</p>
                <div className="text-[10px] font-bold uppercase text-muted tracking-widest pt-3 border-t border-line/50 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5"><Tag className="w-3 h-3" /> {p.collection || 'Uncollected'}</span>
                  <span>{p.stock} in stock</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? 'Edit Product' : 'New Product'}
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex gap-4 items-center">
             <div className="w-20 h-20 rounded-xl border border-line flex items-center justify-center bg-paper overflow-hidden text-3xl shrink-0">
               {form.watch('imageUrl') ? <img src={form.watch('imageUrl')} className="w-full h-full object-cover" /> : form.watch('imageEmoji')}
             </div>
             <div className="flex flex-col gap-2">
               <div className="flex gap-1.5 flex-wrap">
                 {['📦','🛍️','🪴','☕','🖼️','💎','🕯️','🍪'].map(emo => (
                   <button key={emo} type="button" onClick={() => { form.setValue('imageEmoji', emo); form.setValue('imageUrl', undefined); }} className={`w-8 h-8 flex items-center justify-center rounded bg-paper border ${form.watch('imageEmoji') === emo && !form.watch('imageUrl') ? 'border-ink bg-line/50' : 'border-line hover:border-ink/30'}`}>
                     {emo}
                   </button>
                 ))}
               </div>
               <div className="flex items-center gap-2">
                 <span className="text-[10px] text-muted uppercase font-bold">Or</span>
                 <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs border border-line shadow-sm" onClick={() => fileInputRef.current?.click()}>
                   <ImageIcon className="w-3 h-3 mr-1.5" /> Upload
                 </Button>
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <Field label="Name" error={form.formState.errors.name?.message} className="md:col-span-2">
               <Input {...form.register('name')} placeholder="e.g. Coastal Mug" />
             </Field>

             <Field label="Price ($)" error={form.formState.errors.priceText?.message}>
               <Input {...form.register('priceText')} placeholder="0.00" type="number" step="0.01" />
             </Field>

             <Field label="Compare-at price ($)" error={form.formState.errors.compareAtText?.message}>
               <Input {...form.register('compareAtText')} placeholder="Optional sale anchor" type="number" step="0.01" />
             </Field>

             <Field label="Stock count" error={form.formState.errors.stockText?.message}>
               <Input {...form.register('stockText')} type="number" step="1" />
             </Field>

             <Field label="Collection" error={form.formState.errors.collection?.message}>
               <>
                 <Input {...form.register('collection')} placeholder="e.g. Plants, Accessories" list="product-collections" />
                 <datalist id="product-collections">
                   {collections.map(collection => <option key={collection} value={collection} />)}
                 </datalist>
               </>
             </Field>

             <Field label="Description" error={form.formState.errors.description?.message} className="md:col-span-2">
               <Textarea {...form.register('description')} placeholder="Briefly describe this product..." rows={3} />
             </Field>
          </div>
          
          <label className="flex items-center gap-3 p-3 border border-line rounded-lg cursor-pointer hover:bg-line/20 transition-colors">
             <input type="checkbox" {...form.register('isActive')} className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent" />
             <div className="flex flex-col">
               <span className="text-sm font-semibold text-ink">Active on Storefront</span>
               <span className="text-xs text-muted">Allow customers to see and purchase this.</span>
             </div>
          </label>

          <label className="flex items-center gap-3 p-3 border border-line rounded-lg cursor-pointer hover:bg-line/20 transition-colors">
             <input type="checkbox" {...form.register('isFeatured')} className="w-4 h-4 rounded text-accent focus:ring-accent accent-accent" />
             <div className="flex flex-col">
               <span className="text-sm font-semibold text-ink">Feature this product</span>
               <span className="text-xs text-muted">Show it in the storefront featured row.</span>
             </div>
          </label>

          <div className="pt-2 flex justify-end gap-3">
             <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button type="submit" variant="solid">{editingId ? 'Save Changes' : 'Create Product'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
