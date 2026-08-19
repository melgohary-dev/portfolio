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

test.describe("Settings page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
    await page.getByRole("link", { name: /settings/i }).click();
    await page.waitForURL(/\/app\/settings/, { timeout: 10_000 });
  });

  test("displays organization info", async ({ page }) => {
    await expect(page.getByText(/acme/i)).toBeVisible({ timeout: 10_000 });
  });

  test("displays billing section", async ({ page }) => {
    await expect(page.getByText(/billing/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("displays team members section", async ({ page }) => {
    await expect(page.getByText(/team/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("invite member form is visible", async ({ page }) => {
    await expect(page.getByText(/invite/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Orders page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsOwner(page);
    await page.getByRole("link", { name: /orders/i }).click();
    await page.waitForURL(/\/app\/orders/, { timeout: 10_000 });
  });

  test("renders orders data grid", async ({ page }) => {
    await expect(page.getByRole("table")).toBeVisible({ timeout: 15_000 });
  });

  test("orders table has column headers", async ({ page }) => {
    await expect(page.getByRole("columnheader").first()).toBeVisible({ timeout: 15_000 });
  });
});
