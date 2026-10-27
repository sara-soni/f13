import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, AlertCircle, ArrowRight } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { loginUser, clearAuthError } from "../features/auth/authSlice";
import { showToast } from "../features/toast/toastSlice";

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { status, error } = useAppSelector((state) => state.auth);
  const isAuthenticated = status === "authenticated";
  const isLoading = status === "checking";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const fromLocation =
    (location.state as { from?: { pathname?: string } })?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (isAuthenticated) {
      navigate(fromLocation, { replace: true });
    }
  }, [isAuthenticated, navigate, fromLocation]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    const action = await dispatch(loginUser({ username: username.trim(), password }));
    if (loginUser.fulfilled.match(action)) {
      dispatch(
        showToast({
          type: "success",
          message: "Signed in successfully.",
        })
      );
      navigate(fromLocation, { replace: true });
    }
  };

  return (
    <div className="lf-auth-screen" role="dialog" aria-labelledby="signin-heading">
      <div className="lf-auth-container">
        <div className="lf-auth-card">
          <div className="lf-auth-brand">
            <div className="lf-auth-logo">
              <Lock size={24} />
            </div>
            <h1 id="signin-heading">Employee Sign-In</h1>
            <p>Enter your corporate credentials to continue</p>
          </div>

          {error && (
            <div className="lf-error" role="alert" style={{ marginBottom: "16px" }}>
              <AlertCircle size={17} />
              <span>{error}</span>
              <button type="button" onClick={() => dispatch(clearAuthError())}>
                Dismiss
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="lf-form-group">
              <label htmlFor="auth-username">Email or Employee ID</label>
              <input
                id="auth-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) dispatch(clearAuthError());
                }}
                placeholder="name@company.com or employee ID"
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            <div className="lf-form-group">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) dispatch(clearAuthError());
                }}
                placeholder="Enter password"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="lf-button lf-button-primary lf-auth-submit"
              disabled={isLoading || !username.trim()}
            >
              <span>{isLoading ? "Signing in…" : "Sign In"}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
