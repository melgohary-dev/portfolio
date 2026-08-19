import { test, expect } from "@playwright/test";

test.describe("Course Builder", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle");
  });

  async function createCourseAndGetToBuilder(page: import("@playwright/test").Page) {
    const createBtn = page.getByRole("button", { name: /Create Course|New Course/ }).first();
    await createBtn.click();

    // Config modal opens on home page
    await expect(page.getByText("Course Setup")).toBeVisible();

    // Fill in the title
    await page.getByPlaceholder("Enter course title...").fill("Test Course");

    // Click "Start Building" — navigates to builder
    await page.getByRole("button", { name: "Start Building" }).click();

    // Should now be in the builder view
    await expect(page.getByRole("heading", { name: "Build your course" })).toBeVisible();
  }

  test("loads courses list with empty state", async ({ page }) => {
    await expect(page.getByText("No courses yet")).toBeVisible();
    await expect(page.getByRole("button", { name: /Create Course|New Course/ }).first()).toBeVisible();
  });

  test("create course and navigate to builder", async ({ page }) => {
    await createCourseAndGetToBuilder(page);
    await expect(page.getByRole("button", { name: "Add Module" }).first()).toBeVisible();
  });

  test("add module via button", async ({ page }) => {
    await createCourseAndGetToBuilder(page);
    await page.getByRole("button", { name: "Add Module" }).first().click();
    await expect(page.getByRole("main").getByRole("textbox")).toBeVisible();
    await expect(page.getByText("0 lessons")).toBeVisible();
  });

  test("add lesson inside module", async ({ page }) => {
    await createCourseAndGetToBuilder(page);
    await page.getByRole("button", { name: "Add Module" }).first().click();
    await page.getByRole("button", { name: "Add Lesson" }).first().click();
    await expect(page.getByText("0 blocks", { exact: true })).toBeVisible();
  });

  test("properties panel shows empty state", async ({ page }) => {
    await createCourseAndGetToBuilder(page);
    await expect(
      page.getByText("Select a block on the canvas to edit its properties"),
    ).toBeVisible();
  });

  test("add text block via quick button", async ({ page }) => {
    await createCourseAndGetToBuilder(page);
    await page.getByRole("button", { name: "Add Module" }).first().click();
    await page.getByRole("button", { name: "Add Lesson" }).first().click();
    await page.getByRole("button", { name: "Add text block" }).first().click();
    await expect(page.getByText("Text Block")).toBeVisible();
  });

  test("select block shows properties", async ({ page }) => {
    await createCourseAndGetToBuilder(page);
    await page.getByRole("button", { name: "Add Module" }).first().click();
    await page.getByRole("button", { name: "Add Lesson" }).first().click();
    await page.getByRole("button", { name: "Add text block" }).first().click();
    await page.getByText("Text Block").first().click();
    await expect(page.getByText("Duration (minutes)")).toBeVisible();
  });

  test("dark mode toggle works", async ({ page }) => {
    await createCourseAndGetToBuilder(page);
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("preview mode opens and closes", async ({ page }) => {
    await createCourseAndGetToBuilder(page);
    await page.getByRole("button", { name: "Enter preview mode" }).click();
    await expect(page.getByText("PREVIEW", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("PREVIEW", { exact: true })).not.toBeVisible();
  });

  test("module can be renamed", async ({ page }) => {
    await createCourseAndGetToBuilder(page);
    await page.getByRole("button", { name: "Add Module" }).first().click();
    const input = page.getByRole("main").getByRole("textbox");
    await input.clear();
    await input.fill("Introduction");
    await expect(input).toHaveValue("Introduction");
  });

  test("data persists after page reload", async ({ page }) => {
    await createCourseAndGetToBuilder(page);
    await page.getByRole("button", { name: "Add Module" }).first().click();
    await expect(page.getByText("0 lessons")).toBeVisible();
    await page.reload();
    await page.waitForLoadState("networkidle");
    // After reload we're still on the builder — module persists
    await expect(page.getByText("0 lessons")).toBeVisible();
    // Navigate back to courses list and verify the course card is saved
    await page.getByRole("button", { name: "Back to courses" }).click();
    await expect(page.getByText("Test Course")).toBeVisible();
    // Re-enter the builder
    await page.getByText("Test Course").click();
    await expect(page.getByText("0 lessons")).toBeVisible();
  });

  test("courses list shows created courses", async ({ page }) => {
    await createCourseAndGetToBuilder(page);
    // Go back to courses list
    await page.getByRole("button", { name: "Back to courses" }).click();
    await expect(page.getByText("Test Course")).toBeVisible();
  });

  test("course config modal opens from toolbar and can be saved", async ({ page }) => {
    await createCourseAndGetToBuilder(page);

    // Open config modal via toolbar settings button
    await page.getByRole("button", { name: "Course settings" }).click();
    await expect(page.getByText("Course Setup")).toBeVisible();

    // Fill in the title
    await page.getByPlaceholder("Enter course title...").fill("Configured Course");

    // Save and close
    await page.getByRole("button", { name: "Start Building" }).click();
    await expect(page.getByText("Course Setup")).not.toBeVisible();
  });

  test("course config modal can be cancelled", async ({ page }) => {
    await createCourseAndGetToBuilder(page);

    // Open config modal via toolbar settings button
    await page.getByRole("button", { name: "Course settings" }).click();
    await expect(page.getByText("Course Setup")).toBeVisible();

    await page.getByRole("button", { name: "Cancel" }).click();
    // Modal should close, builder still visible
    await expect(page.getByRole("heading", { name: "Build your course" })).toBeVisible();
  });

  test("multi-language config works", async ({ page }) => {
    await createCourseAndGetToBuilder(page);

    // Open config modal
    await page.getByRole("button", { name: "Course settings" }).click();
    await expect(page.getByText("Course Setup")).toBeVisible();

    // Fill title
    await page.getByPlaceholder("Enter course title...").fill("Multi Lang Course");

    // Select Arabic language
    await page.getByRole("button", { name: "العربية" }).click();

    // Default language selector should appear
    await expect(page.getByText("Default Language")).toBeVisible();

    // Save and close
    await page.getByRole("button", { name: "Start Building" }).click();
    await expect(page.getByRole("heading", { name: "Build your course" })).toBeVisible();
  });

  test("course name changes persist across navigation", async ({ page }) => {
    await createCourseAndGetToBuilder(page);

    // Change course name via toolbar input
    const titleInput = page.locator("header input[type='text']");
    await titleInput.clear();
    await titleInput.fill("My Renamed Course");

    // Go back to courses list
    await page.getByRole("button", { name: "Back to courses" }).click();

    // Verify the renamed course appears
    await expect(page.getByText("My Renamed Course")).toBeVisible();

    // Re-enter the builder
    await page.getByText("My Renamed Course").click();
    await expect(titleInput).toHaveValue("My Renamed Course");
  });

  test("certificate builder is accessible from toolbar", async ({ page }) => {
    await createCourseAndGetToBuilder(page);

    // Click certificate button in toolbar
    await page.getByRole("button", { name: "Certificate builder" }).click();
    await expect(page.getByText("Certificate Builder")).toBeVisible();

    // Save certificate
    await page.getByRole("button", { name: "Save Certificate" }).click();
    // Should navigate back to builder
    await expect(page.getByRole("heading", { name: "Build your course" })).toBeVisible();
  });
});
