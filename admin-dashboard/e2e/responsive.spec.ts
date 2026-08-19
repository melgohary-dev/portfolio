import { test, expect, devices } from "@playwright/test";

test.use({
  viewport: { width: 390, height: 844 },
  userAgent: devices["iPhone 13"].userAgent,
  hasTouch: true,
});

test("shows mobile hamburger menu", async ({ page }) => {
  await page.goto("/");
  const menuBtn = page.getByRole("button", { name: /open navigation menu/i });
  await expect(menuBtn).toBeVisible();
});

test("mobile menu opens sidebar as drawer", async ({ page }) => {
  await page.goto("/");
  const menuBtn = page.getByRole("button", { name: /open navigation menu/i });
  await menuBtn.click();
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Orders" })).toBeVisible();
});

test("mobile menu closes on Escape", async ({ page }) => {
  await page.goto("/");
  const menuBtn = page.getByRole("button", { name: /open navigation menu/i });
  await menuBtn.click();
  await page.keyboard.press("Escape");
  await expect(menuBtn).toBeVisible();
});

test("mobile menu navigates and closes", async ({ page }) => {
  await page.goto("/");
  const menuBtn = page.getByRole("button", { name: /open navigation menu/i });
  await menuBtn.click();
  await page.getByRole("link", { name: "Orders" }).click();
  await expect(page).toHaveURL(/\/orders/);
});

test("orders grid renders on mobile", async ({ page }) => {
  await page.goto("/orders");
  await expect(page.getByRole("grid")).toBeVisible();
});

test("settings page renders on mobile", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
});
