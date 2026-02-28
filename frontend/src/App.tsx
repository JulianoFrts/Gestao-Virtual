import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { LayoutProvider } from "@/contexts/LayoutContext";
import { DailyReportProvider } from "@/contexts/DailyReportContext";
import { RDOSchedulingProvider } from "@/contexts/RDOSchedulingContext";
import CacheWarmingProvider from "@/contexts/CacheWarmingContext";
import { ThemeProvider } from "@/components/theme-provider";
import { InitProvider, useInit } from "@/contexts/InitContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { LoaderProvider } from "@/contexts/LoaderContext";
import { LoadingScreen } from "./components/shared/LoadingScreen";
import { GlobalInitializer } from "./components/GlobalInitializer";
import { RouteRenderer } from "./routes/RouteRenderer";
import { SecurityInterceptor } from "./components/SecurityInterceptor";

const queryClient = new QueryClient();

function AppRoutes() {
  const { isLoading, user } = useAuth();
  const { isReady } = useInit();

  // If we have a user, show the initialization components
  const initOverlay = user ? (
    <React.Fragment>
      <GlobalInitializer />
      <div className="fixed top-4 right-4 z-50 pointer-events-none opacity-50">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-loader-circle h-3 w-3 animate-spin text-primary/50">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
        </svg>
      </div>
    </React.Fragment>
  ) : null;

  // Decision on what to show as main content
  const showLoading = !isReady || (isLoading && !user);

  return (
    <>
      {initOverlay}
      {showLoading ? <LoadingScreen /> : <RouteRenderer />}
    </>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <LoaderProvider>
              <InitProvider>
                <SyncProvider>
                  <LayoutProvider>
                    <DailyReportProvider>
                      <RDOSchedulingProvider>
                        <CacheWarmingProvider>
                          <ThemeProvider defaultTheme="business-navy" storageKey="vite-ui-theme">
                            <TooltipProvider>
                              <SecurityInterceptor />
                              <AppRoutes />
                              <Toaster />
                              <Sonner position="top-right" />
                              <ReactQueryDevtools initialIsOpen={false} />
                            </TooltipProvider>
                          </ThemeProvider>
                        </CacheWarmingProvider>
                      </RDOSchedulingProvider>
                    </DailyReportProvider>
                  </LayoutProvider>
                </SyncProvider>
              </InitProvider>
            </LoaderProvider>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
