import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  RotateCcw,
  Download,
  Filter,
  CalendarCheck,
  XCircle,
  X,
  PlusCircle,
} from "lucide-react";
import StatusBadge from "../components/common/StatusBadge";
import type { LeaveApplication, LeaveFilterOptions } from "../types/leave";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
  selectFilteredApplications,
  selectAllApplications,
} from "../features/leave/leaveSelectors";
import {
  setFilters,
  resetFilters,
  cancelApplication,
} from "../features/leave/leaveApplicationsSlice";
import { showToast } from "../features/toast/toastSlice";

export default function LeaveHistoryPage() {
  const dispatch = useAppDispatch();

  const allApplications = useAppSelector(selectAllApplications);
  const filteredItems = useAppSelector(selectFilteredApplications);
  const filters = useAppSelector((state) => state.leaveApplications.filters);
  const loading = useAppSelector((state) => state.leaveApplications.fetchStatus === "loading");

  const [selectedLeaveDetail, setSelectedLeaveDetail] = useState<LeaveApplication | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleFilterChange = (partial: Partial<LeaveFilterOptions>) => {
    dispatch(setFilters(partial));
  };

  const handleResetFilters = () => {
    dispatch(resetFilters());
  };

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

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const exportCSV = () => {
    const headers = [
      "Application ID",
      "Leave Type",
      "Start Date",
      "End Date",
      "Days",
      "Status",
      "Submitted At",
      "Review Step",
      "Reason",
    ];

    const quote = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

    const rows = filteredItems.map((item) =>
      [
        item.id,
        item.leaveType,
        item.startDate,
        item.endDate,
        item.days,
        item.status,
        item.submittedAt,
        item.reviewStep || "",
        item.reason,
      ]
        .map(quote)
        .join(",")
    );

    const blob = new Blob(
      ["\uFEFF" + [headers.map(quote).join(","), ...rows].join("\r\n")],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leave-history-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const isFiltered = useMemo(() => {
    return (
      Boolean(filters.search) ||
      filters.status !== "All statuses" ||
      filters.leaveType !== "All leave types"
    );
  }, [filters]);

  return (
    <div className="lf-content">
      <section className="lf-page-heading">
        <div>
          <h1>Leave History</h1>
          <p>Review status and details of past leave submissions.</p>
        </div>

        <div className="lf-heading-actions">
          <Link to="/leave/apply" className="lf-button lf-button-secondary">
            <PlusCircle size={16} />
            <span>Apply for Leave</span>
          </Link>

          <button
            type="button"
            className="lf-button lf-button-primary"
            onClick={exportCSV}
            disabled={filteredItems.length === 0}
            title="Export filtered records to CSV"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="lf-queue">
        <div className="lf-filters">
          <label className="lf-search">
            <Search size={16} />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              placeholder="Search by ID, type, reason…"
              aria-label="Search leave requests"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => handleFilterChange({ search: "" })}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </label>

          <label className="lf-select">
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange({ status: e.target.value })}
            >
              <option value="All statuses">All statuses</option>
              <option value="Pending Manager">Pending Manager</option>
              <option value="Pending HR">Pending HR</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </label>

          <label className="lf-select">
            <span>Leave Type</span>
            <select
              value={filters.leaveType}
              onChange={(e) => handleFilterChange({ leaveType: e.target.value })}
            >
              <option value="All leave types">All leave types</option>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Earned Leave">Earned Leave</option>
              <option value="Unpaid Leave">Unpaid Leave</option>
            </select>
          </label>

          {isFiltered && (
            <button
              type="button"
              className="lf-reset"
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Results Info Bar */}
        <div className="lf-history-count-bar">
          <span>
            Showing <strong>{filteredItems.length}</strong> of{" "}
            {allApplications.length} applications
          </span>
          {isFiltered && (
            <span className="lf-filter-tag">
              <Filter size={12} /> Filtered
            </span>
          )}
        </div>

        {/* Table or Empty State */}
        {loading ? (
          <div className="lf-loading">
            <span className="lf-spinner" />
            <strong>Loading records</strong>
            <p>Fetching leave history…</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="lf-empty">
            <div className="lf-empty-icon">
              <CalendarCheck size={28} />
            </div>
            <h3>
              {isFiltered ? "No matching records" : "No leave history"}
            </h3>
            <p>
              {isFiltered
                ? "Try adjusting search criteria or clearing filters."
                : "Submitted leave requests will appear here."}
            </p>
            {isFiltered ? (
              <button
                type="button"
                className="lf-button lf-button-secondary"
                onClick={handleResetFilters}
              >
                <RotateCcw size={15} />
                <span>Clear Filters</span>
              </button>
            ) : (
              <Link to="/leave/apply" className="lf-button lf-button-primary">
                <span>Apply for Leave</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="lf-table-scroll">
            <table className="lf-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">TYPE</th>
                  <th scope="col">DATES</th>
                  <th scope="col">DURATION</th>
                  <th scope="col">SUBMITTED</th>
                  <th scope="col">STATUS</th>
                  <th scope="col">CURRENT STEP</th>
                  <th scope="col">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const isPending =
                    item.status === "Pending Manager" ||
                    item.status === "Pending HR";
                  const isCancelling = cancellingId === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedLeaveDetail(item)}
                      style={{ cursor: "pointer" }}
                      title="View details"
                    >
                      <td>
                        <strong style={{ color: "#4f46b8", fontSize: "11px" }}>
                          {item.id}
                        </strong>
                      </td>
                      <td>
                        <div className="lf-leave-detail">
                          <strong>{item.leaveType}</strong>
                          <p title={item.reason}>{item.reason || "—"}</p>
                        </div>
                      </td>
                      <td>
                        <div className="lf-leave-detail">
                          <span>
                            {formatDate(item.startDate)} <i>→</i>{" "}
                            {formatDate(item.endDate)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="lf-duration">
                          <strong>
                            {item.days}{" "}
                            <small>{item.days === 1 ? "day" : "days"}</small>
                          </strong>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: "10px", color: "#6b7280" }}>
                          {formatDateTime(item.submittedAt)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                      <td>
                        <span style={{ fontSize: "10px", color: "#6b7280" }}>
                          {item.reviewStep || "—"}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {isPending ? (
                          <button
                            type="button"
                            className="lf-cancel-btn"
                            disabled={isCancelling}
                            onClick={() => handleCancelLeave(item.id)}
                            title="Cancel request"
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

      {/* Application Detail Modal */}
      {selectedLeaveDetail && (
        <div
          className="lf-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-title"
          onClick={() => setSelectedLeaveDetail(null)}
        >
          <div
            className="lf-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="lf-modal-head">
              <div>
                <h2 id="leave-modal-title">
                  {selectedLeaveDetail.id} · {selectedLeaveDetail.leaveType}
                </h2>
              </div>
              <button
                type="button"
                className="lf-icon-button"
                onClick={() => setSelectedLeaveDetail(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="lf-modal-body">
              <div className="lf-modal-grid">
                <div>
                  <label>Status</label>
                  <div>
                    <StatusBadge status={selectedLeaveDetail.status} />
                  </div>
                </div>

                <div>
                  <label>Duration</label>
                  <strong>
                    {selectedLeaveDetail.days}{" "}
                    {selectedLeaveDetail.days === 1 ? "working day" : "working days"}
                  </strong>
                </div>

                <div>
                  <label>Start Date</label>
                  <span>{formatDate(selectedLeaveDetail.startDate)}</span>
                </div>

                <div>
                  <label>End Date</label>
                  <span>{formatDate(selectedLeaveDetail.endDate)}</span>
                </div>

                <div>
                  <label>Submitted</label>
                  <span>{formatDateTime(selectedLeaveDetail.submittedAt)}</span>
                </div>

                <div>
                  <label>Current Stage</label>
                  <span>{selectedLeaveDetail.reviewStep || "—"}</span>
                </div>
              </div>

              <div className="lf-modal-reason">
                <label>Reason</label>
                <p>{selectedLeaveDetail.reason || "No reason provided."}</p>
              </div>
            </div>

            <div className="lf-modal-foot">
              <button
                type="button"
                className="lf-button lf-button-secondary"
                onClick={() => setSelectedLeaveDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
