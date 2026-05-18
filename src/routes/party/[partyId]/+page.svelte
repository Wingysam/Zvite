<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();
</script>

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
	<form method="POST" action="?/updateName">
		<label>
			Name
			<input name="name" required value={data.party.name} />
		</label>
		<button type="submit">Update name</button>
	</form>
</section>

<section class="card">
	<h2>Event description</h2>
	<form method="POST" action="?/updateDescription">
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
	<form method="POST" action="?/addInvite">
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
		{#each data.invites as invite, index}
			<article class="card">
				<h3>Invite Link #{index + 1}</h3>
				<p>
					<strong>Share link:</strong>
					<a href={invite.shareLink}>{invite.shareLink}</a>
				</p>
				<p class="muted">
					Self-add names: {invite.allow_self_add_names ? 'Allowed' : 'Not allowed'}
				</p>
				<form method="POST" action="?/updateInvite">
					<input type="hidden" name="inviteId" value={invite.id} />
					<label class="checkline">
						<input
							type="checkbox"
							name="allowSelfAddNames"
							checked={Boolean(invite.allow_self_add_names)}
							onchange={(event) => event.currentTarget.form?.requestSubmit()}
						/>
						Allow family to add their own names.
					</label>
				</form>
				<form method="POST" action="?/removeInvite">
					<input type="hidden" name="inviteId" value={invite.id} />
					<button class="secondary" type="submit">Remove group</button>
				</form>

				<form method="POST" action="?/addMember">
					<input type="hidden" name="inviteId" value={invite.id} />
					<label>
						Add guest name
						<input name="name" required />
					</label>
					<button type="submit">Add guest</button>
				</form>

				{#if invite.members.length === 0}
					<p class="muted">No names added for this invite.</p>
				{:else}
					{#each invite.members as member}
						<article class="card">
							<p>
								<strong>{member.name}</strong>
								<span class="muted">({member.status})</span>
							</p>
							<form class="inline-form" method="POST" action="?/removeMember">
								<input type="hidden" name="inviteId" value={invite.id} />
								<input type="hidden" name="memberId" value={member.id} />
								<button class="secondary" type="submit">Remove</button>
							</form>
						</article>
					{/each}
				{/if}
			</article>
		{/each}
	{/if}
</section>
