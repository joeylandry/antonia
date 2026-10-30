import { expect, test } from "@playwright/test";
import { addClient, logSession, signIn } from "./support/helpers";

test.describe("access control", () => {
  test("signed-out requests to data routes are rejected", async ({ browser }) => {
    const anon = await browser.newContext();
    const res = await anon.request.get("/clients/00000000-0000-4000-8000-000000000000/export", { maxRedirects: 0 });
    expect([307, 401]).toContain(res.status());
    const res2 = await anon.request.get("/settings/export", { maxRedirects: 0 });
    expect([307, 401]).toContain(res2.status());
    await anon.close();
  });

  test("CSV export is correct and neutralises spreadsheet formulas", async ({ page }) => {
    await signIn(page);
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
    expect(html).not.toMatch(/PASSCODE_HASH|scrypt:/);
  });
});
