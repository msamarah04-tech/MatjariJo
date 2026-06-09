import { RouterProvider, createHashRouter, Outlet, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api/queries';
import { LanguageProvider } from '@/lib/i18n';
import { Toaster } from '@/components/ui/Toast';
import { RequireRole } from '@/components/layout/RequireRole';
import { useStore } from '@/lib/store';
import Landing from '@/routes/Landing';
import SignIn from '@/routes/SignIn';
import OwnerAccess from '@/routes/OwnerAccess';
import Platform from '@/routes/platform/Platform';
import Admin from '@/routes/admin/Admin';
import NewStore from '@/routes/admin/NewStore';

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

const router = createHashRouter([
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
        element: (
          <Suspense fallback={<div className="min-h-screen bg-neutral-100" />}>
            <StorefrontRoot />
          </Suspense>
        ),
      },
    ]
  }
]);

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
