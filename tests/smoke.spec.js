import { expect, test } from "@playwright/test";

test("production workflow supports dashboard, asset placement, controls, and episode review", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Room").fill(`qa-${Date.now()}`);
  await page.getByLabel("Performer").fill("QA Performer");
  await page.getByRole("button", { name: "Join Stage" }).click();

  await expect(page.getByText("Controls Cheat Sheet")).toBeVisible();
  await expect(page.locator(".puppet.self .nameTag")).toHaveCount(0);
  await expect(page.locator(".floorMark")).toHaveCount(0);
  await expect(page.locator(".newProjectGuide")).toBeVisible();

  await page.getByRole("button", { name: "Setting" }).first().click();
  await expect(page.getByRole("heading", { name: "Untitled Show" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pick a tiny format, then make it yours." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Make A Short" })).toBeVisible();
  await expect(page.locator("header").getByRole("button", { name: "Finish" })).toBeVisible();

  await page.getByRole("button", { name: "Creator" }).first().click();
  await expect(page.getByRole("heading", { name: "Character Creator" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rig Check" })).toBeVisible();
  await expect(page.locator(".buildToolStrip")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Assemble Parts" })).toBeVisible();
  await expect(page.locator(".visualPartWorkbench")).toBeVisible();
  await expect(page.locator(".partPaletteCard")).toHaveCount(10);
  await expect(page.locator(".puppet.self .nameTag, .floorMark, .horizonGuide")).toHaveCount(0);
  await page.locator(".partPaletteCard").filter({ hasText: "Torso" }).click();
  await page.locator(".shapePaintGrid").getByRole("button", { name: "Bean" }).click();
  await expect(page.locator(".partWorkbenchPreview.partShape-bean")).toBeVisible();
  await page.locator(".partPaletteCard").filter({ hasText: "Head" }).click();
  await page.locator(".partWorkbench").getByRole("button", { name: "Doodle" }).click();
  await expect(page.locator(".partHandleStrip")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Playground Lab" })).toBeVisible();
  await page.getByRole("button", { name: "Odd Body Push the silhouette first, then keep whatever feels funny." }).click();
  await expect(page.locator(".partTopAccessory, .partLeftAccessory, .partRightAccessory, .partBackAppendage")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Behavior" })).toBeVisible();

  await page.getByRole("button", { name: "Place" }).first().click();
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
  await expect(page.getByRole("heading", { name: "Director Camera" })).toBeVisible();
  await page.getByRole("button", { name: "Punch In" }).click();

  await page.getByRole("button", { name: "Finish" }).first().click();
  await expect(page.getByRole("heading", { name: "Episode Pipeline" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Submit to DoinkTV" })).toBeVisible();
  await expect(page.getByText("Finished Short Flow")).toBeVisible();
  await expect(page.getByText("Backend render preview will appear here.")).toBeVisible();
  await expect(page.locator(".finishActionBar").getByRole("button", { name: "DoinkTV" })).toBeDisabled();
  await expect(page.locator(".finishActionBar").getByRole("button", { name: "Render Final" })).toBeDisabled();
  await expect(page.locator(".finishActionBar").getByRole("button", { name: "Browser WEBM" })).toBeDisabled();
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
    await expect(page.getByText("Controls Cheat Sheet")).toBeVisible();
    await expect(page.locator(".newProjectGuide")).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  }
});
