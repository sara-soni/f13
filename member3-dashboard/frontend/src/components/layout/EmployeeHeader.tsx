import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Menu,
  ChevronRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Info,
  Trash2,
} from "lucide-react";
import type { LeaveNotice } from "../../features/leave/leaveApplicationsSlice";
import type { EmployeeProfile } from "../../types/leave";

interface EmployeeHeaderProps {
  user: EmployeeProfile | null;
  notices: LeaveNotice[];
  onClearNotices: () => void;
  onOpenMobile: () => void;
}

const TODAY_FORMATTED = new Date().toLocaleDateString("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default function EmployeeHeader({
  user,
  notices,
  onClearNotices,
  onOpenMobile,
}: EmployeeHeaderProps) {
  const [noticeOpen, setNoticeOpen] = useState(false);
  const location = useLocation();

  const getBreadcrumbTitle = (pathname: string): string => {
    if (pathname.startsWith("/leave/apply")) return "Apply for Leave";
    if (pathname.startsWith("/leave/history")) return "Leave History";
    if (pathname.startsWith("/dashboard")) return "My Dashboard";
    return "Overview";
  };

  const getInitials = (name?: string) => {
    if (!name) return "—";
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  };

  return (
    <header className="lf-topbar">
      <div className="lf-topbar-left">
        <button
          className="lf-icon-button lf-menu-button"
          onClick={onOpenMobile}
          aria-label="Open mobile navigation menu"
        >
          <Menu size={20} />
        </button>
        <div className="lf-breadcrumb" aria-label="Breadcrumb">
          <span>Employee Portal</span>
          <ChevronRight size={14} aria-hidden="true" />
          <strong>{getBreadcrumbTitle(location.pathname)}</strong>
        </div>
      </div>

      <div className="lf-topbar-right">
        <div className="lf-date-chip">
          <CalendarDays size={14} aria-hidden="true" />
          <span>{TODAY_FORMATTED}</span>
        </div>

        <div className="lf-notice-wrap">
          <button
            className={`lf-icon-button lf-bell ${noticeOpen ? "selected" : ""}`}
            aria-label={`Notifications: ${notices.length} items`}
            aria-expanded={noticeOpen}
            onClick={() => setNoticeOpen((prev) => !prev)}
          >
            <Bell size={19} />
            {notices.length > 0 && (
              <span className="lf-bell-count">
                {notices.length > 9 ? "9+" : notices.length}
              </span>
            )}
          </button>

          {noticeOpen && (
            <div className="lf-notice-panel" role="region" aria-label="Notifications panel">
              <div className="lf-notice-head">
                <div>
                  <strong>Notifications</strong>
                  <span>{notices.length} latest updates</span>
                </div>
                {notices.length > 0 && (
                  <button
                    type="button"
                    className="lf-link-button"
                    onClick={onClearNotices}
                  >
                    <Trash2 size={13} /> Clear all
                  </button>
                )}
              </div>

              <div className="lf-notice-list">
                {notices.length === 0 ? (
                  <div className="lf-notice-empty">
                    <Bell size={22} />
                    <strong>No notifications</strong>
                    <span>Status updates will appear here.</span>
                  </div>
                ) : (
                  notices.map((n) => (
                    <div className="lf-notice-item" key={n.id}>
                      <div className={`lf-notice-icon ${n.type}`}>
                        {n.type === "success" ? (
                          <CheckCircle2 size={16} />
                        ) : n.type === "error" ? (
                          <AlertCircle size={16} />
                        ) : (
                          <Info size={16} />
                        )}
                      </div>
                      <div>
                        <strong>{n.title}</strong>
                        <p>{n.message}</p>
                        <span>{n.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="lf-notice-foot">
                <button
                  type="button"
                  className="lf-link-button"
                  onClick={() => setNoticeOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="lf-top-avatar" title={user?.name || "Employee"}>
          {getInitials(user?.name)}
        </div>
      </div>
    </header>
  );
}
