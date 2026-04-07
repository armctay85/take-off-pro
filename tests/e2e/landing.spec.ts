import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display landing page with branding', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Develoop|Project Management|CPM/i);
    
    // Check for main content
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(100);
    
    // Check for navigation or header
    const header = page.locator('header, nav, [role="banner"]').first();
    await expect(header).toBeVisible();
  });

  test('should have working navigation links', async ({ page }) => {
    // Look for navigation links
    const links = page.locator('a');
    const count = await links.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Check that links have valid hrefs
    for (let i = 0; i < Math.min(count, 5); i++) {
      const href = await links.nth(i).getAttribute('href');
      if (href) {
        expect(href).toMatch(/^\/.*/);
      }
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(body).toBeVisible();
  });
});
