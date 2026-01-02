# ShareFeed UI Testing Guide

> **Note:** For full project testing (including Holochain integration tests), see the root [TESTING.md](../TESTING.md).

## Automated Tests

### Running Tests

```bash
cd ui

# Run all tests once
npm run test:run

# Run tests in watch mode (for development)
npm test
```

### Test Coverage

| Test File | Tests | Description |
|-----------|-------|-------------|
| `src/lib/types/index.test.ts` | 5 | Type definitions and defaults validation |
| `src/lib/adapters/storage-adapter.test.ts` | 8 | filterShares utility function |

**Total: 13 tests**

---

## Manual Testing

### Prerequisites

1. Build the UI:
   ```bash
   cd ui
   npm install
   npm run build
   ```

2. Preview the production build:
   ```bash
   npm run preview
   ```

3. Or run in development mode:
   ```bash
   npm run dev
   ```

---

### Test Case 1: Application Loads

**Steps:**
1. Open http://localhost:5173 (dev) or http://localhost:4173 (preview)
2. Verify the page loads without errors

**Expected:**
- "ShareFeed" header visible
- "Links from your family and friends" tagline visible
- Refresh and Settings buttons in header
- Feed displays demo data or empty state

---

### Test Case 2: Demo Data Display

**Steps:**
1. Load the application
2. Observe the feed content

**Expected (with demo adapter):**
- 5 sample share cards displayed
- Each card shows:
  - Title (large, readable)
  - Domain and timestamp
  - Description (if present)
  - Selected text quote (if present)
  - "Shared by [name]" footer

---

### Test Case 3: Share Card Interaction

**Steps:**
1. Click on any share card
2. Press Tab to focus a card, then Enter

**Expected:**
- Clicking opens the URL in a new tab
- Keyboard navigation works (Tab to focus, Enter to open)
- Hover state shows border highlight
- Focus state shows visible outline

---

### Test Case 4: Settings Panel

**Steps:**
1. Click the gear/settings icon in the header
2. Observe the settings panel

**Expected:**
- Panel slides in from right
- Panel shows:
  - Text Size slider (14-32px)
  - High Contrast toggle
  - Show Thumbnails toggle
  - Reduce Motion toggle
  - Reset to Defaults button
- Clicking outside panel closes it
- Pressing Escape closes it

---

### Test Case 5: Text Size Adjustment

**Steps:**
1. Open Settings panel
2. Drag the Text Size slider to maximum (32px)
3. Close the panel

**Expected:**
- All text in the feed immediately grows larger
- Share card titles are clearly larger
- Change persists after page refresh

---

### Test Case 6: High Contrast Mode

**Steps:**
1. Open Settings panel
2. Enable "High Contrast" toggle
3. Close the panel

**Expected:**
- Background changes to white
- Borders become black/thicker
- Text becomes darker/bolder
- Improved visual distinction between elements
- Change persists after page refresh

---

### Test Case 7: Hide Thumbnails

**Steps:**
1. Open Settings panel
2. Disable "Show Thumbnails" toggle
3. Close the panel

**Expected:**
- Thumbnail images no longer appear on cards
- Cards are more compact
- Change persists after page refresh

---

### Test Case 8: Reduced Motion

**Steps:**
1. Open Settings panel
2. Enable "Reduce Motion" toggle
3. Close the panel
4. Open settings again

**Expected:**
- Settings panel appears instantly (no slide animation)
- All transitions are instant
- Spinner animations may still work

---

### Test Case 9: Reset to Defaults

**Steps:**
1. Change multiple settings
2. Open Settings panel
3. Click "Reset to Defaults"

**Expected:**
- Font size returns to 18px
- High Contrast disabled
- Show Thumbnails enabled
- Reduce Motion disabled

---

### Test Case 10: Refresh Button

**Steps:**
1. Click the refresh button in the header

**Expected:**
- Feed reloads (may show loading state briefly)
- Content refreshes from data source

---

### Test Case 11: Empty State

**Steps:**
1. Modify the adapter to return empty data
2. Load the application

**Expected:**
- Empty state message displayed
- "No shares yet" heading
- Helpful text about using extension

---

### Test Case 12: Error State

**Steps:**
1. Configure adapter to throw an error
2. Load the application

**Expected:**
- Error message displayed
- "Try Again" button visible
- Clicking retry attempts to reload

---

### Test Case 13: Responsive Design

**Steps:**
1. Open browser DevTools
2. Toggle device toolbar
3. Test at various widths:
   - Mobile (320px)
   - Tablet (768px)
   - Desktop (1024px+)

**Expected:**
- Cards remain readable at all sizes
- Header adjusts for mobile
- Touch targets are large enough (44px minimum)
- No horizontal scrolling required

---

### Test Case 14: Keyboard Navigation

**Steps:**
1. Press Tab repeatedly through the page
2. Use arrow keys where applicable

**Expected:**
- Focus is visible on all interactive elements
- Header buttons are focusable
- Share cards are focusable
- Settings panel is keyboard accessible
- Escape closes the settings panel

---

### Test Case 15: Screen Reader Compatibility

**Steps:**
1. Enable a screen reader (VoiceOver, NVDA, etc.)
2. Navigate through the page

**Expected:**
- All content is announced
- Share cards have meaningful labels
- Settings controls are properly labeled
- Modal dialog is announced correctly

---

## Accessibility Checklist

Before committing changes, verify:

- [ ] All text has sufficient color contrast (4.5:1 minimum)
- [ ] Interactive elements have visible focus states
- [ ] Touch targets are at least 44x44px
- [ ] Images have alt text or are decorative
- [ ] Keyboard navigation works for all features
- [ ] Font size settings work correctly
- [ ] High contrast mode improves visibility

---

## Test Checklist

Before committing changes, verify:

- [ ] `npm run test:run` - All 13 tests pass
- [ ] `npm run build` - Build succeeds without errors
- [ ] Application loads without console errors
- [ ] Share cards display correctly
- [ ] Settings panel opens and closes
- [ ] All settings work and persist
- [ ] Refresh button functions
- [ ] Responsive design works on mobile
- [ ] Keyboard navigation is complete
