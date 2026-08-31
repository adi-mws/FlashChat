import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import {
  initializeUserKeys,
  encryptPrivateKeyWithPassphrase,
  decryptPrivateKeyWithPassphrase
} from '../../lib/crypto';

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
  async (user, { rejectWithValue, dispatch }) => {
    if (!user) return rejectWithValue('No user');
    const localPrivateKeyName = `e2ee_private_key_${user.username}`;
    const hasLocalKey = localStorage.getItem(localPrivateKeyName);

    if (!hasLocalKey) {
      if (user.encryptedPrivateKey) {
        // A backup exists on the server! We need the user to input their passphrase to restore it.
        dispatch(setE2eeSyncRequired(true));
        return rejectWithValue('Sync required');
      } else {
        // No backup exists. This is the first device or no backup was made.
        // Generate new keys.
        try {
          localStorage.removeItem(`e2ee_public_key_${user.username}`);
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
    }
    return user.publicKey; // already initialized
  }
);

export const restoreE2EEKeys = createAsyncThunk(
  'auth/restoreE2EEKeys',
  async ({ passphrase, user }, { rejectWithValue, dispatch }) => {
    try {
      const { encryptedPrivateKey, backupSalt, backupIv, username } = user;
      if (!encryptedPrivateKey || !backupSalt || !backupIv) {
        throw new Error("No backup available on server");
      }

      // Decrypt the private key
      const privateKeyStr = await decryptPrivateKeyWithPassphrase(
        encryptedPrivateKey,
        passphrase,
        backupSalt,
        backupIv
      );

      // Store in localStorage
      localStorage.setItem(`e2ee_private_key_${username}`, privateKeyStr);
      localStorage.setItem(`e2ee_public_key_${username}`, user.publicKey);

      // Reset the sync required state
      dispatch(setE2eeSyncRequired(false));
      dispatch(setE2eeSyncError(null));

      return user.publicKey;
    } catch (error) {
      console.error("Failed to restore E2EE keys:", error);
      dispatch(setE2eeSyncError("Incorrect passphrase. Please try again."));
      return rejectWithValue(error.message || "Failed to decrypt private key");
    }
  }
);

export const backupE2EEKeys = createAsyncThunk(
  'auth/backupE2EEKeys',
  async ({ passphrase, user }, { rejectWithValue }) => {
    try {
      const localPrivateKeyName = `e2ee_private_key_${user.username}`;
      const privateKeyStr = localStorage.getItem(localPrivateKeyName);
      if (!privateKeyStr) {
        throw new Error("Private key not found locally");
      }

      // Encrypt the private key
      const backupDetails = await encryptPrivateKeyWithPassphrase(privateKeyStr, passphrase);

      // Upload to server
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/user/backup-key`,
        backupDetails,
        { withCredentials: true }
      );

      return response.data.user; // contains encryptedPrivateKey, backupSalt, backupIv
    } catch (error) {
      console.error("Failed to backup E2EE keys:", error);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const resetE2EEKeys = createAsyncThunk(
  'auth/resetE2EEKeys',
  async (user, { rejectWithValue, dispatch }) => {
    try {
      const username = user.username;
      
      // 1. Remove old local keys if any
      localStorage.removeItem(`e2ee_private_key_${username}`);
      localStorage.removeItem(`e2ee_public_key_${username}`);
      
      // 2. Generate a new key pair locally
      const pubKey = await initializeUserKeys(username);
      
      // 3. Update public key on server
      await axios.put(
        `${import.meta.env.VITE_API_URL}/user/public-key`,
        { publicKey: pubKey },
        { withCredentials: true }
      );
      
      // 4. Clear backup details on server
      await axios.put(
        `${import.meta.env.VITE_API_URL}/user/backup-key`,
        { clearBackup: true },
        { withCredentials: true }
      );
      
      // 5. Reset sync states in store
      dispatch(setE2eeSyncRequired(false));
      dispatch(setE2eeSyncError(null));
      
      return pubKey;
    } catch (error) {
      console.error("Failed to reset E2EE keys:", error);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// --- Slice ---

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: true,
    error: null,
    e2eeSyncRequired: false,
    e2eeSyncError: null,
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
      state.e2eeSyncRequired = false;
      state.e2eeSyncError = null;
    },
    setE2eeSyncRequired(state, action) {
      state.e2eeSyncRequired = action.payload;
    },
    setE2eeSyncError(state, action) {
      state.e2eeSyncError = action.payload;
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
        state.e2eeSyncRequired = false;
        state.e2eeSyncError = null;
      })
      // initE2EEKeys
      .addCase(initE2EEKeys.fulfilled, (state, action) => {
        if (state.user && action.payload) {
          state.user.publicKey = action.payload;
        }
      })
      // restoreE2EEKeys
      .addCase(restoreE2EEKeys.fulfilled, (state, action) => {
        state.e2eeSyncRequired = false;
        state.e2eeSyncError = null;
        if (state.user && action.payload) {
          state.user.publicKey = action.payload;
        }
      })
      // backupE2EEKeys
      .addCase(backupE2EEKeys.fulfilled, (state, action) => {
        if (state.user && action.payload) {
          state.user.encryptedPrivateKey = action.payload.encryptedPrivateKey;
          state.user.backupSalt = action.payload.backupSalt;
          state.user.backupIv = action.payload.backupIv;
        }
      })
      // resetE2EEKeys
      .addCase(resetE2EEKeys.fulfilled, (state, action) => {
        state.e2eeSyncRequired = false;
        state.e2eeSyncError = null;
        if (state.user) {
          state.user.publicKey = action.payload;
          state.user.encryptedPrivateKey = null;
          state.user.backupSalt = null;
          state.user.backupIv = null;
        }
      });
  },
});

export const { setUser, updateUser, clearUser, setE2eeSyncRequired, setE2eeSyncError } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectE2eeSyncRequired = (state) => state.auth.e2eeSyncRequired;
export const selectE2eeSyncError = (state) => state.auth.e2eeSyncError;
