use hdi::prelude::*;

#[hdk_entry_helper]
#[derive(Clone, PartialEq)]
pub struct ShareItem {
    pub url: String,
    pub title: String,
    pub description: Option<String>,
    pub selection: Option<String>,
    pub favicon: Option<String>,
    pub thumbnail: Option<String>,
    pub tags: Vec<String>,
}

pub fn validate_create_share_item(
    _action: EntryCreationAction,
    share_item: ShareItem,
) -> ExternResult<ValidateCallbackResult> {
    // URL must not be empty
    if share_item.url.is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "ShareItem url cannot be empty".to_string(),
        ));
    }
    // Title must not be empty
    if share_item.title.is_empty() {
        return Ok(ValidateCallbackResult::Invalid(
            "ShareItem title cannot be empty".to_string(),
        ));
    }
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_update_share_item(
    _action: Update,
    _share_item: ShareItem,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_share_item(
    _action: Delete,
    _original_action: EntryCreationAction,
    _original_share_item: ShareItem,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_create_link_share_item_updates(
    _action: CreateLink,
    base_address: AnyLinkableHash,
    target_address: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    let action_hash = ActionHash::try_from(base_address).map_err(|err| wasm_error!(err))?;
    let record = must_get_valid_record(action_hash)?;
    let _share_item: crate::ShareItem = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Linked action must reference an entry"
        ))))?;
    let action_hash = ActionHash::try_from(target_address).map_err(|err| wasm_error!(err))?;
    let record = must_get_valid_record(action_hash)?;
    let _share_item: crate::ShareItem = record
        .entry()
        .to_app_option()
        .map_err(|e| wasm_error!(e))?
        .ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
            "Linked action must reference an entry"
        ))))?;
    Ok(ValidateCallbackResult::Valid)
}

pub fn validate_delete_link_share_item_updates(
    _action: DeleteLink,
    _original_action: CreateLink,
    _base: AnyLinkableHash,
    _target: AnyLinkableHash,
    _tag: LinkTag,
) -> ExternResult<ValidateCallbackResult> {
    Ok(ValidateCallbackResult::Invalid(String::from(
        "ShareItemUpdates links cannot be deleted",
    )))
}
