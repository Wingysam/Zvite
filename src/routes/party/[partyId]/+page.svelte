<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

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
	<h2>Create family invite link</h2>
	{#if form?.error}
		<p class="error">{form.error}</p>
	{/if}
	<form method="POST" action="?/addInvite" use:enhance>
		<label class="checkline">
			<input
				type="checkbox"
				name="allowSelfAddNames"
				checked={Boolean(data.defaultAllowSelfAddNames)}
			/>
			Allow this family to add their own names on the RSVP page.
		</label>
		<button type="submit">Create invite</button>
	</form>
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
			<form method="POST" action="?/addMember" class="compact-form" use:enhance>
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
					<input name="name" required placeholder="Enter guest name..." />
				</label>
				<button type="submit">Add</button>
			</form>
		</div>
	{/if}
</section>
