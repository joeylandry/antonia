import { expect, test } from "@playwright/test";

test.describe("demo mode (no Supabase configured)", () => {
  test("opens straight into the app with sample data and a visible demo banner", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("sample clients and numbers, nothing real")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Antonia");
    await expect(page.getByText("Needs your attention")).toBeVisible();
    await expect(page.getByText("Recent sessions")).toBeVisible();
    // Sign-in pages are not needed.
    await page.goto("/login");
    await expect(page).toHaveURL(/localhost:3300\/$/);
  });

  test("the status tiles on Today open the matching filtered client list", async ({ page }) => {
    await page.goto("/");
    const summary = page.getByRole("list", { name: /Client status summary/ });
    for (const [label, param] of [["On track", "on_track"], ["Check in soon", "watch"], ["Needs attention", "overdue"]] as const) {
      await page.goto("/");
      const tile = summary.getByRole("link", { name: new RegExp(label) });
      const count = Number((await tile.innerText()).match(/\d+/)![0]);
      expect(count).toBeGreaterThan(0);
      await tile.click();
      await expect(page).toHaveURL(new RegExp(`/clients\\?health=${param}$`));
      await expect(page.getByRole("button", { name: new RegExp(`^${label}`) })).toHaveAttribute("aria-pressed", "true");
      const rows = page.getByRole("list").filter({ has: page.getByRole("link", { name: /Last session|No sessions yet/ }) }).first().getByRole("listitem");
      await expect(rows).toHaveCount(count);
    }
    // Chips toggle off again.
    await page.getByRole("button", { name: /^Needs attention/ }).click();
    await expect(page.getByRole("link", { name: /Casey Morgan/ })).toBeVisible();
  });

  test("clients, profile, sessions, progress and goals all show real-looking data", async ({ page }) => {
    await page.goto("/clients");
    await expect(page.getByRole("link", { name: /Jordan Rivera/ })).toBeVisible();
    await page.getByRole("link", { name: /Jordan Rivera/ }).click();
    await expect(page.getByRole("heading", { name: "Jordan Rivera", level: 1 })).toBeVisible();
    await expect(page.getByText("Back Squat 180 lb").first()).toBeVisible();
    await expect(page.getByText("Old left knee tweak")).toBeVisible();

    await page.getByRole("link", { name: "Progress" }).click();
    await page.getByLabel("Exercise", { exact: true }).selectOption({ label: "Back Squat" });
    await expect(page.getByRole("img", { name: /Top weight for Back Squat over time/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Body weight/ })).toBeVisible();

    await page.getByRole("link", { name: "Goals" }).click();
    await expect(page.getByRole("progressbar").first()).toBeVisible();
    await page.getByRole("link", { name: "Sessions" }).click();
    await expect(page.getByText("Leg Press").first()).toBeVisible();
  });

  test("a year-long client has a full history with paging and a busy chart", async ({ page }) => {
    await page.goto("/clients");
    await page.getByRole("link", { name: /Casey Morgan/ }).click();
    await page.waitForURL(/\/clients\/[0-9a-f-]{36}$/);
    const base = page.url();
    await page.goto(`${base}/sessions`);
    await expect(page.getByText(/9\d sessions, newest first/)).toBeVisible();
    const cards = page.locator("ol > li");
    await expect(cards).toHaveCount(15);
    await page.getByRole("link", { name: /older sessions/ }).click();
    await expect(cards).toHaveCount(30);

    await page.goto(`${base}/progress`);
    await page.getByLabel("Exercise", { exact: true }).selectOption({ label: "Goblet Squat" });
    await expect(page.getByRole("img", { name: /Top weight for Goblet Squat over time\. \d{2,} sessions/ })).toBeVisible();
    await page.getByRole("button", { name: "3M" }).first().click();
    await expect(page.getByRole("img", { name: /Top weight for Goblet Squat over time/ })).toBeVisible();
  });

  test("the roster looks full: many clients, every status, brand name shown", async ({ page }) => {
    await page.goto("/clients");
    await expect(page.getByText("13 clients").or(page.getByText(/1[0-3] clients/))).toBeVisible();
    await expect(page.getByText("On hold").first()).toBeVisible();
    await expect(page.getByText("Fitness assessment").first()).toBeVisible();
    await expect(page.getByText("FitnessTracker").first()).toBeVisible();
    await expect(page).toHaveTitle(/FitnessTracker/);
    await page.goto("/clients?archived=1");
    await expect(page.getByRole("link", { name: /Marcus Bell/ })).toBeVisible();
  });

  test("adding a client and logging a session works", async ({ page }) => {
    await page.goto("/clients/new");
    await page.getByLabel("Full name").fill("Demo Visitor");
    await page.getByRole("button", { name: "Add client" }).click();
    await expect(page.getByRole("heading", { name: "Demo Visitor", level: 1 })).toBeVisible();
    const url = page.url();

    await page.goto(`${url}/sessions/new`);
    await page.getByLabel("Exercise 1", { exact: true }).fill("Goblet Squat");
    await page.getByLabel("Set 1 reps").fill("10");
    await page.getByLabel("Set 1 weight in pounds").fill("35");
    await page.getByRole("button", { name: "Save session" }).click();
    await page.waitForURL(`${url}/sessions`);
    await expect(page.getByText("10 @ 35 lb")).toBeVisible();
  });

  test("exports and settings behave in demo mode", async ({ page, request }) => {
    await page.goto("/clients");
    await page.getByRole("link", { name: /Jordan Rivera/ }).click();
    await page.waitForURL(/\/clients\/[0-9a-f-]{36}$/);
    const id = page.url().split("/").pop();
    const res = await request.get(`/clients/${id}/export`);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain("Back Squat");
    const all = await request.get("/settings/export");
    expect(all.status()).toBe(200);
    expect((await all.json()).demo).toBe(true);

    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Password" })).toHaveCount(0);
  });

  test("looks right on a phone", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const page = await ctx.newPage();
    for (const path of ["/", "/clients"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `overflow on ${path}`).toBeLessThanOrEqual(0);
    }
    await ctx.close();
  });
});
