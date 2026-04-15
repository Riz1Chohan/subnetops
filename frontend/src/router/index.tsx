import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { ProjectLayout } from "../layouts/ProjectLayout";
import { PublicLayout } from "../layouts/PublicLayout";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { DashboardPage } from "../pages/DashboardPage";
import { NewProjectPage } from "../pages/NewProjectPage";
import { ProjectOverviewPage } from "../pages/ProjectOverviewPage";
import { ProjectRequirementsPage } from "../pages/ProjectRequirementsPage";
import { ProjectDiscoveryPage } from "../pages/ProjectDiscoveryPage";
import { ProtectedRoute } from "../components/app/ProtectedRoute";
import { ProjectReportPage } from "../pages/ProjectReportPage";
import { ProjectSettingsPage } from "../pages/ProjectSettingsPage";
import { MyTasksPage } from "../pages/MyTasksPage";
import { ProjectSitesPage } from "../pages/ProjectSitesPage";
import { ProjectVlansPage } from "../pages/ProjectVlansPage";
import { ProjectValidationPage } from "../pages/ProjectValidationPage";
import { ProjectDiagramPage } from "../pages/ProjectDiagramPage";
import { ProjectTasksPage } from "../pages/ProjectTasksPage";
import { ProjectAddressingPage } from "../pages/ProjectAddressingPage";
import { ProjectSecurityPage } from "../pages/ProjectSecurityPage";
import { ProjectRoutingPage } from "../pages/ProjectRoutingPage";
import { ProjectImplementationPage } from "../pages/ProjectImplementationPage";
import { ProjectStandardsPage } from "../pages/ProjectStandardsPage";
import { ProjectPlatformBomPage } from "../pages/ProjectPlatformBomPage";
import { RouteErrorPage } from "../pages/RouteErrorPage";
import { AboutPage } from "../pages/AboutPage";
import { AIWorkspacePage } from "../pages/AIWorkspacePage";
import { HelpPage } from "../pages/HelpPage";
import { FaqPage } from "../pages/FaqPage";
import { AccountSecurityPage } from "../pages/AccountSecurityPage";

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/help", element: <HelpPage /> },
      { path: "/faq", element: <FaqPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
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
      { path: "/dashboard/about", element: <AboutPage /> },
      { path: "/dashboard/help", element: <HelpPage /> },
      { path: "/dashboard/faq", element: <FaqPage /> },
      { path: "/projects/new", element: <NewProjectPage /> },
      { path: "/ai", element: <AIWorkspacePage /> },
      { path: "/my-tasks", element: <MyTasksPage /> },
      { path: "/account/security", element: <AccountSecurityPage /> },
      {
        path: "/projects/:projectId",
        element: <ProjectLayout />,
        children: [
          { index: true, element: <Navigate to="discovery" replace /> },
          { path: "discovery", element: <ProjectDiscoveryPage /> },
          { path: "requirements", element: <ProjectRequirementsPage /> },
          { path: "logical-design", element: <ProjectOverviewPage /> },
          { path: "overview", element: <ProjectOverviewPage /> },
          { path: "addressing", element: <ProjectAddressingPage /> },
          { path: "security", element: <ProjectSecurityPage /> },
          { path: "routing", element: <ProjectRoutingPage /> },
          { path: "implementation", element: <ProjectImplementationPage /> },
          { path: "standards", element: <ProjectStandardsPage /> },
          { path: "platform", element: <ProjectPlatformBomPage /> },
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
