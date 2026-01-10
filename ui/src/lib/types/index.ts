/**
 * UI types for ShareFeed.
 * These are the types used in components and stores.
 * Holochain-specific types are in $lib/holochain/types.ts
 */

/**
 * Accessibility settings for the feed display.
 */
export interface AccessibilitySettings {
  /** Base font size in pixels (18-32) */
  fontSize: number;
  /** Enable high contrast mode */
  highContrast: boolean;
  /** Show thumbnails in cards */
  showThumbnails: boolean;
  /** Reduced motion preference */
  reducedMotion: boolean;
}

/**
 * Default accessibility settings.
 */
export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  fontSize: 18,
  highContrast: false,
  showThumbnails: true,
  reducedMotion: false,
};

// Re-export ShareItem and Feed types from stores for convenience
export type { ShareItem } from '$lib/stores/shares';
export type { Feed } from '$lib/stores/feeds';

// Export network types
export type {
  Network,
  NetworkInfo,
  NetworkMeta,
  CreateNetworkInput,
  JoinNetworkInput,
  NetworkLocalData,
} from './network';
