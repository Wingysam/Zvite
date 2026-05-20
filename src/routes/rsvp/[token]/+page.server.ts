import {
	addInviteMember,
	getInviteWithPartyByToken,
	getInviteMemberSortKey,
	listInvitesByPartyId,
	listInviteMembersByInviteId,
	updateInviteMemberStatusById,
	type InviteStatus
} from '$lib/server/queries';
import { renderMarkdownSafe } from '$lib/server/markdown';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const allowedStatuses: Exclude<InviteStatus, 'NoResponse'>[] = ['Yes', 'Maybe', 'No'];

export const load: PageServerLoad = ({ params }) => {
	const invite = getInviteWithPartyByToken(params.token);
	if (!invite) {
		throw error(404, 'Invitation not found');
	}

	const invites = listInvitesByPartyId(invite.party_id);
	const orderedGroups = invites
		.map((groupInvite) => ({
			inviteId: groupInvite.id,
			members: listInviteMembersByInviteId(groupInvite.id)
		}))
		.sort((a, b) => {
			const firstA = a.members[0]?.name ?? '';
			const firstB = b.members[0]?.name ?? '';
			if (!firstA && !firstB) {
				return a.inviteId.localeCompare(b.inviteId);
			}
			if (!firstA) {
				return 1;
			}
			if (!firstB) {
				return -1;
			}
			const keyA = getInviteMemberSortKey(firstA);
			const keyB = getInviteMemberSortKey(firstB);
			if (keyA === keyB) {
				return firstA.localeCompare(firstB, undefined, { sensitivity: 'base' });
			}
			return keyA.localeCompare(keyB, undefined, { sensitivity: 'base' });
		});

	const otherInvitees = orderedGroups
		.filter((group) => group.inviteId !== invite.id)
		.flatMap((group) => group.members);

	return {
		invite: {
			...invite,
			allow_self_add_names: invite.allow_self_add_names === 1
		},
		renderedDescription: renderMarkdownSafe(invite.party_description),
		members: listInviteMembersByInviteId(invite.id),
		otherInvitees
	};
};

export const actions: Actions = {
	updateStatus: async ({ params, request }) => {
		const invite = getInviteWithPartyByToken(params.token);
		if (!invite) {
			throw error(404, 'Invitation not found');
		}

		const data = Object.fromEntries(await request.formData());
		const memberId = String(data.memberId ?? '').trim();
		const status = String(data.status ?? '').trim() as Exclude<InviteStatus, 'NoResponse'>;

		if (!memberId || !allowedStatuses.includes(status)) {
			return fail(400, { error: 'Invalid RSVP update request.' });
		}

		const updated = updateInviteMemberStatusById(invite.id, memberId, status);
		if (!updated) {
			return fail(400, { error: 'Guest not found for this invitation.' });
		}

		return { success: true, memberId, status };
	},
	addName: async ({ params, request }) => {
		const invite = getInviteWithPartyByToken(params.token);
		if (!invite) {
			throw error(404, 'Invitation not found');
		}
		if (invite.allow_self_add_names !== 1) {
			return fail(403, { error: 'Adding names is not enabled for this invite.' });
		}

		const data = Object.fromEntries(await request.formData());
		const name = String(data.name ?? '').trim();
		if (!name) {
			return fail(400, { error: 'Name is required.' });
		}

		const member = addInviteMember(invite.id, name);
		updateInviteMemberStatusById(invite.id, member.id, 'Yes');
		return { success: true, name };
	}
};
