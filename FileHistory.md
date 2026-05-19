# File history

This document summarizes per-file changes recorded in `CHANGELIST.txt` across revisions 1–34. For each file, entries are listed in chronological order (lowest revision number first).

## Existing Files

These paths were already present in v18 of the project, and were modified to varying degrees throughout the revisions history.

### `package-lock.json`

#### Revision 1

- Regenerated `**npm**` lockfile (**lockfileVersion** 3) without edits to root `**package.json**` `**dependencies**`: the `**packages**` map shrinks overall but churns heavily—hundreds of nested paths added/removed and many `**version` / `resolved` / `integrity**` updates—dominated by `**@babel/***` and related toolchain moving into the **7.27–7.28** release line plus nested dedupe layout changes from `**npm install**`.

#### Revision 4

- Regenerated with the same `**packages**` path set; only `**baseline-browser-mapping**` moves **2.9.16 → 2.9.17** (updated `**resolved**` tarball URL and `**integrity**`). Root `**package.json**` dependency declarations unchanged.

#### Revision 6

- Full `**npm**` lockfile regeneration: the `**packages**` map is rebuilt with a much larger transitive tree (thousands of additional `**node_modules/****` entries) to align with updated Electron / macOS packaging metadata in `**package.json**` (`**build.mac**` entitlements paths and `**extendInfo**` usage strings) and the resolved dev/build dependency graph.

#### Revision 34

- Records the resolved dependency tree for `**mediabunny**` (^1.45.2) and its sub-dependencies.

### `package.json`

#### Revision 34

- Adds `**mediabunny**`: `**^1.45.2**` (MP4 output via `**captureWorker**` / `**captureService**`).
- Sets `**homepage**` to `**"/"**` (was `**"./"**`) so the capture Web Worker URL resolves correctly in the packaged Electron app.
- Adds `**build:no-version**`: `**cross-env CI= react-scripts build**` — production `**react-scripts**` build **without** running `**increment-version.js**` (unlike the default `**build**` script).

### `public/electron.js`

#### Revision 2

- Added IPC handlers for executable management (execute-external-program, check-file-exists, show-file-picker), process registry Map for tracking spawned processes, whitelist configuration for allowed directories and file extensions, path validation with symlink resolution, and async process cleanup on app exit with platform-specific signal handling.

#### Revision 4

- Added CLI argument parsing at module load time with validation, IPC handlers for config retrieval, file I/O (session results, calibration data), exit code coordination, and path resolution relative to current working directory.

#### Revision 6

- Added systemPreferences and session to Electron require.
- In createWindow(), added macOS-only calls to systemPreferences.askForMediaAccess('camera') and systemPreferences.askForMediaAccess('microphone') before creating the browser window.
- Added session.defaultSession.setPermissionRequestHandler to grant media, camera, and microphone when the renderer requests them.
- Added session.defaultSession.setPermissionCheckHandler to return true for media, camera, and microphone so getUserMedia works in packaged macOS builds.

#### Revision 7

- Decoded pathname segments with decodeURIComponent in app protocol handler so percent-encoded filenames (e.g. spaces as %20) resolve correctly in packaged builds.

#### Revision 9

- Added write-binary-file IPC handler to write binary data (ArrayBuffer) to disk; creates parent directories if needed.

#### Revision 11

- CLI: added mirror: false to config; --mirror and --no-mirror switch cases.

#### Revision 15

- config.backgroundMusic; --background-music  parsing.

#### Revision 19

- CLI parse: `--profile` option in config.

#### Revision 31

- Config field `**autoStart**`; parse `**--auto-start**`; deprecated `**--headless**` maps to `**autoStart**` + `**console.warn**`; validation ties auto-start to `**--skip-calibration**` and `**--level**`.

#### Revision 34

- CLI parsing for `**--enable-captures**` / `**--capture-output**`; `**resolveCaptureOutputDirectory**` and `**ipcMain**` handlers (`**get-capture-output-path**`, `**save-capture-photo**`, `**save-capture-video**`, `**is-captures-cli-enabled**`); `**show-directory-picker**` (native folder selection with sane default-path resolution alongside existing executable picker / save dialogs).

### `public/lms-processor.js`

#### Revision 15

- NLMS AudioWorklet: input 0 mic, input 1 music reference; echo-cancelled output to analyser (clap detection).

### `public/preload.js`

#### Revision 2

- Exposed secure executable APIs (executeExternalProgram, checkFileExists, showExecutablePicker) to renderer process via contextBridge.

#### Revision 4

- Exposed CLI integration APIs (getCLIConfig, writeSessionResults, requestExit, sendValidationResults, readCalibrationFile) to renderer process via contextBridge.

#### Revision 9

- Exposed showSaveDialog and writeBinaryFile on electronAPI for renderer use.

#### Revision 34

- Bridges `**executeExternalProgram**`-style surface with `**showDirectoryPicker**`, `**getCaptureOutputPath**`, `**saveCapturePhoto**`, `**saveCaptureVideo**`, `**isCapturesCLIEnabled**` for the renderer bundle.

### `src/App.css`

#### Revision 32

- Removed fixed `**max-height**` on `**#video-container**` (was **80vh** / **60vh** / **50vh**) and removed `**#video-container video**` max-height sizing; retained width/padding; file comment notes preview max height is set from React (`**WebcamDisplay**` / viewport slider).

### `src/App.js`

#### Revision 1

- Added useEffect hook to call validateActivePack() after component mounts, and added routes for AudioPackEditor and ContentLibrary components in renderControls().

#### Revision 4

- Added external mode initialization with hybrid window ready detection, pre-flight checks, validation mode handling, calibration-only mode support, single level mode with pre-loaded level handling, loading states, and navigation state initialization based on CLI parameters.

#### Revision 9

- Added camera area wrapper with showCamera/showCameraArea/showCameraToggle logic. Renders WebcamComponent or "Camera is off" placeholder; CameraToggle below placeholder when camera disabled. Headless init sets camera on.

#### Revision 11

- Mirror mode: import MirrorToggle, mirrorModeAtom, effectiveMirrorAtom; initialize mirror from CLI (config?.mirror) before external mode check.
- Camera area, Cylinder, HeadlessWrapper wrapped with transform: scaleX(-1) when effectiveMirror; MirrorToggle beneath CameraToggle when camera off.

#### Revision 13

- Auto-switch to "All Grids" when nav becomes PLAYING and multiple grids exist (selectedGridIdAtom = null).

#### Revision 15

- backgroundMusicId passed into Playing merge.

#### Revision 16

- preloadSherpaOnnx() on load.

#### Revision 17

- import audioProcessingService; mount useEffect: preloadSherpaOnnx() + preloadSpeakPcmTapWorklet() with .catch logging; separate useEffect: one-shot pointerdown/keydown (capture) → resumeAudioContextIfSuspended().

#### Revision 18

- import `resolveExternalAudioPackId`; external mode init sets active voice pack via resolver (`getAudioPackId()` + level) instead of level-first / CLI-second.
- `prevNavRef` + effect: leaving `NAV.GAMEOVER` clears level, play state/time, feedback, music session (immediate), instruction warmup, gameplay mic.
- Imports: `feedbackAtom`, `playTimeAtom`, `clearMusicPlaybackSession`, `clearInstructionWarmup`, `stopGameplayMic`; `useRef` for nav tracking.

#### Revision 19

- `--profile` handling: normalize profiles from store, set `activeProfileId` when profile id exists; bump `levelRunGenerationAtom` where level runs start (with Training flow).

#### Revision 20

- Module-level `settleSherpaPreload()`: awaits `preloadSherpaOnnx()`, returns `{ ok, message }` on failure for a fallback user string.
- Each path to `setLoadingState('ready')` (non-external, external calibration-only, external single-level): `await settleSherpaPreload()` first; on failure set error state and return.

#### Revision 25

- Camera area wrapper has no `scaleX(-1)`; Mirror Mode transform remains on Cylinder and main controls only so preview can own mirror/rotation.
- External-mode calibration load paths use `await calibrationService.importCalibration(...)` (device resolution + apply) instead of synchronous `applyCalibration`.

#### Revision 31

- Imports `**AutoStartWrapper**`; camera-on and skip-cal / `**PLAYING**` navigation use `**isAutoStartMode()**`; `**Navigation**` hidden when auto-start; `**HeadlessWrapper**` replaced.
- `**initializeExternalMode**`: if `**isAutoStartMode()**` and `**!getLevelId()**`, show error and `**requestExit(5, 'auto_start_requires_level')**` after delay.
- Imports `**AutoStartCameraChrome**`; when auto-start, renders it at the top of the camera column (before `**WebcamComponent**` / off placeholder) so title and play/pause stay visible when `**showCamera**` is false.

### `src/atoms/audioAtom.js`

#### Revision 1

- Added activePackIdAtom for reactive state management of the currently active audio pack.

#### Revision 7

- Added sfxVolumeAtom and voiceVolumeAtom with atomWithStorage (default 100%, persisted to localStorage).

#### Revision 11

- Added stopVoiceRequestAtom (counter) to request voice channel stop when suppressFeedback transitions.

#### Revision 15

- musicVolumeAtom, musicFadeInEnabledAtom, musicFadeInDurationAtom, musicFadeOutEnabledAtom, musicFadeOutDurationAtom.
- activeBackgroundTrackIdAtom (persisted) for Content Library selection; atomWithStorage options `{ getOnInit: true }` so persisted id is loaded before first component subscribes (fixes Test Background Track / level music without opening Content Library first).
- musicPlaybackSessionAtom (url, generation, stopFade) drives AudioPlayer.

#### Revision 16

- taskInstructionVoicePhaseAtom, speakRecognitionAllowedAtom; micInputDeviceIdAtom (atomWithStorage, getOnInit).

#### Revision 18

- micInputDeviceIdAtom comment: document legacy null and normalization in MicInputDevicePicker.

#### Revision 22

- New `speakPcmFeedAllowedAtom`; `speakRecognitionAllowedAtom` documented as match/scoring only.

#### Revision 28

- Comment on `taskInstructionVoicePhaseAtom`: documents instruction lifecycle for Speak and (with `useClapInstructionPhase` + `AudioPlayer`) Clap/Hold-and-Clap; excludes feedback lines.

### `src/atoms/gridAtoms.js`

#### Revision 5

- Added multi-grid atoms including gridsAtom (array of grid objects), selectedGridIdAtom (currently selected grid ID), selectedGridAtom (derived selected grid object), and isAllGridsModeAtom (derived "All Grids" mode flag).
- Added allGridSquaresAtom to combine squares from all grids, gridSquareOwnershipAtom to track which grid owns each square, and combinedShaftPercentAtom to calculate combined shaft percentage across all grids.
- Added gridAverageColorsAtom and gridColorsAtom for per-grid color tracking, gridMigrationDoneAtom to track migration completion, and kept legacy atoms for migration compatibility.

#### Revision 15

- ballsCoveredStateAtom (writable) for hysteretic balls-covered state; ballsCoveredAtom derives from it when hasBallsGrids.

### `src/atoms/markersAtoms.js`

#### Revision 15

- clapTestEnabledAtom (atomWithStorage, key clapTestEnabled): Mic tab clap test mic on/off; gameplay clap detection ignores this (see ClapDetector); default false until user enables Clap Test.

#### Revision 17

- `micAudioTestModeAtom`, custom storage with legacy migration and invalid-value normalization to `off`; removed `clapTestEnabledAtom`.

### `src/atoms/navAtom.js`

#### Revision 1

- Added AUDIO_PACK_EDITOR and CONTENT_LIBRARY navigation constants for the new UI components.

### `src/atoms/playerAtom.js`

#### Revision 15

- achievementsStoredAtom: fourth argument to atomWithStorage `{ getOnInit: true }` so persisted achievement unlocks and progress load before first subscribe (avoids empty default on first completion after app load).

#### Revision 19

- `playerProfilesAtom` with `atomWithStorage` + custom storage; re-export model helpers; derived atoms for time/dive/session/performance/achievements scoped to resolved active profile; `achievementCheckerAtom` reads derived stats.

### `src/atoms/taskAtom.js`

#### Revision 19

- `levelRunGenerationAtom` for idempotent level-completion persistence.

### `src/components/Achievements/Achievement.js`

#### Revision 23

- `type: 'time'` progress line uses `formatHoldTimeStatsDisplay` for current and target (tenth-second display).

### `src/components/Achievements/Achievements.js`

#### Revision 19

- “Profile Selection” heading; renders `ProfileManager` above stats/achievements grid.

### `src/components/Achievements/Stats.jsx`

#### Revision 19

- Per-profile stats display; reset default / delete all profiles / delete all custom content / delete profile flows with countdowns; session lock during play/gameover; confirmation modal for delete-all-custom; `clearAllOtherDestructiveCountdowns`; `runFactoryReset` chains `audioFileService.clearAllAudioFiles`, `storageService.clearAllCustomContent`, `audioManager.clearCustomContentCache`, `audioManager.validateActivePack`, and default `playerProfiles` state.

#### Revision 23

- Hold Time Stats total and per-depth rows use `formatHoldTimeStatsDisplay` instead of `formatTime`.

### `src/components/Achievements/achievementsData.js`

#### Revision 23

- `dozen` (Oral Service): `total` corrected from 7 to 12 so count progress matches `levelCompletionPersistence` unlock and strings.

### `src/components/AudioPlayer.js`

#### Revision 1

- Refactored all useEffect hooks to properly handle async operations with cancellation logic, added Audio element cleanup to prevent memory leaks and overlapping playback, and updated to use async getAudioFile() consistently throughout.

#### Revision 7

- Split playback into separate SFX and Voice channels using distinct audio refs so they no longer interrupt each other; applied volume from atoms to each channel.

#### Revision 11

- Added instructionPlayingRef to track when task instruction audio is playing.
- Extended playVoice to accept optional onEnded callback, invoked when audio finishes.
- Task instruction effect sets instructionPlayingRef true before play, passes onEnded to clear it, and clears in cleanup.
- Feedback effect guards: if instruction is playing, clears feedback atom and returns without playing.
- Added stopVoiceRequestAtom subscription; effect stops voice and clears feedback when stopVoiceRequest increments.
- Extended playVoice to accept optional signal (AbortSignal); abort handler stops playback immediately.
- playVoice now returns Promise resolving when audio ends (or on abort); enables proper feedback effect sequencing.
- Feedback effect uses AbortController; cleanup aborts to stop in-flight playback when feedback cleared.

#### Revision 15

- Music channel: musicAudioRef, musicGainRef; musicPlaybackSessionAtom, musicVolumeAtom, fade atoms.
- Fade in/out logic; connectMusicReference for LMS routing; teardown on session clear.
- fadeOutThenTeardown: clear overlapping fade timeout/promise and disconnect before starting another fade; avoids stacked fades when session changes quickly.

#### Revision 16

- Speak task instruction effect sets taskInstructionVoicePhase (playing → cooldown → ready); feedback effect guards for Speak / instruction playing.

#### Revision 17

- musicVolume useEffect: resolve ctx as gainNode.context || g.context (g = gainNode.gain); early return if !ctx before cancelScheduledValues / setValueAtTime / linearRampToValueAtTime.

#### Revision 18

- Voice: `voiceBufferSourceRef` / `voiceWebGainRef`, `disconnectVoiceWebAudio`; primary path `fetch` + `decodeAudioData` + BufferSource + gain → `ctx.destination`; `resume()` after decode if context not running; HTML fallback on failure; volume effect updates Web Audio gain; stop-voice and unmount disconnect Web Audio voice graph.
- BGM + first instruction: `settleOutputPipelineAfterMediaElementStart(ctx)` (~150 ms silence after `audio.play()`); `musicStartedPromiseRef` / `createMusicStartedGate` / `resolveMusicStartedGate`; instruction effect awaits gate only for first task when a gate exists; `!url` / effect cleanup / unmount resolve gate and clear ref so voice is never blocked indefinitely.

#### Revision 21

- `preferVoiceHtmlAudioFirst()`: true for `file:` / `app:` document protocols.
- `playVoice` / `runWithUrl`: shared `playVoiceViaHtmlElement(rejectOnFailure)`; HTML-first when preferred; `audio.onerror` rejects or resolves so HTML-first cannot hang; final HTML fallback; `getAudioFile` `.catch` → `null`.
- `playSfx`: try/catch around `getAudioFile`.
- SFX effect: try/catch/finally, `setSfx(0)` in `finally`, `void playAudio()`.
- Instruction voice effect: try/catch, speak phase reset on error, `void playAudio()`.
- Feedback effect: try/catch/finally, `setFeedback(0)` in `finally` when not aborted, `void playAudio()`.

#### Revision 22

- `speakPcmFeedAllowedAtom`; `playVoice(..., { instructionOverlap, signal })`: PCM overlap timer from duration, cleared on end/error/abort; instruction effect uses `AbortController`; `onEnded` / error / `stopVoiceRequest` ensure PCM feed opens when appropriate.

#### Revision 28

- `instructionVoiceDrivesPhase` (Speak or CLAP or HOLDANDCLAP): set `taskInstructionVoicePhase` playing when starting instruction audio; `onEnded` and error path advance cooldown→200 ms→ready (formerly Speak-only after end).
- `stopVoiceRequest`: apply the same cooldown/ready transition when trimmed instruction audio exists for Speak or Clap/Hold-and-Clap; `setSpeakPcmFeedAllowed(true)` only for Speak.

### `src/components/Calibration/BaseColorControls.js`

#### Revision 5

- Refactored to read and write base color from selected grid's baseColor property within gridsAtom.
- Added support for "All Grids" mode disabling individual grid editing.
- Updated to use gridAverageColorsAtom for "Capture current average" functionality.

#### Revision 9

- Added disabled prop support.

### `src/components/Calibration/Calibration.js`

#### Revision 4

- Added CalibrationExport and CalibrationImport components, and "Complete Calibration" button for calibration-only mode that exports calibration data and exits application.

#### Revision 5

- Updated to use multi-grid atoms (gridsAtom, selectedGridAtom) instead of legacy single-grid atoms.
- Added logic to calculate base color from selected grid or average of all grids in "All Grids" mode.
- Updated to use combinedShaftPercentAtom instead of legacy gridShaftPercentAtom.

#### Revision 7

- Added Audio Settings section with VolumeControl sliders for SFX and Voice, placed between export/import buttons and Help section.

#### Revision 8

- Removed Audio Settings section (moved to Mic/Audio tab).

#### Revision 9

- Added cameraEnabledAtom; disables grid calibration when camera off; shows banner and placeholder readings when camera disabled. Passes disabled/placeholder props to controls.

### `src/components/Calibration/CalibrationTester.js`

#### Revision 15

- ballsCovered from ballsCoveredAtom for feedback and display; removed unused grids/hasBallsGrids.

### `src/components/Calibration/HysterisisControls.js`

#### Revision 9

- Added disabled prop support.

### `src/components/Calibration/PercentControls.js`

#### Revision 9

- Added disabled prop support.

### `src/components/Calibration/SensitivityControls.js`

#### Revision 5

- Refactored to read and write sensitivity from selected grid's sensitivity property within gridsAtom.
- Added support for "All Grids" mode disabling individual grid editing.
- Updated handlers to modify gridsAtom using function updaters for proper state management.

#### Revision 9

- Added disabled prop support.

### `src/components/ColorReading.js`

#### Revision 9

- Added placeholder prop for display when camera disabled.

### `src/components/Cylinder/Cylinder.css`

#### Revision 27

- `grid-row-1`: `display:flex` plus equal `.cylinder-item { flex:1; min-width:0 }` (replaces grid) for equal shaft columns.

### `src/components/Cylinder/Cylinder.jsx`

#### Revision 11

- TaskType.ENDLESS: color sections 1–currentDepth from currentStateAtom; colPrimary for reached coverage.
- Mirror mode: removed local mirror state; added MirrorToggle next to arrows button; mirror transform applied by App.js wrapper.

#### Revision 13

- REST/REST_BALL: sectionBelow red only when ballsBonus and hasBallsGrids.
- ENDLESS: sectionBelow red when hasBallsGrids, ballsCovered, and currentDepth === 0 (earning balls bonus).
- Import ballsCoveredAtom.

#### Revision 14

- Removed REST_BALL task type; REST only. Backward compat: 'rest ball' string handled for existing levels.

#### Revision 27

- Wire ↔ button: `aria-pressed`, `button-primary` when inverted; toggles `depthDiagramInvertedAtom`.
- When inverted, apply `scaleX(-1)` to `.cylinder-container` (`transformOrigin: center`) so cylinder backgrounds/borders/`round-right`/`round-bottom` mirror geometrically; `diagramTextUnmirror` wraps numbers, balls label, and task instructions with `scaleX(-1)` so glyphs stay readable beside App-level Mirror Mode.

### `src/components/Cylinder/TaskInstructions.jsx`

#### Revision 11

- TaskType.ENDLESS: instruct "Freeform".

#### Revision 14

- Removed REST_BALL case; 'rest ball' falls through to REST for backward compatability.

#### Revision 16

- TaskType.SPEAK instruction copy.

### `src/components/ExternalMode/AutoStartWrapper.jsx`

#### Revision 31

- New wrapper component for CLI auto-start mode (nav hidden from `**App.js**`); replaces `**HeadlessWrapper.jsx**`.

### `src/components/Gameover/Gameover.js`

#### Revision 4

- Added session result export via IPC in external mode, auto-close functionality with appropriate exit codes.
- Added countdown timer display showing remaining time before application closes (15 seconds), only visible in external mode.

#### Revision 8

- Added ENDLESS case to calculateLevelScores. Added Endless summary display branch. Updated getTotalHoldTimeForDepth and getTotalDivesForDepth for Endless.

#### Revision 16

- Perfect/pass totals and summary line for TaskType.SPEAK.

#### Revision 18

- Summary: import `getSummaryAudioRef`; `levelDefinition` via `levelManager.getLevel(currentLevel.id)`; `soft` from definition ?? `currentLevel`; `setFeedback` from summary ref instead of rank switch / `AUDIO.Rank`; removed direct `AUDIO` import.
- Navigation: unmount cleanup stops gameplay mic + clears instruction warmup; `onReturnToMenu` sets `nav` to Training only (session reset in App).
- Removed unused `setCurrentLevel` after centralizing level clear on leave Gameover.

#### Revision 19

- Level complete: `computeLevelCompletionUpdate`, single `playerProfilesAtom` merge; respect `statTrackingEnabled`; guard with run generation + processed completion key; imports `playerProfilesAtom`, `normalizePlayerProfilesState`, `getResolvedActiveProfileId`.

#### Revision 23

- After session merge, `getLevelsNewlyUnlockedByPrerequisites` drives an optional “Level(s) unlocked” summary above achievements when applicable.

#### Revision 30

- Rank `**useEffect**` uses `**evaluateSessionEnd(currentLevel)**`; sets `**pendingExternalExportRef**` (`**runKey**`, `**expectedPlayTime**`, `**expectedRank**`) before `**setPlayTime(0)**`.
- External export `**useEffect**` depends on `**levelPlayTime**` / `**playerRank**`, gates on pending snapshot + `**exportedRunKeyRef**` per `**levelRunGenerationAtom**` run.

#### Revision 34

- Reads `**captureSessionAtom**`: when `**capturesEnabled**`, Stats card always shows **Photos:** and **Videos:** rows with `**visiblePhotosTaken**` / `**visibleVideosTaken**` (including 0); both rows omitted when the capture gate did not clear.

### `src/components/LevelEditor/AudioSelector.jsx`

#### Revision 12

- Removed direct import of getAudioFile from audioResolver.
- handlePreview now uses audioManager.getAudioFileForPack(value, audioPackId); custom-content URL resolution handled by audioManager.

#### Revision 14

- When building options from pack: Custom category uses CUSTOM_KEYS (Custom1–Custom20) instead of Object.keys.
- hasFiles check for Custom entries (Array or single value).
- Custom option labels use customNames when available.

#### Revision 18

- Optional `summaryStyle` grid layout (aligned label column, bounded select width, reserved Preview column); optional `summaryExtra` between select and Preview for summary custom-voice checkbox; `maxWidth` differs with vs without `summaryExtra`.

#### Revision 25

- `omitLabel` to hide the label column; optional `selectStyle` for non-summary `<select>` (merged with `boxSizing`).

#### Revision 32

- Imports `**CUSTOM_VOICE_SLOT_KEYS**`; when merging custom pack `**Custom**` keys, uses `**CUSTOM_VOICE_SLOT_KEYS**` instead of a twenty-slot `**CUSTOM_KEYS**` array.

### `src/components/LevelEditor/LevelEditor.jsx`

#### Revision 1

- Added Level ID display in Preview section for easy identification when using CLI, displayed in monospace font with light background for readability.
- Removed disabled attribute from audio pack selector and updated label from "Audio Pack (coming soon):" to "Audio Pack:" to enable pack selection.
- Changed dropdown option from "Default Audio Pack" to "Use Selected Audio".
- Updated help text to explain behavior based on selection (specific pack vs. use selected audio).

#### Revision 11

- Import levelDifficultyService.
- Added difficulty override section: display computed difficulty, checkbox "Override difficulty", conditional NumberControl (1–11, step 0.5) when checked.

#### Revision 12

- Sort getCustomLevels() by order in useEffect (initial load) and handleSave (refresh after save).

#### Revision 15

- backgroundMusicId state; Background Music dropdown (None / use selected library track / per-track); save/load/import backgroundMusicId.
- Help text for custom levels added.

#### Revision 18

- `SummaryAudioEditor` below `TaskBuilder`; `handleSummaryRankChange` / `handleSummaryShowCustomChange`; `summaryAudio` and sparse `summaryAudioShowCustom` on level state; removed Soft Mode checkbox and `soft` from new-level defaults.

#### Revision 20

- Save Level control: added `button-primary` class with `button` for blue styling consistent with navigation and other primary buttons.

#### Revision 23

- Level `customSubfolder` on new/load/import/save; subfolder select labels from `pickCustomLevelFolderNames`; global folder name section layout aligned to SummaryAudioEditor (tweak constants `SUBFOLDER_NAMES_SLOT_COLUMN_GAP_PX`, `SUBFOLDER_NAMES_SLOT_ROW_LABEL_GAP_PX`); extra top margin above that section; "Folder N:" labels and ids `custom-subfolder-name-folder-N`.
- Prerequisite rows: add/remove, rank and prerequisite level selects (defaults + customs sorted by `order` then id); load/import/save `prerequisites`; `levelManager.saveLevel` applies normalization and DAG validation.

#### Revision 24

- `prerequisiteSourceLevels`: custom entries from `existingLevels` (filter current `level.id`, sort by `order` then id) plus default levels; deps `[level.id, existingLevels]` replace `existingLevels.length` + `getCustomLevels()` in the memo body.

#### Revision 33

- `**loadExistingFolderFilter**` state (`**'all'**` or a 1-based slot); `**folderSlotsWithLevels**` and filtered `**levelsForLoadSelect**`; `**useEffect**` clears the filter when the selected slot is no longer in `**folderSlotsWithLevels**`.
- **Load Existing Level**: folder `**select**` above level `**select**`; `**customFolderDisplayLabel(activeFolderRow, slot)**` for option text; level `**select**` keyed by filter so the placeholder resets when the folder changes; flex column `**alignItems: 'stretch'**`, `**width: '100%'**`, block selects `**width: '100%'**` for full-width dropdowns.
- Removed heading 'Load Existing Level'
- **Task clipboard**: `**useAtom(levelEditorTaskClipboardAtom)**`; `**handleCopyTaskAtIndex**` (`**structuredClone**`); `**handlePasteTask**` (functional `**setLevel**`, append with new `**id**` via `**getRandomInt**`); `**handleClearTaskClipboard**`; passes `**clipboardTask**`, `**onCopyTask**`, `**onPasteTask**`, `**onClearClipboard**` to `**TaskBuilder**`.

#### Revision 34

- `**DEFAULT_CAPTURE_LEVEL_FIELDS**` merge on load/import/new/import flows; `**captureSettingsOpen**` state (`**useState(true)**`) drives a full-width **Capture Settings** disclosure button with **▼ / ▶** in the label (expanded by default).
- Expanded panel: padded `**#fafafa**` region, `**1px**` border, `**6px**` radius; level toggles **Allow captures for this level** / **Allow hidden capture notifications**; when captures allowed, `**NumberControl**` `**centerRow**` rows for chance, compounding %, cooldown (min **5**), type bias, **Photo limit** / **Video limit** (**0–999**), optional **Capture output directory** text `**input**` + **Browse** ( `**executableService.pickDirectory**`, disabled + title when no desktop picker), **Show standby / inactive icons** checkbox, and an amber warning when both capture limits are **0**.
- Dev **Hidden** checkbox label text becomes **Hidden Level**.

### `src/components/LevelEditor/TaskBuilder.jsx`

#### Revision 8

- Added + Endless button. New Endless tasks include scoreEvents, repeatEvents, and audio defaults.

#### Revision 11

- Extracted addTaskBar into reusable block; duplicate add bar at bottom of task list ("Add another task" / "Tasks" heading).
- Pass taskNumber={index + 1} to TaskForm.
- New tasks default suppressFeedback: false.

#### Revision 14

- New tasks default showCustomVoiceLines: false.
- Removed REST_BALL from task type defaults.
- Get Ready and Finish: removed time from new task defaults; only timeLimit used.
- Hit Depth and Clap: new tasks use calculated timeLimit (calculateHitDepthTimeLimit, calculateClapTimeLimit).

#### Revision 16

- - Speak button; defaults for phrase, speakMode, timeLimit, audio when adding SPEAK.

#### Revision 25

- New Hold tasks: `audioHalfway` / `audioThreeQuarter` for depth 1 via `getDefaultHoldAudioHalfway(1)` / `getDefaultHoldAudioThreeQuarter(1)`.

#### Revision 33

- `**CLIPBOARD_TASK_TYPE_LABEL**` (maps `**TaskType**` to add-button labels); per-row **Copy** (stacked with move controls); toolbar **Paste** / **Clear clipboard** with `**title**`, `**aria-label**`, `**aria-disabled**`; paste label `**+ Paste '<Type>'**` when clipboard non-empty (`**+ Paste Task**` when empty).

### `src/components/LevelEditor/TaskForm.jsx`

#### Revision 2

- Added executable path field with Browse button (file picker), Test button, and Clear button, applying to all task types with browser mode detection and appropriate messaging.

#### Revision 8

- Moved Executable Script section above Score Events for Endless tasks. Added Endless score events UI with Add/Remove events, type-specific fields (play_sound, run_script, add_grace), and Repeat Events checkbox. Auto-select Endless.ENDLESS audio when task type changes to Endless.

#### Revision 11

- Added taskNumber prop; display #N in header when provided.
- Added moveScoreEvent helper; up/down reorder buttons for endless task score events.
- Added "Skip feedback (fast transition)" checkbox; updates task.suppressFeedback.

#### Revision 14

- Get Ready and Finish: removed redundant "Time" field; single "Time" field (stored as timeLimit) with min 1.
- Get Ready, Rest, Finish: renamed "Time Limit" label to "Time".
- Hit Depth: auto-calculate timeLimit when repeat or task type changes (10 + repeat * 7); removed "Leave at 0 for Auto" hint.
- Clap: auto-calculate timeLimit when repeat or task type changes (10 + repeat * 4).
- "Show Custom Voice Lines" checkbox; when enabled, Custom.* options appear in Audio dropdown.
- Pack loading: use packId ?? audioManager.getActivePackId() for fresh load from localStorage (fixes stale active pack).
- Checkbox styling: compact vertical margins, aligned with Audio dropdown (marginLeft: 2rem).
- Endless score events: scoreEventSoundOptions includes getCustomAudioOptions when showCustomVoiceLines enabled.
- Removed Rest Ball from task type dropdown; backward compat for 'rest ball' in form fields and select value.

#### Revision 16

- Speak task fields: phrase, speakMode, helpText, repeat, timeLimit, audio, etc.

#### Revision 22

- Speak phrase placeholder and help: document `[word1, word2]` alternative syntax.
- Speak tasks: checkbox `speakEndpointFuzzy` with help text for looser endpoint-only matching.
- Speak phrase placeholder and Alternatives help: optional omission via `-` in brackets; `[-]` alone ignored (same phrase without that bracket pair).

#### Revision 25

- Hold-only row: Voice-Main / Voice-Halfway / Voice-3Q mode `<select>` (resets to Voice-Main on `task.id`, `targetDepth`, or type → hold); `AudioSelector` with `omitLabel` and mode-dependent `value` / `onChange` / `allowedOptions`; `holdVoiceLineSelectStyle` from longest Voice-Main option label (`ch` width); depth/type updates set `audioHalfway` / `audioThreeQuarter` from depth; removed separate "Hold halfway" / "Hold 3/4" rows.

#### Revision 29

- Endless score events: graceVoiceKey / graceVoiceShowCustom for Add Grace (Rest getAudioOptionsForTaskType; voice + checkbox row layout).
- Play Sound: soundVoiceShowCustom with task-level fallback; checkbox inline with sound select (reduced width).
- Run Script: optional scriptVoiceKey / scriptVoiceShowCustom (same EVENT/custom options as Play Sound); script path row plus voice block.
- Type switches strip grace-related fields, soundVoiceShowCustom, and scriptVoiceKey/scriptVoiceShowCustom when leaving the corresponding event types.
- Score event type select option order: Play Sound, Add Grace, Run Script.
- Delete-event button placed after +Max pts with spacer matching NumberControl label + 38px row for alignment.

#### Revision 33

- `**add_vibration**`: `**NumberControl**` rows for **+Vibe Min** / **+Vibe Max** (range **−1**–**1**, step `**0.05**`); optional vibration voice line `**select**` and **Show Custom Voice Lines** checkbox (shared layout constants with other event types).
- Normalized width of voice line selector in score events

#### Revision 34

- `**captureSupportForTaskType**`, `**captureOptionsSection**` (collapsible beneath executable script wiring for Endless + standard tasks).

### `src/components/LevelEditor/taskAudioConfig.js`

#### Revision 8

- Added Endless.ENDLESS as default in ENDLESS_AUDIO. Added EVENT_SOUND_OPTIONS for score-triggered events. Added getDefaultEndlessAudio helper.

#### Revision 14

- getCustomAudioOptions(audioPackId, customNames): loads pack via packId ?? audioManager.getActivePackId() for fresh data.
- getAudioOptionsForTaskType(taskType, showCustomVoiceLines, audioPackId, customNames): when showCustomVoiceLines true, appends getCustomAudioOptions to base options.
- getAudioOptionsForTaskType: 'rest ball' case retained for backward compat with existing custom levels.

#### Revision 17

- HIT_AUDIO: added Hit.ONE option for Hit Depth tasks (matches Hit.TWO–FOUR and depth-1 default audio).

#### Revision 18

- `DEFAULT_LEVEL_SUMMARY_AUDIO_OPTIONS`; `mergeSummaryAudioAllowedOptions`; `buildSummaryAudioRowOptions` (base + optional `getCustomAudioOptions` per rank when `summaryAudioShowCustom[rank]`).

#### Revision 25

- `HOLD_PROGRESS_HALF_AUDIO`, `HOLD_PROGRESS_3Q_AUDIO`; `holdDepthWord` / `HOLD_DEPTH_WORD`; `getDefaultHoldAudioHalfway`, `getDefaultHoldAudioThreeQuarter`; `getHoldProgressHalfAudioOptions`, `getHoldProgress3QAudioOptions` (optional Custom.* when custom voice lines are enabled).

#### Revision 32

- Imports `**CUSTOM_VOICE_SLOT_KEYS**`; `**getCustomAudioOptions**` iterates `**CUSTOM_VOICE_SLOT_KEYS**` (replaces inline twenty-slot `**CUSTOM_KEYS**`).

### `src/components/Mic/Mic.js`

#### Revision 8

- Added Audio Settings section with SFX and Voice volume sliders below Calibrate Clap Detection. Center-aligned layout with h2 heading. Added margin-y-top for spacing.

#### Revision 15

- Volume Settings: SFX, Voice, Music. Background Track Settings: Fade In/Out checkboxes, Duration (s) NumberControls; Test Background Music row above Test Voice / Test SFX.
- Test Voice / Test SFX: cyclical Calibration.* and Sfx.* via feedbackAtom/sfxAtom; button labels show next key (useState indices); resolves active voice pack like gameplay.

#### Revision 16

- MicInputDevicePicker below help text, above ClapDetector.

#### Revision 17

- Speech test toggle; conditional `SpeechDetectionCalibration`; help text.
- Import `./Mic.css`; Audio tab section spacing via `mic-audio-section` on speech / Background Track / Volume blocks; ClapDetector wrapped in `div.mic-audio-section`; removed `margin-y-top` / `margin-y margin-y-top` where sibling rule supplies gap.

#### Revision 23

- `levelInProgress` from `currentLevelAtom` + `playState`; `disableClapTestToggle` on calibration `ClapDetector`; Speech Test button disabled with title; effect forces `micAudioTestMode` off when clap/speech during an in-progress level.

#### Revision 24

- `testMusicOnRef` synced each render; unmount cleanup clears `musicPlaybackSessionAtom` only when `testMusicOnRef.current` (test music was running).

#### Revision 27

- `testMusicOnRef`: set `true` immediately after `setMusicSession` in `startTestMusic`, `false` at the start of `stopTestMusic`; removed per-render `testMusicOnRef.current = testMusicOn` so intermediate renders cannot reset the ref before test state commits; comment notes why unmount cleanup stays in sync with jotai session.

#### Revision 28

- `TEST_MUSIC_FADE_END_SLACK_MS`; `testMusicStopFadeEndTimeoutRef`; unmount cleanup clears the timeout then hard-stops session when `testMusicOnRef` is true.
- `startTestMusic`: clear pending fade-end timeout before applying a new session.
- `stopTestMusic`: defer `testMusicOnRef.current = false` until after fade duration + slack when fade-out is enabled and duration > 0; otherwise immediate; always clear any prior fade-end timeout.

### `src/components/Mic/SpeechDetectionCalibration.js`

#### Revision 17

- Transcript UI + useMicStreamForCalibration + useSherpaMicTap.
- Staged help for speech test: PCM → decode → listening.

#### Revision 22

- `useSherpaMicTap`: `pcmFeedAllowedRef` (always true) replaces the old combined recognition ref name.

### `src/components/Navigation.js`

#### Revision 1

- Added navigation buttons for Audio Pack Editor and Content Library with appropriate icons and handlers, and reorganized menu layout into two rows: Row 1 (Help, Calibrate, Mic, Buttplug, Levels, Play) and Row 2 (Content Library, Audio Pack Editor, Edit Levels, Achievements).

#### Revision 4

- Added conditional rendering to show LimitedNavigation component when external mode is active, hiding full navigation menu.

#### Revision 8

- Renamed Mic tab label to Audio (kept Mic icon).

#### Revision 9

- Removed camera toggle from navigation row (moved to camera area).

#### Revision 19

- Achievements nav label: “Profiles”.

#### Revision 23

- Pause → play: async mic ensure before resuming; `resumeMicLoading` disables play/pause button during restart.

#### Revision 31

- Split: outer `**Navigation**` runs `**useButtplug**` and external-mode branch; inner `**NavigationMain**` holds full nav UI and `**usePlayPauseHandler**` for play/pause (avoids double hook use when `**LimitedNavigation**` is shown).
- Title uses `**APP_DISPLAY_TITLE**` from `**src/constants/appMeta.js**`.

### `src/components/NumberControl.jsx`

#### Revision 9

- Added disabled prop support.

#### Revision 34

- Optional `**centerRow**` prop aligns inline-flex numeric rows under centred labels.

### `src/components/PlayTime.jsx`

#### Revision 31

- Comment: timer lives in `**Playing.js**` when nav is hidden in CLI auto-start mode.

### `src/components/Playing/ClapDetector.js`

#### Revision 8

- Added margin-y-top above Calibrate Clap Detection heading.

#### Revision 15

- Calibration UI: Clap Test On/Off (button-primary when on); clapTestEnabledAtom; frequency "—" when mic off; micEnabledForClap = !isCalibration || clapTestEnabled so gameplay always uses mic.
- Passes micLifecycle "gameplay" vs "own" to useClapDetection.

#### Revision 17

- `micAudioTestModeAtom`; mic on when mode is `clap` in calibration.

#### Revision 23

- Optional `disableClapTestToggle` for calibration Clap Test button (disabled + title when a level is in progress).

#### Revision 27

- Calibration help mentions spike above noise floor and sharp rise; frequency `<pre>` shows high band, residual×100, and rise×100.

#### Revision 33

- `**useButtplug**` (`**adjustVibration**`, `**stopVibration**`); `**adjustVibration(0.05)**` when `**!isCalibration**` and `**prev < targetClaps**` inside `**handleClap**`; `**useEffect**` cleanup calls `**stopVibration**` on unmount.
- `**InstructionPhaseBanner**`: `**enabled={!isCalibration}**`, `**hasInstructionAudio**` prop (default `**true**` for Mic calibration usage).
- Row-centered banner under the title when gameplay waits on instruction voice.

### `src/components/Playing/CountdownTimer.js`

#### Revision 14

- Hit Depth and Clap: timerDuration fallback when timeLimit 0/missing; hasDuration for display.

#### Revision 16

- TaskType.SPEAK default time limit via calculateSpeakTimeLimit when timeLimit unset.

### `src/components/Playing/CurrentShaft.js`

#### Revision 13

- When Rest+ballsBonus+balls grid: show "Balls%" (combinedBallsPercent) and "Balls On" (0/1) instead of Dildo%/Suck Depth.

#### Revision 14

- Removed REST_BALL; backward compat for 'rest ball' in showBallsMode.

### `src/components/Playing/Diving.js`

#### Revision 10

- Added diveState to effect dependency arrays so depth feedback re-runs when depth changes.

#### Revision 11

- Added lastProcessedMotionRef deduplication guard in RATE & ERRORS effect to prevent duplicate score entries when provideFeedback/adjustVibration cause effect re-runs.
- Reset guard when motion.dir === 'down' (new dive) and on task setup.

#### Revision 34

- `**useTaskCountdownLeft**` + `**onSignalCaptureWindow**` callback for countdown-stable video-eligibility windows toward the tail of Up-and-Down dives.

### `src/components/Playing/EndlessDive.js`

#### Revision 8

- Major rewrite: added task/onTaskOver props, useTimeLimit, hold and dive scoring, useClapDetection for claps during holds, rhythm and depth consistency bonuses, grace period and surface penalties, score-triggered events. Replaced Recent Movements with ScoreList. Added running totals display.

#### Revision 10

- Added diveState to effect dependency arrays; fixed grace/surface interval stale closure by using depthRef.current for at-surface check.

#### Revision 11

- Grace period decay interval: tempGraceRef decay now guarded by hasStartedRef.current.
- Grace period decay interval: gracePeriodRef decay condition now includes hasStartedRef.current.
- Hold grace: multiplied by DEPTH_GRACE_FACTOR based on hold depth.
- Dive grace: multiplied by DEPTH_GRACE_FACTOR based on dive end depth.
- Dive grace: rhythmBonusRef and depthBonusRef multipliers (1 + rhythmMult) × (1 + depthMult).
- Grace persistence: restore from endlessGrace on mount, persist on unmount; restore hasStarted when resuming.
- Score feed: restrict to last 5; persist endlessScores (allScores, totals, refs) on unmount, restore on mount.
- Removed Current State/Depth; added "Rest Time:" label above grace bar.

#### Revision 13

- Balls bonus: only when ballsCovered and at surface (currentStateRef); add balls bonus entries to allScores (lastIntervalsCompletedRef); include ballsBonus in newTotals on hold/dive completion.
- Hold timer: reset holdStartTimeRef, lastIncrementTimeRef, setTimeHold(0) when diveState.current > diveState.previous (increasing depth).
- Import currentStateAtom; currentStateRef for interval closure.

#### Revision 15

- ballsCovered from ballsCoveredAtom instead of inline combinedBallsPercent < ballsDepthPercent.
- micLifecycle "gameplay" for useClapDetection.

#### Revision 17

- Anchor hold model: arming timer, per-frame accumulation, commit on shallower/surface, abort on anchor+2; holdDepthDisplay / hold line UI; throttled hold timer state; dive-only scoring on motion.dir === 'up'; conditional clap clear on dive; holdSegmentState save/restore for pause.

#### Revision 19

- Anchor hold model, grace display, hold depth UI, integration with `GraceStatusBar` and scoring helpers; aligns with Endless summary output in `taskSummary.js`.

#### Revision 27

- Prior-dive `**diveHistoryRef**` + `**lastDiveAtMsRef**`; accumulate `**rhythmBonusRef**` / `**depthBonusRef**` per dive (`**totalDiveScoreRef**` raw-only); idle **>10 s** clears history; grace scales from **this dive’s** rhythm/depth bonus ÷ raw; dive `**movement**` includes match counts, bonus amounts, `**displayScore**` (raw + bonuses); persistence `**diveHistory**`, `**lastDiveAtMs**` (restore `**diveWindow**` legacy via normalizer).

#### Revision 29

- add_grace: after applying grace, setFeedback(ev.graceVoiceKey) when set.
- run_script: execute when executablePath is set; setFeedback(ev.scriptVoiceKey) when set (voice may play without a path).

#### Revision 33

- Imports `**playStateAtom**`, `**PlayState**`; `**useButtplug**` (`**adjustVibration**`, `**stopVibration**`, `**setVibrateSpeed**`); refs `**playStateRef**`, `**hasBallsGridsRef**`, `**ballsCoveredRef**`, `**setVibrateSpeedRef**`, `**depth0SurfaceAccumRef**`; `**stopVibration**` on unmount.
- **Surface vibration decay** (same `**100ms**` grace interval): only while `**PlayState.PLAYING**` and `**hasStarted**`; if not playing, `**depth0SurfaceAccumRef**` cleared. **Balls bonus** (`**hasBallsGrids && ballsCovered && currentState === 0**`): resets accumulation to **0**; `**setVibrateSpeed(prev => prev < 0.1 ? 0.1 : prev)**`. Else at **depth `0**`: accumulate seconds; after `**SURFACE_DECAY_AFTER_SEC` (5)** apply `**setVibrateSpeed(prev => max(0, prev - SURFACE_DECAY_RATE_PER_SEC * delta))**`; leaving depth `**0**` resets accumulation (`**SURFACE_DECAY_RATE_PER_SEC` = 0.1**).
- `**commitHoldRef**` scoring path: `**adjustVibration(0.1)**` at anchor depth **4**, `**0.05**` at depths **2–3** (Hit-aligned).
- `**handleClap**`: `**adjustVibration(0.05)**` per valid hold clap.
- Dive ascent effect: `**adjustVibration(0.1)**` if `**depthBonusPts > 0 || rhythmBonusPts > 0**`, else `**0.05**`, only when finite `**score > 0**`; `**adjustVibration**` in effect deps.
- Grace interval surface penalty: `**stopVibrationRef.current()**` after penalty bookkeeping (`**[]**` interval unchanged).

#### Revision 34

- Computes capture windows tied to timed hold cues and relays availability through `**onSignalCaptureWindow**` (photos/videos gated by hold depth, countdown, and balls bonus).
- `**timeHoldRef**` mirrors `**timeHold**` so the capture `**setInterval**` is not recreated every hold tick (`**timeHold**` removed from effect deps).
- Dive scoring runs once per **down→up** edge via `**prevMotionDirRef**`; `**checkScoreEventsRef**` avoids duplicate score events from unstable `**checkScoreEvents**` / `**adjustVibration**` identities.

### `src/components/Playing/HitDepth.js`

#### Revision 10

- Added diveState to effect dependency arrays so hit detection re-runs when depth changes.

#### Revision 14

- Hit Depth: effectiveTimeLimit fallback (calculateHitDepthTimeLimit) when timeLimit 0/missing.

#### Revision 17

- Hit state machine: run `AT_DEPTH` + `depthDifference === -1` reset before surface → `hitFailed()` so target depth 1 can reset at the surface without a false fail.

#### Revision 34

- `**onSignalCaptureWindow**` signalling when repeats hit anchored depth checkpoints.

### `src/components/Playing/HoldAndClapDetector.js`

#### Revision 8

- Hold and Clap task component combining depth hold with clap detection; scores claps during holds with depth-based multipliers.

#### Revision 10

- Added lastFeedbackClap and nextFeedbackIn state for periodic feedback; feedback now every 4-6 successful claps when >2 claps remaining; reset feedback state on attempt reset and task change.

#### Revision 15

- micLifecycle "gameplay" for useClapDetection.

#### Revision 33

- `**InstructionPhaseBanner**` above `**CountdownBar**`; `**hasInstructionAudio**` from `**Boolean(String(task?.audio ?? '').trim())**`.

#### Revision 34

- `**onSignalCaptureWindow**` for successful hold completions with per-type availability (`**photos**`, `**videos**`).

### `src/components/Playing/HoldDepth.js`

#### Revision 10

- Added diveState to effect dependency arrays so hold countdown re-runs when depth changes.

#### Revision 25

- Halfway and three-quarter `setFeedback` only when `task.audioHalfway` / `task.audioThreeQuarter` are set (truthy).

#### Revision 34

- `**onSignalCaptureWindow**` when dwell state meets depth/time prerequisites for Holds.

### `src/components/Playing/Playing.js`

#### Revision 2

- Added executable execution in gotoNextTask() function that runs external programs non-blocking when tasks begin, with error handling that logs failures without disrupting gameplay.

#### Revision 4

- Added auto-start detection for headless mode that automatically calls gotoNextTask() when conditions are met, external timers integration via useExternalTimers hook, and calibration data application when level starts if not already applied.

#### Revision 11

- gotoNextTask: endlessGrace, endlessScores undefined in both branches.
- Import stopVoiceRequestAtom; gotoNextTask accepts options { stopVoiceFirst }; when true, increments stopVoiceRequest before advancing.
- onTaskOver: check completedTask.suppressFeedback; if true, gotoNextTask({ stopVoiceFirst: true }) immediately; else setFeedback and setTimeout 2000ms.
- setFeedback(0) in gotoNextTask only when stopVoiceFirst; normal path lets feedback play to completion.

#### Revision 13

- RestBallsBonus rendered only when hasBallsGrids; import gridsAtom, useAtomValue.

#### Revision 14

- Removed REST_BALL from task type checks; backward compat for 'rest ball' in CountdownTimer and RestBallsBonus.
- Clap: pass effective timeLimit to ClapDetector (calculateClapTimeLimit fallback when timeLimit 0/missing).

#### Revision 15

- resolveBackgroundMusicTrack(merged, { cliTrackId }) for level start; musicPlaybackSessionAtom set with url/generation; audioProcessingService.ensureAudioContext.
- gameplayMicSession: startGameplayMic / stopGameplayMic / scheduleStopGameplayMic on unmount (fade-aligned delay when fade-out enabled); mic before music in handleBeginPlay and headless start; clearMusicPlaybackSession(immediate) on cancel; stopGameplayMic on cancel.

#### Revision 16

- useSpeakRecognitionGate; SpeakDetector branch; calculateSpeakTimeLimit for timer prop.

#### Revision 18

- import `clearMusicPlaybackSession` from `musicPlaybackSessionStore`; local duplicate removed.
- `applyMusicPlaybackSessionForLevel`: coalesce atom update when both previous and new `url` are null.
- `handleBeginPlay`: `beginLoading` state; try/finally; Begin button loading UI (white, "Loading...", disabled, aria-busy).

#### Revision 19

- Endless task wiring as needed for updated Endless behavior.

#### Revision 23

- `handleResume()` awaits `ensureGameplayMicBeforeResume()` before `PlayState.PLAYING`; Resume button loading/disabled state while resuming.

#### Revision 25

- External-mode begin path `await`s calibration file read and `await calibrationService.importCalibration(...)` so mic/camera device prefs apply before gameplay mic starts.

#### Revision 28

- `useClapInstructionPhase()` alongside `useSpeakRecognitionGate()`.

#### Revision 31

- Auto-start `**useEffect**` gates on `**isAutoStartMode()**`; comments and failure log text refer to CLI auto-start.
- `**cancelLevel()**`: after mic/music/warmup teardown, `**setCurrentLevel(null)**`, and `**NOT_PLAYING**`, if `**externalIntegrationService.getLevelId()**` is set and `**electronAPI.requestExit**` exists, exit with code `**1**` and reason `**level_cancelled**`; otherwise `**setNav(TRAINING)**` as before.

#### Revision 33

- `**ClapDetector**`: `**hasInstructionAudio**` derived from `**currentLevel.currentTask.audio**` for level play.

#### Revision 34

- Imports `**captureService**`, `**useCaptureManager**`, `**captureSessionAtom**`, `**CaptureStatusIcons**`, `**INITIAL_CAPTURE_SESSION**`; derives `**captureGate**`, `**levelForCapture**`, `**signalCaptureWindow**`, passes hooks into detectors/Rest composites, resets atom on transitions, `**useEffect**` for Finish-task capture signalling, awaits safe recording teardown via hook helper.
- `**levelForCapture**` `**useMemo**`: merges full canonical `**tasks**` from `**levelManager.getLevel**` (not the shrunk `**currentLevel.tasks**` on the final task) so capture preflight and channel availability stay valid for the whole level.
- `**capturesTakePhotosCheckboxEligible**` (packaged app + `**runCapturesPreflight**`, excluding external/auto-start): **Take Photos/Videos** on `**NOT_PLAYING**` (**Get Ready**) under **begin**, toggling `**capturesUserEnabled**` on `**currentLevel**`; tighter `**gap**` between checkbox and hidden-notification helper copy.

### `src/components/Playing/Score.js`

#### Revision 27

- `**displayScore**` (or `**type === 'dive'**` with `**depthBonus`/`rhythmBonus**`) drives feed line `**pts**` (`**toFixed(1)**`); `**type === 'hold'**` (Endless holds) likewise formats main `**pts**` with `**toFixed(1)**`; other entry types unchanged.

### `src/components/Playing/SpeakDetector.css`

#### Revision 16

- Larger typography for Speak panel; .speak-detector-help for task helpText.

### `src/components/Playing/SpeakDetector.js`

#### Revision 16

- sherpa getSherpaOnnxReadyPromise, OnlineRecognizer/OnlineStream, PCM tap, phrase match + optional early accept, progress state, SFX TICK/TOCK rules, model error copy for public/asr/.

#### Revision 17

- Gate ref: useRef(speakAllowed) + allowedRef.current each render; removed useEffect sync so mic chunks are not dropped after speakAllowed turns true; useSherpaMicTap; scoring / r.reset in onAfterDecodeRef + processResultRef.
- Staged help: waiting for mic audio → starting recognizer → listening for phrase (when speakAllowed + model ready).

#### Revision 22

- `useMemo` precompiles segments; recognition and early-stable logic use compiled matchers.
- Subscribes to both PCM and match atoms; `processResultRef(..., allowEndpointFuzzy)`; endpoint retry when `task.speakEndpointFuzzy`; transcript state on each `isEndpoint`; UI strings for instruction vs mic-warming vs listening.
- Endpoint transcript UI keeps at most the 10 most recent finished utterances (`MAX_DISPLAYED_UTTERANCES`); label notes the limit.

#### Revision 33

- `**useButtplug**`; after phrase match ( `**processResultRef**` ): short mode `**adjustVibration(0.1)**` when `**(taskRef.current.repeat ?? 1) > 1**`, long mode `**adjustVibration(0.05)**` when `**segments.length > 1**`; `**useEffect**` cleanup `**stopVibration**` on unmount.

### `src/components/ShaftReading.js`

#### Revision 9

- Added placeholder prop for display when camera disabled.

### `src/components/Tasks/audio.js`

#### Revision 8

- Added Endless.ENDLESS audio event reusing Lvl_begint.START files.

#### Revision 10

- Changed Endless.ENDLESS to use distinct paths (audio/lvl/endless/1 start a.mp3, etc.) instead of sharing Lvl_begint.START paths.

#### Revision 14

- Calibration: moved BALL subcategory to appear underneath FOUR in Audio Pack Editor.

#### Revision 34

- Registers `**Sfx.PICTURE**` / `**Sfx.VIDEO**` entries for shutter feedback.

### `src/components/Tasks/task.js`

#### Revision 8

- Updated createENDLESSTask to use AUDIO.Endless.ENDLESS. Added getTaskSummary case for ENDLESS.

#### Revision 12

- createTask helpers: store audio as Category.KEY strings instead of AUDIO.X.Y resolved values.

#### Revision 14

- Removed REST_BALL from TaskType enum.
- createRESTTask: always creates REST; removed useBall option.
- generateRandomTask: removed REST_BALL from task types.
- getTaskSummary: REST only; 'rest ball' case for backward compat.
- Added calculateHitDepthTimeLimit(repeat) = 10 + repeat * 7; calculateClapTimeLimit(repeat) = 10 + repeat * 4.
- calculateLevelDuration: fallback for HITDEPTH and CLAP when timeLimit 0/missing.

#### Revision 16

- TaskType.SPEAK, SpeakMode SHORT/LONG; calculateSpeakTimeLimit, createSpeakTask, defaults.

#### Revision 25

- `createHOLDTask`: `audioHalfway` and `audioThreeQuarter` from `getDefaultHoldAudioHalfway` / `getDefaultHoldAudioThreeQuarter` (main `audio` logic unchanged).

### `src/components/Tasks/taskAudioConfig.js`

#### Revision 16

- Speak audio options for level editor.

### `src/components/Tasks/taskSummary.js`

#### Revision 8

- Added generateSummaryENDLESS with counts, scores, holdTimeByDepth, divesByDepth. Import SURFACE_PENALTY from endlessScoring.

#### Revision 16

- generateSummarySPEAK.

#### Revision 19

- `generateSummaryENDLESS`: import `SURFACE_PENALTY` and `roundHoldSecondsTenth` from `endlessScoring`; surface penalties use shared constant; `totalTimeHeld` and `holdTimeByDepth` values rounded with `roundHoldSecondsTenth` to match Endless persistence.

### `src/components/Training/Level.css`

#### Revision 23

- `.level-difficulty` line under the level title (smaller type, muted color).
- `.level.level-locked`: muted background, radius, slight opacity and grayscale for levels blocked by prerequisites.
- `.level.level-locked .button:not(:hover)`: slightly reduced button opacity so locked rows read as disabled until hover.

### `src/components/Training/Level.jsx`

#### Revision 23

- Optional `locked` prop (default false); when true, root gets `level-locked` so prerequisite-blocked levels match `Level.css`.
- Difficulty line: `levelDifficultyService.getDifficulty(level)` rendered under the level-order button with `level-difficulty`.

### `src/components/Training/ScorePreview.js`

#### Revision 16

- TaskType.SPEAK score preview; sample Speak task in demo list.

### `src/components/Training/Training.jsx`

#### Revision 1

- Added pack validation and auto-activation when a level is selected, with race condition prevention using cancellation tracking and early cancellation checks.
- Modified handleSelectLevel() to implement new audio pack behavior: default levels do not change active pack (set fallback to default), custom levels with pack use level's pack as primary with currently selected pack as fallback, and custom levels without pack use currently selected pack with fallback to default.
- Added import for storageService to access currently selected pack.

#### Revision 3

- Modified handleSelectLevel() to explicitly sync active audio pack from storage for default levels, ensuring the activeCustomPack module variable is synchronized when a default level is selected (previously only set fallback pack).

#### Revision 4

- Added pre-loaded level handling from CLI parameters, audio pack override logic for external mode (priority: level pack > CLI pack > default, never uses Content Library pack), and useEffect to auto-select level when CLI level parameter is provided.

#### Revision 15

- backgroundMusicId merged into level; musicPlaybackSessionAtom cleared on unmount/navigation.

#### Revision 18

- import `resolveExternalAudioPackId`; `applyAudioPackForLevel` external branch uses same resolver so CLI pack wins when valid.

#### Revision 19

- Increment `levelRunGenerationAtom` when beginning a level run.

#### Revision 23

- Custom tab subfolder buttons with `customLevelFolderNamesAtom` and `pickCustomLevelFolderNames`; filters grid by selected subfolder when multiple folders have levels; clears selection when changing folder.
- Prerequisite gating via `evaluateLevelQualification` and `shouldEnforcePrerequisites`; locked level UI and `LevelPrerequisitesModal` when selection is not qualified (CLI preloaded level still skips prereq checks).

#### Revision 33

- Imports `**getCustomSubfolderSlotsWithLevels**`; `**folderIndicesWithLevels**` is `**useMemo(() => getCustomSubfolderSlotsWithLevels(customLevels), [customLevels])**` (replaces inline `**Set**` / sort).

#### Revision 34

- `**runCapturesPreflight**` used for packaged-app external-mode helper copy and `**runHiddenNotificationsPreflight**` messaging when applicable; Jotai `**store**` resetting `**INITIAL_CAPTURE_SESSION**`. `**handleBeginLevel**` / `**applySelectLevel**` initialise `**capturesUserEnabled**` as `**false**` (Levels tab **Begin Level** no longer hosts **Take Photos/Videos**).

### `src/components/Training/levels.js`

#### Revision 12

- Replaced all AUDIO.X.Y with 'X.Y' string keys; removed AUDIO import.

#### Revision 18

- Import `AUDIO`; `BASELINE_SUMMARY_AUDIO` / `SOFT_SUMMARY_AUDIO`; `summaryAudio` on all twelve default levels; begint/quickbg/dive101 overrides as in summary above.

### `src/components/Training/scores.js`

#### Revision 8

- Added calcPerfectEndlessScore and calcPassEndlessScore.

#### Revision 16

- calcPerfectSpeakScore / calcPassSpeakScore; POINTS_PER_SPEAK_UNIT; splitSpeakSegments for long mode.

#### Revision 27

- `calcPerfectEndlessScore`: multiplier **1.3 → 1.1** (`floor((timeLimit || 999) × …)`).
- `calcPassEndlessScore`: multiplier **0.7 → 0.6**.

### `src/components/Version.js`

#### Revision 20

- Single typo fix in inline style object: `lefy` -> `left` for the fixed version label.

### `src/components/Webcam/WebcamComponent.js`

#### Revision 5

- Added gridMigrationDoneAtom check to prevent rendering before migration completes.

#### Revision 9

- Added navAtom and showCameraToggle; passes showCameraToggle to WebcamDisplay.

#### Revision 34

- Registers / clears `**setCaptureRefs**` so `**captureWebcamRef**` publishes stable `**webcamRef**`, `**canvasRef**` handles for `**captureService**`.

### `src/components/Webcam/WebcamDisplay.js`

#### Revision 5

- Updated to use multi-grid atoms (gridsAtom, selectedGridAtom, allGridSquaresAtom, gridSquareOwnershipAtom) for grid rendering.
- Added support for rendering multiple grids simultaneously with different colors (blue for active, amber for inactive).
- Updated grid outline drawing to support per-grid ownership and "All Grids" mode visualization.
- Changed inactive grid color from grey (#808080) to amber (#FFB84D) for better visibility.

#### Revision 9

- Import CameraToggle. Renders CameraToggle between video container and device selector when showCameraToggle; increased spacing (12px) between feed, toggle, and device buttons.

#### Revision 11

- Mirror mode: MirrorToggle beneath CameraToggle when showCameraToggle.

#### Revision 14

- Removed REST_BALL; backward compat for 'rest ball' in ballsBonusActive.

#### Revision 25

- Stage sizing and `vW`/`vH` for pre-rotation video box; `previewLayerStyle` + `previewTransform`; `convertToCanvasCoordinates`; pointer handlers on inner stage; outline canvas; neutralized max dimensions on preview layer; toggle stack order Camera → Rotation → Mirror.
- Video input selection uses `cameraVideoDeviceIdAtom`; `videoConstraints` uses `deviceId: { exact }` when set; `<Webcam key={...}>` remounts on device change.

#### Revision 32

- Imports `**cameraViewportHeightCapAtom**` + cap constants; layout `**useLayoutEffect**` uses `**viewportHeightCap**` for `**maxH**` and slider `**onChange**`; preview wrapped in `**flexShrink: 0**` shell with `**maxHeight**` **viewport height cap × 100vh** and `**marginBottom**`; `**#video-container**` + `**containerRef**` remain inner; toggles column + compact **Height** range after mirror controls; outer column `**width: 100%**`; comment cleanup for `**previewLayerStyle**` vs global CSS.

### `src/constants/customLevelFolders.js`

#### Revision 23

- `CUSTOM_SUBFOLDER_COUNT`, `DEFAULT_CUSTOM_SUBFOLDER`, `normalizeCustomSubfolder`, `defaultCustomFolderLabels`, `normalizeCustomLevelFolderNamesArray`, `createDefaultCustomLevelFolderNameSets`, `normalizeCustomLevelFolderNameSets`, `pickCustomLevelFolderNames`, `customFolderDisplayLabel`.

#### Revision 33

- `**getCustomSubfolderSlotsWithLevels(levels)**`: collects normalized `**customSubfolder**` values from `**levels**`, returns ascending unique slots truncated to `**CUSTOM_SUBFOLDER_COUNT**`.

### `src/constants/helpers.js`

#### Revision 23

- `formatHoldTimeStatsDisplay`: formats a duration like `formatTime` but rounds to 0.1s first and shows the seconds segment with at most one decimal (Hold Time Stats + time achievements).

### `src/constants/stringsreplace.js`

#### Revision 14

- Removed REST_BALL from STR.Task.

#### Revision 19

- `STR.Stats` additions including delete-all-custom modal title/body and confirm/cancel labels.

#### Revision 20

- Achievement string `in_love_with_the_sea` display text capitalization: “In love with the cock” -> “In Love With The Cock”.

### `src/css/index.css`

#### Revision 19

- `.button.button-danger-outline`; stats confirmation modal layout and dialog title emphasis; profile manager card row styles where present.

### `src/css/skeleton-light.css`

#### Revision 15

- .mic-duration-number-control-scale (transform scale 0.88).
- .mic-fade-checkbox-label (padding-top align with number row).

### `src/hooks/useAchievements.js`

#### Revision 15

- Reads achievement state via `store.get(achievementsStoredAtom)` (imported `store` from `src/store.js`, same as root Provider) for `isUnlocked`, `getProgress`, and `unlockAchievement` guards so one Gameover effect tick sees persisted unlocks; `updateProgress` uses functional `setAchievementsStored` only (skip when already unlocked); `unlockAchievement` applies unlock with `store.set` and appends `newlyUnlocked` only when the id was not already present; `useSetAtom` instead of `useAtom` (value unused).

#### Revision 19

- Reads `achievementsStoredAtom`; documents Gameover as sole writer for progress; profile-aware UI updates.

### `src/hooks/useClapDetection.js`

#### Revision 15

- Shares audioProcessingService AudioContext/LMS graph; connectMic/disconnectMic; analyser tap post echo reduction.
- Optional third argument micEnabled (default true): when false, no getUserMedia, disconnectMic, zeroed freq data; canvas shows threshold line only.
- Fourth argument micLifecycle: "own" (calibration — full mic lifecycle) vs "gameplay" (shared gameplayMicSession — no disconnectMic on hook unmount; analyser-only loop).
- Cancellable init: cancelled flag + AbortController on getUserMedia; no late connectMic after cleanup.

#### Revision 16

- buildMicAudioConstraints(micInputDeviceId); effect deps include micInputDeviceId for device changes (own mic path).

#### Revision 27

- New constants (`BASELINE_ALPHA`, `WARMUP_FRAMES`, `RESIDUAL_THRESHOLD_SCALE`, `RISE_SCALE`, `RISE_FLOOR`, `RESIDUAL_VISUAL_CAP`); refs for baseline, previous high, frame index; EMA baseline + residual + rise gates with existing interval debounce; `freqData` extended with `residual`, `rise`, `baseline`; canvas bar/threshold use residual scale.

#### Revision 28

- `taskInstructionVoicePhaseAtom` subscription; `instructionBlockingClapsRef`: gameplay mic suppresses `onClap` while phase is pending, playing, or cooldown; calibration lifecycle unchanged.

### `src/hooks/useColorSampling.js`

#### Revision 26

- `sampleGridSquares`: read `getImageData(x, y, 5, 5)` at buffer-native coordinates; removed mirror flip; bounds guard uses `x + 5 > canvas.width` / `y + 5 > canvas.height`.

### `src/hooks/useGridProcessor.js`

#### Revision 5

- Updated to use combinedShaftPercentAtom instead of legacy gridShaftPercentAtom.
- Added gridMigrationDoneAtom check to prevent processing before migration completes.

#### Revision 13

- Freeze depth at 0 when Endless+hasBallsGrids+ballsCovered+currentState===0; import currentLevelAtom, gridsAtom, combinedBallsPercentAtom, ballsDepthPercentAtom, TaskType.

#### Revision 15

- Balls region buffer hysteresis using percentHysterisisAtom (same as shaft depth); updates ballsCoveredStateAtom via store.get/set.

### `src/hooks/useMicStreamForCalibration.js`

#### Revision 17

- New: getUserMedia + connectMic for Mic speech calibration.

#### Revision 22

- Comment updated for `pcmFeedAllowedRef`.

### `src/hooks/useSherpaMicTap.js`

#### Revision 17

- New: shared Sherpa PCM path via speakPcmTapSession + ensureSpeakPcmTapIfWanted; enabled, resetKey, ref callbacks, optional onReArmedRef; armedRef, silenceMsRef.
- waitForMicReady; Promise.all([ensureAudioContext, getSherpaOnnxReadyPromise]) with parallel mic waiter; acquireOnlineStream / releaseOnlineStream (sherpaOnnxPreloadService owns stream.free).
- Two effects: [enabled] arms speech tap; [enabled, resetKey] stream + chunk handler (PCM tap may persist across resetKey).
- pcmReceived / speechPipelineLive for UI: first PCM at handler; first successful acceptWaveform+decode after gating.

#### Revision 22

- Parameter `pcmFeedAllowedRef`: when false, PCM is not fed to Sherpa (decode/match gating is the caller's responsibility).

### `src/hooks/useWebcam.js`

#### Revision 11

- Hidden video element kept in viewport so depth processing continues when feed scrolls out of view.
- Added hiddenVideoRef; useEffect creates hidden video (position:fixed, 1×1px, aria-hidden), appends to body; cleanup removes and clears srcObject.
- drawVideoFrame: sync stream from visible to hidden video each frame (handles initial load and device switch).
- drawVideoFrame: use hidden video for drawImage and frame dimensions; keep visible video for scale factor (clientWidth/clientHeight for grid coordinate conversion).

### `src/index.js`

#### Revision 19

- Jotai `Provider` with shared `store`; `subscribePlayerProfilesCrossTab` on mount.

### `src/services/audioManager.js`

#### Revision 1

- Added exportPack and importPack functions for ZIP-based pack sharing, updated setActiveCustomPack to sync with Jotai atom and cleanup object URLs, updated deletePack to revoke object URLs before deletion, added validateActivePack function for app load validation, fixed getAudioFile to properly handle arrays of custom-content URLs, and added PackIdConflictError custom error class for import conflict handling.
- Added fallbackPack tracking variable and getFallbackPack() method.
- Added setFallbackPack() method to set the fallback audio pack.
- Updated getAudio(), getAudioFileSync(), and getAudioFile() to pass fallback pack to resolver.

#### Revision 12

- Added internal wrappers: resolveWithContext, getAudioFileWithContext, getAudioFileWithPacks, getAudioKeyWithContext (call resolver with activeCustomPack/fallbackPack from closure).
- Added resolveCustomContentUrls helper; shared by getAudioFile and getAudioFileForPack.
- getAudio, getAudioFileSync, getAudioFile, getAudioKey now call internal wrappers instead of resolver directly.
- Added getAudioFileForPack(audioRef, packId) for level-specific preview; primary = specified pack, fallback = activeCustomPack.

#### Revision 14

- Export: customNames in pack manifest.
- Import: customNames from manifest.pack; validation allows Custom keys Custom1–Custom20.
- Added getActivePackId() returning storageService.getActiveAudioPack() for fresh pack ID read.

#### Revision 19

- `validateActivePack` / `clearCustomContentCache`: align in-memory pack state and `activePackIdAtom` with storage after custom content is cleared or on load; revokes object URLs via `audioFileService` when dropping cached pack.

#### Revision 32

- Imports `**CUSTOM_VOICE_CATEGORY_COUNT**` and `**CUSTOM_VOICE_SLOT_KEYS**` from `**src/constants/customVoiceCategories.js**`; `**CUSTOM_ALLOWED_KEYS**` for `**Custom**` import validation is built from `**CUSTOM_VOICE_SLOT_KEYS**`.
- Invalid Custom key warnings now report **Custom1–Custom40** via `**CUSTOM_VOICE_CATEGORY_COUNT**` in the message text.

### `src/services/audioProcessingService.js`

#### Revision 15

- connectMusicReference(audioElement, gainNode): MediaElementSource → gain → destination + lmsNode input 1.
- disconnectMusicReference; musicConnections tracking.
- getMicConnected(); connectMic throws if AudioContext/LMS not ready after ensureAudioContext.

#### Revision 16

- connectSpeakPcmTap / disconnectSpeakPcmTap: mic → speak-pcm-tap worklet; speakPcmTapNode/Gain/WorkletLoaded naming; import getSpeakPcmTapWorkletUrl from asrAssetUrls.

#### Revision 17

- preloadSpeakPcmTapWorklet(): after ensureAudioContext(), addModule(getSpeakPcmTapWorkletUrl()) when not yet loaded; speakPcmTapWorkletPreloadPromise dedupes concurrent callers; speakPcmTapWorkletLoaded shared with speak tap path.
- resumeAudioContextIfSuspended(): ensureAudioContext + ctx.resume() when suspended.
- connectMic: after mic → LMS, if isSpeechTapWanted() then void ensureSpeakPcmTapIfWanted().
- disconnectMic: disconnectSpeakPcmTap() before clearing micSource/micStream.
- ensureSpeakPcmTapIfWanted(): speech-armed tap; speakPcmTapMicSourceConnected avoids duplicate micSource→tap; port.onmessage → speakPcmChunkHandlerRef + isSpeechTapWanted guard.
- connectSpeakPcmTap(onChunk): thin wrapper (setSpeechWantsTap + setSpeakPcmChunkHandler + ensureSpeakPcmTapIfWanted).

### `src/services/audioResolver.js`

#### Revision 1

- Added case-insensitive category matching function and updated resolveAudioReference to use case-insensitive matching when resolving audio references.
- Updated resolveAudioReference() to accept optional fallbackPack parameter.
- Added fallback pack resolution logic: tries primary pack, then fallback pack, then default AUDIO.
- Updated getAudioFile() to support fallback pack parameter.

#### Revision 3

- Added findKeyInDefaultAudio() helper function to perform reverse lookup of direct audio paths to their category/key in the default AUDIO structure.
- Updated findPathInPack() to use default AUDIO structure mapping: finds which category.key a path belongs to, then checks custom pack for replacement of that key. This enables custom packs to replace audio even when default levels use direct paths.
- Modified direct path resolution logic to check custom packs via reverse lookup before returning original path, ensuring custom audio pack replacements are used for default levels.
- Enhanced array of direct paths resolution to find matching category.key in default AUDIO, then use custom pack's replacement for that entire key if available.

#### Revision 10

- Added fallback: when resolving Endless.ENDLESS and pack has no value, resolve Lvl_begint.START instead.

#### Revision 12

- getAudioKey: return string as-is when input is already Category.KEY format.

### `src/services/levelDifficultyService.js`

#### Revision 8

- Added ENDLESS to TASK_TYPES. Added calcPerfectEndlessScore in computeCalibrationInputs.

#### Revision 11

- Custom levels: when useDifficultyOverride and difficultyOverride valid (1–11), return override instead of computed.
- Override validation: 11 returns 11; 10.5 (or 10 < v < 11) clamps to 10; 1–10 half-step rounded.

#### Revision 16

- TASK_TYPES.SPEAK; perfect score uses calcPerfectSpeakScore.

### `src/services/levelManager.js`

#### Revision 1

- Added isDefaultLevel() helper function to check if a level is a default level.

#### Revision 23

- `saveLevel`: persists normalized `customSubfolder` (1–5); normalizes custom `prerequisites`, runs `validateCustomPrerequisiteDAG`, persists `{ levelId, minRank }` rows.
- `deleteLevel`: `scrubPrerequisiteReferencesToDeletedId` removes the deleted id from other customs’ prerequisite arrays.

### `src/services/speakPcmTapSession.js`

#### Revision 17

- New: setSpeechWantsTap / isSpeechTapWanted; speakPcmChunkHandlerRef / setSpeakPcmChunkHandler (clap vs speech mutual exclusion).

### `src/services/storageService.js`

#### Revision 1

- Added object URL caching and cleanup system (revokePackUrls, extractPackId), checkFileExists function for duplicate detection, normalizeAudioPath helper with input validation, extractFilePath helper for custom-content URL parsing, and enhanced IndexedDB error handling with quota checking.

#### Revision 4

- Added calibration profile storage methods (saveCalibrationProfile, loadCalibrationProfile, getAllCalibrationProfiles, deleteCalibrationProfile) using localStorage with 'calibration_profiles' key.

#### Revision 15

- BACKGROUND_MUSIC_TRACKS, ACTIVE_BACKGROUND_MUSIC in STORAGE_KEYS.
- getAllBackgroundTracks, saveBackgroundTrack, deleteBackgroundTrackMeta.
- audioFileService.deleteBackgroundMusicTrackFiles (IndexedDB bg-music pack).
- setActiveBackgroundMusic / getActiveBackgroundMusic: legacy helpers (same localStorage key as activeBackgroundTrackIdAtom); active id is not written from musicTrackManager.setActiveTrack (atomWithStorage is sole writer).

#### Revision 19

- `clearAllCustomContent` (custom voice pack / level / background-music localStorage keys only; does not delete `playerProfiles`).
- `audioFileService.clearAllAudioFiles`: clears every blob in the IndexedDB `audioFiles` store (custom pack + background music files); `Stats` `runFactoryReset` awaits it before `clearAllCustomContent`.

#### Revision 23

- Key `custom_level_folder_names`; `getCustomLevelFolderNameSets`, `saveCustomLevelFolderNameSets`, `_migrateCustomFolderNamesFromPlayerProfiles` (seed from legacy profile names when global key missing).

## New Files

These paths were not original to v18 of the project; they were created throught the revisions history (and modified in subsequent revisions, in many cases).

### `src/components/AudioPackEditor/AudioCategoryEditor.jsx`

#### Revision 1 — Created

- Component for managing audio files within a single category, displaying keys and providing file upload and deletion capabilities.

#### Revision 5

- Moved upload button from category level to individual subcategory level, allowing separate upload buttons for each subcategory within a category.
- Added handlePlayAudio function with custom-content URL resolution for testing uploaded audio files.
- Added "Play" button next to each uploaded audio file for immediate playback testing.

#### Revision 14

- Added customNames and onCustomNamesUpdate props for Custom category display name overrides.
- Display name input for Custom subcategories (placeholder: "Display name for Custom.N").
- Labels show only key (e.g. "Custom2:") without custom name in parentheses.

#### Revision 17

- `handleFileUploaded` / `handleDeleteFile`: apply changes with `onUpdate((prev) => ...)` and immutable category merges so rapid multi-file uploads see latest state.

### `src/components/AudioPackEditor/AudioFileUploader.jsx`

#### Revision 1 — Created

- Reusable file upload component with drag-and-drop support, file size validation (10MB max), format validation (MP3/WAV only), automatic duplicate filename renaming, and IndexedDB quota checking.

#### Revision 5

- Added subcategory prop to component signature for unique file input IDs per subcategory.
- Updated file input ID to include both category and subcategory.

### `src/components/AudioPackEditor/AudioPackEditor.css`

#### Revision 1 — Created

- Styling for audio pack editor components to ensure consistent look and feel with the rest of the application.

#### Revision 5

- Added styling for category group headings with larger font size, bold weight, and bottom border separator.
- Added spacing between category groups.

### `src/components/AudioPackEditor/AudioPackEditor.jsx`

#### Revision 1 — Created

- Main component for creating and editing custom audio packs with metadata form, category management, file upload interface, and export/import functionality.
- Fixed ESLint no-restricted-globals error by replacing confirm() with window.confirm() for explicit global access.

#### Revision 5

- Reorganized audio categories into logical groups with section headings: Baseline, Session Start, Task Assignment, Performance, Session End, and Session Summary.
- Updated category ordering logic to use grouped structure instead of flat array.

#### Revision 8

- Moved HoldAndClap and Endless audio categories to Task Assignment section.

#### Revision 9

- Import exportAudioPackToFile from audioPackExportService. Updated handleExport to use service; in Electron shows save dialog and writes via IPC, in browser triggers blob download.

#### Revision 14

- Added customNames state and handleUpdateCustomNames; handleNewPack includes customNames: {}.
- Added Custom category group (heading "Custom", categories: ['Custom']).
- Pass customNames and onCustomNamesUpdate to AudioCategoryEditor when category === 'Custom'.
- Moved Rest audio category from Performance section to Task Assignment section, above HoldAndClap.

#### Revision 17

- `handleUpdateAudioFiles`: `setPack((prev) => ({ ...prev, audioFiles: updater(prev.audioFiles) }))` instead of closing over `pack`.

#### Revision 23

- "Save Pack": conditional `button-primary` when `pack.name.trim()` is non-empty (same condition as enabled save), aligned with Level Editor "Save Level" color; omits extra horizontal padding/margin so the control matches sibling buttons’ width.

#### Revision 32

- Imports `**CUSTOM_VOICE_SLOT_KEYS**`; `**Custom**` category uses `**CUSTOM_VOICE_SLOT_KEYS**` for editor keys (removed `**CUSTOM_SUBCATEGORIES**` local array capped at twenty).

### `src/components/ContentLibrary/AudioPackCard.jsx`

#### Revision 1 — Created

- Reusable card component for displaying audio pack information including metadata, active status indicator, and action buttons.

### `src/components/ContentLibrary/ContentLibrary.css`

#### Revision 1 — Created

- Styling for content library components including grid layout for pack cards and modal dialog styling.

### `src/components/ContentLibrary/ContentLibrary.jsx`

#### Revision 1 — Created

- Main component for listing and managing all audio packs (default and custom) with activation, export, and delete functionality.
- Fixed ESLint no-restricted-globals error by replacing confirm() with window.confirm() for explicit global access.

#### Revision 9

- Import exportAudioPackToFile from audioPackExportService. Updated handleExportPack to use service; in Electron shows save dialog and writes via IPC, in browser triggers blob download.

#### Revision 15

- Background Tracks section with MusicTrackCard, Import Track, MusicTrackImportDialog.
- Voice Packs heading above voice pack grid; Background Tracks heading for music.
- handleMusicImportSuccess, handleDeleteMusicTrack.

### `src/components/ContentLibrary/ImportDialog.jsx`

#### Revision 1 — Created

- Modal dialog component for importing audio packs from ZIP files with conflict resolution (overwrite, rename, or cancel), progress indication, and error/warning display.

### `src/store.js`

#### Revision 1 — Created

- Created Jotai store instance for updating atoms outside of React components, enabling reactive state management from service layer.

#### Revision 19 — Created

- Shared `createStore()` instance for cross-tab sync and non-hook reads.

### `scripts/`

#### Revision 2 — Created

- New directory where executable files are stored for running during gameplay.

### `src/services/executableService.js`

#### Revision 2 — Created

- Service class for managing executable execution with Electron environment detection, browser fallback handling, and methods for selecting, testing, and running executables.

#### Revision 34

- `**supportsDirectoryPicker**` getter + `**pickDirectory**` invoking `**window.electronAPI.showDirectoryPicker**` (mirroring executable picker ergonomics).

### `ExternalDocumentation.txt`

#### Revision 4 — Created

- Comprehensive documentation file covering all CLI parameters with descriptions, examples, exit codes, and session output JSON format. Also includes default level IDs with titles and descriptions for reference.

#### Revision 11

- Documented --mirror and --no-mirror parameters.

#### Revision 18

- `--audio-pack`: priority order and fallback text aligned with background-music pattern (CLI when pack exists, then level pack, then default).

#### Revision 19

- PROFILE PARAMETERS: `--profile <profileId>` (Electron-only, default fallback, examples); valid combinations and usage examples updated; NOTES bullet for non-Electron ignore behavior.

#### Revision 30

- SESSION OUTPUT JSON example + field descriptions for `**performanceRank**`.

#### Revision 31

- `**--auto-start**` section, invalid-combinations list, and exit code **5** list updated for `**--level**` requirement and renderer safety check, reorganization for accuracy/readability.

#### Revision 34

- Adds a “CAPTURE PARAMETERS” section documenting `**--enable-captures**` and `**--capture-output**` for packaged Electron external/CLI flows (requirements, defaults, invalid combinations such as `**--enable-captures**` without `**--level**`, and `**--capture-output**` without `**--enable-captures**`).
- Extends the “Valid combinations” bullet list and adds an npm example line that includes `**--enable-captures --capture-output**`.

### `src/atoms/calibrationProfileAtom.js`

#### Revision 4 — Created

- Jotai atom storing currently active calibration profile ID for quick switching between calibration presets.

### `src/atoms/externalModeAtom.js`

#### Revision 4 — Created

- Jotai atom storing CLI configuration and external mode state for reactive state management throughout the application.

### `src/components/Calibration/CalibrationExport.jsx`

#### Revision 4 — Created

- Component providing export button to save current calibration to JSON file via IPC, with success/error feedback and fallback to browser download in non-Electron environments.

### `src/components/Calibration/CalibrationImport.jsx`

#### Revision 4 — Created

- Component providing import button to load calibration from JSON file with file picker, validation feedback, and error handling for invalid calibration data.

#### Revision 25

- `await calibrationService.importCalibration(...)` for async validation, device resolution, and apply.

### `src/components/ExternalMode/CalibrationTimer.jsx`

#### Revision 4 — Created

- Component displaying calibration countdown timer in HH:MM:SS format at top of screen, updating every second and triggering application exit with code 2 when timer reaches 0.

### `src/components/ExternalMode/HeadlessWrapper.jsx`

#### Revision 4 — Created

- Wrapper component for headless mode that conditionally renders children without navigation, used to hide UI elements when headless mode is active.

### `src/components/ExternalMode/PauseTimer.jsx`

#### Revision 4 — Created

- Component displaying pause time remaining in MM:SS format during paused gameplay, only counting down when level is paused and triggering application exit with code 3 on timeout.

### `src/components/Navigation/LimitedNavigation.jsx`

#### Revision 4 — Created

- Limited navigation component for external mode showing only Help, Calibrate, Mic, Buttplug, and Play buttons, hiding level selection and content configuration options.

#### Revision 8

- Renamed Mic tab label to Audio (kept Mic icon).

#### Revision 9

- Removed camera toggle from navigation row (moved to camera area).

#### Revision 23

- Same resume mic flow and loading guard as main `Navigation.js`.

#### Revision 31

- Play/pause uses `**usePlayPauseHandler**`; title uses `**APP_DISPLAY_TITLE**`.

### `src/hooks/useExternalTimers.js`

#### Revision 4 — Created

- Custom hook managing calibration and pause timers with state tracking, automatic countdown, timeout handling with exit IPC calls, and reset functionality.

### `src/services/calibrationService.js`

#### Revision 4 — Created

- Service for calibration data operations including export from atoms, import with validation, validation of calibration data structure and values, application to atoms, and profile management (save, load, delete, getAll).

#### Revision 5

- Updated exportCalibration to use multi-grid format (v2.0) with grids array containing individual grid objects with id, name, squares, baseColor, and sensitivity.
- Updated validateCalibration to validate v2.0 multi-grid format with grid overlap checking.
- Updated applyCalibration to import v2.0 multi-grid format and set gridsAtom with imported grids.
- Removed support for legacy v1.0 single-grid format.

#### Revision 25

- `exportCalibration`: adds `sfxVolume`, `voiceVolume`, `musicVolume`, `cameraRotation`, and optional `cameraDeviceId` / `audioInputDeviceId`.
- `validateCalibration`: optional-field checks for volumes, rotation, and device id strings; `null` treated as unspecified.
- `resolveCalibrationDevices`, `applyCalibrationWithDeviceResolution`; `importCalibration` is async (validate → resolve devices → `applyCalibration`).
- `applyCalibration`: applies optional volumes, rotation, and device atoms when keys are present after resolution.

#### Revision 32

- Imports `**cameraViewportHeightCapAtom**`, `**clampCameraViewportHeightCap**`, `**CAMERA_VIEWPORT_HEIGHT_CAP_MIN**` / `**MAX**`; `**exportCalibration**` adds `**cameraViewportHeightCap**` from the store; `**validateCalibration**` optional range check; `**applyCalibration**` updates the atom only when import JSON includes a numeric value (omission preserves current setting).

### `src/services/externalIntegrationService.js`

#### Revision 4 — Created

- Service for managing CLI configuration and mode detection with hybrid window ready detection (immediate check + fallback polling), providing methods to check external mode, headless mode, calibration-only mode, validation mode, and retrieve CLI parameters.

#### Revision 11

- Added getMirrorMode() returning cliConfigCache?.mirror === true.

#### Revision 15

- getBackgroundMusicId() returning cliConfigCache?.backgroundMusic for CLI override.

#### Revision 19

- `getProfileId()` for CLI `--profile`.

#### Revision 31

- `**isExternalMode()**` treats `**cliConfigCache.autoStart**` like the former headless flag; `**isHeadlessMode**` removed in favor of `**isAutoStartMode()**` reading `**autoStart**`.

#### Revision 34

- Surfaces `**isCapturesCLIEnabled**` (and related config access) where external automation needs parity with Electron CLI capture toggles.

### `src/services/preflightService.js`

#### Revision 4 — Created

- Service for pre-flight checks including webcam availability detection, dependency checking (MediaDevices API, IndexedDB, localStorage), level structure validation, and calibration data validation.

### `src/services/sessionExportService.js`

#### Revision 4 — Created

- Service for formatting and exporting session results to JSON, calculating session stats (loads, dives, hold time, penalties), formatting task details, and exporting via IPC to main process.

#### Revision 8

- Added Endless handling for dives and hold time in formatSessionData.

#### Revision 30

- `**performanceRankToExportString**` maps `**completionStatus**` + numeric `**Rank.***` to export strings; `**formatSessionData**` adds `**performanceRank**` and uses resolved completion status for `**completed**`; `**sessionExportService**` exposes the mapper.

### `src/services/validationService.js`

#### Revision 4 — Created

- Service for validating levels and audio packs, checking level existence, structure validation, audio pack existence verification, and returning detailed error/warning messages.

### `src/components/Calibration/GridSelector.jsx`

#### Revision 5 — Created

- Component for selecting, adding, removing, and renaming calibration grids with dropdown selector, "All Grids" mode option, and grid name editing with duplicate validation.

#### Revision 8

- Added confirmation prompt when pressing Remove Grid; prompt only appears when more than one grid is configured.

#### Revision 9

- Added disabled prop support.

#### Revision 13

- Balls region checkbox inline with Grid Name; grid name input width 100px; flex layout with marginLeft auto for checkbox.

### `src/utils/gridMigration.js`

#### Revision 5 — Created

- Migration utility to convert legacy single-grid atoms (gridSquaresAtom, gridBaseColorAtom, gridSensitivityAtom) to multi-grid format on app startup.
- Creates default grid if no legacy data exists and ensures at least one grid is always present.

### `src/utils/gridUtils.js`

#### Revision 5 — Created

- Utility functions for grid management including generateGridId for unique IDs, createDefaultGrid for default grid creation, validateNoOverlaps for overlap checking, and generateUniqueGridName for naming grids.

### `src/components/VolumeControl.jsx`

#### Revision 7 — Created

- Reusable volume slider component with mute toggle, percentage display, and support for SFX/Voice atoms; unmute restores to 100%.

### `src/components/Playing/endlessScoring.js`

#### Revision 8 — Created

- Constants and helpers for Endless scoring: HOLD_POINTS_PER_DEPTH, CLAP_BONUS_BASE, DEPTH_CLAP_FACTOR, SURFACE_PENALTY, grace settings, getTempoFromBpm, getDepthRangeFactor, computeRhythmBonusMultiplier, computeDepthBonus.

#### Revision 11

- GRACE_RATE renamed to HOLD_GRACE_RATE (1).
- Added DIVE_GRACE_RATE (0.5).
- GRACE_MAX increased from 20 to 30.
- Added DEPTH_GRACE_FACTOR { 1: 0.5, 2: 1.0, 3: 2.0, 4: 3.0 } for grace depth bonuses.
- RHYTHM_BONUS_MAX and DEPTH_BONUS_MAX increased to 0.75.

#### Revision 17

- HOLD_DEEP_ONE_SCORE_MULT (0.25): one level deeper than the Endless hold anchor scores at this fraction of the anchor depth rate (matches Hold task DEEP_ONE effective-time behavior).

#### Revision 19

- Hold/dive/grace/balls-bonus constants; `HOLD_DEEP_ONE_SCORE_MULT`; `roundHoldSecondsTenth`; tempo/depth/rhythm bonus helpers.

#### Revision 27

- `HOLD_POINTS_PER_DEPTH` depth index 4 reduced from **4** to **3** pts/s for Endless holds (comment notes HoldDepth remains 4 elsewhere).
- Replaced sliding-window rhythm/depth multipliers (`computeRhythmBonusMultiplier`, `computeDepthBonus`, `RHYTHM_BONUS_MAX` / `DEPTH_BONUS_MAX`) with **per-stroke helpers**: `**PRIOR_MATCH_BONUS_FRACTION` 0.1**, `**DIVE_HISTORY_MAX` (alias `DIVE_WINDOW_SIZE`)**, `**DIVE_IDLE_RESET_MS` 10000**; `getDepthRangeFromDive`, `depthRangesEqual`, `temposBucketMatch`, `countPriorDepthMatches`, `countPriorRhythmMatches`, `perDiveConsistencyBonuses`, `normalizeDiveHistoryForRestore`.

### `src/atoms/cameraAtom.js`

#### Revision 9 — Created

- cameraEnabledAtom with atomWithStorage for persisted camera on/off preference.

#### Revision 25

- `cameraVideoDeviceIdAtom` (`atomWithStorage`): persisted `videoinput` device id; `null` uses default preview constraint (`facingMode: 'user'`).

#### Revision 32

- `**CAMERA_VIEWPORT_HEIGHT_CAP_MIN**` / `**MAX**` / `**DEFAULT**`; `**clampCameraViewportHeightCap**`; `**cameraViewportHeightCapAtom**` (`**cameraViewportHeightCap**` in `**localStorage**`) with custom sync storage that clamps on load and save.

### `src/components/Webcam/CameraToggle.js`

#### Revision 9 — Created

- Compact camera on/off toggle button (28px height) with Video/VideoOff icons; positioned between feed and device selector.

### `src/services/audioPackExportService.js`

#### Revision 9 — Created

- Service for exporting audio pack ZIP: in Electron uses showSaveDialog and writeBinaryFile via IPC; in browser returns blob for component to trigger download. exportAudioPackToFile(zipBlob, defaultFileName).

### `src/atoms/mirrorModeAtom.js`

#### Revision 11 — Created

- mirrorModeAtom (atomWithStorage) for persisted user preference.
- effectiveMirrorAtom (derived) true only when mirror enabled and playState === PLAYING.

### `src/components/MirrorToggle.js`

#### Revision 11 — Created

- Button component toggling mirror mode; Repeat icon, "Mirror On" / "Mirror Off" label.
- Applies button-primary (blue) when mirror mode on; matches selected nav tab styling.

### `src/components/Playing/GraceStatusBar.js`

#### Revision 11 — Created

- Endless grace bar UI: standard vs temporary grace, penalty-at-surface state; 32px height, 450px max width; temporary grace color #7c3aed.

### `src/components/Playing/RestBallsBonus.js`

#### Revision 13 — Created

- Rest task balls bonus component: score feed, time limit, balls bonus accumulation when balls covered and at surface; SFX TICK/TOCK on balls transition.

#### Revision 15

- ballsCovered from ballsCoveredAtom instead of inline combinedBallsPercent < ballsDepthPercent.

#### Revision 33

- `**useButtplug**` (`**setVibrateSpeed**`, `**stopVibration**`); `**earningBallsBonus**` drives `**setVibrateSpeed(0.1)**` vs `**stopVibration**` when not earning; second `**useEffect**` cleanup `**stopVibration**` on unmount.

#### Revision 34

- `**useTaskCountdownLeft**` alignment + `**onSignalCaptureWindow**` for Rest windows while balls bonus overlays run.

### `src/components/ContentLibrary/MusicTrackCard.jsx`

#### Revision 15 — Created

- Card component for background track display and actions.

### `src/components/ContentLibrary/MusicTrackImportDialog.jsx`

#### Revision 15 — Created

- Modal for importing a single music track file.

### `src/services/gameplayMicSession.js`

#### Revision 15 — Created

- Single gameplay mic lifecycle: startGameplayMic, stopGameplayMic, scheduleStopGameplayMic (deferred stop for fade alignment), isGameplayMicActive; coordinates with audioProcessingService connectMic/disconnectMic and opId for in-flight start abort.

#### Revision 16

- getUserMedia audio: buildMicAudioConstraints(store.get(micInputDeviceIdAtom)).

#### Revision 18

- After successful `connectMic`, `await ctx.resume()` if not `running`.
- ~300 ms silent `AudioBuffer` through `destination` + `onended` wait before marking mic active (output settle after getUserMedia + AEC).

#### Revision 23

- `ensureGameplayMicBeforeResume()`: no-op when mic connected and gameplay session active; otherwise `stopGameplayMic()` if stale active, then `startGameplayMic()`; throws if restart fails.

### `src/services/musicTrackManager.js`

#### Revision 15 — Created

- Service for background track storage (IndexedDB bg-music); import/delete; active selection via activeBackgroundTrackIdAtom.
- Follow-up: getActiveTrackId() uses store.get(activeBackgroundTrackIdAtom); setActiveTrack(id) only store.set(activeBackgroundTrackIdAtom, id) — single writer (atomWithStorage), removed duplicate storageService.setActiveBackgroundMusic to fix localStorage serialization clash on active_bg_music_id.

### `src/utils/backgroundMusicResolver.js`

#### Revision 15 — Created

- New module: resolveBackgroundMusicTrack(level, { cliTrackId }); resolveLibraryActive helper.
- levelManager.isDefaultLevel: default levels use CLI track if valid else null when CLI set; without CLI use Content Library active track only; custom levels use CLI override when valid else level id (concrete, use_selected, or none → null); removed prior empty backgroundMusicId → library fallback.

#### Revision 31

- JSDoc: background music resolution for Begin / CLI auto-start play start.

### `public/asr/`

#### Revision 16 — Created

- sherpa-onnx-asr.js, sherpa-onnx-wasm-main-asr.js, app-asr.js, index.html; runtime also loads .wasm / .data / model files from same base URL per sherpa-onnx layout.

### `public/audio/sfx/capture_picture.mp3`

#### Revision 34 — Created

- Sound effect asset used when a still capture is taken.

### `public/audio/sfx/capture_video.mp3`

#### Revision 34 — Created

- Sound effect asset for video capture / recording feedback.

### `public/speak-pcm-tap.js`

#### Revision 16 — Created

- AudioWorklet: resample to 16k mono, ~30ms chunks, postMessage pcm+rms; registerProcessor('speak-pcm-tap').

### `src/components/Mic/MicInputDevicePicker.css`

#### Revision 16 — Created

- .u-audio-input-selected (primary-style fill for selected input).

### `src/components/Mic/MicInputDevicePicker.js`

#### Revision 16 — Created

- enumerateDevices audioinput; System default + per-device buttons; u-audio-input-selected utility styling.

#### Revision 17

- Root wrapper adds `mic-audio-section` so it participates in Audio tab vertical spacing between h3-led blocks.

#### Revision 18

- isDefaultLabeledAudioInput (/^Default\b/i) and sortAudioInputsWithDefaultFirst; removed separate "System default" button; useMemo sorted list; useEffect normalizes null atom to default-labeled device id when devices load; selection via selectedId === device.deviceId.

### `src/hooks/useSpeakRecognitionGate.js`

#### Revision 16 — Created

- Gates speakRecognitionAllowedAtom until after Speak instruction audio (or short delay without clip).

#### Revision 18

- Phase-reset and speak-allowed effects: dependency arrays use [task, setPhase] and [task, phase, setAllowed, setPhase] instead of task?.id / task?.type fragments.

#### Revision 22

- Drives `speakPcmFeedAllowedAtom` and `speakRecognitionAllowedAtom` separately: PCM false when a Speak instruction clip exists until overlap/end; match still tied to `taskInstructionVoicePhase === 'ready'` (or 200 ms delay when there is no clip).

#### Revision 28

- `isClapInstructionTask`: helper for CLAP/HOLDANDCLAP; speak gate skips `setPhase('idle')` for those types (PCM feed still opened).
- `useClapInstructionPhase`: primes CLAP/HOLDANDCLAP instruction phase (pending; no-audio ready after 200 ms); exported from same module.

### `src/services/sherpaOnnxPreloadService.js`

#### Revision 16 — Created

- Sequential load of public/asr/ sherpa-onnx scripts; Module.locateFile; singleton getSherpaOnnxReadyPromise / isSherpaOnnxReady.

#### Revision 17

- warmOnlineStream module state; tryCreateWarmOnlineStream / disposeWarmOnlineStream; warm created after recognizer on successful preload; dispose on preload catch.
- acquireOnlineStream() / releaseOnlineStream(stream): hand out warm or createStream; release frees and refills warm when recognizer loaded.

### `src/services/speakPhraseMatcher.js`

#### Revision 16 — Created

- normalizeSpeakText, phraseMatchesTarget for Speak scoring.

#### Revision 22

- `compileSpeakSegment` / pattern vs plain compiled matchers; `[a, b, c]` parsing; `hypothesisMatchesCompiled`, `hypothesisMatchesCompiledNorm`, `compiledMightBeBuildingTowardMatch`; `normalizeSpeakBracketLiteral` so literal chunks preserve leading/trailing whitespace from the author string (fixes `] and …` after trim).
- `phraseMatchesTarget` delegates to compiled path.
- `levenshtein` export; `matchPatternFrom` fuzzy alternates (exact prefix or token Levenshtein); `hypothesisMatchesCompiledEndpointFuzzy` for optional endpoint pass (boosted alt distance and plain span Levenshtein).
- Optional word omission: `-` in a bracket list sets `allowsOmission`; bracket containing only `-` is dropped at compile time; plain fallback strips whole `[...]` groups via regex; after omission, next literal matches with leading whitespace flex; `minMatchLen` / `earlyAnchor` adjusted for omission slots.
- Consecutive alts / omission polish: compile omits empty normalized literals between `]` `[`; `compiledMightBeBuildingTowardMatch` treats length ≥ 8 plus `earlyAnchor` hit, and `earlyAnchor.trim()` so partial text ending at the anchor word still counts; `matchPatternFrom` does not reset omission flex at each alt or on empty literals; fuzzy alt match sets `cursor` to end of hypothesis token only (no extra space skip) so following literals with leading spaces still match; `matchPatternFrom` exported for unit tests.

### `src/services/speakSentenceSplit.js`

#### Revision 16 — Created

- splitSpeakSegments for long-mode phrases.

### `src/utils/asrAssetUrls.js`

#### Revision 16 — Created

- getPublicBaseUrlWithPath, getSherpaAsrAssetBaseUrl, getSherpaAsrScriptUrl, getSpeakPcmTapWorkletUrl.

### `src/utils/micCaptureConstraints.js`

#### Revision 16 — Created

- MIC_CAPTURE_AUDIO_CONSTRAINTS, buildMicAudioConstraints(deviceId).

### `src/components/Mic/Mic.css`

#### Revision 17 — Created

- `.mic-calibration > .mic-audio-section + .mic-audio-section { margin-top: 4.5rem }` for space between consecutive Audio tab blocks (now led by an h3).

### `src/components/LevelEditor/SummaryAudioEditor.jsx`

#### Revision 18 — Created

- Four summary rows with `AudioSelector` (`allowedOptions` from `buildSummaryAudioRowOptions`), per-row Show Custom Voice Lines, help copy for None vs explicit soft Rank lines.

### `src/services/summaryAudio.js`

#### Revision 18 — Created

- `getSummaryAudioRef(levelDefinition, newRank, soft)`; rank-to-key map; legacy `Rank.*` + soft for failed/master when no per-rank override.

### `src/utils/externalVoicePackResolver.js`

#### Revision 18 — Created

- `resolveExternalAudioPackId(level, cliPackId)`: CLI pack when `loadPack` succeeds, else level `audioPackId` when pack exists, else null.

### `src/utils/musicPlaybackSessionStore.js`

#### Revision 18 — Created

- Exported `clearMusicPlaybackSession(immediate)`: clears `musicPlaybackSessionAtom` with optional instant teardown (shared by Playing cancel/complete paths and App Gameover exit).

### `src/atoms/playerProfilesModel.js`

#### Revision 19 — Created

- Schema constants, empty factories, `createDefaultPlayerProfilesState`, `normalizePlayerProfilesState`, `getResolvedActiveProfileId`.

#### Revision 23

- Removed `customLevelFolderNames` from new profiles; normalization strips legacy `customLevelFolderNames` from loaded profiles.
- `bypassLevelRequirements` on profiles (default false); migration/normalization ensures boolean.

#### Revision 34

- Profile shape supports `**allowsCaptures**`, `**allowsHiddenCaptures**` (non-default authoring data; defaults preserve prior behaviour).

### `src/components/Achievements/ProfileManager.jsx`

#### Revision 19 — Created

- Profile list, active selection, create/rename, stat-tracking toggle; session lock.

#### Revision 20

- In-app profile name dialog; `import '../ContentLibrary/ContentLibrary.css'` for shared `.import-dialog*` / `.dialog-header` styling; `react-feather` close control.
- Split `nameModal` + `draftName` state; confirm/rename/copy logic unchanged aside from reading trimmed `draftName`.

#### Revision 23

- “Bypass level requirements” for the default profile: mutual exclusivity with “Track Stats & Achievements” when toggling.
- Help paragraph under “Track Stats & Achievements” (when off, no scores / play history / achievement progress recorded for the profile).

#### Revision 34

- For **non-default** profiles only: new `**card-row**` sections **Allow Webcam Captures** and **Allow Hidden Capture Notifications** (each heading + checkbox + disabled when `**sessionLocked**`) with `**toggleAllowsCaptures**` / `**toggleAllowsHiddenCaptures**` merging into `**playerProfilesAtom**` via `**setPp**`.
- Shared `**PROFILE_OPTION_HELPER_TEXT_STYLE**` object (`**marginTop: '-1.5rem'**`, tighter typography / `**maxWidth**`) applied to helper `**<p>**` blocks under stats tracking, bypass, and both capture rows so stacked headings + copy read as one unit.

### `src/storage/playerProfilesStorage.js`

#### Revision 19 — Created

- `createPlayerProfilesStorage` for jotai v2 storage API; legacy migration; `subscribePlayerProfilesCrossTab`.

### `src/utils/levelCompletionPersistence.js`

#### Revision 19 — Created

- Pure `computeLevelCompletionUpdate` (stats + achievements) for Gameover merge.

### `src/constants/speakAudio.js`

#### Revision 22 — Created

- `SPEAK_INSTRUCTION_PCM_OVERLAP_MS` (250 ms before instruction end to open PCM feed).

### `src/atoms/customLevelFolderNamesAtom.js`

#### Revision 23 — Created

- `atomWithStorage` backed by `storageService`; `getOnInit: true`.

### `src/components/Training/LevelPrerequisitesModal.jsx`

#### Revision 23 — Created

- “Missing Requirements” dialog; shows missing levels and required ranks.

### `src/constants/defaultLevelPrerequisites.js`

#### Revision 23 — Created

- `PrerequisiteThreshold` labels; `DEFAULT_LEVEL_PREREQUISITES` map for built-in level ids.

### `src/services/levelPrerequisiteService.js`

#### Revision 23 — Created

- `getPrerequisiteRulesForTarget`, `rankMeetsMinimum`, `getBestRankForLevel`, `evaluateLevelQualification` (incl. `displayAsUnknown` / `prerequisiteIsDefault` for UI), `shouldEnforcePrerequisites` (bypass → default profile only), `getLevelsNewlyUnlockedByPrerequisites`.

### `src/utils/levelPrerequisitesUtils.js`

#### Revision 23 — Created

- `thresholdLabelForMinRank`, `normalizePrerequisiteRules`, `validateCustomPrerequisiteDAG` (acyclic graph over declared edges).

### `src/atoms/cameraRotationAtom.js`

#### Revision 25 — Created

- Persisted atom; rotation normalized to {0, 90, 180, 270}.

### `src/components/CameraRotationToggle.js`

#### Revision 25 — Created

- Button cycles rotation; highlights when non-zero.

### `src/utils/mediaDeviceEnumeration.js`

#### Revision 25 — Created

- `listVideoInputDeviceIdSet`, `listAudioInputDeviceIdSet` (permission + enumerate) for calibration import device filtering.

### `src/utils/previewToBufferCoords.js`

#### Revision 25 — Created

- `normalizeRotation`, `previewToBufferCoords(clientX, clientY, videoEl, bufferW, bufferH, rotationDeg, mirrored)` for brush, click, and overlay alignment.

### `src/atoms/depthDiagramInvertedAtom.js`

#### Revision 27 — Created

- `depthDiagramInvertedAtom` via `atomWithStorage('depthDiagramInverted', false)` for persisted toggle.

### `src/utils/sessionEndRank.js`

#### Revision 30 — Created

- `**getLevelPerfectPassTotals**`, `**evaluateSessionEnd**` (rounded thresholds + rank), `**computeSessionEndRank**` for `**formatSessionData**.

### `src/components/ExternalMode/AutoStartCameraChrome.jsx`

#### Revision 31 — Created

- Auto-start-only title row and centered play/pause strip (with `**PlayTime`**) above the webcam column; matches existing `**navigation-row**` / button styles.

### `src/constants/appMeta.js`

#### Revision 31 — Created

- `**APP_DISPLAY_TITLE**`: single source for the in-app display name (navigation + auto-start chrome).

### `src/hooks/usePlayPauseHandler.js`

#### Revision 31 — Created

- Shared play/pause + `**ensureGameplayMicBeforeResume**` path for `**NavigationMain**`, `**LimitedNavigation**`, and `**AutoStartCameraChrome**`.

### `src/constants/customVoiceCategories.js`

#### Revision 32 — Created

- `**CUSTOM_VOICE_CATEGORY_COUNT**` (**40**) and `**CUSTOM_VOICE_SLOT_KEYS`** (**Custom1** … **Custom40**); consumed by `**audioManager`**, `**taskAudioConfig**`, `**AudioSelector**`, `**AudioPackEditor**`.

### `src/atoms/levelEditorTaskClipboardAtom.js`

#### Revision 33 — Created

- `**atomWithStorage**` (`**levelEditorTaskClipboard**` key); custom sync storage: `**normalizeClipboardTask**` (requires object + `**type**`), `**removeItem**` on `**null**` write; `**{ getOnInit: true }**`.

### `src/components/Playing/InstructionPhaseBanner.js`

#### Revision 33 — Created

- `**taskInstructionVoicePhaseAtom**` subscription; `**enabled**` / `**hasInstructionAudio**` props; maps `**pending**` / `**playing**` / `**cooldown**` to Speak-aligned copy (`**help**` `**margin-y-sm**`).

### `src/atoms/captureAtom.js`

#### Revision 34 — Created

- `**INITIAL_CAPTURE_SESSION**` defaults + jotai `**captureSessionAtom**`: counters, `**currentChanceBonus**`, `**photoActiveUntilMs**`, `**photoIconState**` / `**videoIconState**`, `**isRecording**`, `**showStandbyInactiveIcons**`, `**levelAllowsPhotos**` / `**levelAllowsVideos**`, `**introStyleCaptureHud**`, `**isCoolingDown**` + `**lastCaptureUiVisible**` (single-timeout cooldown; visible captures suppress standby during cooldown, hidden captures do not).

### `src/components/Playing/CaptureStatusIcons.js`

#### Revision 34 — Created

- HUD omits when `**capturesEnabled**` is false; when enabled, **both** `**react-feather`** `**Camera**` and `**Video**` icons are always shown. Grey (**inactive**), black (**standby**), red (**active**) come solely from `**photoIconState`** / `**videoIconState**` (including **inactive** for task types that cannot produce that channel, e.g. Hit Depth → video, Up-and-Down → photo).

### `src/components/Playing/RestCapture.js`

#### Revision 34 — Created

- Thin Rest-task wrapper emitting `**onSignalCaptureWindow`** with `**useTaskCountdownLeft**` when Rest runs without `**RestBallsBonus**`.

### `src/constants/captureLevelDefaults.js`

#### Revision 34 — Created

- `**DEFAULT_CAPTURE_LEVEL_FIELDS**`, `**DEFAULT_TASK_CAPTURE_FIELDS**`, `**mergeLevelCaptureDefaults**`, `**mergeTaskCaptureDefaults**`.

### `src/hooks/useCaptureManager.js`

#### Revision 34 — Created

- Session lifecycle: memoized `**mergedLevel**`, `**getLevelCaptureChannelAvailability**` → `**levelAllowsPhotos**` / `**levelAllowsVideos**`, throttled rolls, compound chance, `**captureService**` worker saves + SFX, `**waitForRecordingSafe**`.
- Icon sync: `**TASK_TYPES_NO_VIDEO**` (**HITDEPTH**), `**TASK_TYPES_NO_PHOTO`** (**UPANDDOWN**) force **inactive** regardless of task `**allowPhotos`** / `**allowVideos**`; `**isIntroStyleCaptureHudTask**` for Get Ready / Calibration / Rest; **standby** when level flag + task allows + limits + not on visible cooldown; **photo** **active** while `**photoActiveUntilMs`** after visible still capture.
- Cooldown: `**scheduleCooldown**` single timeout (`**isCoolingDown**`, `**lastCaptureUiVisible**`) — no per-second atom updates. `**signalCaptureWindow**`: `**isCoolingDown**` / `**isRecording**` guards; visible vs hidden notification paths for icon state and SFX; failure sets cooldown + `**inactive**` video icon.

### `src/hooks/useTaskCountdownLeft.js`

#### Revision 34 — Created

- Shared countdown hook + `**getTaskTimerDuration**` so capture windows derive from canonical timer math.

### `src/services/captureService.js`

#### Revision 34 — Created

- Electron packaging guard, `**getLevelCaptureChannelAvailability**` (excludes `**TASK_TYPES_NO_VIDEO**` / `**TASK_TYPES_NO_PHOTO**`), `**runCapturesPreflight**`, `**runHiddenNotificationsPreflight**`, `**getResolvedCaptureOutputDir**`, `**playCaptureSfx**`, `**formatCaptureName**`.
- `**savePhoto**` / `**saveVideo**`: main thread grabs frames; encoding in `**captureWorker.js**` (new worker per capture, `**terminateCaptureWorker**` in `**finally**`); `**waitForWorkerMessage**` + `**worker.onerror**` handling.
- Video: `**waitForNextFrame**` (`**performance.now**`, 30 fps); `**videoDuplicateFrame**` when `**createImageBitmap**` exceeds backlog threshold; IPC persists buffers to disk.

### `src/workers/captureWorker.js`

#### Revision 34 — Created

- Off-thread Mediabunny MP4 (`**CanvasSource**`, `**Mp4OutputFormat**`, `**BufferTarget**`) and JPEG (`**OffscreenCanvas.convertToBlob**`) encoding; `**ImageBitmap**` transfer from main thread with rotation applied on draw.
- `**disposeVideoSession**` (`**videoSource.close()**`, zero canvas dimensions) after finalize, `**abort**`, or uncaught error.
- Protocol: `**videoStart**`, `**videoFrame**`, `**videoDuplicateFrame**`, `**videoFinalize**`, `**photoEncode**`, `**abort**` → `**videoReady**`, `**videoFrameAck**`, `**videoResult**`, `**photoResult**`, `**error**`.

### `src/utils/captureWebcamRef.js`

#### Revision 34 — Created

- Mutable ref registry + `**setCaptureRefs**` / `**clearCaptureRefs**` / `**getCaptureRefs**` accessors for `**useCaptureManager**`.

