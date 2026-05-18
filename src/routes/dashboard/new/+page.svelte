<script lang="ts">
	import type { ActionData, PageData } from './$types';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();
</script>

<section class="card">
	<h1>Create party</h1>
	{#if form?.error}
		<p class="error">{form.error}</p>
	{/if}
	<form method="POST">
		<label>
			Party name
			<input name="name" required />
		</label>
		<label>
			Description
			<textarea name="description" rows="3"></textarea>
		</label>
		<label>
			Owner type
			<select name="ownerType">
				<option value="User">Myself</option>
				<option value="Organization">Organization</option>
			</select>
		</label>
		<label>
			Owner
			<select name="ownerId">
				<option value="">Myself</option>
				{#each data.organizations as org}
					<option value={org.id}>Organization: {org.name}</option>
				{/each}
			</select>
		</label>
		<button type="submit">Create party</button>
	</form>
	<p class="muted">A baseline invite token is created automatically when the party is created.</p>
</section>
