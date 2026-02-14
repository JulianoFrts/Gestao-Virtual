import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { routes, RouteConfig } from "./config";
import { ProtectedRoute } from "./ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

// Move ProtectedRoute logic here if possible, but for now we import it from App.tsx
// to keep the logic consistent while refactoring.

export const RouteRenderer: React.FC = () => {
  const renderRoute = (route: RouteConfig) => {
    const element = (
      <ProtectedRoute 
        moduleId={route.moduleId} 
        requireConnection={route.requireConnection}
      >
        <Suspense fallback={<LoadingScreen />}>
          {route.element}
        </Suspense>
      </ProtectedRoute>
    );

    return element;
  };

  // Group routes by layout
  const appRoutes = routes.filter(r => r.layout === "app");
  const fullscreenRoutes = routes.filter(r => r.layout === "fullscreen");
  const noneRoutes = routes.filter(r => r.layout === "none" || r.layout === "desktop");

  return (
    <Routes>
      {/* Routes NO LAYOUT */}
      {noneRoutes.map(route => (
        <Route 
          key={route.path} 
          path={route.path} 
          element={<Suspense fallback={<LoadingScreen />}>{route.element}</Suspense>} 
        />
      ))}

      {/* Routes WITH AppLayout */}
      <Route element={<AppLayout />}>
        {appRoutes.map(route => (
          <Route 
            key={route.path} 
            path={route.path} 
            element={renderRoute(route)} 
          />
        ))}
      </Route>

      {/* Routes FULLSCREEN */}
      {fullscreenRoutes.map(route => (
        <Route 
          key={route.path} 
          path={route.path} 
          element={renderRoute(route)} 
        />
      ))}

      {/* Default Redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
