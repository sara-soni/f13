import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";

export const selectApplicationsState = (state: RootState) => state.leaveApplications;
export const selectBalancesState = (state: RootState) => state.leaveBalances;
export const selectAuthState = (state: RootState) => state.auth;

export const selectAllApplications = createSelector(
  [selectApplicationsState],
  (appState) => appState.items
);

export const selectApplicationFilters = createSelector(
  [selectApplicationsState],
  (appState) => appState.filters
);

export const selectFilteredApplications = createSelector(
  [selectAllApplications, selectApplicationFilters],
  (items, filters) => {
    let result = [...items];
    const q = filters.search.trim().toLowerCase();

    if (q) {
      result = result.filter(
        (item) =>
          item.id.toLowerCase().includes(q) ||
          item.leaveType.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q)
      );
    }

    if (filters.status && filters.status !== "All statuses") {
      result = result.filter((item) => item.status === filters.status);
    }

    if (filters.leaveType && filters.leaveType !== "All leave types") {
      result = result.filter((item) => item.leaveType === filters.leaveType);
    }

    return result;
  }
);

export const selectPendingCount = createSelector(
  [selectAllApplications],
  (items) =>
    items.filter(
      (item) => item.status === "Pending Manager" || item.status === "Pending HR"
    ).length
);

export const selectRecentApplications = createSelector(
  [selectAllApplications],
  (items) => items.slice(0, 5)
);

export const selectApprovedApplications = createSelector(
  [selectAllApplications],
  (items) => items.filter((item) => item.status === "Approved")
);
