import { expect, test } from "@playwright/test";
import { createTrainer, signIn } from "./support/helpers";

test.describe("theme", () => {
  test("follows the system by default and remembers an explicit choice", async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: "dark" });
    const page = await ctx.newPage();
    await page.goto("/login");
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByRole("radio", { name: "Light" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    const { email } = await createTrainer("theme-user");
    await signIn(page, email);
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await ctx.close();
  });
});
