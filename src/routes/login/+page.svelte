<script lang="ts">
	import type { ActionData } from './$types';

	let { form } = $props<{ form: ActionData }>();
</script>

<section class="card">
	<h1>Login</h1>
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
			<input name="password" type="password" required />
		</label>
		<button type="submit">Sign in</button>
	</form>
</section>
