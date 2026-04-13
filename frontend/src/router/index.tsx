import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { ProjectLayout } from "../layouts/ProjectLayout";
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
import { ProjectSitesPage } from "../pages/ProjectSitesPage";
import { ProjectVlansPage } from "../pages/ProjectVlansPage";
import { ProjectValidationPage } from "../pages/ProjectValidationPage";
import { ProjectDiagramPage } from "../pages/ProjectDiagramPage";
import { ProjectTasksPage } from "../pages/ProjectTasksPage";
import { RouteErrorPage } from "../pages/RouteErrorPage";
import { AboutPage } from "../pages/AboutPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    path: "/about",
    element: <AboutPage />,
    errorElement: <RouteErrorPage />,
  },
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorPage />,
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
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/projects/new", element: <NewProjectPage /> },
      { path: "/my-tasks", element: <MyTasksPage /> },
      {
        path: "/projects/:projectId",
        element: <ProjectLayout />,
        children: [
          { index: true, element: <Navigate to="overview" replace /> },
          { path: "overview", element: <ProjectOverviewPage /> },
          { path: "sites", element: <ProjectSitesPage /> },
          { path: "vlans", element: <ProjectVlansPage /> },
          { path: "validation", element: <ProjectValidationPage /> },
          { path: "diagram", element: <ProjectDiagramPage /> },
          { path: "tasks", element: <ProjectTasksPage /> },
          { path: "report", element: <ProjectReportPage /> },
          { path: "settings", element: <ProjectSettingsPage /> },
        ],
      },
    ],
  },
]);
