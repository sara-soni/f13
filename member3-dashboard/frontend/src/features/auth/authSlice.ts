import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { AuthState, SignInCredentials } from "./authTypes";
import {
  checkServerSession,
  signInWithServer,
  signOutServer,
} from "../../services/authService";

const initialState: AuthState = {
  status: "checking",
  user: null,
  error: null,
};

export const checkAuthSession = createAsyncThunk(
  "auth/checkAuthSession",
  async (_, { rejectWithValue }) => {
    try {
      const user = await checkServerSession();
      return user; // null if 401 unauthenticated, EmployeeProfile if active session
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Session verification failed due to network error";
      return rejectWithValue(msg);
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials: SignInCredentials, { rejectWithValue }) => {
    try {
      const user = await signInWithServer(credentials.username, credentials.password);
      return user;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      return rejectWithValue(msg);
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      await signOutServer();
      return null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-out encountered an error";
      return rejectWithValue(msg);
    }
  }
);

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // checkAuthSession
      .addCase(checkAuthSession.pending, (state) => {
        state.status = "checking";
        state.error = null;
      })
      .addCase(checkAuthSession.fulfilled, (state, action) => {
        if (action.payload) {
          state.status = "authenticated";
          state.user = action.payload;
          state.error = null;
        } else {
          state.status = "unauthenticated";
          state.user = null;
          state.error = null;
        }
      })
      .addCase(checkAuthSession.rejected, (state, action) => {
        // Distinguish recoverable network errors from explicit unauthenticated state
        state.status = "error";
        state.user = null;
        state.error = action.payload as string;
      })

      // loginUser
      .addCase(loginUser.pending, (state) => {
        state.status = "checking";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "unauthenticated";
        state.error = action.payload as string;
      })

      // logoutUser
      .addCase(logoutUser.fulfilled, (state) => {
        state.status = "unauthenticated";
        state.user = null;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        // Safe fallback on logout failure: clear client session state regardless
        state.status = "unauthenticated";
        state.user = null;
        state.error = null;
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
