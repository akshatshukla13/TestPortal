import { useEffect, useState } from 'react';
import './App.css';
import { api } from './api';
import { parseRoute } from './router';
import { readAuth, writeAuth } from './session';
import AuthPanel from './components/AuthPanel';
import DashboardPage from './pages/student/DashboardPage';
import ExamPage from './pages/student/ExamPage';
import ReportPage from './pages/student/ReportPage';
import AdminPage from './pages/admin/AdminPage';

function App() {
  const [auth, setAuth] = useState(() => readAuth());
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

  const isAdmin = auth.user?.role === 'admin';

  useEffect(() => {
    writeAuth(auth);
  }, [auth]);

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

      setAuth({ token: response.token, user: response.user });
      window.location.hash = '#/dashboard';
      setMessage('Login successful.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setAuth({ token: null, user: null });
    setMessage('Logged out.');
  }

  function renderContent() {
    if (!auth.token) {
      return (
        <AuthPanel
          authMode={authMode}
          authForm={authForm}
          loading={loading}
          onMode={setAuthMode}
          onChange={(key, value) => setAuthForm((prev) => ({ ...prev, [key]: value }))}
          onSubmit={handleAuthSubmit}
        />
      );
    }

    if (isAdmin) {
      return <AdminPage token={auth.token} setMessage={setMessage} />;
    }

    if (route.page === 'test') {
      return <ExamPage token={auth.token} testId={route.testId} setMessage={setMessage} />;
    }

    if (route.page === 'report') {
      return (
        <ReportPage
          token={auth.token}
          tab={route.tab}
          initialTestId={route.testId}
          setMessage={setMessage}
        />
      );
    }

    return <DashboardPage token={auth.token} setMessage={setMessage} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">GATE EXAM MOCK PORTAL</p>
          <h1>{auth.user ? `${auth.user.name} Workspace` : 'Exam Forge'}</h1>
        </div>
        {auth.user && (
          <div className="topbar-actions">
            <span className="pill">{auth.user.role.toUpperCase()}</span>
            <button type="button" className="secondary" onClick={logout}>
              Logout
            </button>
          </div>
        )}
      </header>

      {message && <p className="flash">{message}</p>}
      {renderContent()}
    </main>
  );
}

export default App;
