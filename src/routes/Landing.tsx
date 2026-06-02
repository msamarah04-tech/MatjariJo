import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Layers3,
  Palette,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  Wand2,
} from 'lucide-react';

const heroImage = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=2400&q=88';

const audiences = [
  {
    key: 'founder',
    label: 'Shop owner',
    title: 'Request the website before the idea cools down.',
    copy: 'Submit what the business needs. The website team creates the storefront from the standard template, then the shop owner manages products, orders, and settings in Admin.',
    href: '/request-website',
    action: 'Request website',
  },
  {
    key: 'shop_admin',
    label: 'Shop admin',
    title: 'Run your shop from a dedicated owner admin.',
    copy: 'Shop owners manage inventory, promotions, shipping, checkout requests, appearance, and analytics from the admin workspace.',
    href: '/admin',
    action: 'Open admin',
  },
  {
    key: 'customer',
    label: 'Customer',
    title: 'Shop a clean storefront built for buying.',
    copy: 'Customers browse collections, open product pages, apply promo codes, and submit checkout requests from the public store.',
    href: '/s/botanica',
    action: 'Browse store',
  },
];

const faqs = [
  ['Is there a backend?', 'No. The prototype persists stores, orders, carts, discounts, and analytics events in localStorage.'],
  ['Who uses each workspace?', 'Shop owners request a shop and then use Admin after approval. Customers use the public Storefront.'],
  ['Can I customize storefront themes?', 'Yes. Store owners can switch between six themes and preview them live before publishing changes.'],
  ['Does checkout process payments?', 'No payment is taken. Customers create order requests that can be reviewed before fulfillment.'],
];

export default function Landing() {
  const { currentUser, stores, orders, products } = useStore();
  const [audience, setAudience] = useState(audiences[0]);
  
  const featuredStores = stores.filter((store) => store.status === 'ACTIVE').slice(0, 3);
  const pendingOrders = orders.filter((order) => order.status === 'PENDING').length;
  const totalRevenue = orders
    .filter((order) => order.status === 'APPROVED' || order.status === 'FULFILLED')
    .reduce((sum, order) => sum + order.totalCents, 0);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-fuchsia-500 selection:text-white overflow-x-hidden">
      
      {/* FLOATING PILL NAVIGATION */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <header className="pointer-events-auto flex h-14 items-center justify-between rounded-full border border-white/10 bg-neutral-900/60 px-6 backdrop-blur-xl shadow-2xl w-full max-w-5xl transition-all duration-300">
          <Link to="/" className="font-heading text-xl font-black tracking-tighter text-white">
            PLINTH<span className="text-fuchsia-500">.</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-neutral-400">
            <a href="#product" className="transition-colors hover:text-white">Product</a>
            <a href="#workflows" className="transition-colors hover:text-white">Workflow</a>
            <a href="#stores" className="transition-colors hover:text-white">Stores</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/sign-in" className="hidden text-sm font-bold text-neutral-400 transition-colors hover:text-white sm:block">
              Log in
            </Link>
            <Link to="/request-website" className="inline-flex h-9 items-center justify-center rounded-full bg-white px-4 text-xs font-black uppercase tracking-widest text-neutral-950 transition-all hover:bg-neutral-200 hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              Request Website
            </Link>
          </div>
        </header>
      </div>

      <main>
        {/* IMMERSIVE AURORA HERO */}
        <section className="relative min-h-screen flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden">
          {/* Glowing Background Orbs */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-fuchsia-600/30 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[150px] mix-blend-screen pointer-events-none" />
          
          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 flex flex-col items-center text-center">
            
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-neutral-300 backdrop-blur-md shadow-2xl animate-fade-in-up">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-pulse" />
              Browser-Only Commerce Prototype
            </div>
            
            <h1 className="max-w-5xl font-heading text-7xl font-black leading-[0.9] tracking-tighter text-white md:text-8xl lg:text-[10rem]">
              Sell <span className="italic font-light text-neutral-500">anything.</span><br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400">Anywhere.</span>
            </h1>
            
            <p className="mt-10 max-w-2xl text-lg font-medium leading-relaxed text-neutral-400 md:text-xl">
              A frictionless platform where founders request stores, teams deploy them instantly, and customers experience seamless checkout.
            </p>
            
            <div className="mt-12 flex flex-col gap-4 w-full max-w-md sm:flex-row sm:max-w-none sm:justify-center">
              <Link to="/request-website" className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-full bg-white px-8 text-base font-bold text-neutral-950 transition-all hover:scale-105">
                <span className="absolute inset-0 bg-gradient-to-r from-fuchsia-100 to-cyan-100 opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="relative flex items-center">
                  Request your website <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              <Link to="/s/botanica" className="inline-flex h-14 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/50 px-8 text-base font-bold text-white backdrop-blur-md transition-all hover:bg-neutral-800 hover:border-neutral-600">
                Explore Demo Shop
              </Link>
            </div>
          </div>

          {/* Hero Image / Dashboard Mockup Peek */}
          <div className="relative mt-20 w-full max-w-6xl px-6 lg:px-8 mx-auto perspective-[2000px]">
            <div className="relative rounded-3xl border border-white/10 bg-neutral-900/40 p-2 shadow-2xl backdrop-blur-xl transform rotate-x-[10deg] translate-y-10 transition-transform duration-700 hover:rotate-x-0 hover:translate-y-0">
              <img src={heroImage} alt="Retail experience" className="w-full h-[400px] object-cover rounded-2xl opacity-60 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
            </div>
          </div>
        </section>

        {/* BENTO GRID METRICS */}
        <section className="relative z-20 mx-auto max-w-7xl px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[200px]">
            {/* Massive Revenue Stat */}
            <div className="md:col-span-2 relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 p-8 flex flex-col justify-between group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl transition-all group-hover:bg-fuchsia-500/20" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Total Prototype GMV</p>
                <div className="mt-4 font-heading text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-500">
                  {money(totalRevenue)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                <Sparkles className="h-4 w-4" /> Live Demo Revenue
              </div>
            </div>

            {/* Smaller Stats */}
            <BentoStat label="Active Stores" value={stores.filter((s) => s.status === 'ACTIVE').length} icon={Store} />
            <BentoStat label="Products Listed" value={products.length} icon={ShoppingBag} />
            <div className="md:col-span-2 md:col-start-2 relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 p-8 flex items-center justify-between group hover:border-white/20 transition-colors">
               <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Orders Tracked</p>
                  <div className="mt-2 font-heading text-5xl font-black text-white">{orders.length}</div>
               </div>
               <div className="h-24 w-24 rounded-full border-8 border-cyan-500/20 flex items-center justify-center">
                  <div className="font-bold text-cyan-400">{pendingOrders} pending</div>
               </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE WORKSPACE SELECTOR */}
        <section id="product" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5">
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-fuchsia-400">Tailored Experiences</p>
              <h2 className="font-heading text-5xl font-black tracking-tight text-white mb-6 leading-tight">
                One platform.<br/>Three distinct views.
              </h2>
              <div className="flex flex-col gap-3">
                {audiences.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setAudience(item)}
                    className={`relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 ${
                      audience.key === item.key 
                      ? 'bg-white/10 border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]' 
                      : 'bg-transparent border border-transparent hover:bg-white/5'
                    }`}
                  >
                    <h3 className={`text-xl font-black ${audience.key === item.key ? 'text-white' : 'text-neutral-400'}`}>
                      {item.label}
                    </h3>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 relative">
              {/* Decorative background glow for the active card */}
              <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-500/20 to-cyan-500/20 rounded-[3rem] blur-2xl transform rotate-3" />
              
              <div className="relative rounded-[2.5rem] border border-white/10 bg-neutral-900/80 p-10 backdrop-blur-2xl shadow-2xl overflow-hidden min-h-[400px] flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Layers3 className="w-48 h-48" />
                </div>
                
                <h3 className="relative z-10 font-heading text-4xl font-black tracking-tight text-white mb-6">
                  {audience.title}
                </h3>
                <p className="relative z-10 text-lg leading-relaxed text-neutral-300 max-w-lg mb-10">
                  {audience.copy}
                </p>
                <Link to={audience.href} className="relative z-10 w-fit inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-black text-neutral-950 transition-transform hover:scale-105 hover:bg-neutral-200">
                  {audience.action} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CONNECTED WORKFLOW */}
        <section id="workflows" className="relative border-y border-white/5 bg-neutral-950 py-32 overflow-hidden">
           {/* Abstract mesh lines */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          
          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-20">
              <h2 className="font-heading text-4xl font-black tracking-tight text-white md:text-6xl">The complete lifecycle.</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {/* Connecting Line (Desktop) */}
              <div className="hidden lg:block absolute top-12 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              
              <WorkflowStep number="01" icon={Wand2} title="Request" text="Submit website needs to the team." delay="0" />
              <WorkflowStep number="02" icon={Store} title="Create" text="Team fills the standard website template." delay="100" />
              <WorkflowStep number="03" icon={ShoppingBag} title="Purchase" text="Customers browse and checkout." delay="200" />
              <WorkflowStep number="04" icon={ShieldCheck} title="Fulfill" text="Admin reviews and completes." delay="300" />
            </div>
          </div>
        </section>

        {/* DEMO STORES GALLERY */}
        <section id="stores" className="py-32 bg-neutral-900 rounded-[3rem] mx-4 lg:mx-8 my-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-white/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mb-16 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="font-heading text-4xl font-black tracking-tight text-white md:text-6xl">Live Ecosystem.</h2>
                <p className="mt-4 text-neutral-400 text-lg">Browse shops already running on the prototype infrastructure.</p>
              </div>
              <Link to="/request-website" className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-transparent px-8 text-sm font-bold text-white transition-all hover:bg-white hover:text-black">
                Request yours now
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {featuredStores.map((store) => (
                <Link key={store.id} to={`/s/${store.slug}`} className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950 p-6 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(255,255,255,0.1)]">
                  <div className="relative h-48 w-full overflow-hidden rounded-xl bg-neutral-900 flex items-center justify-center text-7xl mb-6">
                    {store.logoUrl ? (
                      <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <span className="transition-transform duration-700 group-hover:scale-125">{store.logoEmoji || '🛍️'}</span>
                    )}
                    <div className="absolute inset-0 bg-neutral-950/20 group-hover:bg-transparent transition-colors duration-500" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading text-2xl font-black tracking-tight text-white">{store.name}</h3>
                      <p className="mt-1 text-sm font-medium text-neutral-500">{store.category}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-all duration-300 group-hover:bg-white group-hover:text-black group-hover:rotate-45">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* NEON FAQ ACCORDION */}
        <section id="faq" className="mx-auto max-w-4xl px-6 py-32 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-5xl font-black tracking-tight text-white">Technical details.</h2>
          </div>
          
          <div className="space-y-4">
            {faqs.map(([question, answer]) => (
              <div key={question} className="group rounded-3xl border border-white/10 bg-neutral-900/50 p-8 transition-all hover:border-fuchsia-500/50 hover:bg-neutral-900 hover:shadow-[0_0_30px_rgba(217,70,239,0.1)]">
                <h3 className="text-xl font-black text-white">{question}</h3>
                <p className="mt-4 text-base leading-relaxed text-neutral-400">{answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* MINIMAL FOOTER */}
      <footer className="border-t border-white/10 bg-neutral-950 px-6 py-12 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
          <div className="font-heading text-3xl font-black tracking-tighter text-white">
            PLINTH<span className="text-cyan-500">.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm font-bold uppercase tracking-widest text-neutral-500">
            <Link to="/request-website" className="transition-colors hover:text-white">Request Website</Link>
            <Link to="/admin" className="transition-colors hover:text-white">Admin</Link>
            <Link to="/sign-in" className="transition-colors hover:text-white">{currentUser ? 'Switch role' : 'Login'}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* HELPER COMPONENTS */

function BentoStat({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900 p-8 flex flex-col justify-between hover:bg-neutral-800 transition-colors">
      <div className="flex justify-between items-start">
        <Icon className="h-6 w-6 text-neutral-500" />
      </div>
      <div>
        <div className="font-heading text-5xl font-black tracking-tight text-white mb-2">{value}</div>
        <div className="text-xs font-bold uppercase tracking-widest text-neutral-400">{label}</div>
      </div>
    </div>
  );
}

function WorkflowStep({ number, icon: Icon, title, text, delay }: { number: string; icon: LucideIcon; title: string; text: string; delay: string }) {
  return (
    <div className="relative group rounded-3xl border border-white/5 bg-white/5 p-8 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:bg-white/10 hover:border-white/20 z-10" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-white/20 to-white/5 border border-white/10 text-white shadow-lg">
          <Icon className="h-6 w-6" />
        </div>
        <span className="font-heading text-5xl font-black text-white/5 group-hover:text-white/10 transition-colors">{number}</span>
      </div>
      <h3 className="mb-3 text-2xl font-black tracking-tight text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-neutral-400">{text}</p>
    </div>
  );
}
