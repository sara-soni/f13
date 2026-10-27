import { useRouteError, useNavigate, isRouteErrorResponse } from "react-router-dom";
import { AlertCircle, RotateCcw, Home } from "lucide-react";

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage = "An unexpected error occurred while loading this page.";
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || error.data?.message || errorMessage;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="lf-content">
      <div className="lf-empty" style={{ minHeight: "450px" }} role="alert">
        <div className="lf-empty-icon" style={{ background: "#fff1f2", color: "#e11d48" }}>
          <AlertCircle size={32} />
        </div>
        <h2 style={{ margin: "18px 0 6px", font: "700 20px 'Manrope', sans-serif" }}>
          {errorStatus === 404 ? "Page Not Found" : "Something went wrong"}
        </h2>
        <p style={{ maxWidth: "420px", margin: "0 auto 20px" }}>{errorMessage}</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" className="lf-button lf-button-primary" onClick={handleRetry}>
            <RotateCcw size={15} />
            <span>Retry</span>
          </button>
          <button type="button" className="lf-button lf-button-secondary" onClick={handleGoHome}>
            <Home size={15} />
            <span>Go to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
