# ShareFeed

## Overview

ShareFeed allows a group of people to share web-sites/videos/etc that they come accross while browsing with eachother to specific feeds, or individuals.  It has a dead-easy UI suitable for elderly family members with poor eyesight to be able to easily see what's shared.  It's designed to replace Facebook scrolling with meaningful relational sharing in a group.

Technologically this project is a combo browser extension tool and holochain application (https://github.com/holochain/holochain/) using the desktop kangaroo (https://github.com/holochain/kangaroo-electron) runtime for deployment. 

---

## Requirements, Tradeoffs & Dev Instructions

0. When reporting on status, or asking questions don't add the emotional tags at the beginning and end of phrases, (you can tell you are doing this if there's an exclamation point at the end of the phrase/sentence).  Just code related information.
1. Each step of the process must be built using test-driven development practices such that CI can confirm no regressions before merging a PR
2. **User testing is required before commits**: After implementing features, user testing must be performed in a real browser environment before creating git commits. This ensures functionality works as expected.
3. Different portions of the plan, or even the same plan may be worked on from different workstations, so claude must be set up to pick up sessions where they were left off.
4. Perfect is the enemy of the good. This plan should not be implemented to the highest possible standard of efficiency or robustness, but rather in a way that allows for reaching the functionality goals in reasonable time, and iterating on quality goals over time.
5. Don't add claude co-authored/generated messages in commit descriptions
6. **Avoiding Solution Loops**: When debugging persistent issues:
   - ALWAYS read the "Failed Solutions Archive" before proposing solutions
   - Document WHY a solution failed, not just WHAT failed
   - Before retrying a similar approach, explain how it differs from the failed attempt
7. **Strong typing**: when possible allways use strong typing in typescript.
8. **Holochain reference sources**: We are using Holochain 0.6.  The source for this is local and lives at the same level as this repo (../holochain). DO NOT USE .cargo files or web searches to research holochain, just look locally.

---

## Development Strategy

- **Check LESSONS_LEARNED.md** before any serialization work - failed solutions are archived there
- **Use ../holochain/ as canonical reference**, not web searches (docs may be outdated)
- **TEST BEFORE COMMIT**, always run tests and ensure they pass before suggesting that we commit.
- **Automated tests first**, manual browser testing only for final verification

---

## Plan

1. Build an extension that makes it very easy for people to select and share a URL or some aspect of the page they are browsing.
   1. Start with a simple local file for holding data, will be connected to Holochain app later.
2. Use svelte to build a single page web-app that will be able to read shares and display items from the local file.
   1. Make sure the app will later be easy to use in the Holochain context (see holochain scaffoding of a web-app in planning process)
   2. For initial design we want quick feedback with the extension.
3. Build the Holochain happ that allows both sharing and reading feeds and replaces the local file.
4. Move the Svelte app into Holochain testing environment that uses the happ packeged into a webHapp and testable with hc-spin.
5. Wire up the extension to connect to locally running test conductor to test that both sides Share/Feed are working.
6. Create a kangaroo deployment for the wehapp.