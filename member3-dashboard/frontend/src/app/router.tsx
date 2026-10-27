import { lazy } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import PortalLayout from "../components/layout/PortalLayout";
import ProtectedRoute from "../components/common/ProtectedRoute";
import RouteErrorBoundary from "../components/common/RouteErrorBoundary";

const LoginPage = lazy(() => import("../pages/LoginPage"));
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const ApplyLeavePage = lazy(() => import("../pages/ApplyLeavePage"));
const LeaveHistoryPage = lazy(() => import("../pages/LeaveHistoryPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <PortalLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "leave/apply",
        element: <ApplyLeavePage />,
      },
      {
        path: "leave/history",
        element: <LeaveHistoryPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
