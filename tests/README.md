# ShareFeed Sweettest Tests

Integration tests for the ShareFeed Holochain hApp using the sweettest framework.

> **Note:** For full project testing documentation, see the root [TESTING.md](../TESTING.md).

## Prerequisites

Enter the nix development shell (from project root):
```bash
nix develop
```

## Building the DNA

Before running tests, build the DNA bundle:

```bash
# From project root
npm run build:zomes   # Build Rust zomes
npm run pack:dna      # Pack the DNA
```

Or manually:
```bash
cargo build --release --target wasm32-unknown-unknown
hc dna pack dnas/sharefeed/workdir
```

This creates `dnas/sharefeed/workdir/sharefeed.dna`.

## Running Tests

```bash
# From project root (recommended)
npm run test:integration

# Or directly with cargo
cargo test -p sharefeed_tests

# Run with output
cargo test -p sharefeed_tests -- --nocapture

# Run a specific test
cargo test -p sharefeed_tests can_create_and_get_share_item
```

## Test Coverage

### ShareItem Tests
- `can_create_and_get_share_item` - Create and retrieve a share item
- `can_get_recent_shares` - Get recent shares via time-based indexing
- `share_item_requires_url_and_title` - Validation rejects empty URL/title

### Feed Tests
- `can_create_and_get_feed` - Create and retrieve a feed
- `can_get_my_feeds` - Get feeds created by the agent
- `can_add_share_to_feed` - Add a share item to a feed and retrieve feed shares

## Notes

- Tests use `SweetConductor::from_standard_config()` for single-agent tests
- The DNA is loaded from the pre-built bundle at `dnas/sharefeed/workdir/sharefeed.dna`
- All tests run with `#[tokio::test(flavor = "multi_thread")]` for async support
