import { mkdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../src/domain/demo";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_ACCOUNTS[0].email);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}

test("capture product screenshots", async ({ page }) => {
  await mkdir("docs/screenshots", { recursive: true });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/01-marketing.png", fullPage: true });

  await page.goto("/login");
  await expect(page.getByText("Sample accounts")).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/02-login.png", fullPage: true });

  await login(page);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/03-overview.png", fullPage: true });

  await page.goto("/app/tasks");
  await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/04-tasks.png", fullPage: true });

  await page.goto("/app/invoices");
  await page.getByRole("link", { name: "SAMPLE-1001" }).click();
  await expect(page.getByRole("heading", { name: "SAMPLE-1001" })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/05-invoice.png", fullPage: true });

  await page.goto("/app/billing");
  await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
  await page.screenshot({ path: "docs/screenshots/06-billing.png", fullPage: true });
});
