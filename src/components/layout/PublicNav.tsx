import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { LangToggle } from '@/components/ui/LangToggle';

export function PublicNav() {
  const { t } = useI18n();
  const { pathname } = useLocation();

  const links = [
    { label: t('navFeatures'), to: '/' },
    { label: t('navHowItWorks'), to: '/how-it-works' },
    { label: t('navBrands'), to: '/brands' },
  ];

  return (
    <nav className="fixed top-0 start-0 end-0 z-50">
      <div className="h-[3px] bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400" />
      <div className="flex h-16 items-center justify-between bg-white px-6 md:px-12 border-b border-stone-200 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">

        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <span className="font-heading text-xl font-black tracking-tighter text-stone-900">
            PLINTH<span className="text-orange-500">.</span>
          </span>
          <span className="rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-orange-600 hidden sm:inline">
            Jordan
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const isActive = link.to === '/'
              ? pathname === '/'
              : pathname === link.to || pathname.startsWith(link.to + '/');
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                  isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-stone-400 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <LangToggle variant="light" />
          <div className="hidden sm:block h-4 w-px bg-stone-200" />
          <Link
            to="/sign-in"
            className="hidden sm:block rounded-full px-4 py-2 text-xs font-bold text-stone-500 hover:bg-stone-100 hover:text-stone-900 transition-all"
          >
            {t('navLogIn')}
          </Link>
          <Link
            to="/request-website"
            className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-stone-800 transition-all hover:scale-[1.03] shadow-sm"
          >
            {t('navStartSelling')} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
