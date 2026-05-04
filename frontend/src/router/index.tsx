import { lazy, Suspense, type ComponentType, type LazyExoticComponent, type ReactElement } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/app";
import { LoadingState } from "../components/app/LoadingState";
import { AuthLayout, DashboardLayout, ProjectLayout, PublicLayout } from "../layouts";

type PageLoader<TModule, TExport extends keyof TModule> = () => Promise<TModule>;

function lazyNamedPage<TModule, TExport extends keyof TModule>(
  loader: PageLoader<TModule, TExport>,
  exportName: TExport,
): LazyExoticComponent<ComponentType> {
  return lazy(async () => {
    const mod = await loader();
    return { default: mod[exportName] as ComponentType };
  });
}

function routePage(Page: LazyExoticComponent<ComponentType>, label: string): ReactElement {
  return (
    <Suspense fallback={<LoadingState title={`Loading ${label}`} message="Preparing this workspace section." />}>
      <Page />
    </Suspense>
  );
}

const AIWorkspacePage = lazyNamedPage(() => import("../pages/AIWorkspacePage"), "AIWorkspacePage");
const AboutPage = lazyNamedPage(() => import("../pages/AboutPage"), "AboutPage");
const AccountSecurityPage = lazyNamedPage(() => import("../pages/AccountSecurityPage"), "AccountSecurityPage");
const DashboardPage = lazyNamedPage(() => import("../pages/DashboardPage"), "DashboardPage");
const FaqPage = lazyNamedPage(() => import("../pages/FaqPage"), "FaqPage");
const ForgotPasswordPage = lazyNamedPage(() => import("../pages/ForgotPasswordPage"), "ForgotPasswordPage");
const HelpPage = lazyNamedPage(() => import("../pages/HelpPage"), "HelpPage");
const LandingPage = lazyNamedPage(() => import("../pages/LandingPage"), "LandingPage");
const LoginPage = lazyNamedPage(() => import("../pages/LoginPage"), "LoginPage");
const MyTasksPage = lazyNamedPage(() => import("../pages/MyTasksPage"), "MyTasksPage");
const NewProjectPage = lazyNamedPage(() => import("../pages/NewProjectPage"), "NewProjectPage");
const ProjectAddressingPage = lazyNamedPage(() => import("../pages/ProjectAddressingPage"), "ProjectAddressingPage");
const ProjectCoreModelPage = lazyNamedPage(() => import("../pages/ProjectCoreModelPage"), "ProjectCoreModelPage");
const ProjectDiagramPage = lazyNamedPage(() => import("../pages/ProjectDiagramPage"), "ProjectDiagramPage");
const ProjectDiscoveryPage = lazyNamedPage(() => import("../pages/ProjectDiscoveryPage"), "ProjectDiscoveryPage");
const ProjectEnterpriseIpamPage = lazyNamedPage(() => import("../pages/ProjectEnterpriseIpamPage"), "ProjectEnterpriseIpamPage");
const ProjectImplementationPage = lazyNamedPage(() => import("../pages/ProjectImplementationPage"), "ProjectImplementationPage");
const ProjectOverviewPage = lazyNamedPage(() => import("../pages/ProjectOverviewPage"), "ProjectOverviewPage");
const ProjectPlatformBomPage = lazyNamedPage(() => import("../pages/ProjectPlatformBomPage"), "ProjectPlatformBomPage");
const ProjectReportPage = lazyNamedPage(() => import("../pages/ProjectReportPage"), "ProjectReportPage");
const ProjectRequirementsPage = lazyNamedPage(() => import("../pages/ProjectRequirementsPage"), "ProjectRequirementsPage");
const ProjectRoutingPage = lazyNamedPage(() => import("../pages/ProjectRoutingPage"), "ProjectRoutingPage");
const ProjectSecurityPage = lazyNamedPage(() => import("../pages/ProjectSecurityPage"), "ProjectSecurityPage");
const ProjectSettingsPage = lazyNamedPage(() => import("../pages/ProjectSettingsPage"), "ProjectSettingsPage");
const ProjectSitesPage = lazyNamedPage(() => import("../pages/ProjectSitesPage"), "ProjectSitesPage");
const ProjectStandardsPage = lazyNamedPage(() => import("../pages/ProjectStandardsPage"), "ProjectStandardsPage");
const ProjectTasksPage = lazyNamedPage(() => import("../pages/ProjectTasksPage"), "ProjectTasksPage");
const ProjectValidationPage = lazyNamedPage(() => import("../pages/ProjectValidationPage"), "ProjectValidationPage");
const ProjectVlansPage = lazyNamedPage(() => import("../pages/ProjectVlansPage"), "ProjectVlansPage");
const RegisterPage = lazyNamedPage(() => import("../pages/RegisterPage"), "RegisterPage");
const ResetPasswordPage = lazyNamedPage(() => import("../pages/ResetPasswordPage"), "ResetPasswordPage");
const RouteErrorPage = lazyNamedPage(() => import("../pages/RouteErrorPage"), "RouteErrorPage");

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: routePage(RouteErrorPage, "error page"),
    children: [
      { path: "/", element: routePage(LandingPage, "home") },
      { path: "/about", element: routePage(AboutPage, "about") },
      { path: "/help", element: routePage(HelpPage, "help") },
      { path: "/faq", element: routePage(FaqPage, "FAQ") },
    ],
  },
  {
    element: <AuthLayout />,
    errorElement: routePage(RouteErrorPage, "error page"),
    children: [
      { path: "/login", element: routePage(LoginPage, "login") },
      { path: "/register", element: routePage(RegisterPage, "registration") },
      { path: "/forgot-password", element: routePage(ForgotPasswordPage, "password reset") },
      { path: "/reset-password", element: routePage(ResetPasswordPage, "password reset") },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    errorElement: routePage(RouteErrorPage, "error page"),
    children: [
      { path: "/dashboard", element: routePage(DashboardPage, "dashboard") },
      { path: "/dashboard/about", element: routePage(AboutPage, "about") },
      { path: "/dashboard/help", element: routePage(HelpPage, "help") },
      { path: "/dashboard/faq", element: routePage(FaqPage, "FAQ") },
      { path: "/projects/new", element: routePage(NewProjectPage, "new project") },
      { path: "/ai", element: routePage(AIWorkspacePage, "AI workspace") },
      { path: "/my-tasks", element: routePage(MyTasksPage, "tasks") },
      { path: "/account/security", element: routePage(AccountSecurityPage, "account security") },
      {
        path: "/projects/:projectId",
        element: <ProjectLayout />,
        children: [
          { index: true, element: <Navigate to="discovery" replace /> },
          { path: "discovery", element: routePage(ProjectDiscoveryPage, "discovery") },
          { path: "requirements", element: routePage(ProjectRequirementsPage, "requirements") },
          { path: "logical-design", element: routePage(ProjectOverviewPage, "design package") },
          { path: "overview", element: routePage(ProjectOverviewPage, "overview") },
          { path: "core-model", element: routePage(ProjectCoreModelPage, "shared design model") },
          { path: "addressing", element: routePage(ProjectAddressingPage, "addressing") },
          { path: "enterprise-ipam", element: routePage(ProjectEnterpriseIpamPage, "IPAM") },
          { path: "security", element: routePage(ProjectSecurityPage, "security") },
          { path: "routing", element: routePage(ProjectRoutingPage, "routing") },
          { path: "implementation", element: routePage(ProjectImplementationPage, "implementation") },
          { path: "standards", element: routePage(ProjectStandardsPage, "standards") },
          { path: "platform", element: routePage(ProjectPlatformBomPage, "platform") },
          { path: "sites", element: routePage(ProjectSitesPage, "sites") },
          { path: "vlans", element: routePage(ProjectVlansPage, "VLANs") },
          { path: "validation", element: routePage(ProjectValidationPage, "validation") },
          { path: "diagram", element: routePage(ProjectDiagramPage, "diagram") },
          { path: "tasks", element: routePage(ProjectTasksPage, "tasks") },
          { path: "report", element: routePage(ProjectReportPage, "report") },
          { path: "settings", element: routePage(ProjectSettingsPage, "settings") },
        ],
      },
    ],
  },
]);
