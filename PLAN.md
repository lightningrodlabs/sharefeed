# ShareFeed Implementation Plan

## Project Overview

ShareFeed is a browser extension + Holochain application for sharing URLs/content with groups. Target audience includes elderly family members (requiring accessible UI design).

**Tech Stack:**
- Browser extension: Chrome Manifest V3
- Frontend: Svelte/SvelteKit
- Backend: Holochain 0.6 (local source at `../holochain`)
- Desktop deployment: Kangaroo-Electron (local at `../kangaroo-electron`)

**User Requirements:**
- Context menu + popup for sharing
- Rich metadata capture (URL, title, selection, favicon, description, thumbnail)
- Large readable cards with thumbnails + accessibility settings

---

## Phase 1: Browser Extension with Local Storage ✓ (Completed)

### Directory Structure
```
sharefeed/
├── extension/
│   ├── manifest.json
│   ├── src/
│   │   ├── background/service-worker.ts
│   │   ├── popup/Popup.svelte, popup.ts, popup.html
│   │   ├── content/content-script.ts
│   │   ├── types/share.ts
│   │   ├── storage/local-storage.ts
│   │   └── utils/metadata.ts, screenshot.ts
│   └── tests/
├── package.json, vite.config.ts, tsconfig.json
```

### Core Type Definition
```typescript
interface ShareItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  selection?: string;
  favicon?: string;      // Base64 encoded
  thumbnail?: string;    // Base64 encoded
  sharedAt: number;
  sharedBy: string;
  feedId?: string;
  tags?: string[];
}
```

---

## Phase 2: Svelte Feed Reader UI ✓ (Completed)

### Directory Structure
```
sharefeed/
├── ui/
│   ├── src/lib/
│   │   ├── components/ShareCard.svelte, FeedList.svelte, AccessibilityPanel.svelte
│   │   ├── stores/shares.svelte.ts, settings.svelte.ts
│   │   ├── adapters/storage-adapter.ts, local-adapter.ts
│   │   └── types/index.ts
│   ├── src/routes/+page.svelte, +layout.svelte
│   └── tests/
```

### Accessibility Requirements (elderly-friendly)
- Minimum 18px base font, configurable to 32px
- High contrast mode
- Large touch targets (44px minimum)
- Thumbnail images at readable size (200px minimum)

---

## Phase 3: Holochain hApp (Current)

**Reference Project:** `../emergence` - follow its patterns for zome structure

### Directory Structure (following emergence pattern)
```
sharefeed/
├── Cargo.toml                    # Workspace root
├── dnas/
│   └── sharefeed/
│       ├── workdir/
│       │   └── dna.yaml
│       └── zomes/
│           ├── integrity/
│           │   ├── profiles/     # From holochain-open-dev
│           │   └── sharefeed/
│           │       ├── Cargo.toml
│           │       └── src/
│           │           ├── lib.rs
│           │           ├── share_item.rs
│           │           └── feed.rs
│           └── coordinator/
│               ├── profiles/     # From holochain-open-dev
│               └── sharefeed/
│                   ├── Cargo.toml
│                   └── src/
│                       ├── lib.rs
│                       ├── share_item.rs
│                       ├── feed.rs
│                       └── time_index.rs
├── workdir/
│   └── happ.yaml
└── tests/                        # Tryorama tests
```

### Dependencies (from emergence Cargo.toml)
```toml
[workspace.dependencies]
hdi = "0.7.0"
hdk = "0.6.0"
serde = "1"
holochain_serialized_bytes = "0.0.56"

# Profiles from holochain-open-dev
hc_zome_profiles_integrity = { git = "https://github.com/holochain-open-dev/profiles", branch = "main-0.6" }
hc_zome_profiles_coordinator = { git = "https://github.com/holochain-open-dev/profiles", branch = "main-0.6" }
```

### Entry Types (Integrity Zome)

```rust
// share_item.rs
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct ShareItem {
    pub url: String,
    pub title: String,
    pub description: Option<String>,
    pub selection: Option<String>,
    pub favicon: Option<String>,      // Base64 or could be EntryHash for file_storage
    pub thumbnail: Option<String>,    // Base64 or could be EntryHash
    pub tags: Vec<String>,
}

// feed.rs
#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Feed {
    pub name: String,
    pub description: Option<String>,
    pub stewards: Vec<AgentPubKey>,   // Feed owners/admins
    pub is_public: bool,
}

// Deletion: Use delete_link to remove shares from feeds
// No soft-delete "trashed" field needed

// lib.rs - consolidated entry types
#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    ShareItem(ShareItem),
    Feed(Feed),
}
```

### Link Types
```rust
#[derive(Serialize, Deserialize)]
#[hdk_link_types]
pub enum LinkTypes {
    // Time-based indexing (NOT "AllShares" - paginate by week)
    TimeIndex,           // path("shares/2025/01") → ShareItem

    // Updates chain for versioning
    ShareItemUpdates,    // original ShareItem → updated ShareItem
    FeedUpdates,         // original Feed → updated Feed

    // Feed membership
    FeedToShare,         // Feed → ShareItem (shares in a feed)
    AgentToFeed,         // Agent → Feed (my feeds)
    FeedToMember,        // Feed → Agent (feed members)

    // Relations (tagged links like emergence)
    Relations,
}
```

### Time-Based Indexing Strategy
Instead of `all_shares` path (which doesn't scale), use weekly buckets:
```rust
// Get path for a timestamp
fn time_path(timestamp: Timestamp) -> Path {
    let dt = timestamp.as_seconds_and_nanos().0;
    let year = /* extract year */;
    let week = /* extract ISO week */;
    Path::from(format!("shares/{}/{:02}", year, week))
}

// Create: link to time bucket
let path = time_path(sys_time()?);
create_link(path.path_entry_hash()?, share_hash, LinkTypes::TimeIndex, ())?;

// Query: fetch current week, then previous weeks as needed
fn get_shares_for_week(year: u32, week: u32) -> ExternResult<Vec<ShareItemInfo>> { ... }
```

### Coordinator Functions (following emergence CRUD pattern)

```rust
// share_item.rs
#[hdk_extern]
pub fn create_share_item(share: ShareItem) -> ExternResult<Record> { ... }

#[hdk_extern]
pub fn get_share_item(original_hash: ActionHash) -> ExternResult<Option<Record>> { ... }

#[hdk_extern]
pub fn update_share_item(input: UpdateShareItemInput) -> ExternResult<Record> { ... }

#[hdk_extern]
pub fn remove_share_from_feed(input: RemoveFromFeedInput) -> ExternResult<()> {
    // Uses delete_link to remove share from feed - no soft delete needed
    delete_link(input.link_hash)?;
    Ok(())
}

#[hdk_extern]
pub fn get_shares_for_time_range(input: TimeRangeInput) -> ExternResult<Vec<ShareItemInfo>> { ... }

// feed.rs
#[hdk_extern]
pub fn create_feed(feed: Feed) -> ExternResult<Record> { ... }

#[hdk_extern]
pub fn get_feed(hash: ActionHash) -> ExternResult<Option<Record>> { ... }

#[hdk_extern]
pub fn add_share_to_feed(input: AddToFeedInput) -> ExternResult<()> { ... }

#[hdk_extern]
pub fn get_feed_shares(feed_hash: ActionHash) -> ExternResult<Vec<ShareItemInfo>> { ... }
```

### Implementation Steps

**Approach: Scaffold fresh happ, then migrate existing UI components**

1. **Scaffold new happ with Svelte UI**
   ```bash
   cd /home/eric/code/metacurrency/holochain/sharefeed
   nix run "github:holochain/holonix?ref=main-0.6#hc-scaffold" -- web-app sharefeed
   # Select Svelte as UI framework
   ```

2. **Scaffold the ShareItem entry type**
   ```bash
   cd sharefeed  # the scaffolded directory
   nix run "github:holochain/holonix?ref=main-0.6#hc-scaffold" -- entry-type
   # Name: share_item
   # Fields: url (String), title (String), description (Option<String>),
   #         selection (Option<String>), favicon (Option<String>),
   #         thumbnail (Option<String>), tags (Vec<String>)
   ```

3. **Scaffold the Feed entry type**
   ```bash
   nix run "github:holochain/holonix?ref=main-0.6#hc-scaffold" -- entry-type
   # Name: feed
   # Fields: name (String), description (Option<String>), is_public (bool)
   ```

4. **Add link types for feed membership**
   ```bash
   nix run "github:holochain/holonix?ref=main-0.6#hc-scaffold" -- link-type
   # Add: FeedToShare, AgentToFeed, FeedToMember
   ```

5. **Customize coordinator zome**
   - Add time-based indexing (TimeIndex links to weekly path buckets)
   - Add feed management functions (add_share_to_feed, get_feed_shares)
   - Follow emergence patterns for CRUD

6. **Migrate existing UI components**
   - Copy components from old ui/src/lib/components/ to new ui/src/lib/
   - Copy stores from old ui/src/lib/stores/
   - Update imports and integrate with scaffolded structure

7. **Add profiles zome** (from holochain-open-dev)

8. **Build and test**
   ```bash
   npm run build:happ
   npm test  # Tryorama tests
   npm run dev  # Local development
   ```

### Post-Scaffold Cleanup
After migration is complete:
- Remove old `ui/` directory (replaced by scaffolded structure)
- Keep `extension/` as-is (will connect to conductor in Phase 5)
- The scaffolded happ becomes the new project root structure

### Key Reference Files (from emergence)
- `../emergence/Cargo.toml` - workspace setup
- `../emergence/dnas/emergence/zomes/integrity/emergence/src/lib.rs` - entry/link types
- `../emergence/dnas/emergence/zomes/coordinator/emergence/src/note.rs` - CRUD pattern
- `../emergence/dnas/emergence/workdir/dna.yaml` - DNA config
- `../emergence/workdir/happ.yaml` - hApp config

### Future: Time-Based Pagination (separate task)
See `../volla-messages/dnas/` for more sophisticated time-based path linking patterns. For MVP, simple weekly buckets are sufficient.

---

## Phase 4: Integrate UI with Holochain

### Holochain Client Setup
```typescript
// ui/src/lib/holochain/client.ts
import { AppWebsocket } from '@holochain/client';

let client: AppWebsocket | null = null;

export async function connect(): Promise<AppWebsocket> {
  const appPort = await window.__HC_LAUNCHER__.getAppPort();
  const token = await window.__HC_LAUNCHER__.getAppToken();
  client = await AppWebsocket.connect({ url: `ws://localhost:${appPort}`, token });
  return client;
}

export async function callZome(fnName: string, payload: any): Promise<any> {
  return client!.callZome({
    role_name: 'sharefeed',
    zome_name: 'sharefeed',
    fn_name: fnName,
    payload,
  });
}
```

### Implementation Steps
1. Add @holochain/client dependency
2. Create Holochain client module with connect/callZome helpers
3. Update Svelte stores to use callZome directly
4. Create web-happ.yaml manifest
5. Build webhapp: `hc web-app pack`
6. Test with `hc sandbox`

---

## Phase 5: Wire Extension to Conductor

### Extension Holochain Connection
```typescript
// extension/src/holochain/client.ts
import { AppWebsocket } from '@holochain/client';

const CONDUCTOR_PORT = 30001;  // Fixed for dev, configurable later

let client: AppWebsocket | null = null;

export async function connect(): Promise<void> {
  client = await AppWebsocket.connect(`ws://localhost:${CONDUCTOR_PORT}`);
}

export async function createShare(share: ShareItem): Promise<void> {
  await client!.callZome({
    role_name: 'sharefeed',
    zome_name: 'sharefeed',
    fn_name: 'create_share_item',
    payload: share,
  });
}
```

### Implementation Steps
1. Add @holochain/client to extension
2. Create Holochain client module for extension
3. Update service worker to call Holochain on share
4. Configure conductor port (fixed for dev)
5. Integration test: share from extension → view in UI
6. Handle Chrome MV3 service worker constraints

---

## Phase 6: Kangaroo Desktop Deployment

### Configuration
```typescript
// desktop/kangaroo.config.ts
export default defineConfig({
  appId: 'org.metacurrency.sharefeed',
  productName: 'ShareFeed',
  version: '0.1.0',
  systray: true,
  passwordMode: 'password-optional',
  bootstrapUrl: 'https://dev-test-bootstrap2.holochain.org/',
  signalUrl: 'wss://dev-test-bootstrap2.holochain.org/',
  // ...
});
```

### Directory Structure
```
sharefeed/
├── desktop/
│   ├── kangaroo.config.ts
│   ├── package.json
│   ├── pouch/sharefeed.webhapp
│   └── src/main/, preload/, renderer/
```

### Implementation Steps
1. Copy/adapt kangaroo-electron template to desktop/
2. Update kangaroo.config.ts for ShareFeed
3. Build webhapp and place in pouch/
4. Test with `yarn dev`
5. Build distributables: `yarn build:linux`, etc.
6. Test extension communication with desktop app

### Key Reference File
- `../kangaroo-electron/kangaroo.config.ts`

---

## Development Notes

- **TDD**: Write tests first for each component
- **User testing**: Required in real browser before commits
- **Holochain reference**: Use `../holochain` source, not web docs
- **LESSONS_LEARNED.md**: Check before any serialization work
- **Strong typing**: TypeScript strict mode throughout
