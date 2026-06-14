import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTicketEvents } from '@/lib/useTicketEvents';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BadgePercent,
  CheckCircle2,
  ChevronsUpDown,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PackageSearch,
  Paintbrush,
  Plus,
  Search,
  Settings as SettingsIcon,
  TriangleAlert,
  Upload,
  X,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { storefrontUrl } from '@/lib/tenant';
import { cn } from '@/lib/cn';
import { ShopRequest, Store } from '@/lib/types';
import { prepareImageDataUrl } from '@/lib/images';
import * as adminApi from '@/api/admin.api';
import { StoreAvatar } from '@/components/ui/dashboard';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { AdminContextValue, StoreBadges, useStoreBadges } from './shared';
import { CommandPalette } from './CommandPalette';
import { useI18n } from '@/lib/i18n';
import { LangToggle } from '@/components/ui/LangToggle';
import { toast } from '@/components/ui/Toast';

import Overview from './Overview';
import Products from './Products';
import ProductEditor from './ProductEditor';
import ProductImport from './ProductImport';
import ProductQuickFill from './ProductQuickFill';
import Orders from './Orders';
import Discounts from './Discounts';
import Messages from './Messages';
import Appearance from './Appearance';
import Settings from './Settings';

interface NavItem {
  labelKey: string;
  to: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  badge?: keyof StoreBadges;
}

const NAV: NavItem[] = [
  { labelKey: 'navOverview', to: '', icon: LayoutDashboard, end: true },
  { labelKey: 'navProducts', to: 'products', icon: PackageSearch, badge: 'lowStock' },
  { labelKey: 'navOrders', to: 'orders', icon: ClipboardList, badge: 'orders' },
  { labelKey: 'navDiscounts', to: 'discounts', icon: BadgePercent },
  { labelKey: 'navMessages', to: 'messages', icon: MessageSquare, badge: 'messages' },
  { labelKey: 'navAppearance', to: 'appearance', icon: Paintbrush },
  { labelKey: 'navSettings', to: 'settings', icon: SettingsIcon },
];

export default function Admin() {
  return (
    <Routes>
      <Route index element={<StoreResolver />} />
      <Route path=":storeId" element={<AdminShell />}>
        <Route index element={<Overview />} />
        <Route path="products">
          <Route index element={<Products />} />
          <Route path="new" element={<ProductEditor />} />
          <Route path="import" element={<ProductImport />} />
          <Route path="quick-fill" element={<ProductQuickFill />} />
          <Route path=":productId/edit" element={<ProductEditor />} />
        </Route>
        <Route path="orders" element={<Orders />} />
        <Route path="discounts" element={<Discounts />} />
        <Route path="messages" element={<Messages />} />
        <Route path="appearance" element={<Appearance />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
      <Route path="*" element={<StoreResolver />} />
    </Routes>
  );
}

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

  const { dir } = useI18n();
  const isPlatformViewer = currentUser?.role === 'PLATFORM_OWNER';

  useTicketEvents({ path: `/admin/stores/${storeId}/events` });
  const userStores = useMemo(
    () => {
      const ownedStores = stores.filter((s) => s.ownerId === currentUser?.id);
      return isPlatformViewer ? stores : ownedStores.slice(0, 1);
    },
    [stores, isPlatformViewer, currentUser?.id]
  );
  const store = stores.find((s) => s.id === storeId);
  const canAccess = store && (isPlatformViewer || userStores.some((s) => s.id === storeId));

  useEffect(() => setMobileOpen(false), [location.pathname]);

  if (!store || !canAccess) {
    if (userStores.length === 0) return <NoStores />;
    return <NoAccess />;
  }

  // Blocking onboarding gate: a shop owner whose first payment hasn't been approved
  // yet sees ONLY the proof-upload screen — no dashboard, nav, or store data.
  if (!isPlatformViewer && !store.paymentConfirmed) {
    return <OnboardingGate store={store} storeId={storeId} />;
  }

  const context: AdminContextValue = { storeId, store, userStores, isPlatformViewer };

  return (
    <div className="flex min-h-screen bg-paper">
      <CommandPalette storeId={storeId} />

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-line bg-surface lg:flex">
        <SidebarContent store={store} userStores={userStores} isPlatformViewer={isPlatformViewer} />
      </aside>

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
              className="relative z-10 flex h-full w-72 flex-col border-e border-line bg-surface"
              initial={{ x: dir === 'rtl' ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: dir === 'rtl' ? '100%' : '-100%' }}
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
        <PlanPastDueBanner store={store} />
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">
            <Outlet context={context} />
          </div>
        </main>
      </div>
    </div>
  );
}

function OnboardingGate({ store, storeId }: { store: Store; storeId: string }) {
  const { t, dir, date } = useI18n();
  const submitPaymentProof = useStore((s) => s.submitPaymentProof);
  const refreshStores = useStore((s) => s.refreshStores);
  const signOut = useStore((s) => s.signOut);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [request, setRequest] = useState<ShopRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the request status, then poll: refresh both the request and the store so the
  // gate disappears automatically the moment the platform approves the first payment.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { request } = await adminApi.getPaymentProof(storeId);
        if (active) setRequest(request);
      } catch {
        /* keep the gate visible; the next poll will retry */
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const id = window.setInterval(() => {
      load();
      refreshStores().catch(() => {});
    }, 8000);
    return () => { active = false; window.clearInterval(id); };
  }, [storeId, refreshStores]);

  const status = request?.status ?? 'PENDING';
  const rejected = status === 'REJECTED';
  const inReview = status === 'IN_REVIEW';

  const handlePick = async (picked: File | null) => {
    if (!picked) return;
    setError(null);
    try {
      const dataUrl = await prepareImageDataUrl(picked, { maxDimension: 1600, maxBytes: 3 * 1024 * 1024 });
      setPreview(dataUrl);
    } catch {
      setError(t('gateUploadError'));
    }
  };

  const handleSubmit = async () => {
    if (!preview) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await submitPaymentProof(storeId, preview);
      setRequest(updated);
      setPreview(null);
      toast({ title: t('gateSubmitSuccess'), type: 'success' });
    } catch {
      setError(t('gateSubmitError'));
      toast({ title: t('gateSubmitError'), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const headTitle = rejected ? t('gateStatusRejected') : inReview ? t('gateStatusReview') : t('gateStatusPending');
  const serverProof = request?.paymentProofDataUrl;
  const waiting = inReview && !preview;

  return (
    <div dir={dir} className="flex min-h-screen flex-col bg-paper">
      <header className="flex items-center justify-between border-b border-line bg-surface px-5 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <StoreAvatar emoji={store.logoEmoji} url={store.logoUrl} name={store.name} size="sm" />
          <span className="font-heading text-lg font-black text-ink">{store.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <Button variant="ghost" className="gap-2 border border-line" onClick={() => { signOut(); navigate('/sign-in'); }}>
            <LogOut className="h-4 w-4" /> {t('gateSignOut')}
          </Button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Clock className="h-7 w-7" />
            </div>
            <h1 className="font-heading text-2xl font-black text-ink">{t('gateTitle')}</h1>
            <p className="mt-2 text-sm font-semibold text-muted">{t('gateSubtitle')}</p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
            <div className={cn('flex items-center gap-3 border-b px-5 py-3', rejected ? 'border-red-200 bg-red-50' : inReview ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50')}>
              {rejected ? <TriangleAlert className="h-5 w-5 shrink-0 text-red-600" /> : inReview ? <Clock className="h-5 w-5 shrink-0 text-blue-600" /> : <Upload className="h-5 w-5 shrink-0 text-amber-600" />}
              <p className="font-heading text-base font-black text-ink">{headTitle}</p>
            </div>

            <div className="space-y-4 p-5 md:p-6">
              {loading ? (
                <p className="text-sm font-semibold text-muted">{t('gateRefreshing')}</p>
              ) : waiting ? (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-muted">{t('gateStatusReviewSub')}</p>
                  {serverProof && (
                    <img src={serverProof} alt={t('gatePreviewAlt')} className="max-h-64 w-full rounded-xl border border-line object-contain" />
                  )}
                  {request?.paymentProofUploadedAt && (
                    <p className="text-xs font-semibold text-muted">{t('gateSubmittedAt').replace('{date}', date(request.paymentProofUploadedAt))}</p>
                  )}
                  <button onClick={() => fileInputRef.current?.click()} className="text-sm font-bold text-amber-800 underline-offset-2 hover:underline">
                    {t('gateResubmit')}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {rejected && request?.rejectionReason && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
                      <span className="font-black text-red-700">{t('gateRejectionLabel')}: </span>
                      <span className="font-semibold text-red-800">{request.rejectionReason}</span>
                    </div>
                  )}
                  {preview ? (
                    <div className="relative">
                      <img src={preview} alt={t('gatePreviewAlt')} className="max-h-64 w-full rounded-xl border border-line object-contain" />
                      <button onClick={() => setPreview(null)} className="absolute end-2 top-2 rounded-full bg-ink/70 p-1.5 text-white transition-colors hover:bg-ink">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()} className="w-full rounded-2xl border-2 border-dashed border-line bg-paper py-10 text-center transition-colors hover:border-accent/50">
                      <Upload className="mx-auto mb-2 h-8 w-8 text-muted" />
                      <p className="font-bold text-ink">{t('gateUploadCta')}</p>
                      <p className="mt-1 text-xs text-muted">{t('gateUploadHint')}</p>
                    </button>
                  )}
                  {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="accent" className="gap-2" onClick={handleSubmit} disabled={!preview || submitting}>
                      {submitting ? t('gateSubmitting') : t('gateSubmit')}
                    </Button>
                    {preview && (
                      <Button variant="ghost" className="border border-line" onClick={() => fileInputRef.current?.click()}>
                        {t('gateChangeImage')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { handlePick(e.target.files?.[0] ?? null); e.target.value = ''; }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarContent({ store, userStores, isPlatformViewer, onClose }: { store: Store; userStores: Store[]; isPlatformViewer: boolean; onClose?: () => void }) {
  const badges = useStoreBadges(store.id);
  const { t } = useI18n();
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
              key={item.labelKey}
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
                  <span className="flex-1">{t(item.labelKey)}</span>
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
          href={storefrontUrl(store.slug)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-muted transition-colors hover:bg-paper hover:text-ink"
        >
          <ExternalLink className="h-4 w-4 shrink-0" /> {t('adminViewStorefront')}
        </a>
        {isPlatformViewer ? (
          <Link to="/platform/stores" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-muted transition-colors hover:bg-paper hover:text-ink">
            <ArrowLeft className="h-4 w-4 shrink-0 rtl:rotate-180" /> {t('adminBackToPlatform')}
          </Link>
        ) : (
          <Link to="/request-website" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-accent transition-colors hover:bg-accent-soft">
            <Plus className="h-4 w-4 shrink-0" /> {t('adminRequestWebsite')}
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
        className={cn('flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-2.5 py-2 text-start transition-colors', canSwitch && 'hover:border-ink/30')}
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
              className="absolute start-0 top-full z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-xl"
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
  const { t } = useI18n();
  const initials = currentUser?.name?.split(' ').map((p) => p[0]).join('').substring(0, 2) || 'U';

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-line bg-surface/90 px-5 backdrop-blur md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onMenu} aria-label="Open menu" className="rounded-md p-2 text-ink hover:bg-paper lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted">{t('adminStoreDashboard')}</p>
          <p className="truncate text-sm font-bold text-ink">{store.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <LangToggle variant="light" className="hidden sm:inline-flex" />
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs font-bold text-muted transition-colors hover:bg-paper sm:flex"
          aria-label="Open command palette"
        >
          <Search className="h-3.5 w-3.5" />
          {t('adminSearch')}
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] font-black">⌘K</kbd>
        </button>
        <a
          href={storefrontUrl(store.slug)}
          target="_blank"
          rel="noreferrer"
          className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-xs font-bold text-muted transition-colors hover:bg-paper sm:flex"
        >
          <ExternalLink className="h-3.5 w-3.5" /> {t('adminStorefront')}
        </a>
        <button
          onClick={() => { signOut(); navigate('/sign-in'); }}
          title={`Sign out ${currentUser?.name || ''}`}
          className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 ps-1 pe-3 transition-colors hover:bg-paper"
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
  const { t } = useI18n();
  if (!maintenanceMode) return null;
  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-800 md:px-8">
      <TriangleAlert className="h-4 w-4 shrink-0" />
      {t('adminMaintenanceMsg')}
    </div>
  );
}

function PlanPastDueBanner({ store }: { store: Store }) {
  const { t } = useI18n();
  if (store.planStatus !== 'PAST_DUE') return null;
  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-800 md:px-8">
      <TriangleAlert className="h-4 w-4 shrink-0" />
      {t('adminPastDueMsg')}
    </div>
  );
}

function NoStores() {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="max-w-md">
        <EmptyState
          icon={PackageSearch}
          title={t('adminNoStoresTitle')}
          description={t('adminNoStoresDesc')}
          action={<Button variant="solid" onClick={() => navigate('/request-website')}><Plus className="me-2 h-4 w-4" /> {t('adminRequestFirst')}</Button>}
        />
      </div>
    </div>
  );
}

function NoAccess() {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="max-w-md">
        <EmptyState
          icon={TriangleAlert}
          title={t('adminNoAccessTitle')}
          description={t('adminNoAccessDesc')}
          action={<Button variant="solid" onClick={() => navigate('/admin')}>{t('adminGoToMyStores')}</Button>}
        />
      </div>
    </div>
  );
}
