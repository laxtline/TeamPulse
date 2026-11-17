import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamsApi, projectsApi, tasksApi } from '@/lib/api'
import { Team, Project, Task } from '@/types'

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.list,
  })
}

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: ['teams', teamId],
    queryFn: () => teamsApi.get(teamId),
    enabled: !!teamId,
  })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: teamsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export function useUpdateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: { name?: string; description?: string } }) =>
      teamsApi.update(teamId, data),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export function useDeleteTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: teamsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: { email: string; role: string } }) =>
      teamsApi.inviteMember(teamId, data),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] })
    },
  })
}

export function useUpdateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      teamId,
      userId,
      data,
    }: {
      teamId: string
      userId: string
      data: { role: string }
    }) => teamsApi.updateMember(teamId, userId, data),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] })
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      teamsApi.removeMember(teamId, userId),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] })
    },
  })
}

export function useProjects(teamId: string) {
  return useQuery({
    queryKey: ['projects', teamId],
    queryFn: () => projectsApi.list(teamId),
    enabled: !!teamId,
  })
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: !!projectId,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: { name: string; description?: string; key_prefix: string } }) =>
      projectsApi.create(teamId, data),
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['projects', teamId] })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: { name?: string; description?: string } }) =>
      projectsApi.update(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] })
    },
  })
}

export function useTasks(projectId: string, filters?: { status?: string; assignee_id?: string; priority?: string; search?: string }) {
  return useQuery({
    queryKey: ['tasks', projectId, filters],
    queryFn: () => tasksApi.list(projectId, filters),
    enabled: !!projectId,
  })
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => tasksApi.get(taskId),
    enabled: !!taskId,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: any }) => tasksApi.create(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) => tasksApi.update(taskId, data),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
    },
  })
}

export function useMoveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: { status: string; position: number } }) =>
      tasksApi.move(taskId, data),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
    },
  })
}

export function useAssignTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: { assignee_id: string | null } }) =>
      tasksApi.assign(taskId, data),
    onSuccess: (_, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
    },
  })
}

export function useTaskPriority() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.getPriority,
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
    },
  })
}