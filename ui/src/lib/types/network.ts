/**
 * Types for multi-network support.
 * A network is a cloned cell that shares data with others who joined with the same passphrase.
 */

import type { CellId } from '@holochain/client';

/**
 * Represents a sharing network (cloned cell).
 */
export interface Network {
  /** The Holochain CellId for this network */
  cellId: CellId;
  /** Base64-encoded string representation of the CellId */
  cellIdString: string;
  /** User-provided name for this network */
  name: string;
  /** The 5-word passphrase used to join/create this network */
  passphrase: string;
  /** When this network was joined (local timestamp) */
  joinedAt: number;
  /** Whether this is the currently active network */
  isActive: boolean;
}

/**
 * Extended network info with statistics.
 */
export interface NetworkInfo {
  network: Network;
  /** Number of members in the network (if known) */
  memberCount?: number;
  /** Number of shares in the network (if known) */
  shareCount?: number;
}

/**
 * Metadata for a network stored in the DHT.
 * This is stored in the cell itself so all members can see it.
 */
export interface NetworkMeta {
  /** Display name for the network */
  name: string;
  /** Optional description */
  description?: string;
  /** When the network was created (Holochain timestamp) */
  createdAt: number;
}

/**
 * Input for creating a new network.
 */
export interface CreateNetworkInput {
  /** Name for the new network */
  name: string;
  /** Optional passphrase (generated if not provided) */
  passphrase?: string;
}

/**
 * Input for joining an existing network.
 */
export interface JoinNetworkInput {
  /** The 5-word passphrase for the network to join */
  passphrase: string;
  /** Optional display name (defaults to "Shared Feed") */
  name?: string;
}

/**
 * Local storage data for persisting network info across sessions.
 */
export interface NetworkLocalData {
  /** CellId as base64 string */
  cellIdString: string;
  /** User-provided name */
  name: string;
  /** Passphrase (stored locally for display, derivable from network_seed) */
  passphrase: string;
  /** When joined */
  joinedAt: number;
}
