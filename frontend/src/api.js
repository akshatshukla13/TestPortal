const API_BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, { method = 'GET', token, body, isFormData = false } = {}) {
  const headers = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: (token) => request('/auth/me', { token }),

  getAvailableTests: (token) => request('/tests/available', { token }),
  getMyAttempts: (token) => request('/tests/my/attempts', { token }),
  getMySummary: (token) => request('/tests/my/summary', { token }),
  getRecommendations: (token) => request('/tests/my/recommendations', { token }),
  getTestById: (token, testId) => request(`/tests/${testId}`, { token }),
  startTestSession: (token, testId) =>
    request(`/tests/${testId}/session/start`, { method: 'POST', token }),
  getTestSession: (token, testId) => request(`/tests/${testId}/session`, { token }),
  saveTestSession: (token, testId, payload) =>
    request(`/tests/${testId}/session`, { method: 'PATCH', token, body: payload }),
  submitTest: (token, testId, payload) =>
    request(`/tests/${testId}/submit`, { method: 'POST', token, body: payload }),
  getResult: (token, testId) => request(`/tests/${testId}/result`, { token }),
  getAnalysis: (token, testId) => request(`/tests/${testId}/analysis`, { token }),

  getAllTests: (token) => request('/admin/tests', { token }),
  createTest: (token, payload) => request('/admin/tests', { method: 'POST', token, body: payload }),
  updateApproval: (token, testId, isApproved) =>
    request(`/admin/tests/${testId}/approve`, { method: 'PATCH', token, body: { isApproved } }),
  updateSchedule: (token, testId, payload) =>
    request(`/admin/tests/${testId}/schedule`, { method: 'PATCH', token, body: payload }),
  addQuestion: (token, testId, question) =>
    request(`/admin/tests/${testId}/questions`, { method: 'POST', token, body: { question } }),
  copyQuestions: (token, testId, payload) =>
    request(`/admin/tests/${testId}/questions/copy`, { method: 'POST', token, body: payload }),
  uploadImage: (token, file) => {
    const form = new FormData();
    form.append('image', file);
    return request('/admin/upload-image', {
      method: 'POST',
      token,
      body: form,
      isFormData: true,
    });
  },
};
