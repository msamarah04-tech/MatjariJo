import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardList, Download, ExternalLink, XCircle } from 'lucide-react';
import { useStore } from '@/lib/store';
import { money, timeAgo } from '@/lib/format';
import { Order, OrderStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';
import { PageHeader, SegmentedControl } from '@/components/ui/dashboard';
import { ResourceTable, Column } from '@/components/ui/ResourceTable';
import { useFocusParam } from '@/lib/useFocusParam';
import { useAdminContext, useStoreOrders } from './shared';
import { exportOrdersToExcel } from '@/lib/exportOrders';

type StatusFilter = 'ALL' | OrderStatus;

export default function Orders() {
  const { storeId, store } = useAdminContext();
  const approveOrder = useStore((s) => s.approveOrder);
  const rejectOrder = useStore((s) => s.rejectOrder);
  const fulfillOrder = useStore((s) => s.fulfillOrder);
  const scopedOrders = useStoreOrders(storeId);

  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Order | null>(null);
  const [focusId, clearFocus] = useFocusParam();

  const storeOrders = useMemo(() => [...scopedOrders].sort((a, b) => b.createdAt - a.createdAt), [scopedOrders]);

  useEffect(() => {
    if (!focusId) return;
    if (storeOrders.some((o) => o.id === focusId)) setActiveId(focusId);
    clearFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const counts = useMemo(() => ({
    ALL: storeOrders.length,
    PENDING: storeOrders.filter((o) => o.status === 'PENDING').length,
    APPROVED: storeOrders.filter((o) => o.status === 'APPROVED').length,
    REJECTED: storeOrders.filter((o) => o.status === 'REJECTED').length,
    FULFILLED: storeOrders.filter((o) => o.status === 'FULFILLED').length,
  }), [storeOrders]);

  const rows = useMemo(() => storeOrders.filter((o) => status === 'ALL' || o.status === status), [storeOrders, status]);
  const active = activeId ? storeOrders.find((o) => o.id === activeId) : undefined;

  const columns: Column<Order>[] = [
    {
      key: 'customerName',
      label: 'Customer',
      sortable: true,
      render: (o) => (
        <div className="min-w-0">
          <div className="truncate font-bold text-ink">{o.customerName}</div>
          <div className="truncate text-xs text-muted">{o.customerEmail}</div>
        </div>
      ),
    },
    { key: 'items', label: 'Items', hideOnMobile: true, render: (o) => <span className="text-muted">{o.items.reduce((n, i) => n + i.quantity, 0)} item{o.items.reduce((n, i) => n + i.quantity, 0) === 1 ? '' : 's'}</span> },
    { key: 'totalCents', label: 'Total', align: 'right', sortable: true, render: (o) => <span className="font-semibold">{money(o.totalCents, store.currency)}</span> },
    { key: 'createdAt', label: 'Placed', align: 'right', sortable: true, hideOnMobile: true, render: (o) => <span className="text-muted">{timeAgo(o.createdAt)}</span> },
    { key: 'status', label: 'Status', align: 'right', sortable: true, render: (o) => <StatusBadge status={o.status} /> },
  ];

  const doApprove = (o: Order) => { approveOrder(storeId, o.id); toast({ title: 'Order approved', type: 'success' }); };
  const doFulfill = (o: Order) => { fulfillOrder(storeId, o.id); toast({ title: 'Order fulfilled', type: 'success' }); };

  const handleExport = () => {
    if (rows.length === 0) {
      toast({ title: 'No orders to export', type: 'error' });
      return;
    }
    exportOrdersToExcel(rows, store.name, store.currency);
    toast({ title: `Exported ${rows.length} order${rows.length === 1 ? '' : 's'}`, type: 'success' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        subtitle="Review, approve, and fulfill customer orders."
        action={
          <Button variant="ghost" className="gap-2 border border-line" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export{rows.length > 0 ? ` (${rows.length})` : ''}
          </Button>
        }
      />

      <ResourceTable
        rows={rows}
        columns={columns}
        getId={(o) => o.id}
        searchKeys={['customerName', 'customerEmail']}
        searchPlaceholder="Search by customer"
        filters={
          <SegmentedControl<StatusFilter>
            value={status}
            onChange={setStatus}
            options={[
              { label: 'All', value: 'ALL', count: counts.ALL },
              { label: 'Pending', value: 'PENDING', count: counts.PENDING },
              { label: 'Approved', value: 'APPROVED', count: counts.APPROVED },
              { label: 'Fulfilled', value: 'FULFILLED', count: counts.FULFILLED },
              { label: 'Rejected', value: 'REJECTED', count: counts.REJECTED },
            ]}
          />
        }
        onRowClick={(o) => setActiveId(o.id)}
        emptyIcon={ClipboardList}
        emptyTitle="No orders yet"
        emptyText="When customers place orders on your storefront, they show up here."
      />

      <Drawer
        isOpen={Boolean(active)}
        onClose={() => setActiveId(null)}
        title={active ? active.customerName : 'Order'}
        description={active ? `${active.customerEmail} · ${timeAgo(active.createdAt)}` : undefined}
        footer={active ? (
          <OrderActions
            order={active}
            onApprove={() => doApprove(active)}
            onReject={() => setRejecting(active)}
            onFulfill={() => doFulfill(active)}
          />
        ) : undefined}
      >
        {active && <OrderDetail order={active} currency={store.currency} />}
      </Drawer>

      <ConfirmDialog
        isOpen={Boolean(rejecting)}
        title="Reject this order?"
        description="The customer's order will be marked rejected. You can't undo this."
        confirmLabel="Reject order"
        destructive
        onCancel={() => setRejecting(null)}
        onConfirm={() => { if (rejecting) { rejectOrder(storeId, rejecting.id); toast({ title: 'Order rejected' }); } setRejecting(null); }}
      />
    </div>
  );
}

function OrderActions({ order, onApprove, onReject, onFulfill }: { order: Order; onApprove: () => void; onReject: () => void; onFulfill: () => void }) {
  if (order.status === 'PENDING') {
    return (
      <div className="flex gap-2">
        <Button variant="accent" className="flex-1 gap-1.5" onClick={onApprove}><CheckCircle2 className="h-4 w-4" /> Approve</Button>
        <Button variant="ghost" className="flex-1 gap-1.5 border border-line text-red-600" onClick={onReject}><XCircle className="h-4 w-4" /> Reject</Button>
      </div>
    );
  }
  if (order.status === 'APPROVED') {
    return <Button variant="accent" className="w-full gap-1.5" onClick={onFulfill}><CheckCircle2 className="h-4 w-4" /> Mark fulfilled</Button>;
  }
  return <p className="text-center text-sm font-bold text-muted">This order is {order.status.toLowerCase()}.</p>;
}

function OrderDetail({ order, currency }: { order: Order; currency: string }) {
  const Row = ({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) => (
    <div className={`flex items-center justify-between ${strong ? 'border-t border-dashed border-line pt-3 text-base font-black text-ink' : 'text-sm'}`}>
      <span className={strong ? 'uppercase tracking-widest' : 'text-muted'}>{label}</span>
      <span className={accent ? 'font-bold text-green-700' : strong ? '' : 'font-semibold text-ink'}>{value}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={order.status} />
        {order.discountCode && <span className="rounded-full border border-line bg-paper px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-muted">Code {order.discountCode}</span>}
      </div>

      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Items</p>
        <div className="divide-y divide-line/60 rounded-xl border border-line bg-paper">
          {order.items.map((item, index) => (
            <div key={index} className="flex items-center justify-between gap-3 p-3 text-sm">
              <span className="min-w-0 truncate"><span className="text-muted">{item.quantity}×</span> <span className="font-semibold text-ink">{item.productName}</span></span>
              <span className="shrink-0 font-semibold text-ink">{money(item.priceCents * item.quantity, currency)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
        <Row label="Subtotal" value={money(order.subtotalCents, currency)} />
        {order.discountCents ? <Row label={`Discount${order.discountCode ? ` (${order.discountCode})` : ''}`} value={`-${money(order.discountCents, currency)}`} accent /> : null}
        <Row label="Shipping" value={order.shippingCents ? money(order.shippingCents, currency) : 'Free'} />
        <Row label="Total" value={money(order.totalCents, currency)} strong />
      </div>

      {order.note && (
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">Customer note</p>
          <p className="rounded-xl border border-line bg-paper p-3 text-sm text-ink/80">{order.note}</p>
        </div>
      )}

      <a href={`mailto:${order.customerEmail}`} className="flex items-center gap-2 text-sm font-bold text-accent hover:underline">
        <ExternalLink className="h-4 w-4" /> Email {order.customerName.split(' ')[0]}
      </a>
    </div>
  );
}
