import { browser } from '$app/environment';
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
 * Reactive shares state using Svelte 5 runes.
 * Connects directly to Holochain conductor.
 */
class SharesStore {
  private _shares = $state<ShareItem[]>([]);
  private _loading = $state(true);
  private _error = $state<string | null>(null);
  private _connected = $state(false);
  private _client: ShareFeedClient | null = null;

  get shares(): ShareItem[] {
    return this._shares;
  }

  get loading(): boolean {
    return this._loading;
  }

  get error(): string | null {
    return this._error;
  }

  get isEmpty(): boolean {
    return !this._loading && this._shares.length === 0;
  }

  get connected(): boolean {
    return this._connected;
  }

  /**
   * Initialize the store by connecting to Holochain.
   */
  async init(): Promise<void> {
    if (!browser) return;

    this._loading = true;
    this._error = null;

    try {
      this._client = await connect();
      this._connected = true;

      // Load initial shares
      await this.refresh();
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Failed to connect to Holochain';
      console.error('Failed to initialize shares store:', err);
      this._connected = false;
    } finally {
      this._loading = false;
    }
  }

  /**
   * Refresh shares from Holochain.
   */
  async refresh(): Promise<void> {
    if (!this._client) {
      // Try to get existing client
      this._client = getClient();
      if (!this._client) return;
    }

    this._loading = true;
    this._error = null;

    try {
      const shareInfos = await this._client.getRecentShares();
      this._shares = shareInfos.map(toShareItem);
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Failed to load shares';
      console.error('Failed to refresh shares:', err);
    } finally {
      this._loading = false;
    }
  }

  /**
   * Create a new share item.
   */
  async createShare(
    share: Omit<ShareItem, 'id' | 'actionHash' | 'sharedAt' | 'sharedBy'>
  ): Promise<ShareItem | null> {
    if (!this._client) return null;

    try {
      const record = await this._client.createShareItem(toHcShareItem(share));
      // Refresh to get the new share with all metadata
      await this.refresh();
      // Return the newly created share (should be first in the sorted list)
      return this._shares[0] ?? null;
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Failed to create share';
      console.error('Failed to create share:', err);
      return null;
    }
  }

  /**
   * Delete a share item.
   */
  async deleteShare(id: string): Promise<void> {
    if (!this._client) return;

    const share = this._shares.find((s) => s.id === id);
    if (!share) return;

    try {
      await this._client.deleteShareItem(share.actionHash);
      this._shares = this._shares.filter((s) => s.id !== id);
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Failed to delete share';
      console.error('Failed to delete share:', err);
    }
  }

  /**
   * Check if connected to Holochain.
   */
  isConnected(): boolean {
    return isConnected();
  }
}

export const sharesStore = new SharesStore();

/**
 * Initialize the shares store.
 * Call this from +layout.svelte or +page.svelte on mount.
 */
export async function initSharesStore(): Promise<void> {
  await sharesStore.init();
}
