import { store } from './store/index.js';
import { requestStarted, requestEnded } from './store/uiSlice.js';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const responseCache = new Map();
const inFlightRequests = new Map();

async function request(
  path,
  {
    method = 'GET',
    token,
    body,
    isFormData = false,
    cache = false,
    cacheTtlMs = 15000,
    cacheKey,
    forceRefresh = false,
  } = {},
) {
  const headers = {};
  const normalizedMethod = method.toUpperCase();
  const canUseCache = cache && normalizedMethod === 'GET';
  const resolvedCacheKey =
    canUseCache && (cacheKey || `${normalizedMethod}:${path}:${token || ''}`);

  if (canUseCache && !forceRefresh) {
    const cached = responseCache.get(resolvedCacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const inFlight = inFlightRequests.get(resolvedCacheKey);
    if (inFlight) {
      return inFlight;
    }
  }

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  store.dispatch(requestStarted());
  const fetchPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: normalizedMethod,
        headers,
        body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      if (canUseCache) {
        responseCache.set(resolvedCacheKey, {
          data,
          expiresAt: Date.now() + cacheTtlMs,
        });
      }

      return data;
    } finally {
      store.dispatch(requestEnded());
    }
  })();

  if (canUseCache) {
    inFlightRequests.set(resolvedCacheKey, fetchPromise);
  }

  try {
    return await fetchPromise;
  } finally {
    if (canUseCache) {
      inFlightRequests.delete(resolvedCacheKey);
    }
  }
}

const api = {
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  me: (token, requestOptions = {}) =>
    request('/auth/me', { cache: true, cacheTtlMs: 10000, ...requestOptions, token }),

  getAvailableTests: (token, requestOptions = {}) =>
    request('/tests/available', { cache: true, cacheTtlMs: 20000, ...requestOptions, token }),
  getMyAttempts: (token, requestOptions = {}) =>
    request('/tests/my/attempts', { cache: true, cacheTtlMs: 20000, ...requestOptions, token }),
  getMySummary: (token, requestOptions = {}) =>
    request('/tests/my/summary', { cache: true, cacheTtlMs: 20000, ...requestOptions, token }),
  getRecommendations: (token, requestOptions = {}) =>
    request('/tests/my/recommendations', { cache: true, cacheTtlMs: 20000, ...requestOptions, token }),
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

  getAllTests: (token, requestOptions = {}) =>
    request('/admin/tests', { cache: true, cacheTtlMs: 30000, ...requestOptions, token }),
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

  getDashboardStats: (token, requestOptions = {}) =>
    request('/admin/dashboard', { cache: true, cacheTtlMs: 30000, ...requestOptions, token }),
  updateTest: (token, testId, payload) => request(`/admin/tests/${testId}`, { method: 'PATCH', token, body: payload }),
  deleteTest: (token, testId) => request(`/admin/tests/${testId}`, { method: 'DELETE', token }),
  duplicateTest: (token, testId) => request(`/admin/tests/${testId}/duplicate`, { method: 'POST', token }),
  deleteQuestion: (token, testId, questionId) => request(`/admin/tests/${testId}/questions/${questionId}`, { method: 'DELETE', token }),
  updateQuestion: (token, testId, questionId, question) => request(`/admin/tests/${testId}/questions/${questionId}`, { method: 'PATCH', token, body: { question } }),
  listUsers: (token) => request('/admin/users', { token }),
  assignUsers: (token, testId, userIds, mode) => request(`/admin/tests/${testId}/assign-users`, { method: 'POST', token, body: { userIds, mode } }),
  getAssignedUsers: (token, testId) => request(`/admin/tests/${testId}/assigned-users`, { token }),
};

api.clearCache = (cacheKeyPrefix) => {
  if (!cacheKeyPrefix) {
    responseCache.clear();
    inFlightRequests.clear();
    return;
  }

  for (const key of responseCache.keys()) {
    if (key.includes(cacheKeyPrefix)) {
      responseCache.delete(key);
    }
  }

  for (const key of inFlightRequests.keys()) {
    if (key.includes(cacheKeyPrefix)) {
      inFlightRequests.delete(key);
    }
  }
};

export { api };
