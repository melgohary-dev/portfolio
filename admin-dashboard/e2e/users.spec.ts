import { test, expect } from "@playwright/test";

test.describe("Users page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/users");
  });

  test("renders users heading and subtitle", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Users" })).toBeVisible();
    await expect(page.getByText("Manage team members and roles.")).toBeVisible();
  });

  test("table has Name, Email, Role, Status, Created columns", async ({ page }) => {
    const headers = page.locator("thead th");
    await expect(headers).toHaveCount(5);
    await expect(headers.nth(0)).toHaveText("Name");
    await expect(headers.nth(1)).toHaveText("Email");
    await expect(headers.nth(2)).toHaveText("Role");
    await expect(headers.nth(3)).toHaveText("Status");
    await expect(headers.nth(4)).toHaveText("Created");
  });

  test("displays all 5 users", async ({ page }) => {
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(5);
  });

  test("shows user Salma Al-Rashid with Admin role and Active status", async ({ page }) => {
    const row = page.locator("tbody tr").filter({ hasText: "Salma Al-Rashid" });
    await expect(row).toBeVisible();
    await expect(row.getByText("Admin")).toBeVisible();
    await expect(row.getByText("Active")).toBeVisible();
  });

  test("shows suspended user with correct badge", async ({ page }) => {
    const row = page.locator("tbody tr").filter({ hasText: "Khalid Mansour" });
    await expect(row.getByText("Suspended")).toBeVisible();
  });

  test("shows invited user with correct badge", async ({ page }) => {
    const row = page.locator("tbody tr").filter({ hasText: "Layla Ali" });
    await expect(row.getByText("Invited")).toBeVisible();
  });
});
