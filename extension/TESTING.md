# ShareFeed Extension Testing Guide

> **Note:** For full project testing (including Holochain integration tests), see the root [TESTING.md](../TESTING.md).

## Automated Tests

### Running Tests

```bash
cd extension

# Run all tests once
npm run test:run

# Run tests in watch mode (for development)
npm test
```

### Test Coverage

| Test File | Tests | Description |
|-----------|-------|-------------|
| `tests/unit/types.test.ts` | 5 | Type definitions validation |
| `tests/unit/storage.test.ts` | 12 | LocalStorageAdapter CRUD operations |
| `tests/unit/metadata.test.ts` | 2 | Metadata extraction utilities |

**Total: 19 tests**

---

## Manual Testing

### Prerequisites

1. Build the extension:
   ```bash
   cd extension
   npm install
   npm run build
   ```

2. The built extension will be in `extension/dist/`

### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `extension/dist/` directory
5. The ShareFeed extension should appear with the purple "SF" icon

---

### Test Case 1: Extension Loads Correctly

**Steps:**
1. Load the extension as described above
2. Verify the extension icon appears in the Chrome toolbar

**Expected:**
- Purple "SF" icon visible in toolbar
- No errors in `chrome://extensions/` page

**Verify in DevTools:**
1. Go to `chrome://extensions/`
2. Click "Inspect views: service worker" on the ShareFeed extension
3. Check Console for any errors (should be clean)

---

### Test Case 2: Popup Opens and Shows Page Info

**Steps:**
1. Navigate to any website (e.g., `https://example.com`)
2. Click the ShareFeed extension icon in the toolbar

**Expected:**
- Popup opens (380px wide)
- Shows page title
- Shows page URL
- Shows favicon (if available)
- Shows "Share" button
- Shows description (if page has meta description)

**Edge Cases to Test:**
- [ ] Page with no meta description
- [ ] Page with long title (should truncate)
- [ ] Page with no favicon (should not show broken image)

---

### Test Case 3: Share via Popup

**Steps:**
1. Navigate to `https://example.com`
2. Click the ShareFeed extension icon
3. Optionally add a note in the text field
4. Click "Share"

**Expected:**
- "Sharing..." appears briefly
- Success checkmark and "Shared successfully" message
- Popup closes after ~1.5 seconds

**Verify Share Was Saved:**
1. Click extension icon again
2. Click "Show recent shares"
3. The shared item should appear in the list

---

### Test Case 4: Context Menu - Share Page

**Steps:**
1. Navigate to any website
2. Right-click on empty area of the page
3. Click "Share this page"

**Expected:**
- Brief notification appears (if notifications enabled)
- Item saved to storage

**Verify:**
1. Click extension icon
2. Click "Show recent shares"
3. The page should appear in the list

---

### Test Case 5: Context Menu - Share Link

**Steps:**
1. Navigate to a page with links (e.g., Wikipedia)
2. Right-click on any link
3. Click "Share this link"

**Expected:**
- The linked URL is saved (not the current page)
- Notification confirms share

**Verify:**
1. Open popup, check recent shares
2. The link URL should appear, not the page URL

---

### Test Case 6: Context Menu - Share Selection

**Steps:**
1. Navigate to any page with text content
2. Select some text (e.g., a paragraph)
3. Right-click on the selection
4. Click "Share selected text"

**Expected:**
- Share is saved with the selected text in the `selection` field

**Verify:**
1. Open popup on another page
2. The selection text should appear quoted in the preview (future feature)

---

### Test Case 7: Context Menu - Share Image

**Steps:**
1. Navigate to a page with images
2. Right-click on an image
3. Click "Share this image"

**Expected:**
- The image URL is saved as the share URL
- Title indicates it's an image

---

### Test Case 8: Recent Shares Display

**Steps:**
1. Share 3-5 different pages using various methods
2. Open the popup
3. Click "Show recent shares"

**Expected:**
- Up to 5 most recent shares displayed
- Most recent at top
- Each shows title (truncated if long)
- Each shows relative time (e.g., "Just now", "5m ago")
- Clicking a share opens the URL in a new tab

---

### Test Case 9: Non-HTTP URLs

**Steps:**
1. Navigate to `chrome://extensions/`
2. Click the ShareFeed extension icon

**Expected:**
- Error message: "Cannot share this type of page"
- Share button should not appear

**Also test with:**
- [ ] `chrome://settings/`
- [ ] `file:///` URLs
- [ ] `about:blank`

---

### Test Case 10: Content Script on Restricted Pages

**Steps:**
1. Navigate to `https://chrome.google.com/webstore`
2. Click the ShareFeed extension icon

**Expected:**
- Popup should still work (using fallback tab info)
- May show less metadata than normal pages

---

## Storage Inspection

To manually inspect stored shares:

1. Open DevTools on any page (F12)
2. Go to Application tab
3. Expand "Storage" > "Extension Storage" > "local"
4. Look for `sharefeed_shares` key
5. Value should be an array of ShareItem objects

---

## Troubleshooting

### Extension Not Loading
- Check `chrome://extensions/` for error messages
- Ensure `dist/` folder exists and contains `manifest.json`
- Try "Remove" and "Load unpacked" again

### Popup Not Opening
- Check service worker status in `chrome://extensions/`
- Click "Inspect views: service worker" to check for errors

### Context Menus Not Appearing
- Reload the extension
- Check service worker console for registration errors

### Shares Not Persisting
- Check DevTools > Application > Extension Storage
- Verify `chrome.storage.local` quota not exceeded

---

## Test Checklist

Before committing changes, verify:

- [ ] `npm run test:run` - All 19 tests pass
- [ ] `npm run build` - Build succeeds without errors
- [ ] Extension loads in Chrome without errors
- [ ] Popup opens and displays page info
- [ ] Share via popup works
- [ ] Context menu "Share this page" works
- [ ] Context menu "Share this link" works
- [ ] Context menu "Share selected text" works
- [ ] Recent shares display correctly
- [ ] Non-HTTP pages show appropriate error
