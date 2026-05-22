import { expect, test } from "@playwright/test";
import { spawn, execSync } from "node:child_process";
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";

const MIGRATION_PORT = 4174;
const MIGRATION_DB_PATH = resolve(process.cwd(), ".e2e", "migration-seed.db");
const MIGRATION_BASE_URL = `http://127.0.0.1:${MIGRATION_PORT}`;

let serverProcess: ReturnType<typeof spawn> | null = null;

async function waitForServer(url: string, timeoutMs = 45_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status) {
        return; // Server is accepting connections
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

/**
 * E2E test for verifying that migrating from the database schema at commit
 * 1fe9eb1e49ba37ff7936cb1fe6ea8ab97e6dcadb (before migrations were added)
 * to the latest version works correctly.
 *
 * The test starts its own dev server with a seed database matching that
 * commit's schema. The app auto-migrates it on startup.
 */
test.describe("database migration", () => {
  test.beforeAll(async () => {
    // Create the seed database with the pre-migration schema
    mkdirSync(resolve(process.cwd(), ".e2e"), { recursive: true });
    execSync(
      `bun tests/e2e/create-migration-seed-db.mjs "${MIGRATION_DB_PATH}"`,
    );

    // Start the dev server pointed at the seed database.
    // The app will auto-migrate it on startup.
    serverProcess = spawn(
      "bun",
      [
        "run",
        "dev",
        "--",
        "--host",
        "127.0.0.1",
        "--port",
        String(MIGRATION_PORT),
      ],
      {
        env: {
          ...process.env,
          DB_PATH: MIGRATION_DB_PATH,
          E2E_STATIC_PATH: "tests/e2e/static",
        },
        cwd: process.cwd(),
        stdio: "pipe",
      },
    );

    // Collect any server startup errors for debugging
    let serverStderr = "";
    serverProcess.stderr?.on("data", (chunk: Buffer) => {
      serverStderr += chunk.toString();
    });

    let serverExited = false;
    serverProcess.on("exit", (code) => {
      serverExited = true;
      if (code !== 0 && code !== null) {
        serverStderr += `\n[process exited with code ${code}]`;
      }
    });

    try {
      await waitForServer(MIGRATION_BASE_URL);
    } catch (err) {
      serverProcess?.kill("SIGTERM");
      if (serverExited) {
        console.error(
          "Server process exited unexpectedly. stderr:",
          serverStderr,
        );
      } else {
        console.error(
          "Server failed to start within timeout. stderr:",
          serverStderr,
        );
      }
      throw err;
    }
  });

  test.afterAll(() => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill("SIGTERM");
    }
  });

  test("migrate schema from commit 1fe9eb1 to latest and verify data", async ({
    browser,
  }) => {
    const context = await browser.newContext({ baseURL: MIGRATION_BASE_URL });
    const page = await context.newPage();

    // === Step 1: Login with the seeded user ===
    await page.goto("/login");

    await page.getByLabel("Email").fill("migration-test@example.com");
    await page.getByLabel("Password").fill("e2e-migration-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    // === Step 2: Verify redirect to dashboard with the migrated party ===
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", { name: "Your parties" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Migration Test Party" }),
    ).toBeVisible();

    // === Step 3: Navigate to the party page ===
    await page.getByRole("link", { name: "Manage party" }).click();
    await expect(page).toHaveURL(/\/party\/.+/);
    await expect(
      page.getByRole("heading", { name: "Migration Test Party" }),
    ).toBeVisible();

    // === Step 4: Verify the description survived migration ===
    await expect(
      page
        .locator(".markdown")
        .getByText("This party was created before the migration."),
    ).toBeVisible();

    // === Step 5: Verify response counts are correct ===
    await expect(
      page.getByText(
        /Yes:\s*1\s*\|\s*Maybe:\s*1\s*\|\s*No:\s*0\s*\|\s*No\s+response:\s*1/,
      ),
    ).toBeVisible();

    // === Step 6: Verify the invite survived migration and has the correct token ===
    const inviteLink = page.locator(".link-cell a");
    await expect(inviteLink).toHaveAttribute(
      "href",
      /\/rsvp\/e2e-migration-token$/,
    );

    // === Step 7: Verify migrated invite members appear with correct names and statuses ===
    await expect(
      page.locator(".member-item").filter({ hasText: "Alice" }),
    ).toContainText("NoResponse");

    await expect(
      page.locator(".member-item").filter({ hasText: "Bob" }),
    ).toContainText("Maybe");

    await expect(
      page.locator(".member-item").filter({ hasText: "Charlie" }),
    ).toContainText("Yes");

    // === Step 8: Verify the member count in the invite table row ===
    // The first td.num is the invite index, the second is the guest count
    const invitesTable = page.locator(".invites-table");
    const guestCountCell = invitesTable.locator("tbody tr:first-child td.num");
    await expect(guestCountCell.nth(1)).toHaveText("3");

    // === Step 9: Verify the self-add checkbox is off ===
    const selfAddCheckbox = page.locator(
      '.invites-table tbody tr:first-child td input[type="checkbox"]',
    );
    await expect(selfAddCheckbox).not.toBeChecked();

    // === Step 10: Verify recent responses section ===
    await expect(page.getByText("No responses yet.")).toBeVisible();

    // === Step 11: Visit the RSVP link to verify the public page works ===
    await page.goto("/rsvp/e2e-migration-token");
    await expect(
      page.getByRole("heading", { name: "Migration Test Party" }),
    ).toBeVisible();
    await expect(
      page.getByText("This party was created before the migration."),
    ).toBeVisible();

    // === Step 12: Verify all three members are visible on the RSVP page ===
    await expect(page.getByText("Alice")).toBeVisible();
    await expect(page.getByText("Bob")).toBeVisible();
    await expect(page.getByText("Charlie")).toBeVisible();

    for (const name of ["Alice", "Bob", "Charlie"]) {
      const memberCard = page.locator("article.card").filter({
        has: page.locator("p strong", { hasText: name }),
      });
      await expect(
        memberCard.getByRole("button", { name: /^Going$/ }),
      ).toBeVisible();
      await expect(
        memberCard.getByRole("button", { name: /^Maybe$/ }),
      ).toBeVisible();
      await expect(
        memberCard.getByRole("button", { name: /^Not going$/ }),
      ).toBeVisible();
    }

    // Charlie has status "Yes", so "Going" should be active
    const charlieCard = page.locator("article.card").filter({
      has: page.locator("p strong", { hasText: "Charlie" }),
    });
    await expect(
      charlieCard.getByRole("button", { name: /^Going$/ }),
    ).toHaveClass(/active/);
  });
});
