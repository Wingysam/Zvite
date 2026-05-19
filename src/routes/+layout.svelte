<script lang="ts">
    import "../app.css";
    import favicon from "$lib/assets/favicon.svg";
    import type { LayoutData } from "./$types";

    let { children, data } = $props<{
        children: () => unknown;
        data: LayoutData;
    }>();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
    {#if data.showChrome}
        <header class="topbar">
            <nav class="nav">
                <a class="brand" href="/">Zvite</a>
                <div class="nav-links">
                    {#if data.user}
                        <a href="/dashboard">Dashboard</a>
                        <a href="/logout">Log out</a>
                    {:else}
                        <a href="/login">Login</a>
                        {#if !data.signupsDisabled}
                            <a href="/register">Register</a>
                        {/if}
                    {/if}
                </div>
            </nav>
        </header>
    {/if}
    <main>{@render children()}</main>
</div>
