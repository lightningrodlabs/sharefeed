use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct Feed {
    pub name: String,
    pub description: Option<String>,
    pub stewards: Vec<AgentPubKey>,
    pub is_public: bool,
}

pub fn validate_create_feed(
    _action: EntryCreationAction,
    feed: Feed,
) -> ExternResult<ValidateCallbackResult> {
    // Name must not be empty
    if feed.name.is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "Feed name cannot be empty".to_string(),
        ));
    }
    // Must have at least one steward
    if feed.stewards.is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "Feed must have at least one steward".to_string(),
        ));
    }
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_update_feed(
    _action: Update,
    _feed: Feed,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_feed(
    _action: Delete,
    _original_action: EntryCreationAction,
    _original_feed: Feed,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_feed_updates(
    _action: CreateLink,
    base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let action_hash = ActionHash::try_from(base_address).map_err(|err| wasm_error!(err))?;
    let record = must_get_valid_record(action_hash)?;
    let _feed: crate::Feed = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Linked action must reference an entry"
        ))))?;
    let action_hash = ActionHash::try_from(target_address).map_err(|err| wasm_error!(err))?;
    let record = must_get_valid_record(action_hash)?;
    let _feed: crate::Feed = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Linked action must reference an entry"
        ))))?;
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_feed_updates(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "FeedUpdates links cannot be deleted",
    )))
}

// Feed membership link validations
pub fn validate_create_link_feed_to_share(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let action_hash = ActionHash::try_from(target_address).map_err(|err| wasm_error!(err))?;
    let record = must_get_valid_record(action_hash)?;
    let _share_item: crate::ShareItem = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Linked action must reference a ShareItem entry"
        ))))?;
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_feed_to_share(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // Allow deleting FeedToShare links (this is how we remove shares from feeds)
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_agent_to_feed(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let action_hash = ActionHash::try_from(target_address).map_err(|err| wasm_error!(err))?;
    let record = must_get_valid_record(action_hash)?;
    let _feed: crate::Feed = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Linked action must reference a Feed entry"
        ))))?;
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_agent_to_feed(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_feed_to_member(
    _action: CreateLink,
    _base_address: AnyLinkableHash,
    _target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    // Target should be an AgentPubKey
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_feed_to_member(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}
