import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { CacheWarmingProvider } from "@/contexts/CacheWarmingContext";
import { ThemeProvider } from "@/components/theme-provider";
import { useSignals } from "@preact/signals-react/runtime";
import { LoadingScreen } from "./components/shared/LoadingScreen";
import { isAppReadySignal } from "./signals/appInitSignals";
import { GlobalInitializer } from "./components/GlobalInitializer";
import { RouteRenderer } from "./routes/RouteRenderer";

const queryClient = new QueryClient();

function AppRoutes() {
  useSignals();
  const { isLoading, user } = useAuth();
  const isReady = isAppReadySignal.value;

  return (
    <>
      {user && <GlobalInitializer />}
      {(!isReady || (isLoading && !user)) ? (
        <LoadingScreen />
      ) : (
        <RouteRenderer />
      )}
    </>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="orion-slate" storageKey="obraponto-theme">
          <AuthProvider>
            <CacheWarmingProvider>
              <SyncProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </SyncProvider>
            </CacheWarmingProvider>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
