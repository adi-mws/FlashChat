import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    showSearchUsers: false,
    theme: 'dark',
    isOnline: navigator.onLine,
  },
  reducers: {
    setShowSearchUsers(state, action) {
      state.showSearchUsers = action.payload;
    },
    setTheme(state, action) {
      state.theme = action.payload;
    },
    setIsOnline(state, action) {
      state.isOnline = action.payload;
    },
  },
});

export const { setShowSearchUsers, setTheme, setIsOnline } = uiSlice.actions;
export default uiSlice.reducer;

// Selectors
export const selectShowSearchUsers = (state) => state.ui.showSearchUsers;
export const selectTheme = (state) => state.ui.theme;
export const selectIsOnline = (state) => state.ui.isOnline;
