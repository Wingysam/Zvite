import { createSessionValue, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '$lib/server/session';
import { hashPassword } from '$lib/server/auth';
import { createUser, getUserByEmail } from '$lib/server/queries';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const DISABLE_SIGNUPS = import.meta.env.DISABLE_SIGNUPS === 'true' ||
	(typeof process !== 'undefined' && process.env.DISABLE_SIGNUPS === 'true');

export const load: PageServerLoad = () => {
	if (DISABLE_SIGNUPS) {
		throw error(403, 'Sign-ups are disabled.');
	}

	return {};
};

export const actions: Actions = {
	default: async ({ cookies, request }) => {
		if (DISABLE_SIGNUPS) {
			throw error(403, 'Sign-ups are disabled.');
		}

		const data = Object.fromEntries(await request.formData());
		const email = String(data.email ?? '').trim().toLowerCase();
		const password = String(data.password ?? '');

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required.' });
		}
		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters long.' });
		}
		if (getUserByEmail(email)) {
			return fail(400, { error: 'An account with this email already exists.' });
		}

		const user = createUser(email, hashPassword(password));
		cookies.set(SESSION_COOKIE_NAME, createSessionValue(user.id), SESSION_COOKIE_OPTIONS);
		throw redirect(303, '/dashboard');
	}
};
