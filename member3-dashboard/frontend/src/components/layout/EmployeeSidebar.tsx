import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  History,
  LogOut,
  X,
  ClipboardList,
} from "lucide-react";
import type { EmployeeProfile } from "../../types/leave";

interface EmployeeSidebarProps {
  user: EmployeeProfile | null;
  onSignOut: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  pendingCount: number;
}

export default function EmployeeSidebar({
  user,
  onSignOut,
  mobileOpen,
  onCloseMobile,
  pendingCount,
}: EmployeeSidebarProps) {
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
    <>
      {mobileOpen && (
        <button
          className="lf-backdrop"
          aria-label="Close navigation sidebar"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`lf-sidebar ${mobileOpen ? "lf-sidebar-open" : ""}`}>
        <div className="lf-brand">
          <div className="lf-brand-icon" aria-hidden="true">
            <ClipboardList size={22} />
          </div>
          <div className="lf-brand-name">
            <strong>
              leaveflow<span>.</span>
            </strong>
            <small>EMPLOYEE PORTAL</small>
          </div>
          <button
            className="lf-icon-button lf-mobile-close"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="lf-nav-label">PORTAL</div>
        <nav className="lf-nav" aria-label="Portal Navigation">
          <RouterSidebarItem
            to="/dashboard"
            icon={<LayoutDashboard size={18} />}
            label="Dashboard"
            onClick={onCloseMobile}
          />
          <RouterSidebarItem
            to="/leave/apply"
            icon={<PlusCircle size={18} />}
            label="Apply for Leave"
            onClick={onCloseMobile}
          />
          <RouterSidebarItem
            to="/leave/history"
            icon={<History size={18} />}
            label="Leave History"
            count={pendingCount > 0 ? pendingCount : undefined}
            onClick={onCloseMobile}
          />
        </nav>

        <div className="lf-sidebar-spacer" />

        {user && (
          <div className="lf-user">
            <div className="lf-user-avatar">{getInitials(user.name)}</div>
            <div className="lf-user-details">
              <strong>{user.name}</strong>
              <span>{user.designation}</span>
              <small style={{ color: "#7f89a6", fontSize: "9px" }}>
                {user.employeeId}
              </small>
            </div>
            <button
              className="lf-signout-btn"
              onClick={onSignOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

function RouterSidebarItem({
  to,
  icon,
  label,
  count,
  onClick,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `lf-nav-item ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      {({ isActive }) => (
        <>
          <span className="lf-nav-icon">{icon}</span>
          <span className="lf-nav-text">{label}</span>
          {count !== undefined && <span className="lf-nav-count">{count}</span>}
          {isActive && <span className="lf-nav-marker" />}
        </>
      )}
    </NavLink>
  );
}
