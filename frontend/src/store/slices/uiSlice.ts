import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  isSidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  activeModal: string | null;
  loading: Record<string, boolean>;
}

const initialState: UIState = {
  isSidebarOpen: true,
  theme: 'system',
  activeModal: null,
  loading: {},
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setTheme: (state, action: PayloadAction<UIState['theme']>) => {
      state.theme = action.payload;
    },
    openModal: (state, action: PayloadAction<string>) => {
      state.activeModal = action.payload;
    },
    closeModal: (state) => {
      state.activeModal = null;
    },
    setLoading: (state, action: PayloadAction<{ id: string; isLoading: boolean }>) => {
      state.loading[action.payload.id] = action.payload.isLoading;
    },
  },
});

export const { toggleSidebar, setTheme, openModal, closeModal, setLoading } = uiSlice.actions;
export default uiSlice.reducer;
