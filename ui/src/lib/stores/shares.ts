import { writable, derived, get, type Readable } from 'svelte/store';
import {
  connect,
  getClient,
  isConnected,
  type ShareFeedClient,
  type ShareItem as HcShareItem,
  type ShareItemInfo,
  type ActionHash,
} from '$lib/holochain';
import { encodeHashToBase64 } from '@holochain/client';

const browser = typeof window !== 'undefined';

/**
 * UI-friendly share item type.
 * Converts Holochain types to more usable format.
 */
export interface ShareItem {
  id: string;
  actionHash: ActionHash;
  url: string;
  title: string;
  description?: string;
  selection?: string;
  favicon?: string;
  thumbnail?: string;
  sharedAt: number;
  sharedBy: string;
  sharedByName?: string;
  tags: string[];
}

interface SharesStoreState {
  shares: ShareItem[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  isEmpty: boolean;
  hasNetwork: boolean;
}

/**
 * Convert Holochain ShareItemInfo to UI ShareItem
 */
function toShareItem(info: ShareItemInfo): ShareItem {
  const timestampMs =
    typeof info.created_at === 'number'
      ? info.created_at / 1000 // Holochain timestamps are in microseconds
      : Number(info.created_at) / 1000;

  return {
    id: encodeHashToBase64(info.action_hash),
    actionHash: info.action_hash,
    url: info.share_item.url,
    title: info.share_item.title,
    description: info.share_item.description ?? undefined,
    selection: info.share_item.selection ?? undefined,
    favicon: info.share_item.favicon ?? undefined,
    thumbnail: info.share_item.thumbnail ?? undefined,
    sharedAt: timestampMs,
    sharedBy: encodeHashToBase64(info.author),
    tags: info.share_item.tags,
  };
}

/**
 * Convert UI ShareItem input to Holochain ShareItem
 */
function toHcShareItem(
  share: Omit<ShareItem, 'id' | 'actionHash' | 'sharedAt' | 'sharedBy'>
): HcShareItem {
  return {
    url: share.url,
    title: share.title,
    description: share.description ?? null,
    selection: share.selection ?? null,
    favicon: share.favicon ?? null,
    thumbnail: share.thumbnail ?? null,
    tags: share.tags ?? [],
  };
}

/**
 * Creates the shares store with Svelte 3 writable pattern.
 * Includes per-network caching for instant display when switching networks.
 */
function createSharesStore() {
  // Internal writable stores
  const _shares = writable<ShareItem[]>([]);
  const _loading = writable(true);
  const _error = writable<string | null>(null);
  const _connected = writable(false);
  const _hasNetwork = writable(false);

  // Per-network cache: cellIdString -> ShareItem[]
  const _cache = new Map<string, ShareItem[]>();
  let _currentNetworkId: string | null = null;

  let client: ShareFeedClient | null = null;

  // Combined derived store for subscription
  const combined: Readable<SharesStoreState> = derived(
    [_shares, _loading, _error, _connected, _hasNetwork],
    ([$shares, $loading, $error, $connected, $hasNetwork]) => ({
      shares: $shares,
      loading: $loading,
      error: $error,
      connected: $connected,
      isEmpty: !$loading && $hasNetwork && $shares.length === 0,
      hasNetwork: $hasNetwork,
    })
  );

  async function init(): Promise<void> {
    if (!browser) return;

    _loading.set(true);
    _error.set(null);
    _hasNetwork.set(false);

    try {
      client = await connect();
      _connected.set(true);
      // Don't load shares here - wait for network to be set
      // The networks store will trigger a refresh when a network is selected
    } catch (err) {
      _error.set(err instanceof Error ? err.message : 'Failed to connect to Holochain');
      console.error('Failed to initialize shares store:', err);
      _connected.set(false);
    } finally {
      _loading.set(false);
    }
  }

  /**
   * Switch to a network and load its shares.
   * If cached shares exist, they're displayed immediately while fresh data loads.
   */
  async function switchNetwork(cellIdString: string): Promise<void> {
    if (!client) {
      client = getClient();
      if (!client) return;
    }

    _currentNetworkId = cellIdString;
    _hasNetwork.set(true);
    _error.set(null);

    // Check if we have cached shares for this network
    const cachedShares = _cache.get(cellIdString);
    if (cachedShares) {
      // Immediately display cached shares
      _shares.set(cachedShares);
      // Then refresh in the background (don't show loading state)
      refreshInBackground(cellIdString);
    } else {
      // No cache - show loading and fetch
      _loading.set(true);
      _shares.set([]);
      await fetchAndCacheShares(cellIdString);
    }
  }

  /**
   * Fetch shares and update cache. Used for initial load.
   */
  async function fetchAndCacheShares(cellIdString: string): Promise<void> {
    if (!client) return;

    try {
      const shareInfos = await client.getRecentShares();
      const shares = shareInfos.map(toShareItem);

      // Only update if we're still on the same network
      if (_currentNetworkId === cellIdString) {
        _shares.set(shares);
        _loading.set(false);
      }

      // Always update cache
      _cache.set(cellIdString, shares);
    } catch (err) {
      if (_currentNetworkId === cellIdString) {
        _error.set(err instanceof Error ? err.message : 'Failed to load shares');
        _loading.set(false);
      }
      console.error('Failed to fetch shares:', err);
    }
  }

  /**
   * Refresh shares in the background without showing loading state.
   */
  async function refreshInBackground(cellIdString: string): Promise<void> {
    if (!client) return;

    try {
      const shareInfos = await client.getRecentShares();
      const shares = shareInfos.map(toShareItem);

      // Only update if we're still on the same network
      if (_currentNetworkId === cellIdString) {
        _shares.set(shares);
      }

      // Always update cache
      _cache.set(cellIdString, shares);
    } catch (err) {
      // Silently fail background refresh - we already have cached data
      console.error('Background refresh failed:', err);
    }
  }

  /**
   * Refresh shares for the current network.
   */
  async function refresh(): Promise<void> {
    if (!client) {
      client = getClient();
      if (!client) return;
    }

    // Check if client has a cell ID set (meaning we have a network)
    if (!client.hasCellId()) {
      _shares.set([]);
      _hasNetwork.set(false);
      _loading.set(false);
      _currentNetworkId = null;
      return;
    }

    _hasNetwork.set(true);
    _loading.set(true);
    _error.set(null);

    try {
      const shareInfos = await client.getRecentShares();
      const shares = shareInfos.map(toShareItem);
      _shares.set(shares);

      // Update cache if we have a network ID
      if (_currentNetworkId) {
        _cache.set(_currentNetworkId, shares);
      }
    } catch (err) {
      _error.set(err instanceof Error ? err.message : 'Failed to load shares');
      console.error('Failed to refresh shares:', err);
    } finally {
      _loading.set(false);
    }
  }

  async function createShare(
    share: Omit<ShareItem, 'id' | 'actionHash' | 'sharedAt' | 'sharedBy'>
  ): Promise<ShareItem | null> {
    if (!client) return null;

    try {
      await client.createShareItem(toHcShareItem(share));
      // Refresh to get the new share with all metadata
      await refresh();
      // Return the newly created share (should be first in the sorted list)
      return get(_shares)[0] ?? null;
    } catch (err) {
      _error.set(err instanceof Error ? err.message : 'Failed to create share');
      console.error('Failed to create share:', err);
      return null;
    }
  }

  async function deleteShare(id: string): Promise<void> {
    if (!client) return;

    const currentShares = get(_shares);
    const share = currentShares.find((s) => s.id === id);
    if (!share) return;

    try {
      await client.deleteShareItem(share.actionHash);
      _shares.set(currentShares.filter((s) => s.id !== id));
    } catch (err) {
      _error.set(err instanceof Error ? err.message : 'Failed to delete share');
      console.error('Failed to delete share:', err);
    }
  }

  function checkConnected(): boolean {
    return isConnected();
  }

  return {
    // Make store subscribable - returns SharesStoreState
    subscribe: combined.subscribe,
    // Methods
    init,
    refresh,
    switchNetwork,
    createShare,
    deleteShare,
    isConnected: checkConnected,
  };
}

export const sharesStore = createSharesStore();

/**
 * Initialize the shares store.
 * Call this from App.svelte on mount.
 */
export async function initSharesStore(): Promise<void> {
  await sharesStore.init();
}
