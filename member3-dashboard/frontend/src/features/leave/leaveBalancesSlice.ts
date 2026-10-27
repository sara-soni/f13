import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { LeaveBalances } from "../../types/leave";
import { fetchLeaveBalances } from "../../services/leaveService";

export interface LeaveBalancesState {
  balances: LeaveBalances | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: LeaveBalancesState = {
  balances: null,
  status: "idle",
  error: null,
};

export const loadLeaveBalances = createAsyncThunk(
  "leaveBalances/load",
  async (_, { rejectWithValue }) => {
    try {
      const data = await fetchLeaveBalances();
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load leave balances";
      return rejectWithValue(msg);
    }
  }
);

export const leaveBalancesSlice = createSlice({
  name: "leaveBalances",
  initialState,
  reducers: {
    setBalances(state, action: PayloadAction<LeaveBalances>) {
      state.balances = action.payload;
    },
    clearBalancesError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadLeaveBalances.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadLeaveBalances.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.balances = action.payload;
      })
      .addCase(loadLeaveBalances.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export const { setBalances, clearBalancesError } = leaveBalancesSlice.actions;
export default leaveBalancesSlice.reducer;
