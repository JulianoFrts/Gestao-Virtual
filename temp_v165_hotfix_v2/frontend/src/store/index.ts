import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import teamsReducer from './slices/teamsSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    teams: teamsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
