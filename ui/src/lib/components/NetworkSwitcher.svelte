<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { networksStore } from '$lib/stores';

  export let compact = false;

  const dispatch = createEventDispatcher<{
    createNetwork: void;
    joinNetwork: void;
  }>();

  let showDropdown = false;
  let showingPassphraseFor: string | null = null;
  let copiedPassphrase = false;

  $: networks = $networksStore.networks;
  $: activeNetwork = networks.find(n => n.isActive);
  $: hasNetworks = networks.length > 0;

  function handleSelect(cellIdString: string) {
    networksStore.setActiveNetwork(cellIdString);
    showDropdown = false;
    showingPassphraseFor = null;
  }

  function handleCreateClick() {
    showDropdown = false;
    showingPassphraseFor = null;
    dispatch('createNetwork');
  }

  function handleJoinClick() {
    showDropdown = false;
    showingPassphraseFor = null;
    dispatch('joinNetwork');
  }

  function toggleDropdown() {
    showDropdown = !showDropdown;
    if (!showDropdown) {
      showingPassphraseFor = null;
    }
  }

  function togglePassphrase(cellIdString: string, event: MouseEvent) {
    event.stopPropagation();
    showingPassphraseFor = showingPassphraseFor === cellIdString ? null : cellIdString;
    copiedPassphrase = false;
  }

  async function copyPassphrase(passphrase: string, event: MouseEvent) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(passphrase);
      copiedPassphrase = true;
      setTimeout(() => {
        copiedPassphrase = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy passphrase:', err);
    }
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.network-switcher')) {
      showDropdown = false;
      showingPassphraseFor = null;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="network-switcher" class:compact>
  {#if hasNetworks}
    <button class="current-network" on:click={toggleDropdown}>
      <span class="network-icon">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
      </span>
      <span class="network-name">{activeNetwork?.name || 'Select Network'}</span>
      <span class="dropdown-arrow" class:open={showDropdown}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </button>

    {#if showDropdown}
      <div class="dropdown">
        <div class="dropdown-header">Your Networks</div>
        <ul class="network-list">
          {#each networks as network}
            <li>
              <div class="network-item-wrapper">
                <button
                  class="network-item"
                  class:active={network.isActive}
                  on:click={() => handleSelect(network.cellIdString)}
                >
                  <span class="network-item-name">{network.name}</span>
                  {#if network.isActive}
                    <span class="check-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  {/if}
                </button>
                <button
                  class="info-button"
                  on:click={(e) => togglePassphrase(network.cellIdString, e)}
                  title="Show invite words"
                  aria-label="Show invite words for {network.name}"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                </button>
              </div>
              {#if showingPassphraseFor === network.cellIdString}
                <div class="passphrase-panel">
                  <div class="passphrase-label">Invite words (share to let others join):</div>
                  <div class="passphrase-value">
                    <code>{network.passphrase || 'Not available'}</code>
                    {#if network.passphrase}
                      <button
                        class="copy-button"
                        on:click={(e) => copyPassphrase(network.passphrase, e)}
                        title="Copy to clipboard"
                      >
                        {#if copiedPassphrase}
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        {:else}
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                        {/if}
                      </button>
                    {/if}
                  </div>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
        <div class="dropdown-actions">
          <button class="action-button" on:click={handleCreateClick}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Network
          </button>
          <button class="action-button" on:click={handleJoinClick}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
            </svg>
            Join Network
          </button>
        </div>
      </div>
    {/if}
  {:else}
    <div class="no-networks">
      <button class="btn-primary" on:click={handleCreateClick}>
        Create Network
      </button>
      <button class="btn-secondary" on:click={handleJoinClick}>
        Join Network
      </button>
    </div>
  {/if}
</div>

<style>
  .network-switcher {
    position: relative;
  }

  .current-network {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    color: #1f2937;
  }

  .current-network:hover {
    background: #e5e7eb;
  }

  .network-switcher.compact .current-network {
    padding: 6px 10px;
    font-size: 13px;
  }

  .network-icon {
    color: #6366f1;
  }

  .network-name {
    font-weight: 500;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dropdown-arrow {
    color: #6b7280;
    transition: transform 0.15s;
  }

  .dropdown-arrow.open {
    transform: rotate(180deg);
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 220px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 50;
    overflow: hidden;
  }

  .dropdown-header {
    padding: 10px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  .network-list {
    list-style: none;
    margin: 0;
    padding: 4px 0;
    max-height: 300px;
    overflow-y: auto;
  }

  .network-item-wrapper {
    display: flex;
    align-items: center;
  }

  .network-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 1;
    padding: 10px 8px 10px 12px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    font-size: 14px;
    color: #374151;
  }

  .network-item:hover {
    background: #f3f4f6;
  }

  .network-item.active {
    background: #eef2ff;
    color: #4f46e5;
  }

  .network-item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .check-icon {
    color: #6366f1;
    flex-shrink: 0;
  }

  .info-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    margin-right: 8px;
    background: none;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    color: #9ca3af;
    flex-shrink: 0;
  }

  .info-button:hover {
    background: #f3f4f6;
    color: #6366f1;
    border-color: #e5e7eb;
  }

  .passphrase-panel {
    padding: 10px 12px;
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
    margin: 0;
  }

  .passphrase-label {
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .passphrase-value {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .passphrase-value code {
    flex: 1;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-size: 13px;
    color: #4f46e5;
    background: #eef2ff;
    padding: 6px 10px;
    border-radius: 6px;
    word-break: break-all;
  }

  .copy-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
    color: #6b7280;
    flex-shrink: 0;
  }

  .copy-button:hover {
    background: #f9fafb;
    color: #4f46e5;
    border-color: #6366f1;
  }

  .dropdown-actions {
    border-top: 1px solid #e5e7eb;
    padding: 4px 0;
  }

  .action-button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 12px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    color: #374151;
  }

  .action-button:hover {
    background: #f3f4f6;
  }

  .action-button svg {
    color: #6b7280;
  }

  .no-networks {
    display: flex;
    gap: 8px;
  }

  .btn-primary, .btn-secondary {
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
  }

  .btn-primary {
    background: #6366f1;
    border: none;
    color: white;
  }

  .btn-primary:hover {
    background: #4f46e5;
  }

  .btn-secondary {
    background: white;
    border: 1px solid #d1d5db;
    color: #374151;
  }

  .btn-secondary:hover {
    background: #f9fafb;
  }
</style>
