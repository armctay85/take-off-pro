import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login/register page', async ({ page }) => {
    // Check if the page has the expected elements
    await expect(page.locator('body')).toBeVisible();
    
    // Look for common auth-related elements
    const pageContent = await page.content();
    const hasAuthElements = 
      pageContent.toLowerCase().includes('login') ||
      pageContent.toLowerCase().includes('sign in') ||
      pageContent.toLowerCase().includes('register') ||
      pageContent.toLowerCase().includes('get started');
    
    expect(hasAuthElements).toBe(true);
  });

  test('should navigate to auth page when clicking login', async ({ page }) => {
    // Try to find and click a login button/link
    const loginButton = page.locator('text=/login|sign in|get started/i').first();
    
    if (await loginButton.isVisible().catch(() => false)) {
      await loginButton.click();
      await page.waitForLoadState('networkidle');
      
      // Check URL changed or modal appeared
      const url = page.url();
      expect(url.includes('login') || url.includes('auth') || await page.locator('input[type="email"]').isVisible().catch(() => false)).toBe(true);
    }
  });
});
