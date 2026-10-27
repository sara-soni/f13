import { useState, useEffect, Suspense } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import EmployeeSidebar from "./EmployeeSidebar";
import EmployeeHeader from "./EmployeeHeader";
import ToastContainer from "../common/ToastContainer";
import RouteLoadingFallback from "../common/RouteLoadingFallback";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logoutUser } from "../../features/auth/authSlice";
import { clearNotices, loadApplications } from "../../features/leave/leaveApplicationsSlice";
import { loadLeaveBalances } from "../../features/leave/leaveBalancesSlice";
import { showToast } from "../../features/toast/toastSlice";
import { selectPendingCount } from "../../features/leave/leaveSelectors";

const CURRENT_YEAR = new Date().getFullYear();

export default function PortalLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const user = useAppSelector((state) => state.auth.user);
  const notices = useAppSelector((state) => state.leaveApplications.notices);
  const pendingCount = useAppSelector(selectPendingCount);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load employee data from backend on verified portal entry
  useEffect(() => {
    void dispatch(loadLeaveBalances());
    void dispatch(loadApplications());
  }, [dispatch]);

  const handleSignOut = async () => {
    await dispatch(logoutUser());
    dispatch(
      showToast({
        type: "info",
        title: "Signed Out",
        message: "You have been signed out from the employee portal.",
      })
    );
    navigate("/login", { replace: true });
  };

  return (
    <div className="lf-app">
      <ToastContainer />

      <EmployeeSidebar
        user={user}
        onSignOut={handleSignOut}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        pendingCount={pendingCount}
      />

      <main className="lf-main">
        <EmployeeHeader
          user={user}
          notices={notices}
          onClearNotices={() => dispatch(clearNotices())}
          onOpenMobile={() => setMobileMenuOpen(true)}
        />

        <Suspense fallback={<RouteLoadingFallback />}>
          <Outlet />
        </Suspense>

        <footer className="lf-footer" style={{ padding: "16px 36px 24px" }}>
          <span>© {CURRENT_YEAR} LeaveFlow. All rights reserved.</span>
        </footer>
      </main>
    </div>
  );
}
