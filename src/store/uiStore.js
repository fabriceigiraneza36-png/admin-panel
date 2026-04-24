import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useUIStore = create(
  persist(
    (set) => ({
      sidebarOpen: true,
      sidebarCollapsed: false,
      theme: 'light',
      viewMode: 'grid', // 'grid' or 'list'
      
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      toggleSidebarCollapse: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      setTheme: (theme) => set({ theme }),
      
      toggleTheme: () => set((state) => ({ 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      })),
      
      setViewMode: (mode) => set({ viewMode: mode }),
      
      toggleViewMode: () => set((state) => ({ 
        viewMode: state.viewMode === 'grid' ? 'list' : 'grid' 
      })),
    }),
    {
      name: 'ui-storage',
    }
  )
);