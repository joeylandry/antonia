import { expect, test } from "@playwright/test";
import { addClient, signIn } from "./support/helpers";

test.describe("client management", () => {
  test("a new account sees helpful empty states, then can add a client in seconds", async ({ page }) => {
    await signIn(page);
    await expect(page.getByText("Let's add your first client")).toBeVisible();
    await page.goto("/clients");
    await expect(page.getByText("Add your first client")).toBeVisible();

    await page.getByRole("link", { name: "Add client" }).first().click();
    await page.getByLabel("Full name").fill("Jamie Fixture");
    await page.getByRole("button", { name: "Add client" }).click();
    await expect(page.getByRole("heading", { name: "Jamie Fixture", level: 1 })).toBeVisible();
    await expect(page.getByText("No goal recorded yet.")).toBeVisible();
  });

  test("validation: name required, bad dates and numbers rejected, data persists after edit", async ({ page }) => {
    await signIn(page);
    await page.goto("/clients/new");
    await page.getByRole("button", { name: "Add client" }).click();
    await expect(page.getByText("Enter the client's name.")).toBeVisible();

    await page.getByLabel("Full name").fill("Edit Me");
    await page.getByText("More details").click();
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Session length").fill("500");
    await page.getByRole("button", { name: "Add client" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Session length must be 240 or less.")).toBeVisible();

    await page.getByLabel("Email").fill("edit@example.test");
    await page.getByLabel("Session length").fill("45");
    await page.getByLabel("Per week").fill("2");
    await page.getByLabel("Next review date").fill("2020-01-15");
    await page.getByLabel(/Primary goal/).fill("Deadlift bodyweight");
    await page.getByRole("button", { name: "Add client" }).click();
    await expect(page.getByRole("heading", { name: "Edit Me", level: 1 })).toBeVisible();
    await expect(page.getByText("Review overdue").first()).toBeVisible();
    await expect(page.getByText("45 min · 2× / week")).toBeVisible();

    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Edit details" }).click();
    await page.getByLabel("Full name").fill("Edited Name");
    await page.getByLabel("Status").selectOption("on_hold");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("heading", { name: "Edited Name", level: 1 })).toBeVisible();
    await expect(page.getByText("On hold").first()).toBeVisible();
    await page.reload();
    await expect(page.getByText("Deadlift bodyweight")).toBeVisible();
  });

  test("search, filter and sort the client list", async ({ page }) => {
    await signIn(page);
    await addClient(page, "Zed Zimmer", "run a marathon");
    await addClient(page, "Amy Adams", "improve posture");
    await addClient(page, "Max Moore");

    await page.goto("/clients");
    const rows = page.getByRole("listitem").filter({ has: page.getByRole("link") });
    await expect(rows.first()).toContainText("Amy Adams");
    await page.getByLabel("Search clients").fill("marathon");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("Zed Zimmer");
    await page.getByLabel("Search clients").fill("zzzz");
    await expect(page.getByText("No clients match your search.")).toBeVisible();
    await page.getByLabel("Search clients").fill("");
    // The database is shared by the whole run, so other tests' clients may be on hold; these three are active.
    await page.getByRole("button", { name: /^On hold/ }).click();
    await expect(rows.filter({ hasText: /Zed Zimmer|Amy Adams|Max Moore/ })).toHaveCount(0);
  });

  test("archive hides a client without losing data; restore brings it back; delete needs the name", async ({ page }) => {
    await signIn(page);
    const id = await addClient(page, "Archive Me");
    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Archive client" }).click();
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page).toHaveURL(/\/clients$/);
    await expect(page.getByText("Archive Me")).toHaveCount(0);

    await page.getByRole("link", { name: "Archived" }).click();
    await page.getByRole("link", { name: /Archive Me/ }).click();
    await expect(page.getByText("Archived", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log session" })).toHaveCount(0);
    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Restore client" }).click();
    await expect(page.getByRole("link", { name: "Log session" }).first()).toBeVisible();

    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: /Delete permanently/ }).click();
    await page.getByLabel(/Type .* to confirm/).fill("wrong name");
    await page.getByRole("button", { name: "Delete forever" }).click();
    await expect(page.getByText("The name you typed doesn't match.")).toBeVisible();
    await page.getByLabel(/Type .* to confirm/).fill("archive me");
    await page.getByRole("button", { name: "Delete forever" }).click();
    await expect(page).toHaveURL(/\/clients$/);
    await page.goto(`/clients/${id}`);
    await expect(page.getByText("Client not found")).toBeVisible();
  });
});
