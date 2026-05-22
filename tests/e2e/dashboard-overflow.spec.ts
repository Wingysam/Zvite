import { expect, test } from "@playwright/test";

test("long description does not overflow dashboard cards on small viewport", async ({
  page,
}) => {
  // Use a small mobile viewport that would trigger overflow
  await page.setViewportSize({ width: 375, height: 812 });

  const testRunTimestamp = Date.now();
  const email = `e2e-overflow-${testRunTimestamp}@example.com`;
  const password = "password1234";
  const partyName = "Overflow Test Party";
  // A description with a very long unbroken word that would normally overflow
  const longWord = "a".repeat(300);
  const partyDescription = `This description has a very long unbroken word: ${longWord}. It should wrap inside the card without causing horizontal overflow.`;

  // Register a new user
  await page.goto("/");
  await page.getByRole("link", { name: /create an account/i }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Create a party with a long description
  await page.getByRole("link", { name: "Create new party" }).click();
  await page.getByLabel("Party name").fill(partyName);
  await page.getByLabel("Description").fill(partyDescription);
  await page.getByRole("button", { name: "Create party" }).click();
  await expect(page).toHaveURL(/\/party\/.+$/);

  // Go to dashboard and verify the card doesn't overflow
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: partyName })).toBeVisible();

  // Confirm there is no horizontal scrollbar on the page
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth;
  });
  expect(hasHorizontalScroll).toBe(false);

  // Confirm the card containing the long description fits within the viewport
  const viewportWidth = page.viewportSize()?.width ?? 375;
  const card = page
    .locator("article.card")
    .filter({ has: page.locator("h2", { hasText: partyName }) });
  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth + 1);
});
