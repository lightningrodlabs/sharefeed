<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { networksStore } from '$lib/stores';
  import { generatePassphrase, validatePassphrase } from '$lib/secrets';
  import type { Network } from '$lib/types/network';

  export let open = false;
  export let mode: 'create' | 'join' = 'create';

  const dispatch = createEventDispatcher<{
    close: void;
    created: Network;
    joined: Network;
  }>();

  let networkName = '';
  let passphrase = '';
  let generatedPassphrase = '';
  let loading = false;
  let error: string | null = null;
  let copied = false;

  // Generate passphrase when modal opens in create mode
  $: if (open && mode === 'create' && !generatedPassphrase) {
    generateNewPassphrase();
  }

  // Reset state when modal closes
  $: if (!open) {
    networkName = '';
    passphrase = '';
    generatedPassphrase = '';
    error = null;
    copied = false;
  }

  async function generateNewPassphrase() {
    generatedPassphrase = await generatePassphrase();
  }

  async function handleCreate() {
    if (!networkName.trim()) {
      error = 'Please enter a network name';
      return;
    }

    loading = true;
    error = null;

    try {
      const network = await networksStore.createNetwork(networkName.trim(), generatedPassphrase);
      if (network) {
        dispatch('created', network);
        dispatch('close');
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to create network';
    } finally {
      loading = false;
    }
  }

  async function handleJoin() {
    const validation = validatePassphrase(passphrase);
    if (!validation.valid) {
      error = validation.error || 'Invalid passphrase';
      return;
    }

    loading = true;
    error = null;

    try {
      const name = networkName.trim() || 'Shared Feed';
      const network = await networksStore.joinNetwork(passphrase.trim(), name);
      if (network) {
        dispatch('joined', network);
        dispatch('close');
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to join network';
    } finally {
      loading = false;
    }
  }

  async function copyPassphrase() {
    try {
      await navigator.clipboard.writeText(generatedPassphrase);
      copied = true;
      setTimeout(() => copied = false, 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = generatedPassphrase;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      copied = true;
      setTimeout(() => copied = false, 2000);
    }
  }

  function handleClose() {
    dispatch('close');
  }

  function switchMode(newMode: 'create' | 'join') {
    mode = newMode;
    error = null;
    if (newMode === 'create' && !generatedPassphrase) {
      generateNewPassphrase();
    }
  }
</script>

{#if open}
  <div class="modal-overlay" on:click={handleClose} on:keydown={(e) => e.key === 'Escape' && handleClose()} role="button" tabindex="0">
    <div class="modal" on:click|stopPropagation role="dialog" aria-modal="true">
      <header class="modal-header">
        <h2>{mode === 'create' ? 'Create Network' : 'Join Network'}</h2>
        <button class="close-button" on:click={handleClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <div class="mode-tabs">
        <button
          class="tab"
          class:active={mode === 'create'}
          on:click={() => switchMode('create')}
        >
          Create New
        </button>
        <button
          class="tab"
          class:active={mode === 'join'}
          on:click={() => switchMode('join')}
        >
          Join Existing
        </button>
      </div>

      <div class="modal-body">
        {#if mode === 'create'}
          <div class="form-group">
            <label for="network-name">Network Name</label>
            <input
              id="network-name"
              type="text"
              bind:value={networkName}
              placeholder="e.g., Family Photos, Book Club"
            />
          </div>

          <div class="form-group">
            <label>Secret Words</label>
            <p class="hint">Share these words with people you want to join this network.</p>
            <div class="passphrase-display">
              <span class="passphrase">{generatedPassphrase || 'Generating...'}</span>
              <button class="copy-button" on:click={copyPassphrase} disabled={!generatedPassphrase}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <button class="regenerate-button" on:click={generateNewPassphrase}>
              Generate new words
            </button>
          </div>
        {:else}
          <div class="form-group">
            <label for="join-passphrase">Secret Words</label>
            <p class="hint">Enter the 5 words shared with you.</p>
            <input
              id="join-passphrase"
              type="text"
              bind:value={passphrase}
              placeholder="word1 word2 word3 word4 word5"
            />
          </div>

          <div class="form-group">
            <label for="join-name">Network Name (optional)</label>
            <input
              id="join-name"
              type="text"
              bind:value={networkName}
              placeholder="Give this network a name"
            />
          </div>
        {/if}

        {#if error}
          <div class="error">{error}</div>
        {/if}
      </div>

      <footer class="modal-footer">
        <button class="btn-secondary" on:click={handleClose}>Cancel</button>
        {#if mode === 'create'}
          <button class="btn-primary" on:click={handleCreate} disabled={loading || !networkName.trim()}>
            {loading ? 'Creating...' : 'Create Network'}
          </button>
        {:else}
          <button class="btn-primary" on:click={handleJoin} disabled={loading || !passphrase.trim()}>
            {loading ? 'Joining...' : 'Join Network'}
          </button>
        {/if}
      </footer>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 480px;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .close-button {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: #6b7280;
  }

  .close-button:hover {
    color: #1f2937;
  }

  .mode-tabs {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
  }

  .tab {
    flex: 1;
    padding: 12px;
    background: none;
    border: none;
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }

  .tab:hover {
    color: #1f2937;
  }

  .tab.active {
    color: #6366f1;
    border-bottom-color: #6366f1;
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .hint {
    font-size: 13px;
    color: #6b7280;
    margin: 0 0 8px 0;
  }

  input[type="text"] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 15px;
  }

  input[type="text"]:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .passphrase-display {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #f3f4f6;
    border-radius: 8px;
    padding: 12px;
  }

  .passphrase {
    flex: 1;
    font-family: monospace;
    font-size: 15px;
    word-break: break-word;
  }

  .copy-button {
    padding: 6px 12px;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
  }

  .copy-button:hover {
    background: #4f46e5;
  }

  .copy-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .regenerate-button {
    margin-top: 8px;
    padding: 6px 12px;
    background: none;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    color: #6b7280;
    cursor: pointer;
  }

  .regenerate-button:hover {
    border-color: #9ca3af;
    color: #1f2937;
  }

  .error {
    background: #fef2f2;
    color: #dc2626;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 14px;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 16px 20px;
    border-top: 1px solid #e5e7eb;
  }

  .btn-secondary, .btn-primary {
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-secondary {
    background: white;
    border: 1px solid #d1d5db;
    color: #374151;
  }

  .btn-secondary:hover {
    background: #f9fafb;
  }

  .btn-primary {
    background: #6366f1;
    border: none;
    color: white;
  }

  .btn-primary:hover {
    background: #4f46e5;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
