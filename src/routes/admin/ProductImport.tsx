import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Download, FileSpreadsheet,
  Loader2, Upload, X, AlertTriangle, Package,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import { useAdminContext } from './shared';
import { listProductCategorySchemas, tr } from '@/lib/productCategory';
import { apiFetch } from '@/api/client';
import type { Product } from '@/lib/types';

// ─── Excel column map ──────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'name',              label: 'name',                required: true,  hint: 'Product name' },
  { key: 'category',          label: 'category',            required: true,  hint: 'Category key (see "Categories" sheet)' },
  { key: 'price',             label: 'price',               required: true,  hint: `Selling price in your store currency (e.g. 25.000)` },
  { key: 'compare_at_price',  label: 'compare_at_price',    required: false, hint: 'Crossed-out "was" price' },
  { key: 'cost_price',        label: 'cost_price',          required: false, hint: 'Private cost (not shown to customers)' },
  { key: 'sku',               label: 'sku',                 required: false, hint: 'Stock keeping unit' },
  { key: 'barcode',           label: 'barcode',             required: false, hint: 'Barcode / GTIN' },
  { key: 'brand',             label: 'brand',               required: false, hint: 'Brand name' },
  { key: 'stock',             label: 'stock',               required: false, hint: 'Stock quantity (default: 10)' },
  { key: 'description',       label: 'description',         required: false, hint: 'Full product description' },
  { key: 'short_description', label: 'short_description',   required: false, hint: 'Short summary (max 240 chars)' },
  { key: 'tags',              label: 'tags',                required: false, hint: 'Comma-separated tags (max 12)' },
  { key: 'status',            label: 'status',              required: false, hint: 'ACTIVE or DRAFT (default: ACTIVE)' },
  { key: 'weight_grams',      label: 'weight_grams',        required: false, hint: 'Shipping weight in grams' },
  { key: 'image_url',         label: 'image_url',           required: false, hint: 'Public image URL' },
  { key: 'dimensions',        label: 'dimensions',          required: false, hint: 'e.g. 30 × 20 × 8 cm' },
];

// ─── Row shape ─────────────────────────────────────────────────────────────────

type ParsedRow = {
  rowIndex: number;
  name: string;
  category: string;
  price: string;
  compare_at_price: string;
  cost_price: string;
  sku: string;
  barcode: string;
  brand: string;
  stock: string;
  description: string;
  short_description: string;
  tags: string;
  status: string;
  weight_grams: string;
  image_url: string;
  dimensions: string;
  errors: string[];
};

type ImportResult = {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function validateRow(row: ParsedRow, currency: string): string[] {
  const errs: string[] = [];
  if (!row.name.trim()) errs.push('Name is required');
  if (!row.category.trim()) errs.push('Category is required');
  const price = parseFloat(row.price);
  if (!row.price || isNaN(price) || price <= 0) errs.push('Price must be a number > 0');
  return errs;
}

function toMinor(text: string, currency: string): number {
  const n = parseFloat(text) || 0;
  const decimals = currency === 'JOD' ? 3 : 2;
  return Math.round(n * Math.pow(10, decimals));
}

function rowToPayload(row: ParsedRow, store: { currency: string; category: string; slug: string }) {
  const priceCents = toMinor(row.price, store.currency);
  const compareAtCents = row.compare_at_price ? toMinor(row.compare_at_price, store.currency) : undefined;
  const costPriceCents = row.cost_price ? toMinor(row.cost_price, store.currency) : undefined;
  const stock = row.stock ? Math.max(0, Math.floor(Number(row.stock) || 0)) : 10;
  const status = (row.status || 'ACTIVE').toUpperCase() === 'DRAFT' ? 'DRAFT' : 'ACTIVE';
  const tags = row.tags ? row.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 12) : [];
  const categorySchemas = listProductCategorySchemas();
  const matchedSchema = categorySchemas.find(
    (s) => s.key === row.category.trim() || tr(s.label, 'en').toLowerCase() === row.category.trim().toLowerCase()
  );
  const categoryKey = matchedSchema?.key || '';
  const categoryLabel = matchedSchema ? tr(matchedSchema.label, 'en') : (row.category.trim() || store.category);

  return {
    name: row.name.trim(),
    description: row.description.trim(),
    category: categoryLabel,
    collection: '',
    tags,
    priceCents,
    compareAtCents: compareAtCents && compareAtCents > priceCents ? compareAtCents : undefined,
    stock,
    imageEmoji: row.image_url.trim() ? undefined : '📦',
    imageUrl: row.image_url.trim() || undefined,
    isActive: status === 'ACTIVE',
    isFeatured: false,
    details: {
      // categoryKey is intentionally omitted from bulk imports — the Excel template
      // has no columns for required category-specific attributes (e.g. fragranceFamily),
      // so including it would trigger validation errors on every row.
      status,
      sku: row.sku.trim() || undefined,
      barcode: row.barcode.trim() || undefined,
      brand: row.brand.trim() || undefined,
      shortDescription: row.short_description.trim() || undefined,
      costPriceCents: costPriceCents && costPriceCents > 0 ? costPriceCents : undefined,
      weightGrams: row.weight_grams ? Math.max(0, Math.floor(Number(row.weight_grams) || 0)) : undefined,
      dimensions: row.dimensions.trim() || undefined,
      slug: row.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    },
  };
}

// ─── Template generator ─────────────────────────────────────────────────────────

async function downloadTemplate(storeName: string, currency: string) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Matjari';
  wb.created = new Date();

  // ── Products sheet ──────────────────────────────────────────────────────────
  const ws = wb.addWorksheet('Products');

  // Header row
  const headerRow = ws.addRow(COLUMNS.map((c) => c.key));
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF0F2040' } } };
  });
  ws.getRow(1).height = 22;

  // Hint row (italicised, grey)
  const hintRow = ws.addRow(COLUMNS.map((c) => c.hint));
  hintRow.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: 'FF888888' }, size: 9 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
  });
  ws.getRow(2).height = 16;

  // Example row
  const exampleRow = ws.addRow([
    'Linen Shirt', 'clothing', '25.000', '35.000', '12.000',
    'LS-001', '', 'Zara', '50',
    'A comfortable linen shirt for everyday wear.', 'Everyday linen shirt.',
    'linen, shirt, summer', 'ACTIVE', '300', '', '60 × 40 × 5 cm',
  ]);
  exampleRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF6FF' } };
    cell.font = { italic: true, color: { argb: 'FF334155' } };
  });
  ws.getRow(3).height = 18;

  // Required column header coloring
  COLUMNS.forEach((col, i) => {
    const cell = ws.getRow(1).getCell(i + 1);
    if (col.required) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F2040' } };
    }
  });

  // Column widths
  const widths = [28, 18, 12, 16, 12, 14, 14, 16, 10, 40, 30, 24, 10, 13, 40, 20];
  COLUMNS.forEach((_, i) => { ws.getColumn(i + 1).width = widths[i] ?? 16; });

  // Freeze top 2 rows
  ws.views = [{ state: 'frozen', ySplit: 2 }];

  // ── Categories reference sheet ──────────────────────────────────────────────
  const catWs = wb.addWorksheet('Categories');
  const catHeader = catWs.addRow(['Category Key', 'Display Name (EN)', 'Supports Variants']);
  catHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
  });
  catWs.getColumn(1).width = 24;
  catWs.getColumn(2).width = 30;
  catWs.getColumn(3).width = 18;

  const schemas = listProductCategorySchemas();
  schemas.forEach((schema) => {
    const supportsVariants = (schema.variantOptions?.length ?? 0) > 0;
    const row = catWs.addRow([schema.key, tr(schema.label, 'en'), supportsVariants ? 'Yes' : 'No']);
    if (supportsVariants) {
      row.getCell(3).font = { color: { argb: 'FF16a34a' }, bold: true };
    }
  });

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `matjari-products-template.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Excel parser (client-side) ─────────────────────────────────────────────────

async function parseExcelFile(file: File, currency: string): Promise<ParsedRow[]> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('No worksheet found.');

  // Find header row (first row with "name" in it)
  let headerRowNum = 1;
  ws.eachRow((row, num) => {
    const cells = row.values as string[];
    if (cells.some((c) => String(c ?? '').toLowerCase() === 'name')) {
      headerRowNum = num;
    }
  });
  const headerRow = ws.getRow(headerRowNum);
  const colIndex: Record<string, number> = {};
  (headerRow.values as (string | undefined)[]).forEach((val, i) => {
    if (val) colIndex[String(val).trim().toLowerCase()] = i;
  });

  const rows: ParsedRow[] = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum <= headerRowNum + 1) return; // skip header + hint rows
    const vals = row.values as (string | number | undefined)[];
    const get = (key: string) => String(vals[colIndex[key]] ?? '').trim();

    const name = get('name');
    const category = get('category');
    const price = get('price');
    if (!name && !category && !price) return; // blank row

    const parsed: ParsedRow = {
      rowIndex: rowNum,
      name,
      category,
      price,
      compare_at_price: get('compare_at_price'),
      cost_price: get('cost_price'),
      sku: get('sku'),
      barcode: get('barcode'),
      brand: get('brand'),
      stock: get('stock'),
      description: get('description'),
      short_description: get('short_description'),
      tags: get('tags'),
      status: get('status'),
      weight_grams: get('weight_grams'),
      image_url: get('image_url'),
      dimensions: get('dimensions'),
      errors: [],
    };
    parsed.errors = validateRow(parsed, currency);
    rows.push(parsed);
  });
  return rows;
}

// ─── Component ─────────────────────────────────────────────────────────────────

type ImportPhase = 'idle' | 'preview' | 'importing' | 'done';

export default function ProductImport() {
  const { storeId, store } = useAdminContext();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const loadBootstrap = useStore((s) => s.loadBootstrap);

  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadTemplate(store.name, store.currency);
      toast({ title: 'Template downloaded', type: 'success' });
    } catch {
      toast({ title: 'Could not generate template', type: 'error' });
    } finally {
      setDownloading(false);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast({ title: 'Please upload an .xlsx or .xls file', type: 'error' });
      return;
    }
    setFileName(file.name);
    try {
      const parsed = await parseExcelFile(file, store.currency);
      if (parsed.length === 0) {
        toast({ title: 'No product rows found in the file', type: 'error' });
        return;
      }
      setRows(parsed);
      setPhase('preview');
    } catch (error) {
      toast({ title: 'Could not read file', description: error instanceof Error ? error.message : undefined, type: 'error' });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    const validRows = rows.filter((r) => r.errors.length === 0);
    if (!validRows.length) {
      toast({ title: 'No valid rows to import', type: 'error' });
      return;
    }
    setPhase('importing');
    try {
      const payloads = validRows.map((r) => rowToPayload(r, store));
      const res = await apiFetch<ImportResult>(`/admin/stores/${storeId}/products/bulk`, {
        method: 'POST',
        body: JSON.stringify({ products: payloads }),
      });
      setResult(res);
      setPhase('done');
      await loadBootstrap();
      toast({ title: `${res.imported} product${res.imported === 1 ? '' : 's'} imported`, type: 'success' });
    } catch (error) {
      toast({ title: 'Import failed', description: error instanceof Error ? error.message : undefined, type: 'error' });
      setPhase('preview');
    }
  };

  const reset = () => {
    setPhase('idle');
    setRows([]);
    setResult(null);
    setFileName('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const validCount = rows.filter((r) => r.errors.length === 0).length;
  const errorCount = rows.filter((r) => r.errors.length > 0).length;

  return (
    <div className="space-y-6">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-5 -mt-6 flex items-center gap-3 border-b border-line bg-surface/95 px-5 py-3 backdrop-blur md:-mx-8 md:px-8">
        <button
          onClick={() => navigate(`/admin/${storeId}/products`)}
          className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-bold text-muted transition-colors hover:bg-paper hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Products
        </button>
        <span className="text-muted">/</span>
        <span className="text-sm font-black text-ink">Import from Excel</span>
      </div>

      <div className="mx-auto max-w-3xl space-y-6">
        {/* ── Step 1: Download template ────────────────────────────────── */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-100">
              <span className="text-sm font-black text-blue-700">1</span>
            </div>
            <div>
              <h2 className="font-black text-ink">Download the template</h2>
              <p className="text-xs text-muted">Fill in your products, then upload the completed file below.</p>
            </div>
          </div>
          <Button variant="ghost" className="border border-line gap-2" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download template (.xlsx)
          </Button>
          <div className="mt-4 rounded-xl border border-line bg-paper p-3">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted">Template columns</p>
            <div className="flex flex-wrap gap-1.5">
              {COLUMNS.map((col) => (
                <span key={col.key} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${col.required ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-paper text-muted ring-1 ring-line'}`}>
                  {col.key}{col.required ? ' *' : ''}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted"><span className="text-red-600 font-bold">* Required.</span> Currency: <strong>{store.currency}</strong> · The "Categories" sheet in the template lists all valid category keys.</p>
          </div>
        </div>

        {/* ── Step 2: Upload ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-100">
              <span className="text-sm font-black text-blue-700">2</span>
            </div>
            <div>
              <h2 className="font-black text-ink">Upload your filled sheet</h2>
              <p className="text-xs text-muted">Drag & drop or click to browse.</p>
            </div>
            {phase !== 'idle' && (
              <button onClick={reset} className="ms-auto flex items-center gap-1 text-xs font-bold text-muted hover:text-ink">
                <X className="h-3.5 w-3.5" /> Start over
              </button>
            )}
          </div>

          {phase === 'idle' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-12 transition-colors ${dragging ? 'border-accent bg-accent-soft' : 'border-line bg-paper hover:border-ink/30 hover:bg-paper/80'}`}
            >
              <FileSpreadsheet className="h-10 w-10 text-muted" />
              <div className="text-center">
                <p className="font-bold text-ink">Drop your .xlsx file here</p>
                <p className="text-sm text-muted">or click to browse</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          )}

          {(phase === 'preview' || phase === 'importing') && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper p-3">
                <FileSpreadsheet className="h-5 w-5 text-muted" />
                <span className="font-bold text-ink text-sm">{fileName}</span>
                <span className="ms-auto flex gap-2">
                  <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700 ring-1 ring-green-200">{validCount} valid</span>
                  {errorCount > 0 && <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 ring-1 ring-red-200">{errorCount} errors</span>}
                </span>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-xs">
                  <thead className="bg-paper">
                    <tr>
                      <th className="px-3 py-2 text-left font-black text-muted uppercase tracking-widest">Row</th>
                      <th className="px-3 py-2 text-left font-black text-muted uppercase tracking-widest">Name</th>
                      <th className="px-3 py-2 text-left font-black text-muted uppercase tracking-widest">Category</th>
                      <th className="px-3 py-2 text-right font-black text-muted uppercase tracking-widest">Price</th>
                      <th className="px-3 py-2 text-right font-black text-muted uppercase tracking-widest">Stock</th>
                      <th className="px-3 py-2 text-left font-black text-muted uppercase tracking-widest">SKU</th>
                      <th className="px-3 py-2 text-left font-black text-muted uppercase tracking-widest">Status</th>
                      <th className="px-3 py-2 text-left font-black text-muted uppercase tracking-widest">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((row) => (
                      <tr key={row.rowIndex} className={row.errors.length > 0 ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 text-muted">{row.rowIndex}</td>
                        <td className="px-3 py-2 font-bold text-ink max-w-[160px] truncate">{row.name || '—'}</td>
                        <td className="px-3 py-2 text-muted">{row.category || '—'}</td>
                        <td className="px-3 py-2 text-right font-bold text-ink">{row.price ? `${row.price} ${store.currency}` : '—'}</td>
                        <td className="px-3 py-2 text-right text-muted">{row.stock || '10'}</td>
                        <td className="px-3 py-2 font-mono text-muted">{row.sku || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${(row.status || 'ACTIVE').toUpperCase() === 'DRAFT' ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                            {(row.status || 'ACTIVE').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {row.errors.length > 0 ? (
                            <span className="flex items-center gap-1 text-red-600 font-semibold">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              {row.errors.join('; ')}
                            </span>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Import button */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">
                  {errorCount > 0 && `${errorCount} row${errorCount === 1 ? '' : 's'} with errors will be skipped. `}
                  <strong className="text-ink">{validCount} product{validCount === 1 ? '' : 's'} will be imported.</strong>
                </p>
                <Button
                  variant="accent"
                  onClick={handleImport}
                  disabled={phase === 'importing' || validCount === 0}
                  className="gap-2"
                >
                  {phase === 'importing' ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</>
                  ) : (
                    <><Upload className="h-4 w-4" /> Import {validCount} product{validCount === 1 ? '' : 's'}</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Step 3: Result ───────────────────────────────────────────── */}
        {phase === 'done' && result && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-8 w-8 shrink-0 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h2 className="font-black text-green-900">Import complete!</h2>
                <p className="mt-1 text-sm text-green-800">
                  <strong>{result.imported}</strong> product{result.imported === 1 ? '' : 's'} imported successfully.
                  {result.skipped > 0 && ` ${result.skipped} skipped (plan limit or duplicate).`}
                </p>
                {result.errors.length > 0 && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="mb-1.5 text-xs font-black uppercase tracking-widest text-red-600">Errors</p>
                    <ul className="space-y-1 text-xs text-red-700">
                      {result.errors.map((e, i) => (
                        <li key={i}><strong>Row {e.row}:</strong> {e.message}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <Button variant="accent" onClick={() => navigate(`/admin/${storeId}/products`)}>
                    <Package className="me-1.5 h-4 w-4" /> View products
                  </Button>
                  <Button variant="ghost" className="border border-green-300" onClick={reset}>
                    Import more
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
