import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/app";
import { AuthLayout, DashboardLayout, ProjectLayout, PublicLayout } from "../layouts";
import {
  AIWorkspacePage,
  AboutPage,
  AccountSecurityPage,
  DashboardPage,
  FaqPage,
  ForgotPasswordPage,
  HelpPage,
  LandingPage,
  LoginPage,
  MyTasksPage,
  NewProjectPage,
  ProjectAddressingPage,
  ProjectEnterpriseIpamPage,
  ProjectCoreModelPage,
  ProjectDiagramPage,
  ProjectDiscoveryPage,
  ProjectImplementationPage,
  ProjectOverviewPage,
  ProjectPlatformBomPage,
  ProjectReportPage,
  ProjectRequirementsPage,
  ProjectRoutingPage,
  ProjectSecurityPage,
  ProjectSettingsPage,
  ProjectSitesPage,
  ProjectStandardsPage,
  ProjectTasksPage,
  ProjectValidationPage,
  ProjectVlansPage,
  RegisterPage,
  ResetPasswordPage,
  RouteErrorPage,
} from "../pages";

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
          { path: "core-model", element: <ProjectCoreModelPage /> },
          { path: "addressing", element: <ProjectAddressingPage /> },
          { path: "enterprise-ipam", element: <ProjectEnterpriseIpamPage /> },
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
