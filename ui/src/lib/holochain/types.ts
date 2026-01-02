/**
 * Types that match the Holochain zome types.
 * These are used for serialization/deserialization with the conductor.
 */

import type { ActionHash, AgentPubKey, Record as HcRecord, Timestamp } from '@holochain/client';

/**
 * ShareItem entry - matches sharefeed_integrity::ShareItem
 */
export interface ShareItem {
  url: string;
  title: string;
  description: string | null;
  selection: string | null;
  favicon: string | null;
  thumbnail: string | null;
  tags: string[];
}

/**
 * Feed entry - matches sharefeed_integrity::Feed
 */
export interface Feed {
  name: string;
  description: string | null;
  stewards: AgentPubKey[];
  is_public: boolean;
}

/**
 * ShareItemInfo - matches coordinator::ShareItemInfo
 */
export interface ShareItemInfo {
  action_hash: ActionHash;
  share_item: ShareItem;
  created_at: Timestamp;
  author: AgentPubKey;
}

/**
 * FeedInfo - matches coordinator::FeedInfo
 */
export interface FeedInfo {
  action_hash: ActionHash;
  feed: Feed;
  created_at: Timestamp;
}

/**
 * TimeRangeInput - for querying shares by week
 */
export interface TimeRangeInput {
  year: number;
  week: number;
}

/**
 * UpdateShareItemInput - for updating a share item
 */
export interface UpdateShareItemInput {
  original_share_item_hash: ActionHash;
  previous_share_item_hash: ActionHash;
  updated_share_item: ShareItem;
}

/**
 * UpdateFeedInput - for updating a feed
 */
export interface UpdateFeedInput {
  original_feed_hash: ActionHash;
  previous_feed_hash: ActionHash;
  updated_feed: Feed;
}

/**
 * AddShareToFeedInput - for adding a share to a feed
 */
export interface AddShareToFeedInput {
  feed_hash: ActionHash;
  share_item_hash: ActionHash;
}

/**
 * RemoveShareFromFeedInput - for removing a share from a feed
 */
export interface RemoveShareFromFeedInput {
  link_hash: ActionHash;
}

/**
 * AddMemberToFeedInput - for adding a member to a feed
 */
export interface AddMemberToFeedInput {
  feed_hash: ActionHash;
  member_pubkey: AgentPubKey;
}

// Re-export Holochain types for convenience
export type { ActionHash, AgentPubKey, HcRecord, Timestamp };
