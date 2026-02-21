import { lazy } from "react";
import { RouteConfig } from "../config";

const GeoViewerPage = lazy(() => import("../../modules/geo-viewer/pages/GeoViewerPage"));

export const extraRoutes: RouteConfig[] = [
  {
    path: "/geo-viewer/raw",
    element: GeoViewerPage,
    layout: "none",
  },
];
