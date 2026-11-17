import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        await axios.post(
          `${API_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        )
        return api(originalRequest)
      } catch {
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

export const authApi = {
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
}

export const teamsApi = {
  list: () => api.get('/teams'),
  create: (data: { name: string; description?: string }) => api.post('/teams', data),
  get: (teamId: string) => api.get(`/teams/${teamId}`),
  update: (teamId: string, data: { name?: string; description?: string }) =>
    api.patch(`/teams/${teamId}`, data),
  delete: (teamId: string) => api.delete(`/teams/${teamId}`),
  inviteMember: (teamId: string, data: { email: string; role: string }) =>
    api.post(`/teams/${teamId}/members`, data),
  updateMember: (teamId: string, userId: string, data: { role: string }) =>
    api.patch(`/teams/${teamId}/members/${userId}`, data),
  removeMember: (teamId: string, userId: string) =>
    api.delete(`/teams/${teamId}/members/${userId}`),
}

export const projectsApi = {
  list: (teamId: string) => api.get(`/teams/${teamId}/projects`),
  create: (teamId: string, data: { name: string; description?: string; key_prefix: string }) =>
    api.post(`/teams/${teamId}/projects`, data),
  get: (projectId: string) => api.get(`/projects/${projectId}`),
  update: (projectId: string, data: { name?: string; description?: string }) =>
    api.patch(`/projects/${projectId}`, data),
  delete: (projectId: string) => api.delete(`/projects/${projectId}`),
}

export const tasksApi = {
  list: (projectId: string, params?: {
    status?: string
    assignee_id?: string
    priority?: string
    search?: string
  }) => api.get(`/projects/${projectId}/tasks`, { params }),
  create: (projectId: string, data: {
    title: string
    description?: string
    status?: string
    priority?: string
    assignee_id?: string
    story_points?: number
    due_date?: string
  }) => api.post(`/projects/${projectId}/tasks`, data),
  get: (taskId: string) => api.get(`/tasks/${taskId}`),
  update: (taskId: string, data: {
    title?: string
    description?: string
    status?: string
    priority?: string
    assignee_id?: string
    story_points?: number
    due_date?: string
  }) => api.patch(`/tasks/${taskId}`, data),
  move: (taskId: string, data: { status: string; position: number }) =>
    api.patch(`/tasks/${taskId}/move`, data),
  assign: (taskId: string, data: { assignee_id: string | null }) =>
    api.patch(`/tasks/${taskId}/assign`, data),
  getPriority: (taskId: string) => api.post(`/tasks/${taskId}/priority`),
  delete: (taskId: string) => api.delete(`/tasks/${taskId}`),
}

export const commentsApi = {
  list: (taskId: string, page = 1, size = 50) =>
    api.get(`/tasks/${taskId}/comments`, { params: { page, size } }),
  create: (taskId: string, data: { content: string }) =>
    api.post(`/tasks/${taskId}/comments`, data),
  update: (commentId: string, data: { content: string }) =>
    api.patch(`/comments/${commentId}`, data),
  delete: (commentId: string) => api.delete(`/comments/${commentId}`),
}

export const aiApi = {
  standupSummary: (data: { user_name: string; activities: any[]; date: string }) =>
    api.post('/ai/standup-summary', data),
  taskPriority: (data: {
    task_title: string
    task_description?: string
    due_date?: string
    assignee_workload: number
    project_velocity: number
  }) => api.post('/ai/task-priority', data),
  myStandup: (date: string) => api.post('/ai/my-standup', { date }),
  projectInsights: (projectId: string) => api.get(`/ai/insights/${projectId}`),
}