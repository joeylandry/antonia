import { expect, test } from "@playwright/test";
import { PASSWORD, createTrainer, outbox, setConfirmSignups, signIn } from "./support/helpers";

async function fillSignUp(page: import("@playwright/test").Page, name: string, email: string, password = PASSWORD, confirm = password) {
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(confirm);
  await page.getByRole("button", { name: "Create account" }).click();
}

test.describe("sign up", () => {
  test.afterEach(() => setConfirmSignups(false));

  test("a new trainer registers from the sign-in page and lands on an empty account", async ({ browser }) => {
    const context = await browser.newContext({ timezoneId: "Europe/London" });
    const page = await context.newPage();
    const email = `signup-${Date.now()}@example.test`;
    await page.goto("/login");
    await page.getByRole("link", { name: "Create an account" }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await fillSignUp(page, "Antonia New", email);

    await page.waitForURL("**/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Antonia");
    await page.goto("/clients");
    await expect(page.getByRole("heading", { name: "Clients", level: 1 })).toBeVisible();
    await expect(page.locator("main a[href^='/clients/']:not([href='/clients/new'])")).toHaveCount(0);

    // The profile starts in the browser's time zone; signed-in visitors skip the sign-up page.
    await page.goto("/settings");
    await expect(page.locator("main").getByText(email)).toBeVisible();
    await expect(page.getByLabel("Time zone")).toHaveValue("Europe/London");
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/$/);
    await context.close();
  });

  test("validates the form and refuses an email that already has an account", async ({ page }) => {
    const { email } = await createTrainer("signup-taken");
    await page.goto("/signup");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter your name.")).toBeVisible();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Use at least 10 characters.", { exact: true })).toBeVisible();

    await fillSignUp(page, "Someone", "mismatch@example.test", PASSWORD, "something else entirely");
    await expect(page.getByText("Passwords don't match.")).toBeVisible();

    await fillSignUp(page, "Someone", email);
    await expect(page.getByText(/already exists/)).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test("with email confirmation on, the emailed link activates the account", async ({ page }) => {
    await setConfirmSignups(true);
    const email = `signup-confirm-${Date.now()}@example.test`;
    await page.goto("/signup");
    await fillSignUp(page, "Antonia Confirm", email);
    await expect(page.getByText(/Check your email/)).toBeVisible();

    const mail = (await outbox()).filter((m) => m.email === email && m.type === "signup").at(-1)!;
    await page.goto(`/auth/confirm?token_hash=${mail.token_hash}&type=email&next=/`);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("navigation", { name: "Primary" }).first()).toBeVisible();

    await page.context().clearCookies();
    await signIn(page, email);
  });
});
