import { createPartyWithInvite, listOrganizationsForUser } from '$lib/server/queries';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	return {
		organizations: listOrganizationsForUser(locals.user.id)
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const data = Object.fromEntries(await request.formData());
		const name = String(data.name ?? '').trim();
		const descriptionInput = String(data.description ?? '').trim();
		const ownerType = String(data.ownerType ?? 'User');
		const ownerId = String(data.ownerId ?? '');

		if (!name) {
			return fail(400, { error: 'Party name is required.' });
		}

		let resolvedOwnerId = locals.user.id;
		let resolvedOwnerType: 'User' | 'Organization' = 'User';

		if (ownerType === 'Organization') {
			const organizations = listOrganizationsForUser(locals.user.id);
			const isMember = organizations.some((org) => org.id === ownerId);
			if (!isMember) {
				return fail(400, { error: 'Invalid organization selection.' });
			}
			resolvedOwnerId = ownerId;
			resolvedOwnerType = 'Organization';
		}

		const party = createPartyWithInvite({
			name,
			description: descriptionInput || null,
			ownerId: resolvedOwnerId,
			ownerType: resolvedOwnerType
		});

		throw redirect(303, `/party/${party.id}`);
	}
};
