import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import type { ViteDevServer } from 'vite';
import { resolve } from 'node:path';
import sirv from 'sirv';

export default defineConfig({
	plugins: [
		sveltekit(),
		...(process.env.E2E_STATIC_PATH
			? [
					{
						name: 'e2e-static',
						configureServer(server: ViteDevServer) {
							const staticDir = resolve(process.cwd(), process.env.E2E_STATIC_PATH!);
							server.middlewares.use(sirv(staticDir));
						}
					}
				]
			: [])
	]
});
