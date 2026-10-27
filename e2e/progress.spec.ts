import { expect, test } from "@playwright/test";
import { addClient, createTrainer, logSession, signIn } from "./support/helpers";

function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

test.describe("sessions, goals and progress", () => {
  test("log, correct and reuse sessions; progress and goals reflect the history", async ({ page }) => {
    const { email } = await createTrainer("progress-main");
    await signIn(page, email);
    const id = await addClient(page, "Pat Progress", "Squat 180");

    // Three sessions over time.
    await logSession(page, id, { date: daysAgo(60), focus: "Lower Body", exercises: [{ name: "Back Squat", sets: [["8", "95"], ["5", "115"]] }] });
    await logSession(page, id, { date: daysAgo(10), focus: "Lower Body", exercises: [{ name: "Back Squat", sets: [["8", "105"], ["5", "125"]] }, { name: "Leg Press", sets: [["12", "100"]] }] });
    await expect(page.getByText("Back Squat").first()).toBeVisible();

    // Third session shows last-time hints and can reuse them.
    await page.goto(`/clients/${id}/sessions/new`);
    await expect(page.getByText("Start from")).toBeVisible();
    await page.getByLabel("Exercise 1", { exact: true }).fill("back squat");
    await expect(page.getByText(/Last time/)).toContainText("8 → 5 @ 105 → 125 lb");
    await page.getByRole("button", { name: "Use these sets" }).click();
    await expect(page.locator("ol > li").first().getByLabel("Set 2 weight in pounds")).toHaveValue("125");
    await page.locator("ol > li").first().getByLabel("Set 2 weight in pounds").fill("135");
    await page.getByLabel("Date", { exact: true }).fill(daysAgo(2));
    await page.getByRole("button", { name: "Save session" }).click();
    await page.waitForURL(`**/clients/${id}/sessions`);
    await expect(page.getByText("8 → 5 @ 105 → 135 lb")).toBeVisible();

    // The exercise name was matched case-insensitively: one exercise, not two.
    await page.goto(`/clients/${id}/progress`);
    const exerciseOptions = await page.getByLabel("Exercise", { exact: true }).locator("option").allInnerTexts();
    expect(exerciseOptions.filter((o) => /squat/i.test(o))).toEqual(["Back Squat"]);

    // Historical correction: edit the first session's weight and see it flow through.
    await page.goto(`/clients/${id}/sessions`);
    await page.getByRole("link", { name: /^Edit session on/ }).last().click();
    await page.locator("ol > li").first().getByLabel("Set 2 weight in pounds").fill("120");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.waitForURL(`**/clients/${id}/sessions`);
    await expect(page.getByText("8 → 5 @ 95 → 120 lb")).toBeVisible();

    // Progress: Back Squat top weight 120 -> 135, +15.
    await page.goto(`/clients/${id}/progress`);
    await page.getByLabel("Exercise", { exact: true }).selectOption({ label: "Back Squat" });
    await expect(page.getByText("Latest").first().locator("..")).toContainText("135");
    await expect(page.getByText("Best").first().locator("..")).toContainText("135");
    await expect(page.getByText("Change", { exact: true }).first().locator("..")).toContainText("+15");
    await expect(page.getByRole("img", { name: /Top weight for Back Squat over time\. 3 sessions/ })).toBeVisible();

    // Date range: the last 1 month excludes the 60-day-old session.
    await page.getByRole("button", { name: "1M" }).first().click();
    await expect(page.getByRole("img", { name: /2 sessions/ })).toBeVisible();
    await expect(page.getByText("Change", { exact: true }).first().locator("..")).toContainText("+10");

    // Goals: a lift target with progress from the first logged weight.
    await page.goto(`/clients/${id}/goals`);
    await page.getByRole("button", { name: "Add the first goal" }).click();
    await page.getByLabel("Exercise").fill("Back Squat");
    await page.getByLabel("Target weight (lb)").fill("165");
    await page.getByRole("button", { name: "Add goal" }).click();
    await expect(page.getByText("Back Squat 165 lb")).toBeVisible();
    // baseline 120 -> best 135 toward 165 = 33%
    await expect(page.getByText(/33% of the way to 165 lb/)).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");

    // Mark achieved moves it to the closed section; reopen restores it.
    await page.getByRole("button", { name: /Actions for Back Squat 165 lb/ }).click();
    await page.getByRole("menuitem", { name: "Mark achieved" }).click();
    await expect(page.getByText("Achieved & closed")).toBeVisible();

    // Persistence across a fresh sign-in.
    await page.context().clearCookies();
    await signIn(page, email);
    await page.goto(`/clients/${id}/sessions`);
    await expect(page.getByText("8 → 5 @ 105 → 135 lb")).toBeVisible();
  });

  test("session form validation and deletion", async ({ page }) => {
    const { email } = await createTrainer("progress-validate");
    await signIn(page, email);
    const id = await addClient(page, "Val Idate");
    await page.goto(`/clients/${id}/sessions/new`);
    await page.getByRole("button", { name: "Save session" }).click();
    await expect(page.getByText("Add at least one exercise.").first()).toBeVisible();

    await page.getByLabel("Exercise 1", { exact: true }).fill("Plank");
    await page.getByLabel("Set 1 reps").fill("5000");
    await page.getByRole("button", { name: "Save session" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    await page.getByLabel("Set 1 reps").fill("");
    await page.getByRole("button", { name: "Add timing" }).click();
    await page.getByLabel("Set 1 seconds").fill("45");
    await page.getByRole("button", { name: "Save session" }).click();
    await page.waitForURL(`**/clients/${id}/sessions`);
    await expect(page.getByText("45s")).toBeVisible();

    await page.getByRole("link", { name: /^Edit session on/ }).click();
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete session" }).click();
    await page.waitForURL(`**/clients/${id}/sessions`);
    await expect(page.getByText("No sessions logged yet")).toBeVisible();
  });

  test("measurements: track, add readings, correct a day, and see the change", async ({ page }) => {
    const { email } = await createTrainer("progress-metric");
    await signIn(page, email);
    const id = await addClient(page, "Meta Metric");
    await page.goto(`/clients/${id}/progress`);
    await page.getByRole("button", { name: "Track a measurement" }).click();
    await page.getByRole("button", { name: "Body weight" }).click();
    await page.getByRole("button", { name: "Add measurement" }).click();
    await expect(page.getByRole("heading", { name: /Body weight/ })).toBeVisible();

    for (const [d, v] of [[daysAgo(14), "170"], [daysAgo(7), "168.5"], [daysAgo(0), "166"]]) {
      await page.getByRole("button", { name: "Add reading" }).click();
      await page.getByLabel(/^Value/).fill(v);
      await page.getByLabel("Date", { exact: true }).fill(d);
      await page.getByRole("button", { name: "Save reading" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    await expect(page.getByText("Change", { exact: true }).locator("..")).toContainText("-4");

    // Same date again corrects instead of duplicating.
    await page.getByRole("button", { name: "Add reading" }).click();
    await page.getByLabel(/^Value/).fill("167");
    await page.getByLabel("Date", { exact: true }).fill(daysAgo(0));
    await page.getByRole("button", { name: "Save reading" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByText("View readings").click();
    await expect(page.getByRole("listitem").filter({ hasText: "167 lb" })).toHaveCount(1);
    await expect(page.getByRole("listitem").filter({ hasText: "166 lb" })).toHaveCount(0);
  });
});
