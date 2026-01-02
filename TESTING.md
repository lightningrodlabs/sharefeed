# ShareFeed Testing Guide

This document covers all testing approaches for the ShareFeed project.

## Prerequisites

Enter the nix development shell:
```bash
nix develop
```

This provides all necessary tools including Holochain CLI, Rust toolchain, and Node.js.

## Running All Tests

```bash
# Run all tests (unit + integration)
npm test

# Run only unit tests (extension + UI)
npm run test:unit

# Run only integration tests (sweettest)
npm run test:integration
```

---

## Unit Tests

### Extension Tests (19 tests)

```bash
# From project root
npm run test:extension

# Or from extension directory
cd extension && npm run test:run
```

Test files:
- `extension/src/types/share.test.ts` - Type definitions
- `extension/src/utils/metadata.test.ts` - Metadata extraction
- `extension/src/storage/local-storage.test.ts` - Storage adapter

### UI Tests (2 tests)

```bash
# From project root
npm run test:ui

# Or from ui directory
cd ui && npm run test:run
```

Test files:
- `ui/src/lib/types/index.test.ts` - Accessibility settings defaults

---

## Integration Tests (Sweettest)

Sweettest tests run against the actual Holochain conductor with the compiled DNA.

### Build the DNA First

```bash
# Build zomes (includes required RUSTFLAGS for wasm)
npm run build:zomes

# Pack the DNA
npm run pack:dna
```

Or build all at once:
```bash
npm run build:happ
```

This creates `dnas/sharefeed/workdir/sharefeed.dna` and `workdir/sharefeed.happ`.

### Run Sweettest

```bash
# From project root
npm run test:integration

# Or directly with cargo
cargo test -p sharefeed_tests

# Run specific test
cargo test -p sharefeed_tests can_create_and_get_share_item

# Run with output
cargo test -p sharefeed_tests -- --nocapture
```

### Sweettest Coverage (6 tests)

**ShareItem Tests:**
- `can_create_and_get_share_item` - Create and retrieve a share item
- `can_get_recent_shares` - Get shares via time-based indexing
- `share_item_requires_url_and_title` - Validation rejects empty fields

**Feed Tests:**
- `can_create_and_get_feed` - Create and retrieve a feed
- `can_get_my_feeds` - Get agent's feeds
- `can_add_share_to_feed` - Add share to feed and retrieve

---

## Building

```bash
# Build everything
npm run build

# Build individual components
npm run build:extension  # Browser extension
npm run build:ui         # Svelte UI
npm run build:happ       # Holochain hApp (zomes + DNA + hApp)

# Build web-happ (UI + hApp bundled)
npm run pack:webhapp     # Creates workdir/sharefeed.webhapp
```

---

## Manual Testing with hc-spin

**Prerequisites:** You must be inside the nix development shell for manual testing:

```bash
nix develop
```

This provides `holochain`, `lair-keystore`, `hc-spin`, and other required binaries.

### Running the App

```bash
# Single agent (for basic testing)
npm start

# Two agents (for multi-user testing)
npm run start:2
```

This will:
1. Clean any existing sandbox
2. Build the hApp (zomes + DNA + hApp packaging)
3. Start the Svelte UI dev server on port 1420
4. Launch hc-spin with the configured number of agents

The UI will be available at the URLs shown by hc-spin (typically `http://localhost:1420?APP_WS_PORT=...`).

### What to Test Manually

1. **Share Creation**: Create a new share with URL, title, description
2. **Share List**: Verify shares appear in the feed
3. **Multi-Agent Sync** (with `npm run start:2`): Create share on one agent, verify it appears on the other

---

## Component-Specific Testing

See component-specific testing guides:
- `extension/TESTING.md` - Browser extension manual tests
- `ui/TESTING.md` - UI component manual tests

---

## Test Summary

| Component | Framework | Tests | Command |
|-----------|-----------|-------|---------|
| Extension | Vitest | 19 | `npm run test:extension` |
| UI | Vitest | 2 | `npm run test:ui` |
| Holochain | Sweettest | 6 | `npm run test:integration` |
| **Total** | | **27** | `npm test` |
