import Card from './ui/Card';

export default function AuthPanel({ authMode, authForm, loading, onMode, onChange, onSubmit }) {
  return (
    <Card className="p-4 max-w-[520px] mx-auto mt-8">
      <h2>GATE Mock Test Portal</h2>
      <p className="text-[var(--muted)] m-0">Login to take scheduled tests in secure mode and view full analytics.</p>

      <div className="flex gap-2 my-3.5">
        <button
          type="button"
          className={authMode === 'login' ? 'flex-1 bg-[var(--accent)] text-white border-[var(--accent)]' : 'flex-1 secondary'}
          onClick={() => onMode('login')}
        >
          Login
        </button>
        <button
          type="button"
          className={authMode === 'signup' ? 'flex-1 bg-[var(--accent)] text-white border-[var(--accent)]' : 'flex-1 secondary'}
          onClick={() => onMode('signup')}
        >
          Signup
        </button>
      </div>

      <form className="grid gap-3" onSubmit={onSubmit}>
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
    </Card>
  );
}
