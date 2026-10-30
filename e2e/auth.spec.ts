import { expect, test } from "@playwright/test";
import { PASSCODE, signIn } from "./support/helpers";

test.describe("passcode sign-in", () => {
  test("signed-out visitors are sent to unlock first", async ({ page }) => {
    await page.goto("/clients");
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/clients/00000000-0000-4000-8000-000000000000/sessions");
    await expect(page).toHaveURL(/\/login$/);
    await signIn(page);
  });

  test("a wrong passcode is refused", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Passcode").fill("not the passcode");
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.locator("form [role=alert]")).toHaveText("That passcode isn't right. Please try again.");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("an empty passcode is validated", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByText("Enter the passcode.")).toBeVisible();
  });

  test("a made-up session cookie does not get in", async ({ page, context }) => {
    // `next start` runs in production mode, so the app uses the __Host- cookie (Secure; Chrome still sends it to localhost).
    await context.addCookies([{ name: "__Host-antonia_session", value: "forged-token-value", url: "https://localhost:3100" }]);
    await page.goto("/clients");
    await expect(page).toHaveURL(/\/login$/);
    const res = await page.request.get("/settings/export", { maxRedirects: 0 });
    expect([307, 401]).toContain(res.status());
  });

  test("the session survives reloads and a new tab, and sign out ends it", async ({ page, context }) => {
    await signIn(page);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Antonia");
    const second = await context.newPage();
    await second.goto("/clients");
    await expect(second.getByRole("heading", { name: "Clients", level: 1 })).toBeVisible();
    const cookie = (await context.cookies()).find((c) => c.name.includes("antonia_session"))!;
    expect(cookie.httpOnly).toBe(true);

    await page.getByRole("button", { name: "Account menu" }).first().click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await second.goto("/clients");
    await expect(second).toHaveURL(/\/login$/);

    // Replaying the old cookie after sign-out does not work: the session was deleted on the server.
    await context.addCookies([cookie]);
    await second.goto("/clients");
    await expect(second).toHaveURL(/\/login$/);
  });

  test("open redirects are refused", async ({ page }) => {
    await page.goto("/login?next=//evil.example");
    await page.getByLabel("Passcode").fill(PASSCODE);
    await page.getByRole("button", { name: "Unlock" }).click();
    await page.waitForURL("**/");
    expect(new URL(page.url()).host).toBe("localhost:3100");
  });
});
