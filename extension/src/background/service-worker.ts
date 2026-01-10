import type { ShareItem, ShareMetadata, ExtensionMessage, StorageMode } from '@/types';
import { generateShareId, getLocalUserId } from '@/storage/local-storage';
import { getStorageManager, setStorageMode } from '@/storage/storage-manager';
import { resetHolochainStorageAdapter } from '@/storage/holochain-storage';

const storage = getStorageManager();

// Create context menus on extension install/update
chrome.runtime.onInstalled.addListener(() => {
  // Remove existing menus first
  chrome.contextMenus.removeAll(() => {
    // Share page menu
    chrome.contextMenus.create({
      id: 'share-page',
      title: 'Share this page',
      contexts: ['page'],
    });

    // Share link menu
    chrome.contextMenus.create({
      id: 'share-link',
      title: 'Share this link',
      contexts: ['link'],
    });

    // Share selection menu
    chrome.contextMenus.create({
      id: 'share-selection',
      title: 'Share selected text',
      contexts: ['selection'],
    });

    // Share image menu
    chrome.contextMenus.create({
      id: 'share-image',
      title: 'Share this image',
      contexts: ['image'],
    });
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || !tab.url) return;

  // Skip chrome:// and other restricted URLs
  if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
    console.log('Cannot share non-http URLs');
    return;
  }

  try {
    // Get metadata from content script
    const metadata = await getMetadataFromTab(tab.id);

    // Build share item based on context
    const share: Omit<ShareItem, 'id' | 'sharedAt' | 'sharedBy'> = {
      url: tab.url,
      title: metadata.title,
      description: metadata.description,
      favicon: metadata.favicon,
    };

    // Add context-specific data
    switch (info.menuItemId) {
      case 'share-link':
        if (info.linkUrl) {
          share.url = info.linkUrl;
          share.title = info.linkUrl; // Will be updated if we fetch the page
        }
        break;

      case 'share-selection':
        share.selection = info.selectionText || metadata.selection;
        break;

      case 'share-image':
        if (info.srcUrl) {
          share.url = info.srcUrl;
          share.title = `Image from ${metadata.title}`;
          // Could add thumbnail of the image here
        }
        break;

      case 'share-page':
      default:
        // Use page metadata as-is
        break;
    }

    // Create and save the share
    const fullShare: ShareItem = {
      ...share,
      id: generateShareId(),
      sharedAt: Date.now(),
      sharedBy: await getLocalUserId(),
    };

    await storage.saveShare(fullShare);

    // Show notification of success
    showNotification('Shared', `"${truncate(fullShare.title, 50)}" saved to ShareFeed`);
  } catch (error) {
    console.error('Failed to share:', error);
    showNotification('Share Failed', 'Could not save the share. Please try again.');
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((error) => {
      console.error('Message handling error:', error);
      sendResponse({ type: 'SHARE_ERROR', payload: error.message });
    });

  // Return true to indicate we'll send a response asynchronously
  return true;
});

async function handleMessage(message: ExtensionMessage): Promise<ExtensionMessage> {
  switch (message.type) {
    case 'GET_SHARES':
      const shares = await storage.getShares();
      return { type: 'SHARES_RESPONSE', payload: shares };

    case 'SHARE_ITEM':
      const newShare: ShareItem = {
        ...message.payload,
        id: generateShareId(),
        sharedAt: Date.now(),
        sharedBy: await getLocalUserId(),
      };
      await storage.saveShare(newShare);
      return { type: 'SHARE_SUCCESS', payload: newShare };

    case 'GET_CONNECTION_STATUS':
      const status = await storage.checkConnection();
      return { type: 'CONNECTION_STATUS_RESPONSE', payload: status };

    case 'SET_STORAGE_MODE':
      await setStorageMode(message.payload as StorageMode);
      return { type: 'STORAGE_MODE_SET', payload: message.payload as StorageMode };

    case 'RESET_CONNECTION':
      resetHolochainStorageAdapter(); // Reset the Holochain adapter singleton
      storage.resetConnection();
      return { type: 'CONNECTION_RESET' };

    case 'GET_NETWORKS':
      const networks = await storage.getNetworks();
      return { type: 'NETWORKS_RESPONSE', payload: networks };

    case 'SET_ACTIVE_NETWORK':
      storage.setActiveNetwork(message.payload);
      return { type: 'ACTIVE_NETWORK_SET', payload: message.payload };

    default:
      throw new Error(`Unknown message type: ${(message as ExtensionMessage).type}`);
  }
}

/**
 * Get metadata from a tab by sending a message to its content script.
 */
async function getMetadataFromTab(tabId: number): Promise<ShareMetadata> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_METADATA' });
    if (response?.type === 'METADATA_RESPONSE') {
      return response.payload;
    }
  } catch {
    // Content script might not be loaded
  }

  // Fallback: get basic info from tab object
  const tab = await chrome.tabs.get(tabId);
  return {
    url: tab.url || '',
    title: tab.title || 'Untitled',
    favicon: tab.favIconUrl,
  };
}

/**
 * Capture a screenshot of the visible tab.
 */
export async function captureTabScreenshot(tabId: number): Promise<string | null> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'jpeg', quality: 70 });
    return dataUrl;
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    return null;
  }
}

/**
 * Show a browser notification.
 */
function showNotification(title: string, message: string): void {
  // Check if notifications are available
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title,
      message,
    });
  }
}

/**
 * Truncate a string to a maximum length.
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}
