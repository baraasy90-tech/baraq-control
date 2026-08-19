import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AppRoot } from "@/app/AppRoot";
import { JoinScreen } from "@/features/auth/JoinScreen";

const HomePage = lazy(() => import("@/app/HomePage").then((m) => ({ default: m.HomePage })));
const ControlPanelPage = lazy(() => import("@/app/ControlPanelPage").then((m) => ({ default: m.ControlPanelPage })));
const TasksPage = lazy(() => import("@/app/TasksPage").then((m) => ({ default: m.TasksPage })));
const OverviewPage = lazy(() => import("@/app/OverviewPage").then((m) => ({ default: m.OverviewPage })));
const DepartmentsPage = lazy(() => import("@/app/DepartmentsPage").then((m) => ({ default: m.DepartmentsPage })));
const StructurePage = lazy(() => import("@/app/StructurePage").then((m) => ({ default: m.StructurePage })));
const ProjectPage = lazy(() => import("@/app/ProjectPage").then((m) => ({ default: m.ProjectPage })));
const ProjectAppearancePage = lazy(() =>
  import("@/app/ProjectAppearancePage").then((m) => ({ default: m.ProjectAppearancePage }))
);
const ProjectScopePage = lazy(() => import("@/app/ProjectScopePage").then((m) => ({ default: m.ProjectScopePage })));
const ProjectAdminPage = lazy(() => import("@/app/ProjectAdminPage").then((m) => ({ default: m.ProjectAdminPage })));
const ProjectImportPage = lazy(() => import("@/app/ProjectImportPage").then((m) => ({ default: m.ProjectImportPage })));
const ProjectReceivingPage = lazy(() =>
  import("@/app/ProjectReceivingPage").then((m) => ({ default: m.ProjectReceivingPage }))
);
const ProjectBudgetPage = lazy(() => import("@/app/ProjectBudgetPage").then((m) => ({ default: m.ProjectBudgetPage })));
const ProjectDocumentsPage = lazy(() =>
  import("@/app/ProjectDocumentsPage").then((m) => ({ default: m.ProjectDocumentsPage }))
);
const ProjectTeamPage = lazy(() => import("@/app/ProjectTeamPage").then((m) => ({ default: m.ProjectTeamPage })));
const ProjectTimelinePage = lazy(() =>
  import("@/app/ProjectTimelinePage").then((m) => ({ default: m.ProjectTimelinePage }))
);
const ProjectContractPage = lazy(() =>
  import("@/app/ProjectContractPage").then((m) => ({ default: m.ProjectContractPage }))
);
const ProjectContractDetailPage = lazy(() =>
  import("@/app/ProjectContractDetailPage").then((m) => ({ default: m.ProjectContractDetailPage }))
);
const ApprovalsPage = lazy(() => import("@/app/ApprovalsPage").then((m) => ({ default: m.ApprovalsPage })));
const MaterialApprovalsPage = lazy(() =>
  import("@/app/MaterialApprovalsPage").then((m) => ({ default: m.MaterialApprovalsPage }))
);
const MyRequestsPage = lazy(() => import("@/app/MyRequestsPage").then((m) => ({ default: m.MyRequestsPage })));
const ProjectMaterialsPage = lazy(() =>
  import("@/app/ProjectMaterialsPage").then((m) => ({ default: m.ProjectMaterialsPage }))
);
const ProjectMaterialDetailPage = lazy(() =>
  import("@/app/ProjectMaterialDetailPage").then((m) => ({ default: m.ProjectMaterialDetailPage }))
);

export const router = createBrowserRouter([
  { path: "/join/:token", element: <JoinScreen /> },
  {
    path: "/",
    element: <AppRoot />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "control-panel", element: <ControlPanelPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "approvals", element: <ApprovalsPage /> },
      { path: "material-approvals", element: <MaterialApprovalsPage /> },
      { path: "my-requests", element: <MyRequestsPage /> },
      { path: "overview", element: <OverviewPage /> },
      { path: "departments", element: <DepartmentsPage /> },
      { path: "structure", element: <StructurePage /> },
      { path: "projects/:id", element: <ProjectPage /> },
      { path: "projects/:id/appearance", element: <ProjectAppearancePage /> },
      { path: "projects/:id/scope", element: <ProjectScopePage /> },
      { path: "projects/:id/admin", element: <ProjectAdminPage /> },
      { path: "projects/:id/import", element: <ProjectImportPage /> },
      { path: "projects/:id/receiving", element: <ProjectReceivingPage /> },
      { path: "projects/:id/budget", element: <ProjectBudgetPage /> },
      { path: "projects/:id/documents", element: <ProjectDocumentsPage /> },
      { path: "projects/:id/team", element: <ProjectTeamPage /> },
      { path: "projects/:id/timeline", element: <ProjectTimelinePage /> },
      { path: "projects/:id/contract", element: <ProjectContractPage /> },
      { path: "projects/:id/contract/:contractId", element: <ProjectContractDetailPage /> },
      { path: "projects/:id/materials", element: <ProjectMaterialsPage /> },
      { path: "projects/:id/materials/:requestId", element: <ProjectMaterialDetailPage /> },
    ],
  },
]);
