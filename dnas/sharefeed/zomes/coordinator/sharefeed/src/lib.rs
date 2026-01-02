pub mod share_item;
pub use share_item::*;
pub mod feed;
pub use feed::*;

use hdk::prelude::*;

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    Ok(InitCallbackResult::Pass)
}
