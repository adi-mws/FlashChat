import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { initializeUserKeys } from '../../lib/crypto';

// --- Thunks ---

export const verifyUser = createAsyncThunk(
  'auth/verifyUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/auth/verify-user`, {
        withCredentials: true,
      });
      return response.data; // user data
    } catch {
      return rejectWithValue(null);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
    return null;
  }
);

export const initE2EEKeys = createAsyncThunk(
  'auth/initE2EEKeys',
  async (user, { rejectWithValue }) => {
    if (!user) return rejectWithValue('No user');
    const localPrivateKeyName = `e2ee_private_key_${user.username}`;
    const hasLocalKey = localStorage.getItem(localPrivateKeyName);

    if (!user.publicKey || !hasLocalKey) {
      try {
        if (!hasLocalKey) {
          localStorage.removeItem(`e2ee_public_key_${user.username}`);
        }
        const pubKey = await initializeUserKeys(user.username);
        await axios.put(
          `${import.meta.env.VITE_API_URL}/user/public-key`,
          { publicKey: pubKey },
          { withCredentials: true }
        );
        return pubKey;
      } catch (error) {
        console.error('Failed to initialize E2EE keys:', error);
        return rejectWithValue(error.message);
      }
    }
    return user.publicKey; // already initialized
  }
);

// --- Slice ---

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: true,
    error: null,
  },
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
    },
    updateUser(state, action) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    clearUser(state) {
      state.user = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // verifyUser
      .addCase(verifyUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(verifyUser.rejected, (state) => {
        state.user = null;
        state.loading = false;
      })
      // logoutUser
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.loading = false;
      })
      // initE2EEKeys
      .addCase(initE2EEKeys.fulfilled, (state, action) => {
        if (state.user && action.payload) {
          state.user.publicKey = action.payload;
        }
      });
  },
});

export const { setUser, updateUser, clearUser } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
