import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export type ToastType = "success" | "warning" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  durationMs?: number;
}

export interface ToastState {
  toasts: ToastMessage[];
}

const initialState: ToastState = {
  toasts: [],
};

export const toastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    showToast(state, action: PayloadAction<Omit<ToastMessage, "id">>) {
      // Deduplicate: Don't show duplicate identical message if already visible
      const exists = state.toasts.some(
        (t) => t.message === action.payload.message && t.type === action.payload.type
      );
      if (exists) {
        return;
      }

      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      state.toasts.push({
        id,
        durationMs: action.payload.durationMs ?? 4000,
        ...action.payload,
      });
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    clearAllToasts(state) {
      state.toasts = [];
    },
  },
});

export const { showToast, removeToast, clearAllToasts } = toastSlice.actions;
export default toastSlice.reducer;
