import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Image as ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Drawer } from './Drawer';
import { Button } from './Button';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { toast } from './Toast';
import { prepareImageDataUrl } from '@/lib/images';

export type FieldType = 'text' | 'textarea' | 'number' | 'money' | 'date' | 'select' | 'checkbox' | 'emoji' | 'image';

export interface FieldDef {
  name: string;
  label: string;
  type?: FieldType;
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
  step?: string;
  /** Emoji choices for `emoji`/`image` fields. */
  emojiChoices?: string[];
  /** Column span in the 2-col grid. Defaults to full width for textarea/checkbox/image. */
  colSpan?: 1 | 2;
  /** Conditionally render based on the current form values. */
  show?: (values: Record<string, unknown>) => boolean;
  /** Group fields into visual cards inside larger forms. */
  section?: string;
  sectionDescription?: string;
}

interface ResourceFormDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** The record being edited, or null/undefined to create. */
  record?: object | null;
  fields: FieldDef[];
  schema: z.ZodTypeAny;
  /** Form defaults used when creating. Money fields take a decimal string (e.g. "0"). */
  defaultValues: Record<string, unknown>;
  /** Map a record to form values when editing (for fields the auto-mapper can't derive). */
  toForm?: (record: Record<string, unknown>) => Record<string, unknown>;
  /** Receives a typed payload: money → integer cents, number → number, checkbox → boolean.
   *  May be async; if it throws/rejects the drawer stays open so the user can retry. */
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  submitLabel?: string;
}

const DEFAULT_EMOJIS = ['📦', '🛍️', '🪴', '☕', '🖼️', '💎', '🕯️', '🍪', '✨', '⚡'];

const inputCls = 'h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-accent';

/** Build initial form values, coercing entity cents → decimal strings for money fields. */
function buildInitial(fields: FieldDef[], record: Record<string, unknown> | null | undefined, defaultValues: Record<string, unknown>, toForm?: (record: Record<string, unknown>) => Record<string, unknown>) {
  if (!record) return { ...defaultValues };
  const derived: Record<string, unknown> = {};
  for (const field of fields) {
    const value = record[field.name];
    if (value === undefined) continue;
    if (field.type === 'money') derived[field.name] = value === null ? '' : String((value as number) / 100);
    else if (field.type === 'number') derived[field.name] = value === null ? '' : String(value);
    else if (field.type === 'checkbox') derived[field.name] = Boolean(value);
    else derived[field.name] = value;
  }
  return { ...defaultValues, ...derived, ...(toForm ? toForm(record) : {}) };
}

/** Convert validated form values into a typed payload (money → cents, etc.), skipping hidden fields. */
function toPayload(fields: FieldDef[], values: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.show && !field.show(values)) continue;
    const value = values[field.name];
    if (field.type === 'money') out[field.name] = value === '' || value == null ? undefined : Math.round(parseFloat(String(value)) * 100);
    else if (field.type === 'number') out[field.name] = value === '' || value == null ? undefined : Number(value);
    else if (field.type === 'checkbox') out[field.name] = Boolean(value);
    else out[field.name] = value;
  }
  return out;
}

/**
 * Schema-driven create/edit form rendered inside a Drawer. Field definitions
 * describe the inputs; a Zod schema validates them. The `money` field type shows
 * a decimal amount but reads/writes integer cents, so pages stay in cents.
 */
export function ResourceFormDrawer({
  open,
  onClose,
  title,
  description,
  record,
  fields,
  schema,
  defaultValues,
  toForm,
  onSubmit,
  submitLabel,
}: ResourceFormDrawerProps) {
  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema as never),
    defaultValues,
  });

  // Re-seed the form whenever the drawer opens or the target record changes.
  React.useEffect(() => {
    if (open) reset(buildInitial(fields, (record as Record<string, unknown> | null) ?? null, defaultValues, toForm));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record]);

  const values = watch();

  const submit = handleSubmit(async (raw) => {
    try {
      await onSubmit(toPayload(fields, raw));
      onClose(); // close only on success
    } catch {
      // Keep the drawer open; the handler is responsible for showing the error.
    }
  });

  const visibleFields = fields.filter((field) => !field.show || field.show(values));
  const sections = React.useMemo(() => {
    const grouped = new Map<string, { description?: string; fields: FieldDef[] }>();
    visibleFields.forEach((field) => {
      const section = field.section || 'Details';
      const current = grouped.get(section) || { description: field.sectionDescription, fields: [] };
      current.description ||= field.sectionDescription;
      current.fields.push(field);
      grouped.set(section, current);
    });
    return [...grouped.entries()];
  }, [visibleFields]);

  const fieldError = (name: string) => (errors[name]?.message as string | undefined);

  // Make `required` actually validate (it was previously cosmetic), so empty
  // required fields are caught inline before a request is sent to the backend.
  const reg = (field: FieldDef) => register(field.name, field.required ? { required: `${field.label} is required.` } : undefined);

  const renderControl = (field: FieldDef) => {
    switch (field.type) {
      case 'textarea':
        return <Textarea {...reg(field)} rows={3} placeholder={field.placeholder} />;
      case 'number':
        return <Input {...reg(field)} type="number" step={field.step ?? '1'} placeholder={field.placeholder} />;
      case 'date':
        return <Input {...reg(field)} type="date" />;
      case 'money':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">$</span>
            <Input {...reg(field)} type="number" step="0.01" placeholder={field.placeholder ?? '0.00'} className="pl-7" />
          </div>
        );
      case 'select':
        return (
          <select {...reg(field)} className={inputCls}>
            {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-3 rounded-xl border border-line bg-paper p-3 cursor-pointer hover:bg-line/20">
            <input type="checkbox" {...register(field.name)} className="h-4 w-4 accent-accent" />
            <span>
              <span className="block text-sm font-bold text-ink">{field.label}</span>
              {field.hint && <span className="block text-xs text-muted">{field.hint}</span>}
            </span>
          </label>
        );
      case 'emoji':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: f }) => (
              <div className="flex flex-wrap gap-1.5">
                {(field.emojiChoices ?? DEFAULT_EMOJIS).map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => f.onChange(emoji)}
                    className={cn('flex h-9 w-9 items-center justify-center rounded-lg border bg-paper text-lg', f.value === emoji ? 'border-ink bg-line/50' : 'border-line hover:border-ink/30')}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          />
        );
      case 'image':
        return (
          <Controller
            name={field.name}
            control={control}
            render={({ field: f }) => {
              const value = (f.value as { emoji?: string; url?: string }) || {};
              const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  const dataUrl = await prepareImageDataUrl(file, { maxDimension: 1000, maxBytes: 450_000 });
                  f.onChange({ url: dataUrl, emoji: undefined });
                  toast({ title: 'Image ready', description: 'Save the form to publish it.', type: 'success' });
                } catch (error) {
                  toast({ title: 'Could not use image', description: error instanceof Error ? error.message : 'Try a smaller image.', type: 'error' });
                } finally {
                  event.target.value = '';
                }
              };
              return (
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-paper text-3xl">
                    {value.url ? <img src={value.url} alt="" className="h-full w-full object-cover" /> : (value.emoji || '📦')}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(field.emojiChoices ?? DEFAULT_EMOJIS).map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => f.onChange({ emoji, url: undefined })}
                          className={cn('flex h-8 w-8 items-center justify-center rounded-lg border bg-paper', value.emoji === emoji && !value.url ? 'border-ink bg-line/50' : 'border-line hover:border-ink/30')}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs font-bold text-ink hover:bg-paper">
                      <ImageIcon className="h-3 w-3" /> Upload
                      <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
                    </label>
                  </div>
                </div>
              );
            }}
          />
        );
      default:
        return <Input {...reg(field)} type="text" placeholder={field.placeholder} />;
    }
  };

  const fullWidth = (field: FieldDef) => field.colSpan === 2 || (field.colSpan === undefined && (field.type === 'textarea' || field.type === 'checkbox' || field.type === 'image'));

  return (
    <Drawer
      isOpen={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="flex-1 border border-line" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="accent" className="flex-1" onClick={submit}>{submitLabel ?? (record ? 'Save changes' : 'Create')}</Button>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {sections.map(([section, group]) => (
          <section key={section} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-black text-ink">{section}</h3>
              {group.description && <p className="mt-1 text-xs leading-5 text-muted">{group.description}</p>}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {group.fields.map((field) => (
                <div key={field.name} className={cn(fullWidth(field) ? 'md:col-span-2' : 'md:col-span-1')}>
                  {field.type === 'checkbox' ? (
                    renderControl(field)
                  ) : (
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted">
                        {field.label}{field.required && <span className="text-accent">*</span>}
                      </span>
                      {renderControl(field)}
                      {field.hint && !fieldError(field.name) && <span className="mt-1 block text-xs text-muted">{field.hint}</span>}
                    </label>
                  )}
                  {fieldError(field.name) && (
                    <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600"><X className="h-3 w-3" /> {fieldError(field.name)}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
        {/* Allow Enter-to-submit without a visible duplicate button. */}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Drawer>
  );
}
