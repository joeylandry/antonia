import { expect, type Page } from "@playwright/test";

export const PASSCODE = "correct horse battery staple";

export async function signIn(page: Page, passcode = PASSCODE) {
  await page.goto("/login");
  await page.getByLabel("Passcode").fill(passcode);
  await page.getByRole("button", { name: "Unlock" }).click();
  await page.waitForURL("**/");
  await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible();
}

export async function addClient(page: Page, name: string, goal?: string) {
  await page.goto("/clients/new");
  await page.getByLabel("Full name").fill(name);
  if (goal) await page.getByLabel(/Primary goal/).fill(goal);
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  return page.url().split("/").pop()!;
}

/** Logs a session through the UI. */
export async function logSession(
  page: Page,
  clientId: string,
  opts: { date: string; focus?: string; exercises: { name: string; sets: [string, string][] }[] },
) {
  await page.goto(`/clients/${clientId}/sessions/new`);
  await page.getByLabel("Date", { exact: true }).fill(opts.date);
  if (opts.focus) await page.getByLabel(/Workout \/ focus/).fill(opts.focus);
  for (const [i, ex] of opts.exercises.entries()) {
    if (i > 0) await page.getByRole("button", { name: "Add exercise" }).click();
    await page.getByLabel(`Exercise ${i + 1}`, { exact: true }).fill(ex.name);
    for (const [s, [reps, weight]] of ex.sets.entries()) {
      if (s > 0) await page.getByRole("button", { name: "Add set" }).nth(i).click();
      const card = page.locator("ol > li").nth(i);
      await card.getByLabel(`Set ${s + 1} reps`).fill(reps);
      await card.getByLabel(`Set ${s + 1} weight in pounds`).fill(weight);
    }
  }
  await page.getByRole("button", { name: "Save session" }).click();
  await page.waitForURL(`**/clients/${clientId}/sessions`);
}

