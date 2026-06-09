import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BadgePercent,
  BarChart3,
  ChevronsUpDown,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  Paintbrush,
  Plus,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/cn';
import { Store } from '@/lib/types';
import { StoreAvatar } from '@/components/ui/dashboard';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { AdminContextValue, StoreBadges, useStoreBadges } from './shared';
import { CommandPalette } from './CommandPalette';

import Overview from './Overview';
import Products from './Products';
import Orders from './Orders';
import Discounts from './Discounts';
import Appearance from './Appearance';

// Analytics pulls in Recharts — load it on demand, like the platform dashboard.
const Analytics = lazy(() => import('./Analytics'));

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  badge?: keyof StoreBadges;
}

const NAV: NavItem[] = [
  { label: 'Overview', to: '', icon: LayoutDashboard, end: true },
  { label: 'Products', to: 'products', icon: PackageSearch, badge: 'lowStock' },
  { label: 'Orders', to: 'orders', icon: ClipboardList, badge: 'orders' },
  { label: 'Discounts', to: 'discounts', icon: BadgePercent },
  { label: 'Analytics', to: 'analytics', icon: BarChart3 },
  { label: 'Appearance', to: 'appearance', icon: Paintbrush },
];

export default function Admin() {
  return (
    <Routes>
      <Route index element={<StoreResolver />} />
      <Route path=":storeId" element={<AdminShell />}>
        <Route index element={<Overview />} />
        <Route path="products" element={<Products />} />
        <Route path="orders" element={<Orders />} />
        <Route path="discounts" element={<Discounts />} />
        <Route
          path="analytics"
          element={<Suspense fallback={<div className="space-y-6"><SkeletonCards /></div>}><Analytics /></Suspense>}
        />
        <Route path="appearance" element={<Appearance />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
      <Route path="*" element={<StoreResolver />} />
    </Routes>
  );
}

/** Pick the user's first store and redirect, or show the no-stores state. */
function StoreResolver() {
  const stores = useStore((s) => s.stores);
  const currentUser = useStore((s) => s.currentUser);
  const userStores = currentUser?.role === 'PLATFORM_OWNER' ? stores : stores.filter((s) => s.ownerId === currentUser?.id).slice(0, 1);
  if (userStores.length > 0) return <Navigate to={`/admin/${userStores[0].id}`} replace />;
  return <NoStores />;
}

function AdminShell() {
  const { storeId = '' } = useParams();
  const stores = useStore((s) => s.stores);
  const currentUser = useStore((s) => s.currentUser);
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isPlatformViewer = currentUser?.role === 'PLATFORM_OWNER';
  const userStores = useMemo(
    () => {
      const ownedStores = stores.filter((s) => s.ownerId === currentUser?.id);
      return isPlatformViewer ? stores : ownedStores.slice(0, 1);
    },
    [stores, isPlatformViewer, currentUser?.id]
  );
  const store = stores.find((s) => s.id === storeId);
  const canAccess = store && (isPlatformViewer || userStores.some((s) => s.id === storeId));

  // Close the mobile drawer on navigation.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  if (!store || !canAccess) {
    if (userStores.length === 0) return <NoStores />;
    return <NoAccess />;
  }

  const context: AdminContextValue = { storeId, store, userStores, isPlatformViewer };

  return (
    <div className="flex min-h-screen bg-paper">
      <CommandPalette storeId={storeId} />

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <SidebarContent store={store} userStores={userStores} isPlatformViewer={isPlatformViewer} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="fixed inset-0 bg-ink/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="relative z-10 flex h-full w-72 flex-col border-r border-line bg-surface"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 38 }}
            >
              <SidebarContent store={store} userStores={userStores} isPlatformViewer={isPlatformViewer} onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar store={store} onMenu={() => setMobileOpen(true)} />
        <MaintenanceBanner />
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">
            <Outlet context={context} />
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ store, userStores, isPlatformViewer, onClose }: { store: Store; userStores: Store[]; isPlatformViewer: boolean; onClose?: () => void }) {
  const badges = useStoreBadges(store.id);
  return (
    <>
      <div className="flex h-20 items-center justify-between gap-2 border-b border-line px-4">
        <StoreSwitcher store={store} userStores={userStores} />
        {onClose && (
          <button onClick={onClose} aria-label="Close menu" className="rounded-md p-1 text-muted hover:bg-paper hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((item) => {
          const count = item.badge ? badges[item.badge] : 0;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to ? `/admin/${store.id}/${item.to}` : `/admin/${store.id}`}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors',
                  isActive ? 'bg-ink text-surface' : 'text-muted hover:bg-paper hover:text-ink'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
                    <span className={cn('flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black', isActive ? 'bg-surface/20 text-surface' : 'bg-accent text-white')}>
                      {count}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-line p-3">
        <a
          href={`/#/s/${store.slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-muted transition-colors hover:bg-paper hover:text-ink"
        >
          <ExternalLink className="h-4 w-4 shrink-0" /> View storefront
        </a>
        {isPlatformViewer ? (
          <Link to="/platform/stores" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-muted transition-colors hover:bg-paper hover:text-ink">
            <ArrowLeft className="h-4 w-4 shrink-0" /> Back to platform
          </Link>
        ) : (
          <Link to="/request-website" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-accent transition-colors hover:bg-accent-soft">
            <Plus className="h-4 w-4 shrink-0" /> Request website
          </Link>
        )}
      </div>
    </>
  );
}

function StoreSwitcher({ store, userStores }: { store: Store; userStores: Store[] }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const canSwitch = userStores.length > 1;

  return (
    <div className="relative min-w-0 flex-1">
      <button
        onClick={() => canSwitch && setOpen((v) => !v)}
        className={cn('flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-2.5 py-2 text-left transition-colors', canSwitch && 'hover:border-ink/30')}
      >
        <StoreAvatar emoji={store.logoEmoji} url={store.logoUrl} name={store.name} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-ink">{store.name}</span>
          <span className="block truncate text-[10px] font-bold uppercase tracking-widest text-muted">/{store.slug}</span>
        </span>
        {canSwitch && <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.14 }}
              className="absolute left-0 top-full z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-xl"
            >
              {userStores.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setOpen(false); navigate(`/admin/${s.id}`); }}
                  className={cn('flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-paper', s.id === store.id && 'bg-paper')}
                >
                  <StoreAvatar emoji={s.logoEmoji} url={s.logoUrl} name={s.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{s.name}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AdminTopBar({ store, onMenu }: { store: Store; onMenu: () => void }) {
  const currentUser = useStore((s) => s.currentUser);
  const signOut = useStore((s) => s.signOut);
  const navigate = useNavigate();
  const initials = currentUser?.name?.split(' ').map((part) => part[0]).join('').substring(0, 2) || 'U';

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-line bg-surface/90 px-5 backdrop-blur md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onMenu} aria-label="Open menu" className="rounded-md p-2 text-ink hover:bg-paper lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted">Store dashboard</p>
          <p className="truncate text-sm font-bold text-ink">{store.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs font-bold text-muted transition-colors hover:bg-paper sm:flex"
          aria-label="Open command palette"
        >
          <Search className="h-3.5 w-3.5" />
          Search
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] font-black">⌘K</kbd>
        </button>
        <a
          href={`/#/s/${store.slug}`}
          target="_blank"
          rel="noreferrer"
          className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs font-bold text-muted transition-colors hover:bg-paper sm:flex"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Storefront
        </a>
        <button
          onClick={() => { signOut(); navigate('/sign-in'); }}
          title={`Sign out ${currentUser?.name || ''}`}
          className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 transition-colors hover:bg-paper"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-black text-surface">{initials}</span>
          <LogOut className="hidden h-3.5 w-3.5 text-muted sm:block" />
        </button>
      </div>
    </header>
  );
}

function MaintenanceBanner() {
  const maintenanceMode = useStore((s) => s.platformSettings.maintenanceMode);
  if (!maintenanceMode) return null;
  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-800 md:px-8">
      <TriangleAlert className="h-4 w-4 shrink-0" />
      Maintenance mode is on — your storefront shows a maintenance notice to customers.
    </div>
  );
}

function NoStores() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="max-w-md">
        <EmptyState
          icon={PackageSearch}
          title="No stores yet"
          description="You don't have any stores. Send a website request and the team will set one up for you."
          action={<Button variant="solid" onClick={() => navigate('/request-website')}><Plus className="mr-2 h-4 w-4" /> Request your first website</Button>}
        />
      </div>
    </div>
  );
}

function NoAccess() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="max-w-md">
        <EmptyState
          icon={TriangleAlert}
          title="Store not available"
          description="This store doesn't exist or you don't have access to it."
          action={<Button variant="solid" onClick={() => navigate('/admin')}>Go to my stores</Button>}
        />
      </div>
    </div>
  );
}
