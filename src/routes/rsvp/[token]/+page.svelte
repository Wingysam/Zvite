<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	const choices = [
		{ value: 'Yes', label: 'Going' },
		{ value: 'Maybe', label: 'Maybe' },
		{ value: 'No', label: 'Not going' }
	];

	const statusLabels: Record<string, { label: string; color: string }> = {
		Yes: { label: 'Going', color: 'going' },
		Maybe: { label: 'Maybe', color: 'maybe' },
		No: { label: 'Not going', color: 'not-going' },
		NoResponse: { label: 'No response', color: 'no-response' }
	};

	let pendingMemberId: string | null = $state(null);

	async function handleSubmit(event: SubmitEvent, memberId: string, status: string) {
		event.preventDefault();
		pendingMemberId = memberId;

		const formData = new FormData();
		formData.append('memberId', memberId);
		formData.append('status', status);

		try {
			const response = await fetch('?/updateStatus', {
				method: 'POST',
				body: formData,
				headers: { 'X-Requested-With': 'XMLHttpRequest' }
			});

			if (response.ok) {
				const memberEl = document.querySelector(`[data-member-id="${memberId}"]`) as HTMLElement;
				if (memberEl) {
					const buttons = memberEl.querySelectorAll('button');
					buttons.forEach((btn) => {
						btn.classList.remove('active', 'btn-going', 'btn-maybe', 'btn-not-going');
						if (btn.dataset.status === status) {
							btn.classList.add('active', `btn-${statusLabels[status].color}`);
						}
					});
				}
			}
		} catch {
			// On error, the page will fall back to normal form submission
		} finally {
			pendingMemberId = null;
		}
	}

	function isPending(memberId: string): boolean {
		return pendingMemberId === memberId;
	}
</script>

<svelte:head>
	<title>{data.invite.party_name}</title>
	<meta property="og:title" content={data.invite.party_name} />
</svelte:head>

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
			<article class="card" data-member-id={member.id}>
				<p><strong>{member.name}</strong></p>
				<div class="button-row">
					{#each choices as choice}
						<form
							class="inline-form"
							method="POST"
							action="?/updateStatus"
							onsubmit={(e) => handleSubmit(e, member.id, choice.value)}
						>
							<input type="hidden" name="memberId" value={member.id} />
							<input type="hidden" name="status" value={choice.value} />
							<button
								type="submit"
								class:active={member.status === choice.value}
								class:btn-going={member.status === choice.value && choice.value === 'Yes'}
								class:btn-maybe={member.status === choice.value && choice.value === 'Maybe'}
								class:btn-not-going={member.status === choice.value && choice.value === 'No'}
								class:loading={isPending(member.id) && member.status !== choice.value}
								data-status={choice.value}
							>
								{choice.label}
							</button>
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
					Anyone else Coming?
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
					<span class="status-label {statusLabels[invitee.status].color}">
						{statusLabels[invitee.status].label}
					</span>
				</p>
			{/each}
		{/if}
	</section>
</div>
