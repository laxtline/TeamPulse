import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  // Desktop: collapse the sidebar down to icons. Mobile: whether the drawer is
  // open. They are separate so resizing the window doesn't leave the drawer
  // hanging open.
  sidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  mobileSidebarOpen: boolean
  toggleMobileSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      mobileSidebarOpen: false,
      toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
      setMobileSidebarOpen: (open: boolean) => set({ mobileSidebarOpen: open }),
      toasts: [],
      addToast: (toast) => {
        const id = Math.random().toString(36).slice(2)
        const newToast = { ...toast, id }
        set((state) => ({ toasts: [...state.toasts, newToast] }))
        setTimeout(() => {
          get().removeToast(id)
        }, toast.duration || 5000)
      },
      removeToast: (id: string) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'ui-store',
      // Theme lives in next-themes, not here. Persisting it twice used to make
      // the toggle and the Appearance tab disagree on which theme was active.
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen }),
    }
  )
)
