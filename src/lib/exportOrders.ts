import ExcelJS from 'exceljs';
import { Order } from '@/lib/types';

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  headerBg:    '1B2A4A',   // deep navy
  headerFg:    'FFFFFF',
  subheaderBg: '2E4A7A',   // mid-blue for summary labels
  subheaderFg: 'FFFFFF',
  accentBg:    '14B8A6',   // teal accent (matches app brand)
  accentFg:    'FFFFFF',
  totalBg:     'EEF6FF',   // light blue for total row
  totalFg:     '1B2A4A',
  rejectedBg:  'FEE2E2',   // soft red background
  rejectedFg:  'B91C1C',   // dark red text
  pendingBg:   'FEF9C3',   // soft yellow
  pendingFg:   '92400E',
  fulfilledBg: 'DCFCE7',   // soft green
  fulfilledFg: '166534',
  approvedBg:  'DBEAFE',   // soft blue
  approvedFg:  '1E40AF',
  altRowBg:    'F8FAFC',   // subtle stripe
  border:      'CBD5E1',
} as const;

type RGB = string;

function fill(argb: RGB): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function border(color = C.border): Partial<ExcelJS.Borders> {
  const side: ExcelJS.BorderStyle = 'thin';
  return {
    top:    { style: side, color: { argb: color } },
    left:   { style: side, color: { argb: color } },
    bottom: { style: side, color: { argb: color } },
    right:  { style: side, color: { argb: color } },
  };
}

function applyHeader(cell: ExcelJS.Cell, bg = C.headerBg, fg = C.headerFg) {
  cell.fill = fill(bg);
  cell.font = { bold: true, color: { argb: fg }, size: 11, name: 'Calibri' };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = border(bg);
}

function applyData(cell: ExcelJS.Cell, odd: boolean) {
  cell.fill = fill(odd ? 'FFFFFF' : C.altRowBg);
  cell.font = { size: 10, name: 'Calibri' };
  cell.alignment = { vertical: 'middle', wrapText: false };
  cell.border = border();
}

function applyRejected(cell: ExcelJS.Cell) {
  cell.fill = fill(C.rejectedBg);
  cell.font = { size: 10, name: 'Calibri', color: { argb: C.rejectedFg }, italic: true };
  cell.alignment = { vertical: 'middle' };
  cell.border = border('FCA5A5');
}

function applyTotal(cell: ExcelJS.Cell) {
  cell.fill = fill(C.totalBg);
  cell.font = { bold: true, size: 11, name: 'Calibri', color: { argb: C.totalFg } };
  cell.alignment = { vertical: 'middle', horizontal: 'right' };
  cell.border = border('93C5FD');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function divisor(currency: string) { return currency === 'JOD' ? 1000 : 100; }
function decimals(currency: string) { return currency === 'JOD' ? 3 : 2; }
function toCurrency(cents: number, currency: string) {
  return parseFloat((cents / divisor(currency)).toFixed(decimals(currency)));
}
function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function itemsSummary(order: Order) {
  return order.items
    .map((i) => `${i.quantity}× ${i.productName}${i.variantTitle ? ` (${i.variantTitle})` : ''}`)
    .join(' | ');
}
function statusLabel(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
function paymentLabel(p?: string) {
  return p === 'COD' || !p ? 'Cash on Delivery' : p;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function exportOrdersToExcel(orders: Order[], storeName: string, currency: string) {
  const curr = currency || 'JOD';
  const div = divisor(curr);
  const dec = decimals(curr);
  const numFmt = `#,##0.${'0'.repeat(dec)} "${curr}"`;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Matjari';
  wb.created = new Date();

  // ── ORDERS SHEET ──────────────────────────────────────────────────────────
  const ws = wb.addWorksheet('Orders', {
    views: [{ state: 'frozen', ySplit: 2 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  const COLS = [
    { header: 'Invoice #',          key: 'invoice',   width: 16 },
    { header: 'Date',               key: 'date',      width: 14 },
    { header: 'Time',               key: 'time',      width: 9  },
    { header: 'Customer',           key: 'customer',  width: 22 },
    { header: 'Email',              key: 'email',     width: 26 },
    { header: 'Phone',              key: 'phone',     width: 15 },
    { header: 'Shipping Address',   key: 'address',   width: 28 },
    { header: 'Items',              key: 'items',     width: 40 },
    { header: 'Qty',                key: 'qty',       width: 6  },
    { header: `Subtotal`,           key: 'subtotal',  width: 14 },
    { header: `Discount`,           key: 'discount',  width: 14 },
    { header: 'Code',               key: 'code',      width: 12 },
    { header: `Shipping`,           key: 'shipping',  width: 12 },
    { header: `Total (${curr})`,    key: 'total',     width: 16 },
    { header: 'Payment',            key: 'payment',   width: 18 },
    { header: 'Status',             key: 'status',    width: 13 },
    { header: 'Note',               key: 'note',      width: 28 },
  ] as const;

  ws.columns = COLS.map((c) => ({ key: c.key, width: c.width }));

  // Title row
  ws.mergeCells(1, 1, 1, COLS.length);
  const titleCell = ws.getCell('A1');
  titleCell.value = `${storeName} — Orders Export · ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`;
  titleCell.fill = fill(C.headerBg);
  titleCell.font = { bold: true, size: 14, name: 'Calibri', color: { argb: C.headerFg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // Header row
  const headerRow = ws.addRow(COLS.map((c) => c.header));
  headerRow.height = 22;
  headerRow.eachCell((cell) => applyHeader(cell));

  // Data rows
  const currencyColIdxs = [10, 11, 13, 14]; // subtotal, discount, shipping, total (1-based)
  const rejected = (o: Order) => o.status === 'REJECTED';

  orders.forEach((order, idx) => {
    const isRejected = rejected(order);
    const isOdd = idx % 2 === 0;

    const row = ws.addRow([
      order.invoiceNumber ?? order.id.slice(0, 8).toUpperCase(),
      fmtDate(order.createdAt),
      fmtTime(order.createdAt),
      order.customerName,
      order.customerEmail,
      (order as any).customerPhone ?? '',
      (order as any).shippingAddress ?? '',
      itemsSummary(order),
      order.items.reduce((n, i) => n + i.quantity, 0),
      toCurrency(order.subtotalCents, curr),
      toCurrency(order.discountCents ?? 0, curr),
      order.discountCode ?? '',
      toCurrency(order.shippingCents ?? 0, curr),
      toCurrency(order.totalCents, curr),
      paymentLabel(order.paymentMethod),
      statusLabel(order.status),
      order.note ?? '',
    ]);

    row.height = 18;

    row.eachCell((cell) => {
      if (isRejected) {
        applyRejected(cell);
      } else {
        applyData(cell, isOdd);
      }
    });

    // Status badge colors
    if (!isRejected) {
      const statusCell = row.getCell(16);
      const colors: Record<string, [string, string]> = {
        FULFILLED: [C.fulfilledBg, C.fulfilledFg],
        APPROVED:  [C.approvedBg,  C.approvedFg],
        PENDING:   [C.pendingBg,   C.pendingFg],
      };
      const [bg, fg] = colors[order.status] ?? ['FFFFFF', '000000'];
      statusCell.fill = fill(bg);
      statusCell.font = { ...statusCell.font, bold: true, color: { argb: fg } };
      statusCell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Currency format for money columns
    currencyColIdxs.forEach((colIdx) => {
      row.getCell(colIdx).numFmt = numFmt;
    });

    // Qty center-align
    row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(16).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // ── TOTAL ROW ─────────────────────────────────────────────────────────────
  const countableOrders = orders.filter((o) => !rejected(o));
  const totalRow = ws.addRow([
    '', '', '', '', '', '', '', '',
    countableOrders.reduce((n, o) => n + o.items.reduce((m, i) => m + i.quantity, 0), 0),
    toCurrency(countableOrders.reduce((n, o) => n + o.subtotalCents, 0), curr),
    toCurrency(countableOrders.reduce((n, o) => n + (o.discountCents ?? 0), 0), curr),
    '',
    toCurrency(countableOrders.reduce((n, o) => n + (o.shippingCents ?? 0), 0), curr),
    toCurrency(countableOrders.reduce((n, o) => n + o.totalCents, 0), curr),
    '', `TOTAL (${countableOrders.length} orders)`, '',
  ]);
  totalRow.height = 22;
  totalRow.eachCell((cell) => applyTotal(cell));
  currencyColIdxs.forEach((colIdx) => {
    totalRow.getCell(colIdx).numFmt = numFmt;
  });
  // Bold label
  const labelCell = totalRow.getCell(16);
  labelCell.font = { bold: true, size: 11, name: 'Calibri', color: { argb: C.totalFg } };
  labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
  // Rejected note
  if (orders.length !== countableOrders.length) {
    const rejected_count = orders.length - countableOrders.length;
    const noteCell = totalRow.getCell(17);
    noteCell.value = `(${rejected_count} rejected order${rejected_count > 1 ? 's' : ''} excluded)`;
    noteCell.font = { italic: true, size: 9, color: { argb: C.rejectedFg }, name: 'Calibri' };
  }

  // ── SUMMARY SHEET ─────────────────────────────────────────────────────────
  const ws2 = wb.addWorksheet('Summary', {
    views: [{ state: 'normal' }],
  });
  ws2.columns = [{ width: 26 }, { width: 20 }];

  function addSummaryTitle(text: string) {
    ws2.mergeCells(ws2.rowCount + 1, 1, ws2.rowCount + 1, 2);
    const row = ws2.lastRow!;
    const cell = row.getCell(1);
    cell.value = text;
    applyHeader(cell, C.headerBg);
    row.height = 24;
  }

  function addSummaryRow(label: string, value: string | number, highlight?: [string, string]) {
    const row = ws2.addRow([label, value]);
    row.height = 18;
    row.getCell(1).font = { bold: true, size: 10, name: 'Calibri' };
    row.getCell(1).fill = fill('F1F5F9');
    row.getCell(1).border = border();
    row.getCell(2).font = { size: 10, name: 'Calibri' };
    row.getCell(2).fill = fill('FFFFFF');
    row.getCell(2).border = border();
    row.getCell(2).alignment = { horizontal: 'right' };
    if (highlight) {
      row.getCell(2).fill = fill(highlight[0]);
      row.getCell(2).font = { bold: true, size: 10, color: { argb: highlight[1] }, name: 'Calibri' };
    }
  }

  addSummaryTitle(`${storeName} — Export Summary`);
  ws2.addRow([]);
  addSummaryRow('Exported On', new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }));
  addSummaryRow('Currency', curr);
  ws2.addRow([]);

  addSummaryTitle('Order Counts');
  addSummaryRow('Total Orders',    orders.length);
  addSummaryRow('Fulfilled',       orders.filter((o) => o.status === 'FULFILLED').length, [C.fulfilledBg, C.fulfilledFg]);
  addSummaryRow('Approved',        orders.filter((o) => o.status === 'APPROVED').length,  [C.approvedBg,  C.approvedFg]);
  addSummaryRow('Pending',         orders.filter((o) => o.status === 'PENDING').length,   [C.pendingBg,   C.pendingFg]);
  addSummaryRow('Rejected',        orders.filter((o) => o.status === 'REJECTED').length,  [C.rejectedBg,  C.rejectedFg]);
  ws2.addRow([]);

  addSummaryTitle('Revenue (excl. Rejected)');
  const rev = (fn: (o: Order) => number) =>
    `${toCurrency(countableOrders.reduce((n, o) => n + fn(o), 0), curr).toFixed(dec)} ${curr}`;
  addSummaryRow('Gross Revenue',   rev((o) => o.subtotalCents));
  addSummaryRow('Total Discounts', rev((o) => o.discountCents ?? 0));
  addSummaryRow('Total Shipping',  rev((o) => o.shippingCents ?? 0));

  const netRow = ws2.addRow(['Net Revenue', `${toCurrency(countableOrders.reduce((n, o) => n + o.totalCents, 0), curr).toFixed(dec)} ${curr}`]);
  netRow.height = 20;
  netRow.getCell(1).fill = fill(C.totalBg);
  netRow.getCell(1).font = { bold: true, size: 11, name: 'Calibri', color: { argb: C.totalFg } };
  netRow.getCell(1).border = border('93C5FD');
  netRow.getCell(2).fill = fill(C.totalBg);
  netRow.getCell(2).font = { bold: true, size: 11, name: 'Calibri', color: { argb: C.totalFg } };
  netRow.getCell(2).border = border('93C5FD');
  netRow.getCell(2).alignment = { horizontal: 'right' };

  // ── WRITE FILE ────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${storeName.replace(/\s+/g, '_')}_orders_${date}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
