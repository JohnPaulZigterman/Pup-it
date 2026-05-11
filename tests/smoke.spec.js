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

  await page.getByRole("button", { name: "1 Start" }).click();
  await expect(page.getByLabel("Current workspace")).toContainText("Launchpad");
  await expect(page.getByRole("heading", { name: "Untitled Show" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pick a tiny format, then make it yours." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Make A Short" })).toBeVisible();
  await expect(page.getByText("kit ready")).toHaveCount(1);
  await expect(page.getByText("Beginner: One obvious next button.")).toHaveCount(1);
  await expect(page.locator("header").getByRole("button", { name: "Review" })).toBeVisible();

  await page.getByRole("button", { name: "Rig" }).first().click();
  await expect(page.getByLabel("Current workspace")).toContainText("Paint Studio");
  await expect(page.getByRole("heading", { name: "Character Creator" })).toBeVisible();
  await expect(page.locator(".showKitBranches").getByText("Tech Tree")).toBeVisible();
  await expect(page.locator(".showKitBranches").getByText("Cast Branch")).toBeVisible();
  await expect(page.getByLabel("Canvas part editor")).toBeVisible();
  await page.getByLabel("Canvas part editor").getByRole("button", { name: "Shape" }).click();
  await expect(page.getByLabel("Canvas part editor").getByText("Made")).toBeVisible();
  await expect(page.locator(".puppet.self .partHead")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rig Check" })).toBeVisible();
  await expect(page.locator(".buildToolStrip")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Assemble Parts" })).toBeVisible();
  await expect(page.locator(".visualPartWorkbench")).toBeVisible();
  await expect(page.locator(".partPaletteCard")).toHaveCount(10);
  await expect(page.locator(".puppet.self .nameTag, .floorMark, .horizonGuide")).toHaveCount(0);
  await page.locator(".partPaletteCard").filter({ hasText: "Torso" }).click();
  await page.locator(".shapePaintGrid").getByRole("button", { name: "Bean" }).click();
  await expect(page.locator(".partWorkbenchPreview.partShape-bean")).toBeVisible();
  await expect(page.locator(".buildCanvasHint")).toBeVisible();
  await expect(page.locator(".partNudgePad")).toBeVisible();
  await page.locator(".partNudgePad").getByRole("button", { name: "Right" }).click();
  await expect(page.locator(".puppet.self .partTorso")).toHaveAttribute("style", /--part-x: 4px/);
  await page.locator(".partPaletteCard").filter({ hasText: "Head" }).click();
  await page.locator(".partWorkbench").getByRole("button", { name: "Doodle" }).click();
  await expect(page.locator(".partHandleStrip")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Playground Lab" })).toBeVisible();
  await page.getByRole("button", { name: "Odd Body Push the silhouette first, then keep whatever feels funny." }).click();
  await expect(page.locator(".partTopAccessory, .partLeftAccessory, .partRightAccessory, .partBackAppendage")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Behavior" })).toBeVisible();

  await page.getByRole("button", { name: "Space" }).first().click();
  await expect(page.getByLabel("Current workspace")).toContainText("Set Builder");
  await page.getByPlaceholder("rigs, mouths, diner setting, parody reference...").fill("furniture");
  await page.locator(".assetActions").getByRole("button", { name: "Use as Material" }).first().click();

  await expect(page.getByRole("heading", { name: "Scene Objects" })).toBeVisible();
  await expect(page.locator(".sceneObjectEditor")).toHaveCount(1);
  await expect(page.getByLabel("Canvas object editor")).toBeVisible();
  await page.getByLabel("Canvas object editor").getByRole("button", { name: "Right" }).click();
  await expect(page.locator(".sceneObject.selected")).toBeVisible();

  await page.getByRole("button", { name: "Perform" }).first().click();
  await expect(page.getByText("Controls Cheat Sheet")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Performance Presets" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Motion" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Live Pad" })).toBeVisible();
  await expect(page.getByLabel("Performance readiness")).toBeVisible();
  await expect(page.getByRole("button", { name: "TV Ready" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Audio" })).toHaveClass(/selected/);
  await page.getByRole("button", { name: "5 Big Reaction Face, punch-in, and weird expression." }).click();
  await expect(page.getByRole("button", { name: "Surprise" })).toHaveClass(/selected/);
  await page.getByRole("button", { name: "Loose Puppet", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Director Camera" })).toBeVisible();
  await page.getByRole("button", { name: "Punch In" }).click();

  await page.locator("header").getByRole("button", { name: "Review" }).click();
  await expect(page.getByRole("heading", { name: "Episode Pipeline" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Submit to DoinkTV" })).toBeVisible();
  await expect(page.getByLabel("Finish mode path")).toBeVisible();
  await expect(page.getByText("Render Check")).toBeVisible();
  await expect(page.getByLabel("Render pipeline")).toBeVisible();
  await expect(page.getByText("DoinkTV Handoff")).toBeVisible();
  await expect(page.getByText("Finished Short Flow")).toBeVisible();
  await expect(page.getByText("Ready Enough Score")).toBeVisible();
  await expect(page.getByText("Delivery Preview")).toBeVisible();
  await expect(page.getByText("Backend render preview will appear here.")).toBeVisible();
  await expect(page.locator(".finishActionBar").getByRole("button", { name: "DoinkTV" })).toBeDisabled();
  await expect(page.locator(".finishActionBar").getByRole("button", { name: "Render Final" })).toBeDisabled();
  await expect(page.getByText("More Export Tools")).toBeVisible();
  await expect(page.getByText("Takes recorded")).toBeVisible();
});

test("tiered tutorial can set up an ultra beginner first cartoon", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Room").fill(`tutorial-${Date.now()}`);
  await page.getByLabel("Performer").fill("Tutorial QA");
  await page.getByRole("button", { name: "Join Stage" }).click();

  await page.locator("header").getByRole("button", { name: "Tutorial" }).click();
  await expect(page.getByRole("region", { name: "Tutorial" })).toBeVisible();
  await expect(page.getByText("Beginner / 1 of 5")).toBeVisible();
  await page.locator(".tutorialTrackGrid").getByRole("button").filter({ hasText: "Ultra Beginner" }).click();
  await expect(page.getByText("Ultra Beginner / 1 of 4")).toBeVisible();
  await page.getByRole("button", { name: "Set Me Up" }).click();
  await expect(page.getByLabel("Current workspace")).toContainText("Paint Studio");
  await expect(page.locator("strong").filter({ hasText: "Single Shape Mouth Rig Puppet" }).first()).toBeVisible();
  await expect(page.getByText("Ultra Beginner / 2 of 4")).toBeVisible();
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
