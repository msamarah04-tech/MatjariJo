import { useStore } from '@/lib/store';
import { useLocation, useNavigate, Link } from 'react-router-dom';

export function AppTopBar() {
  const { currentUser, signOut } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = () => {
    signOut();
    navigate('/sign-in');
  };

  const pathParts = location.pathname.split('/').filter(Boolean);
  const activeArea = location.pathname.startsWith('/platform')
    ? 'platform'
    : location.pathname.startsWith('/admin')
      ? 'admin'
      : location.pathname.startsWith('/s/')
        ? 'store'
        : 'home';
  const adminStoreId = activeArea === 'admin' ? pathParts[1] : undefined;

  const navLinks = activeArea === 'platform'
    ? [
        { label: 'Analytics', to: '/platform/analytics' },
        { label: 'Website Requests', to: '/platform/shop-requests' },
        { label: 'Stores', to: '/platform/stores' },
        { label: 'Requests', to: '/platform/requests' },
        { label: 'Governance', to: '/platform/governance' },
        { label: 'Finance', to: '/platform/finance' },
        { label: 'Owners', to: '/platform/owners' },
        { label: 'Moderation', to: '/platform/moderation' },
        { label: 'Support', to: '/platform/support' },
        { label: 'Settings', to: '/platform/settings' },
        { label: 'Audit', to: '/platform/audit' },
      ]
    : activeArea === 'admin' && adminStoreId
      ? [
          { label: 'Overview', to: `/admin/${adminStoreId}` },
          { label: 'Analytics', to: `/admin/${adminStoreId}/analytics` },
          { label: 'Products', to: `/admin/${adminStoreId}/products` },
          { label: 'Orders', to: `/admin/${adminStoreId}/orders` },
        ]
      : [];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-line bg-surface">
      <div className="flex items-center justify-between px-8 h-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="font-logo font-black text-3xl tracking-tighter text-ink">
              PLINTH<span className="text-accent">.</span>
            </div>
            <span className="bg-line text-muted text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-sm ml-2 hidden sm:inline-block">Prototype</span>
          </div>
          
          <nav className="hidden md:flex gap-6 text-sm font-semibold uppercase tracking-wider text-muted">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to || location.pathname.startsWith(link.to);
              return (
                <Link key={link.to} to={link.to} className={`${isActive ? 'text-ink border-b-2 border-accent pb-1' : 'hover:text-ink transition-colors'}`}>
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {currentUser && (
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-surface font-bold text-xs cursor-pointer hover:bg-ink/90 transition-colors"
                onClick={handleSignOut}
                title={`Sign out ${currentUser.name}`}
              >
                {currentUser.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'U'}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
