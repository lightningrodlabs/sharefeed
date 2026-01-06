<script lang="ts">
  import type { ShareItem } from '$lib/types';
  import { settingsStore, profilesStore } from '$lib/stores';
  import { decodeHashFromBase64 } from '@holochain/client';
  import '@holochain-open-dev/profiles/dist/elements/agent-avatar.js';

  export let share: ShareItem;
  export let onDelete: ((id: string) => void) | undefined = undefined;

  // Decode the author's agent pub key from base64
  $: authorPubKey = share.sharedBy ? decodeHashFromBase64(share.sharedBy) : null;

  // Get profile store for the author (returns an AsyncReadable)
  $: authorProfileStore = authorPubKey && $profilesStore?.profiles?.get(authorPubKey);
  // Subscribe to the profile store
  $: authorProfile = authorProfileStore ? $authorProfileStore : null;
  $: authorNickname = authorProfile?.status === 'complete' && authorProfile?.value?.entry
    ? authorProfile.value.entry.nickname
    : share.sharedBy.slice(0, 8) + '...';

  // Subscribe to settings store values
  $: fontSize = $settingsStore.fontSize;
  $: showThumbnails = $settingsStore.showThumbnails;
  $: highContrast = $settingsStore.highContrast;

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minute = 60000;
    const hour = 3600000;
    const day = 86400000;

    if (diff < minute) return 'Just now';
    if (diff < hour) return `${Math.floor(diff / minute)} min ago`;
    if (diff < day) return `${Math.floor(diff / hour)} hours ago`;
    if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }

  function getDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      window.open(share.url, '_blank', 'noopener');
    }
  }

  function handleDelete(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (onDelete) {
      onDelete(share.id);
    }
  }

  function handleFaviconError(event: Event): void {
    const target = event.target as HTMLElement;
    target.style.display = 'none';
  }
</script>

<article
  class="share-card"
  class:high-contrast={highContrast}
  style="--font-size: {fontSize}px"
  aria-label="Shared link: {share.title}"
>
  <a
    href={share.url}
    target="_blank"
    rel="noopener noreferrer"
    class="card-link"
    tabindex="0"
    on:keydown={handleKeydown}
  >
    {#if showThumbnails && share.thumbnail}
      <div class="thumbnail">
        <img src={share.thumbnail} alt="" loading="lazy" />
      </div>
    {/if}

    <div class="content">
      <header class="card-header">
        {#if share.favicon}
          <img
            src={share.favicon}
            alt=""
            class="favicon"
            on:error={handleFaviconError}
          />
        {/if}
        <span class="domain">{getDomain(share.url)}</span>
        <span class="separator" aria-hidden="true">·</span>
        <time datetime={new Date(share.sharedAt).toISOString()}>
          {formatDate(share.sharedAt)}
        </time>
      </header>

      <h2 class="title">{share.title}</h2>

      {#if share.description}
        <p class="description">{share.description}</p>
      {/if}

      {#if share.selection}
        <blockquote class="selection">
          "{share.selection}"
        </blockquote>
      {/if}

      {#if share.sharedBy}
      <footer class="card-footer">
        <div class="shared-by">
          <agent-avatar
            size="24"
            agent-pub-key={share.sharedBy}
            disable-tooltip={true}
            disable-copy={true}
          ></agent-avatar>
          <span class="author-name">{authorNickname}</span>
        </div>
      </footer>
      {/if}
    </div>
  </a>

  {#if onDelete}
    <button
      type="button"
      class="delete-button"
      on:click={handleDelete}
      aria-label="Delete this share"
      title="Delete"
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
      </svg>
    </button>
  {/if}
</article>

<style>
  .share-card {
    --card-bg: #ffffff;
    --card-border: #e5e7eb;
    --text-primary: #1f2937;
    --text-secondary: #6b7280;
    --text-muted: #9ca3af;
    --selection-bg: #f3f4f6;
    --selection-border: #6366f1;
    --hover-bg: #f9fafb;
    --delete-color: #ef4444;

    position: relative;
    background: var(--card-bg);
    border: 2px solid var(--card-border);
    border-radius: 16px;
    overflow: hidden;
    transition: box-shadow 0.2s, border-color 0.2s;
  }

  .share-card:hover,
  .share-card:focus-within {
    border-color: var(--selection-border);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .share-card.high-contrast {
    --card-bg: #ffffff;
    --card-border: #000000;
    --text-primary: #000000;
    --text-secondary: #1f2937;
    --text-muted: #374151;
    --selection-bg: #fef3c7;
    --selection-border: #000000;
    border-width: 3px;
  }

  .card-link {
    display: block;
    text-decoration: none;
    color: inherit;
    padding: 20px;
  }

  .card-link:focus {
    outline: none;
  }

  .card-link:focus-visible {
    outline: 3px solid var(--selection-border);
    outline-offset: -3px;
  }

  .thumbnail {
    margin: -20px -20px 16px -20px;
    height: 200px;
    overflow: hidden;
    background: var(--selection-bg);
  }

  .thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: calc(var(--font-size) * 0.8);
    color: var(--text-muted);
  }

  .favicon {
    width: 16px;
    height: 16px;
    border-radius: 2px;
    flex-shrink: 0;
  }

  .domain {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .separator {
    color: var(--text-muted);
  }

  time {
    color: var(--text-muted);
  }

  .title {
    font-size: calc(var(--font-size) * 1.2);
    font-weight: 600;
    line-height: 1.3;
    color: var(--text-primary);
    margin: 0;

    /* Ensure text is readable */
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .description {
    font-size: var(--font-size);
    line-height: 1.5;
    color: var(--text-secondary);
    margin: 0;

    /* Limit to 3 lines */
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .selection {
    font-size: calc(var(--font-size) * 0.95);
    font-style: italic;
    line-height: 1.5;
    color: var(--text-secondary);
    background: var(--selection-bg);
    border-left: 4px solid var(--selection-border);
    padding: 12px 16px;
    margin: 0;
    border-radius: 0 8px 8px 0;

    /* Limit to 4 lines */
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-footer {
    padding-top: 12px;
    margin-top: 4px;
    border-top: 1px solid var(--card-border);
  }

  .shared-by {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: calc(var(--font-size) * 0.85);
    color: var(--text-muted);
  }

  .author-name {
    color: var(--text-secondary);
    font-weight: 500;
  }

  agent-avatar {
    --agent-avatar-size: 24px;
  }

  .delete-button {
    position: absolute;
    top: 12px;
    right: 12px;
    padding: 8px;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 8px;
    cursor: pointer;
    color: var(--text-muted);
    opacity: 0;
    transition: opacity 0.2s, color 0.2s, background 0.2s;
  }

  .share-card:hover .delete-button,
  .share-card:focus-within .delete-button {
    opacity: 1;
  }

  .delete-button:hover {
    color: var(--delete-color);
    background: #fef2f2;
    border-color: var(--delete-color);
  }

  .delete-button:focus-visible {
    outline: 3px solid var(--selection-border);
    outline-offset: 2px;
    opacity: 1;
  }

  /* Large touch targets for elderly users */
  @media (pointer: coarse) {
    .card-link {
      padding: 24px;
    }

    .delete-button {
      padding: 12px;
      opacity: 1;
    }
  }
</style>
