import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const shouldUpdateReadmeScreenshots =
  process.env.UPDATE_README_SCREENSHOTS === "1";

const inviteGroups = [
  ["Alex", "Blair"],
  ["Casey", "Drew"],
  ["Emery"],
  ["Flynn", "Gray"],
  ["Harper"],
  ["Indigo", "Jules"],
];

type ResponseSelection = {
  inviteIndex: number;
  name: string;
  response: "Going" | "Maybe" | "Not going";
};

const responseSelections: ResponseSelection[] = [
  { inviteIndex: 1, name: "Casey", response: "Going" },
  { inviteIndex: 1, name: "Drew", response: "Not going" },
  { inviteIndex: 3, name: "Flynn", response: "Maybe" },
  { inviteIndex: 5, name: "Jules", response: "Going" },
];

async function updateReadmeScreenshot(
  page: Page,
  filename: string,
): Promise<void> {
  if (!shouldUpdateReadmeScreenshots) {
    return;
  }

  const screenshotsDir = resolve(process.cwd(), "screenshots");
  await mkdir(screenshotsDir, { recursive: true });
  await page.screenshot({
    path: resolve(screenshotsDir, filename),
    fullPage: true,
  });
}

test("register, create party, invite guests, and RSVP", async ({ page }) => {
  const testRunTimestamp = Date.now();
  const email = `e2e-user-${testRunTimestamp}@example.com`;
  const password = "password1234";
  const partyName = `Hannah & Miguel's Backyard BBQ`;
  const partyDescription =
    "![Barbeque](/barbeque.jpg)\n\nSaturday at 5:30 PM in our backyard — tacos, drinks, and lawn games. Bring a folding chair if you have one.";

  await page.goto("/");
  await page.getByRole("link", { name: /create an account/i }).click();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Register" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Your parties" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Create new party" }).click();
  await page.getByLabel("Party name").fill(partyName);
  await page.getByLabel("Description").fill(partyDescription);
  await page.getByRole("button", { name: "Create party" }).click();

  await expect(page).toHaveURL(/\/party\/.+$/);
  const partyUrl = page.url();
  await expect(page.getByRole("heading", { name: partyName })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: partyName })).toBeVisible();
  await updateReadmeScreenshot(page, "dashboard.png");
  await page.goto(partyUrl);

  const createInviteButton = page.getByRole("button", {
    name: "Create invite",
  });
  const additionalInviteCount = inviteGroups.length - 1;
  for (
    let inviteGroupIndex = 0;
    inviteGroupIndex < additionalInviteCount;
    inviteGroupIndex += 1
  ) {
    await createInviteButton.click();
  }

  const inviteSelect = page.locator(
    '.add-guest-section select[name="inviteId"]',
  );
  const nameInput = page.locator('.add-guest-section input[name="name"]');
  const addButton = page.getByRole("button", { name: "Add" });

  for (
    let inviteIndex = 0;
    inviteIndex < inviteGroups.length;
    inviteIndex += 1
  ) {
    await inviteSelect.selectOption({ index: inviteIndex });
    for (const guestName of inviteGroups[inviteIndex]) {
      await nameInput.fill(guestName);
      await addButton.click();
      await expect(
        page.locator(".member-name", { hasText: guestName }),
      ).toHaveCount(1);
    }
  }

  const inviteLinks = await page
    .locator("td.link-cell a")
    .evaluateAll((anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href") || ""),
    );

  expect(inviteLinks).toHaveLength(inviteGroups.length);

  for (const { inviteIndex, name, response } of responseSelections) {
    await page.goto(inviteLinks[inviteIndex]);
    await expect(page.getByRole("heading", { name: partyName })).toBeVisible();
    const memberCard = page.locator("article.card").filter({
      has: page.locator("p strong", { hasText: name }),
    });
    const responseButton = memberCard.getByRole("button", {
      name: new RegExp(`^${response}$`),
    });
    await responseButton.click();
    await expect(responseButton).toHaveClass(/active/);
  }

  await page.goto(partyUrl);
  await expect(
    page.getByText(
      /Yes:\s*2\s*\|\s*Maybe:\s*1\s*\|\s*No:\s*1\s*\|\s*No\s+response:\s*6/,
    ),
  ).toBeVisible();

  const recentResponses = page
    .locator("section.card")
    .filter({ has: page.getByRole("heading", { name: "Recent responses" }) });

  await expect(
    recentResponses
      .locator("li")
      .filter({ has: page.locator("strong", { hasText: "Casey" }) })
      .locator(".status-label.going"),
  ).toHaveText("Going");
  await expect(
    recentResponses
      .locator("li")
      .filter({ has: page.locator("strong", { hasText: "Drew" }) })
      .locator(".status-label.not-going"),
  ).toHaveText("Not going");
  await expect(
    recentResponses
      .locator("li")
      .filter({ has: page.locator("strong", { hasText: "Flynn" }) })
      .locator(".status-label.maybe"),
  ).toHaveText("Maybe");
  await expect(
    recentResponses
      .locator("li")
      .filter({ has: page.locator("strong", { hasText: "Jules" }) })
      .locator(".status-label.going"),
  ).toHaveText("Going");
  await expect(recentResponses).toContainText(/just now/);

  await updateReadmeScreenshot(page, "party.png");

  await page.goto(inviteLinks[1]);
  await expect(page.getByRole("heading", { name: partyName })).toBeVisible();
  await expect(page.getByText("Casey")).toBeVisible();
  await expect(page.getByText("Drew")).toBeVisible();
  await updateReadmeScreenshot(page, "rsvp.png");
});

test("create group, add member, and leave group", async ({ page }) => {
  const testRunTimestamp = Date.now();
  const user1Email = `org-user-${testRunTimestamp}@example.com`;
  const user2Email = `org-user-${testRunTimestamp}-b@example.com`;
  const password = "password1234";
  const groupName = "Smith Family";

  // Step 1: Register user1
  await page.goto("/register");
  await page.getByLabel("Email").fill(user1Email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Step 2: Verify the groups section is visible
  await expect(
    page.getByRole("heading", { name: "Your groups" }),
  ).toBeVisible();
  await expect(
    page.getByText("You are not a member of any groups yet."),
  ).toBeVisible();

  // Step 3: Create a group
  await page.getByLabel("Group name").fill(groupName);
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/organization\/.+$/);
  const groupUrl = page.url();
  await expect(page.getByRole("heading", { name: groupName })).toBeVisible();

  // Step 4: Verify the creator is listed as a member
  await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  await expect(page.locator("li")).toContainText([user1Email]);

  // Step 5: Try adding a nonexistent user and verify error
  await page
    .getByLabel("Email address of the user to add")
    .fill("nonexistent@example.com");
  await page.getByRole("button", { name: "Add member" }).click();
  await expect(
    page.getByText("No user found with that email address."),
  ).toBeVisible();

  // Step 6: Register user2 (need to log out first)
  await page.goto("/logout");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/register");
  await page.getByLabel("Email").fill(user2Email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Step 7: User2 should not see the group yet
  await expect(
    page.getByText("You are not a member of any groups yet."),
  ).toBeVisible();

  // Step 8: Log back in as user1
  await page.goto("/login");
  await page.getByLabel("Email").fill(user1Email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Step 9: Go to group page and add user2 by email
  await page.getByRole("link", { name: "Manage group" }).click();
  await expect(page).toHaveURL(groupUrl);

  await page.getByLabel("Email address of the user to add").fill(user2Email);
  await page.getByRole("button", { name: "Add member" }).click();
  await expect(
    page.getByText(`Added ${user2Email} to the group.`),
  ).toBeVisible();

  // Step 10: Verify user2 appears in the member list
  await expect(page.locator("li")).toContainText([user2Email]);

  // Step 11: Log out, log in as user2, verify group access
  await page.goto("/logout");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/login");
  await page.getByLabel("Email").fill(user2Email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Step 12: User2 should see the group on dashboard
  await expect(
    page.getByRole("heading", { name: "Your groups" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: groupName })).toBeVisible();

  // Step 13: User2 navigates to the group page and leaves
  await page.getByRole("link", { name: "Manage group" }).click();
  await expect(page).toHaveURL(groupUrl);
  await expect(page.getByRole("heading", { name: groupName })).toBeVisible();
  await expect(page.locator("li")).toContainText([user2Email]);

  await page.getByRole("button", { name: "Leave group" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Step 14: Verify user2 no longer sees the group on dashboard
  await expect(
    page.getByText("You are not a member of any groups yet."),
  ).toBeVisible();

  // Step 15: Verify user2 cannot access the group page directly
  await page.goto(groupUrl);
  // User2 is still authenticated, so they get a 403 error page
  await expect(page.locator("body")).toContainText(
    /not a member|forbidden|403/i,
  );
});

test("cannot create party for a group they are not a member of", async ({
  page,
}) => {
  const testRunTimestamp = Date.now();
  const user1Email = `forged-party-user-${testRunTimestamp}@example.com`;
  const user2Email = `forged-party-user-${testRunTimestamp}-b@example.com`;
  const password = "password1234";
  const groupName = "The Family";
  const forgedPartyName = "Forged Party";

  // Step 1: Register user1
  await page.goto("/register");
  await page.getByLabel("Email").fill(user1Email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Step 2: Create a group
  await page.getByLabel("Group name").fill(groupName);
  await page.getByRole("button", { name: "Create group" }).click();
  await expect(page).toHaveURL(/\/organization\/.+$/);
  const orgId = page.url().match(/\/organization\/(.+)$/)?.[1] ?? "";
  expect(orgId).toBeTruthy();

  // Step 3: Register user2
  await page.goto("/logout");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/register");
  await page.getByLabel("Email").fill(user2Email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Step 4: Go to create party page and verify user1's org is NOT in the dropdown
  await page.goto("/dashboard/new");
  const ownerOptions = await page
    .locator('select[name="ownerId"] option')
    .evaluateAll((options) =>
      options.map((o) => (o as HTMLOptionElement).value),
    );
  expect(ownerOptions).toEqual([""]);

  // Step 5: Try forging a party with user1's org by injecting it into the dropdown
  await page.goto("/dashboard/new");
  await page.getByLabel("Party name").fill(forgedPartyName);
  await page.evaluate((injectedOrgId) => {
    const select = document.querySelector(
      'select[name="ownerId"]',
    ) as HTMLSelectElement | null;
    if (!select) return;
    const option = document.createElement("option");
    option.value = injectedOrgId;
    option.text = "Injected Org";
    select.appendChild(option);
    select.value = injectedOrgId;
  }, orgId);
  await page.getByRole("button", { name: "Create party" }).click();
  await expect(page.getByText("Invalid organization selection")).toBeVisible();

  // Step 6: Verify user2 can still create a party for themselves
  await page.goto("/dashboard/new");
  await page.getByLabel("Party name").fill("My Own Party");
  await page.getByRole("button", { name: "Create party" }).click();
  await expect(page).toHaveURL(/\/party\/.+$/);
});
