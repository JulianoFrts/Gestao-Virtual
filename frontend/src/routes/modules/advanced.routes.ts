import { lazy } from "react";
import { RouteConfig } from "../config";
import { MANAGEMENT_ROLES, VIEWER_ROLES } from "@/lib/constants/roles";

const Viewer3D = lazy(() => import("../../pages/Viewer3D"));
const GeoViewerPage = lazy(() => import("../../modules/geo-viewer/pages/GeoViewerPage"));
const ProjectProgress = lazy(() => import("../../pages/ProjectProgress"));

export const advancedRoutes: RouteConfig[] = [
  {
    path: "/viewer-3d",
    element: Viewer3D,
    moduleId: "viewer_3d.view",
    roles: MANAGEMENT_ROLES,
    layout: "fullscreen",
  },
  {
    path: "/geo-viewer",
    element: GeoViewerPage,
    moduleId: "geo_viewer.view",
    roles: VIEWER_ROLES,
    layout: "fullscreen",
  },
  {
    path: "/project-progress",
    element: ProjectProgress,
    moduleId: "projects.progress",
    roles: MANAGEMENT_ROLES,
    layout: "fullscreen",
  },
];
