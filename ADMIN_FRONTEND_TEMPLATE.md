# Admin Panel — Frontend Template (React + Vite + Tailwind)

A drop-in, **backend-agnostic** admin dashboard for any kind of online shop
(perfumes, clothing, electronics, food, services — anything). Copy the files
below into a new project, set a few config values, point it at your API, and you
have a working admin panel with:

- JWT login + protected routes (token in `sessionStorage`)
- Responsive sidebar layout (desktop sidebar + mobile tab bar)
- A dashboard with KPI cards + panels
- A reusable **CRUD resource** pattern (list + create/edit + delete)
- A settings form
- Toast notifications, loading skeletons, and a defensive API client

> This template is **frontend only**. It talks to any REST backend that follows
> the [API contract](#9-backend-contract) at the end. Nothing here is tied to
> perfumes — resource names, fields, and nav items are all configurable.

---

## Table of contents

1. [Stack & dependencies](#1-stack--dependencies)
2. [Folder structure](#2-folder-structure)
3. [Setup steps](#3-setup-steps)
4. [Theme tokens (Tailwind)](#4-theme-tokens-tailwind)
5. [Core infrastructure files](#5-core-infrastructure-files)
6. [UI primitives](#6-ui-primitives)
7. [Admin shell, login & pages](#7-admin-shell-login--pages)
8. [Routing](#8-routing)
9. [Backend contract](#9-backend-contract)
10. [How to customize for your shop](#10-how-to-customize-for-your-shop)
11. [Optional: real-time "new order" badge](#11-optional-real-time-new-order-badge)

---

## 1. Stack & dependencies

- **React 18** + **Vite**
- **react-router-dom** v6 (routing + protected routes)
- **Tailwind CSS** (styling)
- **lucide-react** (icons)
- **framer-motion** (small animations — optional, used by Button/Toast/Login)

```bash
npm create vite@latest my-shop-admin -- --template react
cd my-shop-admin
npm install react-router-dom lucide-react framer-motion
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Set the API base URL in a `.env` file at the project root:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

---

## 2. Folder structure

```
src/
├── config.js                      # brand + theme constants (edit per shop)
├── main.jsx                       # mounts <App/> (Vite default)
├── App.jsx                        # routes (public + /admin/*)
├── index.css                      # tailwind directives
├── lib/
│   ├── api.js                     # fetch wrapper + admin token + CRUD factory
│   └── format.js                  # currency/number formatting
├── context/
│   ├── AuthContext.jsx            # login/logout + isAdmin
│   ├── ProtectedRoute.jsx         # gate for /admin/*
│   └── ToastContext.jsx           # toast notifications
├── components/
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   └── Toast.jsx
│   └── admin/
│       └── AdminLayout.jsx        # sidebar + mobile nav + outlet
└── pages/
    └── admin/
        ├── Login.jsx
        ├── Dashboard.jsx
        ├── ResourceList.jsx       # generic list page (clone per resource)
        ├── ResourceForm.jsx       # generic create/edit page
        └── Settings.jsx
```

---

## 3. Setup steps

1. Install deps (section 1).
2. Add the theme tokens to `tailwind.config.js` and the directives to
   `index.css` (section 4).
3. Copy the files from sections 5–8 into the matching paths.
4. Wrap your app in the providers (shown in [App.jsx](#8-routing)).
5. Edit `src/config.js` with your brand name + theme.
6. Edit the `navItems` array + routes to match your shop's resources.
7. Point `VITE_API_BASE_URL` at your backend.

---

## 4. Theme tokens (Tailwind)

The components use a few semantic color names (`jet`, `gold`, `ivory`). Define
them once and re-theme the whole panel by changing these values.

**`tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        jet: '#0A0A0A',        // sidebar / primary dark
        ivory: '#FAF8F3',      // light page bg
        gold: '#D4AF37',       // brand accent (change me)
        'gold-light': '#E5C75A',
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],     // headings
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { shimmer: 'shimmer 1.2s infinite' },
    },
  },
  plugins: [],
};
```

**`src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

> **RTL note:** the layout uses logical utilities (`ms-`, `me-`, `text-start`,
> `text-end`) so it works in both LTR and RTL. For an RTL shop set
> `<html dir="rtl">` and remove the `dir="ltr"` on the admin root in
> `AdminLayout.jsx`.

---

## 5. Core infrastructure files

### `src/config.js`

```js
// Brand + UI constants. Edit these per shop — nothing else references the
// shop's identity directly.
export const CONFIG = {
  brandName: 'My Shop',
  adminTitle: 'Admin Panel',

  // Currency used by lib/format.js
  currency: 'USD',
  currencySymbol: '$',
  // 'latin' (1,234.50) or 'arab' (١٬٢٣٤٫٥٠)
  numeralSystem: 'latin',
  // Decimal places to show (2 for cents, 3 for some currencies, 0 for none)
  currencyDecimals: 2,
};
```

### `src/lib/format.js`

```js
import { CONFIG } from '../config';

// Currency formatter driven entirely by CONFIG. Backend is assumed to send
// already-converted decimal amounts (e.g. 12.50), NOT minor units.
export function formatCurrency(amount) {
  const n = Number(amount) || 0;
  const locale = CONFIG.numeralSystem === 'arab' ? 'ar-EG' : 'en-US';
  const formatted = n.toLocaleString(locale, {
    minimumFractionDigits: CONFIG.currencyDecimals,
    maximumFractionDigits: CONFIG.currencyDecimals,
  });
  return `${CONFIG.currencySymbol}${formatted}`;
}

export function formatNumber(value) {
  const locale = CONFIG.numeralSystem === 'arab' ? 'ar-EG' : 'en-US';
  return (Number(value) || 0).toLocaleString(locale);
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}
```

### `src/lib/api.js`

```js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

function getAdminToken() {
  return sessionStorage.getItem('adminToken');
}

async function request(method, path, { body, admin = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (admin) {
    const token = getAdminToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Token expired / invalid → drop it and bounce to login, but only when the
  // user is actually inside the admin panel (a stray admin call from a public
  // page must not redirect a normal visitor).
  if (admin && res.status === 401) {
    sessionStorage.removeItem('adminToken');
    if (
      typeof window !== 'undefined' &&
      window.location.pathname.startsWith('/admin') &&
      !window.location.pathname.startsWith('/admin/login')
    ) {
      window.location.href = '/admin/login';
    }
  }

  // Parse defensively: proxies / rate limiters / crashed workers can return
  // plain text instead of JSON. Map common cases to readable errors.
  const text = await res.text();
  let json;
  try {
    json = text
      ? JSON.parse(text)
      : { ok: false, error: { code: 'EMPTY_RESPONSE', message: 'Empty response from server' } };
  } catch {
    const code = res.status === 429 ? 'RATE_LIMITED'
      : res.status >= 500 ? 'SERVER_ERROR'
      : 'BAD_RESPONSE';
    const err = new Error(text.slice(0, 200) || `HTTP ${res.status}`);
    err.code = code;
    err.status = res.status;
    throw err;
  }

  if (!json.ok) {
    const err = new Error(json.error?.message || 'API error');
    err.code = json.error?.code;
    err.status = res.status;
    throw err;
  }
  return json.data;
}

export const apiGet = (path, opts) => request('GET', path, opts);
export const apiPost = (path, body, opts) => request('POST', path, { body, ...opts });
export const apiPut = (path, body, opts) => request('PUT', path, { body, ...opts });
export const apiPatch = (path, body, opts) => request('PATCH', path, { body, ...opts });
export const apiDelete = (path, opts) => request('DELETE', path, opts);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username, password) => apiPost('/auth/login', { username, password }),
  me: () => apiGet('/auth/me', { admin: true }),
};

// ── Generic CRUD factory ───────────────────────────────────────────────────
// Generates the standard 6 endpoints for any admin resource. Add a new resource
// to your shop in ONE line:  products: createResourceApi('products')
function buildQuery(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  const q = new URLSearchParams(entries).toString();
  return q ? `?${q}` : '';
}

export function createResourceApi(name) {
  return {
    list: (params = {}) => apiGet(`/admin/${name}${buildQuery(params)}`, { admin: true }),
    getById: (id) => apiGet(`/admin/${name}/${id}`, { admin: true }),
    create: (data) => apiPost(`/admin/${name}`, data, { admin: true }),
    update: (id, data) => apiPut(`/admin/${name}/${id}`, data, { admin: true }),
    patch: (id, data) => apiPatch(`/admin/${name}/${id}`, data, { admin: true }),
    delete: (id) => apiDelete(`/admin/${name}/${id}`, { admin: true }),
  };
}

// ── Admin API surface ──────────────────────────────────────────────────────
// Compose your shop's resources here. These names are EXAMPLES — rename/remove.
export const adminApi = {
  stats: () => apiGet('/admin/stats', { admin: true }),

  products: createResourceApi('products'),
  orders: createResourceApi('orders'),
  customers: createResourceApi('customers'),

  settings: {
    get: () => apiGet('/admin/settings', { admin: true }),
    update: (data) => apiPut('/admin/settings', data, { admin: true }),
  },
};
```

### `src/context/AuthContext.jsx`

```jsx
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import { authApi } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // sessionStorage (not localStorage) → token is cleared when the tab closes.
  const [isAdmin, setIsAdmin] = useState(() => !!sessionStorage.getItem('adminToken'));

  const login = async (username, password) => {
    const data = await authApi.login(username, password);
    sessionStorage.setItem('adminToken', data.token);
    setIsAdmin(true);
    return data;
  };

  const logout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('adminToken');
  };

  return (
    <AuthContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
```

### `src/context/ProtectedRoute.jsx`

```jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = () => {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <Outlet />;
};

export default ProtectedRoute;
```

### `src/context/ToastContext.jsx`

```jsx
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast from '../components/ui/Toast';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 end-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} {...t} onClose={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
```

---

## 6. UI primitives

### `src/components/ui/Toast.jsx`

```jsx
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

const META = {
  success: { icon: CheckCircle2, ring: 'border-green-200', text: 'text-green-700', tint: 'bg-green-50' },
  error:   { icon: XCircle,      ring: 'border-red-200',   text: 'text-red-700',   tint: 'bg-red-50' },
  info:    { icon: Info,         ring: 'border-blue-200',  text: 'text-blue-700',  tint: 'bg-blue-50' },
};

const Toast = ({ message, type = 'success', onClose }) => {
  const m = META[type] || META.info;
  const Icon = m.icon;
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      onClick={onClose}
      className={`pointer-events-auto cursor-pointer flex items-center gap-3 ${m.tint} ${m.ring} ${m.text} border px-4 py-3 rounded shadow-lg max-w-sm`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="font-sans text-sm">{message}</span>
    </motion.div>
  );
};

export default Toast;
```

### `src/components/ui/Button.jsx`

```jsx
import React from 'react';

const Button = React.forwardRef(({
  children, variant = 'primary', size = 'md',
  className = '', fullWidth = false, isLoading = false, disabled, ...props
}, ref) => {
  const base = 'inline-flex items-center justify-center font-sans font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed outline-none select-none rounded';

  const variants = {
    primary: 'bg-gold text-white border border-gold hover:bg-gold-light',
    outline: 'bg-transparent border border-jet/40 text-jet hover:border-gold hover:text-gold',
    ghost:   'bg-transparent text-jet hover:text-gold',
    danger:  'bg-red-600 text-white border border-red-600 hover:bg-red-700',
  };
  const sizes = { sm: 'text-xs py-2 px-4', md: 'text-sm py-3 px-6', lg: 'text-base py-4 px-8' };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ms-1 me-2 h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
      )}
      <span className="flex items-center justify-center gap-2">{children}</span>
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
```

### `src/components/ui/Input.jsx`

```jsx
import React from 'react';

const Input = React.forwardRef(({
  label, error, id, className = '', type = 'text',
  multiline = false, rows = 4, ...props
}, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const base = `w-full bg-white border font-sans text-base md:text-sm p-3 rounded transition-colors outline-none
    ${error ? 'border-red-500 focus:border-red-500' : 'border-gray-200 focus:border-gold'} ${className}`;

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={inputId} className="font-sans font-medium text-xs text-gray-500">{label}</label>
      )}
      {multiline
        ? <textarea id={inputId} ref={ref} rows={rows} className={base} {...props} />
        : <input id={inputId} ref={ref} type={type} className={base} {...props} />}
      {error && <span className="text-red-500 text-xs">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
```

---

## 7. Admin shell, login & pages

### `src/components/admin/AdminLayout.jsx`

The nav is a single configurable array — **this is the main thing you edit per
shop.**

```jsx
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CONFIG } from '../../config';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, Menu, X,
} from 'lucide-react';

// ── Edit this array to define your shop's admin sections ───────────────────
const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin',           icon: LayoutDashboard },
  { label: 'Products',  path: '/admin/products',  icon: Package },
  { label: 'Orders',    path: '/admin/orders',    icon: ShoppingCart },
  { label: 'Customers', path: '/admin/customers', icon: Users },
  { label: 'Settings',  path: '/admin/settings',  icon: Settings },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const isActive = (path) =>
    location.pathname === path || (path !== '/admin' && location.pathname.startsWith(path));

  const NavLink = ({ item, onClick }) => (
    <Link
      to={item.path}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 font-sans text-sm rounded transition-colors ${
        isActive(item.path) ? 'bg-white/10 text-gold' : 'text-gray-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      <item.icon className="w-5 h-5" />
      <span className="flex-1">{item.label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50" dir="ltr">

      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="hidden md:flex md:w-64 bg-jet text-white flex-col shrink-0 md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <Link to="/" className="font-serif text-2xl text-gold">{CONFIG.brandName}</Link>
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-gray-400 mt-2">
            {CONFIG.adminTitle}
          </p>
        </div>

        <nav className="flex-grow p-4 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => <NavLink key={item.path} item={item} />)}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 font-sans text-sm text-gray-300 hover:text-white transition-colors w-full text-left"
          >
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────── */}
      <div className="md:hidden bg-jet text-white shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <Link to="/" className="font-serif text-xl text-gold">{CONFIG.brandName}</Link>
          <button
            onClick={() => setIsMobileNavOpen((o) => !o)}
            aria-label={isMobileNavOpen ? 'Close menu' : 'Open menu'}
            className="p-3 text-gray-300 hover:text-white transition-colors"
          >
            {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {isMobileNavOpen && (
          <nav className="flex flex-col gap-1 p-3 border-b border-white/10">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.path} item={item} onClick={() => setIsMobileNavOpen(false)} />
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 font-sans text-sm text-gray-300 hover:text-white transition-colors w-full text-left rounded"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </nav>
        )}

        {/* Always-visible icon tab bar for quick switching */}
        <div className="flex overflow-x-auto gap-1 px-2 py-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 px-3 py-3 rounded text-center shrink-0 transition-colors ${
                isActive(item.path) ? 'text-gold bg-white/10' : 'text-gray-400 hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span className="font-sans text-[9px] uppercase tracking-wide">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="flex-grow p-4 md:p-8 min-w-0">
        <div className="max-w-6xl mx-auto"><Outlet /></div>
      </main>
    </div>
  );
};

export default AdminLayout;
```

### `src/pages/admin/Login.jsx`

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CONFIG } from '../../config';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const Login = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(username, password);
      navigate('/admin');
    } catch {
      setError('Incorrect username or password');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-jet flex flex-col items-center justify-center p-4">
      <motion.div
        animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white p-8 md:p-12 shadow-2xl rounded"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-jet" />
          </div>
          <h1 className="font-serif text-3xl text-jet mb-2">{CONFIG.brandName}</h1>
          <p className="font-sans text-sm text-gray-500">Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Username"
            placeholder="admin"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
            autoFocus
          />
          <Input
            type="password"
            label="Password"
            placeholder="Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            error={error}
          />
          <Button variant="primary" fullWidth type="submit" isLoading={isLoading}>
            Sign In
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
```

### `src/pages/admin/Dashboard.jsx`

Generic KPI dashboard. It expects `GET /admin/stats` to return whatever metrics
your shop cares about — the cards below read a few common ones and fall back to
`0`, so it won't break if a field is missing.

```jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/format';
import {
  Package, ShoppingCart, DollarSign, Users, RefreshCw, AlertCircle, ChevronRight,
} from 'lucide-react';

const StatCard = ({ title, value, subtitle, icon: Icon, accent = 'gold', to, loading }) => {
  const accents = {
    gold:  { ring: 'border-gold/20',   tint: 'bg-gold/5',   text: 'text-gold' },
    green: { ring: 'border-green-200', tint: 'bg-green-50', text: 'text-green-600' },
    blue:  { ring: 'border-blue-200',  tint: 'bg-blue-50',  text: 'text-blue-600' },
    rose:  { ring: 'border-rose-200',  tint: 'bg-rose-50',  text: 'text-rose-600' },
  };
  const a = accents[accent] || accents.gold;
  const inner = (
    <div className={`bg-white p-5 border ${a.ring} rounded shadow-sm hover:shadow-md transition-shadow flex items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-gray-500 mb-2">{title}</p>
        {loading
          ? <div className="h-8 w-24 bg-gray-100 animate-pulse rounded" />
          : <h3 className="font-serif text-2xl md:text-3xl text-jet mb-1 truncate">{value}</h3>}
        {subtitle && <p className="font-sans text-xs text-gray-400 truncate">{subtitle}</p>}
      </div>
      <div className={`p-2.5 ${a.tint} rounded shrink-0`}>
        <Icon className={`w-5 h-5 ${a.text}`} />
      </div>
    </div>
  );
  return to ? <Link to={to} className="block">{inner}</Link> : inner;
};

const Panel = ({ title, action, children }) => (
  <div className="bg-white border border-gray-200 rounded shadow-sm">
    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
      <h2 className="font-serif text-lg text-jet">{title}</h2>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const [statsData, ordersData] = await Promise.all([
        adminApi.stats(),
        adminApi.orders.list({ limit: 5, page: 1 }).catch(() => ({ items: [] })),
      ]);
      setStats(statsData);
      setRecent(ordersData.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRefresh = () => { setRefreshing(true); load(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-jet mb-1">Dashboard</h1>
          <p className="font-sans text-xs text-gray-500">
            {loading ? 'Loading…' : `Last updated ${new Date().toLocaleTimeString()}`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 hover:border-gold hover:text-gold transition-colors font-sans text-xs font-semibold rounded"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Revenue" value={formatCurrency(stats?.totalRevenue ?? 0)}
          icon={DollarSign} accent="gold" loading={loading} />
        <StatCard title="Orders" value={stats?.totalOrders ?? 0}
          icon={ShoppingCart} accent="blue" to="/admin/orders" loading={loading} />
        <StatCard title="Products" value={stats?.totalProducts ?? 0}
          icon={Package} accent="rose" to="/admin/products" loading={loading} />
        <StatCard title="Customers" value={stats?.totalCustomers ?? 0}
          icon={Users} accent="green" to="/admin/customers" loading={loading} />
      </div>

      <Panel
        title="Recent Orders"
        action={
          <Link to="/admin/orders" className="font-sans text-xs text-gold hover:text-jet flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        }
      >
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded" />)}
          </div>
        ) : !recent.length ? (
          <p className="font-sans text-sm text-gray-400 text-center py-4">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recent.map((o) => (
              <li key={o.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-sans text-sm text-jet font-medium truncate">{o.customer?.name || '—'}</div>
                  <div className="font-sans text-[11px] text-gray-500 truncate">
                    {o.id} · {formatDate(o.createdAt)}
                  </div>
                </div>
                <div className="font-sans text-sm font-bold text-jet shrink-0">
                  {formatCurrency(o.total ?? 0)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};

export default Dashboard;
```

### `src/pages/admin/ResourceList.jsx`

The reusable **list page**. Configure it with a few props and it gives you
search, pagination, an add button, a table, and delete — for any resource.

```jsx
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

/**
 * Generic admin list page.
 *
 * @param {object}   props
 * @param {string}   props.title        e.g. "Products"
 * @param {string}   props.basePath     e.g. "/admin/products"
 * @param {object}   props.api          a createResourceApi(...) object
 * @param {Array}    props.columns      [{ key, label, render? }]
 * @param {Function} [props.getId]      row → id (default: row.id)
 */
const ResourceList = ({ title, basePath, api, columns, getId = (r) => r.id }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.list({ search: search || undefined, page, limit: 20 });
      setRows(data.items || []);
      setMeta(data.meta || { total: (data.items || []).length, page, limit: 20 });
    } catch (err) {
      setError(err.message || `Failed to load ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [api, search, page, title]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item? This cannot be undone.')) return;
    try {
      await api.delete(id);
      showToast('Deleted', 'success');
      load();
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 20)));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-3xl text-jet">{title}</h1>
        <Link
          to={`${basePath}/new`}
          className="inline-flex items-center gap-2 bg-gold text-white px-4 py-2.5 rounded font-sans text-sm font-medium hover:bg-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" /> Add {title.replace(/s$/, '')}
        </Link>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder={`Search ${title.toLowerCase()}…`}
          className="w-full bg-white border border-gray-200 focus:border-gold rounded ps-9 pe-3 py-2.5 font-sans text-sm outline-none"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-4 rounded text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-start">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 text-start font-sans text-[11px] uppercase tracking-wide text-gray-500">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3 text-end font-sans text-[11px] uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td colSpan={columns.length + 1} className="px-4 py-4">
                    <div className="h-5 bg-gray-100 animate-pulse rounded" />
                  </td>
                </tr>
              ))
            ) : !rows.length ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-gray-400 font-sans">
                  No {title.toLowerCase()} found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const id = getId(row);
                return (
                  <tr key={id} className="border-b border-gray-50 hover:bg-gold/[0.03] transition-colors">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 font-sans text-jet">
                        {c.render ? c.render(row) : row[c.key]}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`${basePath}/edit/${id}`)}
                          className="p-2 text-gray-400 hover:text-gold transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-40 hover:border-gold"
          >
            Prev
          </button>
          <span className="font-sans text-sm text-gray-500">Page {page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-40 hover:border-gold"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ResourceList;
```

**Usage** — create a thin wrapper per resource (e.g. `pages/admin/Products.jsx`):

```jsx
import ResourceList from './ResourceList';
import { adminApi } from '../../lib/api';
import { formatCurrency } from '../../lib/format';

const Products = () => (
  <ResourceList
    title="Products"
    basePath="/admin/products"
    api={adminApi.products}
    columns={[
      { key: 'name',  label: 'Name' },
      { key: 'sku',   label: 'SKU' },
      { key: 'price', label: 'Price', render: (r) => formatCurrency(r.price) },
      { key: 'active', label: 'Status', render: (r) => (r.active ? 'Active' : 'Hidden') },
    ]}
  />
);

export default Products;
```

### `src/pages/admin/ResourceForm.jsx`

The reusable **create/edit page**. Pass a field schema and it builds the form,
loads the record on edit, and saves via the resource API.

```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

/**
 * Generic create/edit form.
 *
 * @param {object}   props
 * @param {string}   props.title        singular, e.g. "Product"
 * @param {string}   props.basePath     e.g. "/admin/products"
 * @param {object}   props.api          a createResourceApi(...) object
 * @param {Array}    props.fields       [{ name, label, type?, multiline?, options?, required? }]
 *                                       type: 'text' | 'number' | 'checkbox' | 'select' | 'textarea'
 */
const ResourceForm = ({ title, basePath, api, fields }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEdit = Boolean(id);

  const blank = Object.fromEntries(
    fields.map((f) => [f.name, f.type === 'checkbox' ? false : ''])
  );
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api.getById(id)
      .then((data) => setForm({ ...blank, ...data }))
      .catch((err) => showToast(err.message || 'Failed to load', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) await api.update(id, form);
      else await api.create(form);
      showToast(`${title} saved`, 'success');
      navigate(basePath);
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-64 bg-gray-100 animate-pulse rounded" />;
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate(basePath)}
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gold transition-colors font-sans text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to {title}s
      </button>

      <h1 className="font-serif text-3xl text-jet mb-6">
        {isEdit ? `Edit ${title}` : `New ${title}`}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded shadow-sm p-6 flex flex-col gap-4">
        {fields.map((f) => {
          if (f.type === 'checkbox') {
            return (
              <label key={f.name} className="flex items-center gap-2 font-sans text-sm text-jet">
                <input
                  type="checkbox"
                  checked={!!form[f.name]}
                  onChange={(e) => setField(f.name, e.target.checked)}
                  className="w-4 h-4 accent-gold"
                />
                {f.label}
              </label>
            );
          }
          if (f.type === 'select') {
            return (
              <div key={f.name} className="flex flex-col gap-1">
                <label className="font-sans font-medium text-xs text-gray-500">{f.label}</label>
                <select
                  value={form[f.name]}
                  onChange={(e) => setField(f.name, e.target.value)}
                  className="w-full bg-white border border-gray-200 focus:border-gold rounded p-3 font-sans text-sm outline-none"
                >
                  <option value="">—</option>
                  {(f.options || []).map((opt) => (
                    <option key={opt.value ?? opt} value={opt.value ?? opt}>
                      {opt.label ?? opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          }
          return (
            <Input
              key={f.name}
              label={f.label}
              type={f.type === 'number' ? 'number' : 'text'}
              multiline={f.type === 'textarea'}
              required={f.required}
              value={form[f.name] ?? ''}
              onChange={(e) =>
                setField(f.name, f.type === 'number' ? e.target.valueAsNumber || 0 : e.target.value)
              }
            />
          );
        })}

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" variant="primary" isLoading={saving}>
            {isEdit ? 'Save changes' : `Create ${title}`}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(basePath)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ResourceForm;
```

**Usage** — `pages/admin/ProductEdit.jsx`:

```jsx
import ResourceForm from './ResourceForm';
import { adminApi } from '../../lib/api';

const ProductEdit = () => (
  <ResourceForm
    title="Product"
    basePath="/admin/products"
    api={adminApi.products}
    fields={[
      { name: 'name',  label: 'Name', required: true },
      { name: 'sku',   label: 'SKU' },
      { name: 'price', label: 'Price', type: 'number' },
      { name: 'category', label: 'Category', type: 'select',
        options: ['men', 'women', 'unisex'] },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'active', label: 'Active (visible in shop)', type: 'checkbox' },
    ]}
  />
);

export default ProductEdit;
```

### `src/pages/admin/Settings.jsx`

```jsx
import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

const Settings = () => {
  const { showToast } = useToast();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.settings.get()
      .then(setForm)
      .catch((err) => showToast(err.message || 'Failed to load settings', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.settings.update(form);
      showToast('Settings saved', 'success');
    } catch (err) {
      showToast(err.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-64 bg-gray-100 animate-pulse rounded" />;

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl text-jet mb-6">Settings</h1>
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded shadow-sm p-6 flex flex-col gap-4">
        <Input label="Store phone" value={form.contactPhone ?? ''}
          onChange={(e) => setField('contactPhone', e.target.value)} />
        <Input label="WhatsApp number" value={form.whatsappNumber ?? ''}
          onChange={(e) => setField('whatsappNumber', e.target.value)} />
        <Input label="Delivery fee" type="number" value={form.deliveryFee ?? 0}
          onChange={(e) => setField('deliveryFee', e.target.valueAsNumber || 0)} />
        <div className="pt-2">
          <Button type="submit" variant="primary" isLoading={saving}>Save settings</Button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
```

---

## 8. Routing

Wrap the app in the three providers and mount the admin routes behind
`ProtectedRoute`. Minimal `App.jsx`:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './context/ProtectedRoute';

import AdminLayout from './components/admin/AdminLayout';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import ProductEdit from './pages/admin/ProductEdit';
import Settings from './pages/admin/Settings';
// ...import Orders, Customers, etc. the same way

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public login (outside the protected layout) */}
            <Route path="/admin/login" element={<Login />} />

            {/* Everything under /admin requires a valid token */}
            <Route path="/admin" element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="products/new" element={<ProductEdit />} />
                <Route path="products/edit/:id" element={<ProductEdit />} />
                <Route path="settings" element={<Settings />} />
                {/* add Orders, Customers, … here */}
              </Route>
            </Route>

            {/* your public storefront routes go here */}
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
```

---

## 9. Backend contract

The frontend works with **any** backend that follows these conventions. All
responses use a consistent envelope.

**Success:**
```json
{ "ok": true, "data": { /* ... */ } }
```

**Error:**
```json
{ "ok": false, "error": { "code": "INVALID_CREDENTIALS", "message": "Invalid username or password" } }
```

**Auth:** send the token as `Authorization: Bearer <token>` on every admin call.
A `401` clears the token and bounces to `/admin/login`.

| Method & path                       | Used by            | Returns (`data`)                                  |
| ----------------------------------- | ------------------ | ------------------------------------------------- |
| `POST /auth/login`                  | Login              | `{ token, username }`                             |
| `GET /auth/me`                      | (optional)         | `{ username }`                                    |
| `GET /admin/stats`                  | Dashboard          | `{ totalRevenue, totalOrders, totalProducts, … }` |
| `GET /admin/:resource?page&limit&search` | ResourceList  | `{ items: [...], meta: { total, page, limit } }`  |
| `GET /admin/:resource/:id`          | ResourceForm (edit)| the record object                                 |
| `POST /admin/:resource`             | ResourceForm (new) | the created record                                |
| `PUT /admin/:resource/:id`          | ResourceForm (edit)| the updated record                                |
| `DELETE /admin/:resource/:id`       | ResourceList       | `{ deleted: true }`                               |
| `GET /admin/settings`               | Settings           | settings object                                   |
| `PUT /admin/settings`               | Settings           | updated settings                                  |

> List responses should be `{ items, meta }`. If your backend returns a bare
> array, change the two lines in `ResourceList.load()` that read `data.items` /
> `data.meta`.

---

## 10. How to customize for your shop

**Re-brand:** edit `src/config.js` (`brandName`, currency) and the color tokens
in `tailwind.config.js` (`gold` is the accent). That's the whole visual identity.

**Change the sections:** edit `NAV_ITEMS` in `AdminLayout.jsx` and the matching
`<Route>`s in `App.jsx`. Pick icons from
[lucide.dev](https://lucide.dev/icons).

**Add a new resource (e.g. "Categories") in 4 steps:**

1. Register the API:
   ```js
   // src/lib/api.js → adminApi
   categories: createResourceApi('categories'),
   ```
2. List page — `pages/admin/Categories.jsx`:
   ```jsx
   import ResourceList from './ResourceList';
   import { adminApi } from '../../lib/api';
   const Categories = () => (
     <ResourceList title="Categories" basePath="/admin/categories"
       api={adminApi.categories}
       columns={[{ key: 'name', label: 'Name' }, { key: 'slug', label: 'Slug' }]} />
   );
   export default Categories;
   ```
3. Edit page — `pages/admin/CategoryEdit.jsx`:
   ```jsx
   import ResourceForm from './ResourceForm';
   import { adminApi } from '../../lib/api';
   const CategoryEdit = () => (
     <ResourceForm title="Category" basePath="/admin/categories"
       api={adminApi.categories}
       fields={[{ name: 'name', label: 'Name', required: true }, { name: 'slug', label: 'Slug' }]} />
   );
   export default CategoryEdit;
   ```
4. Wire routes + nav:
   ```jsx
   // App.jsx
   <Route path="categories" element={<Categories />} />
   <Route path="categories/new" element={<CategoryEdit />} />
   <Route path="categories/edit/:id" element={<CategoryEdit />} />
   // AdminLayout.jsx NAV_ITEMS
   { label: 'Categories', path: '/admin/categories', icon: Tags },
   ```

That's the whole pattern — every resource is one API line, one list wrapper, one
form wrapper, and three routes.

---

## 11. Optional: real-time "new order" badge

If your backend exposes a Server-Sent Events stream of new orders, you can show
a live unread badge on the Orders nav item. SSE can't send `Authorization`
headers, so the token goes in the query string and the server verifies it there.

Add to `AdminLayout.jsx`:

```jsx
import { useEffect, useRef } from 'react';

// inside the component:
const [newOrderCount, setNewOrderCount] = useState(0);
const esRef = useRef(null);
const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// initial unread count
useEffect(() => {
  const token = sessionStorage.getItem('adminToken');
  if (!token) return;
  fetch(`${BASE}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.json())
    .then((j) => setNewOrderCount(j.data?.ordersByStatus?.new ?? 0))
    .catch(() => {});
}, []);

// live stream
useEffect(() => {
  const token = sessionStorage.getItem('adminToken');
  if (!token) return;
  const es = new EventSource(`${BASE}/admin/orders/events?token=${encodeURIComponent(token)}`);
  esRef.current = es;
  es.addEventListener('new-order', () => setNewOrderCount((n) => n + 1));
  // EventSource auto-reconnects every ~3s on error and would hammer the API —
  // close it instead and let the admin refresh manually.
  es.onerror = () => { es.close(); esRef.current = null; };
  return () => { es.close(); esRef.current = null; };
}, []);

// clear the badge when the admin opens Orders
useEffect(() => {
  if (location.pathname === '/admin/orders') setNewOrderCount(0);
}, [location.pathname]);
```

Then render a badge next to the Orders item in your `NavLink`:

```jsx
{item.path === '/admin/orders' && newOrderCount > 0 && (
  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
    {newOrderCount > 99 ? '99+' : newOrderCount}
  </span>
)}
```

Backend side (any framework): on `GET /admin/orders/events`, verify
`req.query.token`, then keep the connection open and `write` an
`event: new-order\ndata: {...}\n\n` frame whenever an order is created.

---

*Generated from the Al Sultan Perfumes admin panel — generalized into a
shop-agnostic frontend template.*
```
