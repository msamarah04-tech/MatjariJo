import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  ScrollText,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  Store as StoreIcon,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/cn';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { CommandPalette } from './CommandPalette';
import { NotificationsBell } from './NotificationsBell';
import { PlatformBadges, usePlatformBadges } from './shared';
import { useI18n } from '@/lib/i18n';
import { LangToggle } from '@/components/ui/LangToggle';

import Overview from './Overview';
import ShopRequests from './ShopRequests';
import Stores from './Stores';
import Moderation from './Moderation';
import Support from './Support';
import AuditLog from './AuditLog';
import Settings from './Settings';

const Analytics = lazy(() => import('./Analytics'));

type BadgeKey = keyof PlatformBadges;

interface NavItem {
  labelKey: string;
  to: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  badge?: BadgeKey;
}

const NAV: NavItem[] = [
  { labelKey: 'navOverview', to: '/platform', icon: LayoutDashboard, end: true, badge: 'orders' },
  { labelKey: 'navShopRequests', to: '/platform/shop-requests', icon: ClipboardList, badge: 'requests' },
  { labelKey: 'navStores', to: '/platform/stores', icon: StoreIcon },
  { labelKey: 'navModeration', to: '/platform/moderation', icon: ShieldAlert, badge: 'flags' },
  { labelKey: 'navSupport', to: '/platform/support', icon: MessageSquare, badge: 'tickets' },
  { labelKey: 'navAnalytics', to: '/platform/analytics', icon: BarChart3 },
  { labelKey: 'navAuditLog', to: '/platform/audit', icon: ScrollText },
  { labelKey: 'navSettings', to: '/platform/settings', icon: SettingsIcon },
];

export default function Platform() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const badges = usePlatformBadges();
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="flex min-h-screen bg-paper">
      <CommandPalette />

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <SidebarContent badges={badges} />
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
              className="relative z-10 flex h-full w-72 flex-col border-r border-line bg-surface"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 38 }}
            >
              <SidebarContent badges={badges} onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <PlatformTopBar onMenu={() => setMobileOpen(true)} />
        <MaintenanceBanner />
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">
            <Routes>
              <Route index element={<Overview />} />
              <Route path="shop-requests" element={<ShopRequests />} />
              <Route path="stores" element={<Stores />} />
              <Route path="moderation" element={<Moderation />} />
              <Route path="support" element={<Support />} />
              <Route
                path="analytics"
                element={
                  <Suspense fallback={<div className="space-y-6"><SkeletonCards /></div>}>
                    <Analytics />
                  </Suspense>
                }
              />
              <Route path="audit" element={<AuditLog />} />
              <Route path="settings" element={<Settings />} />
              <Route path="requests" element={<Navigate to="/platform" replace />} />
              <Route path="governance" element={<Navigate to="/platform/stores" replace />} />
              <Route path="finance" element={<Navigate to="/platform/analytics" replace />} />
              <Route path="owners" element={<Navigate to="/platform/stores" replace />} />
              <Route path="*" element={<Navigate to="/platform" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ badges, onClose }: { badges: PlatformBadges; onClose?: () => void }) {
  const { t } = useI18n();
  return (
    <>
      <div className="flex h-20 items-center justify-between border-b border-line px-5">
        <Link to="/platform" className="flex items-center gap-2">
          <img src="/logo.png" alt="Matjari Jordan" className="h-14 w-auto -my-2" />
        </Link>
        {onClose ? (
          <button onClick={onClose} aria-label="Close menu" className="rounded-md p-1 text-muted hover:bg-paper hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        ) : (
          <span className="rounded-sm bg-paper px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted">Platform</span>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((item) => {
          const count = item.badge ? badges[item.badge] : 0;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
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
                    <span className={cn(
                      'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black',
                      isActive ? 'bg-surface/20 text-surface' : 'bg-accent text-white'
                    )}>
                      {count}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-line p-4 text-[10px] font-bold uppercase tracking-widest text-muted">
        {t('platformWorkspace')}
      </div>
    </>
  );
}

function PlatformTopBar({ onMenu }: { onMenu: () => void }) {
  const currentUser = useStore((s) => s.currentUser);
  const platformName = useStore((s) => s.platformSettings.platformName);
  const navigate = useNavigate();
  const signOut = useStore((s) => s.signOut);
  const { t } = useI18n();

  const initials = currentUser?.name?.split(' ').map((p) => p[0]).join('').substring(0, 2) || 'U';

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-line bg-surface/90 px-5 backdrop-blur md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onMenu} aria-label="Open menu" className="rounded-md p-2 text-ink hover:bg-paper lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted">{platformName} · {t('platformControlCenter')}</p>
          <p className="truncate text-sm font-bold text-ink">{currentUser?.name || 'Operator'}</p>
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
          {t('platformSearch')}
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] font-black">⌘K</kbd>
        </button>
        <NotificationsBell />
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
  const { t } = useI18n();
  if (!maintenanceMode) return null;
  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-800 md:px-8">
      <TriangleAlert className="h-4 w-4 shrink-0" />
      {t('platformMaintenanceMsg')}
    </div>
  );
}
