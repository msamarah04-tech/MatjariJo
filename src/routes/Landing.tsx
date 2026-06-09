import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { useStore } from '@/lib/store';
import { money } from '@/lib/format';
import {
  ArrowRight,
  BarChart3,
  Box,
  Globe,
  Layers3,
  LayoutTemplate,
  Palette,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Zap,
} from 'lucide-react';

const heroImage = 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2400&q=88';

const platformFeatures = [
  {
    key: 'design',
    label: 'Premium Design',
    title: 'Luxury themes that command attention.',
    copy: 'Elevate your brand with five exclusive themes (Mono, Sunset, Forest, Mocha, Noir) applied instantly at runtime. Perfect for high-end fashion, luxury fragrances, and artisanal goods. Preview everything live before you publish.',
    href: '/request-website',
    action: 'View Themes',
  },
  {
    key: 'management',
    label: 'Order Management',
    title: 'Built for the local commerce workflow.',
    copy: 'Manage incoming requests with a robust order state machine (Pending, Approved, Fulfilled). Seamlessly review checkout requests before fulfillment—ideal for Cash on Delivery (COD) and custom delivery workflows across Jordan.',
    href: '/request-website',
    action: 'Explore Tools',
  },
  {
    key: 'growth',
    label: 'Growth Insights',
    title: 'Real-time analytics for Jordanian brands.',
    copy: 'Track local and international traffic with a 90-day real-time analytics funnel. Monitor views, cart additions, and Average Order Value (AOV) to scale your business from Amman to the rest of the world.',
    href: '/request-website',
    action: 'See Analytics',
  },
];

const faqs = [
  ['Is this platform optimized for businesses in Jordan?', 'Yes. Plinth is designed with the flexibility needed for the MENA region. Our order approval workflow allows you to manually review and approve orders before fulfillment, which is perfect for managing Cash on Delivery (COD) operations and local couriers.'],
  ['How customizable are the storefronts?', 'You have complete control over your brand identity. Switch between premium themes, upload your custom logo, update your announcement bar, and preview everything in your dedicated sidebar-driven dashboard.'],
  ['Can I offer local shipping and promotions?', 'Absolutely. Configure highly flexible shipping rules, including flat-rate delivery across governorates or free shipping triggered automatically when a customer reaches a specific cart threshold. Create targeted discount codes for local holidays and sales.'],
  ['Do I need to install any software?', 'No. Plinth is a lightning-fast, browser-based application. You run your entire business from a secure, cloud-based control center that works effortlessly on any device.'],
];

export default function Landing() {
  const { stores, orders, products } = useStore();
  const [activeFeature, setActiveFeature] = useState(platformFeatures[0]);
  
  // Localized demo stores tailored for the Jordanian launch context
  const showcaseStores = [
    { id: '2', slug: 'sultan', name: 'Sultan Perfumes', category: 'Luxury Fragrance', logoEmoji: '✨' },
    { id: '1', slug: 'amman-roasters', name: 'Amman Roasters', category: 'Artisanal Coffee', logoEmoji: '☕' },
    { id: '3', slug: 'ayla', name: 'Ayla Apparel', category: 'Modern Fashion', logoEmoji: '⬛' }
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-orange-500 selection:text-white overflow-x-hidden">
      
      {/* FLOATING PILL NAVIGATION */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <header className="pointer-events-auto flex h-16 items-center justify-between rounded-full bg-white/90 px-8 backdrop-blur-2xl ring-1 ring-stone-200 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] w-full max-w-5xl transition-all duration-300">
          <Link to="/" className="font-heading text-xl font-black tracking-tighter text-black">
            PLINTH<span className="text-orange-500">.</span>
          </Link>
          <nav className="hidden md:flex items-center gap-10 text-xs font-bold uppercase tracking-widest text-stone-500">
            <a href="#features" className="transition-colors hover:text-black">Platform</a>
            <a href="#workflows" className="transition-colors hover:text-black">Workflow</a>
            <a href="#stores" className="transition-colors hover:text-black">Brands</a>
          </nav>
          <div className="flex items-center gap-6">
            <Link to="/sign-in" className="hidden text-sm font-bold text-stone-500 transition-colors hover:text-black sm:block">
              Merchant Login
            </Link>
            <Link to="/request-website" className="inline-flex h-10 items-center justify-center rounded-full bg-black px-5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-orange-500 hover:scale-105 shadow-[0_10px_20px_rgba(0,0,0,0.15)]">
              Start Selling
            </Link>
          </div>
        </header>
      </div>

      <main>
        {/* STRUCTURAL LIGHT HERO */}
        <section className="relative min-h-screen flex flex-col items-center justify-center pt-40 pb-20 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-stone-50 to-stone-100">
          
          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 flex flex-col items-center text-center">
            
            <div className="mb-10 inline-flex items-center gap-3 rounded-full bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-stone-600 ring-1 ring-stone-200 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
              <span className="flex h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-pulse" />
              Empowering Jordan's Next Generation of Commerce
            </div>
            
            <h1 className="max-w-5xl font-heading text-6xl font-black leading-[0.95] tracking-tighter text-black md:text-8xl lg:text-[9rem] drop-shadow-md">
              Build a <span className="italic font-light text-stone-400">premium</span><br/>
              <span className="text-orange-500">storefront.</span>
            </h1>
            
            <p className="mt-10 max-w-2xl text-lg font-medium leading-relaxed text-stone-600 md:text-xl">
              Launch a high-performance e-commerce brand with elegant themes, intelligent order management, and a frictionless experience tailored for the local market.
            </p>
            
            <div className="mt-14 flex flex-col gap-6 w-full max-w-md sm:flex-row sm:max-w-none sm:justify-center">
              <Link to="/request-website" className="group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-full bg-orange-500 px-8 text-sm font-bold uppercase tracking-widest text-white transition-all hover:scale-105 hover:bg-orange-600 shadow-[0_20px_40px_-10px_rgba(249,115,22,0.5)]">
                <span className="relative flex items-center">
                  Request your store <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              <a href="#features" className="inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-sm font-bold uppercase tracking-widest text-black ring-1 ring-stone-200 transition-all hover:bg-stone-100 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.05)]">
                Explore Features
              </a>
            </div>
          </div>

          {/* Hero Image Mockup / Massive Depth Focus */}
          <div className="relative mt-24 w-full max-w-6xl px-6 lg:px-8 mx-auto perspective-[2500px]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-orange-400/20 rounded-[100%] blur-[100px] pointer-events-none" />
            <div className="relative rounded-3xl bg-white p-3 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] ring-1 ring-stone-200 transform rotate-x-[12deg] translate-y-12 transition-transform duration-1000 hover:rotate-x-0 hover:translate-y-0">
              <img src={heroImage} alt="Premium retail aesthetic" className="w-full h-[450px] object-cover rounded-2xl transition-all duration-1000" />
            </div>
          </div>
        </section>

        {/* HIGH CONTRAST BENTO GRID - MERCHANT FOCUS */}
        <section className="relative z-20 mx-auto max-w-7xl px-6 lg:px-8 py-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 auto-rows-[220px]">
            
            {/* Massive Analytics Stat (Inverted to Black for contrast) */}
            <div className="md:col-span-2 relative overflow-hidden rounded-[2rem] bg-black p-10 flex flex-col justify-between group shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)]">
              <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl transition-all" />
              <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-widest text-stone-400">Total Volume Processed</p>
                <div className="mt-4 font-heading text-6xl md:text-8xl font-black text-white drop-shadow-2xl">
                  {money(2458000)} {/* Highlighted metric for sales impact */}
                </div>
              </div>
              <div className="relative z-10 flex items-center gap-2 text-sm font-bold text-orange-500">
                <Globe className="mr-2 h-4 w-4" /> Powering Jordan's top brands
              </div>
            </div>

            {/* Smaller Light Stats */}
            <BentoStat label="Premium Themes" value="5" icon={Palette} />
            <BentoStat label="Discount Types" value="3" icon={Tag} />
            
            <div className="md:col-span-2 md:col-start-2 relative overflow-hidden rounded-[2rem] bg-white p-10 flex items-center justify-between group ring-1 ring-stone-200 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)]">
               <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Built-in Analytics</p>
                  <div className="mt-2 font-heading text-4xl font-black text-black max-w-xs leading-tight">
                    Track every view, cart, and checkout.
                  </div>
               </div>
               <div className="h-32 w-32 rounded-full ring-8 ring-orange-100 flex items-center justify-center bg-white shadow-[inset_0_10px_20px_rgba(0,0,0,0.05)]">
                  <BarChart3 className="h-12 w-12 text-orange-500" />
               </div>
            </div>
          </div>
        </section>

        {/* INTERACTIVE FEATURE SELECTOR */}
        <section id="features" className="mx-auto max-w-7xl px-6 py-32 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            
            <div className="lg:col-span-5">
              <p className="mb-6 text-xs font-bold uppercase tracking-widest text-orange-600">Merchant Dashboard</p>
              <h2 className="font-heading text-5xl font-black tracking-tight text-black mb-10 leading-tight">
                Everything you need.<br/>Nothing you don't.
              </h2>
              <div className="flex flex-col gap-4">
                {platformFeatures.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActiveFeature(item)}
                    className={`relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-500 ${
                      activeFeature.key === item.key 
                      ? 'bg-black text-white shadow-[0_30px_60px_-10px_rgba(0,0,0,0.4)] transform scale-105 z-10' 
                      : 'bg-white ring-1 ring-stone-200 hover:bg-stone-50 text-stone-500 hover:text-black shadow-[0_10px_20px_-10px_rgba(0,0,0,0.05)]'
                    }`}
                  >
                    <h3 className="text-lg font-black uppercase tracking-wide">
                      {item.label}
                    </h3>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7 relative">
              <div className="relative rounded-[2.5rem] bg-white p-12 ring-1 ring-stone-200 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] overflow-hidden min-h-[450px] flex flex-col justify-center">
                <div className="absolute top-0 right-0 p-10 opacity-5 text-black">
                  <Layers3 className="w-64 h-64" />
                </div>
                
                <h3 className="relative z-10 font-heading text-4xl font-black tracking-tight text-black mb-8">
                  {activeFeature.title}
                </h3>
                <p className="relative z-10 text-lg leading-relaxed text-stone-600 max-w-lg mb-12">
                  {activeFeature.copy}
                </p>
                <Link to={activeFeature.href} className="relative z-10 w-fit inline-flex h-12 items-center justify-center rounded-full bg-orange-500 px-8 text-sm font-black uppercase tracking-widest text-white transition-transform hover:scale-105 hover:bg-orange-600 shadow-[0_10px_20px_rgba(249,115,22,0.3)]">
                  {activeFeature.action} <ArrowRight className="ml-3 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW - LAYERED CARDS */}
        <section id="workflows" className="relative bg-stone-100 py-40 overflow-hidden border-y border-stone-200">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,white,transparent)] opacity-50 pointer-events-none" />
          
          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-24">
              <h2 className="font-heading text-5xl font-black tracking-tight text-black md:text-6xl">Launch in four steps.</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              <WorkflowStep number="01" icon={Store} title="Request" text="Submit your brand name and select a tailored plan." delay="0" />
              <WorkflowStep number="02" icon={LayoutTemplate} title="Design" text="Choose a theme and construct your identity." delay="100" />
              <WorkflowStep number="03" icon={Box} title="Stock" text="Upload products and organize your collections." delay="200" />
              <WorkflowStep number="04" icon={Zap} title="Sell" text="Open your doors and start fulfilling local orders." delay="300" />
            </div>
          </div>
        </section>

        {/* DEMO STORES GALLERY */}
        <section id="stores" className="py-40 bg-white relative overflow-hidden">
          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mb-20 flex flex-col gap-8 md:flex-row md:items-end md:justify-between border-b border-stone-200 pb-10">
              <div>
                <h2 className="font-heading text-5xl font-black tracking-tight text-black md:text-6xl">Built for Brand Leaders.</h2>
                <p className="mt-6 text-stone-500 text-lg max-w-xl">Explore beautiful, high-converting storefronts thriving across Jordan on our infrastructure.</p>
              </div>
              <Link to="/request-website" className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-bold uppercase tracking-widest text-black ring-2 ring-black transition-all hover:bg-black hover:text-white shadow-[0_15px_30px_-5px_rgba(0,0,0,0.2)]">
                Start your brand
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {showcaseStores.map((store) => (
                <Link key={store.id} to={`/s/${store.slug}`} className="group relative overflow-hidden rounded-3xl bg-white p-8 transition-all duration-700 hover:-translate-y-4 ring-1 ring-stone-200 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)]">
                  <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-stone-100 flex items-center justify-center text-7xl mb-8 shadow-inner ring-1 ring-stone-200/50">
                    <span className="transition-transform duration-700 group-hover:scale-125">{store.logoEmoji}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-heading text-2xl font-black tracking-tight text-black">{store.name}</h3>
                      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-orange-600">{store.category}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white transition-all duration-500 group-hover:bg-orange-500 group-hover:-rotate-45 shadow-[0_10px_20px_rgba(0,0,0,0.3)]">
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* MERCHANT FAQ */}
        <section id="faq" className="mx-auto max-w-4xl px-6 py-40 lg:px-8 border-t border-stone-200">
          <div className="text-center mb-20">
            <h2 className="font-heading text-5xl font-black tracking-tight text-black">Common Questions.</h2>
          </div>
          
          <div className="space-y-6">
            {faqs.map(([question, answer]) => (
              <div key={question} className="group rounded-[2rem] bg-white p-10 transition-all ring-1 ring-stone-200 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.08)] hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] hover:ring-orange-200">
                <h3 className="text-xl font-black text-black tracking-wide">{question}</h3>
                <p className="mt-5 text-base leading-relaxed text-stone-600">{answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* HEAVY BLACK FOOTER FOR GROUNDING */}
      <footer className="bg-black px-6 py-20 lg:px-8 rounded-t-[3rem] mt-10 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-10 md:flex-row">
          <div className="font-heading text-4xl font-black tracking-tighter text-white">
            PLINTH<span className="text-orange-500">.</span>
          </div>
          <div className="flex flex-wrap justify-center gap-10 text-xs font-bold uppercase tracking-widest text-stone-400">
            <Link to="/request-website" className="transition-colors hover:text-orange-500">Start Selling</Link>
            <Link to="/sign-in" className="transition-colors hover:text-white">Merchant Login</Link>
            <a href="#features" className="transition-colors hover:text-white">Platform Details</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* HELPER COMPONENTS */

function BentoStat({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-white p-10 flex flex-col justify-between ring-1 ring-stone-200 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] transition-shadow">
      <div className="flex justify-between items-start">
        <div className="p-3 rounded-xl bg-orange-100 text-orange-600 ring-1 ring-orange-200">
           <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="mt-8">
        <div className="font-heading text-5xl font-black tracking-tight text-black mb-3">{value}</div>
        <div className="text-xs font-bold uppercase tracking-widest text-stone-500">{label}</div>
      </div>
    </div>
  );
}

function WorkflowStep({ number, icon: Icon, title, text, delay }: { number: string; icon: LucideIcon; title: string; text: string; delay: string }) {
  return (
    <div className="relative group rounded-[2rem] bg-white p-10 transition-all duration-700 hover:-translate-y-4 ring-1 ring-stone-200 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] hover:shadow-[0_40px_80px_-20px_rgba(249,115,22,0.25)] z-10" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-10 flex items-center justify-between">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-white shadow-[0_15px_30px_rgba(0,0,0,0.3)] group-hover:bg-orange-500 transition-colors">
          <Icon className="h-7 w-7" />
        </div>
        <span className="font-heading text-6xl font-black text-stone-100 group-hover:text-orange-100 transition-colors">{number}</span>
      </div>
      <h3 className="mb-4 text-2xl font-black tracking-tight text-black">{title}</h3>
      <p className="text-sm leading-relaxed text-stone-500">{text}</p>
    </div>
  );
}