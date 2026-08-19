import { test, expect } from "@playwright/test";

const SEED_EMAIL = "owner@acme.test";
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'test';

test.describe("Authentication", () => {
  test("login page renders form fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("bad@email.test");
    await page.getByLabel(/password/i).fill("WrongPass123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.locator("[data-testid='error'], .text-red")).toBeVisible({ timeout: 10_000 });
  });

  test("login with valid credentials redirects to app", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(SEED_EMAIL);
    await page.getByLabel(/password/i).fill(SEED_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/app/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/app/);
  });

  test("register page renders form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByLabel(/name/i).first()).toBeVisible();
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("forgot-password page renders form", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });

  test("unauthenticated access to /app redirects to /login", async ({ page }) => {
    await page.goto("/app");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated access to /app/orders redirects to /login", async ({ page }) => {
    await page.goto("/app/orders");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated access to /app/settings redirects to /login", async ({ page }) => {
    await page.goto("/app/settings");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
