import { test, expect } from "@playwright/test";

const TOTAL_ROWS = 120_000;

function dataRows(page: import("@playwright/test").Page) {
  return page.locator("tbody tr[role='row']");
}

test("loads the 120k grid with a bounded DOM row count", async ({ page }) => {
  await page.goto("/orders");

  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible();

  // ARIA announces the real dataset size; the DOM only mounts a window.
  await expect(grid).toHaveAttribute("aria-rowcount", String(TOTAL_ROWS + 1));
  await expect(grid).toHaveAttribute("aria-colcount", /\d+/);

  const rows = dataRows(page);
  await expect(rows.first()).toBeVisible();
  const mounted = await rows.count();
  expect(mounted).toBeGreaterThan(5);
  expect(mounted).toBeLessThan(100);

  await expect(page.getByText("120,000", { exact: true }).first()).toBeVisible();
});

test("sorts by customer and keeps the DOM bounded", async ({ page }) => {
  await page.goto("/orders");
  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible();

  const customerHeader = page.getByRole("columnheader", { name: "Customer" });
  await customerHeader.click();
  await expect(customerHeader).toHaveAttribute("aria-sort", "ascending");

  const rows = dataRows(page);
  await expect(rows.first()).toBeVisible();
  const first = (await rows.nth(0).locator("td").nth(1).innerText()).toLowerCase();
  const second = (await rows.nth(1).locator("td").nth(1).innerText()).toLowerCase();
  expect(first <= second).toBe(true);
  expect(await rows.count()).toBeLessThan(100);
});

test("filters by search and status without breaking virtualization", async ({
  page,
}) => {
  await page.goto("/orders");
  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible();

  const search = page.getByPlaceholder("Search orders…");
  await search.fill("!!!-no-match");
  await expect(page.getByText("No orders match your filters.")).toBeVisible();

  await search.fill("");
  await page.getByLabel("All statuses").selectOption("refunded");

  // The grid stays virtualized and the "Showing" count shrinks.
  await expect(dataRows(page).first()).toBeVisible();
  expect(await dataRows(page).count()).toBeLessThan(100);
  const showing = await page
    .locator("p")
    .filter({ hasText: "Showing" })
    .innerText();
  expect(Number(showing.match(/Showing\s+([\d,]+)/)?.[1]?.replace(/,/g, ""))).toBeLessThan(
    TOTAL_ROWS,
  );
});

test("infinite pagination loads pages as you scroll", async ({ page }) => {
  await page.goto("/orders");
  await expect(page.getByRole("grid")).toBeVisible();

  const infinite = page.getByRole("button", { name: "Infinite" });
  await infinite.dispatchEvent("click");
  await expect(infinite).toHaveAttribute("aria-pressed", "true");

  const footer = page.getByText(/Loaded \d+ of /);
  await expect(footer).toBeVisible();
  await expect(footer).toHaveText(/Loaded 100 of 120,000/);

  const scroll = page.getByTestId("grid-scroll");
  for (let i = 0; i < 5; i++) {
    await scroll.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(350);
  }

  const text = await footer.innerText();
  const loaded = Number(text.match(/Loaded ([\d,]+) of/)?.[1]?.replace(/,/g, ""));
  expect(loaded).toBeGreaterThan(100);
  expect(await dataRows(page).count()).toBeLessThan(100);
});

test("exports the filtered set as CSV", async ({ page }) => {
  await page.goto("/orders");
  await expect(page.getByRole("grid")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("orders.csv");
});
