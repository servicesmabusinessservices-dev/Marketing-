import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from './context/ThemeContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { hasSession } from './utils/session';
import ErrorBoundary from './components/ui/ErrorBoundary';
import PageSkeleton from './components/ui/PageSkeleton';
import './App.css';

// ── Lazy-loaded page components (code-split per route) ────────────────────────
const AccountSelection  = lazy(() => import('./components/AccountSelection'));
const EmailList         = lazy(() => import('./components/EmailList'));
const Dashboard         = lazy(() => import('./components/Dashboard'));
const Marketing         = lazy(() => import('./components/Marketing'));
const TemplateEditor    = lazy(() => import('./components/TemplateEditor'));
const PipelineBoard     = lazy(() => import('./components/PipelineBoard'));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const BulkEmail         = lazy(() => import('./components/BulkEmail'));
const ContactProfile    = lazy(() => import('./components/ContactProfile'));
const JourneyBuilder    = lazy(() => import('./components/JourneyBuilder'));
const SuppressionList   = lazy(() => import('./components/SuppressionList'));
const AuthLayout        = lazy(() => import('./components/layout/AuthLayout'));
const WorkspaceLayout   = lazy(() => import('./components/layout/WorkspaceLayout'));

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

// ── Protected workspace guard ─────────────────────────────────────────────────
const PublicWorkspace = () => {
  if (hasSession()) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AuthLayout />
    </Suspense>
  );
};

const ProtectedWorkspace = () => {
  if (!hasSession()) {
    return <Navigate to="/" replace />;
  }
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WorkspaceLayout />
    </Suspense>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FeedbackProvider>
          <div className="app-shell">
            <BrowserRouter>
              <ErrorBoundary>
                <Routes>
                  <Route element={<PublicWorkspace />}>
                    <Route
                      path="/"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <AccountSelection />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/auth-success"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <AccountSelection />
                        </Suspense>
                      }
                    />
                    <Route
                      path="/auth-error"
                      element={
                        <Suspense fallback={<PageSkeleton />}>
                          <AccountSelection />
                        </Suspense>
                      }
                    />
                  </Route>

                  <Route element={<ProtectedWorkspace />}>
                    <Route
                      path="/dashboard"
                      element={
                        <ErrorBoundary>
                          <Suspense fallback={<PageSkeleton />}>
                            <Dashboard />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/emails"
                      element={
                        <ErrorBoundary>
                          <Suspense fallback={<PageSkeleton />}>
                            <EmailList />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/emails/bulk"
                      element={
                        <ErrorBoundary>
                          <Suspense fallback={<PageSkeleton />}>
                            <BulkEmail mode="page" />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/email/:emailId"
                      element={
                        <ErrorBoundary>
                          <Suspense fallback={<PageSkeleton />}>
                            <EmailList />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/marketing"
                      element={
                        <ErrorBoundary>
                          <Suspense fallback={<PageSkeleton />}>
                            <Marketing />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/marketing/template-editor"
                      element={
                        <ErrorBoundary>
                          <Suspense fallback={<PageSkeleton />}>
                            <TemplateEditor />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/marketing/pipeline"
                      element={
                        <ErrorBoundary>
                          <Suspense fallback={<PageSkeleton />}>
                            <PipelineBoard />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/marketing/analytics"
                      element={
                        <ErrorBoundary>
                          <Suspense fallback={<PageSkeleton />}>
                            <AnalyticsDashboard />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/marketing/contacts/:contactId"
                      element={
                        <ErrorBoundary>
                          <Suspense fallback={<PageSkeleton />}>
                            <ContactProfile />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/marketing/journeys/:journeyId"
                      element={
                        <ErrorBoundary>
                          <Suspense fallback={<PageSkeleton />}>
                            <JourneyBuilder />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/marketing/suppression"
                      element={
                        <ErrorBoundary>
                          <Suspense fallback={<PageSkeleton />}>
                            <SuppressionList />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                  </Route>

                  <Route path="*" element={<Navigate to={hasSession() ? '/dashboard' : '/'} replace />} />
                </Routes>
              </ErrorBoundary>
            </BrowserRouter>
          </div>
        </FeedbackProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}

export default App;
