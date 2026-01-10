/**
 * Networks store for managing multiple sharing networks.
 * Each network is a cloned cell with its own DHT.
 */

import { writable, derived, get, type Readable } from 'svelte/store';
import type { CellId } from '@holochain/client';
import type { Network } from '$lib/types/network';
import {
  getAppClient,
  getClient,
  createNetwork as createNetworkApi,
  joinNetwork as joinNetworkApi,
  getNetworks as getNetworksApi,
  disableNetwork as disableNetworkApi,
  updateNetworkName as updateNetworkNameApi,
} from '$lib/holochain';
import { sharesStore } from './shares';

const browser = typeof window !== 'undefined';

interface NetworksStoreState {
  networks: Network[];
  activeNetworkId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: NetworksStoreState = {
  networks: [],
  activeNetworkId: null,
  loading: false,
  error: null,
};

// Local storage key for active network
const ACTIVE_NETWORK_KEY = 'sharefeed_active_network';

/**
 * Creates the networks store with Svelte 3 writable pattern.
 */
function createNetworksStore() {
  const _state = writable<NetworksStoreState>(initialState);

  // Derived store for active network
  const activeNetwork: Readable<Network | null> = derived(_state, ($state) =>
    $state.networks.find((n) => n.cellIdString === $state.activeNetworkId) || null
  );

  // Derived store for active CellId
  const activeCellId: Readable<CellId | null> = derived(activeNetwork, ($active) =>
    $active?.cellId || null
  );

  /**
   * Initialize the store by loading networks from the conductor.
   */
  async function init(): Promise<void> {
    if (!browser) return;

    _state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const appClient = getAppClient();
      if (!appClient) {
        throw new Error('Not connected to Holochain');
      }

      const networks = await getNetworksApi(appClient);

      // Restore active network from local storage
      let activeNetworkId = localStorage.getItem(ACTIVE_NETWORK_KEY);

      // If stored active network doesn't exist, use first network
      if (activeNetworkId && !networks.find((n) => n.cellIdString === activeNetworkId)) {
        activeNetworkId = null;
      }
      if (!activeNetworkId && networks.length > 0) {
        activeNetworkId = networks[0].cellIdString;
      }

      // Update isActive flag
      const networksWithActive = networks.map((n) => ({
        ...n,
        isActive: n.cellIdString === activeNetworkId,
      }));

      _state.set({
        networks: networksWithActive,
        activeNetworkId,
        loading: false,
        error: null,
      });

      // Update the ShareFeedClient with the active cell and load shares
      if (activeNetworkId) {
        const activeNet = networksWithActive.find((n) => n.cellIdString === activeNetworkId);
        if (activeNet) {
          const client = getClient();
          client?.setCellId(activeNet.cellId);
          // Switch to this network's shares (uses cache if available)
          await sharesStore.switchNetwork(activeNetworkId);
        }
      }
    } catch (err) {
      _state.update((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load networks',
      }));
      console.error('Failed to initialize networks store:', err);
    }
  }

  /**
   * Create a new network.
   */
  async function createNetwork(name: string, passphrase?: string): Promise<Network | null> {
    const appClient = getAppClient();
    if (!appClient) {
      _state.update((s) => ({ ...s, error: 'Not connected to Holochain' }));
      return null;
    }

    _state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const result = await createNetworkApi(appClient, name, passphrase);
      const network = result.network;

      _state.update((s) => ({
        ...s,
        networks: [...s.networks, network],
        loading: false,
      }));

      // Auto-switch to new network
      setActiveNetwork(network.cellIdString);

      return network;
    } catch (err) {
      _state.update((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to create network',
      }));
      console.error('Failed to create network:', err);
      return null;
    }
  }

  /**
   * Join an existing network.
   */
  async function joinNetwork(passphrase: string, name?: string): Promise<Network | null> {
    const appClient = getAppClient();
    if (!appClient) {
      _state.update((s) => ({ ...s, error: 'Not connected to Holochain' }));
      return null;
    }

    _state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const network = await joinNetworkApi(appClient, passphrase, name);

      _state.update((s) => ({
        ...s,
        networks: [...s.networks, network],
        loading: false,
      }));

      // Auto-switch to joined network
      setActiveNetwork(network.cellIdString);

      return network;
    } catch (err) {
      _state.update((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to join network',
      }));
      console.error('Failed to join network:', err);
      return null;
    }
  }

  /**
   * Set the active network.
   * Uses cached shares for instant display, then refreshes in background.
   */
  async function setActiveNetwork(cellIdString: string): Promise<void> {
    const state = get(_state);
    const network = state.networks.find((n) => n.cellIdString === cellIdString);
    if (!network) return;

    // Update ShareFeedClient with new cell
    const client = getClient();
    client?.setCellId(network.cellId);

    // Persist to local storage
    localStorage.setItem(ACTIVE_NETWORK_KEY, cellIdString);

    _state.update((s) => ({
      ...s,
      activeNetworkId: cellIdString,
      networks: s.networks.map((n) => ({
        ...n,
        isActive: n.cellIdString === cellIdString,
      })),
    }));

    // Switch to this network's shares (uses cache if available, refreshes in background)
    await sharesStore.switchNetwork(cellIdString);
  }

  /**
   * Leave (disable) a network.
   */
  async function leaveNetwork(cellIdString: string): Promise<void> {
    const appClient = getAppClient();
    if (!appClient) return;

    const state = get(_state);
    const network = state.networks.find((n) => n.cellIdString === cellIdString);
    if (!network) return;

    try {
      await disableNetworkApi(appClient, network.cellId);

      _state.update((s) => {
        const remaining = s.networks.filter((n) => n.cellIdString !== cellIdString);

        // If leaving active network, switch to another
        let newActiveId = s.activeNetworkId;
        if (s.activeNetworkId === cellIdString) {
          newActiveId = remaining[0]?.cellIdString || null;
          localStorage.setItem(ACTIVE_NETWORK_KEY, newActiveId || '');

          // Update client
          const client = getClient();
          const newActive = remaining.find((n) => n.cellIdString === newActiveId);
          client?.setCellId(newActive?.cellId || null);
        }

        return {
          ...s,
          networks: remaining.map((n) => ({
            ...n,
            isActive: n.cellIdString === newActiveId,
          })),
          activeNetworkId: newActiveId,
        };
      });
    } catch (err) {
      console.error('Failed to leave network:', err);
      _state.update((s) => ({
        ...s,
        error: err instanceof Error ? err.message : 'Failed to leave network',
      }));
    }
  }

  /**
   * Update a network's name.
   */
  async function updateName(cellIdString: string, name: string): Promise<void> {
    await updateNetworkNameApi(cellIdString, name);

    _state.update((s) => ({
      ...s,
      networks: s.networks.map((n) =>
        n.cellIdString === cellIdString ? { ...n, name } : n
      ),
    }));
  }

  /**
   * Refresh the networks list from the conductor.
   */
  async function refresh(): Promise<void> {
    await init();
  }

  /**
   * Reset the store.
   */
  function reset(): void {
    _state.set(initialState);
  }

  return {
    subscribe: _state.subscribe,
    activeNetwork,
    activeCellId,
    init,
    createNetwork,
    joinNetwork,
    setActiveNetwork,
    leaveNetwork,
    updateName,
    refresh,
    reset,
  };
}

export const networksStore = createNetworksStore();

/**
 * Initialize the networks store.
 * Call this from App.svelte after connecting to Holochain.
 */
export async function initNetworksStore(): Promise<void> {
  await networksStore.init();
}
