import { test, expect } from '@playwright/test'

test.describe('Teams', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('input[type="email"]', 'john@teampulse.demo')
    await page.fill('input[type="password"]', 'Demo@12345')
    await page.click('button:has-text("Sign in")')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('should display teams page', async ({ page }) => {
    await page.goto('/teams')
    await expect(page.locator('h1:has-text("Teams")')).toBeVisible()
  })

  test('should create a new team', async ({ page }) => {
    await page.goto('/teams')
    await page.click('button:has-text("Create Team")')
    await expect(page.locator('h2:has-text("Create New Team")')).toBeVisible()

    await page.fill('input[placeholder="e.g., Acme Corp"]', 'Test Team')
    await page.fill('textarea[placeholder="Brief description of your team..."]', 'A test team for E2E testing')
    await page.click('button:has-text("Create Team")')

    await expect(page.locator('text=Test Team')).toBeVisible()
  })

  test('should navigate to team detail', async ({ page }) => {
    await page.goto('/teams')
    // Click on first team card
    await page.locator('[data-testid="team-card"]').first().click()
    await expect(page).toHaveURL(/\/teams\//)
  })
})