import { describe, it, expect } from 'vitest';
import uiReducer, { toggleSidebar, setTheme } from '../../../src/store/slices/uiSlice';

describe('uiSlice', () => {
  const initialState = {
    isSidebarOpen: true,
    theme: 'system' as const,
    activeModal: null,
    loading: {},
  };

  it('deve retornar o estado inicial', () => {
    expect(uiReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('deve alternar a visibilidade da barra lateral', () => {
    const state = uiReducer(initialState, toggleSidebar());
    expect(state.isSidebarOpen).toBe(false);
    
    const secondState = uiReducer(state, toggleSidebar());
    expect(secondState.isSidebarOpen).toBe(true);
  });

  it('deve atualizar o tema', () => {
    const state = uiReducer(initialState, setTheme('dark'));
    expect(state.theme).toBe('dark');
  });
});
