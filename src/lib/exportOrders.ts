import * as XLSX from 'xlsx';
import { Order } from '@/lib/types';

function centsToAmount(cents: number, currency: string): number {
  const decimals = currency === 'JOD' ? 3 : 2;
  return parseFloat((cents / (decimals === 3 ? 1000 : 100)).toFixed(decimals));
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function itemsSummary(order: Order): string {
  return order.items
    .map((i) => `${i.quantity}× ${i.productName}${i.variantTitle ? ` (${i.variantTitle})` : ''}`)
    .join(', ');
}

export function exportOrdersToExcel(orders: Order[], storeName: string, currency: string) {
  const divisor = currency === 'JOD' ? 1000 : 100;
  const curr = currency || 'JOD';

  const headers = [
    'Invoice #',
    'Date',
    'Time',
    'Customer Name',
    'Customer Email',
    'Phone',
    'Shipping Address',
    'Items',
    'Item Count',
    `Subtotal (${curr})`,
    `Discount (${curr})`,
    `Discount Code`,
    `Tax (${curr})`,
    `Shipping (${curr})`,
    `Total (${curr})`,
    'Payment Method',
    'Status',
    'Note',
  ];

  const rows = orders.map((o) => [
    o.invoiceNumber ?? o.id.slice(0, 8).toUpperCase(),
    formatDate(o.createdAt),
    formatTime(o.createdAt),
    o.customerName,
    o.customerEmail,
    (o as any).customerPhone ?? '',
    (o as any).shippingAddress ?? '',
    itemsSummary(o),
    o.items.reduce((n, i) => n + i.quantity, 0),
    parseFloat((o.subtotalCents / divisor).toFixed(curr === 'JOD' ? 3 : 2)),
    parseFloat(((o.discountCents ?? 0) / divisor).toFixed(curr === 'JOD' ? 3 : 2)),
    o.discountCode ?? '',
    parseFloat(((o.taxCents ?? 0) / divisor).toFixed(curr === 'JOD' ? 3 : 2)),
    parseFloat(((o.shippingCents ?? 0) / divisor).toFixed(curr === 'JOD' ? 3 : 2)),
    parseFloat((o.totalCents / divisor).toFixed(curr === 'JOD' ? 3 : 2)),
    o.paymentMethod === 'COD' ? 'Cash on Delivery' : (o.paymentMethod ?? 'COD'),
    o.status,
    o.note ?? '',
  ]);

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 16 }, // Invoice #
    { wch: 14 }, // Date
    { wch: 8  }, // Time
    { wch: 22 }, // Customer Name
    { wch: 28 }, // Email
    { wch: 16 }, // Phone
    { wch: 30 }, // Address
    { wch: 45 }, // Items
    { wch: 10 }, // Item Count
    { wch: 14 }, // Subtotal
    { wch: 14 }, // Discount
    { wch: 14 }, // Discount Code
    { wch: 12 }, // Tax
    { wch: 12 }, // Shipping
    { wch: 14 }, // Total
    { wch: 18 }, // Payment
    { wch: 12 }, // Status
    { wch: 30 }, // Note
  ];

  // Bold header row
  const headerRange = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { patternType: 'solid', fgColor: { rgb: '1A1A2E' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
        },
      };
    }
  }

  // Freeze top row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');

  // Summary sheet
  const totalRevenue = orders.reduce((n, o) => n + o.totalCents, 0);
  const totalOrders = orders.length;
  const pending = orders.filter((o) => o.status === 'PENDING').length;
  const approved = orders.filter((o) => o.status === 'APPROVED').length;
  const fulfilled = orders.filter((o) => o.status === 'FULFILLED').length;
  const rejected = orders.filter((o) => o.status === 'REJECTED').length;

  const summaryData = [
    ['Export Summary', ''],
    ['Store', storeName],
    ['Exported On', new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })],
    ['', ''],
    ['Total Orders', totalOrders],
    ['Pending', pending],
    ['Approved', approved],
    ['Fulfilled', fulfilled],
    ['Rejected', rejected],
    ['', ''],
    [`Total Revenue (${curr})`, parseFloat((totalRevenue / divisor).toFixed(curr === 'JOD' ? 3 : 2))],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2['!cols'] = [{ wch: 22 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

  const date = new Date().toISOString().slice(0, 10);
  const filename = `${storeName.replace(/\s+/g, '_')}_orders_${date}.xlsx`;
  XLSX.writeFile(wb, filename);
}
