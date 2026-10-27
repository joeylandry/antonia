import { expect, test } from "@playwright/test";
import { addClient, createTrainer, signIn } from "./support/helpers";

test.describe("usability regressions", () => {
  test("Enter in a set field moves on instead of saving a half-built session; Ctrl+Enter saves", async ({ page }) => {
    const { email } = await createTrainer("usab-enter");
    await signIn(page, email);
    const id = await addClient(page, "Enter Key");
    await page.goto(`/clients/${id}/sessions/new`);
    await expect(page.getByLabel("Exercise 1", { exact: true })).toBeFocused();
    await page.getByLabel("Exercise 1", { exact: true }).fill("Row");
    await page.getByLabel("Set 1 reps").fill("10");
    await page.getByLabel("Set 1 reps").press("Enter");
    await expect(page.getByLabel("Set 1 weight in pounds")).toBeFocused();
    await page.getByLabel("Set 1 weight in pounds").fill("40");
    await page.getByLabel("Set 1 weight in pounds").press("Enter");
    await expect(page).toHaveURL(/sessions\/new$/);
    await page.getByLabel("Set 1 weight in pounds").press("Control+Enter");
    await page.waitForURL(`**/clients/${id}/sessions`);
    await expect(page.getByText("10 @ 40 lb")).toBeVisible();
  });

  test("closing a dialog returns focus to the button that opened it", async ({ page }) => {
    const { email } = await createTrainer("usab-focus");
    await signIn(page, email);
    const id = await addClient(page, "Focus Return");
    await page.goto(`/clients/${id}/goals`);
    const opener = page.getByRole("button", { name: "Add goal", exact: true });
    await opener.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Exercise")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test("no horizontal scrolling on a phone-sized screen", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();
    const { email } = await createTrainer("usab-mobile");
    await signIn(page, email);
    const id = await addClient(page, "Quinn Abernathy-Whitfield-Montgomery", "A very long goal ".repeat(20));
    for (const path of ["/", "/clients", `/clients/${id}`, `/clients/${id}/sessions`, `/clients/${id}/progress`, `/clients/${id}/goals`, `/clients/${id}/sessions/new`, "/settings"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
    }
    await ctx.close();
  });
});
