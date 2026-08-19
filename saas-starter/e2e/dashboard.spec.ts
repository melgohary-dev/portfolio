import { test, expect, type Page } from "@playwright/test";

const SEED_EMAIL = "owner@acme.test";
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'test';

async function loginAsOwner(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(SEED_EMAIL);
  await page.getByLabel(/password/i).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/app/, { timeout: 15_000 });
}

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
  });

  test("displays KPI cards", async ({ page }) => {
    await expect(page.getByText(/total orders/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/revenue/i)).toBeVisible();
    await expect(page.getByText(/avg order/i)).toBeVisible();
  });

  test("displays status breakdown section", async ({ page }) => {
    await expect(page.getByText(/status breakdown/i)).toBeVisible({ timeout: 10_000 });
  });

  test("navigation sidebar has all links", async ({ page }) => {
    await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /orders/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /analytics/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /settings/i })).toBeVisible();
  });

  test("sidebar links navigate correctly", async ({ page }) => {
    await page.getByRole("link", { name: /orders/i }).click();
    await expect(page).toHaveURL(/\/app\/orders/);

    await page.getByRole("link", { name: /analytics/i }).click();
    await expect(page).toHaveURL(/\/app\/analytics/);

    await page.getByRole("link", { name: /settings/i }).click();
    await expect(page).toHaveURL(/\/app\/settings/);

    await page.getByRole("link", { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/\/app$/);
  });
});
