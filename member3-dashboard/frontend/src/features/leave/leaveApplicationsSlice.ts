import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type {
  LeaveApplication,
  LeaveApplicationDraft,
  LeaveFilterOptions,
} from "../../types/leave";
import {
  fetchLeaveApplications,
  submitLeaveApplication,
  cancelLeaveApplication,
} from "../../services/leaveService";
import { setBalances } from "./leaveBalancesSlice";

export type PortalTab = "dashboard" | "apply" | "history";

export interface LeaveNotice {
  id: string;
  title: string;
  message: string;
  type: "success" | "error" | "info";
  time: string;
}

export interface LeaveApplicationsState {
  items: LeaveApplication[];
  activeTab: PortalTab;
  filters: LeaveFilterOptions;
  fetchStatus: "idle" | "loading" | "succeeded" | "failed";
  fetchError: string | null;
  submitStatus: "idle" | "submitting" | "succeeded" | "failed";
  submitError: string | null;
  cancelStatus: "idle" | "cancelling" | "succeeded" | "failed";
  cancelError: string | null;
  notices: LeaveNotice[];
}

const initialState: LeaveApplicationsState = {
  items: [],
  activeTab: "dashboard",
  filters: {
    status: "All statuses",
    leaveType: "All leave types",
    search: "",
  },
  fetchStatus: "idle",
  fetchError: null,
  submitStatus: "idle",
  submitError: null,
  cancelStatus: "idle",
  cancelError: null,
  notices: [],
};

export const loadApplications = createAsyncThunk(
  "leaveApplications/load",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { leaveApplications: LeaveApplicationsState };
      const data = await fetchLeaveApplications(state.leaveApplications.filters);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load leave history";
      return rejectWithValue(msg);
    }
  }
);

export const applyForLeave = createAsyncThunk(
  "leaveApplications/apply",
  async (draft: LeaveApplicationDraft, { dispatch, rejectWithValue }) => {
    try {
      const result = await submitLeaveApplication(draft);
      // Synchronize the balance slice immediately
      dispatch(setBalances(result.updatedBalances));
      return result.application;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      return rejectWithValue(msg);
    }
  }
);

export const cancelApplication = createAsyncThunk(
  "leaveApplications/cancel",
  async (leaveId: string, { dispatch, rejectWithValue }) => {
    try {
      const result = await cancelLeaveApplication(leaveId);
      // Synchronize the balance slice immediately
      dispatch(setBalances(result.updatedBalances));
      return result.cancelledId;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Cancellation failed";
      return rejectWithValue(msg);
    }
  }
);

export const leaveApplicationsSlice = createSlice({
  name: "leaveApplications",
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<PortalTab>) {
      state.activeTab = action.payload;
    },
    setFilters(state, action: PayloadAction<Partial<LeaveFilterOptions>>) {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters(state) {
      state.filters = {
        status: "All statuses",
        leaveType: "All leave types",
        search: "",
      };
    },
    clearSubmitStatus(state) {
      state.submitStatus = "idle";
      state.submitError = null;
    },
    addNotice(state, action: PayloadAction<Omit<LeaveNotice, "id" | "time">>) {
      state.notices.unshift({
        id: `notice_${Date.now()}_${Math.random()}`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        ...action.payload,
      });
    },
    clearNotices(state) {
      state.notices = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // loadApplications
      .addCase(loadApplications.pending, (state) => {
        state.fetchStatus = "loading";
        state.fetchError = null;
      })
      .addCase(loadApplications.fulfilled, (state, action) => {
        state.fetchStatus = "succeeded";
        state.items = action.payload;
      })
      .addCase(loadApplications.rejected, (state, action) => {
        state.fetchStatus = "failed";
        state.fetchError = action.payload as string;
      })
      // applyForLeave
      .addCase(applyForLeave.pending, (state) => {
        state.submitStatus = "submitting";
        state.submitError = null;
      })
      .addCase(applyForLeave.fulfilled, (state, action) => {
        state.submitStatus = "succeeded";
        state.items.unshift(action.payload);
        state.notices.unshift({
          id: `notice_${Date.now()}`,
          title: "Leave Applied Successfully",
          message: `${action.payload.leaveType} (${action.payload.days} days) submitted for Manager review.`,
          type: "success",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      })
      .addCase(applyForLeave.rejected, (state, action) => {
        state.submitStatus = "failed";
        state.submitError = action.payload as string;
        state.notices.unshift({
          id: `notice_${Date.now()}`,
          title: "Application Failed",
          message: action.payload as string,
          type: "error",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      })
      // cancelApplication
      .addCase(cancelApplication.pending, (state) => {
        state.cancelStatus = "cancelling";
        state.cancelError = null;
      })
      .addCase(cancelApplication.fulfilled, (state, action) => {
        state.cancelStatus = "succeeded";
        const target = state.items.find((item) => item.id === action.payload);
        if (target) {
          target.status = "Cancelled";
          target.reviewStep = "Cancelled by Employee";
        }
        state.notices.unshift({
          id: `notice_${Date.now()}`,
          title: "Application Cancelled",
          message: `Leave application ${action.payload} was successfully cancelled.`,
          type: "info",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      })
      .addCase(cancelApplication.rejected, (state, action) => {
        state.cancelStatus = "failed";
        state.cancelError = action.payload as string;
      });
  },
});

export const {
  setActiveTab,
  setFilters,
  resetFilters,
  clearSubmitStatus,
  addNotice,
  clearNotices,
} = leaveApplicationsSlice.actions;

export default leaveApplicationsSlice.reducer;
