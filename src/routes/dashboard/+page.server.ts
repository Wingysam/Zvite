import { listPartiesForUser } from '$lib/server/queries';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	return {
		parties: listPartiesForUser(locals.user.id)
	};
};
