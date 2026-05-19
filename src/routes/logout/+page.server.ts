import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '$lib/server/session';
import { redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {};
};

export const actions: Actions = {
	default: ({ cookies }) => {
		cookies.delete(SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS);
		throw redirect(303, '/');
	}
};
