export default function AuthPanel({ authMode, authForm, loading, onMode, onChange, onSubmit }) {
  return (
    <section className="card auth-card">
      <h2>GATE Mock Test Portal</h2>
      <p className="muted">Login to take scheduled tests in secure mode and view full analytics.</p>

      <div className="mode-switch">
        <button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => onMode('login')}>
          Login
        </button>
        <button type="button" className={authMode === 'signup' ? 'active' : ''} onClick={() => onMode('signup')}>
          Signup
        </button>
      </div>

      <form className="stack" onSubmit={onSubmit}>
        {authMode === 'signup' && (
          <label>
            Name
            <input value={authForm.name} onChange={(e) => onChange('name', e.target.value)} required />
          </label>
        )}

        <label>
          Email
          <input type="email" value={authForm.email} onChange={(e) => onChange('email', e.target.value)} required />
        </label>

        <label>
          Password
          <input
            type="password"
            value={authForm.password}
            onChange={(e) => onChange('password', e.target.value)}
            required
          />
        </label>

        {authMode === 'signup' && (
          <label>
            Role
            <select value={authForm.role} onChange={(e) => onChange('role', e.target.value)}>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create Account'}
        </button>
      </form>
    </section>
  );
}
