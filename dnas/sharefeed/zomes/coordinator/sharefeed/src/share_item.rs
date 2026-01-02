use hdk::prelude::*;
use sharefeed_integrity::*;

#[hdk_extern]
pub fn create_share_item(share_item: ShareItem) -> ExternResult<Record> {
    let share_item_hash = create_entry(&EntryTypes::ShareItem(share_item.clone()))?;

    // Create time-based index link
    let timestamp = sys_time()?;
    let path = time_path_for_timestamp(timestamp);
    create_link(
        path.path_entry_hash()?,
        share_item_hash.clone(),
        LinkTypes::TimeIndex,
        (),
    )?;

    let record = get(share_item_hash.clone(), GetOptions::local())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly created ShareItem"))
    ))?;
    Ok(record)
}

#[hdk_extern]
pub fn get_share_item(original_share_item_hash: ActionHash) -> ExternResult<Option<Record>> {
    let links = get_links(
        LinkQuery::try_new(original_share_item_hash.clone(), LinkTypes::ShareItemUpdates)?,
        GetStrategy::Local,
    )?;
    let latest_link = links
        .into_iter()
        .max_by(|link_a, link_b| link_a.timestamp.cmp(&link_b.timestamp));
    let latest_share_item_hash = match latest_link {
        Some(link) => ActionHash::try_from(link.target.clone()).map_err(|err| wasm_error!(err))?,
        None => original_share_item_hash.clone(),
    };
    get(latest_share_item_hash, GetOptions::local())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UpdateShareItemInput {
    pub original_share_item_hash: ActionHash,
    pub previous_share_item_hash: ActionHash,
    pub updated_share_item: ShareItem,
}

#[hdk_extern]
pub fn update_share_item(input: UpdateShareItemInput) -> ExternResult<Record> {
    let updated_share_item_hash = update_entry(
        input.previous_share_item_hash.clone(),
        &input.updated_share_item,
    )?;
    create_link(
        input.original_share_item_hash.clone(),
        updated_share_item_hash.clone(),
        LinkTypes::ShareItemUpdates,
        (),
    )?;
    let record = get(updated_share_item_hash.clone(), GetOptions::local())?.ok_or(wasm_error!(
        WasmErrorInner::Guest(String::from("Could not find the newly updated ShareItem"))
    ))?;
    Ok(record)
}

#[hdk_extern]
pub fn delete_share_item(original_share_item_hash: ActionHash) -> ExternResult<ActionHash> {
    delete_entry(original_share_item_hash)
}

// Time-based indexing helpers
fn time_path_for_timestamp(timestamp: Timestamp) -> Path {
    let seconds = timestamp.as_seconds_and_nanos().0;
    // Calculate year and week from unix timestamp
    // This is a simplified calculation - for production, use a proper date library
    let days_since_epoch = seconds / 86400;
    let years_since_1970 = days_since_epoch / 365;
    let year = 1970 + years_since_1970;
    let day_of_year = days_since_epoch % 365;
    let week = (day_of_year / 7) + 1;

    Path::from(format!("shares.{}.{:02}", year, week))
}

#[derive(Serialize, Deserialize, Debug)]
pub struct TimeRangeInput {
    pub year: i64,
    pub week: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ShareItemInfo {
    pub action_hash: ActionHash,
    pub share_item: ShareItem,
    pub created_at: Timestamp,
    pub author: AgentPubKey,
}

#[hdk_extern]
pub fn get_shares_for_week(input: TimeRangeInput) -> ExternResult<Vec<ShareItemInfo>> {
    let path = Path::from(format!("shares.{}.{:02}", input.year, input.week));

    let links = get_links(
        LinkQuery::try_new(path.path_entry_hash()?, LinkTypes::TimeIndex)?,
        GetStrategy::Local,
    )?;

    let mut share_items: Vec<ShareItemInfo> = Vec::new();
    for link in links {
        let action_hash = ActionHash::try_from(link.target.clone()).map_err(|err| wasm_error!(err))?;
        if let Some(record) = get(action_hash.clone(), GetOptions::local())? {
            if let Some(share_item) = record.entry().to_app_option::<ShareItem>().map_err(|e| wasm_error!(e))? {
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

#[hdk_extern]
pub fn get_recent_shares(_: ()) -> ExternResult<Vec<ShareItemInfo>> {
    // Get current time and calculate current week
    let timestamp = sys_time()?;
    let seconds = timestamp.as_seconds_and_nanos().0;
    let days_since_epoch = seconds / 86400;
    let years_since_1970 = days_since_epoch / 365;
    let year = 1970 + years_since_1970;
    let day_of_year = days_since_epoch % 365;
    let week = ((day_of_year / 7) + 1) as u32;

    // Get shares from current week
    let mut all_shares = get_shares_for_week(TimeRangeInput { year, week })?;

    // If we have fewer than 20 shares, also get from previous week
    if all_shares.len() < 20 && week > 1 {
        let prev_shares = get_shares_for_week(TimeRangeInput { year, week: week - 1 })?;
        all_shares.extend(prev_shares);
    }

    // Re-sort and limit
    all_shares.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    all_shares.truncate(50);

    Ok(all_shares)
}
