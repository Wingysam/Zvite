<script lang="ts">
	import type { ActionData } from './$types';

	let { form } = $props<{ form: ActionData }>();
</script>

<svelte:head>
	<title>Create account - Zvite</title>
</svelte:head>

<section class="card">
	<h1>Create account</h1>
	{#if form?.error}
		<p class="error">{form.error}</p>
	{/if}
	<form method="POST">
		<label>
			Email
			<input name="email" type="email" required />
		</label>
		<label>
			Password
			<input name="password" type="password" minlength="8" required />
		</label>
		<button type="submit">Register</button>
	</form>
</section>
