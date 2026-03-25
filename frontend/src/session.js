export const AUTH_KEY = 'test-portal-auth';

export function readAuth() {
  const saved = localStorage.getItem(AUTH_KEY);
  if (!saved) return { token: null, user: null };

  try {
    return JSON.parse(saved);
  } catch {
    return { token: null, user: null };
  }
}

export function writeAuth(auth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}
