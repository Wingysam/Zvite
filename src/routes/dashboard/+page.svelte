<script lang="ts">
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();
</script>

<section class="card">
	<h1>Your parties</h1>
	<p><a href="/dashboard/new">Create new party</a></p>

	{#if data.parties.length === 0}
		<p class="muted">No parties yet.</p>
	{:else}
		{#each data.parties as party}
			<article class="card">
				<h2>{party.name}</h2>
				{#if party.description}
					<p>{party.description}</p>
				{/if}
				<p><a href={`/party/${party.id}`}>Manage party</a></p>
			</article>
		{/each}
	{/if}
</section>
