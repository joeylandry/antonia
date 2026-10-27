import { expect, test } from "@playwright/test";
import { PASSWORD, createTrainer, outbox, signIn } from "./support/helpers";

test.describe("authentication", () => {
  test("signed-out visitors are sent to sign in, and back to where they were going", async ({ page }) => {
    const { email } = await createTrainer("auth-redirect");
    await page.goto("/clients");
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/clients/00000000-0000-4000-8000-000000000000/sessions");
    await expect(page).toHaveURL(/\/login$/);
    await signIn(page, email);
  });

  test("wrong credentials show a generic error and never reveal whether the email exists", async ({ page }) => {
    await createTrainer("auth-wrong");
    await page.goto("/login");
    await page.getByLabel("Email").fill("auth-wrong@example.test");
    await page.getByLabel("Password").fill("not the password");
    await page.getByRole("button", { name: "Sign in" }).click();
    const alert = page.locator("form [role=alert]");
    const known = await alert.innerText();

    await page.getByLabel("Email").fill("nobody-here@example.test");
    await page.getByLabel("Password").fill("not the password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(alert).toHaveText(known);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("empty fields are validated", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Enter your password.")).toBeVisible();
  });

  test("the session survives reloads and a new tab, and sign out ends it", async ({ page, context }) => {
    const { email } = await createTrainer("auth-session");
    await signIn(page, email);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Antonia");
    const second = await context.newPage();
    await second.goto("/clients");
    await expect(second.getByRole("heading", { name: "Clients", level: 1 })).toBeVisible();

    await page.getByRole("button", { name: "Account menu" }).first().click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await second.goto("/clients");
    await expect(second).toHaveURL(/\/login$/);
  });

  test("password reset: email link, new password, old password stops working", async ({ page }) => {
    const { email } = await createTrainer("auth-reset");
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/reset link is on its way/)).toBeVisible();

    // Unknown addresses get the identical response.
    await page.getByLabel("Email").fill("ghost@example.test");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/reset link is on its way/)).toBeVisible();

    const mail = (await outbox()).filter((m) => m.email === email).at(-1)!;
    await page.goto(`/auth/confirm?token_hash=${mail.token_hash}&type=recovery&next=/reset-password`);
    await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();

    await page.getByLabel("New password", { exact: true }).fill("short");
    await page.getByLabel("Confirm new password").fill("short");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Use at least 10 characters.", { exact: true })).toBeVisible();

    await page.getByLabel("New password", { exact: true }).fill("a brand new passphrase");
    await page.getByLabel("Confirm new password").fill("a different passphrase");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Passwords don't match.")).toBeVisible();

    await page.getByLabel("New password", { exact: true }).fill("a brand new passphrase");
    await page.getByLabel("Confirm new password").fill("a brand new passphrase");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.getByText("Your password has been updated.")).toBeVisible();

    // The link is single-use.
    await page.context().clearCookies();
    await page.goto(`/auth/confirm?token_hash=${mail.token_hash}&type=recovery&next=/reset-password`);
    await expect(page).toHaveURL(/\/login\?error=link/);

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("form [role=alert]")).toBeVisible();
    await signIn(page, email, "a brand new passphrase");
  });

  test("open redirects are refused", async ({ page }) => {
    const { email } = await createTrainer("auth-redirect2");
    await page.goto("/login?next=//evil.example");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/");
    expect(new URL(page.url()).host).toBe("localhost:3100");
  });
});
