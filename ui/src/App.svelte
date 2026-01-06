<script lang="ts">
  import { onMount } from 'svelte';
  import { FeedList, AccessibilityPanel, ShareForm, ProfileButton, ProfileDialog } from '$lib/components';
  import { sharesStore, settingsStore, profilesStore, initSharesStore } from '$lib/stores';
  import '@holochain-open-dev/profiles/dist/elements/profiles-context.js';

  let showSettings = false;
  let showShareForm = false;
  let showProfileDialog = false;

  // Subscribe to settings store values
  $: fontSize = $settingsStore.fontSize;
  $: highContrast = $settingsStore.highContrast;
  $: reducedMotion = $settingsStore.reducedMotion;

  onMount(() => {
    initSharesStore();
  });

  async function handleRefresh(): Promise<void> {
    await sharesStore.refresh();
  }

  function handleShareCreated(): void {
    showShareForm = false;
  }
</script>

{#if $profilesStore}
<profiles-context store={$profilesStore}>
<div
  class="app-container"
  class:high-contrast={highContrast}
  class:reduced-motion={reducedMotion}
  style="--base-font-size: {fontSize}px"
>
  <div class="page" class:high-contrast={highContrast}>
    <header class="app-header">
      <div class="header-content">
        <h1>ShareFeed</h1>
        <p class="tagline">Links from your family and friends</p>
      </div>
      <div class="header-actions">
        <ProfileButton on:click={() => showProfileDialog = true} />
        <button
          type="button"
          class="icon-button share-button"
          on:click={() => showShareForm = true}
          aria-label="Share a link"
          title="Share"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          type="button"
          class="icon-button"
          on:click={handleRefresh}
          aria-label="Refresh feed"
          title="Refresh"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
        </button>
        <button
          type="button"
          class="icon-button"
          on:click={() => showSettings = true}
          aria-label="Open display settings"
          title="Settings"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>

    <main class="main-content">
      <FeedList />
    </main>

    <AccessibilityPanel bind:open={showSettings} on:close={() => showSettings = false} />
    <ShareForm bind:open={showShareForm} on:created={handleShareCreated} on:cancel={() => showShareForm = false} />
    <ProfileDialog bind:open={showProfileDialog} on:close={() => showProfileDialog = false} />
  </div>
</div>
</profiles-context>
{:else}
<div class="loading-container">
  <div class="spinner"></div>
  <p>Connecting to Holochain...</p>
</div>
{/if}

<style>
  .app-container {
    min-height: 100vh;
    font-size: var(--base-font-size, 18px);
  }

  .app-container.high-contrast {
    background: #ffffff;
  }

  .app-container.reduced-motion :global(*) {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .page {
    --header-bg: #ffffff;
    --header-border: #e5e7eb;
    --text-primary: #1f2937;
    --text-secondary: #6b7280;
    --primary-color: #6366f1;

    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .page.high-contrast {
    --header-bg: #ffffff;
    --header-border: #000000;
    --text-primary: #000000;
    --text-secondary: #1f2937;
  }

  .app-header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    background: var(--header-bg);
    border-bottom: 2px solid var(--header-border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .header-content h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: var(--primary-color);
  }

  .tagline {
    margin: 4px 0 0 0;
    font-size: 16px;
    color: var(--text-secondary);
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    padding: 0;
    background: none;
    border: 2px solid var(--header-border);
    border-radius: 12px;
    cursor: pointer;
    color: var(--text-secondary);
    transition: background 0.2s, border-color 0.2s, color 0.2s;
  }

  .icon-button:hover {
    background: #f9fafb;
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .icon-button:focus-visible {
    outline: 3px solid var(--primary-color);
    outline-offset: 2px;
  }

  .icon-button:active {
    transform: scale(0.95);
  }

  .icon-button.share-button {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }

  .icon-button.share-button:hover {
    background: #4f46e5;
    border-color: #4f46e5;
  }

  .main-content {
    flex: 1;
    padding: 24px;
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .app-header {
      padding: 16px 20px;
    }

    .header-content h1 {
      font-size: 24px;
    }

    .tagline {
      font-size: 14px;
    }

    .main-content {
      padding: 16px;
    }
  }

  /* Large screens */
  @media (min-width: 1024px) {
    .main-content {
      padding: 32px;
    }
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    color: #6b7280;
  }

  .loading-container .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e5e7eb;
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .loading-container p {
    margin: 0;
    font-size: 16px;
  }
</style>
