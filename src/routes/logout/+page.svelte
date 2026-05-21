<script lang="ts">
  import type { PageData } from "./$types";

  let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
  <title>Log out - Zvite</title>
</svelte:head>

<section class="card">
  <h1>Log out</h1>
  <p>Are you sure you want to log out?</p>
  <form method="POST">
    <button type="submit">Log out</button>
  </form>
</section>
