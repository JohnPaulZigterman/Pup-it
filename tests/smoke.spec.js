import { expect, test } from "@playwright/test";

test("production workflow supports dashboard, asset placement, controls, and episode review", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Room").fill(`qa-${Date.now()}`);
  await page.getByLabel("Performer").fill("QA Performer");
  await page.getByRole("button", { name: "Join Stage" }).click();

  await expect(page.getByRole("heading", { name: "Untitled Show" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pick a tiny format, then make it yours." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Make A Short" })).toBeVisible();

  await page.getByRole("button", { name: "Rigs" }).first().click();
  await expect(page.getByRole("heading", { name: "Build The Space" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Assemble Parts" })).toBeVisible();
  await page.locator(".partBuilderRow").filter({ hasText: "Head" }).getByRole("button", { name: "Doodle" }).click();
  await expect(page.getByRole("heading", { name: "Playground Lab" })).toBeVisible();
  await page.getByRole("button", { name: "Odd Body Push the silhouette first, then keep whatever feels funny." }).click();
  await expect(page.locator(".partTopAccessory, .partLeftAccessory, .partRightAccessory, .partBackAppendage")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Behavior" })).toBeVisible();

  await page.getByRole("button", { name: "Materials" }).first().click();
  await page.getByPlaceholder("rigs, mouths, diner setting, parody reference...").fill("furniture");
  await page.locator(".assetActions").getByRole("button", { name: "Use as Material" }).first().click();

  await expect(page.getByRole("heading", { name: "Scene Objects" })).toBeVisible();
  await expect(page.locator(".sceneObjectEditor")).toHaveCount(1);

  await page.getByRole("button", { name: "Perform" }).first().click();
  await expect(page.getByText("Controls Cheat Sheet")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Performance Presets" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Motion" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Audio" })).toHaveClass(/selected/);
  await page.getByRole("button", { name: "Loose Puppet", exact: true }).click();

  await page.getByRole("button", { name: "Edit" }).first().click();
  await expect(page.getByRole("heading", { name: "Episode Pipeline" })).toBeVisible();
  await expect(page.getByText("Takes recorded")).toBeVisible();
});

test("main workstation avoids horizontal overflow across common viewport sizes", async ({ page }) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByLabel("Room").fill(`responsive-${viewport.width}-${Date.now()}`);
    await page.getByLabel("Performer").fill("Responsive QA");
    await page.getByRole("button", { name: "Join Stage" }).click();
    await expect(page.getByRole("heading", { name: "Untitled Show" })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  }
});
