import { createBrowserRouter } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { DashboardPage } from "../pages/DashboardPage";
import { NewProjectPage } from "../pages/NewProjectPage";
import { ProjectOverviewPage } from "../pages/ProjectOverviewPage";
import { ProtectedRoute } from "../components/app/ProtectedRoute";
import { ProjectReportPage } from "../pages/ProjectReportPage";
import { ProjectSettingsPage } from "../pages/ProjectSettingsPage";
import { MyTasksPage } from "../pages/MyTasksPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/projects/new", element: <NewProjectPage /> },
      { path: "/projects/:projectId", element: <ProjectOverviewPage /> },
      { path: "/projects/:projectId/report", element: <ProjectReportPage /> },
      { path: "/projects/:projectId/settings", element: <ProjectSettingsPage /> },
      { path: "/my-tasks", element: <MyTasksPage /> },
    ],
  },
]);
