# Hidden Content — Explanation

This companion log documents the Hidden Content feature not mentioned in 'ChangeList.md.' Hidden content is an intentionally undocumented feature in the main document; it is described here instead, where it is the sole focus.

On the "Help" tab, hovering over the version number and clicking 5 times in quick succession will toggle hidden content visibility. When hidden content is visible, all custom content - voice packs, background music, custom levels, and user profiles - can be designated as a hidden content item. All items set to hidden will be concealed if hidden content visibility is toggled to off - they will still exist in data, but they will not appear anywhere in menu selection.

Custom level subfolders maintain two copies of displayed names; one for when hidden content is concealed (shown by default), and one for when hidden content is visible. This is to avoid giving away the presence of hidden levels in custom subfolders; a named folder with no levels could raise suspicion.

The rest of this document is structured similarly to 'ChangeList.md', providing an overview of a revision's changes and the details of modified files. As mentioned, any changes not related to hidden content are not discussed here; they are discussed in 'ChangeList.md'. For revisions 20, 23, 36, and 42, combine the changes listed in this document with those in the main changelist for the complete picture of all code changes. Any revision not listed here had no impact on hidden content.




# Revision 42 - Profile Export Keeps the Hidden Flag

Profile export and import, added in the main changelist, include the profile **`hidden`** flag. A non-default profile exported while hidden content is visible comes back hidden. The Default profile cannot be imported as hidden. Voice-pack save and import still persist **`hidden`** the same way as before; open custom cue names do not clear it.



## Modified Files

src/services/profileExport.js
- **`validatePlayerProfile`** keeps **`hidden`** as a boolean. A non-boolean value is rejected and saved data is left unchanged.
- **`finalizeProfile`** runs the profile through **`normalizePlayerProfilesState`**. The Default profile is forced to **`hidden: false`**. Any other profile keeps **`hidden: true`**.
- **`exportPlayerProfile`** / **`parsePlayerProfile`** round-trip that flag. Import as a new id copies **`hidden`** onto the new id.

src/components/Achievements/ProfileManager.jsx
- **Export Profile** writes the active profile, so a hidden profile can be exported only while hidden content is visible and that profile is selected. The profile list is still filtered with **`isVisibleInUi`**.
- **Import Profile** stores the parsed profile, including **`hidden`**, and makes it the active profile. Import does not call **`revertHiddenActiveSelections`**. A hidden profile imported while content is concealed stays active for this session, but it does not appear in the profile list until hidden content is visible. App startup, and switching hidden content from visible to concealed, still return the active profile to Default when that profile is hidden.

src/services/audioManager.js
- Pack import still sets **`hidden`** from **`manifest.pack.hidden === true`** after the open-cue migration. Export still writes **`hidden: true`** only when the pack is hidden.





# Revision 36 - Hidden Voice Packs Survive Audio Migration

The audio-key migration runs on voice-pack load and save. A pack marked hidden stays hidden. The flag is not tied to the old **`Lvl_*`** category names.



## Modified Files

src/services/audioManager.js
- **`loadPackFromStorage`** returns **`migrateAudioPack(raw).pack`**. Migration copies the pack object, so **`hidden`** is kept.
- **`savePack`** migrates first, then stores **`hidden: pack.hidden === true`**.





# Revision 23 - Hidden Content vs Prerequisites, Subfolders, and Default Profile Bypass

Companion changes to the introduction of level prerequisites and custom level subfolders, including:
  - Non-hidden levels with hidden prerequisites display 'Unknown Level' in place of any hidden levels - it is generally not recommended to have a non-hidden level require a hidden level, so this is a stop-gap solution.
  - Custom level subfolders maintain two versions of their display names, based on visibility of hidden content.
  - When hidden content is visible, all profiles (including user profiles) can enable 'Track Stats and Achievements' and 'Bypass Level Requirements' simultaneously.  



## Modified Files

src/utils/hiddenContentVisibility.js
- `revertHiddenActiveSelections`: after resetting `activeProfileId` to default, re-reads
  normalized `playerProfilesAtom` before running the new guard below.
- **`reconcileDefaultProfileBypassWhenConcealed`**: when Hidden Content is concealed, if the
  default profile has both `bypassLevelRequirements` and `statTrackingEnabled` true, forces
  `bypassLevelRequirements` back to false (prevents an invalid pairing after toggling hidden
  mode or clearing active hidden profiles).

src/constants/customLevelFolders.js
- **`pickCustomLevelFolderNames(sets, showHiddenContent)`** (and supporting normalizers): returns
  **revealed** vs **concealed** folder label arrays so Training / Level Editor can show neutral
  slot labels when hidden custom levels must not be inferable from folder names alone.

src/services/levelPrerequisiteService.js
- Imports **`isHiddenRecord`**; **`evaluateLevelQualification(..., showHiddenContent)`** sets
  `displayAsUnknown` when a non-default prerequisite target is a hidden level and hidden mode
  is off.
- **`shouldEnforcePrerequisites(profile, showHiddenContent)`**: encodes bypass + default-profile
  + hidden-mode interaction described above.
- **`getLevelsNewlyUnlockedByPrerequisites(prev, next, showHiddenContent)`**: threads the flag
  through before/after qualification checks.

src/components/Training/Training.jsx
- **`pickCustomLevelFolderNames`** in memos for folder tabs; prerequisite gating uses
  **`shouldEnforcePrerequisites(activeProfile, showHiddenContent)`** alongside existing
  qualification helpers; dependency arrays include **`showHiddenContent`** where selection
  validity depends on concealed vs revealed catalog state.

src/components/LevelEditor/LevelEditor.jsx
- Folder name edit row keys **`revealed` / `concealed`** driven by **`showHiddenContent`**;
  **`pickCustomLevelFolderNames`** for subfolder select labels; prerequisite candidate lists and
  help copy reference hidden-content mode (e.g. unique names when visible to avoid leaking
  hidden levels).

src/components/Achievements/ProfileManager.jsx
- **Bypass Level Requirements** row visibility: **`showBypassLevelRow`** requires default profile
  **or** Hidden Content visible; when the default profile is “concealed” (active default +
  hidden mode off), bypass toggle writes **`bypassLevelRequirements: false`** to avoid silent
  prerequisite bypass.
- Renames the non-default profile dev checkbox heading from **“Hidden”** to **“Hidden Profile”**
  for clarity.

src/components/Gameover/Gameover.js
- Subscribes to **`showHiddenContentAtom`** (via `store.get`) when computing
  **`getLevelsNewlyUnlockedByPrerequisites`**, so post-session “levels unlocked” messaging
  respects hidden level concealment rules.

src/services/levelManager.js
- Prerequisite save path (`normalizePrerequisiteRules`, DAG validation, scrub on delete) shares
  the same `saveLevel` object as the existing **`hidden`** boolean normalization from Revision 20;
  no separate hidden-schema change, but prerequisite persistence rides the same write path.









# Revision 20 - Hidden Content (Initial Implementation)

Introduces Hidden Content end-to-end. Introduced metadata 'hidden: true/false' on user-authored voice packs, background music, custom levels, and non-default profiles. When hidden content is concealed, all content with metadata 'hidden: true' is filtered out in the content library, editors, and training menu. Hidden content is concealed by default when loading the app, unless launched via CLI with the parameter '--show-hidden'.
When deleting all custom content, hidden content with metadata 'hidden: true' is preserved as long as hidden content is concealed. This creates the illusion that all content was deleted while keeping hidden content for later. Note that if hidden content is visible when all custom content is deleted, hidden content will also be deleted.



## Modified Files

public/electron.js
- Default parsed CLI config includes **`showHidden: false`**; **`--show-hidden`** case sets it
  true.
- **`ipcMain.on('get-show-hidden-sync', …)`** returns boolean via **`event.returnValue`** for
  synchronous reads (documented in source as avoiding a flash of wrong UI).

public/preload.js
- Exposes **`getShowHiddenSync`** on **`electronAPI`**.

src/atoms/playerProfilesModel.js
- Profile records gain **`hidden`** (default false); migration in **`normalizePlayerProfilesState`**
  forces default profile non-hidden and preserves **`hidden: true`** on others when set.

src/components/Achievements/Stats.jsx
- Imports **`musicTrackManager`**, **`levelManager`**, **`store`**, **`showHiddenContentAtom`**.
- **`runFactoryReset`**: concealed path deletes only non-hidden custom packs, tracks, and
  levels; keeps hidden profiles; default path wipes everything as before; always validates
  active pack afterward.
- **`deleteAllNonDefaultProfiles`**: concealed mode keeps hidden-marked profiles and fixes
  **`activeProfileId`** when the active profile was removed.

src/components/Achievements/ProfileManager.jsx
- Subscribes to **`showHiddenContentAtom`** and **`isVisibleInUi`** for profile list filtering and
  dev-only **Hidden** checkbox on non-default profiles when Hidden Content is enabled.

src/App.js
- Imports **`showHiddenContentAtom`** and **`revertHiddenActiveSelections`**; tracks prior hidden
  flag; **`useEffect`** calls **`revertHiddenActiveSelections(store, false)`** when toggling from
  visible to concealed so active pack / BGM / profile selections cannot point at hidden records.
- Before async external-mode initialization, synchronous **`revertHiddenActiveSelections(store,
  store.get(showHiddenContentAtom))`** aligns selections with concealed mode prior to CLI
  overrides.
- (Sherpa **`settleSherpaPreload`** / loading-state gate changes are documented in the main
  CHANGELIST Revision 20 entry.)

src/components/AudioPackEditor/AudioPackEditor.jsx
- **`loadExistingPacks`** memo filters with **`withEditorSelectInjection`**; optional **Hidden**
  checkbox when editing and hidden mode is on.

src/components/ContentLibrary/ContentLibrary.jsx
- Filters packs (always including the default pack) and music tracks with **`isVisibleInUi`**;
  persists **`hidden`** toggles via **`audioManager.savePack`** / **`storageService.saveBackgroundTrack`**;
  passes dev props into cards; label tweak **“No Background Track”** for the system row.

src/components/ContentLibrary/AudioPackCard.jsx
- Optional **Hidden** checkbox (non-default packs) when **`showHiddenDev`** is on.

src/components/ContentLibrary/MusicTrackCard.jsx
- Same pattern for custom background tracks.

src/components/Instructions/Instructions.js
- Invisible **Developer** hit target (fixed bottom-left); five rapid clicks within one second
  toggles **`showHiddenContentAtom`** and **`alert()`**s whether hidden content is visible or
  concealed.

src/components/LevelEditor/LevelEditor.jsx
- **`existingLevels`** load path filters with **`isVisibleInUi`**; audio pack and background-music
  `<select>` option lists use **`withEditorSelectInjection`** so hidden selections remain addressable
  while editing.
- When Hidden Content is enabled and a level is being edited, exposes a **Hidden** checkbox on the
  level row bound to **`level.hidden`**.

src/components/Training/Training.jsx
- Filters custom levels with **`isVisibleInUi`**; keeps tab chrome if any customs exist; clears
  the selected level when it is hidden and concealed mode turns off.

src/components/Version.js
- Typo fix in inline styles: **`lefy` → `left`** (incidental change in the same snapshot).

src/constants/stringsreplace.js
- Achievement display string capitalization for **`in_love_with_the_sea`**.

src/services/audioManager.js
- **`savePack`** and import paths normalize **`hidden: true`** when saving pack metadata.

src/services/externalIntegrationService.js
- **`getShowHiddenContent()`** reading **`cliConfigCache.showHidden`** (with doc comment tying to
  **`--show-hidden`**).

src/services/levelManager.js
- **`saveLevel`** persists **`hidden: levelData.hidden === true`**.

src/services/musicTrackManager.js
- New imported tracks default **`hidden: false`** in metadata passed to storage.


## New Files

src/atoms/hiddenContentAtom.js
- **`readShowHiddenSyncOnce`**, **`showHiddenContentAtom`** (session-only; see summary above).

src/utils/hiddenContentVisibility.js
- **`isHiddenRecord`**, **`isVisibleInUi`**, **`filterByVisibility`**, **`withEditorSelectInjection`**,
  **`revertHiddenActiveSelections`** (clears active custom pack, active BGM track, or active
  non-default profile when those targets are hidden and concealed mode applies).

