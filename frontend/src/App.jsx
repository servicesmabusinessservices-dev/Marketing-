import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from './context/ThemeContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { hasSession } from './utils/session';
import ErrorBoundary from './components/ui/ErrorBoundary.jsx';
import PageSkeleton from './components/ui/PageSkeleton.jsx';
import GlobalCardEffects from './components/ui/GlobalCardEffects.jsx';
import './App.css';

// ── Lazy-loaded page components (code-split per route) ────────────────────────
const LandingPage       = lazy(() => import('./features/marketing/components/LandingPage.jsx'));
const AccountSelection  = lazy(() => import('./features/auth/components/AccountSelection.jsx'));
const EmailList         = lazy(() => import('./features/email/components/EmailList.jsx'));
const Dashboard         = lazy(() => import('./features/dashboard/components/Dashboard.jsx'));
const Marketing         = lazy(() => import('./features/marketing/components/Marketing.jsx'));
const TemplateEditor    = lazy(() => import('./features/marketing/components/TemplateEditor.jsx'));
const PipelineBoard     = lazy(() => import('./features/pipeline/components/PipelineBoard.jsx'));
const AnalyticsDashboard = lazy(() => import('./features/analytics/components/AnalyticsDashboard.jsx'));
const BulkEmail         = lazy(() => import('./features/email/components/BulkEmail.jsx'));
const ContactProfile    = lazy(() => import('./features/marketing/components/ContactProfile.jsx'));
const JourneyBuilder    = lazy(() => import('./features/marketing/components/JourneyBuilder.jsx'));
const SuppressionList   = lazy(() => import('./features/marketing/components/SuppressionList.jsx'));
const PrivacyPolicy     = lazy(() => import('./features/legal/PrivacyPolicy.jsx'));
const TermsOfService    = lazy(() => import('./features/legal/TermsOfService.jsx'));
const SecurityOverview  = lazy(() => import('./features/legal/SecurityOverview.jsx'));
const NotFound          = lazy(() => import('./features/legal/NotFound.jsx'));
const WorkspaceLayout   = lazy(() => import('./components/layout/WorkspaceLayout.jsx'));
const Footer            = lazy(() => import('./components/layout/Footer.jsx'));

// ── React Query client ────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30 s before a query is considered stale
      gcTime: 5 * 60_000,          // 5 min before unused cache is collected
      retry: 2,
      refetchOnWindowFocus: false, // avoids noisy re-fetches when switching tabs
    },
  },
});

// ── Route guards ──────────────────────────────────────────────────────────────
const PublicWorkspace = () => {
  if (hasSession()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
};

const ProtectedWorkspace = () => {
  if (!hasSession()) {
    return <Navigate to="/connect" replace />;
  }
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WorkspaceLayout />
    </Suspense>
  );
};

// Public layout with footer for marketing pages
const PublicLayout = () => (
  <>
    <Outlet />
    <Suspense fallback={null}>
      <Footer />
    </Suspense>
  </>
);

// ── Data router (required for useBlocker / useUnsavedChangesWarning) ──────────
const router = createBrowserRouter([
  {
    element: <ErrorBoundary><Outlet /></ErrorBoundary>,
    children: [
      // Public marketing pages with footer
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <Suspense fallback={<PageSkeleton />}><LandingPage /></Suspense> },
          { path: '/privacy', element: <Suspense fallback={<PageSkeleton />}><PrivacyPolicy /></Suspense> },
          { path: '/terms', element: <Suspense fallback={<PageSkeleton />}><TermsOfService /></Suspense> },
          { path: '/security', element: <Suspense fallback={<PageSkeleton />}><SecurityOverview /></Suspense> },
        ],
      },
      // Auth pages (no footer)
      {
        element: <PublicWorkspace />,
        children: [
          { path: '/connect', element: <Suspense fallback={<PageSkeleton />}><AccountSelection /></Suspense> },
          { path: '/auth-success', element: <Suspense fallback={<PageSkeleton />}><AccountSelection /></Suspense> },
          { path: '/auth-error', element: <Suspense fallback={<PageSkeleton />}><AccountSelection /></Suspense> },
        ],
      },
      // Protected workspace pages
      {
        element: <ProtectedWorkspace />,
        children: [
          { path: '/dashboard', element: <ErrorBoundary><Suspense fallback={<PageSkeleton />}><Dashboard /></Suspense></ErrorBoundary> },
          { path: '/emails', element: <ErrorBoundary><Suspense fallback={<PageSkeleton />}><EmailList /></Suspense></ErrorBoundary> },
          { path: '/emails/bulk', element: <ErrorBoundary><Suspense fallback={<PageSkeleton />}><BulkEmail mode="page" /></Suspense></ErrorBoundary> },
          { path: '/email/:emailId', element: <ErrorBoundary><Suspense fallback={<PageSkeleton />}><EmailList /></Suspense></ErrorBoundary> },
          { path: '/marketing', element: <ErrorBoundary><Suspense fallback={<PageSkeleton />}><Marketing /></Suspense></ErrorBoundary> },
          { path: '/marketing/template-editor', element: <ErrorBoundary><Suspense fallback={<PageSkeleton />}><TemplateEditor /></Suspense></ErrorBoundary> },
          { path: '/marketing/pipeline', element: <ErrorBoundary><Suspense fallback={<PageSkeleton />}><PipelineBoard /></Suspense></ErrorBoundary> },
          { path: '/marketing/analytics', element: <ErrorBoundary><Suspense fallback={<PageSkeleton />}><AnalyticsDashboard /></Suspense></ErrorBoundary> },
          { path: '/marketing/contacts/:contactId', element: <ErrorBoundary><Suspense fallback={<PageSkeleton />}><ContactProfile /></Suspense></ErrorBoundary> },
          { path: '/marketing/journeys/:journeyId', element: <ErrorBoundary><Suspense fallback={<PageSkeleton />}><JourneyBuilder /></Suspense></ErrorBoundary> },
          { path: '/marketing/suppression', element: <ErrorBoundary><Suspense fallback={<PageSkeleton />}><SuppressionList /></Suspense></ErrorBoundary> },
        ],
      },
      // 404 page
      { path: '*', element: <Suspense fallback={<PageSkeleton />}><NotFound /></Suspense> },
    ],
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FeedbackProvider>
          <a className="skip-link" href="#main-content">Skip to main content</a>
          <div className="app-shell">
            <GlobalCardEffects />
            <RouterProvider router={router} />
          </div>
        </FeedbackProvider>
      </ThemeProvider>
      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}

export default App;
