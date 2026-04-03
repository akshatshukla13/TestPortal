import { createSlice } from '@reduxjs/toolkit';
import { readAuth } from '../session';

const authSlice = createSlice({
  name: 'auth',
  initialState: readAuth(),
  reducers: {
    setAuth(state, action) {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },
    clearAuth(state) {
      state.token = null;
      state.user = null;
    },
  },
});

export const { setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
