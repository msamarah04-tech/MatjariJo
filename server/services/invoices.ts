import { prisma, withTransaction } from '../db.js';
import { getSettings } from '../audit.js';
import { badRequest, notFound } from '../errors.js';
import { formatMoney } from '../../shared/money.js';
import { formatJordanMobile } from '../../shared/phone.js';

/**
 * Internal GST tax invoices. Self-contained — no JoFotara/tax-authority transmission
 * (that lives behind the deferred InvoiceClearance adapter). Invoice numbers are
 * sequential PER STORE via the Store.nextInvoiceSeq counter, assigned once when an
 * order is approved.
 */

export const AMMAN_TZ = 'Asia/Amman';

/** Atomically assign the next sequential invoice number for an order (idempotent). */
export async function assignInvoiceNumber(orderId: string): Promise<string> {
  return withTransaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, select: { invoiceNumber: true, storeId: true } });
    if (!order) throw notFound('Order not found.');
    if (order.invoiceNumber) return order.invoiceNumber;
    const store = await tx.store.update({
      where: { id: order.storeId },
      data: { nextInvoiceSeq: { increment: 1 } },
      select: { nextInvoiceSeq: true, slug: true },
    });
    const seq = store.nextInvoiceSeq - 1; // value before this increment
    const prefix = store.slug.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 8) || 'INV';
    const number = `${prefix}-${String(seq).padStart(5, '0')}`;
    await tx.order.update({ where: { id: orderId }, data: { invoiceNumber: number } });
    return number;
  });
}

export type InvoiceModel = {
  number: string;
  issuedAt: string;
  currency: string;
  taxLabel: string;
  taxRateBps: number;
  pricesIncludeTax: boolean;
  seller: { name: string; address?: string; phone?: string; taxRegistrationNumber?: string };
  buyer: { name: string; email: string; phone?: string; address?: string };
  lines: { name: string; quantity: number; unitPriceMinor: number; lineTotalMinor: number }[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  shippingMinor: number;
  totalMinor: number;
};

export async function buildInvoiceModel(orderId: string): Promise<InvoiceModel> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, store: true } });
  if (!order) throw notFound('Order not found.');
  if (order.status === 'PENDING' || order.status === 'REJECTED') {
    throw badRequest('An invoice is only available once the order is approved.');
  }
  const settings = await getSettings();
  const number = order.invoiceNumber ?? (await assignInvoiceNumber(order.id));

  return {
    number,
    issuedAt: order.createdAt.toISOString(),
    currency: order.currency,
    taxLabel: settings.taxLabel,
    taxRateBps: order.taxRateBps,
    pricesIncludeTax: order.pricesIncludeTax,
    seller: {
      name: order.store.name,
      address: order.store.address ?? undefined,
      phone: order.store.contactPhone ?? undefined,
      taxRegistrationNumber: order.store.taxRegistrationNumber ?? undefined,
    },
    buyer: {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone ?? undefined,
      address: order.shippingAddress ?? undefined,
    },
    lines: order.items.map((item) => ({
      name: item.productNameSnapshot,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceCents,
      lineTotalMinor: item.lineTotalCents,
    })),
    subtotalMinor: order.subtotalCents,
    discountMinor: order.discountCents,
    taxMinor: order.taxCents,
    shippingMinor: order.shippingCents,
    totalMinor: order.totalCents,
  };
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/**
 * Printable tax invoice HTML. `lang` selects English (LTR, Western numerals) or
 * Arabic (RTL, Arabic-Indic numerals via the ar-JO locale). Dates render in Asia/Amman.
 */
export function renderInvoiceHtml(model: InvoiceModel, lang: 'en' | 'ar' = 'en'): string {
  const locale = lang === 'ar' ? 'ar-JO' : 'en-JO';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const t = lang === 'ar' ? AR : EN;
  const fmt = (minor: number) => formatMoney(minor, model.currency, locale);
  const issued = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: AMMAN_TZ }).format(new Date(model.issuedAt));
  const ratePct = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(model.taxRateBps / 100);

  const rows = model.lines.map((line) => `
    <tr>
      <td>${escapeHtml(line.name)}</td>
      <td class="num">${new Intl.NumberFormat(locale).format(line.quantity)}</td>
      <td class="num">${fmt(line.unitPriceMinor)}</td>
      <td class="num">${fmt(line.lineTotalMinor)}</td>
    </tr>`).join('');

  const sellerLine = [model.seller.address, model.seller.phone && formatJordanMobile(model.seller.phone), model.seller.taxRegistrationNumber && `${t.taxNo}: ${model.seller.taxRegistrationNumber}`]
    .filter(Boolean).map((x) => `<div>${escapeHtml(String(x))}</div>`).join('');
  const buyerLine = [model.buyer.email, model.buyer.phone && formatJordanMobile(model.buyer.phone), model.buyer.address]
    .filter(Boolean).map((x) => `<div>${escapeHtml(String(x))}</div>`).join('');

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${t.invoice} ${escapeHtml(model.number)}</title>
<style>
  :root { --ink:#1a1a1a; --muted:#6b6b6b; --line:#e0e0e0; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, 'Segoe UI', Tahoma, sans-serif; color: var(--ink); margin: 0; padding: 32px; }
  .doc { max-width: 800px; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--ink); padding-bottom: 16px; }
  h1 { font-size: 22px; margin: 0; }
  .muted { color: var(--muted); font-size: 13px; }
  .parties { display: flex; justify-content: space-between; gap: 24px; margin: 24px 0; font-size: 13px; }
  .parties h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid var(--line); text-align: ${dir === 'rtl' ? 'right' : 'left'}; }
  th { text-transform: uppercase; font-size: 11px; letter-spacing: .05em; color: var(--muted); }
  .num { text-align: ${dir === 'rtl' ? 'left' : 'right'}; white-space: nowrap; }
  .totals { margin-${dir === 'rtl' ? 'right' : 'left'}: auto; width: 280px; margin-top: 16px; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
  .totals .grand { border-top: 2px solid var(--ink); margin-top: 6px; padding-top: 10px; font-weight: 700; font-size: 16px; }
  .foot { margin-top: 28px; font-size: 12px; color: var(--muted); }
  @media print { body { padding: 0; } .noprint { display: none; } }
</style>
</head>
<body>
  <div class="doc">
    <div class="head">
      <div>
        <h1>${escapeHtml(model.seller.name)}</h1>
        <div class="muted">${sellerLine || ''}</div>
      </div>
      <div class="num">
        <h1>${t.invoice}</h1>
        <div class="muted">${t.number}: ${escapeHtml(model.number)}</div>
        <div class="muted">${t.date}: ${escapeHtml(issued)}</div>
      </div>
    </div>

    <div class="parties">
      <div>
        <h2>${t.billedTo}</h2>
        <div>${escapeHtml(model.buyer.name)}</div>
        ${buyerLine}
      </div>
      <div class="num">
        <h2>${t.payment}</h2>
        <div>${t.cod}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr><th>${t.item}</th><th class="num">${t.qty}</th><th class="num">${t.unitPrice}</th><th class="num">${t.amount}</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span>${t.subtotal}</span><span>${fmt(model.subtotalMinor)}</span></div>
      ${model.discountMinor > 0 ? `<div><span>${t.discount}</span><span>-${fmt(model.discountMinor)}</span></div>` : ''}
      <div><span>${escapeHtml(model.taxLabel)} (${ratePct}%)${model.pricesIncludeTax ? ` · ${t.inclusive}` : ''}</span><span>${fmt(model.taxMinor)}</span></div>
      ${model.shippingMinor > 0 ? `<div><span>${t.shipping}</span><span>${fmt(model.shippingMinor)}</span></div>` : ''}
      <div class="grand"><span>${t.total}</span><span>${fmt(model.totalMinor)}</span></div>
    </div>

    <div class="foot">${t.footer}</div>
  </div>
</body>
</html>`;
}

const EN = {
  invoice: 'Tax Invoice', number: 'Invoice No.', date: 'Date', billedTo: 'Billed to', payment: 'Payment',
  cod: 'Cash on Delivery', item: 'Item', qty: 'Qty', unitPrice: 'Unit price', amount: 'Amount',
  subtotal: 'Subtotal', discount: 'Discount', shipping: 'Shipping', total: 'Total', inclusive: 'inclusive',
  taxNo: 'Tax Reg. No.', footer: 'This is a system-generated internal tax invoice.',
};

const AR = {
  invoice: 'فاتورة ضريبية', number: 'رقم الفاتورة', date: 'التاريخ', billedTo: 'فاتورة إلى', payment: 'الدفع',
  cod: 'الدفع عند الاستلام', item: 'الصنف', qty: 'الكمية', unitPrice: 'سعر الوحدة', amount: 'المبلغ',
  subtotal: 'المجموع الفرعي', discount: 'الخصم', shipping: 'الشحن', total: 'الإجمالي', inclusive: 'شامل الضريبة',
  taxNo: 'الرقم الضريبي', footer: 'هذه فاتورة ضريبية داخلية تم إنشاؤها آليًا.',
};
