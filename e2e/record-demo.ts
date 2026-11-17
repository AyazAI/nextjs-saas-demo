import { spawn } from "node:child_process";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../src/domain/demo";

const baseURL = "http://localhost:3000";
const videoDir = path.resolve("tmp/demo-video");
const gifPath = path.resolve("docs/demo.gif");

async function waitForHealth(child: ReturnType<typeof spawn>) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("next start exited before health");
    try {
      const response = await fetch(`${baseURL}/api/health`);
      if (response.ok) return;
    } catch {
      // server still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for the app");
}

function pause(page: import("@playwright/test").Page, ms = 1100) {
  return page.waitForTimeout(ms);
}

async function main() {
  await rm(videoDir, { recursive: true, force: true });
  await mkdir(videoDir, { recursive: true });
  await mkdir(path.dirname(gifPath), { recursive: true });

  const server = spawn("npx", ["next", "start", "-H", "0.0.0.0", "-p", "3000"], {
    stdio: "inherit",
    env: { ...process.env, PORT: "3000", BILLING_MODE: "mock" },
  });

  try {
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (server.exitCode !== null) {
      throw new Error(`next start exited with ${server.exitCode}`);
    }
    await waitForHealth(server);
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 1100, height: 700 },
      recordVideo: { dir: videoDir, size: { width: 1100, height: 700 } },
    });
    const page = await context.newPage();
    const stamp = Date.now().toString().slice(-6);
    const clientName = `Cedar Press ${stamp}`;

    await page.goto(`${baseURL}/login`);
    await pause(page, 500);
    await page.getByLabel("Email").fill(DEMO_ACCOUNTS[0].email);
    await page.getByLabel("Password").fill(DEMO_PASSWORD);
    await pause(page, 400);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("heading", { name: "Overview" }).waitFor();
    await pause(page);

    await page.goto(`${baseURL}/app/clients`);
    await page.getByLabel("Client name").fill(clientName);
    await page.getByLabel("Company").fill("Cedar Press");
    await pause(page, 400);
    await page.getByRole("button", { name: "Add client" }).click();
    await page.getByText(clientName, { exact: true }).waitFor();
    await pause(page);

    await page.goto(`${baseURL}/app/invoices`);
    await page.getByLabel("Client").selectOption({ label: clientName });
    await page.getByLabel("Line description").fill("Poster set");
    await page.getByLabel("Quantity").fill("1");
    await page.getByLabel("Amount").fill("120.00");
    await pause(page, 400);
    await page.getByRole("button", { name: "Create invoice" }).click();
    await page.getByRole("strong").filter({ hasText: "$120.00" }).waitFor();
    await pause(page, 1600);

    await page.goto(`${baseURL}/app/billing`);
    const back = page.getByRole("button", { name: "Return to Free" });
    if ((await back.count()) > 0) {
      await back.click();
      await page.getByTestId("plan-name").filter({ hasText: "Free" }).waitFor();
    }
    await page.getByRole("button", { name: "Activate Pro" }).click();
    await page.getByTestId("plan-name").filter({ hasText: "Pro" }).waitFor();
    await pause(page, 1600);

    const video = page.video();
    await context.close();
    await browser.close();
    const webm = video ? await video.path() : "";
    if (!webm) throw new Error("Playwright did not write a video");

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn(
        "ffmpeg",
        [
          "-y",
          "-i",
          webm,
          "-vf",
          "fps=8,scale=880:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer",
          "-loop",
          "0",
          gifPath,
        ],
        { stdio: "inherit" },
      );
      ffmpeg.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
    });

    const size = await stat(gifPath);
    console.log(`Wrote ${gifPath} (${Math.round(size.size / 1024)} KB)`);
    if (size.size > 5 * 1024 * 1024) {
      throw new Error("Demo GIF is over 5 MB");
    }
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
