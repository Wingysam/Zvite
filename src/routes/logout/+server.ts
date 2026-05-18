import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '$lib/server/session';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ cookies }) => {
	cookies.delete(SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS);
	throw redirect(303, '/');
};
