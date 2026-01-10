/**
 * Network management functions for creating, joining, and listing sharing networks.
 * Each network is a cloned cell with a passphrase-derived network seed.
 */

import type { AppClient, CellId, ClonedCell } from '@holochain/client';
import { encodeHashToBase64 } from '@holochain/client';
import type { Network, NetworkLocalData } from '$lib/types/network';
import { passphraseToNetworkSeed, generatePassphrase, networkSeedToPassphrase } from '$lib/secrets';
import { ROLE_NAME } from './client';

// Local storage key for persisting network data
const NETWORKS_STORAGE_KEY = 'sharefeed_networks';

/**
 * Convert a CellId to a string for use as a key.
 */
export function cellIdToString(cellId: CellId): string {
  return `${encodeHashToBase64(cellId[0])}:${encodeHashToBase64(cellId[1])}`;
}

/**
 * Convert a string back to a CellId.
 */
export function cellIdFromString(cellIdString: string): CellId {
  const [dnaHash, agentPubKey] = cellIdString.split(':');
  // Decode base64 to Uint8Array
  const dnaBytes = Uint8Array.from(atob(dnaHash), c => c.charCodeAt(0));
  const agentBytes = Uint8Array.from(atob(agentPubKey), c => c.charCodeAt(0));
  return [dnaBytes, agentBytes];
}

/**
 * Create a new sharing network.
 * This clones the sharefeed DNA with a passphrase-derived network seed.
 *
 * @param appClient - The Holochain app client
 * @param name - Display name for the network
 * @param passphrase - Optional passphrase (generated if not provided)
 * @returns The created network info and passphrase
 */
export async function createNetwork(
  appClient: AppClient,
  name: string,
  passphrase?: string
): Promise<{ network: Network; passphrase: string }> {
  const finalPassphrase = passphrase || (await generatePassphrase());
  const networkSeed = passphraseToNetworkSeed(finalPassphrase);

  // Clone the cell with the passphrase-derived network seed
  const clonedCell = await appClient.createCloneCell({
    role_name: ROLE_NAME,
    modifiers: {
      network_seed: networkSeed,
    },
  });

  const cellId = clonedCell.cell_id;
  const cellIdString = cellIdToString(cellId);

  const network: Network = {
    cellId,
    cellIdString,
    name,
    passphrase: finalPassphrase,
    joinedAt: Date.now(),
    isActive: false,
  };

  // Persist to local storage
  await saveNetworkLocally(network);

  return { network, passphrase: finalPassphrase };
}

/**
 * Join an existing network using a passphrase.
 * This clones the sharefeed DNA with the same network seed as others who used the same passphrase.
 *
 * @param appClient - The Holochain app client
 * @param passphrase - The 5-word passphrase for the network
 * @param name - Optional display name (defaults to "Shared Feed")
 * @returns The joined network info
 */
export async function joinNetwork(
  appClient: AppClient,
  passphrase: string,
  name: string = 'Shared Feed'
): Promise<Network> {
  const networkSeed = passphraseToNetworkSeed(passphrase);

  // Clone the cell with the passphrase-derived network seed
  const clonedCell = await appClient.createCloneCell({
    role_name: ROLE_NAME,
    modifiers: {
      network_seed: networkSeed,
    },
  });

  const cellId = clonedCell.cell_id;
  const cellIdString = cellIdToString(cellId);

  const network: Network = {
    cellId,
    cellIdString,
    name,
    passphrase,
    joinedAt: Date.now(),
    isActive: false,
  };

  // Persist to local storage
  await saveNetworkLocally(network);

  return network;
}

/**
 * Get all networks (cloned cells) from the conductor.
 * Merges with locally stored data for names and passphrases.
 */
export async function getNetworks(appClient: AppClient): Promise<Network[]> {
  const appInfo = await appClient.appInfo();
  if (!appInfo) return [];

  const cells = appInfo.cell_info[ROLE_NAME] || [];
  const localData = await loadNetworksLocally();

  const networks: Network[] = [];

  for (const cell of cells) {
    // Only include cloned cells (not provisioned)
    if ('cloned' in cell) {
      const cloned = cell.cloned as ClonedCell;
      const cellId = cloned.cell_id;
      const cellIdString = cellIdToString(cellId);

      // Try to find local data for this cell
      const local = localData.find(n => n.cellIdString === cellIdString);

      // Extract passphrase from network_seed if not in local data
      let passphrase = local?.passphrase || '';
      if (!passphrase && cloned.dna_modifiers?.network_seed) {
        passphrase = networkSeedToPassphrase(cloned.dna_modifiers.network_seed);
      }

      networks.push({
        cellId,
        cellIdString,
        name: local?.name || cloned.name || 'Unnamed Network',
        passphrase,
        joinedAt: local?.joinedAt || Date.now(),
        isActive: false,
      });
    }
  }

  return networks;
}

/**
 * Disable (leave) a network.
 * The cell can be re-enabled later by joining with the same passphrase.
 */
export async function disableNetwork(appClient: AppClient, cellId: CellId): Promise<void> {
  // Use the DNA hash (first element of CellId) to identify the cloned cell
  await appClient.disableCloneCell({
    clone_cell_id: { type: 'dna_hash', value: cellId[0] },
  });

  // Remove from local storage
  const cellIdString = cellIdToString(cellId);
  await removeNetworkLocally(cellIdString);
}

/**
 * Enable a previously disabled network.
 */
export async function enableNetwork(appClient: AppClient, cellId: CellId): Promise<void> {
  // Use the DNA hash (first element of CellId) to identify the cloned cell
  await appClient.enableCloneCell({
    clone_cell_id: { type: 'dna_hash', value: cellId[0] },
  });
}

// ============= Local Storage Helpers =============

/**
 * Save network info to local storage.
 */
async function saveNetworkLocally(network: Network): Promise<void> {
  const data = await loadNetworksLocally();
  const existing = data.findIndex(n => n.cellIdString === network.cellIdString);

  const localData: NetworkLocalData = {
    cellIdString: network.cellIdString,
    name: network.name,
    passphrase: network.passphrase,
    joinedAt: network.joinedAt,
  };

  if (existing >= 0) {
    data[existing] = localData;
  } else {
    data.push(localData);
  }

  localStorage.setItem(NETWORKS_STORAGE_KEY, JSON.stringify(data));
}

/**
 * Load network info from local storage.
 */
async function loadNetworksLocally(): Promise<NetworkLocalData[]> {
  try {
    const stored = localStorage.getItem(NETWORKS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load networks from local storage:', e);
  }
  return [];
}

/**
 * Remove a network from local storage.
 */
async function removeNetworkLocally(cellIdString: string): Promise<void> {
  const data = await loadNetworksLocally();
  const filtered = data.filter(n => n.cellIdString !== cellIdString);
  localStorage.setItem(NETWORKS_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Update a network's name in local storage.
 */
export async function updateNetworkName(cellIdString: string, name: string): Promise<void> {
  const data = await loadNetworksLocally();
  const network = data.find(n => n.cellIdString === cellIdString);
  if (network) {
    network.name = name;
    localStorage.setItem(NETWORKS_STORAGE_KEY, JSON.stringify(data));
  }
}
