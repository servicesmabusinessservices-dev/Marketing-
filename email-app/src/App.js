import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { hasSession } from './utils/session';
import AccountSelection from './components/AccountSelection';
import EmailList from './components/EmailList';
import Dashboard from './components/Dashboard';
import Marketing from './components/Marketing';
import TemplateEditor from './components/TemplateEditor';
import PipelineBoard from './components/PipelineBoard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import BulkEmail from './components/BulkEmail';
import ContactProfile from './components/ContactProfile';
import JourneyBuilder from './components/JourneyBuilder';
import SuppressionList from './components/SuppressionList';
import WorkspaceLayout from './components/layout/WorkspaceLayout';
import './App.css';

const ProtectedWorkspace = () => {
  if (!hasSession()) {
    return <Navigate to="/" replace />;
  }

  return <WorkspaceLayout />;
};

function App() {
  return (
    <ThemeProvider>
      <FeedbackProvider>
        <div className="app-shell">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<AccountSelection />} />
              <Route path="/auth-success" element={<AccountSelection />} />
              <Route path="/auth-error" element={<AccountSelection />} />

              <Route element={<ProtectedWorkspace />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/emails" element={<EmailList />} />
                <Route path="/emails/bulk" element={<BulkEmail mode="page" />} />
                <Route path="/email/:emailId" element={<EmailList />} />
                <Route path="/marketing" element={<Marketing />} />
                <Route path="/marketing/template-editor" element={<TemplateEditor />} />
                <Route path="/marketing/pipeline" element={<PipelineBoard />} />
                <Route path="/marketing/analytics" element={<AnalyticsDashboard />} />
                <Route path="/marketing/contacts/:contactId" element={<ContactProfile />} />
                <Route path="/marketing/journeys/:journeyId" element={<JourneyBuilder />} />
                <Route path="/marketing/suppression" element={<SuppressionList />} />
              </Route>

              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </BrowserRouter>
        </div>
      </FeedbackProvider>
    </ThemeProvider>
  );
}

export default App;
