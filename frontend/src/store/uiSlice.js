import { createSlice } from '@reduxjs/toolkit';

let toastIdCounter = 0;

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    pendingRequests: 0,
    toasts: [],
  },
  reducers: {
    requestStarted(state) {
      state.pendingRequests += 1;
    },
    requestEnded(state) {
      state.pendingRequests = Math.max(0, state.pendingRequests - 1);
    },
    addToast(state, action) {
      const { text, type = 'info', duration = 4000 } = action.payload;
      state.toasts.push({ id: ++toastIdCounter, text, type, duration });
    },
    removeToast(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { requestStarted, requestEnded, addToast, removeToast } = uiSlice.actions;
export default uiSlice.reducer;
