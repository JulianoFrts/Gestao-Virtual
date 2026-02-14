import { signal } from "@preact/signals-react";

export const isSidebarOpenSignal = signal(true);

export const toggleSidebar = () => {
  isSidebarOpenSignal.value = !isSidebarOpenSignal.value;
};

export const setSidebarOpen = (isOpen: boolean) => {
  isSidebarOpenSignal.value = isOpen;
};
