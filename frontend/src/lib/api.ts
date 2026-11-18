import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { getSession } from 'next-auth/react'
import type {
  AIPriority,
  Comment,
  Project,
  StandupSummary,
  Task,
  Team,
  TeamMember,
  User,
} from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// OAuth logins hold their tokens in the NextAuth session, so every request
// carries a Bearer header. Cached briefly to avoid a session fetch per call.
let tokenCache: { value: string | null; at: number } = { value: null, at: 0 }

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (!config.headers.Authorization) {
      if (Date.now() - tokenCache.at > 5000) {
        const session = await getSession().catch(() => null)
        tokenCache = { value: session?.accessToken ?? null, at: Date.now() }
      }
      if (tokenCache.value) {
        config.headers.Authorization = `Bearer ${tokenCache.value}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        await axios.post(
          `${API_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        )
        return api(originalRequest)
      } catch {
        // Only bounce to the login page if the user was somewhere private.
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')
        ) {
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

/**
 * Every API method resolves to the response *payload*, not the axios response
 * object, so callers can use the result directly (e.g. `teams.map(...)`).
 */
const payload = <T>(request: Promise<AxiosResponse<T>>): Promise<T> =>
  request.then((response) => response.data)

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface CurrentUserResponse {
  user: User
  teams: Team[]
}

export const authApi = {
  register: (data: { email: string; password: string; full_name: string }) =>
    payload<TokenPair>(api.post('/auth/register', data)),
  login: (data: { email: string; password: string }) =>
    payload<TokenPair>(api.post('/auth/login', data)),
  logout: () => payload<{ message: string }>(api.post('/auth/logout')),
  me: () => payload<CurrentUserResponse>(api.get('/auth/me')),
  refresh: () => payload<TokenPair>(api.post('/auth/refresh')),
  updateProfile: (data: { full_name: string }) => payload<User>(api.patch('/auth/me', data)),
  changePassword: (data: { current_password: string; new_password: string }) =>
    payload<{ message: string }>(api.post('/auth/change-password', data)),
}

export const teamsApi = {
  list: () => payload<Team[]>(api.get('/teams')),
  create: (data: { name: string; description?: string }) =>
    payload<Team>(api.post('/teams', data)),
  get: (teamId: string) => payload<Team>(api.get(`/teams/${teamId}`)),
  update: (teamId: string, data: { name?: string; description?: string }) =>
    payload<Team>(api.patch(`/teams/${teamId}`, data)),
  delete: (teamId: string) => payload<void>(api.delete(`/teams/${teamId}`)),
  inviteMember: (teamId: string, data: { email: string; role: string }) =>
    payload<TeamMember>(api.post(`/teams/${teamId}/members`, data)),
  updateMember: (teamId: string, userId: string, data: { role: string }) =>
    payload<TeamMember>(api.patch(`/teams/${teamId}/members/${userId}`, data)),
  removeMember: (teamId: string, userId: string) =>
    payload<void>(api.delete(`/teams/${teamId}/members/${userId}`)),
}

export const projectsApi = {
  list: (teamId: string) => payload<Project[]>(api.get(`/teams/${teamId}/projects`)),
  create: (teamId: string, data: { name: string; description?: string; key_prefix: string }) =>
    payload<Project>(api.post(`/teams/${teamId}/projects`, data)),
  get: (teamId: string, projectId: string) =>
    payload<Project>(api.get(`/teams/${teamId}/projects/${projectId}`)),
  update: (teamId: string, projectId: string, data: { name?: string; description?: string }) =>
    payload<Project>(api.patch(`/teams/${teamId}/projects/${projectId}`, data)),
  delete: (teamId: string, projectId: string) =>
    payload<void>(api.delete(`/teams/${teamId}/projects/${projectId}`)),
}

export const tasksApi = {
  list: (projectId: string, params?: {
    status?: string
    assignee_id?: string
    priority?: string
    search?: string
  }) => payload<Task[]>(api.get(`/projects/${projectId}/tasks`, { params })),
  create: (projectId: string, data: {
    title: string
    description?: string
    status?: string
    priority?: string
    assignee_id?: string
    story_points?: number
    due_date?: string
  }) => payload<Task>(api.post(`/projects/${projectId}/tasks`, data)),
  get: (taskId: string) => payload<Task>(api.get(`/tasks/${taskId}`)),
  update: (projectId: string, taskId: string, data: Partial<Task>) =>
    payload<Task>(api.patch(`/projects/${projectId}/tasks/${taskId}`, data)),
  move: (projectId: string, taskId: string, data: { status: string; position: number }) =>
    payload<Task>(api.patch(`/projects/${projectId}/tasks/${taskId}/move`, data)),
  assign: (projectId: string, taskId: string, data: { assignee_id: string | null }) =>
    payload<Task>(api.patch(`/projects/${projectId}/tasks/${taskId}/assign`, data)),
  getPriority: (taskId: string) => payload<AIPriority>(api.post(`/tasks/${taskId}/priority`)),
  delete: (projectId: string, taskId: string) =>
    payload<void>(api.delete(`/projects/${projectId}/tasks/${taskId}`)),
}

export const commentsApi = {
  list: (taskId: string, page = 1, size = 50) =>
    payload<Comment[]>(api.get(`/tasks/${taskId}/comments`, { params: { page, size } })),
  create: (taskId: string, data: { content: string }) =>
    payload<Comment>(api.post(`/tasks/${taskId}/comments`, data)),
  update: (taskId: string, commentId: string, data: { content: string }) =>
    payload<Comment>(api.patch(`/tasks/${taskId}/comments/${commentId}`, data)),
  delete: (taskId: string, commentId: string) =>
    payload<void>(api.delete(`/tasks/${taskId}/comments/${commentId}`)),
}

export const aiApi = {
  standupSummary: (data: { user_name: string; activities: any[]; date: string }) =>
    payload<StandupSummary>(api.post('/ai/standup-summary', data)),
  taskPriority: (data: {
    task_title: string
    task_description?: string
    due_date?: string
    assignee_workload: number
    project_velocity: number
  }) => payload<AIPriority>(api.post('/ai/task-priority', data)),
  myStandup: (date: string) =>
    payload<StandupSummary>(api.post('/ai/my-standup', null, { params: { date } })),
  projectInsights: (projectId: string) =>
    payload<Record<string, unknown>>(api.get(`/ai/insights/${projectId}`)),
}
