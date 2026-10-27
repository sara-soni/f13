import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import leaveBalancesReducer from "../features/leave/leaveBalancesSlice";
import leaveApplicationsReducer from "../features/leave/leaveApplicationsSlice";
import toastReducer from "../features/toast/toastSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    leaveBalances: leaveBalancesReducer,
    leaveApplications: leaveApplicationsReducer,
    toast: toastReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
