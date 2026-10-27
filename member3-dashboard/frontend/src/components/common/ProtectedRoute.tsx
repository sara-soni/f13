import { Navigate, useLocation } from "react-router-dom";
import { AlertCircle, RotateCcw } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { checkAuthSession } from "../../features/auth/authSlice";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children?: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (status === "checking") {
    return (
      <div className="lf-loading" style={{ minHeight: "100vh" }}>
        <span className="lf-spinner" />
        <strong>Verifying employee session…</strong>
        <p>Connecting to backend session service…</p>
      </div>
    );
  }

  // Network / server verification error: do NOT redirect to login immediately
  if (status === "error") {
    return (
      <div className="lf-loading" style={{ minHeight: "100vh" }}>
        <AlertCircle size={32} style={{ color: "#ef4444", marginBottom: "12px" }} />
        <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px" }}>
          Session Verification Failed
        </h2>
        <p style={{ color: "#64748b", margin: "0 0 16px", maxWidth: "380px" }}>
          {error || "Unable to reach the authentication service. Please check your network connection."}
        </p>
        <button
          type="button"
          className="lf-button lf-button-primary"
          onClick={() => void dispatch(checkAuthSession())}
        >
          <RotateCcw size={15} />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : null;
}
