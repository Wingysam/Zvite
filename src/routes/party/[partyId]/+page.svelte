<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	let allowSelfAddNames = $state(false);

	$effect(() => {
		allowSelfAddNames = Boolean(data.defaultAllowSelfAddNames);
	});

	$effect(() => {
		if (form?.allowSelfAddNames !== undefined) {
			allowSelfAddNames = Boolean(form.allowSelfAddNames);
		}
	});

	const focusGuestName: SubmitFunction = () => {
		return async ({ update }) => {
			await update({ reset: false });
			const nameInput = document.querySelector('.add-guest-section input[name="name"]') as HTMLInputElement;
			if (nameInput) {
				nameInput.value = '';
				nameInput.focus();
			}
		};
	};

	const preserveCreateInviteCheckboxState: SubmitFunction = ({ formData }) => {
		const guestNameInput = document.querySelector('.add-guest-section input[name="name"]') as HTMLInputElement;
		if (guestNameInput?.value) {
			formData.set('name', guestNameInput.value);
			guestNameInput.value = '';
		}

		return async ({ update }) => {
			await update({ reset: false });
			const nameInput = document.querySelector('.add-guest-section input[name="name"]') as HTMLInputElement;
			if (nameInput) {
				nameInput.focus();
			}
		};
	};

	function countStatus(members: { status: string }[], status: string): number {
		return members.filter((m) => m.status === status).length;
	}

	function statusClass(status: string): string {
		switch (status) {
			case 'Yes':
				return 'status-yes';
			case 'Maybe':
				return 'status-maybe';
			case 'No':
				return 'status-no';
			default:
				return 'status-pending';
		}
	}

	const statusLabels: Record<string, { label: string; color: string }> = {
		Yes: { label: 'Going', color: 'going' },
		Maybe: { label: 'Maybe', color: 'maybe' },
		No: { label: 'Not going', color: 'not-going' },
		NoResponse: { label: 'Pending', color: 'no-response' }
	};

	const relativeTimeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'always' });

	function formatTimeAgo(timestamp: number): string {
		const diffSeconds = Math.round(timestamp - Date.now() / 1000);
		const absSeconds = Math.abs(diffSeconds);

		if (absSeconds >= 60 * 60 * 24 * 365) {
			return relativeTimeFormat.format(Math.round(diffSeconds / (60 * 60 * 24 * 365)), 'year');
		}
		if (absSeconds >= 60 * 60 * 24 * 30) {
			return relativeTimeFormat.format(Math.round(diffSeconds / (60 * 60 * 24 * 30)), 'month');
		}
		if (absSeconds >= 60 * 60 * 24) {
			return relativeTimeFormat.format(Math.round(diffSeconds / (60 * 60 * 24)), 'day');
		}
		if (absSeconds >= 60 * 60) {
			return relativeTimeFormat.format(Math.round(diffSeconds / (60 * 60)), 'hour');
		}
		if (absSeconds >= 60) {
			return relativeTimeFormat.format(Math.round(diffSeconds / 60), 'minute');
		}
		return relativeTimeFormat.format(diffSeconds, 'second');
	}
</script>

<svelte:head>
	<title>{data.party.name}</title>
</svelte:head>

<section class="card">
	<h1>{data.party.name}</h1>
	{#if data.party.description}
		<div class="markdown">{@html data.renderedDescription}</div>
	{:else}
		<p class="muted">No event description yet.</p>
	{/if}
</section>

<section class="card">
	<h2>Event name</h2>
	<form method="POST" action="?/updateName" use:enhance>
		<label>
			Name
			<input name="name" required value={data.party.name} />
		</label>
		<button type="submit">Update name</button>
	</form>
</section>

<section class="card">
	<h2>Event description</h2>
	<form method="POST" action="?/updateDescription" use:enhance>
		<label>
			Description (Markdown + safe HTML/CSS)
			<textarea name="description" rows="7">{data.party.description ?? ''}</textarea>
		</label>
		<button type="submit">Update description</button>
	</form>
</section>

<section class="card">
	<h2>Response metrics</h2>
	<p>
		Yes: {data.counts.Yes} | Maybe: {data.counts.Maybe} | No: {data.counts.No} | No response:
		{data.counts.NoResponse}
	</p>
</section>

<section class="card">
	<h2>Recent responses</h2>
	{#if data.recentResponses.length === 0}
		<p class="muted">No responses yet.</p>
	{:else}
		<ul>
			{#each data.recentResponses as response}
				<li>
					<strong>{response.member_name}</strong>
					<span class="status-label {statusLabels[response.status].color}">
						{statusLabels[response.status].label}
					</span>
					<em class="muted">{formatTimeAgo(response.responded_at)}</em>
					(
					<a
						href={`/rsvp/${response.invite_token}`}
						aria-label={`View RSVP details for ${response.member_name}`}
					>
						{response.invite_token}
					</a>)
				</li>
			{/each}
		</ul>
	{/if}
</section>

<section class="card">
	<h2>Invites</h2>
	{#if data.invites.length === 0}
		<p class="muted">No invites yet.</p>
	{:else}
		<div class="invites-table-wrapper">
			<table class="invites-table">
				<thead>
					<tr>
						<th>#</th>
						<th>Link</th>
						<th>Guests</th>
						<th>Responses</th>
						<th>Self-add</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.invites as invite, index}
						<tr>
							<td class="num">{index + 1}</td>
							<td class="link-cell">
								<a href={invite.shareLink} title={invite.shareLink}>{invite.token}</a>
							</td>
							<td class="num">{invite.members.length}</td>
							<td class="responses">
								<span class="resp-yes">{countStatus(invite.members, 'Yes')}</span>
								<span class="resp-maybe">{countStatus(invite.members, 'Maybe')}</span>
								<span class="resp-no">{countStatus(invite.members, 'No')}</span>
								<span class="resp-pending">{countStatus(invite.members, 'NoResponse')}</span>
							</td>
							<td>
								<form method="POST" action="?/updateInvite" class="inline-form-check" use:enhance>
									<input type="hidden" name="inviteId" value={invite.id} />
									<label class="checkline">
										<input
											type="checkbox"
											name="allowSelfAddNames"
											checked={Boolean(invite.allow_self_add_names)}
											onchange={(event) => event.currentTarget.form?.requestSubmit()}
										/>
									</label>
								</form>
							</td>
							<td class="actions">
								<form method="POST" action="?/removeInvite" class="inline-form" use:enhance>
									<input type="hidden" name="inviteId" value={invite.id} />
									<button class="btn-icon" type="submit" title="Remove invite">×</button>
								</form>
							</td>
						</tr>
						{#if invite.members.length > 0}
							<tr class="members-row">
								<td colspan="6">
									<div class="members-list">
										{#each invite.members as member}
											<div class="member-item">
												<span class="member-name">{member.name}</span>
												<span class="status-badge {statusClass(member.status)}">{member.status}</span>
												<form method="POST" action="?/removeMember" class="inline-form" use:enhance>
													<input type="hidden" name="inviteId" value={invite.id} />
													<input type="hidden" name="memberId" value={member.id} />
													<button class="btn-icon" type="submit" title="Remove member">×</button>
												</form>
											</div>
										{/each}
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>

		<div class="add-guest-section">
			<form method="POST" action="?/addMember" class="compact-form" use:enhance={focusGuestName}>
				<label>
					Invite
					<select name="inviteId" required>
						{#each data.invites as invite}
							<option value={invite.id} selected={invite.id === data.invites.at(-1)?.id}>
								#{data.invites.indexOf(invite) + 1} ({invite.token})
							</option>
						{/each}
					</select>
				</label>
				<label>
					Guest name
					<input
						name="name"
						required
						placeholder="Enter guest name..."
						onkeydown={(e) => {
							if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
								e.preventDefault();
								const createForm = document.querySelector('.create-invite-section form') as HTMLFormElement;
								if (createForm) {
									createForm.requestSubmit();
								}
							}
						}}
					/>
				</label>
				<button type="submit">Add</button>
			</form>
		</div>
	{/if}

	<div class="create-invite-section">
		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}
	<form method="POST" action="?/addInvite" use:enhance={preserveCreateInviteCheckboxState}>
		<label class="checkline">
				<input
					type="checkbox"
					name="allowSelfAddNames"
					value="on"
					bind:checked={allowSelfAddNames}
				/>
				Allow this family to add their own names on the RSVP page.
			</label>
			<button type="submit">Create invite</button>
		</form>
	</div>
</section>
