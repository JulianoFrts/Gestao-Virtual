import { lazy } from "react";
import { RouteConfig } from "../config";

const Auth = lazy(() => import("../../pages/Auth"));

export const authRoutes: RouteConfig[] = [
  {
    path: "/auth",
    element: Auth,
    layout: "desktop",
  },
];
