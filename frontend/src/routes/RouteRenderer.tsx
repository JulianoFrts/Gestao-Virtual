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
    // Se for uma função (componente normal ou lazy), usamos como está
    // Se for um objeto com $$typeof (instância JSX), encapsulamos em um componente funcional
    const RouteElement = route.element as any;
    const isComponent = typeof RouteElement === 'function' || (RouteElement && RouteElement.render) || (RouteElement && RouteElement.$$typeof && !RouteElement.props);
    
    const Component = isComponent ? RouteElement : () => <>{RouteElement}</>;
    
    const element = (
      <ProtectedRoute 
        moduleId={route.moduleId} 
        requireConnection={route.requireConnection}
        roles={route.roles}
        isPublic={route.isPublic}
      >
        <Suspense fallback={<LoadingScreen />}>
          <Component />
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
          element={renderRoute(route)} 
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
