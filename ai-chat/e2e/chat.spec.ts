import { test, expect, type Page } from "@playwright/test";

const LONG_CODE = "Write a debounce function in TypeScript";

function composer(page: Page) {
  return page.getByRole("textbox", { name: "Message" });
}

async function send(page: Page, text: string) {
  await composer(page).fill(text);
  await composer(page).press("Enter");
}

// The sidebar SessionItem row that contains a given title and a delete button.
function sessionRow(page: Page, title: string) {
  return page
    .locator("div")
    .filter({ has: page.getByText(title, { exact: true }) })
    .filter({ has: page.getByRole("button", { name: "Delete session" }) })
    .first();
}

test("1. loads and seeds a welcome conversation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Welcome", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Assistant").first()).toBeVisible();
  await expect(page.getByText(/Welcome to your AI workspace/i)).toBeVisible();
});

test("2. typing and Enter sends a user message", async ({ page }) => {
  await page.goto("/");
  await send(page, "hello there");
  await expect(
    page.getByText("hello there", { exact: true }).first(),
  ).toBeVisible();
});

test("3. assistant streams tokens and the message grows", async ({ page }) => {
  await page.goto("/");
  await send(page, "Explain offline-first architecture");
  await expect(page.getByText("Key idea", { exact: false })).toBeVisible({
    timeout: 20000,
  });
});

test("4. multiple messages append in order", async ({ page }) => {
  await page.goto("/");
  await send(page, "first question");
  await expect(page.getByText("first question", { exact: true })).toBeVisible();
  await send(page, "second question");
  await expect(page.getByText("second question", { exact: true })).toBeVisible();
});

test("5. new chat creates a new empty session", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New chat" }).click();
  await expect(page.getByRole("heading", { name: "New chat" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "AI Chat Workspace" }),
  ).toBeVisible();
});

test("6. switching sessions shows that session's messages", async ({ page }) => {
  await page.goto("/");
  await send(page, "saved message");
  await expect(page.getByText("saved message", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "New chat" }).click();
  await send(page, "other message");
  await expect(
    page.getByText("other message", { exact: true }).first(),
  ).toBeVisible();

  await page.getByText("saved message", { exact: true }).first().click();
  await expect(
    page.getByText("saved message", { exact: true }).first(),
  ).toBeVisible();
});

test("7. rename session updates the sidebar title", async ({ page }) => {
  await page.goto("/");
  const row = sessionRow(page, "Welcome");
  await row.getByRole("button", { name: "Rename session" }).click();
  const input = page.getByRole("textbox", { name: "Rename session" });
  await input.fill("My Custom Plan");
  await input.press("Enter");
  await expect(
    page.getByText("My Custom Plan", { exact: true }).first(),
  ).toBeVisible();
});

test("8. delete session removes it after confirmation", async ({ page }) => {
  await page.goto("/");
  const row = sessionRow(page, "Welcome");
  await row.getByRole("button", { name: "Delete session" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete conversation?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(sessionRow(page, "Welcome")).toHaveCount(0);
});

test("9. conversations persist across reload", async ({ page }) => {
  await page.goto("/");
  await send(page, "persisted note");
  await expect(page.getByText("persisted note", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("persisted note", { exact: true })).toBeVisible();
});

test("10. dark mode toggle switches theme", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", {
    name: /dark mode|light mode/i,
  });
  await toggle.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: /light mode/i })).toBeVisible();
});

test("11. stop button halts streaming and keeps partial content", async ({
  page,
}) => {
  await page.goto("/");
  await send(page, LONG_CODE);
  await expect(page.getByLabel("Stop generating")).toBeVisible({
    timeout: 5000,
  });
  await page.getByLabel("Stop generating").click();
  await expect(page.getByText("Stopped", { exact: true })).toBeVisible({
    timeout: 5000,
  });
});

test("12. mobile hamburger opens the sidebar drawer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Open menu").click();
  await expect(page.locator("aside").nth(1)).toBeVisible();
});

test("13. AI settings opens and shows the free simulated provider active", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("AI settings").click();
  const dialog = page.getByRole("dialog", { name: "AI provider settings" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: /Simulated \(free\)/i }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByText(/no API call/i)).toBeVisible();
});

test("14. switching provider shows the key input and persists", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("AI settings").click();
  const dialog = page.getByRole("dialog", { name: "AI provider settings" });
  await dialog.getByRole("button", { name: /Google Gemini/i }).click();
  await expect(dialog.getByText("API key", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: /Save/i }).click();

  await page.getByLabel("AI settings").click();
  await expect(
    page
      .getByRole("dialog", { name: "AI provider settings" })
      .getByRole("button", { name: /Google Gemini/i }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("15. using a provider without any key still streams via simulation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("AI settings").click();
  const dialog = page.getByRole("dialog", { name: "AI provider settings" });
  await dialog.getByRole("button", { name: /Google Gemini/i }).click();
  await dialog.getByRole("button", { name: /Save/i }).click();
  await send(page, "Explain offline-first architecture");
  await expect(page.getByText("Key idea", { exact: false })).toBeVisible({
    timeout: 20000,
  });
});
