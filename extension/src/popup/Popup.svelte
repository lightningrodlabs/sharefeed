<script lang="ts">
  import type { ShareMetadata, ShareItem, ExtensionMessage, ConnectionStatus, NetworkInfo } from '@/types';
  import { getHolochainSettings, saveHolochainSettings, type HolochainSettings } from '@/storage/holochain-storage';

  // State using Svelte 5 runes
  let loading = $state(true);
  let sharing = $state(false);
  let success = $state(false);
  let error = $state<string | null>(null);
  let metadata = $state<ShareMetadata | null>(null);
  let recentShares = $state<ShareItem[]>([]);
  let connectionStatus = $state<ConnectionStatus | null>(null);

  // Network state
  let networks = $state<NetworkInfo[]>([]);
  let activeNetwork = $derived(networks.find(n => n.isActive) || null);
  let showNetworkSelector = $state(false);

  // Form state
  let customNote = $state('');
  let showRecent = $state(false);
  let showSettings = $state(false);
  let settings = $state<HolochainSettings>({ adminPort: 0, appPort: 0, enabled: true });

  // Fetch metadata from current tab on mount
  $effect(() => {
    loadCurrentTabMetadata();
    loadRecentShares();
    loadSettings();
    loadNetworks();
  });

  async function loadSettings() {
    settings = await getHolochainSettings();
    await checkConnectionStatus();
  }

  async function loadNetworks() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_NETWORKS' });
      if (response?.type === 'NETWORKS_RESPONSE') {
        networks = response.payload;
      }
    } catch (err) {
      console.error('Failed to load networks:', err);
    }
  }

  async function selectNetwork(cellIdString: string) {
    try {
      await chrome.runtime.sendMessage({ type: 'SET_ACTIVE_NETWORK', payload: cellIdString });
      // Update local state
      networks = networks.map(n => ({
        ...n,
        isActive: n.cellIdString === cellIdString
      }));
      showNetworkSelector = false;
      // Reload shares for the new network
      await loadRecentShares();
    } catch (err) {
      console.error('Failed to set active network:', err);
    }
  }

  async function checkConnectionStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CONNECTION_STATUS' });
      if (response?.type === 'CONNECTION_STATUS_RESPONSE') {
        connectionStatus = response.payload;
      }
    } catch (err) {
      console.error('Failed to get connection status:', err);
    }
  }

  async function handleSaveSettings() {
    await saveHolochainSettings(settings);
    // Tell service worker to reset its connection with new settings
    await chrome.runtime.sendMessage({ type: 'RESET_CONNECTION' });
    // Force reconnection check
    await checkConnectionStatus();
    showSettings = false;
  }

  async function loadCurrentTabMetadata() {
    loading = true;
    error = null;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) {
        error = 'Cannot access this page';
        loading = false;
        return;
      }

      // Skip non-http URLs
      if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
        error = 'Cannot share this type of page';
        loading = false;
        return;
      }

      // Try to get metadata from content script
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_METADATA' });
        if (response?.type === 'METADATA_RESPONSE') {
          metadata = response.payload;
        }
      } catch {
        // Content script might not be loaded, use tab info
        metadata = {
          url: tab.url,
          title: tab.title || 'Untitled',
          favicon: tab.favIconUrl,
        };
      }
    } catch (err) {
      error = 'Failed to load page information';
      console.error(err);
    } finally {
      loading = false;
    }
  }

  async function loadRecentShares() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SHARES' });
      if (response?.type === 'SHARES_RESPONSE') {
        recentShares = response.payload.slice(0, 5);
      }
    } catch (err) {
      console.error('Failed to load recent shares:', err);
    }
  }

  async function handleShare() {
    if (!metadata) return;

    sharing = true;
    error = null;

    try {
      const shareData: Omit<ShareItem, 'id' | 'sharedAt' | 'sharedBy'> = {
        url: metadata.url,
        title: metadata.title,
        description: customNote || metadata.description,
        selection: metadata.selection,
        favicon: metadata.favicon,
      };

      const response: ExtensionMessage = await chrome.runtime.sendMessage({
        type: 'SHARE_ITEM',
        payload: shareData,
      });

      if (response.type === 'SHARE_SUCCESS') {
        success = true;
        customNote = '';
        await loadRecentShares();

        // Close popup after short delay
        setTimeout(() => {
          window.close();
        }, 1500);
      } else if (response.type === 'SHARE_ERROR') {
        error = response.payload;
      }
    } catch (err) {
      error = 'Failed to share. Please try again.';
      console.error(err);
    } finally {
      sharing = false;
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }

  function truncate(str: string, max: number): string {
    if (str.length <= max) return str;
    return str.substring(0, max - 1) + '…';
  }
</script>

<main>
  <header>
    <h1>ShareFeed</h1>
    <div class="header-actions">
      {#if networks.length > 0 && connectionStatus?.holochainAvailable}
        <div class="network-selector">
          <button class="network-button" onclick={() => showNetworkSelector = !showNetworkSelector}>
            <span class="network-icon">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
            </span>
            <span class="network-name">{activeNetwork?.name || 'Select'}</span>
            <span class="dropdown-arrow" class:open={showNetworkSelector}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </button>
          {#if showNetworkSelector}
            <div class="network-dropdown">
              {#each networks as network}
                <button
                  class="network-option"
                  class:active={network.isActive}
                  onclick={() => selectNetwork(network.cellIdString)}
                >
                  <span>{network.name}</span>
                  {#if network.isActive}
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  {/if}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
      {#if connectionStatus}
        <button class="connection-status" class:connected={connectionStatus.holochainAvailable} onclick={() => showSettings = !showSettings}>
          <span class="status-dot"></span>
          <span class="status-text">
            {connectionStatus.holochainAvailable ? 'HC' : 'Local'}
          </span>
        </button>
      {/if}
    </div>
  </header>

  {#if showSettings}
    <div class="settings-panel">
      <h3>Holochain Connection</h3>
      <p class="settings-hint">Look for "Conductor launched" in terminal with admin_port and app_ports</p>
      <div class="settings-row">
        <label for="admin-port">Admin Port</label>
        <input id="admin-port" type="number" bind:value={settings.adminPort} placeholder="e.g. 41897" />
      </div>
      <div class="settings-row">
        <label for="app-port">App Port</label>
        <input id="app-port" type="number" bind:value={settings.appPort} placeholder="e.g. 41931" />
      </div>
      <div class="settings-row checkbox">
        <label>
          <input type="checkbox" bind:checked={settings.enabled} />
          Enable Holochain
        </label>
      </div>
      <div class="settings-actions">
        <button class="btn-secondary" onclick={() => showSettings = false}>Cancel</button>
        <button class="btn-primary" onclick={handleSaveSettings}>Save</button>
      </div>
    </div>
  {/if}

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading page info...</p>
    </div>
  {:else if error}
    <div class="error-message">
      <p>{error}</p>
    </div>
  {:else if success}
    <div class="success-message">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22,4 12,14.01 9,11.01" />
      </svg>
      <p>Shared successfully</p>
    </div>
  {:else if metadata}
    <div class="share-form">
      <div class="preview">
        {#if metadata.favicon}
          <img src={metadata.favicon} alt="" class="favicon" onerror={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
        {/if}
        <div class="preview-text">
          <h2>{truncate(metadata.title, 60)}</h2>
          <p class="url">{truncate(metadata.url, 50)}</p>
        </div>
      </div>

      {#if metadata.description}
        <p class="description">{truncate(metadata.description, 150)}</p>
      {/if}

      {#if metadata.selection}
        <blockquote class="selection">
          "{truncate(metadata.selection, 200)}"
        </blockquote>
      {/if}

      <div class="form-group">
        <label for="note">Add a note (optional)</label>
        <textarea
          id="note"
          bind:value={customNote}
          placeholder="Why are you sharing this?"
          rows="2"
        ></textarea>
      </div>

      <button class="share-button" onclick={handleShare} disabled={sharing}>
        {#if sharing}
          Sharing...
        {:else}
          Share
        {/if}
      </button>
    </div>
  {/if}

  {#if recentShares.length > 0 && !loading && !success}
    <div class="recent-section">
      <button class="toggle-recent" onclick={() => showRecent = !showRecent}>
        {showRecent ? 'Hide' : 'Show'} recent shares ({recentShares.length})
      </button>

      {#if showRecent}
        <ul class="recent-list">
          {#each recentShares as share}
            <li>
              <a href={share.url} target="_blank" rel="noopener">
                {truncate(share.title, 40)}
              </a>
              <span class="time">{formatDate(share.sharedAt)}</span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {/if}
</main>

<style>
  main {
    padding: 16px;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
  }

  h1 {
    font-size: 18px;
    font-weight: 600;
    color: var(--primary-color);
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #666;
    padding: 4px 8px;
    background: #f5f5f5;
    border-radius: 12px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #999;
  }

  .connection-status.connected .status-dot {
    background: #22c55e;
  }

  .connection-status.connected {
    color: #16a34a;
    background: #f0fdf4;
  }

  .connection-status:hover {
    opacity: 0.8;
    cursor: pointer;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .network-selector {
    position: relative;
  }

  .network-button {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 11px;
    color: #374151;
    cursor: pointer;
  }

  .network-button:hover {
    background: #e5e7eb;
  }

  .network-icon {
    color: #6366f1;
  }

  .network-name {
    max-width: 80px;
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

  .network-dropdown {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    min-width: 150px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 50;
    overflow: hidden;
  }

  .network-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 10px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    color: #374151;
    text-align: left;
  }

  .network-option:hover {
    background: #f3f4f6;
  }

  .network-option.active {
    background: #eef2ff;
    color: #4f46e5;
  }

  .network-option svg {
    color: #6366f1;
    flex-shrink: 0;
  }

  .settings-panel {
    background: #f9fafb;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .settings-panel h3 {
    font-size: 14px;
    font-weight: 600;
    margin: 0 0 4px 0;
  }

  .settings-hint {
    font-size: 11px;
    color: #666;
    margin: 0 0 12px 0;
  }

  .settings-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .settings-row label {
    font-size: 12px;
    min-width: 70px;
  }

  .settings-row input[type="number"] {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 13px;
  }

  .settings-row.checkbox label {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: auto;
  }

  .settings-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 12px;
  }

  .btn-secondary, .btn-primary {
    padding: 6px 12px;
    font-size: 12px;
    border-radius: 4px;
    cursor: pointer;
  }

  .btn-secondary {
    background: white;
    border: 1px solid var(--border-color);
    color: #666;
  }

  .btn-primary {
    background: var(--primary-color);
    border: none;
    color: white;
  }

  .btn-primary:hover {
    background: var(--primary-hover);
  }

  .loading, .error-message, .success-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    text-align: center;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--border-color);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 12px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .error-message {
    color: var(--error-color);
  }

  .success-message {
    color: var(--success-color);
  }

  .success-message svg {
    margin-bottom: 12px;
  }

  .share-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .preview {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .favicon {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .preview-text {
    flex: 1;
    min-width: 0;
  }

  .preview-text h2 {
    font-size: 15px;
    font-weight: 600;
    line-height: 1.3;
    margin-bottom: 4px;
  }

  .url {
    font-size: 12px;
    color: #666;
    word-break: break-all;
  }

  .description {
    font-size: 13px;
    color: #555;
    background: var(--input-bg);
    padding: 8px 12px;
    border-radius: 6px;
  }

  .selection {
    font-size: 13px;
    font-style: italic;
    color: #555;
    border-left: 3px solid var(--primary-color);
    padding: 8px 12px;
    margin: 0;
    background: var(--input-bg);
    border-radius: 0 6px 6px 0;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .form-group label {
    font-size: 12px;
    font-weight: 500;
    color: #666;
  }

  textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;
    background: var(--input-bg);
  }

  textarea:focus {
    outline: none;
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
  }

  .share-button {
    width: 100%;
    padding: 12px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }

  .share-button:hover:not(:disabled) {
    background: var(--primary-hover);
  }

  .share-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .recent-section {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
  }

  .toggle-recent {
    background: none;
    border: none;
    color: #666;
    font-size: 12px;
    cursor: pointer;
    padding: 4px 0;
  }

  .toggle-recent:hover {
    color: var(--primary-color);
  }

  .recent-list {
    list-style: none;
    margin-top: 8px;
  }

  .recent-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    font-size: 13px;
  }

  .recent-list a {
    color: var(--text-color);
    text-decoration: none;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .recent-list a:hover {
    color: var(--primary-color);
  }

  .time {
    color: #999;
    font-size: 11px;
    margin-left: 8px;
    flex-shrink: 0;
  }
</style>
