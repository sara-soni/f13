import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HeartPulse,
  Coffee,
  PlaneTakeoff,
  Clock,
  PlusCircle,
  CalendarCheck,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  XCircle,
} from "lucide-react";
import StatCard from "../components/common/StatCard";
import StatusBadge from "../components/common/StatusBadge";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  selectRecentApplications,
  selectPendingCount,
  selectAllApplications,
} from "../features/leave/leaveSelectors";
import { loadLeaveBalances } from "../features/leave/leaveBalancesSlice";
import {
  loadApplications,
  cancelApplication,
} from "../features/leave/leaveApplicationsSlice";
import { showToast } from "../features/toast/toastSlice";

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const user = useAppSelector((state) => state.auth.user);
  const balances = useAppSelector((state) => state.leaveBalances.balances);
  const balanceStatus = useAppSelector((state) => state.leaveBalances.status);
  const balanceError = useAppSelector((state) => state.leaveBalances.error);

  const applications = useAppSelector(selectAllApplications);
  const recentApplications = useAppSelector(selectRecentApplications);
  const pendingCount = useAppSelector(selectPendingCount);
  const appStatus = useAppSelector((state) => state.leaveApplications.fetchStatus);
  const appError = useAppSelector((state) => state.leaveApplications.fetchError);

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loading = balanceStatus === "loading" || appStatus === "loading";
  const error = balanceError || appError;

  const handleRefresh = useCallback(() => {
    void dispatch(loadLeaveBalances());
    void dispatch(loadApplications());
  }, [dispatch]);

  const handleCancelLeave = async (id: string) => {
    setCancellingId(id);
    try {
      const action = await dispatch(cancelApplication(id));
      if (cancelApplication.fulfilled.match(action)) {
        dispatch(
          showToast({
            type: "success",
            title: "Application Cancelled",
            message: `Leave request ${id} was cancelled.`,
          })
        );
      } else {
        dispatch(
          showToast({
            type: "error",
            title: "Action Failed",
            message: (action.payload as string) || "Could not cancel application.",
          })
        );
      }
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="lf-content">
      {/* Page Heading */}
      <section className="lf-page-heading">
        <div>
          <h1>Leave Dashboard</h1>
          <p>
            {user
              ? `${user.name} (${user.employeeId}) · ${user.designation}, ${user.department}`
              : "Overview of your leave balances and recent submissions."}
          </p>
        </div>

        <div className="lf-heading-actions">
          <Link to="/leave/apply" className="lf-button lf-button-primary">
            <PlusCircle size={16} />
            <span>Apply for Leave</span>
          </Link>

          <button
            type="button"
            className="lf-button lf-button-secondary"
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Refresh balances and requests"
          >
            <RotateCcw size={15} className={loading ? "lf-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="lf-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" onClick={handleRefresh}>
            Retry
          </button>
        </div>
      )}

      {/* Leave Balances Grid */}
      <section className="lf-stats" aria-label="Leave Balances">
        <StatCard
          label="Sick Leave"
          value={balances?.sick?.available !== null && balances?.sick?.available !== undefined ? balances.sick.available : "—"}
          unit={balances?.sick?.available !== null && balances?.sick?.available !== undefined ? balances?.sick?.unit || "days" : ""}
          detail={
            balances?.sick && balances.sick.total !== null
              ? `${balances.sick.used} of ${balances.sick.total} days used`
              : "Medical absence"
          }
          icon={<HeartPulse size={19} />}
          tone="amber"
        />

        <StatCard
          label="Casual Leave"
          value={balances?.casual?.available !== null && balances?.casual?.available !== undefined ? balances.casual.available : "—"}
          unit={balances?.casual?.available !== null && balances?.casual?.available !== undefined ? balances?.casual?.unit || "days" : ""}
          detail={
            balances?.casual && balances.casual.total !== null
              ? `${balances.casual.used} of ${balances.casual.total} days used`
              : "Personal leave"
          }
          icon={<Coffee size={19} />}
          tone="violet"
        />

        <StatCard
          label="Earned Leave"
          value={balances?.earned?.available !== null && balances?.earned?.available !== undefined ? balances.earned.available : "—"}
          unit={balances?.earned?.available !== null && balances?.earned?.available !== undefined ? balances?.earned?.unit || "days" : ""}
          detail={
            balances?.earned && balances.earned.total !== null
              ? `${balances.earned.used} of ${balances.earned.total} days used`
              : "Annual vacation"
          }
          icon={<PlaneTakeoff size={19} />}
          tone="green"
        />

        <StatCard
          label="Unpaid Leave"
          value={
            balances?.unpaid?.available !== null && balances?.unpaid?.available !== undefined
              ? balances.unpaid.available
              : "On Request"
          }
          unit=""
          detail={
            balances?.unpaid
              ? `${balances.unpaid.used} days taken`
              : "Subject to approval"
          }
          icon={<Clock size={19} />}
          tone="blue"
        />
      </section>

      {/* Quick Metrics */}
      <section className="lf-quick-metrics">
        <div className="lf-metric-box">
          <span className="lf-metric-title">Pending Decisions</span>
          <strong className="lf-metric-value">{pendingCount}</strong>
          <small>Awaiting review</small>
        </div>
        <div className="lf-metric-box">
          <span className="lf-metric-title">Total Applications</span>
          <strong className="lf-metric-value">{applications.length}</strong>
          <small>Submitted requests</small>
        </div>
        <div className="lf-metric-box">
          <span className="lf-metric-title">Approved Leaves</span>
          <strong className="lf-metric-value">
            {applications.filter((a) => a.status === "Approved").length}
          </strong>
          <small>Confirmed requests</small>
        </div>
      </section>

      {/* Recent Applications Table */}
      <section className="lf-queue">
        <div className="lf-queue-heading">
          <div>
            <div className="lf-queue-title">
              <h2>Recent Applications</h2>
              <span>{recentApplications.length}</span>
            </div>
            <p>Your recent submissions and their current statuses.</p>
          </div>

          <button
            type="button"
            className="lf-link-button"
            onClick={() => navigate("/leave/history")}
            style={{ fontWeight: 700 }}
          >
            <span>View All</span>
            <ChevronRight size={15} />
          </button>
        </div>

        {loading && applications.length === 0 ? (
          <div className="lf-loading">
            <span className="lf-spinner" />
            <strong>Loading records</strong>
            <p>Retrieving leave data…</p>
          </div>
        ) : recentApplications.length === 0 ? (
          <div className="lf-empty">
            <div className="lf-empty-icon">
              <CalendarCheck size={26} />
            </div>
            <h3>No applications found</h3>
            <p>You have not submitted any leave requests yet.</p>
            <Link to="/leave/apply" className="lf-button lf-button-primary">
              <PlusCircle size={15} />
              <span>Apply for Leave</span>
            </Link>
          </div>
        ) : (
          <div className="lf-table-scroll">
            <table className="lf-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">TYPE</th>
                  <th scope="col">DATES</th>
                  <th scope="col">DAYS</th>
                  <th scope="col">STATUS</th>
                  <th scope="col">CURRENT STEP</th>
                  <th scope="col">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {recentApplications.map((app) => {
                  const isPending =
                    app.status === "Pending Manager" || app.status === "Pending HR";
                  const isCancelling = cancellingId === app.id;

                  return (
                    <tr key={app.id}>
                      <td>
                        <strong style={{ color: "#4f46b8", fontSize: "11px" }}>
                          {app.id}
                        </strong>
                      </td>
                      <td>
                        <div className="lf-leave-detail">
                          <strong>{app.leaveType}</strong>
                          <p title={app.reason}>{app.reason || "—"}</p>
                        </div>
                      </td>
                      <td>
                        <div className="lf-leave-detail">
                          <span>
                            {formatDate(app.startDate)} <i>→</i> {formatDate(app.endDate)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="lf-duration">
                          <strong>
                            {app.days}{" "}
                            <small>{app.days === 1 ? "day" : "days"}</small>
                          </strong>
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={app.status} />
                      </td>
                      <td>
                        <span style={{ fontSize: "10px", color: "#6b7280" }}>
                          {app.reviewStep || "—"}
                        </span>
                      </td>
                      <td>
                        {isPending ? (
                          <button
                            type="button"
                            className="lf-cancel-btn"
                            disabled={isCancelling}
                            onClick={() => handleCancelLeave(app.id)}
                            title="Cancel this pending leave request"
                          >
                            <XCircle size={14} />
                            <span>{isCancelling ? "Cancelling…" : "Cancel"}</span>
                          </button>
                        ) : (
                          <span className="lf-view-only">Processed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
