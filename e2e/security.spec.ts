import { expect, test } from "@playwright/test";
import { addClient, createTrainer, logSession, signIn } from "./support/helpers";

test.describe("data isolation between trainers", () => {
  test("another trainer cannot open, edit or export someone else's client", async ({ browser }) => {
    const a = await createTrainer("iso-a");
    const b = await createTrainer("iso-b");
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await signIn(pageA, a.email);
    const clientId = await addClient(pageA, "Private Person", "very private goal");
    await logSession(pageA, clientId, { date: "2026-10-01", exercises: [{ name: "Secret Lift", sets: [["5", "100"]] }] });

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await signIn(pageB, b.email);
    for (const path of ["", "/sessions", "/progress", "/goals", "/notes", "/edit", "/sessions/new"]) {
      await pageB.goto(`/clients/${clientId}${path}`);
      await expect(pageB.getByText("Client not found")).toBeVisible();
    }
    const exportRes = await pageB.request.get(`/clients/${clientId}/export`);
    expect(exportRes.status()).toBe(404);
    await pageB.goto("/clients");
    await expect(pageB.getByText("Private Person")).toHaveCount(0);
    // B's own export must not contain A's data.
    const body = await (await pageB.request.get("/settings/export")).text();
    expect(body).not.toContain("Private Person");
    expect(body).not.toContain("Secret Lift");

    // Signed-out requests to data routes are rejected.
    const anon = await browser.newContext();
    const res = await anon.request.get(`/clients/${clientId}/export`, { maxRedirects: 0 });
    expect([307, 401]).toContain(res.status());
    const res2 = await anon.request.get("/settings/export", { maxRedirects: 0 });
    expect([307, 401]).toContain(res2.status());
    await ctxA.close();
    await ctxB.close();
    await anon.close();
  });

  test("CSV export is correct and neutralises spreadsheet formulas", async ({ page }) => {
    const { email } = await createTrainer("iso-csv");
    await signIn(page, email);
    const id = await addClient(page, "Csv Person");
    await logSession(page, id, { date: "2026-10-01", focus: "=HYPERLINK(\"http://evil\")", exercises: [{ name: "Squat, goblet", sets: [["8", "25"], ["8", "30"]] }] });
    const res = await page.request.get(`/clients/${id}/export`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    const text = await res.text();
    expect(text).toContain("Session date,Workout / focus,Exercise,Set,Reps,Weight (lb),Seconds,Notes / progress");
    expect(text).toContain('2026-10-01,"\'=HYPERLINK(""http://evil"")","Squat, goblet",1,8,25,,');
    expect(text).toContain('"Squat, goblet",2,8,30');
  });
});

test.describe("response hardening", () => {
  test("recovery redirects cannot leave the site", async ({ request }) => {
    for (const next of ["/\t/evil.example", "//evil.example", "https://evil.example", "/\\evil.example"]) {
      const res = await request.get(`/auth/confirm?token_hash=bogus&type=recovery&next=${encodeURIComponent(next)}`, { maxRedirects: 0 });
      const location = res.headers()["location"] ?? "";
      expect(new URL(location, "http://localhost:3100").host).toBe("localhost:3100");
    }
  });

  test("security headers are present", async ({ request }) => {
    const res = await request.get("/login");
    const h = res.headers();
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["referrer-policy"]).toBeTruthy();
  });

  test("pages are not indexable and no secrets reach the browser", async ({ page }) => {
    await page.goto("/login");
    expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
    const html = await page.content();
    expect(html).not.toMatch(/DATABASE_URL|postgres:\/\//);
  });
});
