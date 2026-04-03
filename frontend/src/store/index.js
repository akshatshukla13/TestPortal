import { configureStore } from '@reduxjs/toolkit';
import { writeAuth } from '../session';
import authReducer from './authSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
});

// Persist auth to localStorage whenever it changes
let prevAuth = store.getState().auth;
store.subscribe(() => {
  const nextAuth = store.getState().auth;
  if (nextAuth !== prevAuth) {
    prevAuth = nextAuth;
    writeAuth(nextAuth);
  }
});
