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
import { ProjectSectionPlaceholderPage } from "../pages/ProjectSectionPlaceholderPage";
import { ProjectSitesPage } from "../pages/ProjectSitesPage";

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
      { path: "/my-tasks", element: <MyTasksPage /> },
      {
        path: "/projects/:projectId",
        element: <ProjectLayout />,
        children: [
          { index: true, element: <Navigate to="overview" replace /> },
          { path: "overview", element: <ProjectOverviewPage /> },
          { path: "sites", element: <ProjectSitesPage /> },
          {
            path: "vlans",
            element: (
              <ProjectSectionPlaceholderPage
                title="VLANs"
                description="The VLAN planning workspace will move here in the v37 redesign."
              />
            ),
          },
          {
            path: "validation",
            element: (
              <ProjectSectionPlaceholderPage
                title="Validation"
                description="Validation results will move here in the v37 redesign."
              />
            ),
          },
          {
            path: "diagram",
            element: (
              <ProjectSectionPlaceholderPage
                title="Diagram"
                description="The dedicated diagram screen will move here in the v37 redesign."
              />
            ),
          },
          {
            path: "tasks",
            element: (
              <ProjectSectionPlaceholderPage
                title="Tasks"
                description="Project tasks and collaboration will move here in the v37 redesign."
              />
            ),
          },
          { path: "report", element: <ProjectReportPage /> },
          { path: "settings", element: <ProjectSettingsPage /> },
        ],
      },
    ],
  },
]);
