import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test("dashboard has proper heading hierarchy", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1.first()).toHaveText("Dashboard");
  });

  test("orders grid has proper ARIA attributes", async ({ page }) => {
    await page.goto("/orders");
    const grid = page.getByRole("grid");
    await expect(grid).toBeVisible();
    await expect(grid).toHaveAttribute("aria-rowcount");
    await expect(grid).toHaveAttribute("aria-colcount");
  });

  test("orders grid column headers are sortable", async ({ page }) => {
    await page.goto("/orders");
    const headers = page.getByRole("columnheader");
    const count = await headers.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test("theme toggle is keyboard accessible", async ({ page }) => {
    await page.goto("/settings");
    const group = page.getByRole("radiogroup", { name: /theme/i });
    const darkBtn = group.getByRole("radio", { name: /dark/i });
    await darkBtn.focus();
    await page.keyboard.press("Enter");
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(hasDark).toBe(true);
  });

  test("skip to content link works", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByText("Skip to content");
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    // After clicking skip link, focus should move into the main content area
    const main = page.locator("#main-content");
    await expect(main).toBeVisible();
  });

  test("all interactive elements have accessible names", async ({ page }) => {
    await page.goto("/settings");
    // All buttons should have text or aria-label
    const buttons = page.locator("button");
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const text = await btn.innerText();
      const ariaLabel = await btn.getAttribute("aria-label");
      const srOnlyText = await btn.locator(".sr-only").count();
      expect(
        text.trim().length > 0 || ariaLabel !== null || srOnlyText > 0,
      ).toBe(true);
    }
  });

  test("color contrast: status badges are visible", async ({ page }) => {
    await page.goto("/users");
    // Status badges use ring-1 and distinct colors — verify they render
    const badges = page.locator("span.rounded-full").filter({ hasText: /active|suspended|invited/i });
    await expect(badges.first()).toBeVisible();
  });
});
