/**
 * Holochain storage adapter for the extension.
 * Connects to a running Holochain conductor and stores shares in the DHT.
 *
 * Note: Service worker polyfill for @holochain/client is injected by vite.config.ts
 */

import {
  AppWebsocket,
  AdminWebsocket,
  type AppClient,
  type AppWebsocketConnectionOptions,
  encodeHashToBase64,
} from '@holochain/client';
import type { ShareItem, StorageAdapter, GetSharesOptions } from '@/types';

const APP_ID = 'sharefeed';
const ROLE_NAME = 'sharefeed';
const ZOME_NAME = 'sharefeed';

// Settings storage key
const SETTINGS_KEY = 'sharefeed_holochain_settings';

export interface HolochainSettings {
  adminPort: number;
  appPort: number;
  enabled: boolean;
}

// Fixed ports matching sharefeed-desktop configuration
const DEFAULT_SETTINGS: HolochainSettings = {
  adminPort: 21211,
  appPort: 21212,
  enabled: true, // Enabled by default - connects to fixed ports
};

/**
 * Holochain share item type (matches zome type)
 */
interface HcShareItem {
  url: string;
  title: string;
  description: string | null;
  selection: string | null;
  favicon: string | null;
  thumbnail: string | null;
  tags: string[];
}

/**
 * ShareItemInfo returned by get_recent_shares
 */
interface ShareItemInfo {
  action_hash: Uint8Array;
  share_item: HcShareItem;
  created_at: number;
  author: Uint8Array;
}

/**
 * Holochain storage adapter using @holochain/client.
 * Connects to the conductor on each operation (MV3 service worker constraint).
 */
export class HolochainStorageAdapter implements StorageAdapter {
  private settings: HolochainSettings;

  constructor(settings: HolochainSettings = DEFAULT_SETTINGS) {
    this.settings = settings;
  }

  /**
   * Create a connection to the conductor.
   * Returns null if connection fails.
   */
  private async getClient(): Promise<AppClient | null> {
    try {
      console.log('[Holochain] Attempting connection with settings:', this.settings);

      // Try connecting with admin auth first
      if (this.settings.adminPort > 0) {
        try {
          console.log(`[Holochain] Connecting to admin port ${this.settings.adminPort}...`);
          const adminWs = await AdminWebsocket.connect({
            url: new URL(`ws://localhost:${this.settings.adminPort}`),
          });
          console.log('[Holochain] Admin connection successful');

          console.log(`[Holochain] Issuing app auth token for ${APP_ID}...`);
          const tokenResp = await adminWs.issueAppAuthenticationToken({
            installed_app_id: APP_ID,
          });
          console.log('[Holochain] Token issued:', tokenResp.token ? 'yes' : 'no');

          // Authorize signing credentials
          console.log('[Holochain] Listing cell IDs...');
          const cellIds = await adminWs.listCellIds();
          console.log('[Holochain] Found', cellIds.length, 'cells');
          if (cellIds.length > 0) {
            console.log('[Holochain] Authorizing signing credentials...');
            await adminWs.authorizeSigningCredentials(cellIds[0]);
            console.log('[Holochain] Credentials authorized');
          }

          // Connect to app port with token
          console.log(`[Holochain] Connecting to app port ${this.settings.appPort} with token...`);
          const wsOptions: AppWebsocketConnectionOptions = {
            url: new URL(`ws://localhost:${this.settings.appPort}`),
            token: tokenResp.token,
            defaultTimeout: 30000,
          };

          const appClient = await AppWebsocket.connect(wsOptions);
          console.log('[Holochain] App connection successful');
          return appClient;
        } catch (adminError) {
          console.warn('[Holochain] Admin auth failed:', adminError);
        }
      }

      // Fallback: connect directly to app port without token
      console.log(`[Holochain] Fallback: connecting directly to app port ${this.settings.appPort}...`);
      const wsOptions: AppWebsocketConnectionOptions = {
        url: new URL(`ws://localhost:${this.settings.appPort}`),
        defaultTimeout: 30000,
      };

      const appClient = await AppWebsocket.connect(wsOptions);
      console.log('[Holochain] Fallback app connection successful');
      return appClient;
    } catch (error) {
      console.error('[Holochain] Failed to connect:', error);
      return null;
    }
  }

  /**
   * Call a zome function.
   */
  private async callZome<T>(fnName: string, payload: unknown): Promise<T> {
    const client = await this.getClient();
    if (!client) {
      throw new Error('Not connected to Holochain');
    }

    try {
      return await client.callZome({
        role_name: ROLE_NAME,
        zome_name: ZOME_NAME,
        fn_name: fnName,
        payload,
      });
    } finally {
      // Note: AppWebsocket doesn't have a close method in current API
      // The connection will be cleaned up when the service worker idles
    }
  }

  /**
   * Convert UI ShareItem to Holochain ShareItem
   */
  private toHcShareItem(share: Omit<ShareItem, 'id' | 'sharedAt' | 'sharedBy'>): HcShareItem {
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
   * Convert Holochain ShareItemInfo to UI ShareItem
   */
  private toShareItem(info: ShareItemInfo): ShareItem {
    const timestampMs =
      typeof info.created_at === 'number'
        ? info.created_at / 1000 // Holochain timestamps are in microseconds
        : Number(info.created_at) / 1000;

    return {
      id: encodeHashToBase64(info.action_hash),
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
   * Save a new share item to Holochain.
   */
  async saveShare(share: ShareItem): Promise<void> {
    const hcShare = this.toHcShareItem(share);
    console.log('[Holochain] Saving share:', hcShare);
    try {
      const result = await this.callZome('create_share_item', hcShare);
      console.log('[Holochain] Share saved, result:', result);
    } catch (error) {
      console.error('[Holochain] Failed to save share:', error);
      throw error;
    }
  }

  /**
   * Get shares from Holochain.
   */
  async getShares(options?: GetSharesOptions): Promise<ShareItem[]> {
    console.log('[Holochain] Getting shares...');
    const shareInfos = await this.callZome<ShareItemInfo[]>('get_recent_shares', null);
    console.log('[Holochain] Got', shareInfos.length, 'shares from zome');
    let shares = shareInfos.map((info) => this.toShareItem(info));

    // Apply client-side filtering (Holochain does time-based filtering)
    if (options?.after !== undefined) {
      shares = shares.filter((s) => s.sharedAt < options.after!);
    }

    if (options?.limit !== undefined) {
      shares = shares.slice(0, options.limit);
    }

    return shares;
  }

  /**
   * Delete a share by ID (ActionHash).
   * Note: In Holochain, "delete" marks the entry as deleted but doesn't remove it.
   */
  async deleteShare(id: string): Promise<void> {
    // Would need to implement delete_share_item in the zome
    // For now, this is a no-op
    console.warn('Delete not implemented for Holochain storage');
  }

  /**
   * Get a single share by ID (ActionHash).
   */
  async getShare(id: string): Promise<ShareItem | null> {
    // Would need to decode base64 to ActionHash and call get_share_item
    // For now, fetch all and filter
    const shares = await this.getShares();
    return shares.find((s) => s.id === id) ?? null;
  }

  /**
   * Test if connection to Holochain is possible.
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.getClient();
      return client !== null;
    } catch {
      return false;
    }
  }
}

/**
 * Get Holochain settings from chrome.storage.local
 */
export async function getHolochainSettings(): Promise<HolochainSettings> {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save Holochain settings to chrome.storage.local
 */
export async function saveHolochainSettings(settings: Partial<HolochainSettings>): Promise<void> {
  const current = await getHolochainSettings();
  const updated = { ...current, ...settings };
  await chrome.storage.local.set({ [SETTINGS_KEY]: updated });
  // Reset singleton so new settings take effect
  resetHolochainStorageAdapter();
}

/**
 * Singleton instance of the Holochain storage adapter.
 */
let instance: HolochainStorageAdapter | null = null;

export async function getHolochainStorageAdapter(): Promise<HolochainStorageAdapter> {
  if (!instance) {
    const settings = await getHolochainSettings();
    instance = new HolochainStorageAdapter(settings);
  }
  return instance;
}

/**
 * Reset the singleton (for settings changes)
 */
export function resetHolochainStorageAdapter(): void {
  instance = null;
}
