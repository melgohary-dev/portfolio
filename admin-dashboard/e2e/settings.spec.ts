import { test, expect } from "@playwright/test";

test.describe("Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
  });

  test("renders settings page with appearance and language sections", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Appearance" })).toBeVisible();
  });

  test("theme segmented control has Light, Dark, System options", async ({ page }) => {
    const group = page.getByRole("radiogroup", { name: /theme/i });
    await expect(group.getByRole("radio", { name: /light/i })).toBeVisible();
    await expect(group.getByRole("radio", { name: /dark/i })).toBeVisible();
    await expect(group.getByRole("radio", { name: /system/i })).toBeVisible();
  });

  test("clicking dark theme applies dark class to html", async ({ page }) => {
    const group = page.getByRole("radiogroup", { name: /theme/i });
    await group.getByRole("radio", { name: /dark/i }).click();
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(hasDark).toBe(true);
  });

  test("clicking light theme removes dark class from html", async ({ page }) => {
    const group = page.getByRole("radiogroup", { name: /theme/i });
    await group.getByRole("radio", { name: /dark/i }).click();
    await group.getByRole("radio", { name: /light/i }).click();
    const hasDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    expect(hasDark).toBe(false);
  });

  test("language segmented control has English and Arabic", async ({ page }) => {
    const group = page.getByRole("radiogroup", { name: /language/i });
    await expect(group.getByRole("radio", { name: "English" })).toBeVisible();
    await expect(group.getByRole("radio", { name: "العربية" })).toBeVisible();
  });

  test("switching to Arabic sets dir=rtl on html", async ({ page }) => {
    const group = page.getByRole("radiogroup", { name: /language/i });
    await group.getByRole("radio", { name: "العربية" }).click();
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe("rtl");
  });

  test("switching back to English sets dir=ltr", async ({ page }) => {
    // Click Arabic first
    const arabicBtn = page.locator("button[role='radio']").filter({ hasText: "العربية" });
    await arabicBtn.click();
    const dirAr = await page.evaluate(() => document.documentElement.dir);
    expect(dirAr).toBe("rtl");
    // Now click English — after RTL switch the layout mirrors
    const englishBtn = page.locator("button[role='radio']").filter({ hasText: "English" });
    await englishBtn.click();
    const dir = await page.evaluate(() => document.documentElement.dir);
    expect(dir).toBe("ltr");
  });

  test("currency dropdown changes currency", async ({ page }) => {
    const select = page.getByLabel("Currency").or(page.locator("select#currency"));
    await select.selectOption("USD");
    const value = await select.inputValue();
    expect(value).toBe("USD");
  });

  test("sidebar toggle switches between expanded and collapsed", async ({ page }) => {
    const group = page.getByRole("radiogroup", { name: /sidebar/i });
    await group.getByRole("radio", { name: /collapsed/i }).click();
    await expect(group.getByRole("radio", { name: /collapsed/i })).toHaveAttribute("aria-checked", "true");
    await group.getByRole("radio", { name: /expanded/i }).click();
    await expect(group.getByRole("radio", { name: /expanded/i })).toHaveAttribute("aria-checked", "true");
  });

  test("store profile form has store name, VAT rate, and save button", async ({ page }) => {
    await expect(page.getByText("Store profile")).toBeVisible();
    await expect(page.locator("input#store-name")).toBeVisible();
    await expect(page.locator("input#store-vat")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
  });

  test("saving store profile shows confirmation", async ({ page }) => {
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Changes saved")).toBeVisible();
  });

  test("email notifications checkbox is toggleable", async ({ page }) => {
    const checkbox = page.locator("input[type='checkbox']");
    const initial = await checkbox.isChecked();
    await checkbox.click();
    expect(await checkbox.isChecked()).toBe(!initial);
  });
});
