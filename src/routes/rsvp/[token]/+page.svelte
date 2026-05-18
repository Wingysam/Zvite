<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	const choices = ['Yes', 'Maybe', 'No'] as const;
</script>

<div class="rsvp-page">
	<section class="card">
		<h1>{data.invite.party_name}</h1>
		{#if data.invite.party_description}
			<div class="markdown">{@html data.renderedDescription}</div>
		{/if}
	</section>

	<p class="muted rsvp-instruction">Select a response for each invited guest name.</p>

	{#if form?.error}
		<p class="error">{form.error}</p>
	{/if}

	{#if data.members.length === 0}
		<p class="muted">No guest names are available for this invitation yet.</p>
	{:else}
		{#each data.members as member}
			<article class="card">
				<p><strong>{member.name}</strong></p>
				<div class="button-row">
					{#each choices as choice}
						<form class="inline-form" method="POST" action="?/updateStatus">
							<input type="hidden" name="memberId" value={member.id} />
							<input type="hidden" name="status" value={choice} />
							<button class:active={member.status === choice} type="submit">{choice}</button>
						</form>
					{/each}
				</div>
			</article>
		{/each}
	{/if}

	{#if data.invite.allow_self_add_names}
		<section class="card">
			<form method="POST" action="?/addName">
				<label>
					Anyone else coming?
					<input name="name" placeholder="Add a name" required />
				</label>
				<button type="submit">Add person</button>
			</form>
		</section>
	{/if}

	<section class="card">
		<h2>Other invitees</h2>
		{#if data.otherInvitees.length === 0}
			<p class="muted">No other invitees yet.</p>
		{:else}
			{#each data.otherInvitees as invitee}
				<p>
					<strong>{invitee.name}</strong>
					<span class="muted">({invitee.status})</span>
				</p>
			{/each}
		{/if}
	</section>
</div>
