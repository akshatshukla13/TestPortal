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
  addBankQuestionsToTest: (token, testId, questionIds) =>
    request(`/admin/tests/${testId}/questions/from-bank`, { method: 'POST', token, body: { questionIds } }),
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

  // Question Bank
  listQuestionBank: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/question-bank${qs ? '?' + qs : ''}`, { token });
  },
  getBankSubjects: (token) => request('/admin/question-bank/subjects', { token }),
  createBankQuestion: (token, payload) =>
    request('/admin/question-bank', { method: 'POST', token, body: payload }),
  updateBankQuestion: (token, questionId, payload) =>
    request(`/admin/question-bank/${questionId}`, { method: 'PATCH', token, body: payload }),
  deleteBankQuestion: (token, questionId) =>
    request(`/admin/question-bank/${questionId}`, { method: 'DELETE', token }),

  getDashboardStats: (token) => request('/admin/dashboard', { token }),
  updateTest: (token, testId, payload) => request(`/admin/tests/${testId}`, { method: 'PATCH', token, body: payload }),
  deleteTest: (token, testId) => request(`/admin/tests/${testId}`, { method: 'DELETE', token }),
  duplicateTest: (token, testId) => request(`/admin/tests/${testId}/duplicate`, { method: 'POST', token }),
  deleteQuestion: (token, testId, questionId) => request(`/admin/tests/${testId}/questions/${questionId}`, { method: 'DELETE', token }),
  updateQuestion: (token, testId, questionId, question) => request(`/admin/tests/${testId}/questions/${questionId}`, { method: 'PATCH', token, body: { question } }),
  listUsers: (token) => request('/admin/users', { token }),
  assignUsers: (token, testId, userIds, mode) => request(`/admin/tests/${testId}/assign-users`, { method: 'POST', token, body: { userIds, mode } }),
  getAssignedUsers: (token, testId) => request(`/admin/tests/${testId}/assigned-users`, { token }),
};
