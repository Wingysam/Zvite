import { defineConfig, devices } from '@playwright/test';

const dbPath = process.env.E2E_DB_PATH ?? '/tmp/zvite-e2e.db';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: false,
	retries: process.env.CI ? 2 : 0,
	workers: 1,
	timeout: 90_000,
	expect: {
		timeout: 10_000
	},
	use: {
		baseURL: 'http://127.0.0.1:4173',
		trace: 'on-first-retry',
		viewport: { width: 1440, height: 900 }
	},
	webServer: {
		command: `node ./tests/e2e/cleanup-db.mjs "${dbPath}" && bun run dev -- --host 127.0.0.1 --port 4173`,
		env: {
			...process.env,
			DB_PATH: dbPath
		},
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: false,
		timeout: 120_000
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
