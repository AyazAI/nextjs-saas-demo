import { expect, test, type Page } from "@playwright/test";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../src/domain/demo";

const owner = DEMO_ACCOUNTS[0];
const member = DEMO_ACCOUNTS[2];

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
}

test("marketing page is a portfolio demo without social proof", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Run the work");
  await expect(page.getByText("Portfolio demo")).toBeVisible();
  await expect(page.getByText(/trusted by/i)).toHaveCount(0);
  await expect(page.getByText(/customers/i).first()).toBeVisible();
});

test("rejects a wrong password", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(owner.email);
  await page.getByLabel("Password").fill("wrong-password-1");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Invalid email or password" })).toBeVisible();
});

test("sign up creates an empty workspace", async ({ page }) => {
  const stamp = Date.now();
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Test Owner");
  await page.getByLabel("Email").fill(`owner.${stamp}@example.test`);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByLabel("Workspace name").fill(`Studio ${stamp}`);
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/app/);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByRole("complementary").getByText(`Studio ${stamp}`, { exact: true })).toBeVisible();
  await expect(page.getByTestId("open-tasks")).toHaveText("0");
});

test("owner can add a client, task, and invoice, then remove them", async ({ page }) => {
  await login(page, owner.email);
  const stamp = Date.now();
  const clientName = `Client ${stamp}`;
  const taskTitle = `Task ${stamp}`;

  await page.goto("/app/clients");
  await page.getByLabel("Client name").fill(clientName);
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByText(clientName)).toBeVisible();

  await page.goto("/app/tasks");
  await page.getByLabel("Task title").fill(taskTitle);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("heading", { name: taskTitle })).toBeVisible();

  await page.goto("/app/invoices");
  await page.getByLabel("Client").selectOption({ label: clientName });
  await page.getByLabel("Line description").fill("Workshop");
  await page.getByLabel("Quantity").fill("2");
  await page.getByLabel("Amount").fill("150.50");
  await page.getByRole("button", { name: "Create invoice" }).click();
  await expect(page.getByRole("strong").filter({ hasText: "$301.00" })).toBeVisible();
  await page.getByRole("button", { name: "Delete draft" }).click();
  await expect(page).toHaveURL(/\/app\/invoices$/);

  await page.goto("/app/tasks");
  await page.getByRole("button", { name: `Delete ${taskTitle}` }).click();
  await expect(page.getByRole("heading", { name: taskTitle })).toHaveCount(0);

  await page.goto("/app/clients");
  await page.getByRole("button", { name: `Delete ${clientName}` }).click();
  await expect(page.getByText(clientName)).toHaveCount(0);
});

test("member can add a task but cannot bill or create clients", async ({ page }) => {
  await login(page, member.email);
  const title = `Member task ${Date.now()}`;
  await page.goto("/app/tasks");
  await page.getByLabel("Task title").fill(title);
  await page.getByRole("button", { name: "Add task" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);

  await page.goto("/app/clients");
  await expect(page.getByRole("button", { name: "Add client" })).toHaveCount(0);
  const orgId = await page.locator("[data-org-id]").getAttribute("data-org-id");
  const response = await page.request.post(`/api/orgs/${orgId}/clients`, {
    data: { name: "Should fail" },
  });
  expect(response.status()).toBe(403);

  await page.goto("/app/billing");
  await expect(page.getByText("Only an owner can change the plan.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Activate Pro" })).toHaveCount(0);
});

test("free plan blocks a fourth member until the local mock enables Pro", async ({ page }) => {
  const stamp = Date.now();
  const email = `extra.${stamp}@example.test`;
  const signup = await page.request.post("/api/signup", {
    data: {
      name: "Extra Person",
      email,
      password: DEMO_PASSWORD,
      organizationName: `Extra ${stamp}`,
    },
  });
  expect(signup.ok()).toBeTruthy();

  await login(page, owner.email);
  await page.goto("/app/billing");
  if ((await page.getByRole("button", { name: "Return to Free" }).count()) > 0) {
    await page.getByRole("button", { name: "Return to Free" }).click();
    await expect(page.getByTestId("plan-name")).toHaveText("Free");
  }

  await page.goto("/app/settings");
  await page.getByLabel("Invite email").fill(email);
  await page.getByLabel("Invite role").selectOption("MEMBER");
  await page.getByRole("button", { name: "Invite" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Free plan" })).toBeVisible();

  await page.goto("/app/billing");
  await page.getByRole("button", { name: "Activate Pro" }).click();
  await expect(page.getByTestId("plan-name")).toHaveText("Pro");

  await page.goto("/app/settings");
  await page.getByLabel("Invite email").fill(email);
  await page.getByLabel("Invite role").selectOption("MEMBER");
  await page.getByRole("button", { name: "Invite" }).click();
  await expect(page.locator("strong", { hasText: "Extra Person" })).toBeVisible();
  await page.getByRole("button", { name: "Remove Extra Person" }).click();
  await expect(page.locator("strong", { hasText: "Extra Person" })).toHaveCount(0);

  await page.goto("/app/billing");
  await page.getByRole("button", { name: "Return to Free" }).click();
  await expect(page.getByTestId("plan-name")).toHaveText("Free");
});

test("health check reaches Postgres", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  await expect(response.json()).resolves.toMatchObject({ ok: true, service: "harborlane" });
});
