# ShareFeed Multi-Network Support Plan

## Overview

This plan implements support for multiple "sharing networks" in ShareFeed, following the Acorn pattern where each network corresponds to a separate Holochain cell. Users can create and join networks using secret words (5-word passphrases), enabling private sharing groups.

## Current State

- Single DNA with `clone_limit: 0` (no cloning)
- Extension connects to fixed ports, single network
- UI stores are singletons for single network
- No network management UI

## Target State

- DNA cloning enabled with deferred provisioning
- Multiple networks managed via CellId array
- Secret words (passphrase) for network discovery
- Network switcher in both UI and extension popup

---

## Phase 1: Holochain Configuration Changes

### 1.1 Update happ.yaml

**File:** `workdir/happ.yaml`

```yaml
manifest_version: "0"
name: sharefeed
roles:
  - name: sharefeed
    provisioning:
      strategy: create
      deferred: true        # Changed: cells created on-demand
    dna:
      path: ../dnas/sharefeed/workdir/sharefeed.dna
      clone_limit: 999      # Changed: allow up to 999 networks
      modifiers:
        network_seed: ~
        properties: ~
        quantum_time: ~
```

### 1.2 Update DNA Init (Optional Enhancement)

Consider adding an init callback to the coordinator zome that announces new members to the network. This enables real-time presence awareness.

**File:** `dnas/sharefeed/zomes/coordinator/sharefeed/src/lib.rs`

Add:
```rust
#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    // Create capability grant for receiving signals
    // Announce presence to network peers
    Ok(InitCallbackResult::Pass)
}
```

---

## Phase 2: Network Management Core (UI)

### 2.1 Secret Words Implementation

**New File:** `ui/src/lib/secrets.ts`

```typescript
// Passphrase generation using diceware
export async function generatePassphrase(): Promise<string> {
  const { default: randomWord } = await import('diceware-word')
  return `${randomWord()} ${randomWord()} ${randomWord()} ${randomWord()} ${randomWord()}`
}

// Convert passphrase to network seed (UID)
export function passphraseToNetworkSeed(passphrase: string): string {
  return `sharefeed-${passphrase.split(' ').join('-')}`
}

// Convert network seed back to passphrase
export function networkSeedToPassphrase(seed: string): string {
  return seed.replace('sharefeed-', '').split('-').join(' ')
}

// Validate passphrase format (5 words)
export function validatePassphrase(passphrase: string): boolean {
  const words = passphrase.trim().split(/\s+/)
  return words.length === 5 && words.every(w => w.length > 0)
}
```

### 2.2 Network Types

**New File:** `ui/src/lib/types/network.ts`

```typescript
import type { CellId } from '@holochain/client'

export interface Network {
  cellId: CellId
  cellIdString: string
  name: string
  passphrase: string
  createdAt: number
  isActive: boolean
}

export interface NetworkInfo {
  network: Network
  memberCount?: number
  shareCount?: number
}
```

### 2.3 Network Management Functions

**New File:** `ui/src/lib/holochain/networks.ts`

```typescript
import { AppClient, CellId, CellType } from '@holochain/client'
import { passphraseToNetworkSeed, generatePassphrase } from '../secrets'
import { cellIdToString, cellIdFromString } from './utils'

const ROLE_NAME = 'sharefeed'

export async function createNetwork(
  appClient: AppClient,
  name: string,
  passphrase?: string
): Promise<{ cellId: CellId; passphrase: string }> {
  const finalPassphrase = passphrase || await generatePassphrase()
  const networkSeed = passphraseToNetworkSeed(finalPassphrase)

  const clonedCell = await appClient.createCloneCell({
    role_name: ROLE_NAME,
    modifiers: {
      network_seed: networkSeed,
    },
  })

  return {
    cellId: clonedCell.cell_id,
    passphrase: finalPassphrase,
  }
}

export async function joinNetwork(
  appClient: AppClient,
  passphrase: string
): Promise<CellId> {
  const networkSeed = passphraseToNetworkSeed(passphrase)

  const clonedCell = await appClient.createCloneCell({
    role_name: ROLE_NAME,
    modifiers: {
      network_seed: networkSeed,
    },
  })

  return clonedCell.cell_id
}

export async function getNetworks(appClient: AppClient): Promise<CellId[]> {
  const appInfo = await appClient.appInfo()
  if (!appInfo) return []

  const cells = appInfo.cell_info[ROLE_NAME] || []
  return cells
    .filter(cell => 'cloned' in cell)
    .map(cell => (cell as { cloned: { cell_id: CellId } }).cloned.cell_id)
}

export async function disableNetwork(
  appClient: AppClient,
  cellId: CellId
): Promise<void> {
  await appClient.disableCloneCell({
    clone_cell_id: cellId,
  })
}
```

### 2.4 Networks Store

**New File:** `ui/src/lib/stores/networks.ts`

```typescript
import { writable, derived, get } from 'svelte/store'
import type { CellId } from '@holochain/client'
import type { Network, NetworkInfo } from '../types/network'
import { cellIdToString } from '../holochain/utils'

interface NetworksState {
  networks: Network[]
  activeNetworkId: string | null
  loading: boolean
  error: string | null
}

const initialState: NetworksState = {
  networks: [],
  activeNetworkId: null,
  loading: false,
  error: null,
}

function createNetworksStore() {
  const { subscribe, set, update } = writable<NetworksState>(initialState)

  return {
    subscribe,

    addNetwork(network: Network) {
      update(state => ({
        ...state,
        networks: [...state.networks, network],
      }))
    },

    removeNetwork(cellIdString: string) {
      update(state => ({
        ...state,
        networks: state.networks.filter(n => n.cellIdString !== cellIdString),
        activeNetworkId: state.activeNetworkId === cellIdString
          ? state.networks[0]?.cellIdString || null
          : state.activeNetworkId,
      }))
    },

    setActiveNetwork(cellIdString: string) {
      update(state => ({
        ...state,
        activeNetworkId: cellIdString,
        networks: state.networks.map(n => ({
          ...n,
          isActive: n.cellIdString === cellIdString,
        })),
      }))
    },

    setNetworks(networks: Network[]) {
      update(state => ({
        ...state,
        networks,
        activeNetworkId: networks.find(n => n.isActive)?.cellIdString || networks[0]?.cellIdString || null,
      }))
    },

    setLoading(loading: boolean) {
      update(state => ({ ...state, loading }))
    },

    setError(error: string | null) {
      update(state => ({ ...state, error }))
    },

    reset() {
      set(initialState)
    },
  }
}

export const networksStore = createNetworksStore()

// Derived store for active network
export const activeNetwork = derived(
  networksStore,
  $networks => $networks.networks.find(n => n.cellIdString === $networks.activeNetworkId) || null
)

// Derived store for active CellId
export const activeCellId = derived(
  activeNetwork,
  $active => $active?.cellId || null
)
```

### 2.5 Update ShareFeedClient for Multi-Cell

**Update:** `ui/src/lib/holochain/client.ts`

Add support for specifying which cell to call:

```typescript
export class ShareFeedClient {
  private appClient: AppClient
  private cellId: CellId | null = null

  constructor(appClient: AppClient, cellId?: CellId) {
    this.appClient = appClient
    this.cellId = cellId || null
  }

  setCellId(cellId: CellId) {
    this.cellId = cellId
  }

  private async callZome<T>(fnName: string, payload: unknown = null): Promise<T> {
    if (!this.cellId) {
      throw new Error('No cell ID set - select a network first')
    }
    return this.appClient.callZome({
      cell_id: this.cellId,
      zome_name: 'sharefeed',
      fn_name: fnName,
      payload,
    })
  }

  // ... existing methods unchanged
}
```

---

## Phase 3: UI Components

### 3.1 Network Management Modal

**New File:** `ui/src/lib/components/NetworkModal.svelte`

A modal for creating or joining networks:
- Create tab: Enter network name, generates passphrase, shows copy button
- Join tab: Enter 5-word passphrase, validates format
- Display success/error states

### 3.2 Network Switcher Component

**New File:** `ui/src/lib/components/NetworkSwitcher.svelte`

Dropdown or sidebar showing:
- List of joined networks with names
- Current active network highlighted
- "Create Network" button
- "Join Network" button
- Click to switch active network

### 3.3 Network Settings Panel

**New File:** `ui/src/lib/components/NetworkSettings.svelte`

For each network:
- Display network name (editable)
- Display secret words (with copy button)
- Member count
- Leave network option

### 3.4 Update App.svelte

Integrate network management into main app:
- Initialize networks on connect
- Show network switcher in header
- Pass active cellId to stores
- Handle no-network state (prompt to create/join)

---

## Phase 4: Extension Updates

### 4.1 Extension Types

**Update:** `extension/src/types/share.ts`

```typescript
export interface NetworkInfo {
  cellIdString: string
  name: string
  isActive: boolean
}

export interface ExtensionMessage {
  // ... existing types
  type: 'GET_NETWORKS' | 'SET_ACTIVE_NETWORK' | 'SHARE_ITEM' | ...
}
```

### 4.2 Network Retrieval in Storage Adapter

**Update:** `extension/src/storage/holochain-storage.ts`

```typescript
export class HolochainStorageAdapter implements StorageAdapter {
  // ... existing code

  async getNetworks(): Promise<NetworkInfo[]> {
    const client = await this.getClient()
    const appInfo = await client.appInfo()
    if (!appInfo) return []

    const cells = appInfo.cell_info['sharefeed'] || []
    return cells
      .filter(cell => 'cloned' in cell)
      .map(cell => {
        const cloned = (cell as any).cloned
        return {
          cellIdString: cellIdToString(cloned.cell_id),
          name: cloned.name || 'Unnamed Network',
          isActive: false,
        }
      })
  }

  setActiveCell(cellIdString: string) {
    this.activeCellId = cellIdFromString(cellIdString)
  }
}
```

### 4.3 Network Selector in Popup

**Update:** `extension/src/popup/Popup.svelte`

Add network selection UI:
- Dropdown showing available networks
- Fetch networks on popup open
- Store selected network in chrome.storage.local
- Pass selected network when sharing

### 4.4 Service Worker Updates

**Update:** `extension/src/background/service-worker.ts`

Handle new message types:
- `GET_NETWORKS`: Return list of networks from Holochain
- `SET_ACTIVE_NETWORK`: Update active network for sharing
- Update `SHARE_ITEM` to use selected network

---

## Phase 5: Testing

### 5.1 Unit Tests

- `secrets.ts`: Passphrase generation, conversion, validation
- `networks.ts`: Create, join, list, disable networks
- `networksStore`: State management operations

### 5.2 Integration Tests

- Multi-cell creation and isolation
- Cross-network share isolation (shares don't leak)
- Network joining with same passphrase connects to same DHT

### 5.3 E2E Tests

- Extension network selection flow
- UI network switching
- Share appears in correct network only

---

## Implementation Order

1. **Phase 1** - Holochain config (enables cloning)
2. **Phase 2.1-2.3** - Core types and secrets
3. **Phase 2.4-2.5** - Stores and client updates
4. **Phase 3** - UI components
5. **Phase 4** - Extension updates
6. **Phase 5** - Testing throughout

---

## Dependencies to Add

### UI (package.json)
```json
{
  "dependencies": {
    "diceware-word": "^2.0.0"
  }
}
```

### Extension (package.json)
No new dependencies needed - uses existing Holochain client.

---

## Risk Considerations

1. **Passphrase Security**: 5-word diceware provides ~64 bits of entropy. For higher security groups, consider supporting longer passphrases.

2. **Network Discovery**: Networks are only discoverable via passphrase sharing. No public directory (by design).

3. **Clone Limit**: 999 networks per user should be sufficient. Can increase if needed.

4. **Extension-UI Sync**: Both need to track active network. Consider shared storage (chrome.storage.local) for consistency.

---

## Open Questions

1. Should networks have editable metadata (name, description) stored in the DHT?
2. Should there be network-level access control beyond "has passphrase"?
3. How to handle network deletion vs. just leaving/disabling?
4. Should the extension show a network indicator when sharing?
