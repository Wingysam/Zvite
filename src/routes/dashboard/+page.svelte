<script lang="ts">
  import type { PageData } from "./$types";
  import { enhance } from "$app/forms";

  let { data, form } = $props<{
    data: PageData;
    form: { error?: string; success?: boolean; message?: string };
  }>();
</script>

<svelte:head>
  <title>Dashboard - Zvite</title>
</svelte:head>

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

<section class="card">
  <h2>Change password</h2>
  {#if form?.error}
    <p class="error">{form.error}</p>
  {:else if form?.message}
    <p style="color: #16a34a; font-weight: 600;">{form.message}</p>
  {/if}
  <form method="POST" action="?/changePassword" use:enhance>
    <label>
      Current password
      <input type="password" name="currentPassword" required />
    </label>
    <label>
      New password
      <input type="password" name="newPassword" required minlength="8" />
    </label>
    <label>
      Confirm new password
      <input type="password" name="confirmPassword" required minlength="8" />
    </label>
    <button type="submit">Update password</button>
  </form>
</section>
