import { expect, test } from "@playwright/test";

test("production workflow supports dashboard, asset placement, controls, and episode review", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Room").fill(`qa-${Date.now()}`);
  await page.getByLabel("Performer").fill("QA Performer");
  await page.getByRole("button", { name: "Join Stage" }).click();

  await expect(page.getByRole("heading", { name: "Untitled Show" })).toBeVisible();
  await expect(page.getByText("Rehearse", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Sets" }).first().click();
  await page.getByPlaceholder("rigs, mouths, diner setting, parody reference...").fill("furniture");
  await page.locator(".assetActions").getByRole("button", { name: "Place" }).first().click();

  await expect(page.getByRole("heading", { name: "Scene Objects" })).toBeVisible();
  await expect(page.locator(".sceneObjectEditor")).toHaveCount(1);

  await page.getByRole("button", { name: "Perform" }).first().click();
  await expect(page.getByText("Controls Cheat Sheet")).toBeVisible();

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
