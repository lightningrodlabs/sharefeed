<script lang="ts">
  import { createEventDispatcher, tick } from 'svelte';
  import { sharesStore, settingsStore } from '$lib/stores';

  const dispatch = createEventDispatcher<{ created: void; cancel: void }>();

  export let open = false;

  let url = '';
  let title = '';
  let description = '';
  let submitting = false;
  let error: string | null = null;
  let urlInput: HTMLInputElement;

  $: highContrast = $settingsStore.highContrast;

  // When dialog opens, focus URL input and check clipboard for URL
  $: if (open) {
    handleDialogOpen();
  }

  async function handleDialogOpen(): Promise<void> {
    // Wait for DOM to update
    await tick();

    // Focus the URL input
    if (urlInput) {
      urlInput.focus();
    }

    // Try to read clipboard and auto-paste if it's a URL
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText && isValidUrl(clipboardText.trim())) {
        url = clipboardText.trim();
        // Select all text so user can easily replace if needed
        if (urlInput) {
          urlInput.select();
        }
      }
    } catch {
      // Clipboard access denied or not available - silently ignore
    }
  }

  function isValidUrl(text: string): boolean {
    try {
      const parsed = new URL(text);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function reset(): void {
    url = '';
    title = '';
    description = '';
    error = null;
  }

  function handleClose(): void {
    reset();
    open = false;
    dispatch('cancel');
  }

  async function handleSubmit(): Promise<void> {
    if (!url.trim() || !title.trim()) {
      error = 'URL and title are required';
      return;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      error = 'Please enter a valid URL';
      return;
    }

    submitting = true;
    error = null;

    try {
      await sharesStore.createShare({
        url: url.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        tags: [],
      });
      reset();
      open = false;
      dispatch('created');
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create share';
    } finally {
      submitting = false;
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div class="overlay" class:high-contrast={highContrast} on:click={handleClose} role="presentation">
    <div
      class="modal"
      class:high-contrast={highContrast}
      on:click|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-labelledby="form-title"
    >
      <h2 id="form-title">Share a Link</h2>

      <form on:submit|preventDefault={handleSubmit}>
        <div class="field">
          <label for="share-url">URL *</label>
          <input
            id="share-url"
            type="url"
            bind:this={urlInput}
            bind:value={url}
            placeholder="https://example.com/article"
            required
            disabled={submitting}
          />
        </div>

        <div class="field">
          <label for="share-title">Title *</label>
          <input
            id="share-title"
            type="text"
            bind:value={title}
            placeholder="Article title"
            required
            disabled={submitting}
          />
        </div>

        <div class="field">
          <label for="share-description">Description (optional)</label>
          <textarea
            id="share-description"
            bind:value={description}
            placeholder="Why are you sharing this?"
            rows="3"
            disabled={submitting}
          ></textarea>
        </div>

        {#if error}
          <div class="error" role="alert">{error}</div>
        {/if}

        <div class="actions">
          <button type="button" class="btn btn-secondary" on:click={handleClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" disabled={submitting}>
            {submitting ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 100;
  }

  .overlay.high-contrast {
    background: rgba(0, 0, 0, 0.7);
  }

  .modal {
    --bg: #ffffff;
    --text: #1f2937;
    --text-muted: #6b7280;
    --border: #e5e7eb;
    --primary: #6366f1;
    --primary-hover: #4f46e5;
    --error: #ef4444;

    background: var(--bg);
    border-radius: 16px;
    padding: 24px;
    width: 100%;
    max-width: 480px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  }

  .modal.high-contrast {
    --border: #000000;
    --text: #000000;
    border: 3px solid #000000;
  }

  h2 {
    margin: 0 0 20px 0;
    font-size: 24px;
    font-weight: 600;
    color: var(--text);
  }

  .field {
    margin-bottom: 16px;
  }

  label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: var(--text);
    font-size: 16px;
  }

  input, textarea {
    width: 100%;
    padding: 12px 14px;
    font-size: 16px;
    border: 2px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  input:focus, textarea:focus {
    outline: none;
    border-color: var(--primary);
  }

  input::placeholder, textarea::placeholder {
    color: var(--text-muted);
  }

  input:disabled, textarea:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  textarea {
    resize: vertical;
    min-height: 80px;
  }

  .error {
    background: #fef2f2;
    color: var(--error);
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 14px;
  }

  .actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
  }

  /* Responsive */
  @media (max-width: 480px) {
    .modal {
      padding: 20px;
    }

    .actions {
      flex-direction: column-reverse;
    }

    .actions .btn {
      width: 100%;
    }
  }
</style>
