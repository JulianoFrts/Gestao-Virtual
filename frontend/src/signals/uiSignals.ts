import { signal } from "@preact/signals-react";

export const isSidebarOpenSignal = signal(true);

export const toggleSidebar = () => {
  isSidebarOpenSignal.value = !isSidebarOpenSignal.value;
};

export const setSidebarOpen = (isOpen: boolean) => {
  isSidebarOpenSignal.value = isOpen;
};

export const isFocusModeSignal = signal(false);

export const setFocusMode = (isFocus: boolean) => {
  isFocusModeSignal.value = isFocus;
};

export const toggleFocusMode = () => {
  isFocusModeSignal.value = !isFocusModeSignal.value;
};

