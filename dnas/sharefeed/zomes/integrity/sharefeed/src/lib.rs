pub mod share_item;
pub use share_item::*;
pub mod feed;
pub use feed::*;

use hdi::prelude::*;

#[derive(Serialize, Deserialize)]
#[serde(tag = "type")]
#[hdk_entry_types]
#[unit_enum(UnitEntryTypes)]
pub enum EntryTypes {
    ShareItem(ShareItem),
    Feed(Feed),
}

#[derive(Serialize, Deserialize)]
#[hdk_link_types]
pub enum LinkTypes {
    // Time-based indexing (NOT "AllShares" - paginate by time period)
    TimeIndex,

    // Updates chain for versioning
    ShareItemUpdates,
    FeedUpdates,

    // Feed membership
    FeedToShare,
    AgentToFeed,
    FeedToMember,
}

#[hdk_extern]
pub fn genesis_self_check(_data: GenesisSelfCheckData) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_agent_joining(
    _agent_pub_key: AgentPubKey,
    _membrane_proof: &Option<MembraneProof>,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}

#[hdk_extern]
pub fn validate(op: Op) -> ExternResult<ValidateCallbackResult> {
    match op.flattened::<EntryTypes, LinkTypes>()? {
        FlatOp::StoreEntry(store_entry) => match store_entry {
            OpEntry::CreateEntry { app_entry, action } => match app_entry {
                EntryTypes::ShareItem(share_item) => {
                    validate_create_share_item(EntryCreationAction::Create(action), share_item)
                }
                EntryTypes::Feed(feed) => {
                    validate_create_feed(EntryCreationAction::Create(action), feed)
                }
            },
            OpEntry::UpdateEntry { app_entry, action, .. } => match app_entry {
                EntryTypes::ShareItem(share_item) => {
                    validate_create_share_item(EntryCreationAction::Update(action), share_item)
                }
                EntryTypes::Feed(feed) => {
                    validate_create_feed(EntryCreationAction::Update(action), feed)
                }
            },
            _ => Ok(ValidateCallbackResult::Valid),
        },
        FlatOp::RegisterUpdate(update_entry) => match update_entry {
            OpUpdate::Entry { app_entry, action } => match app_entry {
                EntryTypes::ShareItem(share_item) => validate_update_share_item(action, share_item),
                EntryTypes::Feed(feed) => validate_update_feed(action, feed),
            },
            _ => Ok(ValidateCallbackResult::Valid),
        },
        FlatOp::RegisterDelete(_delete_entry) => Ok(ValidateCallbackResult::Valid),
        FlatOp::RegisterCreateLink {
            link_type,
            base_address,
            target_address,
            tag,
            action,
        } => match link_type {
            LinkTypes::TimeIndex => Ok(ValidateCallbackResult::Valid),
            LinkTypes::ShareItemUpdates => validate_create_link_share_item_updates(
                action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::FeedUpdates => {
                validate_create_link_feed_updates(action, base_address, target_address, tag)
            }
            LinkTypes::FeedToShare => {
                validate_create_link_feed_to_share(action, base_address, target_address, tag)
            }
            LinkTypes::AgentToFeed => {
                validate_create_link_agent_to_feed(action, base_address, target_address, tag)
            }
            LinkTypes::FeedToMember => {
                validate_create_link_feed_to_member(action, base_address, target_address, tag)
            }
        },
        FlatOp::RegisterDeleteLink {
            link_type,
            base_address,
            target_address,
            tag,
            original_action,
            action,
        } => match link_type {
            LinkTypes::TimeIndex => Ok(ValidateCallbackResult::Valid),
            LinkTypes::ShareItemUpdates => validate_delete_link_share_item_updates(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::FeedUpdates => validate_delete_link_feed_updates(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::FeedToShare => validate_delete_link_feed_to_share(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::AgentToFeed => validate_delete_link_agent_to_feed(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
            LinkTypes::FeedToMember => validate_delete_link_feed_to_member(
                action,
                original_action,
                base_address,
                target_address,
                tag,
            ),
        },
        FlatOp::StoreRecord(store_record) => match store_record {
            OpRecord::CreateEntry { app_entry, action } => match app_entry {
                EntryTypes::ShareItem(share_item) => {
                    validate_create_share_item(EntryCreationAction::Create(action), share_item)
                }
                EntryTypes::Feed(feed) => {
                    validate_create_feed(EntryCreationAction::Create(action), feed)
                }
            },
            OpRecord::UpdateEntry {
                app_entry, action, ..
            } => match app_entry {
                EntryTypes::ShareItem(share_item) => {
                    validate_create_share_item(EntryCreationAction::Update(action), share_item)
                }
                EntryTypes::Feed(feed) => {
                    validate_create_feed(EntryCreationAction::Update(action), feed)
                }
            },
            OpRecord::DeleteEntry { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::CreateLink { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::DeleteLink { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::CreatePrivateEntry { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::UpdatePrivateEntry { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::CreateCapClaim { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::CreateCapGrant { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::UpdateCapClaim { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::UpdateCapGrant { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::Dna { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::OpenChain { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::CloseChain { .. } => Ok(ValidateCallbackResult::Valid),
            OpRecord::InitZomesComplete { .. } => Ok(ValidateCallbackResult::Valid),
            _ => Ok(ValidateCallbackResult::Valid),
        },
        FlatOp::RegisterAgentActivity(agent_activity) => match agent_activity {
            OpActivity::CreateAgent { agent, action } => {
                let previous_action = must_get_action(action.prev_action)?;
                match previous_action.action() {
                    Action::AgentValidationPkg(AgentValidationPkg { membrane_proof, .. }) => {
                        validate_agent_joining(agent, membrane_proof)
                    }
                    _ => Ok(ValidateCallbackResult::Invalid(
                        "The previous action for a `CreateAgent` action must be an `AgentValidationPkg`"
                            .to_string(),
                    )),
                }
            }
            _ => Ok(ValidateCallbackResult::Valid),
        },
    }
}
