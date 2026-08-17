import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatsReducer from './slices/chatsSlice';
import notificationReducer from './slices/notificationSlice';
import uiReducer from './slices/uiSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    chats: chatsReducer,
    notification: notificationReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore socket instance paths if needed
        ignoredActions: ['chats/socket'],
        ignoredPaths: ['chats.socket'],
      },
    }),
});

export default store;
