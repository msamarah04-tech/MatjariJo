import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { OrderStatus } from '@/lib/types';
import { money, timeAgo } from '@/lib/format';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClipboardList, CheckCircle2 } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export default function Orders() {
  const storeId = useOutletContext<string>();
  const { orders, fulfillOrder, currentUser } = useStore();
  
  const storeOrders = orders.filter(o => o.storeId === storeId).sort((a, b) => b.createdAt - a.createdAt);
  
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL');

  const filteredOrders = filter === 'ALL' ? storeOrders : storeOrders.filter(o => o.status === filter);

  const handleFulfill = (id: string) => {
    fulfillOrder(id);
    toast({ title: 'Order marked as fulfilled', type: 'success' });
  };

  const filters: (OrderStatus | 'ALL')[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'];

  return (
    <div className="animate-fade-in flex flex-col h-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-line pb-6 mb-8 gap-4">
        <div>
          <h2 className="font-heading font-black text-4xl text-ink tracking-tight mb-2">Orders</h2>
          <p className="text-muted text-lg">Track and fulfill customer purchases.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none">
        {filters.map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
              filter === f 
                ? 'bg-ink text-surface' 
                : 'bg-surface border border-line text-muted hover:text-ink hover:border-ink/30'
            }`}
          >
            {f} {f === 'ALL' && `(${storeOrders.length})`}
          </button>
        ))}
      </div>

      {storeOrders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No orders yet"
          description="When customers place orders on your storefront, they will show up here."
        />
      ) : filteredOrders.length === 0 ? (
         <div className="text-center py-12 text-muted">
           No orders found matching the "{filter}" filter.
         </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(o => (
            <div key={o.id} className="bg-surface border border-line p-5 rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-5 transition-all hover:shadow-sm">
              <div className="flex flex-col gap-1.5 flex-1 w-full">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-bold text-ink">{o.customerName}</span>
                  <span className="text-sm text-muted">{o.customerEmail}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-auto md:ml-0">• {timeAgo(o.createdAt)}</span>
                </div>
                
                <div className="text-sm text-muted bg-paper p-3 rounded-lg border border-line/50 mt-1">
                  <ul className="space-y-1">
                    {o.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between font-medium">
                        <span><span className="text-ink/60">{item.quantity}×</span> {item.productName}</span>
                        <span>{money(item.priceCents * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-line border-dashed font-bold text-ink">
                    <span className="text-xs uppercase tracking-widest">Subtotal</span>
                    <span className="text-base">{money(o.subtotalCents)}</span>
                  </div>
                  {(o.discountCents || o.shippingCents || o.discountCode) && (
                    <div className="mt-2 space-y-1 text-xs font-bold">
                      {(o.discountCents || o.discountCode) && (
                        <div className="flex justify-between">
                          <span>Discount{o.discountCode ? ` (${o.discountCode})` : ''}</span>
                          <span>{o.discountCents ? `-${money(o.discountCents)}` : 'Free shipping'}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Shipping</span>
                        <span>{o.shippingCents ? money(o.shippingCents) : 'Free'}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-line border-dashed font-bold text-ink">
                    <span className="text-xs uppercase tracking-widest">Total</span>
                    <span className="text-base">{money(o.totalCents)}</span>
                  </div>
                  {o.note && (
                    <div className="mt-3 pt-3 border-t border-line/60">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1">Customer note</p>
                      <p className="text-sm text-ink/80">{o.note}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 shrink-0 pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-line pt-4 md:pt-0 w-full md:w-auto">
                <StatusBadge status={o.status} />
                
                {o.status === 'PENDING' && (
                  <p className="text-[10px] text-muted text-right max-w-[140px] uppercase font-bold tracking-wider leading-tight">Awaiting Platform Approval</p>
                )}
                
                {o.status === 'APPROVED' && (
                  <Button size="sm" variant="accent" className="font-bold gap-2 text-xs" onClick={() => handleFulfill(o.id)}>
                    <CheckCircle2 className="w-4 h-4" /> Mark Fulfilled
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
