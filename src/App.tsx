import { RouterProvider, createHashRouter, Outlet, Navigate, useParams } from 'react-router-dom';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { getTenantSlug } from '@/lib/tenant';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api/queries';
import { LanguageProvider } from '@/lib/i18n';
import { Toaster } from '@/components/ui/Toast';
import { RequireRole } from '@/components/layout/RequireRole';
import { useStore } from '@/lib/store';
import Landing from '@/routes/Landing';
import SignIn from '@/routes/SignIn';
import ForgotPassword from '@/routes/ForgotPassword';
import ResetPassword from '@/routes/ResetPassword';
import OwnerAccess from '@/routes/OwnerAccess';
import Platform from '@/routes/platform/Platform';
import Admin from '@/routes/admin/Admin';
import NewStore from '@/routes/admin/NewStore';
import HowItWorks from '@/routes/HowItWorks';
import Brands from '@/routes/Brands';
import Pricing from '@/routes/Pricing';
import { Privacy, Terms } from '@/routes/Legal';

const StorefrontRoot = lazy(() => import('@/routes/storefront/Storefront'));

/**
 * Root Layout - ensures Toaster and other global providers wrap all routes
 */
function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

const storefrontElement = (
  <Suspense fallback={<div className="min-h-screen bg-neutral-100" />}>
    <StorefrontRoot />
  </Suspense>
);

// On a tenant host every path must stay inside that store; navigating to
// another store's slug bounces back to the tenant's own storefront.
function TenantGuard({ tenant, children }: { tenant: string; children: ReactNode }) {
  const { slug } = useParams();
  if (slug !== tenant) return <Navigate to={`/s/${tenant}`} replace />;
  return <>{children}</>;
}

// Tenant hosts (borz.matjari.jo, borz.localhost) serve only that store's
// storefront; the landing page, sign-in, admin, and platform dashboards live
// on the main domain.
const tenantRouter = (tenant: string) => createHashRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/s/:slug/*',
        element: <TenantGuard tenant={tenant}>{storefrontElement}</TenantGuard>,
      },
      {
        path: '*',
        element: <Navigate to={`/s/${tenant}`} replace />,
      },
    ],
  },
]);

const mainRouter = () => createHashRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <Landing />,
      },
      {
        path: '/sign-in',
        element: <SignIn />,
      },
      {
        path: '/forgot-password',
        element: <ForgotPassword />,
      },
      {
        path: '/reset-password',
        element: <ResetPassword />,
      },
      {
        path: '/owner-access',
        element: <OwnerAccess />,
      },
      {
        path: '/platform/*',
        element: (
          <RequireRole role="PLATFORM_OWNER">
            <Platform />
          </RequireRole>
        ),
      },
      {
        path: '/how-it-works',
        element: <HowItWorks />,
      },
      {
        path: '/brands',
        element: <Brands />,
      },
      {
        path: '/pricing',
        element: <Pricing />,
      },
      {
        path: '/privacy',
        element: <Privacy />,
      },
      {
        path: '/terms',
        element: <Terms />,
      },
      {
        path: '/request-website',
        element: <NewStore />,
      },
      {
        path: '/create-shop',
        element: <Navigate to="/request-website" replace />,
      },
      {
        path: '/admin/new',
        element: <Navigate to="/request-website" replace />,
      },
      {
        path: '/admin/*',
        element: (
          // Platform owners can view any store's admin (the platform dashboard links into it);
          // the admin shell enforces per-store ownership for shop owners.
          <RequireRole role={['SHOP_OWNER', 'PLATFORM_OWNER']}>
            <Admin />
          </RequireRole>
        ),
      },
      {
        // Public storefronts are standalone and do not require auth.
        path: '/s/:slug/*',
        element: storefrontElement,
      },
    ]
  }
]);

const tenantSlug = getTenantSlug();
const router = tenantSlug ? tenantRouter(tenantSlug) : mainRouter();

export default function App() {
  const initializeBackend = useStore((s) => s.initializeBackend);

  useEffect(() => {
    initializeBackend();
  }, [initializeBackend]);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <RouterProvider router={router} />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
