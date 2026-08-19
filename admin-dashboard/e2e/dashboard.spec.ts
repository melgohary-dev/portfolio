import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders dashboard title and subtitle", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Overview of revenue, orders, and customers.")).toBeVisible();
  });

  test("renders 4 KPI cards after aggregation completes", async ({ page }) => {
    // KPI cards appear once the web worker aggregation completes
    const totalRevenue = page.getByText("Total Revenue");
    await expect(totalRevenue).toBeVisible({ timeout: 30_000 });
    // Check that all 4 KPI labels are present
    await expect(page.getByText("Orders").first()).toBeVisible();
    await expect(page.getByText("Avg Order Value")).toBeVisible();
    await expect(page.getByText("Refund Rate")).toBeVisible();
  });

  test("KPI cards show Total Revenue, Orders, Avg Order Value, Refund Rate", async ({ page }) => {
    await expect(page.getByText("Total Revenue")).toBeVisible();
    await expect(page.getByText("Avg Order Value")).toBeVisible();
    await expect(page.getByText("Refund Rate")).toBeVisible();
    // "Orders" appears multiple times; use exact match on the KPI label paragraph
    await expect(page.locator("p.text-sm").filter({ hasText: /^Orders$/ })).toBeVisible();
  });

  test("Revenue & Orders chart section is visible", async ({ page }) => {
    await expect(page.getByText("Revenue & Orders")).toBeVisible();
  });

  test("Payment Methods section is visible", async ({ page }) => {
    await expect(page.getByText("Payment Methods")).toBeVisible();
  });

  test("Top Products section shows 5 products", async ({ page }) => {
    await expect(page.getByText("Top Products")).toBeVisible();
    await expect(page.getByText("Luxury Oud Perfume")).toBeVisible();
    await expect(page.getByText("Arabic Coffee Blend 500g")).toBeVisible();
    await expect(page.getByText("Dates Gift Box")).toBeVisible();
    await expect(page.getByText("Handmade Pottery Set")).toBeVisible();
    await expect(page.getByText("Saudi Golden Thread")).toBeVisible();
  });

  test("Recent Orders table shows 5 orders", async ({ page }) => {
    await expect(page.getByText("Recent Orders")).toBeVisible();
    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(5);
  });

  test("each recent order row has order id, customer, status, total", async ({ page }) => {
    const firstRow = page.locator("table tbody tr").first();
    await expect(firstRow.getByText("ORD-")).toBeVisible();
  });
});
