import { create } from 'zustand'
import { Team, TeamMember, Project, Task } from '@/types'

interface TeamState {
  currentTeam: Team | null
  setCurrentTeam: (team: Team | null) => void
  currentProject: Project | null
  setCurrentProject: (project: Project | null) => void
  members: TeamMember[]
  setMembers: (members: TeamMember[]) => void
  addMember: (member: TeamMember) => void
  updateMember: (userId: string, role: string) => void
  removeMember: (userId: string) => void
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  addTask: (task: Task) => void
  updateTask: (taskId: string, updates: Partial<Task>) => void
  removeTask: (taskId: string) => void
  moveTask: (taskId: string, status: string, position: number) => void
}

export const useTeamStore = create<TeamState>((set) => ({
  currentTeam: null,
  setCurrentTeam: (team) => set({ currentTeam: team }),
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),
  members: [],
  setMembers: (members) => set({ members }),
  addMember: (member) => set((state) => ({ members: [...state.members, member] })),
  updateMember: (userId, role) =>
    set((state) => ({
      members: state.members.map((m) => (m.user_id === userId ? { ...m, role } : m)),
    })),
  removeMember: (userId) =>
    set((state) => ({ members: state.members.filter((m) => m.user_id !== userId) })),
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
    })),
  removeTask: (taskId) =>
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== taskId) })),
  moveTask: (taskId, status, position) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: status as Task['status'], position } : t
      ),
    })),
}))