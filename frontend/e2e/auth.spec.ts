import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should display login form', async ({ page }) => {
    await expect(page.locator('h1:has-text("Welcome back")')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button:has-text("Sign in")')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button:has-text("Sign in")')
    await expect(page.locator('text=Invalid email or password')).toBeVisible()
  })

  test('should login with demo credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'john@teampulse.demo')
    await page.fill('input[type="password"]', 'Demo@12345')
    await page.click('button:has-text("Sign in")')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('should navigate to register page', async ({ page }) => {
    await page.click('a:has-text("Sign up")')
    await expect(page).toHaveURL(/\/register/)
  })
})