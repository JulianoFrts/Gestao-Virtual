import React, { createContext, useContext, useState, useEffect } from 'react';

interface LoaderContextType {
  concurrency: number;
  setConcurrency: (val: number) => void;
}

const STORAGE_KEY = "app_loader_concurrency";

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export function LoaderProvider({ children }: { children: React.ReactNode }) {
  const [concurrency, setConcurrencyState] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 0; // 0 = unlimited
  });

  const setConcurrency = (val: number) => {
    setConcurrencyState(val);
    localStorage.setItem(STORAGE_KEY, String(val));
  };

  return (
    <LoaderContext.Provider value={{ concurrency, setConcurrency }}>
      {children}
    </LoaderContext.Provider>
  );
}

export function useLoader() {
  const context = useContext(LoaderContext);
  if (context === undefined) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
}
