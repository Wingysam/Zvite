import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const shouldUpdateReadmeScreenshots = process.env.UPDATE_README_SCREENSHOTS === '1';

const inviteGroups = [
	['Alex', 'Blair'],
	['Casey', 'Drew'],
	['Emery'],
	['Flynn', 'Gray'],
	['Harper'],
	['Indigo', 'Jules']
];

type ResponseSelection = {
	inviteIndex: number;
	name: string;
	response: 'Going' | 'Maybe' | 'Not going';
};

const responseSelections: ResponseSelection[] = [
	{ inviteIndex: 1, name: 'Casey', response: 'Going' },
	{ inviteIndex: 1, name: 'Drew', response: 'Not going' },
	{ inviteIndex: 3, name: 'Flynn', response: 'Maybe' },
	{ inviteIndex: 5, name: 'Jules', response: 'Going' }
];

async function updateReadmeScreenshot(page: Page, filename: string): Promise<void> {
	if (!shouldUpdateReadmeScreenshots) {
		return;
	}

	const screenshotsDir = resolve(process.cwd(), 'screenshots');
	await mkdir(screenshotsDir, { recursive: true });
	await page.screenshot({
		path: resolve(screenshotsDir, filename),
		fullPage: true
	});
}

test('register, create party, invite guests, and RSVP', async ({ page }) => {
	const runId = Date.now();
	const email = `e2e-user-${runId}@example.com`;
	const password = 'password1234';
	const partyName = `E2E Party ${runId}`;

	await page.goto('/');
	await page.getByRole('link', { name: /create an account/i }).click();

	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Register' }).click();

	await expect(page).toHaveURL(/\/dashboard$/);
	await expect(page.getByRole('heading', { name: 'Your parties' })).toBeVisible();
	await updateReadmeScreenshot(page, 'dashboard.png');

	await page.getByRole('link', { name: 'Create new party' }).click();
	await page.getByLabel('Party name').fill(partyName);
	await page.getByLabel('Description').fill('This event is created by the e2e suite.');
	await page.getByRole('button', { name: 'Create party' }).click();

	await expect(page).toHaveURL(/\/party\/.+$/);
	const partyUrl = page.url();
	await expect(page.getByRole('heading', { name: partyName })).toBeVisible();

	const createInviteButton = page.getByRole('button', { name: 'Create invite' });
	for (let i = 0; i < inviteGroups.length - 1; i += 1) {
		await createInviteButton.click();
	}

	const inviteSelect = page.locator('.add-guest-section select[name="inviteId"]');
	const nameInput = page.locator('.add-guest-section input[name="name"]');
	const addButton = page.getByRole('button', { name: 'Add' });

	for (let inviteIndex = 0; inviteIndex < inviteGroups.length; inviteIndex += 1) {
		await inviteSelect.selectOption({ index: inviteIndex });
		for (const guestName of inviteGroups[inviteIndex]) {
			await nameInput.fill(guestName);
			await addButton.click();
			await expect(page.locator('.member-name', { hasText: guestName })).toHaveCount(1);
		}
	}

	const inviteLinks = await page
		.locator('td.link-cell a')
		.evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute('href') || ''));

	expect(inviteLinks).toHaveLength(inviteGroups.length);

	for (const { inviteIndex, name, response } of responseSelections) {
		await page.goto(inviteLinks[inviteIndex]);
		await expect(page.getByRole('heading', { name: partyName })).toBeVisible();
		const memberCard = page.locator('article.card').filter({
			has: page.locator('p strong', { hasText: name })
		});
		const responseButton = memberCard.getByRole('button', { name: response });
		await responseButton.click();
		await expect(responseButton).toHaveClass(/active/);
	}

	await page.goto(partyUrl);
	await expect(page.getByText(/Yes:\s*2\s*\|\s*Maybe:\s*1\s*\|\s*No:\s*1\s*\|\s*No response:\s*6/)).toBeVisible();
	await updateReadmeScreenshot(page, 'party.png');

	await page.goto(inviteLinks[1]);
	await expect(page.getByRole('heading', { name: partyName })).toBeVisible();
	await expect(page.getByText('Casey')).toBeVisible();
	await expect(page.getByText('Drew')).toBeVisible();
	await updateReadmeScreenshot(page, 'rsvp.png');
});
