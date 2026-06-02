import { useOutletContext } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { money, timeAgo } from '@/lib/format';
import { Stat } from '@/components/ui/Stat';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PackageSearch, ClipboardList, Wallet, Clock, ExternalLink, Copy } from 'lucide-react';
import { toast } from '@/components/ui/Toast';

export default function Overview() {
  const storeId = useOutletContext<string>();
  const { stores, products, orders } = useStore();
  
  const store = stores.find(s => s.id === storeId);
  const storeProducts = products.filter(p => p.storeId === storeId);
  const storeOrders = orders.filter(o => o.storeId === storeId).sort((a, b) => b.createdAt - a.createdAt);

  if (!store) return null;

  const pendingCount = storeOrders.filter(o => o.status === 'PENDING').length;
  const revenueCents = storeOrders
    .filter(o => o.status === 'APPROVED' || o.status === 'FULFILLED')
    .reduce((acc, sum) => acc + sum.totalCents, 0);

  const recentOrders = storeOrders.slice(0, 5);

  const copyLink = () => {
    const link = `${window.location.origin}/s/${store.slug}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({ title: 'Link copied to clipboard' });
    });
  };

  return (
    <div className="animate-fade-in flex flex-col h-full space-y-12">
      <div>
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-line pb-6 mb-8 gap-4">
          <div>
            <h2 className="font-heading font-black text-5xl text-ink tracking-tight mb-2">Overview</h2>
            <p className="text-muted text-lg">Welcome back. Here is how {store.name} is doing.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0 bg-paper border border-line px-3 py-2 rounded-xl shadow-xs">
            <span className="text-xs text-muted font-mono">{store.slug}</span>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={copyLink}>
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Link
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Products" value={storeProducts.length} icon={PackageSearch} />
          <Stat label="Orders" value={storeOrders.length} icon={ClipboardList} />
          <Stat label="Pending" value={pendingCount} icon={Clock} className={pendingCount > 0 ? "border-amber-200 bg-amber-50/30" : ""} />
          <Stat label="Revenue" value={money(revenueCents, store.currency)} icon={Wallet} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Recent Activity</span>
             <div className="h-px bg-line w-32" />
          </div>
        </div>

        {recentOrders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Ready to sell"
            description="Share your storefront link to start receiving orders."
            action={
              <Button onClick={() => window.open(`/s/${store.slug}`, '_blank')} className="mt-2">
                <ExternalLink className="w-4 h-4 mr-2" /> View your storefront
              </Button>
            }
          />
        ) : (
          <div className="bg-surface border border-line rounded-2xl overflow-hidden divide-y divide-line">
            {recentOrders.map(o => (
              <div key={o.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-paper/50 transition-colors">
                <div className="flex flex-col">
                  <span className="font-bold text-ink">{o.customerName}</span>
                  <span className="text-xs text-muted leading-tight">{timeAgo(o.createdAt)}</span>
                </div>
                <div className="text-sm text-ink truncate max-w-[200px] hidden lg:block opacity-60">
                   {o.items.map(i => i.productName).join(', ')}
                </div>
                <div className="flex items-center justify-between md:justify-end gap-6 min-w-[200px]">
                  <span className="font-bold text-ink whitespace-nowrap">{money(o.totalCents)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
