import { test, expect, type Page } from "@playwright/test";

const SAVED_LOCALLY = "Saved locally \u2014 waiting to sync";

const statusButton = (page: Page, online: boolean, pending: number) =>
  page.getByRole("button", {
    name: new RegExp(`^${online ? "Online" : "Offline"} .*${pending} pending`),
  });

const orderRows = (page: Page, status: string) =>
  page.locator("main li").filter({ hasText: status });

async function placeOrderOffline(page: Page) {
  await statusButton(page, true, 0).click();

  const tile = page.getByRole("button", { name: /SAR \d+\.\d{2}/ }).first();
  await expect(tile).toBeVisible();
  await tile.click();

  await page.getByRole("button", { name: "Continue to payment", exact: true }).click();
  await page.getByRole("button", { name: "Card", exact: true }).click();
  await page.getByRole("button", { name: /^Charge / }).click();

  const receipt = page.getByRole("dialog", { name: "Receipt" });
  await expect(receipt.getByText(SAVED_LOCALLY)).toBeVisible();
  await receipt.getByRole("button", { name: "Close receipt", exact: true }).click();
}

async function openOrders(page: Page) {
  await page.getByRole("navigation").getByRole("button", { name: /^Orders/ }).click();
}

test("offline order stays pending locally and syncs after reconnect", async ({
  page,
}) => {
  await page.goto("/");
  await placeOrderOffline(page);
  await openOrders(page);

  await expect(orderRows(page, "Pending")).toHaveCount(1);
  await expect(statusButton(page, false, 1)).toBeVisible();

  await statusButton(page, false, 1).click();

  await expect(orderRows(page, "Synced")).toHaveCount(1);
  await expect(orderRows(page, "Pending")).toHaveCount(0);
  await expect(statusButton(page, true, 0)).toBeVisible();
});

test("pending orders sync automatically when the app comes back online", async ({
  page,
}) => {
  await page.goto("/");
  await placeOrderOffline(page);

  // The simulate-offline toggle is in-memory, so a reload boots back online and
  // sync.start() must flush the persisted pending mutation on startup.
  await page.reload();
  await openOrders(page);

  await expect(orderRows(page, "Synced")).toHaveCount(1);
  await expect(orderRows(page, "Pending")).toHaveCount(0);
});
