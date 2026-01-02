import { browser } from '$app/environment';
import {
  getClient,
  type ShareFeedClient,
  type Feed as HcFeed,
  type FeedInfo,
  type ActionHash,
  type AgentPubKey,
} from '$lib/holochain';
import { encodeHashToBase64 } from '@holochain/client';
import type { ShareItem } from './shares.svelte';

/**
 * UI-friendly feed type.
 */
export interface Feed {
  id: string;
  actionHash: ActionHash;
  name: string;
  description?: string;
  stewards: string[];
  isPublic: boolean;
  createdAt: number;
}

/**
 * Convert Holochain FeedInfo to UI Feed
 */
function toFeed(info: FeedInfo): Feed {
  const timestampMs =
    typeof info.created_at === 'number'
      ? info.created_at / 1000
      : Number(info.created_at) / 1000;

  return {
    id: encodeHashToBase64(info.action_hash),
    actionHash: info.action_hash,
    name: info.feed.name,
    description: info.feed.description ?? undefined,
    stewards: info.feed.stewards.map((s) => encodeHashToBase64(s)),
    isPublic: info.feed.is_public,
    createdAt: timestampMs,
  };
}

/**
 * Reactive feeds state using Svelte 5 runes.
 */
class FeedsStore {
  private _feeds = $state<Feed[]>([]);
  private _loading = $state(true);
  private _error = $state<string | null>(null);
  private _client: ShareFeedClient | null = null;

  get feeds(): Feed[] {
    return this._feeds;
  }

  get loading(): boolean {
    return this._loading;
  }

  get error(): string | null {
    return this._error;
  }

  /**
   * Refresh feeds from Holochain.
   */
  async refresh(): Promise<void> {
    if (!browser) return;

    this._client = getClient();
    if (!this._client) return;

    this._loading = true;
    this._error = null;

    try {
      const feedInfos = await this._client.getMyFeeds();
      this._feeds = feedInfos.map(toFeed);
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Failed to load feeds';
      console.error('Failed to refresh feeds:', err);
    } finally {
      this._loading = false;
    }
  }

  /**
   * Create a new feed.
   */
  async createFeed(
    name: string,
    description?: string,
    isPublic: boolean = false,
    stewards: AgentPubKey[] = []
  ): Promise<Feed | null> {
    this._client = getClient();
    if (!this._client) return null;

    try {
      const feed: HcFeed = {
        name,
        description: description ?? null,
        stewards,
        is_public: isPublic,
      };
      await this._client.createFeed(feed);
      await this.refresh();
      // Return the newest feed
      return this._feeds.find((f) => f.name === name) ?? null;
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Failed to create feed';
      console.error('Failed to create feed:', err);
      return null;
    }
  }

  /**
   * Delete a feed.
   */
  async deleteFeed(id: string): Promise<void> {
    this._client = getClient();
    if (!this._client) return;

    const feed = this._feeds.find((f) => f.id === id);
    if (!feed) return;

    try {
      await this._client.deleteFeed(feed.actionHash);
      this._feeds = this._feeds.filter((f) => f.id !== id);
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Failed to delete feed';
      console.error('Failed to delete feed:', err);
    }
  }

  /**
   * Add a share to a feed.
   */
  async addShareToFeed(feedId: string, shareActionHash: ActionHash): Promise<void> {
    this._client = getClient();
    if (!this._client) return;

    const feed = this._feeds.find((f) => f.id === feedId);
    if (!feed) return;

    try {
      await this._client.addShareToFeed({
        feed_hash: feed.actionHash,
        share_item_hash: shareActionHash,
      });
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Failed to add share to feed';
      console.error('Failed to add share to feed:', err);
    }
  }

  /**
   * Get shares for a specific feed.
   */
  async getFeedShares(feedId: string): Promise<ShareItem[]> {
    this._client = getClient();
    if (!this._client) return [];

    const feed = this._feeds.find((f) => f.id === feedId);
    if (!feed) return [];

    try {
      const shareInfos = await this._client.getFeedShares(feed.actionHash);
      return shareInfos.map((info) => {
        const timestampMs =
          typeof info.created_at === 'number'
            ? info.created_at / 1000
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
      });
    } catch (err) {
      this._error = err instanceof Error ? err.message : 'Failed to get feed shares';
      console.error('Failed to get feed shares:', err);
      return [];
    }
  }
}

export const feedsStore = new FeedsStore();
