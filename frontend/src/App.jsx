import { useEffect, useState } from 'react';
import './App.css';
import { api } from './api';
import { parseRoute } from './router';
import { readAuth, writeAuth } from './session';
import AuthPanel from './components/AuthPanel';
import StudentLayout from './components/student/StudentLayout';
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
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  const isAdmin = auth.user?.role === 'admin';

  useEffect(() => {
    writeAuth(auth);
  }, [auth]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

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
      return (
        <StudentLayout routePage={route.page}>
          <ExamPage token={auth.token} testId={route.testId} setMessage={setMessage} />
        </StudentLayout>
      );
    }

    if (route.page === 'report') {
      return (
        <StudentLayout routePage={route.page}>
          <ReportPage
            token={auth.token}
            tab={route.tab}
            initialTestId={route.testId}
            setMessage={setMessage}
          />
        </StudentLayout>
      );
    }

    return (
      <StudentLayout routePage={route.page}>
        <DashboardPage token={auth.token} setMessage={setMessage} />
      </StudentLayout>
    );
  }

  return (
    <main className="w-[min(1600px,95vw)] mx-auto py-5 px-0">
      <header className="flex justify-between items-start gap-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-[1.8rem] leading-none">🎓</span>
          <div>
            <p className="m-0 text-[var(--muted)] tracking-[0.12em] uppercase text-[0.76rem]">GATE EXAM MOCK PORTAL</p>
            <h1>{auth.user ? `${auth.user.name}'s Workspace` : 'Exam Forge'}</h1>
          </div>
        </div>
        <div className="flex gap-2.5 items-center">
          <button
            type="button"
            className="secondary text-[1.1rem] px-[0.6rem] py-[0.4rem] rounded-full"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {auth.user && (
            <>
              <span className="inline-flex items-center rounded-full border border-[var(--line)] px-2 py-0.5 text-xs bg-white">{auth.user.role.toUpperCase()}</span>
              <span className="text-xs text-[var(--muted)] max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">{auth.user.email}</span>
              <button type="button" className="secondary" onClick={logout}>
                Logout
              </button>
            </>
          )}
        </div>
      </header>

      {message && (
        <p className="mb-4 px-3.5 py-3 rounded-xl border border-[var(--line)] bg-white" role="alert">
          {message}
        </p>
      )}
      {renderContent()}
    </main>
  );
}

export default App;
