import { useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { AppTopBar } from '@/components/layout/AppTopBar';
import { LayoutDashboard, PackageSearch, ClipboardList, Paintbrush, Plus, ChevronDown, BadgePercent, BarChart3 } from 'lucide-react';
import Overview from './Overview';
import Products from './Products';
import Orders from './Orders';
import Appearance from './Appearance';
import Discounts from './Discounts';
import Analytics from './Analytics';

/** Admin Layout wrapper */
function AdminLayout() {
  const { stores, currentUser } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { storeId } = useParams();

  const userStores = currentUser?.role === 'PLATFORM_OWNER' 
    ? stores 
    : stores.filter((s) => s.ownerId === currentUser?.id);

  const activeStore = userStores.find((s) => s.id === storeId);

  // Redirect if no store selected or invalid store
  useEffect(() => {
    if (!storeId && userStores.length > 0) {
      navigate(`/admin/${userStores[0].id}`, { replace: true });
    } else if (storeId && !activeStore && userStores.length > 0) {
      navigate(`/admin/${userStores[0].id}`, { replace: true });
    }
  }, [storeId, userStores, activeStore, navigate]);

  if (userStores.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-paper">
        <AppTopBar />
        <main className="flex-1 flex items-center justify-center p-8">
           <div className="text-center max-w-md bg-surface p-12 rounded-3xl border border-line shadow-sm">
             <div className="w-16 h-16 bg-accent-soft text-accent rounded-2xl flex items-center justify-center mx-auto mb-6">
               <PackageSearch className="w-8 h-8" />
             </div>
             <h2 className="font-heading font-black text-3xl mb-3">No stores found</h2>
             <p className="text-muted mb-8">You don't have any stores yet. Send a website request and the website team will create it for you.</p>
             <button 
               onClick={() => navigate('/request-website')}
               className="bg-ink text-surface hover:bg-ink/90 font-bold px-6 py-3 rounded-xl transition-all"
               >
                 Request your first website
             </button>
           </div>
        </main>
      </div>
    );
  }

  if (!activeStore) return null; // loading/redirecting

  const navItems = [
    { name: 'Overview', path: `/admin/${storeId}`, icon: LayoutDashboard },
    { name: 'Analytics', path: `/admin/${storeId}/analytics`, icon: BarChart3 },
    { name: 'Products', path: `/admin/${storeId}/products`, icon: PackageSearch },
    { name: 'Discounts', path: `/admin/${storeId}/discounts`, icon: BadgePercent },
    { name: 'Orders', path: `/admin/${storeId}/orders`, icon: ClipboardList },
    { name: 'Appearance', path: `/admin/${storeId}/appearance`, icon: Paintbrush },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <AppTopBar />
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Sidebar Nav */}
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-line bg-surface/50 lg:bg-transparent flex flex-col shrink-0 z-10 sticky top-0 lg:static">
           
           <div className="p-4 lg:p-6 border-b border-line flex flex-row lg:flex-col items-center lg:items-stretch gap-4 justify-between lg:justify-start">
             <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted hidden lg:block mb-2">Switch Store</div>
             
             {/* Simple store switcher */}
             <div className="relative group flex-1 lg:flex-none max-w-[200px] lg:max-w-none">
               <div className="flex items-center gap-3 bg-white border border-line rounded-xl px-3 py-2 cursor-pointer shadow-xs hover:border-ink/30 transition-colors">
                  <div className="w-6 h-6 rounded bg-paper flex items-center justify-center text-sm border border-line/50 shrink-0">
                    {activeStore.logoEmoji || '🛍️'}
                  </div>
                  <div className="font-bold text-sm truncate flex-1">{activeStore.name}</div>
                  <ChevronDown className="w-4 h-4 text-muted shrink-0" />
               </div>
               
               <div className="absolute top-full left-0 w-full mt-1 bg-white border border-line rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 flex flex-col py-1">
                 {userStores.map(s => (
                   <Link key={s.id} to={`/admin/${s.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-paper transition-colors">
                     <div className="w-5 h-5 rounded bg-surface border border-line flex items-center justify-center text-xs shrink-0">{s.logoEmoji || '🛍️'}</div>
                     <span className="text-sm font-semibold truncate">{s.name}</span>
                   </Link>
                 ))}
                 <div className="h-px bg-line my-1 mx-2" />
                 <Link to="/request-website" className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent-soft transition-colors">
                   <Plus className="w-3.5 h-3.5" /> Request website
                 </Link>
               </div>
             </div>
             
           </div>

           <nav className="flex lg:flex-col gap-1 p-2 lg:p-6 overflow-x-auto lg:overflow-x-visible no-scrollbar">
             <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted hidden lg:block mb-2">Manage</div>
             {navItems.map(item => {
                // exact match for overview, startsWith for others
                const isActive = item.name === 'Overview' 
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);

                return (
                  <Link 
                    key={item.name} 
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold transition-all text-sm whitespace-nowrap ${isActive ? 'bg-ink text-surface shadow-sm' : 'text-muted hover:bg-paper hover:text-ink'}`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.name}
                  </Link>
                );
             })}
           </nav>
           
           <div className="mt-auto hidden lg:block p-6">
             <div className="bg-surface border border-line p-4 rounded-xl flex items-center gap-3 shadow-xs">
                <div className="flex gap-1" title="Theme engine active">
                  <div className="w-3 h-3 rounded-full border border-black/10 shadow-sm bg-accent opacity-50" />
                  <div className="w-3 h-3 rounded-full border border-black/10 shadow-sm bg-accent opacity-80" />
                  <div className="w-3 h-3 rounded-full border border-black/10 shadow-sm bg-accent" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5">Live Theme</div>
                  <div className="text-xs text-muted font-medium">{activeStore.themeId}</div>
                </div>
             </div>
           </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
           <div className="p-4 md:p-8 lg:p-12 max-w-6xl mx-auto h-full">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/products" element={<Products />} />
              <Route path="/discounts" element={<Discounts />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/appearance" element={<Appearance />} />
            </Routes>
           </div>
        </main>
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />} />
      <Route path="/:storeId/*" element={<AdminLayout />} />
    </Routes>
  );
}
