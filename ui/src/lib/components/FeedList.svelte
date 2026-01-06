<script lang="ts">
  import type { ShareItem } from '$lib/types';
  import { sharesStore, settingsStore } from '$lib/stores';
  import ShareCard from './ShareCard.svelte';
  import { createEventDispatcher } from 'svelte';

  export let onDelete: ((id: string) => void) | undefined = undefined;

  const dispatch = createEventDispatcher();

  // Subscribe to store values
  $: shares = $sharesStore.shares;
  $: loading = $sharesStore.loading;
  $: error = $sharesStore.error;
  $: isEmpty = $sharesStore.isEmpty;
  $: highContrast = $settingsStore.highContrast;

  async function handleRefresh(): Promise<void> {
    await sharesStore.refresh();
  }

  function handleDelete(id: string): void {
    if (onDelete) {
      onDelete(id);
    } else {
      sharesStore.deleteShare(id);
    }
  }
</script>

<div class="feed-list" class:high-contrast={highContrast}>
  {#if loading}
    <div class="loading-state" role="status" aria-live="polite">
      <div class="spinner" aria-hidden="true"></div>
      <p>Loading shares...</p>
    </div>
  {:else if error}
    <div class="error-state" role="alert">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p>{error}</p>
      <button type="button" on:click={handleRefresh} class="btn btn-primary">
        Try Again
      </button>
    </div>
  {:else if isEmpty}
    <div class="empty-state">
      <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <h2>No shares yet</h2>
      <p>Shares from your family and friends will appear here.</p>
      <p class="hint">Use the browser extension to share interesting links.</p>
    </div>
  {:else}
    <ul class="shares-list" role="feed" aria-label="Shared links">
      {#each shares as share (share.id)}
        <li>
          <ShareCard {share} onDelete={handleDelete} />
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .feed-list {
    --bg-color: #f9fafb;
    --text-color: #1f2937;
    --text-muted: #6b7280;
    --primary-color: #6366f1;
    --error-color: #ef4444;

    width: 100%;
    min-height: 400px;
  }

  .feed-list.high-contrast {
    --bg-color: #ffffff;
    --text-color: #000000;
    --text-muted: #1f2937;
  }

  .loading-state,
  .error-state,
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 48px 24px;
    min-height: 300px;
    color: var(--text-color);
  }

  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e5e7eb;
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-state {
    color: var(--error-color);
  }

  .error-state svg {
    margin-bottom: 16px;
    stroke: var(--error-color);
  }

  .error-state p {
    margin: 0 0 16px 0;
    font-size: 18px;
  }

  .empty-state svg {
    margin-bottom: 24px;
    stroke: var(--text-muted);
  }

  .empty-state h2 {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
  }

  .empty-state p {
    margin: 0 0 8px 0;
    font-size: 18px;
    color: var(--text-muted);
  }

  .empty-state .hint {
    font-size: 16px;
    color: var(--text-muted);
    opacity: 0.8;
  }

  .shares-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .shares-list li {
    margin: 0;
    padding: 0;
  }
</style>
