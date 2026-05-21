import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';

const dbPath = process.env.E2E_DB_PATH ?? resolve(process.cwd(), '.e2e', 'zvite-e2e.db');

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
		viewport: { width: 3840, height: 2160 }
	},
	webServer: {
		command: `node ./tests/e2e/cleanup-db.mjs "${dbPath}" && bun run dev -- --host 127.0.0.1 --port 4173`,
		env: {
			...process.env,
			DB_PATH: dbPath,
			E2E_STATIC_PATH: 'tests/e2e/static'
		},
		url: 'http://127.0.0.1:4173',
		reuseExistingServer: false,
		timeout: 120_000
	},
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 1920, height: 1080 },
				deviceScaleFactor: 2
			}
		}
	]
});
