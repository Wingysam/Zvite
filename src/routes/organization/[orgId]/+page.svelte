<script lang="ts">
  import type { ActionData, PageData } from "./$types";
  import { enhance } from "$app/forms";

  let { data, form } = $props<{ data: PageData; form: ActionData }>();
</script>

<svelte:head>
  <title>{data.organization.name} - Zvite</title>
</svelte:head>

<section class="card">
  <h1>{data.organization.name}</h1>
</section>

<section class="card">
  <h2>Members</h2>

  {#if data.members.length === 0}
    <p class="muted">No members.</p>
  {:else}
    <ul>
      {#each data.members as member}
        <li>
          {member.email}
          {#if member.id === data.currentUserId}
            <span class="muted">(you)</span>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<section class="card">
  <h2>Add member</h2>
  {#if form?.addMemberError}
    <p class="error">{form.addMemberError}</p>
  {:else if form?.success && form.addedEmail}
    <p style="color: #16a34a; font-weight: 600;">
      Added {form.addedEmail} to the group.
    </p>
  {/if}
  <form method="POST" action="?/addMember" use:enhance>
    <label>
      Email address of the user to add
      <input
        type="email"
        name="email"
        required
        placeholder="user@example.com"
      />
    </label>
    <button type="submit">Add member</button>
  </form>
</section>

<section class="card">
  <h2>Leave group</h2>
  <p class="muted">
    Remove yourself from this group. You will no longer be able to access it.
  </p>
  {#if form?.leaveError}
    <p class="error">{form.leaveError}</p>
  {/if}
  <form method="POST" action="?/leave" use:enhance>
    <button type="submit" class="btn-danger">Leave group</button>
  </form>
</section>
