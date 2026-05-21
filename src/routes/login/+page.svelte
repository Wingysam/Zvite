<script lang="ts">
  import type { PageData } from "./$types";

  let { data, form } = $props<{ data: PageData; form: any }>();
</script>

<svelte:head>
  <title>Login - Zvite</title>
</svelte:head>

<section class="card">
  <h1>Login</h1>
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}
  {#if data.signupsDisabled}
    <p class="muted">Sign-ups are currently disabled.</p>
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
