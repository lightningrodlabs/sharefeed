/**
 * Storage manager that handles switching between Holochain and local storage.
 * Uses Holochain when available, falls back to local storage otherwise.
 */

import type { ShareItem, StorageAdapter, GetSharesOptions, NetworkInfo } from '@/types';
import { getLocalStorageAdapter } from './local-storage';
import {
  getHolochainStorageAdapter,
  getHolochainSettings,
  type HolochainStorageAdapter,
} from './holochain-storage';

export type StorageMode = 'holochain' | 'local' | 'auto';

const STORAGE_MODE_KEY = 'sharefeed_storage_mode';

/**
 * Get the configured storage mode.
 */
export async function getStorageMode(): Promise<StorageMode> {
  try {
    const result = await chrome.storage.local.get(STORAGE_MODE_KEY);
    return result[STORAGE_MODE_KEY] || 'auto';
  } catch {
    return 'auto';
  }
}

/**
 * Set the storage mode.
 */
export async function setStorageMode(mode: StorageMode): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_MODE_KEY]: mode });
}

/**
 * Storage manager with automatic fallback.
 */
export class StorageManager implements StorageAdapter {
  private localAdapter = getLocalStorageAdapter();
  private holochainAdapter: HolochainStorageAdapter | null = null;
  private lastHolochainCheck = 0;
  private holochainAvailable = false;
  private checkInterval = 30000; // Check every 30 seconds

  /**
   * Get the appropriate storage adapter based on mode and availability.
   */
  private async getAdapter(): Promise<StorageAdapter> {
    const mode = await getStorageMode();

    if (mode === 'local') {
      return this.localAdapter;
    }

    if (mode === 'holochain' || mode === 'auto') {
      const settings = await getHolochainSettings();

      if (!settings.enabled) {
        return this.localAdapter;
      }

      // Check if Holochain is available (with caching)
      const now = Date.now();
      if (now - this.lastHolochainCheck > this.checkInterval) {
        this.lastHolochainCheck = now;
        try {
          this.holochainAdapter = await getHolochainStorageAdapter();
          this.holochainAvailable = await this.holochainAdapter.testConnection();
        } catch {
          this.holochainAvailable = false;
        }
      }

      if (this.holochainAvailable && this.holochainAdapter) {
        return this.holochainAdapter;
      }

      // Force Holochain mode should throw if not available
      if (mode === 'holochain') {
        throw new Error('Holochain conductor not available');
      }
    }

    return this.localAdapter;
  }

  /**
   * Save a share item.
   */
  async saveShare(share: ShareItem): Promise<void> {
    const adapter = await this.getAdapter();
    await adapter.saveShare(share);
  }

  /**
   * Get shares.
   */
  async getShares(options?: GetSharesOptions): Promise<ShareItem[]> {
    const adapter = await this.getAdapter();
    return adapter.getShares(options);
  }

  /**
   * Delete a share.
   */
  async deleteShare(id: string): Promise<void> {
    const adapter = await this.getAdapter();
    await adapter.deleteShare(id);
  }

  /**
   * Get a single share.
   */
  async getShare(id: string): Promise<ShareItem | null> {
    const adapter = await this.getAdapter();
    return adapter.getShare(id);
  }

  /**
   * Check if Holochain is currently being used.
   */
  isUsingHolochain(): boolean {
    return this.holochainAvailable;
  }

  /**
   * Force a connection check.
   */
  async checkConnection(): Promise<{ mode: StorageMode; holochainAvailable: boolean }> {
    this.lastHolochainCheck = 0; // Reset cache
    await this.getAdapter(); // Trigger check
    return {
      mode: await getStorageMode(),
      holochainAvailable: this.holochainAvailable,
    };
  }

  /**
   * Reset connection state (call after settings change)
   */
  resetConnection(): void {
    this.lastHolochainCheck = 0;
    this.holochainAvailable = false;
    this.holochainAdapter = null;
  }

  /**
   * Get all networks from Holochain.
   * Returns empty array if Holochain is not available.
   */
  async getNetworks(): Promise<NetworkInfo[]> {
    if (!this.holochainAdapter) {
      this.holochainAdapter = await getHolochainStorageAdapter();
    }

    if (this.holochainAvailable && this.holochainAdapter) {
      return this.holochainAdapter.getNetworks();
    }

    return [];
  }

  /**
   * Set the active network for Holochain operations.
   */
  setActiveNetwork(cellIdString: string): void {
    if (this.holochainAdapter) {
      this.holochainAdapter.setActiveCellId(cellIdString);
    }
  }
}

// Singleton instance
let storageManager: StorageManager | null = null;

export function getStorageManager(): StorageManager {
  if (!storageManager) {
    storageManager = new StorageManager();
  }
  return storageManager;
}

/**
 * Reset the storage manager (call after settings change)
 */
export function resetStorageManager(): void {
  if (storageManager) {
    storageManager.resetConnection();
  }
}
