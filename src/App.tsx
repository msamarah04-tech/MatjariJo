import { RouterProvider, createHashRouter, Outlet, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/Toast';
import { RequireRole } from '@/components/layout/RequireRole';
import Landing from '@/routes/Landing';
import SignIn from '@/routes/SignIn';
import OwnerAccess from '@/routes/OwnerAccess';
import Platform from '@/routes/platform/Platform';
import Admin from '@/routes/admin/Admin';
import NewStore from '@/routes/admin/NewStore';
import StorefrontRoot from '@/routes/storefront/Storefront';

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
          <RequireRole role="SHOP_OWNER">
            <Admin />
          </RequireRole>
        ),
      },
      {
        // Public storefronts are standalone and do not require auth.
        path: '/s/:slug/*',
        element: <StorefrontRoot />,
      },
    ]
  }
]);

export default function App() {
  return <RouterProvider router={router} />;
}
