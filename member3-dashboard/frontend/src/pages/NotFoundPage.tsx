import { Link } from "react-router-dom";
import { HelpCircle, LayoutDashboard, History } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="lf-content">
      <div className="lf-empty" style={{ minHeight: "500px", padding: "60px 20px" }}>
        <div className="lf-empty-icon" style={{ width: "64px", height: "64px", background: "#f1f0ff", color: "#655de8" }}>
          <HelpCircle size={36} />
        </div>
        <h1 style={{ margin: "20px 0 8px", font: "800 28px 'Manrope', sans-serif", color: "#1b2336" }}>
          404 - Page Not Found
        </h1>
        <p style={{ maxWidth: "440px", margin: "0 auto 24px", color: "#7d8599", fontSize: "12px", lineHeight: "1.7" }}>
          The page or route you are attempting to reach does not exist in the employee portal, or may have been moved.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <Link to="/dashboard" className="lf-button lf-button-primary">
            <LayoutDashboard size={16} />
            <span>Go to My Dashboard</span>
          </Link>
          <Link to="/leave/history" className="lf-button lf-button-secondary">
            <History size={16} />
            <span>View Leave History</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
