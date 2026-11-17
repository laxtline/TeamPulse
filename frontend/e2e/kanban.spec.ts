import { test, expect } from '@playwright/test'

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', 'john@teampulse.demo')
    await page.fill('input[type="password"]', 'Demo@12345')
    await page.click('button:has-text("Sign in")')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('should display kanban board for project', async ({ page }) => {
    await page.goto('/teams/acme-corp/projects/acme')
    await expect(page.locator('h1:has-text("Acme Project")')).toBeVisible()
    await expect(page.locator('[data-testid="kanban-column"]')).toHaveCount(5)
  })

  test('should create a new task', async ({ page }) => {
    await page.goto('/teams/acme-corp/projects/acme')
    await page.click('button:has-text("New Task")')
    await expect(page).toHaveURL(/\/tasks\//)
  })

  test('should drag and drop task between columns', async ({ page }) => {
    await page.goto('/teams/acme-corp/projects/acme')

    // Wait for tasks to load
    await page.waitForSelector('[data-testid="kanban-card"]')

    const taskCard = page.locator('[data-testid="kanban-card"]').first()
    const targetColumn = page.locator('[data-testid="kanban-column"]:has-text("In Progress")')

    await taskCard.dragTo(targetColumn)
    await expect(page.locator('[data-testid="kanban-column"]:has-text("In Progress") [data-testid="kanban-card"]')).toHaveCount(1)
  })
})