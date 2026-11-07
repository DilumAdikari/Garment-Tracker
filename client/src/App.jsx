import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Spinner from './components/Spinner';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IssuesPage from './pages/IssuesPage';
import IssueDetailPage from './pages/IssueDetailPage';
import ProductionPage from './pages/ProductionPage';
import PlantsPage from './pages/PlantsPage';
import StylesPage from './pages/StylesPage';
import JobSheetsPage from './pages/JobSheetsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import ActivityPage from './pages/ActivityPage';
import NotFoundPage from './pages/NotFoundPage';

/** Redirects to login when signed out; optionally restricts by role. */
function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner fullPage />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner fullPage />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="issues" element={<IssuesPage />} />
        <Route path="issues/:id" element={<IssueDetailPage />} />
        <Route path="production" element={<ProductionPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="activity" element={<ActivityPage />} />

        <Route path="plants" element={<Protected roles={['admin', 'manager']}><PlantsPage /></Protected>} />
        <Route path="styles" element={<Protected roles={['admin', 'manager']}><StylesPage /></Protected>} />
        <Route path="job-sheets" element={<Protected roles={['admin', 'manager']}><JobSheetsPage /></Protected>} />
        <Route path="users" element={<Protected roles={['admin']}><UsersPage /></Protected>} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
