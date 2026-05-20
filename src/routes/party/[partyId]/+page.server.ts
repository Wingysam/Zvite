import {
	addInviteMember,
	createInviteForOwnedParty,
	getLatestInviteForOwnedParty,
	getOwnedInviteById,
	getOwnedPartyById,
	listInviteMembersByInviteId,
	listInvitesForOwnedParty,
	listRecentResponsesForOwnedParty,
	removeOwnedInvite,
	removeInviteMember,
	updateOwnedPartyName,
	updateOwnedPartyDescription,
	updateOwnedInviteSelfAddNames
} from '$lib/server/queries';
import { renderMarkdownSafe } from '$lib/server/markdown';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, params, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const party = getOwnedPartyById(params.partyId, locals.user.id);
	if (!party) {
		throw error(404, 'Party not found');
	}

	const invites = listInvitesForOwnedParty(party.id, locals.user.id);
	const mostRecentInvite = getLatestInviteForOwnedParty(party.id, locals.user.id);
	const invitesWithMembers = invites.map((invite) => {
		const members = listInviteMembersByInviteId(invite.id);
		return {
			...invite,
			allow_self_add_names: invite.allow_self_add_names === 1,
			shareLink: `${url.origin}/rsvp/${invite.token}`,
			members
		};
	});
	const allMembers = invitesWithMembers.flatMap((invite) => invite.members);
	const counts = {
		Yes: allMembers.filter((member) => member.status === 'Yes').length,
		Maybe: allMembers.filter((member) => member.status === 'Maybe').length,
		No: allMembers.filter((member) => member.status === 'No').length,
		NoResponse: allMembers.filter((member) => member.status === 'NoResponse').length
	};
	const recentResponses = listRecentResponsesForOwnedParty(party.id, locals.user.id);

	return {
		party,
		renderedDescription: renderMarkdownSafe(party.description),
		invites: invitesWithMembers,
		counts,
		recentResponses,
		defaultAllowSelfAddNames: mostRecentInvite?.allow_self_add_names === 1
	};
};

export const actions: Actions = {
	updateName: async ({ locals, params, request }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const party = getOwnedPartyById(params.partyId, locals.user.id);
		if (!party) {
			throw error(404, 'Party not found');
		}

		const data = Object.fromEntries(await request.formData());
		const name = String(data.name ?? '').trim();
		if (!name) {
			return fail(400, { error: 'Event name is required.' });
		}

		const updated = updateOwnedPartyName(party.id, locals.user.id, name);
		if (!updated) {
			return fail(400, { error: 'Unable to update event name.' });
		}

		return { success: true };
	},
	updateDescription: async ({ locals, params, request }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const party = getOwnedPartyById(params.partyId, locals.user.id);
		if (!party) {
			throw error(404, 'Party not found');
		}

		const data = Object.fromEntries(await request.formData());
		const description = String(data.description ?? '').trim();
		const updated = updateOwnedPartyDescription(
			party.id,
			locals.user.id,
			description.length > 0 ? description : null
		);
		if (!updated) {
			return fail(400, { error: 'Unable to update description.' });
		}

		return { success: true };
	},
	addInvite: async ({ locals, params, request }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const party = getOwnedPartyById(params.partyId, locals.user.id);
		if (!party) {
			throw error(404, 'Party not found');
		}

		const data = Object.fromEntries(await request.formData());
		const allowSelfAddNames = data.allowSelfAddNames === 'on';

		const invite = createInviteForOwnedParty({
			partyId: party.id,
			userId: locals.user.id,
			allowSelfAddNames
		});

		const name = String(data.name ?? '').trim();
		if (name) {
			addInviteMember(invite.id, name);
		}

		return { success: true, allowSelfAddNames, guestNameAdded: name || undefined };
	},
	updateInvite: async ({ locals, params, request }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const party = getOwnedPartyById(params.partyId, locals.user.id);
		if (!party) {
			throw error(404, 'Party not found');
		}

		const data = Object.fromEntries(await request.formData());
		const inviteId = String(data.inviteId ?? '').trim();
		const allowSelfAddNames = data.allowSelfAddNames === 'on';
		if (!inviteId) {
			return fail(400, { error: 'Invalid invite selected.' });
		}

		const updated = updateOwnedInviteSelfAddNames(
			party.id,
			inviteId,
			locals.user.id,
			allowSelfAddNames
		);
		if (!updated) {
			return fail(400, { error: 'Invalid invite selected.' });
		}

		return { success: true };
	},
	removeInvite: async ({ locals, params, request }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const party = getOwnedPartyById(params.partyId, locals.user.id);
		if (!party) {
			throw error(404, 'Party not found');
		}

		const data = Object.fromEntries(await request.formData());
		const inviteId = String(data.inviteId ?? '').trim();
		if (!inviteId) {
			return fail(400, { error: 'Invalid invite selected.' });
		}

		const removed = removeOwnedInvite(party.id, inviteId, locals.user.id);
		if (!removed) {
			return fail(400, { error: 'Invalid invite selected.' });
		}

		return { success: true };
	},
	addMember: async ({ locals, params, request }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const party = getOwnedPartyById(params.partyId, locals.user.id);
		if (!party) {
			throw error(404, 'Party not found');
		}

		const data = Object.fromEntries(await request.formData());
		const inviteId = String(data.inviteId ?? '').trim();
		const name = String(data.name ?? '').trim();
		if (!inviteId || !name) {
			return fail(400, { error: 'Guest name is required.' });
		}

		const invite = getOwnedInviteById(party.id, inviteId, locals.user.id);
		if (!invite) {
			return fail(400, { error: 'Invalid invite selected.' });
		}

		addInviteMember(invite.id, name);
		return { success: true };
	},
	removeMember: async ({ locals, params, request }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const party = getOwnedPartyById(params.partyId, locals.user.id);
		if (!party) {
			throw error(404, 'Party not found');
		}

		const data = Object.fromEntries(await request.formData());
		const inviteId = String(data.inviteId ?? '').trim();
		const memberId = String(data.memberId ?? '').trim();
		if (!inviteId || !memberId) {
			return fail(400, { error: 'Missing member id.' });
		}

		const invite = getOwnedInviteById(party.id, inviteId, locals.user.id);
		if (!invite) {
			return fail(400, { error: 'Invalid invite selected.' });
		}

		removeInviteMember(invite.id, memberId);
		return { success: true };
	}
};
