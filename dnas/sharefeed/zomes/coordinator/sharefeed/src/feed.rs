use hdk::prelude::*;
use sharefeed_integrity::*;

use crate::share_item::ShareItemInfo;

#[hdk_extern]
pub fn create_feed(feed: Feed) -> ExternResult<Record> {
    let feed_hash = create_entry(&EntryTypes::Feed(feed.clone()))?;

    // Link from agent to feed (my feeds)
    let agent_info = agent_info()?;
    create_link(
        agent_info.agent_initial_pubkey.clone(),
        feed_hash.clone(),
        LinkTypes::AgentToFeed,
        (),
    )?;

    // Link from feed to all stewards as members
    for steward in &feed.stewards {
        create_link(
            feed_hash.clone(),
            steward.clone(),
            LinkTypes::FeedToMember,
            (),
        )?;
    }

    let record = get(feed_hash.clone(), GetOptions::local())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly created Feed"))
    ))?;
    Ok(record)
}

#[hdk_extern]
pub fn get_feed(original_feed_hash: ActionHash) -> ExternResult<Option<Record>> {
    let links = get_links(
        LinkQuery::try_new(original_feed_hash.clone(), LinkTypes::FeedUpdates)?,
        GetStrategy::Local,
    )?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_feed_hash = match latest_link {
        Some(link) => ActionHash::try_from(link.target.clone()).map_err(|err| wasm_error!(err))?,
        None => original_feed_hash.clone(),
    };
    get(latest_feed_hash, GetOptions::local())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateFeedInput {
    pub original_feed_hash: ActionHash,
    pub previous_feed_hash: ActionHash,
    pub updated_feed: Feed,
}

#[hdk_extern]
pub fn update_feed(input: UpdateFeedInput) -> ExternResult<Record> {
    let updated_feed_hash = update_entry(input.previous_feed_hash.clone(), &input.updated_feed)?;
    create_link(
        input.original_feed_hash.clone(),
        updated_feed_hash.clone(),
        LinkTypes::FeedUpdates,
        (),
    )?;
    let record = get(updated_feed_hash.clone(), GetOptions::local())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly updated Feed"))
    ))?;
    Ok(record)
}

#[hdk_extern]
pub fn delete_feed(original_feed_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(original_feed_hash)
}

// Feed membership operations

#[derive(Serialize, Deserialize, Debug)]
pub struct AddShareToFeedInput {
    pub feed_hash: ActionHash,
    pub share_item_hash: ActionHash,
}

#[hdk_extern]
pub fn add_share_to_feed(input: AddShareToFeedInput) -> ExternResult<()> {
    create_link(
        input.feed_hash,
        input.share_item_hash,
        LinkTypes::FeedToShare,
        (),
    )?;
    Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RemoveShareFromFeedInput {
    pub link_hash: ActionHash,
}

#[hdk_extern]
pub fn remove_share_from_feed(input: RemoveShareFromFeedInput) -> ExternResult<()> {
    delete_link(input.link_hash, GetOptions::local())?;
    Ok(())
}

#[hdk_extern]
pub fn get_feed_shares(feed_hash: ActionHash) -> ExternResult<Vec<ShareItemInfo>> {
    let links = get_links(
        LinkQuery::try_new(feed_hash, LinkTypes::FeedToShare)?,
        GetStrategy::Local,
    )?;

    let mut share_items: Vec<ShareItemInfo> = Vec::new();
    for link in links {
        let action_hash =
            ActionHash::try_from(link.target.clone()).map_err(|err| wasm_error!(err))?;
        if let Some(record) = get(action_hash.clone(), GetOptions::local())? {
            if let Some(share_item) = record
                .entry()
                .to_app_option::<ShareItem>()
                .map_err(|e| wasm_error!(e))?
            {
                share_items.push(ShareItemInfo {
                    action_hash,
                    share_item,
                    created_at: link.timestamp,
                    author: record.action().author().clone(),
                });
            }
        }
    }

    // Sort by created_at descending (newest first)
    share_items.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(share_items)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FeedInfo {
    pub action_hash: ActionHash,
    pub feed: Feed,
    pub created_at: Timestamp,
}

#[hdk_extern]
pub fn get_my_feeds(_: ()) -> ExternResult<Vec<FeedInfo>> {
    let agent_info = agent_info()?;
    let links = get_links(
        LinkQuery::try_new(agent_info.agent_initial_pubkey, LinkTypes::AgentToFeed)?,
        GetStrategy::Local,
    )?;

    let mut feeds: Vec<FeedInfo> = Vec::new();
    for link in links {
        let action_hash =
            ActionHash::try_from(link.target.clone()).map_err(|err| wasm_error!(err))?;
        if let Some(record) = get(action_hash.clone(), GetOptions::local())? {
            if let Some(feed) = record
                .entry()
                .to_app_option::<Feed>()
                .map_err(|e| wasm_error!(e))?
            {
                feeds.push(FeedInfo {
                    action_hash,
                    feed,
                    created_at: link.timestamp,
                });
            }
        }
    }

    Ok(feeds)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AddMemberToFeedInput {
    pub feed_hash: ActionHash,
    pub member_pubkey: AgentPubKey,
}

#[hdk_extern]
pub fn add_member_to_feed(input: AddMemberToFeedInput) -> ExternResult<()> {
    create_link(
        input.feed_hash,
        input.member_pubkey,
        LinkTypes::FeedToMember,
        (),
    )?;
    Ok(())
}

#[hdk_extern]
pub fn get_feed_members(feed_hash: ActionHash) -> ExternResult<Vec<AgentPubKey>> {
    let links = get_links(
        LinkQuery::try_new(feed_hash, LinkTypes::FeedToMember)?,
        GetStrategy::Local,
    )?;

    let members: Vec<AgentPubKey> = links
        .into_iter()
        .filter_map(|link| AgentPubKey::try_from(link.target).ok())
        .collect();

    Ok(members)
}
