import { describe, it, expect, vi, beforeEach } from 'vitest'

// The API layer is built on axios, so we swap it out for a fake instance and
// check the URLs and payloads our methods send.
const mockInstance = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
}

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockInstance),
    post: vi.fn(),
  },
}))

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('teamsApi', () => {
    it('should fetch teams list', async () => {
      const mockTeams = [
        { id: '1', name: 'Team 1', slug: 'team-1', description: 'Test team' },
        { id: '2', name: 'Team 2', slug: 'team-2', description: 'Another team' },
      ]

      mockInstance.get.mockResolvedValueOnce({ data: mockTeams })

      const { teamsApi } = await import('./api')
      const result = await teamsApi.list()

      expect(mockInstance.get).toHaveBeenCalledWith('/teams')
      expect(result).toEqual(mockTeams)
    })

    it('should create a team', async () => {
      const newTeam = { id: '3', name: 'New Team', slug: 'new-team', description: 'New team' }

      mockInstance.post.mockResolvedValueOnce({ data: newTeam })

      const { teamsApi } = await import('./api')
      const result = await teamsApi.create({ name: 'New Team', description: 'New team' })

      expect(mockInstance.post).toHaveBeenCalledWith('/teams', {
        name: 'New Team',
        description: 'New team',
      })
      expect(result).toEqual(newTeam)
    })
  })

  describe('tasksApi', () => {
    it('should fetch tasks for a project', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1', status: 'todo', priority: 'medium' },
        { id: '2', title: 'Task 2', status: 'in_progress', priority: 'high' },
      ]

      mockInstance.get.mockResolvedValueOnce({ data: mockTasks })

      const { tasksApi } = await import('./api')
      const result = await tasksApi.list('project-1')

      expect(mockInstance.get).toHaveBeenCalledWith('/projects/project-1/tasks', {
        params: undefined,
      })
      expect(result).toEqual(mockTasks)
    })

    it('should create a task', async () => {
      const newTask = { id: '3', title: 'New Task', status: 'backlog', priority: 'medium' }

      mockInstance.post.mockResolvedValueOnce({ data: newTask })

      const { tasksApi } = await import('./api')
      const result = await tasksApi.create('project-1', {
        title: 'New Task',
        status: 'backlog',
        priority: 'medium',
      })

      expect(mockInstance.post).toHaveBeenCalledWith('/projects/project-1/tasks', {
        title: 'New Task',
        status: 'backlog',
        priority: 'medium',
      })
      expect(result).toEqual(newTask)
    })
  })

  describe('aiApi', () => {
    it('should predict priority', async () => {
      const mockPrediction = {
        priority: 'high',
        confidence: 0.85,
        reasoning: 'This task has high impact',
      }

      mockInstance.post.mockResolvedValueOnce({ data: mockPrediction })

      const { aiApi } = await import('./api')
      const result = await aiApi.taskPriority({
        task_title: 'Important task',
        task_description: 'This is very important',
        assignee_workload: 5,
        project_velocity: 12,
      })

      expect(mockInstance.post).toHaveBeenCalledWith('/ai/task-priority', {
        task_title: 'Important task',
        task_description: 'This is very important',
        assignee_workload: 5,
        project_velocity: 12,
      })
      expect(result).toEqual(mockPrediction)
    })
  })
})
