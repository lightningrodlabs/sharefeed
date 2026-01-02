// Sweettest integration tests for ShareFeed
//
// Prerequisites:
// 1. Build the DNA first: `npm run build:zomes && npm run pack:dna`
// 2. Run tests: `npm run test:integration`

#[cfg(test)]
mod common {
    use holochain::sweettest::SweetDnaFile;
    use holochain_types::prelude::*;
    use std::path::PathBuf;

    /// Path to the built DNA bundle
    pub fn dna_path() -> PathBuf {
        let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
        PathBuf::from(manifest_dir)
            .parent()
            .unwrap()
            .join("dnas/sharefeed/workdir/sharefeed.dna")
    }

    /// Helper to load the ShareFeed DNA
    pub async fn load_dna() -> DnaFile {
        SweetDnaFile::from_bundle(&dna_path()).await.unwrap()
    }
}

// Define types that match zome types for serialization
// These must match the types in sharefeed_integrity
mod types {
    use holochain_types::prelude::*;

    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
    pub struct ShareItem {
        pub url: String,
        pub title: String,
        pub description: Option<String>,
        pub selection: Option<String>,
        pub favicon: Option<String>,
        pub thumbnail: Option<String>,
        pub tags: Vec<String>,
    }

    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
    pub struct Feed {
        pub name: String,
        pub description: Option<String>,
        pub stewards: Vec<AgentPubKey>,
        pub is_public: bool,
    }

    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
    pub struct ShareItemInfo {
        pub action_hash: ActionHash,
        pub share_item: ShareItem,
        pub created_at: Timestamp,
        pub author: AgentPubKey,
    }

    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
    pub struct FeedInfo {
        pub action_hash: ActionHash,
        pub feed: Feed,
        pub created_at: Timestamp,
    }

    #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
    pub struct AddShareToFeedInput {
        pub feed_hash: ActionHash,
        pub share_item_hash: ActionHash,
    }
}

#[cfg(test)]
mod share_item_tests {
    use crate::common::load_dna;
    use crate::types::*;
    use holochain::sweettest::SweetConductor;
    use holochain_types::prelude::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn can_create_and_get_share_item() {
        holochain_trace::test_run();

        let mut conductor = SweetConductor::from_standard_config().await;
        let dna = load_dna().await;

        let app = conductor
            .setup_app("sharefeed", [&dna])
            .await
            .unwrap();

        let (cell,) = app.into_tuple();

        let share_item = ShareItem {
            url: "https://example.com/article".to_string(),
            title: "Test Article".to_string(),
            description: Some("A test article description".to_string()),
            selection: None,
            favicon: None,
            thumbnail: None,
            tags: vec!["test".to_string()],
        };

        // Create a share item
        let record: Record = conductor
            .call(&cell.zome("sharefeed"), "create_share_item", share_item.clone())
            .await;

        let action_hash = record.action_hashed().hash.clone();

        // Get the share item
        let retrieved: Option<Record> = conductor
            .call(&cell.zome("sharefeed"), "get_share_item", action_hash.clone())
            .await;

        assert!(retrieved.is_some());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn can_get_recent_shares() {
        holochain_trace::test_run();

        let mut conductor = SweetConductor::from_standard_config().await;
        let dna = load_dna().await;

        let app = conductor
            .setup_app("sharefeed", [&dna])
            .await
            .unwrap();

        let (cell,) = app.into_tuple();

        // Create multiple share items
        for i in 0..3 {
            let share_item = ShareItem {
                url: format!("https://example.com/article-{}", i),
                title: format!("Test Article {}", i),
                description: None,
                selection: None,
                favicon: None,
                thumbnail: None,
                tags: vec![],
            };

            let _record: Record = conductor
                .call(&cell.zome("sharefeed"), "create_share_item", share_item)
                .await;
        }

        // Get recent shares
        let shares: Vec<ShareItemInfo> = conductor
            .call(&cell.zome("sharefeed"), "get_recent_shares", ())
            .await;

        assert_eq!(shares.len(), 3);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn share_item_requires_url_and_title() {
        holochain_trace::test_run();

        let mut conductor = SweetConductor::from_standard_config().await;
        let dna = load_dna().await;

        let app = conductor
            .setup_app("sharefeed", [&dna])
            .await
            .unwrap();

        let (cell,) = app.into_tuple();

        // Try to create with empty URL - should fail validation
        let invalid_share = ShareItem {
            url: "".to_string(),
            title: "Test".to_string(),
            description: None,
            selection: None,
            favicon: None,
            thumbnail: None,
            tags: vec![],
        };

        let result: Result<Record, _> = conductor
            .call_fallible(&cell.zome("sharefeed"), "create_share_item", invalid_share)
            .await;

        assert!(result.is_err());
    }
}

#[cfg(test)]
mod feed_tests {
    use crate::common::load_dna;
    use crate::types::*;
    use holochain::sweettest::SweetConductor;
    use holochain_types::prelude::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn can_create_and_get_feed() {
        holochain_trace::test_run();

        let mut conductor = SweetConductor::from_standard_config().await;
        let dna = load_dna().await;

        let app = conductor
            .setup_app("sharefeed", [&dna])
            .await
            .unwrap();

        let (cell,) = app.into_tuple();

        let agent_pubkey = cell.agent_pubkey().clone();

        let feed = Feed {
            name: "Family Links".to_string(),
            description: Some("Links shared with family".to_string()),
            stewards: vec![agent_pubkey],
            is_public: false,
        };

        // Create a feed
        let record: Record = conductor
            .call(&cell.zome("sharefeed"), "create_feed", feed.clone())
            .await;

        let feed_hash = record.action_hashed().hash.clone();

        // Get the feed
        let retrieved: Option<Record> = conductor
            .call(&cell.zome("sharefeed"), "get_feed", feed_hash)
            .await;

        assert!(retrieved.is_some());
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn can_get_my_feeds() {
        holochain_trace::test_run();

        let mut conductor = SweetConductor::from_standard_config().await;
        let dna = load_dna().await;

        let app = conductor
            .setup_app("sharefeed", [&dna])
            .await
            .unwrap();

        let (cell,) = app.into_tuple();

        let agent_pubkey = cell.agent_pubkey().clone();

        // Create two feeds
        for name in ["Feed 1", "Feed 2"] {
            let feed = Feed {
                name: name.to_string(),
                description: None,
                stewards: vec![agent_pubkey.clone()],
                is_public: true,
            };

            let _record: Record = conductor
                .call(&cell.zome("sharefeed"), "create_feed", feed)
                .await;
        }

        // Get my feeds
        let feeds: Vec<FeedInfo> = conductor
            .call(&cell.zome("sharefeed"), "get_my_feeds", ())
            .await;

        assert_eq!(feeds.len(), 2);
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn can_add_share_to_feed() {
        holochain_trace::test_run();

        let mut conductor = SweetConductor::from_standard_config().await;
        let dna = load_dna().await;

        let app = conductor
            .setup_app("sharefeed", [&dna])
            .await
            .unwrap();

        let (cell,) = app.into_tuple();

        let agent_pubkey = cell.agent_pubkey().clone();

        // Create a feed
        let feed = Feed {
            name: "Test Feed".to_string(),
            description: None,
            stewards: vec![agent_pubkey],
            is_public: true,
        };

        let feed_record: Record = conductor
            .call(&cell.zome("sharefeed"), "create_feed", feed)
            .await;

        let feed_hash = feed_record.action_hashed().hash.clone();

        // Create a share item
        let share_item = ShareItem {
            url: "https://example.com".to_string(),
            title: "Example".to_string(),
            description: None,
            selection: None,
            favicon: None,
            thumbnail: None,
            tags: vec![],
        };

        let share_record: Record = conductor
            .call(&cell.zome("sharefeed"), "create_share_item", share_item)
            .await;

        let share_hash = share_record.action_hashed().hash.clone();

        // Add share to feed
        let _: () = conductor
            .call(
                &cell.zome("sharefeed"),
                "add_share_to_feed",
                AddShareToFeedInput {
                    feed_hash: feed_hash.clone(),
                    share_item_hash: share_hash,
                },
            )
            .await;

        // Get feed shares
        let shares: Vec<ShareItemInfo> = conductor
            .call(&cell.zome("sharefeed"), "get_feed_shares", feed_hash)
            .await;

        assert_eq!(shares.len(), 1);
        assert_eq!(shares[0].share_item.url, "https://example.com");
    }
}
