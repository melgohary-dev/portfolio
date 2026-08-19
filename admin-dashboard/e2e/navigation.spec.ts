import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("sidebar shows Dashboard, Users, Orders, Settings links", async ({ page }) => {
    await page.goto("/");
    const sidebar = page.locator("nav").first();
    await expect(sidebar.getByText("Dashboard")).toBeVisible();
    await expect(sidebar.getByText("Users")).toBeVisible();
    await expect(sidebar.getByText("Orders")).toBeVisible();
    await expect(sidebar.getByText("Settings")).toBeVisible();
  });

  test("navigates to Orders page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Orders" }).click();
    await expect(page).toHaveURL(/\/orders/);
    await expect(page.getByRole("grid")).toBeVisible();
  });

  test("navigates to Users page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Users" }).click();
    await expect(page).toHaveURL(/\/users/);
    await expect(page.getByRole("heading", { level: 1, name: "Users" })).toBeVisible();
  });

  test("navigates to Settings page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
  });

  test("navigates back to Dashboard from Orders", async ({ page }) => {
    await page.goto("/orders");
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
  });

  test("skip-to-content link is accessible via keyboard", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByText("Skip to content");
    // The skip link becomes visible on focus
    await expect(skipLink).toBeFocused();
  });
});
