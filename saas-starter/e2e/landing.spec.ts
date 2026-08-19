import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("renders hero and navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/qumra/i);
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /go to app/i })).toBeVisible();
  });

  test("language toggle works", async ({ page }) => {
    await page.goto("/");
    const arabicToggle = page.getByRole("button", { name: /ar/i });
    if (await arabicToggle.isVisible()) {
      await arabicToggle.click();
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    }
  });

  test("sign in link navigates to /login", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
