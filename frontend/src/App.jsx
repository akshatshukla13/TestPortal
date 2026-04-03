import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import './App.css';
import { api } from './api';
import { parseRoute } from './router';
import { setAuth, clearAuth } from './store/authSlice';
import AuthPanel from './components/AuthPanel';
import StudentLayout from './components/student/StudentLayout';
import DashboardPage from './pages/student/DashboardPage';
import ExamPage from './pages/student/ExamPage';
import ReportPage from './pages/student/ReportPage';
import AdminPage from './pages/admin/AdminPage';
import BookmarksPage from './pages/student/BookmarksPage';
import DocumentsPage from './pages/student/DocumentsPage';
import VideoPage from './pages/student/VideoPage';
import CurrentAffairsPage from './pages/student/CurrentAffairsPage';
import AnnouncementsPage from './pages/student/AnnouncementsPage';
import LoadingBar from './components/ui/LoadingBar';

function App() {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const [route, setRoute] = useState(parseRoute());
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    function onHashChange() {
      setRoute(parseRoute());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const payload = { email: authForm.email, password: authForm.password };
      const response =
        authMode === 'signup'
          ? await api.signup({ ...payload, name: authForm.name, role: authForm.role })
          : await api.login(payload);

      dispatch(setAuth({ token: response.token, user: response.user }));
      window.location.hash = '#/dashboard';
      setMessage('Login successful.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    dispatch(clearAuth());
    setMessage('Logged out.');
  }

  function renderStudentPage() {
    if (route.page === 'report') {
      return (
        <ReportPage
          token={token}
          tab={route.tab}
          initialTestId={route.testId}
          setMessage={setMessage}
        />
      );
    }
    if (route.page === 'bookmarks') return <BookmarksPage token={token} />;
    if (route.page === 'documents') return <DocumentsPage />;
    if (route.page === 'video') return <VideoPage />;
    if (route.page === 'current-affairs') return <CurrentAffairsPage />;
    if (route.page === 'announcements') return <AnnouncementsPage />;
    return <DashboardPage token={token} setMessage={setMessage} />;
  }

  function renderContent() {
    if (!token) {
      return (
        <main className="w-[min(1600px,95vw)] mx-auto py-5 px-0">
          {message && (
            <p className="mb-4 px-3.5 py-3 rounded-xl border border-[var(--line)] bg-white" role="alert">
              {message}
            </p>
          )}
          <AuthPanel
            authMode={authMode}
            authForm={authForm}
            loading={loading}
            onMode={setAuthMode}
            onChange={(key, value) => setAuthForm((prev) => ({ ...prev, [key]: value }))}
            onSubmit={handleAuthSubmit}
          />
        </main>
      );
    }

    if (isAdmin) {
      return (
        <main className="w-[min(1600px,95vw)] mx-auto py-5 px-0">
          {message && (
            <p className="mb-4 px-3.5 py-3 rounded-xl border border-[var(--line)] bg-white" role="alert">
              {message}
            </p>
          )}
          <AdminPage token={token} setMessage={setMessage} onLogout={logout} />
        </main>
      );
    }

    if (route.page === 'test') {
      return <ExamPage token={token} testId={route.testId} setMessage={setMessage} />;
    }

    return (
      <>
        <StudentLayout
          routePage={route.page}
          user={user}
          onLogout={logout}
        >
          {message && (
            <p className="mb-4 px-3.5 py-3 rounded-xl border border-[var(--line)] bg-white" role="alert">
              {message}
            </p>
          )}
          {renderStudentPage()}
        </StudentLayout>
      </>
    );
  }

  return (
    <>
      <LoadingBar />
      {renderContent()}
    </>
  );
}

export default App;
