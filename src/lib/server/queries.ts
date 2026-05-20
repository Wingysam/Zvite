import db from '$lib/server/db';

export type OwnerType = 'User' | 'Organization';
export type InviteStatus = 'Yes' | 'Maybe' | 'No' | 'NoResponse';

export interface UserRecord {
	id: string;
	email: string;
	password_hash: string;
}

export interface OrganizationRecord {
	id: string;
	name: string;
}

export interface PartyRecord {
	id: string;
	name: string;
	description: string | null;
}

export interface InviteRecord {
	id: string;
	party_id: string;
	token: string;
	name: string;
	allow_self_add_names: number;
}

export interface PartyInviteRecord extends InviteRecord {
	party_name: string;
	party_description: string | null;
}

export interface InviteMemberRecord {
	id: string;
	invite_id: string;
	name: string;
	status: InviteStatus;
	responded_at: number | null;
}

export interface RecentResponseRecord {
	member_id: string;
	member_name: string;
	status: Exclude<InviteStatus, 'NoResponse'>;
	responded_at: number;
	invite_id: string;
	invite_token: string;
}

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const insertUserStmt = db.prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)');
const getUserByEmailStmt = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?');
const getUserByIdStmt = db.prepare('SELECT id, email, password_hash FROM users WHERE id = ?');
const updateUserPasswordStmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');

const listOrganizationsForUserStmt = db.prepare(`
	SELECT o.id, o.name
	FROM organizations o
	JOIN organization_members om ON om.organization_id = o.id
	WHERE om.user_id = ?
	ORDER BY o.name
`);

const listPartiesForUserStmt = db.prepare(`
	SELECT DISTINCT p.id, p.name, p.description
	FROM parties p
	JOIN party_owners po ON po.party_id = p.id
	LEFT JOIN organization_members om
		ON po.owner_type = 'Organization' AND po.owner_id = om.organization_id
	WHERE (po.owner_type = 'User' AND po.owner_id = ?)
	   OR (po.owner_type = 'Organization' AND om.user_id = ?)
	ORDER BY p.name
`);

const getOwnedPartyByIdStmt = db.prepare(`
	SELECT p.id, p.name, p.description
	FROM parties p
	WHERE p.id = ?
	  AND EXISTS (
	  	SELECT 1
	  	FROM party_owners po
	  	LEFT JOIN organization_members om
	  		ON po.owner_type = 'Organization' AND po.owner_id = om.organization_id
	  	WHERE po.party_id = p.id
	  	  AND (
	  	  	(po.owner_type = 'User' AND po.owner_id = ?)
	  	  	OR (po.owner_type = 'Organization' AND om.user_id = ?)
	  	  )
	  )
	LIMIT 1
`);

const listInvitesForOwnedPartyStmt = db.prepare(`
	SELECT i.id, i.party_id, i.token, i.name, i.allow_self_add_names
	FROM invites i
	JOIN parties p ON p.id = i.party_id
	WHERE p.id = ?
	  AND EXISTS (
	  	SELECT 1
	  	FROM party_owners po
	  	LEFT JOIN organization_members om
	  		ON po.owner_type = 'Organization' AND po.owner_id = om.organization_id
	  	WHERE po.party_id = p.id
	  	  AND (
	  	  	(po.owner_type = 'User' AND po.owner_id = ?)
	  	  	OR (po.owner_type = 'Organization' AND om.user_id = ?)
	  	  )
	  )
	ORDER BY i.rowid ASC
`);

const getOwnedInviteByIdStmt = db.prepare(`
	SELECT i.id, i.party_id, i.token, i.name, i.allow_self_add_names
	FROM invites i
	JOIN parties p ON p.id = i.party_id
	WHERE i.id = ?
	  AND p.id = ?
	  AND EXISTS (
	  	SELECT 1
	  	FROM party_owners po
	  	LEFT JOIN organization_members om
	  		ON po.owner_type = 'Organization' AND po.owner_id = om.organization_id
	  	WHERE po.party_id = p.id
	  	  AND (
	  	  	(po.owner_type = 'User' AND po.owner_id = ?)
	  	  	OR (po.owner_type = 'Organization' AND om.user_id = ?)
	  	  )
	  )
	LIMIT 1
`);

const getLatestInviteForOwnedPartyStmt = db.prepare(`
	SELECT i.id, i.party_id, i.token, i.name, i.allow_self_add_names
	FROM invites i
	JOIN parties p ON p.id = i.party_id
	WHERE p.id = ?
	  AND EXISTS (
	  	SELECT 1
	  	FROM party_owners po
	  	LEFT JOIN organization_members om
	  		ON po.owner_type = 'Organization' AND po.owner_id = om.organization_id
	  	WHERE po.party_id = p.id
	  	  AND (
	  	  	(po.owner_type = 'User' AND po.owner_id = ?)
	  	  	OR (po.owner_type = 'Organization' AND om.user_id = ?)
	  	  )
	  )
	ORDER BY i.rowid DESC
	LIMIT 1
`);

const listInvitesByPartyIdStmt = db.prepare(`
	SELECT id, party_id, token, name, allow_self_add_names
	FROM invites
	WHERE party_id = ?
	ORDER BY id
`);

const insertPartyStmt = db.prepare('INSERT INTO parties (id, name, description) VALUES (?, ?, ?)');
const updatePartyNameStmt = db.prepare('UPDATE parties SET name = ? WHERE id = ?');
const updatePartyDescriptionStmt = db.prepare('UPDATE parties SET description = ? WHERE id = ?');
const insertPartyOwnerStmt = db.prepare(
	'INSERT INTO party_owners (party_id, owner_id, owner_type) VALUES (?, ?, ?)'
);
const insertInviteStmt = db.prepare(
	'INSERT INTO invites (id, party_id, token, name, allow_self_add_names) VALUES (?, ?, ?, ?, ?)'
);

const insertInviteMemberStmt = db.prepare(
	'INSERT INTO invite_members (id, invite_id, name, status, responded_at) VALUES (?, ?, ?, ?, ?)'
);
const deleteInviteMemberStmt = db.prepare('DELETE FROM invite_members WHERE id = ? AND invite_id = ?');
const updateInviteMemberStatusByIdStmt = db.prepare(
	'UPDATE invite_members SET status = ?, responded_at = unixepoch() WHERE id = ? AND invite_id = ?'
);
const updateInviteSelfAddNamesStmt = db.prepare(
	'UPDATE invites SET allow_self_add_names = ? WHERE id = ?'
);
const deleteInviteStmt = db.prepare('DELETE FROM invites WHERE id = ?');

const listInviteMembersByInviteIdStmt = db.prepare(`
	SELECT id, invite_id, name, status, responded_at
	FROM invite_members
	WHERE invite_id = ?
`);

const listRecentResponsesForOwnedPartyStmt = db.prepare(`
	SELECT
		im.id AS member_id,
		im.name AS member_name,
		im.status,
		im.responded_at,
		i.id AS invite_id,
		i.token AS invite_token
	FROM invite_members im
	JOIN invites i ON i.id = im.invite_id
	JOIN parties p ON p.id = i.party_id
	WHERE p.id = ?
	  AND im.status IN ('Yes', 'Maybe', 'No')
	  AND im.responded_at IS NOT NULL
	  AND EXISTS (
	  	SELECT 1
	  	FROM party_owners po
	  	LEFT JOIN organization_members om
	  		ON po.owner_type = 'Organization' AND po.owner_id = om.organization_id
	  	WHERE po.party_id = p.id
	  	  AND (
	  	  	(po.owner_type = 'User' AND po.owner_id = ?)
	  	  	OR (po.owner_type = 'Organization' AND om.user_id = ?)
	  	  )
	  )
	ORDER BY im.responded_at DESC
	LIMIT ?
`);

const getInviteWithPartyByTokenStmt = db.prepare(`
	SELECT
		i.id,
		i.party_id,
		i.token,
		i.name,
		i.allow_self_add_names,
		p.name AS party_name,
		p.description AS party_description
	FROM invites i
	JOIN parties p ON i.party_id = p.id
	WHERE i.token = ?
	LIMIT 1
`);

const createPartyTransaction = db.transaction(
	({
		partyId,
		name,
		description,
		ownerId,
		ownerType,
		inviteId,
		token,
		inviteName,
		allowSelfAddNames
	}: {
		partyId: string;
		name: string;
		description: string | null;
		ownerId: string;
		ownerType: OwnerType;
		inviteId: string;
		token: string;
		inviteName: string;
		allowSelfAddNames: number;
	}) => {
		insertPartyStmt.run(partyId, name, description);
		insertPartyOwnerStmt.run(partyId, ownerId, ownerType);
		insertInviteStmt.run(inviteId, partyId, token, inviteName, allowSelfAddNames);
	}
);

function createId(): string {
	return crypto.randomUUID();
}

function generateToken(length = 16): string {
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	let token = '';
	for (const value of bytes) {
		token += alphabet[value % alphabet.length];
	}
	return token;
}

export function getInviteMemberSortKey(name: string): string {
	const normalized = name.trim().replace(/\s+/g, ' ');
	if (!normalized) {
		return '';
	}

	const pieces = normalized.split(' ');
	if (pieces.length === 1) {
		return pieces[0].toLowerCase();
	}

	const last = pieces[pieces.length - 1]?.toLowerCase() ?? '';
	const firsts = pieces.slice(0, -1).join(' ').toLowerCase();
	return `${last} ${firsts}`;
}

export function sortInviteMembers(members: InviteMemberRecord[]): InviteMemberRecord[] {
	return [...members].sort((a, b) => {
		const keyA = getInviteMemberSortKey(a.name);
		const keyB = getInviteMemberSortKey(b.name);
		if (keyA === keyB) {
			return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
		}
		return keyA.localeCompare(keyB, undefined, { sensitivity: 'base' });
	});
}

function createInviteWithRetry(input: {
	partyId: string;
	allowSelfAddNames: boolean;
}): InviteRecord {
	for (let attempt = 0; attempt < 8; attempt += 1) {
		const invite: InviteRecord = {
			id: createId(),
			party_id: input.partyId,
			token: generateToken(16),
			name: 'Invite',
			allow_self_add_names: input.allowSelfAddNames ? 1 : 0
		};

		try {
			insertInviteStmt.run(
				invite.id,
				invite.party_id,
				invite.token,
				invite.name,
				invite.allow_self_add_names
			);
			return invite;
		} catch (err) {
			if (String(err).includes('UNIQUE constraint failed: invites.token')) {
				continue;
			}
			throw err;
		}
	}

	throw new Error('Unable to generate a unique invitation token.');
}

export function createUser(email: string, passwordHash: string): UserRecord {
	const user: UserRecord = {
		id: createId(),
		email,
		password_hash: passwordHash
	};
	insertUserStmt.run(user.id, user.email, user.password_hash);
	return user;
}

export function getUserByEmail(email: string): UserRecord | null {
	return (getUserByEmailStmt.get(email) as UserRecord | null) ?? null;
}

export function getUserById(id: string): UserRecord | null {
	return (getUserByIdStmt.get(id) as UserRecord | null) ?? null;
}

export function listOrganizationsForUser(userId: string): OrganizationRecord[] {
	return listOrganizationsForUserStmt.all(userId) as OrganizationRecord[];
}

export function listPartiesForUser(userId: string): PartyRecord[] {
	return listPartiesForUserStmt.all(userId, userId) as PartyRecord[];
}

export function getOwnedPartyById(partyId: string, userId: string): PartyRecord | null {
	return (getOwnedPartyByIdStmt.get(partyId, userId, userId) as PartyRecord | null) ?? null;
}

export function listInvitesForOwnedParty(partyId: string, userId: string): InviteRecord[] {
	return listInvitesForOwnedPartyStmt.all(partyId, userId, userId) as InviteRecord[];
}

export function listInvitesByPartyId(partyId: string): InviteRecord[] {
	return listInvitesByPartyIdStmt.all(partyId) as InviteRecord[];
}

export function getOwnedInviteById(
	partyId: string,
	inviteId: string,
	userId: string
): InviteRecord | null {
	return (getOwnedInviteByIdStmt.get(inviteId, partyId, userId, userId) as InviteRecord | null) ?? null;
}

export function createInviteForOwnedParty(input: {
	partyId: string;
	userId: string;
	allowSelfAddNames: boolean;
}): InviteRecord {
	const ownedParty = getOwnedPartyById(input.partyId, input.userId);
	if (!ownedParty) {
		throw new Error('Party not found for this owner.');
	}

	return createInviteWithRetry({
		partyId: input.partyId,
		allowSelfAddNames: input.allowSelfAddNames
	});
}

export function getLatestInviteForOwnedParty(partyId: string, userId: string): InviteRecord | null {
	return (getLatestInviteForOwnedPartyStmt.get(partyId, userId, userId) as InviteRecord | null) ?? null;
}

export function createPartyWithInvite(input: {
	name: string;
	description: string | null;
	ownerId: string;
	ownerType: OwnerType;
}): { id: string; name: string; description: string | null; invite_id: string; token: string } {
	const partyId = createId();

	for (let attempt = 0; attempt < 8; attempt += 1) {
		const inviteId = createId();
		const token = generateToken(16);

		try {
			createPartyTransaction({
				partyId,
				name: input.name,
				description: input.description,
				ownerId: input.ownerId,
				ownerType: input.ownerType,
				inviteId,
				token,
				inviteName: 'Invite',
				allowSelfAddNames: 0
			});

			return {
				id: partyId,
				name: input.name,
				description: input.description,
				invite_id: inviteId,
				token
			};
		} catch (err) {
			if (String(err).includes('UNIQUE constraint failed: invites.token')) {
				continue;
			}
			throw err;
		}
	}

	throw new Error('Unable to generate a unique invitation token.');
}

export function updateOwnedPartyDescription(
	partyId: string,
	userId: string,
	description: string | null
): boolean {
	const ownedParty = getOwnedPartyById(partyId, userId);
	if (!ownedParty) {
		return false;
	}

	const result = updatePartyDescriptionStmt.run(description, ownedParty.id);
	return result.changes > 0;
}

export function updateOwnedPartyName(partyId: string, userId: string, name: string): boolean {
	const ownedParty = getOwnedPartyById(partyId, userId);
	if (!ownedParty) {
		return false;
	}

	const result = updatePartyNameStmt.run(name, ownedParty.id);
	return result.changes > 0;
}

export function listInviteMembersByInviteId(inviteId: string): InviteMemberRecord[] {
	const members = listInviteMembersByInviteIdStmt.all(inviteId) as InviteMemberRecord[];
	return sortInviteMembers(members);
}

export function addInviteMember(inviteId: string, name: string, status: InviteStatus = 'NoResponse'): InviteMemberRecord {
	const member: InviteMemberRecord = {
		id: createId(),
		invite_id: inviteId,
		name,
		status,
		responded_at: null
	};
	insertInviteMemberStmt.run(member.id, member.invite_id, member.name, member.status, member.responded_at);
	return member;
}

export function addRespondedInviteMember(
	inviteId: string,
	name: string,
	status: Exclude<InviteStatus, 'NoResponse'>
): InviteMemberRecord {
	const member: InviteMemberRecord = {
		id: createId(),
		invite_id: inviteId,
		name,
		status,
		responded_at: Math.floor(Date.now() / 1000)
	};
	insertInviteMemberStmt.run(member.id, member.invite_id, member.name, member.status, member.responded_at);
	return member;
}

export function removeInviteMember(inviteId: string, memberId: string): boolean {
	const result = deleteInviteMemberStmt.run(memberId, inviteId);
	return result.changes > 0;
}

export function updateOwnedInviteSelfAddNames(
	partyId: string,
	inviteId: string,
	userId: string,
	allowSelfAddNames: boolean
): boolean {
	const invite = getOwnedInviteById(partyId, inviteId, userId);
	if (!invite) {
		return false;
	}

	const result = updateInviteSelfAddNamesStmt.run(allowSelfAddNames ? 1 : 0, invite.id);
	return result.changes > 0;
}

export function removeOwnedInvite(partyId: string, inviteId: string, userId: string): boolean {
	const invite = getOwnedInviteById(partyId, inviteId, userId);
	if (!invite) {
		return false;
	}

	const result = deleteInviteStmt.run(invite.id);
	return result.changes > 0;
}

export function updateInviteMemberStatusById(
	inviteId: string,
	memberId: string,
	status: Exclude<InviteStatus, 'NoResponse'>
): boolean {
	const result = updateInviteMemberStatusByIdStmt.run(status, memberId, inviteId);
	return result.changes > 0;
}

export function listRecentResponsesForOwnedParty(
	partyId: string,
	userId: string,
	limit = 20
): RecentResponseRecord[] {
	return listRecentResponsesForOwnedPartyStmt.all(partyId, userId, userId, limit) as RecentResponseRecord[];
}

export function getInviteWithPartyByToken(token: string): PartyInviteRecord | null {
	return (getInviteWithPartyByTokenStmt.get(token) as PartyInviteRecord | null) ?? null;
}

export function updateUserPassword(userId: string, passwordHash: string): boolean {
	const result = updateUserPasswordStmt.run(passwordHash, userId);
	return result.changes > 0;
}
