# File history

This document summarizes per-file changes recorded in `CHANGELIST.txt` across revisions 1–43. For each file, entries are listed in chronological order (lowest revision number first).

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

#### Revision 39

- Config field `**levelList**`; parse `**--level-list**` as comma-separated IDs (trim / drop empties).
- Validation: exclusive with `**--level**`; empty list rejected; `**--calibrate-only**` / `**--validate-level**` exclusivity and `**--auto-start**` / `**--enable-captures**` requirements accept `**--level**` or `**--level-list**`.
- On valid parse, randomly resolves `**levelList**` into `**config.level**` (logs the chosen ID) so the rest of the app uses the existing single-level path.

#### Revision 41

- `**show-directory-picker**` accepts a path string or `**{ defaultPath, title }**`; string callers keep the capture-output dialog title.
- `**isSafeDirectoryBasename**`: rejects absolute paths, `**..**`, and path separators so bulk IO only touches basenames in the chosen folder.
- `**read-json-files-from-directory**`: non-recursive read of top-level `**.json**` files (`**{ name, text }**`).
- `**write-text-files-to-directory**`: writes `**{ filename, contents }**` UTF-8 files into the chosen directory.

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

#### Revision 41

- `**showDirectoryPicker**` forwards a path string or options object.
- Added `**readJsonFilesFromDirectory**` and `**writeTextFilesToDirectory**`.

### `src/App.css`

#### Revision 32

- Removed fixed `**max-height**` on `**#video-container**` (was **80vh** / **60vh** / **50vh**) and removed `**#video-container video**` max-height sizing; retained width/padding; file comment notes preview max height is set from React (`**WebcamDisplay**` / viewport slider).

#### Revision 36

- Added `**.loading-ellipsis**` / `**.loading-ellipsis__dots**` / `**.loading-ellipsis__dot**` styles and `**@keyframes loading-ellipsis-dot-1/2/3**` opacity animations (1.6s linear loop, four cumulative phases).
- Fixed `**3ch**` dot container width; hidden `**::before**` strut for baseline alignment; absolutely positioned dots with tuned `**font-size**`, `**font-weight**`, and horizontal spacing.

#### Revision 43

- Kept the loading ellipsis and the `**#video-container**` overflow rules. The v22 video max-height cap was not copied; preview height still comes from the viewport slider.
- Added the shell: `**.app-shell**`, `**.app-header**`, `**.brand-lockup**`, `**.brand-eyebrow**`, `**.primary-navigation**`, `**.nav-button**`, `**.nav-button-play**`, `**.play-controls**`, `**.play-time**`, `**.nav-pause-button**`, `**.camera-card**`, and `**.content-panel**`.
- `**.app-header-nav**` holds only the session row.
- `**.utility-navigation**` sits under the header, `**position: relative**` and `**z-index: 2**`, so the Setup menu paints over the camera card. `**.utility-toggle**` cancels the shell button’s min-height, uppercase, and fill. `**.utility-tools**` is Setup then More, with `**gap: 1.8rem**`. Setup is `**translateY(-2px)**` so the labels line up.
- `**.utility-navigation.is-collapsed**` cancels the header’s `**1.2rem**` bottom margin and uses `**0.45rem**` padding above and below, so Setup and More sit in the middle of a short gap. Opening More restores `**min-height: 3.8rem**` and `**margin-bottom: 1rem**`. Under `**760px**` the row stacks to the end and `**.utility-links**` is full width. The links are not in `**.primary-navigation**`, so they do not join the icon grid.
- `**.utility-links .nav-button**` uses `**background: var(--surface)**` and `**border-color: var(--line)**`. The More-row tabs sit lighter than the page, the same relationship as v22’s secondary-row buttons, and the fill follows the active theme.
- `**.setup-file**` is `**width: max-content**`. `**.setup-file-menu**` is `**14rem**`, `**max-width: none**`, `**right: 0**`, so Export settings and Import settings line up with Setup and open to the left.
- `**.setup-export-dialog**` is portaled to `**document.body**` and uses `**container-type: inline-size**`. At `**36rem**` the options are two columns. Even options (Grids, Voice Pack, Theme) open their `**?**` tip to the left. A hovered or focused option is `**z-index: 3**` so the tip paints over the other column.
- Header, cards, buttons, and selects use `**var(--surface)**` and `**var(--ink)**` instead of hardcoded white. Selects set `**background-color**` only, so the skeleton dropdown arrow stays.
- `**.brand-lockup h1**` is `**clamp(2.6rem, 3vw, 3.2rem)**`.
- Dropped the side padding on `**#video-container**`. Preview height is still the viewport slider; the v22 `**72vh**` / `**55vh**` video limits were not added.
- `**.camera-card-header**` and `**.camera-card-header h2**`: the title is `**2.1rem**` (`**1.8rem**` under `**430px**`). `**.camera-status**` is the FPS pill, colored with `**var(--success)**`.
- `**.camera-preview**` has `**margin-bottom: 2.2rem**`, so the feed sits above the footer’s `**border-top**`.
- `**.camera-card-footer**` holds the source row and the adjust row. Footer labels have no margin or padding. The source label is `**var(--ink)**`; the height label is `**var(--muted)**`. The select `**min-width**` is `**20rem**`. Footer buttons have `**margin: 0**`.
- `**.camera-card-footer-off**` uses `**justify-content: space-between**`. Under `**760px**` the other footer stacks, and this one stays a row so the mirror toggle remains on the right. The select there is `**width: 100%**` with `**min-width: 0**`.
- `**.content-panel h2**` and `**.content-panel h3**` are `**2.1rem**`, the same size as the camera title. `**h4**` and `**h5**` stay on the Skeleton scale.
- Labels inside `**.content-panel**`, `**.camera-card-footer**`, and `**.task-editor-card**` have no margin or padding, so the global `**label**` rule in `**index.css**` does not loosen those forms.
- `**.mic-fade-settings**` is a two-column grid, `**column-gap: 12px**`, `**row-gap: 1rem**`, `**align-items: end**`, centered. `**.content-panel .mic-fade-checkbox-label**` is `**height: 3.7rem**` with no margin or padding, so the checkbox sits on the duration stepper instead of using `**padding-top: 1.5rem**`.
- Removed the `**max-width: 480px**` rule that set every `**button**` to `**14px**` and `**8px 12px**`. That rule was overriding the shell nav. The container padding in that breakpoint stays.
- `**.app-version**` sits under the shell in normal flow, the same width as `**.app-shell**` (`**min(100%, 1180px)**`), `**margin: 0.8rem auto 0**`, left-aligned, `**var(--muted)**`, `**1.1rem**`. It is not fixed, so it only shows at the end of the page.
- `**.tab-title**` centers the page title (`**margin: 0 0 1.6rem**`). `**.content-panel h2.tab-title**` is `**3cap**`, which beats the `**2.1rem**` rule on panel `**h2**`. Section headings stay left. `**.tab-title-actions**` is a right-aligned row under the title.
- `**.number-control-container**` is a three-column grid. `**--number-control-height**` and `**--number-control-side**` are `**4.2rem**`.
- `**button.number-control-btn**` fills its cell: no shell min-height, margin, or padding. `**button.number-control-btn.minus**` uses `**padding-bottom: 0.14em**` so the Raleway hyphen sits on the center. Hover does not translate the button.
- `**input[type="number"].number-control-value**` overrides the shell number field: no padding or min-height, spinners hidden, digit centered, `**line-height: calc(var(--number-control-height) - 2px)**`.
- `**.audio-source**` uses the camera source row. `**margin-top: 2.4rem**` separates it from the calibration paragraph. The label is `**1.8rem**` and `**700**`. The select `**min-width**` is `**20rem**`. Under `**760px**` that select is `**width: 100%**` with `**min-width: 0**`.
- `**.content-panel h2.loading-ellipsis**` is `**clamp(3.2rem, 5vw, 4.4rem)**`. `**.App:has(.app-shell--splash)**` is a column flex, and `**.loading-splash**` centers the word in the shell.
- `**--splash-breath**` is `**4.5s**`. The word fades opacity only (no scale, so a width change can recenter it). The three dots build and unwind on that same cycle. `**.loading-splash::before**` is an accent ellipse (`**rgba(var(--accent-rgb), 0.4)**`, transparent at `**58%**`) whose opacity breathes from `**0.2**` to `**1**`.
- `**.loading-ellipsis__dot**` is inline, `**width: 0.45ch**`, instead of absolutely positioned inside a `**3ch**` slot. That slot was wider than the painted dots and left empty space on the right, so “Running pre-flight checks...” and “Loading level and configuration...” sat to the right of the visible “Loading...”.
- Handoff: `**--shell-exit**` is `**480ms**`, `**--shell-in**` is `**300ms**`. `**.app-shell--splash-exit**` is fixed over the shell and fades out. Then `**.app-header**`, `**.camera-card**` with `**.shell-cylinder**`, then `**.shell-tab**` fade in. `**prefers-reduced-motion**` holds a still tint and a steady “Loading...” and skips the enter animation.
- Auto-start adds `**.app-shell--no-header**`. There is no header step. `**.camera-card**` and `**.shell-cylinder**` fade in at `**--shell-exit**`, and `**.shell-tab**` at `**--shell-exit**` + `**--shell-in**`.

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

#### Revision 36

- Startup loading screen: replaced static `**<h2>Loading...</h2>**` with `**loading-ellipsis**` heading — static `**Loading**` text plus three `**loading-ellipsis__dot**` spans; `**aria-live="polite"**` and `**aria-busy="true"**` on the heading.

#### Revision 39

- Auto-start safety error text updated to mention `**--level**` or `**--level-list**`.

#### Revision 43

- Calls `**useApplyTheme()**`.
- The root is `**container app-shell**`. Loading and error sit in `**main.content-panel**`.
- The preview is `**section.camera-card**`. The cylinder stays outside that card and is still mirrored.
- When the feed is off, the card is `**CameraCardHeader**` (no FPS), the “Camera is off” placeholder, then `**.camera-card-footer.camera-card-footer-off**`: `**CameraToggle**` on the left and `**MirrorToggle compact={false}**` on the right.
- `**renderControls()**` is wrapped in `**main.content-panel**`. `**NAV.THEMES**` renders `**Themes**`.
- `**hideCameraArea**` is true on Profiles (`**NAV.ACHIEVEMENTS**`), Level Editor, Voice Pack Editor, and Themes. In external mode Themes is a primary tab, so `**NAV.THEMES && !isExternalMode**` leaves the card up there. `**showCamera**` and `**showCameraArea**` are both false on a hidden route, so the camera card is not rendered. Play and game over still force the feed on when the card is shown.
- `**finishLoading()**` sets `**exiting**`, or `**ready**` when reduced motion is on. The three startup paths that used to set `**ready**` call it. Auto-start waits `**1080ms**` (`**480 + 300 * 2**`). Other startups wait `**1380ms**` (`**480 + 300 * 3**`). Then `**exiting**` becomes `**ready**`.
- `**renderLoadingSplash**`. `**initializing**`, `**checking**`, and `**loading**` render only the splash, so the main shell stays unmounted during preload. `**exiting**` renders that shell with `**app-shell--enter**` under the fixed splash. Auto-start also adds `**app-shell--no-header**` while exiting. `**Version**` is omitted while exiting. The cylinder wrapper is `**shell-cylinder**`. The tab wrapper is `**shell-tab**`.

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

#### Revision 40

- Added `**captureSfxAtom**` (same request shape as `**sfxAtom**`).

#### Revision 43

- `**micInputDeviceIdAtom**` comment: `**null**` is the Audio source “Default microphone” option.

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

#### Revision 43

- `**THEMES = 13**`.

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

#### Revision 43

- The page title is `**<h2 className="tab-title">**` “Profiles”. The wrapper is a plain `**div**`, not `**padding-y**`, so the heading lines up with the other tab titles.

### `src/components/Achievements/Stats.jsx`

#### Revision 19

- Per-profile stats display; reset default / delete all profiles / delete all custom content / delete profile flows with countdowns; session lock during play/gameover; confirmation modal for delete-all-custom; `clearAllOtherDestructiveCountdowns`; `runFactoryReset` chains `audioFileService.clearAllAudioFiles`, `storageService.clearAllCustomContent`, `audioManager.clearCustomContentCache`, `audioManager.validateActivePack`, and default `playerProfiles` state.

#### Revision 23

- Hold Time Stats total and per-depth rows use `formatHoldTimeStatsDisplay` instead of `formatTime`.

#### Revision 43

- Dropped `**marginTop: '6rem'**` on the centered profile-actions row.

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

#### Revision 36

- `**stopVoiceRequest**`: capture `**wasInstructionPlaying**` before clearing ref; cooldown → `**ready**` only when instruction voice was actually playing (avoids premature `**ready**` on task advance with instruction audio).
- Instruction voice effect: clear `**instructionTailTimerRef**` before starting a new clip so a prior stop’s tail timer cannot unlock claps mid-instruction.

#### Revision 40

- Added `**captureSfxAudioRef**` alongside `**sfxAudioRef**` so capture clips and metronome clips use separate `**HTMLAudioElement**`s.
- Replaced `**playSfx**` with `**playSfxOnChannel**`: pauses only the given channel before starting a new clip.
- New `**captureSfxAtom**` effect mirrors the metronome SFX effect (play, then reset the atom to `**0**`).
- SFX volume updates and unmount cleanup apply to both channel elements.

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

#### Revision 43

- The camera-off note is `**var(--muted)**`.
- The page title is `**<h2 className="tab-title">**` “Grid Calibration”.
- The export and import buttons are gone. Complete Calibration still calls `**exportCalibration()**` with no section list, which writes the full snapshot.

### `src/components/Calibration/CalibrationTester.js`

#### Revision 15

- ballsCovered from ballsCoveredAtom for feedback and display; removed unused grids/hasBallsGrids.

### `src/components/Calibration/HysterisisControls.js`

#### Revision 9

- Added disabled prop support.

### `src/components/Calibration/PercentControls.js`

#### Revision 9

- Added disabled prop support.

#### Revision 43

- Validation text is `**var(--danger)**`.

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

#### Revision 43

- The placeholder swatch and borders use surface-soft and line. The RGB caption is muted. The sampled color fill is unchanged.

### `src/components/Cylinder/Cylinder.css`

#### Revision 27

- `grid-row-1`: `display:flex` plus equal `.cylinder-item { flex:1; min-width:0 }` (replaces grid) for equal shaft columns.

#### Revision 43

- Section fill is `**var(--surface-soft)**`. Borders are `**var(--line)**`.
- `**.cylinder-layout**` has `**margin-bottom: 2rem**`, so the depth diagram on Play sits above the content panel instead of resting on it.

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

#### Revision 43

- Idle is `**var(--surface-soft)**`. The target depth is `**var(--accent)**`. The secondary target is `**var(--accent-light)**`.
- The diagram root is `**div.cylinder-layout**`.

### `src/components/Cylinder/TaskInstructions.jsx`

#### Revision 11

- TaskType.ENDLESS: instruct "Freeform".

#### Revision 14

- Removed REST_BALL case; 'rest ball' falls through to REST for backward compatability.

#### Revision 16

- TaskType.SPEAK instruction copy.

#### Revision 43

- The instruction border color is `**var(--accent)**`.

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

#### Revision 43

- The external-mode closing countdown uses muted on surface-soft. Task rows divide with `**var(--line)**`.

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

#### Revision 42

- A Custom option’s label is `**${category}.${key}**`. Other pack categories still use `**${category}.${key} (custom)**`.

#### Revision 43

- The root is `**.task-audio-selector**`. Preview buttons are `**.task-audio-preview**`.
- `**summaryStyle**` adds `**.is-summary**`. `**summaryExtra**` sits with Preview in `**.summary-voice-actions**`. Category selects use `**.task-voice-category-select**`. Summary Preview is `**.task-audio-preview-summary**`.

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

#### Revision 41

- Single-file export/import now use `**levelFileFormat**` helpers (`**applyEditorAudioFields**`, `**stringifyLevelFile**`, `**parseLevelFileText**`, `**normalizeImportedLevel**`, `**triggerBrowserDownload**`).
- Added **Export All Levels** / **Import All Levels** under the existing file actions; export scope is `**levelsForLoadSelect**` (Folder dropdown).
- `**handleExportAll**`: writes one `**level-v1**` file per stored custom level via `**pickDirectoryAndWriteLevelFiles**`.
- `**handleImportAll**`: reads a directory, skips invalid / default-id / duplicate files, confirms overwrites, two-pass `**levelManager.saveLevel**` so cross-file prerequisites survive, then refreshes the load list.

#### Revision 42

- Initial state and `**handleNewLevel**` set `**tasks**` to `**createLevelBookends()**`.
- `**handleLoadLevel**` still assigns `**loadedLevel.tasks || []**`. Import and bulk import are unchanged.
- `**handlePasteTask**` inserts the clipboard task before a trailing Finish (`**TaskType.FINISH**`). With no trailing Finish, the task is still appended.

#### Revision 43

- Helper copy, the capture-settings panel, the level-id code, and the capture-limit warning use muted, surface-soft, line, text-secondary, and danger.
- The page title is `**<h2 className="tab-title">**` “Level Editor”. The **← Back to Training** row is gone; leaving the tab uses the main nav.
- The root is `**.level-editor**` so compact NumberControl CSS covers metadata, capture settings, task cards, and Endless events.
- **Import Level File** is a `**<button className="button padding-x margin-x">**` that clicks a hidden file input (`**importFileInputRef**`), matching **Export Level File**.

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

#### Revision 42

- `**hasReady**`, `**hasFinish**`, `**firstMovable**`, `**lastMovable**`, and `**isFixed**`: the first task is fixed only when it is Get Ready, and the last task is fixed only when it is Finish.
- `**addTask**` inserts at `**length - 1**` when the list ends with Finish, instead of always appending.
- `**updateTask**` ignores a type change on a fixed row. `**deleteTask**` returns immediately on a fixed row. `**moveTask**` no-ops on a fixed row and refuses a destination outside the movable range.
- Fixed rows are collapsible via `**openBookends**` (default collapsed). The collapsed control is `**.task-bookend-summary**`, showing `**#{n}**` and the type label. The expanded row keeps `**TaskForm**`, with a **Level Start** / **Level End** heading that collapses it, and passes `**fixed**`.
- When the list is only those two tasks, `**.task-middle-empty**` reads "Added tasks will go here."
- Paste button title and aria-label say the task is pasted before a trailing Finish. The existing add-task buttons are unchanged.

#### Revision 43

- The empty-list hint is `**var(--muted)**`. The divider under the task list is `**var(--line)**`.
- The collapsed bookend button adds `**.control-compact**`.
- `**ADD_TASK_GROUPS**`: Training (Hit Depth, Up/Down, Hold, Hold and Clap), Interim (Rest, Clap, Speak), Special (Get Ready, Finish, Endless). The add bar is two columns (Training+Interim | Special+Clipboard). New Get Ready tasks set `**timeLimit: 15**` only (no `**desc**`).
- The lower add bar renders only when `**hasMiddleTasks**` is true (bookends-only levels show the top bar).

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

#### Revision 40

- `**captureSupportForTaskType**`: **Allow photos** for `**UPANDDOWN**`; **Allow videos** for `**HITDEPTH**`.

#### Revision 42

- Added `**fixed**` (default `**false**`).
- The type `**<select>**` is `**disabled**` when `**fixed**` is true.
- The delete button is omitted when `**fixed**` is true. Time, description, and audio stay editable.
- Custom audio menus call `**getCustomAudioOptions(audioPackId)**` and `**getAudioOptionsForTaskType(..., audioPackId)**`. Those helpers no longer take a display-name map.

#### Revision 43

- The card root is `**.task-editor-card**`, with `**.task-editor-header**` and `**.task-editor-fields**`.
- Delete buttons keep `**.button-delete**` and add `**.task-delete-button**`.
- Helper text, score-event rows, and the capture outline use muted, surface-soft, and line.
- The `**fixed**` bookend behavior from Revision 42 is unchanged.
- Each score-event row has `**.control-compact**`. The up and down buttons dropped their inline `**2px 6px**` / `**12px**` size so they use that compact size. A disabled move still sets its opacity inline.
- Skip-feedback, script path, and per-task capture sit in a collapsed **Advanced** block. Opening it is UI-only (`**advancedOpen**`); it is not written on the task.
- Voice is **Voice Category** (Task-Specific / Release / Custom) then **Voice Line**. Category is derived with `**voiceCategoryForSlot**`; changing depth, tempo, or type only overwrites a cue when that slot is Task-Specific. A saved cue outside the filtered list stays as `**{value} (not available in this list)**` via `**withSavedVoiceOption**`. Endless score-event rows and Session Summary Voice keep their own controls.
- The type control is `**.task-type-select**`. Get Ready no longer has a Description field (`**task.desc**` was unused at play). Up/Down Tempo is `**.task-tempo-select**` with a centered heading. Rest Balls bonus uses `**.task-rest-balls**`. Speak fuzzy-match uses `**.task-speak-fuzzy-label**`.

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

#### Revision 36

- `**GETREADY_AUDIO**`, `**RELEASE_AUDIO**`, and `**DEFAULT_LEVEL_SUMMARY_AUDIO_OPTIONS**` updated to new key names.
- `**HOLD_AUDIO**`: added `**Warmup.HOLD_THREE**` and `**Warmup.HOLD_FOUR**` for custom-level hold tasks.

#### Revision 42

- `**getCustomAudioOptions(audioPackId)**` loads that pack (or the active pack when the id is null) and returns playable cues labeled `**Custom.<key>**`.
- `**getAudioOptionsForTaskType**` and the hold-progress helpers take `**audioPackId**`. They no longer take a display-name map.

#### Revision 43

- `**getVoiceLineOptions**`, `**voiceCategoryForSlot**`, and `**withSavedVoiceOption**` drive the Task-Specific / Release / Custom split. Opening a saved task does not write `**audioMode**`.
- `**getSummaryModeDefaultCue**` and exclusive Summary vs Custom lists in `**buildSummaryAudioRowOptions**`.
- `**UPANDDOWN_AUDIO**` renames `**UpDown.ONE_THREE_MEDIUM**` and `**UpDown.ONE_FOUR_MEDIUM**` to `**UpDown.ONE_THREE_MED**` and `**UpDown.ONE_FOUR_MED**`. The 60 BPM tempo key is `**MED**` instead of `**MEDIUM**`.

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

#### Revision 43

- The page title is `**<h2 className="tab-title">**` “Audio Calibration”.
- The opening help paragraph is gone. Audio Source is the first control under the title.
- Speech Detection, Background Track Settings, and Volume Settings are `**h5**`. The speech-section help line is gone.
- After Volume Settings: `**<hr />**`, `**<h3>Help</h3>**`, then the former intro plus the clap-threshold and speech-test notes as separate paragraphs, then a closing `**<hr />**`. That block is not `**mic-audio-section**`.
- Fade In and Fade Out durations are `**NumberControl**`s with `**min={1}**`, `**max={30}**`, and `**step={1}**`. The row is `**.mic-fade-settings**`. Each duration sits in `**.mic-duration-number-control-scale**`.

### `src/components/Mic/SpeechDetectionCalibration.js`

#### Revision 17

- Transcript UI + useMicStreamForCalibration + useSherpaMicTap.
- Staged help for speech test: PCM → decode → listening.

#### Revision 22

- `useSherpaMicTap`: `pcmFeedAllowedRef` (always true) replaces the old combined recognition ref name.

#### Revision 43

- The endpoint callback takes `**reset**` instead of the recognizer and stream, and calls `**reset()**` after appending the line.

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

#### Revision 43

- The bar is `**<header className="app-header">**`: brand lockup (`**APP_DISPLAY_TITLE**`, eyebrow "Practice Makes Perfect"), then one `**.primary-navigation**` row.
- That row is Help, Grids, Audio, Buttplug, Content Library, Levels, and Play. Buttons use `**nav-button**` and `**is-active**`. Play adds `**nav-button-play**`. Pause uses `**nav-button nav-pause-button**`.
- The Grids button uses the Feather `**Grid**` icon at `**size={18}**`, in place of `**Compass**`.
- Under the header, while `**playState**` is not `**PLAYING**`, a **More** toggle (`**useState(false)**`, not stored) reveals Voice Pack Editor, Level Editor, Profiles, and Themes. Profiles sits immediately left of Themes. Setup sits in `**.utility-tools**` to the left of More. Closing More does not change `**navAtom**`.
- Route handlers, the external-mode swap to `**LimitedNavigation**`, and `**useButtplug**` are unchanged. `**LimitedNavigation**` has no More row.

### `src/components/NumberControl.jsx`

#### Revision 9

- Added disabled prop support.

#### Revision 34

- Optional `**centerRow**` prop aligns inline-flex numeric rows under centred labels.

#### Revision 43

- Wrapper class is `**number-control margin-x**` so the editor can zero side margins without touching Calibrate `**.margin-x**` buttons.

### `src/components/PlayTime.jsx`

#### Revision 31

- Comment: timer lives in `**Playing.js**` when nav is hidden in CLI auto-start mode.

#### Revision 43

- Class is `**not-a-button padding-x-sm play-time**`.

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

#### Revision 41

- Unmount cleanup wraps `**stopVibration**` with `**stopVibrationUnlessPreserved**`.

#### Revision 43

- The meter frame and the calibration caption use line, surface-soft, and muted.
- The heading is `**h5**` “Clap Detection” in calibration and during play.
- The calibration help paragraph is gone. That copy is in the Audio tab Help footer.
- “Claps detected” and “Current threshold” are paragraphs, not `**h5**`, so they sit under the section title.

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

#### Revision 39

- Added `**hasPenalizedForSurfaceRef**`: latches after a surface penalty so the same visit cannot stack scores.
- Cleared on leaving depth 0 and on UPANDDOWN task reset so later resurfaces still penalize once each.
- Surface penalty effect no longer depends on `**motion.dir**` / `**provideFeedback**`; applies once per surface visit after `**hasStarted**`.

#### Revision 40

- Unified `**windowOk**` (`**tempoOk && active && timeLeft >= vidMin**`) for photos and videos; Up-and-Down no longer passes `**photos: false**`.

#### Revision 41

- Imports BPM helpers from `**diveTempo.js**`; removed the local `**calculateTempo**`.
- Seeds `**motion.downTempo**` from `**task.startingBpm**` (`**seededBpm**`, gated by `**isPlausibleBpm**`) when an Up-and-Down task inherits a starting BPM.
- Added `**pendingStartingBpmRef**`, `**skipLeftoverScoreRef**`, and `**suppressNextUpTempoRef**` (reset on task setup) to manage the leftover half-stroke after a skip handoff.
- New `**resolveStrokeTempo**` helper: uses the inherited BPM for the first half-stroke, then measured values.
- Skips scoring the first `**dir === 'up'**` stroke when a starting BPM was seeded, so the carried-over stroke cannot cause a false fail.
- Passes the last measured BPM to `**onTaskOver**` via `**{ lastBpm: getAverageMotionBpm(motionRef.current) }**`; `**myTempo**` now uses `**getAverageMotionBpm**`.

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

#### Revision 37

- `**checkScoreEvents**`: drain loop fires all consecutive events whose thresholds are already satisfied in one scoring update; `**repeatEvents**` still wraps index after a full pass without re-running the list in the same tick.

#### Revision 41

- Unmount cleanup wraps `**stopVibration**` with `**stopVibrationUnlessPreserved**`.
- Comment updated to match 1 pt/s balls-bonus scoring.

### `src/components/Playing/HitDepth.js`

#### Revision 10

- Added diveState to effect dependency arrays so hit detection re-runs when depth changes.

#### Revision 14

- Hit Depth: effectiveTimeLimit fallback (calculateHitDepthTimeLimit) when timeLimit 0/missing.

#### Revision 17

- Hit state machine: run `AT_DEPTH` + `depthDifference === -1` reset before surface → `hitFailed()` so target depth 1 can reset at the surface without a false fail.

#### Revision 34

- `**onSignalCaptureWindow**` signalling when repeats hit anchored depth checkpoints.

#### Revision 40

- Capture window after first target-depth hit: `**depth !== 0**`, `**hasHitTargetOnceRef**`, `**timeLeft > 1**` (via `**diveStateRef**` / 1 Hz interval); replaces `**hitState === AT_DEPTH**`-only signaling.
- `**hasHitTargetOnceRef**` set on first successful reach, reset on task change; `**onSignalCaptureWindow**` passes `**{ photos: windowOk, videos: windowOk }**` (Hit no longer video-blocked at component level).

#### Revision 41

- Added `**handoffActiveRef**` (from `**task.skipHandoff**`). While active, carried-over depth is reflected (parks at `**AT_DEPTH**` when at/past target) but never scored; a genuine reset to the surface disarms the handoff and arms real scoring for the first deliberate hit.
- `**hasStarted**` stays false while parked, so leftover depth cannot trigger a surface penalty or failure.
- Hit reset: `**AT_DEPTH**` now arms the next attempt when `**depthDifference < 0**`, not only `**=== -1**`, so skipped shallower depths still reset. Depth `**0**` with target `**> 1**` still falls through to `**hitFailed()**`.

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

#### Revision 41

- Same dwell-arm handoff as `**HoldDepth.js**` (`**SKIP_HOLD_DWELL_MS**`, `**handoffArmRef**`, `**dwellTimerRef**`), including the parked state machine, `**holdStart**` disarm, guarded `**hasStarted**`, and preserved idle vibration.

### `src/components/Playing/HoldDepth.js`

#### Revision 10

- Added diveState to effect dependency arrays so hold countdown re-runs when depth changes.

#### Revision 25

- Halfway and three-quarter `setFeedback` only when `task.audioHalfway` / `task.audioThreeQuarter` are set (truthy).

#### Revision 34

- `**onSignalCaptureWindow**` when dwell state meets depth/time prerequisites for Holds.

#### Revision 36

- Imports `**HoldProgressBar**` and `**useHoldProgress**`; replaces `**CountdownBar**` for hold-task progress display.
- `**useHoldProgress(holdState, task?.time, task?.id)**` returns `**barRef**` for imperative bar updates; scoring `**timeTracking**`, completion, audio, vibration, and penalty logic unchanged.

#### Revision 41

- Added `**SKIP_HOLD_DWELL_MS**` (400ms), `**handoffArmRef**` (from `**task.skipHandoff**`), and `**dwellTimerRef**`.
- While armed, the state machine ignores all scoring/penalty/transition logic and only arms a dwell timer once stably at the target depth; leaving depth cancels it. When it fires, the hold starts normally.
- `**holdStart**` disarms the handoff, clears the dwell timer, and marks started; `**hasStarted**` stays false while armed; the idle-vibration branch keeps inherited vibration while parked.

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

#### Revision 36

- `**ClapDetector**`: `**key={currentLevel.currentTask.id}**` so each Clap task remounts with fresh clap count and detection warmup (matches other task components).

#### Revision 40

- Task advance also clears `**captureSfxAtom**`, matching the existing `**setSfx(0)**` reset.

#### Revision 41

- `**gotoNextTask**` accepts `**skipHandoff**`; clones the next task to set `**skipHandoff**` (all task types) and `**startingBpm**` (Up-and-Down only). The no-more-tasks/gameover path clears `**preserveVibrationAtom**` and zeroes `**vibrateSpeedAtom**`.
- `**onTaskOver**` sets `**preserveVibrationAtom**` before the unmounting `**setCurrentLevel**` when a next task exists, forwards `**startingBpm**` / `**skipHandoff**`, then clears the flag via `**queueMicrotask**`; the normal 2s path clears the flag.
- `**cancelLevel**` clears `**preserveVibrationAtom**` and zeroes vibration (cancel never carries vibration forward).

#### Revision 43

- The Begin button, while loading, uses surface, ink, and line. The hidden-capture note is `**var(--text-secondary)**`.

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

#### Revision 41

- Unmount cleanup wraps `**stopVibration**` with `**stopVibrationUnlessPreserved**`.

#### Revision 43

- Match handling and the endpoint callback take `**reset**` instead of `**r**` and `**s**`. A match and an endpoint both call `**reset()**`.

### `src/components/ShaftReading.js`

#### Revision 9

- Added placeholder prop for display when camera disabled.

#### Revision 43

- The subtitle is `**var(--muted)**`.

### `src/components/Tasks/audio.js`

#### Revision 8

- Added Endless.ENDLESS audio event reusing Lvl_begint.START files.

#### Revision 10

- Changed Endless.ENDLESS to use distinct paths (audio/lvl/endless/1 start a.mp3, etc.) instead of sharing Lvl_begint.START paths.

#### Revision 14

- Calibration: moved BALL subcategory to appear underneath FOUR in Audio Pack Editor.

#### Revision 34

- Registers `**Sfx.PICTURE**` / `**Sfx.VIDEO**` entries for shutter feedback.

#### Revision 36

- Removed top-level `**Lvl_***` objects; moved keys into `**Level**`, `**Rank**`, and `**Release**` with numbered naming convention above.
- Removed unused `**Level.START_00**`.

#### Revision 37

- `**Warmup.HOLD_THREE**` and `**Warmup.HOLD_FOUR**`: changed from `**'non'**` to `**''**` so `**getGeneratableKeys**` includes them in the ElevenLabs Generate Lines subcategory list.

#### Revision 43

- `**ONE_THREE_MEDIUM**` and `**ONE_FOUR_MEDIUM**` renamed to `**ONE_THREE_MED**` and `**ONE_FOUR_MED**`.

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

#### Revision 16 — Created

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

#### Revision 43

- The checkmark stays `**var(--accent)**`. Difficulty is `**var(--muted)**`. A locked level uses `**var(--surface-soft)**`. The divider is `**var(--line)**`.

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

#### Revision 43

- Debug task rows alternate `**var(--surface-soft)**` instead of `**#f5f5f5**`.
- The page title is `**<h2 className="tab-title">**` “Select a Level”.

### `src/components/Training/levels.js`

#### Revision 12

- Replaced all AUDIO.X.Y with 'X.Y' string keys; removed AUDIO import.

#### Revision 18

- Import `AUDIO`; `BASELINE_SUMMARY_AUDIO` / `SOFT_SUMMARY_AUDIO`; `summaryAudio` on all twelve default levels; begint/quickbg/dive101 overrides as in summary above.

#### Revision 36

- Default level task and `**summaryAudio**` refs updated to canonical `**Level.***`, `**Rank.***`, and `**Release.***` keys.

#### Revision 43

- Shipped Get Ready tasks still store `**desc**` on disk; the editor no longer edits that field. The 1-to-3 Up/Down cue is `**UpDown.ONE_THREE_MED**`.

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

#### Revision 43

- Renders `**<p className="app-version">**` after `**.app-shell**`. The loading and error returns still omit it.

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

#### Revision 41

- Removed `**MirrorToggle**` from the `**CameraToggle**` / `**CameraRotationToggle**` column.
- Rendered `**MirrorToggle**` after the camera device list, still gated by `**showCameraToggle**`.

#### Revision 43

- The centered stack is a fragment inside the existing `**.camera-card**`: `**CameraCardHeader**` (with `**fps**`), `**.camera-preview**`, then `**.camera-card-footer**`.
- The overlay FPS chip is gone. The preview wrapper measures `**100%**` of the card, and its `**maxHeight**` is still `**viewportHeightCap**` times the window height. Stage sizing, rotation, and the mirror transform are unchanged.
- The device-button row is a `**#camera-device**` select on `**cameraVideoDeviceIdAtom**`. An empty value writes `**null**`, which keeps `**facingMode: 'user'**` and the existing webcam `**key**`.
- While `**showCameraToggle**` is set, the adjust row is `**CameraToggle**`, the height slider, then `**CameraRotationToggle**` and `**MirrorToggle compact={false}**`. During play and game over that row stays hidden, and the select stays.

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

#### Revision 42

- `**.profile-file-section**`: `**max-width: 480px**` and auto horizontal margins, matching `**.card**`, so the export/import block lines up with the Active Profile card. `**background: none**` and `**text-align: center**`.
- `**.profile-file-section-note**`: the helper line under those buttons (0.9rem, opacity 0.88, line-height 1.35).

#### Revision 43

- `**.play-time**` background is `**var(--surface-soft)**`.
- `**.button-danger-outline**` uses `**var(--surface)**`, with a danger mix on hover.
- The stats confirm dialog uses `**var(--surface)**`, `**var(--ink)**`, and `**var(--text-secondary)**`.
- `**.profile-manager-card .profile-option-row**` uses `**padding: 1.4rem 0**`, so the toggle title and its helper copy no longer overlap.

### `src/css/skeleton-light.css`

#### Revision 15

- .mic-duration-number-control-scale (transform scale 0.88).
- .mic-fade-checkbox-label (padding-top align with number row).

#### Revision 43

- Primary buttons, selected borders, and checkbox `**accent-color**` use `**var(--accent)**`. Warning buttons use `**var(--danger)**`.
- `**.border-bottom**` uses `**var(--line)**`.
- Form chrome the shell does not fully replace now uses theme tokens. `**input**`, `**textarea**`, and `**select**` borders are `**var(--line)**`. Select background is `**var(--surface)**`.
- `**.not-a-button**` is `**var(--muted)**` on `**var(--surface)**`.
- `**.number-control-btn**` is `**var(--muted)**`. Pressed and focused, it is `**var(--ink)**` on `**var(--surface)**`. `**.number-control-value**` dividers are dashed `**var(--line)**`, and the field is `**var(--surface)**`.
- `**.colorreading-box**` and `**.shaftreading-box**` borders are `**var(--line)**`.
- `**.mic-duration-number-control-scale**` shrinks the fade duration `**NumberControl**` to `**3.7rem**`, about 12% under the shell `**4.2rem**`. `**.mic-fade-checkbox-label**` is a flex row of that same height, so Fade In and Fade Out sit on the steppers under the Duration captions.

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

#### Revision 36

- Gameplay lifecycle: suppress `**onClap**` whenever instruction phase is not `**ready**` (blocks `**idle**`, `**pending**`, `**playing**`, and `**cooldown**`); calibration `**own**` lifecycle unchanged.

#### Revision 43

- `**drawClapMeter**` fills the bar with `**--accent**` and strokes the threshold in `**--ink**` over a `**--surface**` halo. The canvas reads those tokens with `**getComputedStyle**`, because a canvas context does not accept `**var()**`.
- While the mic is off, a `**MutationObserver**` on `**document.documentElement**` (`**data-theme**` and `**style**`) redraws the idle threshold when the theme changes.

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

#### Revision 43

- Holds a Sherpa session instead of the recognizer and stream. Arming, the RMS gate, and the silence timer stay on the page. `**feed**` sends each chunk. Partial text and `**onAfterDecodeRef**` run when a result comes back, with `**reset**` bound to `**session.reset()**`.

### `src/hooks/useWebcam.js`

#### Revision 11

- Hidden video element kept in viewport so depth processing continues when feed scrolls out of view.
- Added hiddenVideoRef; useEffect creates hidden video (position:fixed, 1×1px, aria-hidden), appends to body; cleanup removes and clears srcObject.
- drawVideoFrame: sync stream from visible to hidden video each frame (handles initial load and device switch).
- drawVideoFrame: use hidden video for drawImage and frame dimensions; keep visible video for scale factor (clientWidth/clientHeight for grid coordinate conversion).

### `src/index.js`

#### Revision 19

- Jotai `Provider` with shared `store`; `subscribePlayerProfilesCrossTab` on mount.

#### Revision 43

- Imports `**themes.css**` before the other stylesheets.
- Calls `**applyStoredTheme()**` before render, so `**data-theme**` is set before the first paint.

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

#### Revision 35

- Pack export manifest includes optional `**elevenLabsVoiceId**` when present on the pack.
- Pack import restores `**elevenLabsVoiceId**` from `**manifest.pack**` into stored pack metadata.

#### Revision 36

- Imports `**migrateAudioPack**` / `**migrateAudioPackFiles**`; `**loadPackFromStorage**` applies migration on every pack read.
- `**savePack**`, `**loadPack**`, `**importPack**`, active/fallback pack loading, and export paths use migrated `**audioFiles**`.

#### Revision 37

- `**exportPack**`: runs `**migrateAudioPack**` / `**migrateAudioPackFiles**` before building the ZIP; skips legacy `**Lvl_***` categories.
- Rewrites exported blob paths to canonical editor folders via `**allocateCanonicalExportPath**`; deduplicates blobs with `**extractedToCanonical**` / `**blobCache**` maps.
- Manifest `**audioFiles**` passed through `**buildOrderedExportManifest**` (empty categories/keys omitted; category order matches editor groups).

#### Revision 42

- Load, save, import, and export run `**migrateAudioPack**`.
- Import warns through `**validateCustomCueName**`, then migration drops invalid Custom keys.
- Export writes `**audioRefAliases**` when that map is non-empty, and omits `**customNames**` when it is empty.

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

#### Revision 36

- Imports `**normalizeAudioRef**`; string refs are aliased before lookup.
- `**Endless.ENDLESS**` fallback target updated to `**Level.BEGINT_1_START**`.

#### Revision 42

- String refs pass through `**canonicalAudioReference**` (`**custom.**` → `**Custom.**`).
- Each pack is read with that pack’s `**audioRefAliases**`, split on the first `**.**`.
- An empty Custom value (`**''**` or `**[]**`) returns null and does not fall through. A missing key still falls through primary pack, then fallback pack, then default `**AUDIO**`.

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

### `src/css/typography.css`

#### Revision 43

- Links use `**var(--accent)**`. Link hover uses `**var(--accent-dark)**`.

### `src/css/score.css`

#### Revision 43

- Rows use surface-soft and ink. A fail is a danger mix. A penalty is `**var(--danger)**` with white text. Bonus points use `**var(--success)**`. Grades use muted, ink, or text-secondary.

### `src/components/Achievements/Achievement.css`

#### Revision 43

- An incomplete icon is `**var(--muted)**`. The progress track is `**var(--line)**`. A completed border, icon, and bar stay `**var(--accent)**`.

### `src/components/Cylinder/CircularCountdown.js`

#### Revision 43

- The track stroke is `**var(--line)**`. The progress stroke is `**var(--accent)**`. The label fill is `**var(--ink)**`.

### `src/components/Playing/CountdownBar.js`

#### Revision 43

- The track is `**var(--line)**`. The fill is `**var(--accent)**` at the right depth and `**var(--muted)**` otherwise.

### `src/components/Timer.jsx`

#### Revision 43

- The timer chip uses surface-soft and ink.

### `src/css/editor.css`

#### Revision 42

- `**.task-bookend**`: block borders and spacing around a fixed row.
- `**.task-bookend-collapsed**`: drops that spacing so the collapsed row stays thin.
- `**.task-bookend-summary**` and `**.task-bookend-summary-number**`: the collapsed row (border `**#bbb**`, background `**#f9f9f9**`).
- `**button.task-bookend-label**`: the expanded **Level Start** / **Level End** heading, used as the collapse control.
- `**.task-middle-empty**`: centered hint between the two bookends, color `**#666**`.

#### Revision 43

- Bookend borders, the collapsed summary, and the empty-middle hint use line, surface-soft, and muted (the Revision 42 `**#666**` bookend text is `**var(--muted)**`).
- Merged the v22 task-card rules: `**.task-editor-card**`, `**.task-editor-header**`, `**.task-editor-fields**`, `**.task-audio-selector**`, `**.task-audio-preview**`, `**.task-help-notes**`, and `**button.task-delete-button**`. The delete button keeps a fixed size so the shell's button min-height does not stretch it, and its tint is `**var(--danger)**`.
- `**.control-compact**` is the one compact editor control: `**min-height: 36px**`, `**padding: 0 10px**`, `**8px**` radius, no shadow, `**1.1rem**`, and `**text-transform: none**`. Hover and focus do not lift. It does not restyle `**.number-control-btn**` or `**.task-delete-button**`. Play and Save stay on the shell's `**4.2rem**` uppercase buttons.
- `**button.task-bookend-summary**` uses that size, stays left-aligned, and its radius is `**14px**` (the task-card radius) instead of `**4px**`.
- Task cards sit in `**.task-editor-row**` with a `**7.2rem**` left gutter. `**.task-editor-rail**` holds Copy and move, each `**6.4rem**` wide so Copy is not clipped.
- `**button.task-delete-button**` is `**36px**`, `**padding: 0 0 0.12em 0.06em**`, so the × sits on the optical center (same hyphen offset idea as the number-control minus).
- Type and Voice Category selects (`**.task-type-select**`, `**.task-voice-category-select**`) use `**width: max-content**` and `**padding-right: 2.5rem**` so names clear the custom dropdown arrow. Voice Line selects use `**padding-right: 3.5rem**`. The type select border is `**var(--accent-border)**`.
- Task-card fill and hairline mix `**var(--accent-soft)**` / `**var(--accent-border)**` with surface and line.
- `**.task-add-bar**` is two `**max-content**` columns, `**column-gap: 4rem**`, `**padding-left: 1.6rem**`, `**margin-top: 1.2rem**` under the Tasks heading. The right column has a `**1px**` `**var(--line)**` divider. Group labels are muted `**1.1rem**`.
- `**.level-editor .number-control-container**` is compact for the whole editor (metadata, capture settings, task fields, Endless events): `**32px**` sides and height, `**width: max-content**`, middle column `**4.8rem**` (not `**1fr**` / `**auto**`). `**.level-editor .number-control.margin-x**` zeros the wrapper’s `**1rem**` side margins. Calibrate / Audio / Buttplug keep the shell `**4.2rem**` grid.
- Up/Down `**.task-tempo-select**`: `**32px**` height, `**margin-top: 4px**`, `**padding-right: 2.5rem**`, `**width: max-content**`, matching the number steppers beside it. `**.task-tempo-field**` does not shrink below `**max-content**`.
- Rest `**.task-rest-balls**` pads to the number-control label line; the checkbox label is a centered `**32px**` row. Speak `**.task-speak-fuzzy-label**` is the same checkbox/text alignment (`**align-items: center**`, checkbox `**margin: 0**`).
- Session summary: `**.summary-voice-list**` `**max-width: min(100%, 70rem)**` centered. `**.task-audio-selector.is-summary**` is a three-column grid (**`max-content` / `minmax(0, 27rem)` / `auto`**) with `**justify-content: center**`. Preview is a fixed `**12rem**`. The Summary/Custom toggle is `**8.4rem**`. Actions wrap under the cue at a `**32rem**` container query.

### `src/components/Instructions/Instructions.js`

#### Revision 41

- Balls bonus copy: earn points after **1 second** on the balls (was 3).

#### Revision 43

- The page title is `**<h2 className="tab-title">**` “Getting Started”. Section headings stay as they were.

### `src/components/Buttplug/ButtplugComponent.js`

#### Revision 43

- The page title is `**<h2 className="tab-title">**` “Buttplug Integration”.

### `public/index.html`

#### Revision 43

- `**<title>**` is `**Trainer**`.

### `src/atoms/buttplugAtom.js`

#### Revision 41

- Added `**preserveVibrationAtom**` (default `**false**`): when set, unmount/idle stops that would zero vibration are skipped so a fast transition can carry intensity into the next task.

### `src/hooks/useButtplug.js`

#### Revision 41

- Added exported `**stopVibrationUnlessPreserved(stopFn)**`: no-ops while `**preserveVibrationAtom**` is set; used for unmount/idle stops (intentional stops still call `**stopVibration**` directly).
- Unmount cleanup now calls `**stopVibrationUnlessPreserved(stopVibration)**`.

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

#### Revision 38

- Upload, play, and delete handlers refactored to use `**appendAudioFile**`, `**playPackAudioFile**`, and `**removeAudioFileFromPack**` from `**packAudioFileUtils**`.

#### Revision 42

- `**dynamicCues**`, `**onAddCue**`, `**onRenameCue**`, and `**onDeleteCue**`.
- A custom cue row shows the cue name. There is no display-name field.
- **Add cue** submits **New cue key**. A rejected name stays in the field and shows the error returned by `**onAddCue**`.
- Deleting the last file of a dynamic cue stores `**''**` so the row stays until **Delete cue**.
- Each voice line starts collapsed. `**openFileSections**` records which keys are open. The line title is `**.audio-line-toggle**` (`**aria-expanded**`, `**aria-controls**`): the key name, then **▶** when collapsed and **▼** when open.
- The open panel is `**.audio-files-panel**`: the uploader, the file list (or "No files uploaded"), and, for a custom cue, the **Rename key** field (`**aria-label**` `**Cue key for ${key}**`) and **Delete cue**. Category headings stay their own collapse.

#### Revision 43

- The category border, empty copy, and row background use line, muted, and surface-soft. Rename and add errors use danger.
- Each uploaded file is `**.audio-file-row**`. Play and Delete sit in `**.control-compact**` and no longer set inline padding and font size.

### `src/components/AudioPackEditor/AudioFileUploader.jsx`

#### Revision 1 — Created

- Reusable file upload component with drag-and-drop support, file size validation (10MB max), format validation (MP3/WAV only), automatic duplicate filename renaming, and IndexedDB quota checking.

#### Revision 5

- Added subcategory prop to component signature for unique file input IDs per subcategory.
- Updated file input ID to include both category and subcategory.

#### Revision 35

- Replaces inline unique-path logic with shared `**generateUniqueAudioPath**` from `**src/utils/audioPackPathUtils.js**` (letter-suffix deduplication unchanged).

#### Revision 43

- The upload track is `**var(--line)**`. The progress fill is `**var(--success)**`.

### `src/components/AudioPackEditor/AudioPackEditor.css`

#### Revision 1 — Created

- Styling for audio pack editor components to ensure consistent look and feel with the rest of the application.

#### Revision 5

- Added styling for category group headings with larger font size, bold weight, and bottom border separator.
- Added spacing between category groups.

#### Revision 35

- `**.editor-subtabs**` / `**.editor-subtab-panel**`: Categories | Generate Lines tab bar and bordered content panel below pack metadata.
- `**.generate-lines-***`: banners, API config grid, category/subcategory dropdowns, multi-variant rows, per-variant status colours, batch toolbar, and summary text.
- `**.voice-setting-slider**`, `**.voice-setting-slider-group**`, `**.voice-setting-warning**`: compact range-slider rows and reserved-slot instability warnings.

#### Revision 38

- Variant row layout: two-column grid (**label | body**) with stacked input and action groups below the text field.
- Added `**.generate-lines-variant-body**`, `**.generate-lines-variant-action-groups**`, `**.generate-lines-action-group**`, and `**.generate-lines-action-group--audio**` styles for visual Line/Audio separation.
- Variant number label sizing and alignment updated (`**font-size**`, `**text-align**`).

#### Revision 40

- Added `**.generate-lines-autosave**`, `**.generate-lines-autosave-status**`, `**.generate-lines-autosave-warning**`, and `**.generate-lines-autosave-hint**` for checkbox layout and autosave feedback.

#### Revision 42

- `**.audio-line-toggle**`: full-width title button for a voice line (no border or fill, bold, space-between so the marker sits on the right).
- `**.audio-files-panel**`: `**margin-top: 4px**` under that title when the line is open.

#### Revision 43

- Panels, rows, and hints use surface, surface-soft, line, ink, and muted.
- Info banners use accent-soft and accent-dark. Warnings and errors use danger. A finished generate uses `**var(--success)**`.
- Dropped the `**20px**` padding on `**.audio-pack-editor**`. The content panel already pads with `**clamp(1.8rem, 4vw, 4rem)**`. `**max-width: 1200px**` stays. `**.editor-subtab-panel**` still has its own `**20px**` padding.
- `**.audio-file-row**` lays out the filename and the Play/Delete group on one flex row.

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

#### Revision 35

- Imports `**GenerateLines**`, `**voiceIdAtom**`, `**getProcessedCategoryGroups**`; `**activeSubtab**` state (`**'categories'**` | `**'generate'**`).
- Categories view and **Generate Lines** subtab share `**getProcessedCategoryGroups**` for grouped category headings (Baseline, Session Start, Task Assignment, etc.).
- `**handleSave**`: merges `**elevenLabsVoiceId**` from `**voiceIdAtom**` into the saved pack; sets `**isEditing(true)**` after save so generation can proceed.
- Displays saved **ElevenLabs Voice ID** beneath pack fields when `**pack.elevenLabsVoiceId**` is set.

#### Revision 38

- **Load Existing Pack** `<select>` is now controlled via `**selectedPackId**`, derived from `**isEditing**` and whether `**pack.id**` appears in `**existingPacks**`.
- Dropdown displays the loaded/saved/imported pack name when editing; shows **"Select a pack..."** for a new unsaved pack.
- Placeholder option is `**disabled**` while a pack is loaded to avoid clearing the selection accidentally.

#### Revision 40

- Extracted `**buildPackToSave**` and `**persistPack**` from `**handleSave**`; manual save still shows the success alert, autosave uses `**{ silent: true }**`.
- Added `**packRef**` synced with pack state; `**handleUpdateAudioFiles**` updates the ref synchronously so autosave sees freshly committed `**audioFiles**` before React re-renders.
- New `**handleAutosavePack**` callback passed to `**GenerateLines**` as `**onAutosavePack**`.

#### Revision 42

- New packs no longer start with `**customNames**`.
- The Custom category lists `**listCustomCueKeys(pack)**` and wires `**addCustomCue**`, `**renameCustomCue**`, and `**deleteCustomCue**`.
- On mount, `**initialEditorState**` loads the Content Library’s active pack (`**activePackIdAtom**`, then `**audioManager.getActivePackId()**`). The built-in default pack still opens a blank new pack. **New Pack** still clears the editor.

#### Revision 43

- Import error and warning banners use a danger mix on surface, with danger text.
- The page title is `**<h2 className="tab-title">**` “Voice Pack Editor”.

### `src/components/ContentLibrary/AudioPackCard.jsx`

#### Revision 1 — Created

- Reusable card component for displaying audio pack information including metadata, active status indicator, and action buttons.

#### Revision 43

- Delete is `**.button.button-warning**` instead of a hardcoded red fill.

### `src/components/ContentLibrary/ContentLibrary.css`

#### Revision 1 — Created

- Styling for content library components including grid layout for pack cards and modal dialog styling.

#### Revision 43

- Pack cards use surface, ink, and line. The active card and badge use success. Dialogs use surface and ink. Metadata is muted.
- Dropped the `**20px**` padding on `**.content-library**`. The content panel already pads with `**clamp(1.8rem, 4vw, 4rem)**`. `**max-width: 1200px**` stays.

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

#### Revision 43

- The page title is `**<h2 className="tab-title">**` “Content Library”. “Voice Packs” stays a section heading.

### `src/components/ContentLibrary/ImportDialog.jsx`

#### Revision 1 — Created

- Modal dialog component for importing audio packs from ZIP files with conflict resolution (overwrite, rename, or cancel), progress indication, and error/warning display.

#### Revision 43

- Error and warning banners use a danger mix on surface.

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

#### Revision 41

- `**pickDirectory**` accepts a path string or `**{ defaultPath, title }**` and forwards it to `**showDirectoryPicker**`.

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

#### Revision 39

- Documents `**--level-list**`; updates mutual-exclusion / requirement notes for `**--level**`, `**--calibrate-only**`, `**--auto-start**`, `**--validate-level**`, `**--enable-captures**`; valid/invalid combinations, exit code **5** note, and a usage example.

### `src/atoms/calibrationProfileAtom.js`

#### Revision 4 — Created

- Jotai atom storing currently active calibration profile ID for quick switching between calibration presets.

### `src/atoms/externalModeAtom.js`

#### Revision 4 — Created

- Jotai atom storing CLI configuration and external mode state for reactive state management throughout the application.

### `src/components/Calibration/CalibrationExport.jsx`

#### Revision 4 — Created

- Component providing export button to save current calibration to JSON file via IPC, with success/error feedback and fallback to browser download in non-Electron environments.

#### Revision 43

- Export on the Grids tab. Replaced by `**SetupFileMenu.jsx**`.

### `src/components/Calibration/CalibrationImport.jsx`

#### Revision 4 — Created

- Component providing import button to load calibration from JSON file with file picker, validation feedback, and error handling for invalid calibration data.

#### Revision 25

- `await calibrationService.importCalibration(...)` for async validation, device resolution, and apply.

#### Revision 43

- Import on the Grids tab. Replaced by `**SetupFileMenu.jsx**`.

### `src/components/ExternalMode/CalibrationTimer.jsx`

#### Revision 4 — Created

- Component displaying calibration countdown timer in HH:MM:SS format at top of screen, updating every second and triggering application exit with code 2 when timer reaches 0.

### `src/components/ExternalMode/HeadlessWrapper.jsx`

#### Revision 4 — Created

- Wrapper component for headless mode that conditionally renders children without navigation, used to hide UI elements when headless mode is active.

### `src/components/ExternalMode/PauseTimer.jsx`

#### Revision 4 — Created

- Component displaying pause time remaining in MM:SS format during paused gameplay, only counting down when level is paused and triggering application exit with code 3 on timeout.

#### Revision 43

- The banner background is a danger mix. The text stays white.

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

#### Revision 43

- Same header and `**nav-button**` classes. The eyebrow is "Practice Makes Perfect". Calibrate-only Done is `**nav-button nav-button-play**`. There is no More row.
- The row is Help, Grids, Audio, Buttplug, Content Library, Themes, and Play. Themes uses the Feather `**Droplet**` icon at `**size={18}**` and routes to `**NAV.THEMES**`, in the slot Levels uses on the full bar. Calibrate-only keeps that row and swaps Play for Done. Content Library uses the Feather `**Folder**` icon at `**size={18}**` and routes to `**NAV.CONTENT_LIBRARY**`. Themes and Content Library follow the same `**disableNavigation**` rule as the other tabs.
- While `**playState**` is not `**PLAYING**`, `**SetupFileMenu**` sits in `**.utility-navigation.is-collapsed.utility-navigation--limited**` / `**.utility-tools**` under the header. `**padding-right: 1.3rem**` matches the inset **More** gets from `**.utility-toggle**` (`**0.4rem**` row padding plus `**0.9rem**` button padding), so Setup sits under Play instead of on the shell edge. There is no More toggle. Calibrate-only keeps Setup up, since that mode does not enter `**PLAYING**`.
- The calibration button uses the same Feather `**Grid**` icon at `**size={18}**`. The label stays **Grids**.

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

#### Revision 43

- The v2.0 snapshot can include camera (rotation, viewport height cap, device id), grids (grids, depth percentages, balls depth, hysteresis), audio (clap sensitivity, sfx/voice/music volumes, both fade flags and durations, microphone id), voice pack id, background track id (or `**null**` for none), theme, and misc (mirror, depth-diagram invert). `**version**` and the timestamp are always written.
- A sections argument copies only the checked groups. `**grids**`, `**depthPercentages**`, and `**hysteresis**` are optional, so a partial file still imports.
- A preset theme exports only its id. A saved theme exports `**themeId: 'custom'**` plus that theme’s four colors. Importing a preset selects it. Imported custom colors update the active saved theme, or create one named Custom when none is active. The saved-theme list is not exported.
- Unknown voice-pack ids (other than `**default**`) and unknown track ids are dropped on this machine. `**null**` background track is kept.
- `**musicFadeInDuration**` and `**musicFadeOutDuration**` must be integers from **1** to **30**.

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

#### Revision 43

- "Grid added" is `**var(--success)**`. A bad name is `**var(--danger)**`.
- The Grid Name row uses `**alignItems: 'center'**`, so the Balls region checkbox lines up with the name label and field.

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

#### Revision 41

- `**BALLS_BONUS_INTERVAL_SEC**` and `**BALLS_BONUS_PER_INTERVAL**` (and unused `**BALLS_BONUS_INITIAL_POINTS**`) set from **3** to **1**.

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

#### Revision 43

- Dropped the inline `**28px**` / `**10px**` size and the `**margin-x-sm**` / `**padding-x**` classes. The button uses the shell size. The label and video icon are unchanged.

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

#### Revision 43

- Added `**compact**` (default `**true**`). The depth diagram keeps the `**28px**` button. The camera card passes `**compact={false}**` so that copy uses the shell size.

### `src/components/Playing/GraceStatusBar.js`

#### Revision 11 — Created

- Endless grace bar UI: standard vs temporary grace, penalty-at-surface state; 32px height, 450px max width; temporary grace color #7c3aed.

#### Revision 43

- The empty track is `**var(--line)**`, or `**var(--danger)**` when a penalty is active. Standard grace is `**var(--success)**`. Temporary grace is `**var(--accent)**`.

### `src/components/Playing/RestBallsBonus.js`

#### Revision 13 — Created

- Rest task balls bonus component: score feed, time limit, balls bonus accumulation when balls covered and at surface; SFX TICK/TOCK on balls transition.

#### Revision 15

- ballsCovered from ballsCoveredAtom instead of inline combinedBallsPercent < ballsDepthPercent.

#### Revision 33

- `**useButtplug**` (`**setVibrateSpeed**`, `**stopVibration**`); `**earningBallsBonus**` drives `**setVibrateSpeed(0.1)**` vs `**stopVibration**` when not earning; second `**useEffect**` cleanup `**stopVibration**` on unmount.

#### Revision 34

- `**useTaskCountdownLeft**` alignment + `**onSignalCaptureWindow**` for Rest windows while balls bonus overlays run.

#### Revision 41

- Unmount cleanup wraps `**stopVibration**` with `**stopVibrationUnlessPreserved**` (the balls-bonus idle stop is unchanged).

### `src/components/ContentLibrary/MusicTrackCard.jsx`

#### Revision 15 — Created

- Card component for background track display and actions.

#### Revision 43

- Delete uses the same `**.button.button-warning**` class.

### `src/components/ContentLibrary/MusicTrackImportDialog.jsx`

#### Revision 15 — Created

- Modal for importing a single music track file.

#### Revision 43

- The error line is `**var(--danger)**`.

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

#### Revision 43

- Deleted with the device-button row. The audio source select uses the shell select styles.

### `src/components/Mic/MicInputDevicePicker.js`

#### Revision 16 — Created

- enumerateDevices audioinput; System default + per-device buttons; u-audio-input-selected utility styling.

#### Revision 17

- Root wrapper adds `mic-audio-section` so it participates in Audio tab vertical spacing between h3-led blocks.

#### Revision 18

- isDefaultLabeledAudioInput (/^Default\b/i) and sortAudioInputsWithDefaultFirst; removed separate "System default" button; useMemo sorted list; useEffect normalizes null atom to default-labeled device id when devices load; selection via selectedId === device.deviceId.

#### Revision 43

- The device list is a labeled `**#audio-device**` select in `**.audio-source**`, the same row as the camera source. The label reads “Audio Source:”.
- `**Default microphone**` writes `**null**` (system default, no exact deviceId). Listed devices still put default-labeled inputs first.
- A stored `**null**` is no longer rewritten to the default-labeled device id.
- The permission prompt when labels are empty, and the `**devicechange**` refresh, are unchanged.

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

#### Revision 43

- Proxy over `**sherpaPreloadWorker.js**`. `**preloadSherpaOnnx**` and `**getSherpaOnnxReadyPromise**` still resolve when the model is ready (`**{ ready: true }**`). `**isSherpaOnnxReady**` is that flag.
- `**acquireOnlineStream**` returns a session: `**feed**` (transfers a `**Float32Array**` copy), `**reset**`, `**setResultHandler**`, and `**release**`. `**releaseOnlineStream**` calls `**release**`. Results whose `**streamId**` is no longer current are ignored.

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

#### Revision 43

- The comment now says each block starts with an `**h5**`. The spacing rule is unchanged.

### `src/components/LevelEditor/SummaryAudioEditor.jsx`

#### Revision 18 — Created

- Four summary rows with `AudioSelector` (`allowedOptions` from `buildSummaryAudioRowOptions`), per-row Show Custom Voice Lines, help copy for None vs explicit soft Rank lines.

#### Revision 43

- The helper line is `**var(--muted)**`.
- Each rank has a Type control: **Summary** / **Custom** (`**.summary-voice-mode-toggle**`), not a Show Custom Voice Lines checkbox. Toggling calls `**getSummaryModeDefaultCue**` (default Rank line, or the first custom cue / None). Preview is `**12rem**`. Rows stay centered in the summary grid.

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

#### Revision 42

- **Export Profile** and **Import Profile** sit in their own section above the **Active Profile** card, with no grey card fill. The buttons are centered on that card. Both are disabled while playing or on the level summary screen.
- Export downloads the active profile. Import reads a JSON file up to 10 MB, shows name, play time, and unlocked achievement count, and writes only after confirm.
- If the file’s `**id**` already exists, the choices are **Overwrite that profile** and **Import as a new id** (new UUID). The imported profile becomes the active profile.
- Helper copy: the file is stats, achievements, and profile flags. Levels, voice packs, and calibration stay on their own exporters.
- Status lines in that section, including **Profile export downloaded.**, clear after 4 seconds. A newer message replaces the timer.

#### Revision 43

- Helper copy under Track Stats, Bypass Level Requirements, Allow Webcam Captures, and Allow Hidden Capture Notifications uses `**marginTop: '0.6rem'**` instead of `**-1.5rem**`.
- Those four rows add `**profile-option-row**`.

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

#### Revision 43

- Same size cleanup. `**button-primary**` still applies when rotation is not `**0**`.

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

#### Revision 43

- The play/pause strip uses `**.play-controls**`, `**PlayTime**`, and `**.nav-button.nav-pause-button**`.

### `src/constants/appMeta.js`

#### Revision 31 — Created

- `**APP_DISPLAY_TITLE**`: single source for the in-app display name (navigation + auto-start chrome).

### `src/hooks/usePlayPauseHandler.js`

#### Revision 31 — Created

- Shared play/pause + `**ensureGameplayMicBeforeResume**` path for `**NavigationMain**`, `**LimitedNavigation**`, and `**AutoStartCameraChrome**`.

#### Revision 41

- Clears `**preserveVibrationAtom**` on every play/pause so a pause always wins and vibration actually zeroes.

### `src/constants/customVoiceCategories.js`

#### Revision 32 — Created

- `**CUSTOM_VOICE_CATEGORY_COUNT**` (**40**) and `**CUSTOM_VOICE_SLOT_KEYS`** (**Custom1** … **Custom40**); consumed by `**audioManager`**, `**taskAudioConfig**`, `**AudioSelector**`, `**AudioPackEditor**`.

#### Revision 42

- Comment only: `**CUSTOM_VOICE_SLOT_KEYS**` is the legacy Custom1–Custom40 list, not an allowlist. Packs may store any valid cue key, and those forty names stay valid.

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

#### Revision 43

- Inactive, standby, and active glyphs are muted, ink, and danger. The chip background is a translucent surface.

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

#### Revision 35

- Capture-window rolls are throttled to once every **3000** ms (`**lastRollAtRef**`), up from **1000** ms.

#### Revision 40

- Removed `**TASK_TYPES_NO_PHOTO**` (**UPANDDOWN**) and `**TASK_TYPES_NO_VIDEO**` (**HITDEPTH**); standby/inactive HUD icons follow task `**allowPhotos**` / `**allowVideos**` only.

### `src/hooks/useTaskCountdownLeft.js`

#### Revision 34 — Created

- Shared countdown hook + `**getTaskTimerDuration**` so capture windows derive from canonical timer math.

### `src/services/captureService.js`

#### Revision 34 — Created

- Electron packaging guard, `**getLevelCaptureChannelAvailability**` (excludes `**TASK_TYPES_NO_VIDEO**` / `**TASK_TYPES_NO_PHOTO**`), `**runCapturesPreflight**`, `**runHiddenNotificationsPreflight**`, `**getResolvedCaptureOutputDir**`, `**playCaptureSfx**`, `**formatCaptureName**`.
- `**savePhoto**` / `**saveVideo**`: main thread grabs frames; encoding in `**captureWorker.js**` (new worker per capture, `**terminateCaptureWorker**` in `**finally**`); `**waitForWorkerMessage**` + `**worker.onerror**` handling.
- Video: `**waitForNextFrame**` (`**performance.now**`, 30 fps); `**videoDuplicateFrame**` when `**createImageBitmap**` exceeds backlog threshold; IPC persists buffers to disk.

#### Revision 40

- `**playCaptureSfx**` writes `**captureSfxAtom**` instead of `**sfxAtom**`.
- `**getLevelCaptureChannelAvailability**`: dropped task-type exclusions for Hit and Up-and-Down; `**photoPossible**` / `**videoPossible**` depend on per-task flags only.

### `src/workers/captureWorker.js`

#### Revision 34 — Created

- Off-thread Mediabunny MP4 (`**CanvasSource**`, `**Mp4OutputFormat**`, `**BufferTarget**`) and JPEG (`**OffscreenCanvas.convertToBlob**`) encoding; `**ImageBitmap**` transfer from main thread with rotation applied on draw.
- `**disposeVideoSession**` (`**videoSource.close()**`, zero canvas dimensions) after finalize, `**abort**`, or uncaught error.
- Protocol: `**videoStart**`, `**videoFrame**`, `**videoDuplicateFrame**`, `**videoFinalize**`, `**photoEncode**`, `**abort**` → `**videoReady**`, `**videoFrameAck**`, `**videoResult**`, `**photoResult**`, `**error**`.

### `src/utils/captureWebcamRef.js`

#### Revision 34 — Created

- Mutable ref registry + `**setCaptureRefs**` / `**clearCaptureRefs**` / `**getCaptureRefs**` accessors for `**useCaptureManager**`.

### `src/atoms/elevenlabsAtom.js`

#### Revision 35 — Created

- `**apiKeyAtom**` / `**voiceIdAtom**`: `**atomWithStorage**` (`**elevenlabs_api_key**`, `**elevenlabs_voice_id**`).
- Session atoms `**speedAtom**` (`**0.9**`, range **0.7–1.2**), `**stabilityAtom**`, `**similarityAtom**`, `**styleAtom**`.
- *Ported from v19* `**moddingAtom.js**` ElevenLabs fields (`**apiKeyAtom**`, `**voiceIdAtom**`, `**speedAtom**`, `**stabilityAtom**`, `**similarityAtom**`); split into a dedicated module; `**styleAtom**` added; speed stored as API-scale float (v19 used **70–120** divided by 100 at request time).

#### Revision 40

- Added `**autosaveOnGenerateAtom**` (`**atomWithStorage**`, key `**elevenlabs_autosave_on_generate**`, default `**false**`) alongside existing ElevenLabs generator preferences.

### `src/components/AudioPackEditor/GenerateLines.jsx`

#### Revision 35 — Created

- Main **Generate Lines (ElevenLabs)** UI: API Key / Voice ID fields, voice-setting sliders, grouped category + subcategory `**<select>**`s, per-cue variant list (add / remove / per-variant generate), category-scoped and subcategory-scoped batch generate, cancel, retry-failed, and auto-commit via `**storeGeneratedAudio**` + `**onUpdateAudioFiles**`.
- Variant state keyed as `**category.key**` with job IDs `**category.key#variantId**`; only non-empty variant text is queued.
- *Adapted from v19* `**VoicePackGenerator.js**`, `**AudioGeneration.js**`, and `**AudioKeyGenerator.js**` — reimplemented for the v18r35 Audio Pack Editor workflow (IndexedDB pack storage, subtabs, multi-variant batching, no in-memory blob pack).

#### Revision 38

- Variants store `**customContentUrl**` after successful generation; single and batch paths update it on commit.
- `**commitBlob**`: accepts optional `**previousCustomContentUrl**`; removes the old pack entry before appending when regenerating.
- Batch jobs carry `**previousCustomContentUrl**` so parallel saves replace the correct variant file.
- `**handleDeleteGeneratedAudio**`: removes the variant's file from `**pack.audioFiles**` and clears `**customContentUrl**` (status → idle).
- Variant row UI split into **Line** (status, Generate, Remove line) and **Audio** (Play, Delete audio) action groups; Audio group shown only when a file exists.
- `**lineStateHasContent**`, `**buildClearedLineState**`: helpers to detect non-default generator state and rebuild a cleared state for the current category.
- `**handleClearAllLines**`: confirmation dialog, cancels any in-flight batch, clears all categories' line state; pack `**audioFiles**` are untouched.
- Batch toolbar: **Clear all lines** button (`**button-danger-outline**`), disabled while generating or when there is nothing to clear.

#### Revision 40

- **Autosave on generate** checkbox in the batch toolbar, bound to `**autosaveOnGenerateAtom**`; disabled when no pack is loaded/saved (`**!isEditing**`).
- `**maybeAutosaveAfterRound**`: triggers `**onAutosavePack**` after batch `**onComplete**` and after successful single-line generate; skips cancelled batches and zero-success rounds.
- Inline status: **Pack saved** on success; **Pack name required for autosave** when the checkbox is on but metadata has no pack name; hint below toolbar when name is missing.

#### Revision 42

- Custom subcategory options come from `**getGeneratableKeys(category, pack)**`. Each option’s text is the cue key.
- An empty Custom category shows: "This pack has no custom cues yet. Add a cue in the Categories tab, then generate it here."
- The variant heading is `**${selectedCategory}.${selectedKey}**`. `**customNames**` is no longer a prop.

### `src/components/AudioPackEditor/VoiceSettingSlider.jsx`

#### Revision 35 — Created

- Reusable labelled range slider with optional `**formatValue**` (Speed shows **0.70–1.20** scale; percentage sliders show `**N%**`).
- Slider row layout follows `**VolumeControl.jsx**` (v18r35); replaces v19 `**NumberControl**` for voice parameters in this editor.

### `src/components/AudioPackEditor/audioHelper.js`

#### Revision 35 — Created

- `**AUDIO_HELPER**`: per-category / per-key `**description**` and `**defaultText**` metadata for v18r35 `**AUDIO**` keys (Calibration, Feedback, Hold, Level, Custom1–40, Hit.`**ONE**`, etc.).
- *Adapted from v19* `**components/AudioGenerator/audioHelper.js**` — category/key tables rewritten for v18r35 voice taxonomy; not used to pre-fill variant text (variants start blank).

#### Revision 36

- `**AUDIO_HELPER**` metadata moved/renamed to match consolidated `**Level**`, `**Rank**`, and `**Release**` keys (including `**BEGINT_1_***`, `**COCKW_4_***`, etc.).

#### Revision 37

- `**AUDIO_HELPER.Warmup**`: added `**HOLD_THREE**` and `**HOLD_FOUR**` metadata (description and default text) alongside existing warmup hit keys.

#### Revision 42

- `**AUDIO_HELPER.Custom**` keeps only `**desc**`: "User-defined cues. The cue name is what levels store. Older Custom1–Custom40 lines still work." The Custom1–Custom40 slot entries are removed.

#### Revision 43

- `**ONE_THREE_MEDIUM**` and `**ONE_FOUR_MEDIUM**` descriptions renamed to `**ONE_THREE_MED**` and `**ONE_FOUR_MED**`.

### `src/constants/audioCategoryGroups.js`

#### Revision 35 — Created

- `**CATEGORY_GROUPS**` headings (Baseline, Session Start, Task Assignment, Performance, Session End, Session Summary, Custom) and `**getProcessedCategoryGroups**` filtered against live `**AUDIO**` keys.
- Shared by **Categories** subtab and **Generate Lines** dropdowns.
- *New in v18r35* — v19 `**VoicePackGenerator**` used a flat category list without grouped headings.

#### Revision 36

- `**CATEGORY_GROUPS**`: Session Start is `**Level**` only (removed `**Lvl_begint**`, `**Lvl_quickbg**`, `**Lvl_basicr**`, `**Lvl_cockw**`); level-specific summary and release keys live under Session Summary (`**Rank**`) and Session End (`**Release**`) respectively.

### `src/hooks/useBatchGeneration.js`

#### Revision 35 — Created

- Concurrent batch runner over ElevenLabs jobs with `**cancelBatch**`, `**isRunning**`, `**summary**`, and per-job `**onJobStart**` / `**onJobSuccess**` / `**onJobError**` / `**onComplete**` callbacks.
- *New in v18r35* — v19 generated audio one cue at a time inside `**AudioGeneration**` without a shared concurrency hook.

#### Revision 37

- `**runJob**`: `**onJobSuccess**` is `**await**`ed inside an async `**.then**`; `**succeeded**` increments only after commit completes.
- Save errors thrown from `**onJobSuccess**` are caught, counted in `**failed**`, and forwarded to `**onJobError**` (TTS failures still use the outer `**.catch**`).

### `src/services/elevenlabsService.js`

#### Revision 35 — Created

- `**generateSpeech(text, settings)**`: POST `**/v1/text-to-speech/{voiceId}**` with `**eleven_multilingual_v2**`, `**mp3_44100_128**`, and `**voice_settings**` (`**stability**`, `**similarity_boost**`, `**speed**`, `**style**`).
- `**ELEVENLABS_CONCURRENCY**`: `**3**`.
- *Ported from v19* `**AudioGeneration.js**` inline `**fetch**` body and error handling; extracted to a service; adds `**style**`; speed sent directly (not `**/100**`).

### `src/utils/audioPackPathUtils.js`

#### Revision 35 — Created

- `**generateUniqueAudioPath**`: **`a`–`**z**` then timestamp suffix deduplication via `**audioFileService.checkFileExists**`.
- `**storeGeneratedAudio**`: writes blob to IndexedDB and returns `**customContentUrl**` + `**filePath**`.
- Logic extracted from former inline path handling in `**AudioFileUploader.jsx**`; also used by `**GenerateLines**` auto-commit.

#### Revision 37

- `**withStoreLock**` / `**storeLocks**`: promise-chain mutex keyed by `**packId:category:key**`.
- `**storeGeneratedAudio**`: wraps `**generateUniqueAudioPath**` + `**storeAudioFile**` inside the lock so parallel variant saves cannot race on `**checkFileExists**`.

### `src/utils/generatableAudioKeys.js`

#### Revision 35 — Created

- `**getGeneratableCategories**`: all `**AUDIO**` categories except `**NONE**` / `**Sfx**`, plus `**Custom**`.
- `**getGeneratableKeys**`: subcategory keys per category (includes `**CUSTOM_VOICE_SLOT_KEYS**`, empty-string paths such as `**Hit.ONE**`).
- `**makeLineId**`: `**category.key**` event id helper.
- *Concept from v19* `**VoicePackGenerator**` category/key filtering; new utility module for Generate Lines and batch scoping.

#### Revision 42

- `**getGeneratableKeys('Custom', pack)**` returns `**listCustomCueKeys(pack)**`.

### `src/components/Playing/HoldProgressBar.js`

#### Revision 36 — Created

- Hold-task progress bar shell (track, fill, seconds label) matching `**CountdownBar**` styling; exposes fill and label DOM nodes through `**barRef**` for imperative updates by `**useHoldProgress**`.

#### Revision 43

- The shell uses the same track and idle fill as the countdown bar.

### `src/constants/audioRefAliases.js`

#### Revision 36 — Created

- `**AUDIO_REF_ALIASES**`: maps legacy `**Lvl_*.***`, prior interim refs (e.g. `**Level.BEGINT_START**`, `**Rank.COCKW_END_PERFECT**`, `**Release.COCKW_PRE_RELEASE_1**`) to canonical keys.
- `**normalizeAudioRef(ref)**`: single entry point for runtime ref normalization.

#### Revision 42

- `**normalizeAudioRef(ref, packAliases)**` walks `**packAliases**` with a cycle guard, then the static `**AUDIO_REF_ALIASES**` map.

#### Revision 43

- `**UpDown.ONE_THREE_MEDIUM**` → `**UpDown.ONE_THREE_MED**`, `**UpDown.ONE_FOUR_MEDIUM**` → `**UpDown.ONE_FOUR_MED**`.

### `src/hooks/useHoldProgress.js`

#### Revision 36 — Created

- `**useHoldProgress(holdState, taskTime, taskId)**`: visual-only hold progress hook; mirrors hold-state accumulation rates (`**CORRECT_DEPTH**` 1×, `**DEEP_ONE**` 0.25×, `**SHALLOW_ONE**` reverse) in refs.
- Continuous `**requestAnimationFrame**` loop per `**taskId**` reads `**holdStateRef**` and updates bar DOM via `**applyBarToDom**`; resets on task change or `**NOT_STARTED**`.

#### Revision 43

- The live fill written onto that bar is `**var(--accent)**` at the right depth and `**var(--muted)**` otherwise.

### `src/utils/audioPackMigration.js`

#### Revision 36 — Created

- `**migrateAudioPackFiles**`: converts legacy `**Lvl_***` pack categories and renames `**Level**` / `**Rank**` / `**Release**` keys to current names (idempotent).
- `**migrateAudioPack**`: wraps full pack migration for `**audioManager**` load/save/import.

#### Revision 37

- Exported `**LEGACY_LVL_CATEGORIES**` and `**isLegacyCategory(category)**` for export-time filtering of pre-R36 categories.

#### Revision 42

- `**migrateAudioPack**` stamps `**customCueSchema: 'open'**`.
- `**remapDisplayNamesToCueKeys**`: a non-empty `**customNames['Custom.<oldKey>']**` becomes the cue key. `**Custom.CUSTOM1**` labeled `**PhaseTwo**` is stored as key `**PhaseTwo**`, with alias `**Custom.CUSTOM1**` → `**Custom.PhaseTwo**`. Empty, invalid, or colliding labels leave the original key in place. A label with no file becomes an empty-string placeholder. `**Custom.***` entries are then removed from `**customNames**`. An empty alias map is omitted. Level JSON is not rewritten.

#### Revision 43

- Pack key remap includes `**ONE_THREE_MEDIUM**` → `**ONE_THREE_MED**` and `**ONE_FOUR_MEDIUM**` → `**ONE_FOUR_MED**`.

### `src/utils/audioPackExportUtils.js`

#### Revision 37 — Created

- `**isLegacyExportPath**`, `**extractBasenameFromStoredPath**`, `**buildCanonicalExportPath**`, `**allocateCanonicalExportPath**`: canonical export path helpers using editor `**audio/{Category}/{filename}**` layout and upload-style suffix disambiguation.
- `**getExportCategoryOrder**`: flat category list from `**getProcessedCategoryGroups**`.
- `**buildOrderedExportManifest**`: drops empty manifest entries and orders `**audioFiles**` to match the Audio Pack Editor group layout.

### `src/components/AudioPackEditor/packAudioFileUtils.js`

#### Revision 38 — Created

- `**appendAudioFile**`: append a `**custom-content://**` URL to a category/key in `**audioFiles**` (scalar or array).
- `**removeAudioFileFromPack**`: remove a URL from a category/key entry.
- `**playPackAudioFile**`: resolve IndexedDB blob URLs and play via `**Audio**`.

### `src/components/Playing/diveTempo.js`

#### Revision 41 — Created

- New helper module centralizing skip-feedback BPM logic.
- `**isPlausibleBpm**`: accepts a finite BPM in `**[10, 200]**`, rejecting `**0**`, `**Infinity**`, and startup spikes.
- `**getAverageMotionBpm**`: averages the last up/down stroke tempos (`**null**` when there is no recorded motion).
- `**calculateTempo**`: stroke tempo in BPM from `**previousDurations**` across a depth range (`**null**` for an empty sample); moved out of `**Diving.js**`.

### `src/services/levelBulkFileService.js`

#### Revision 41 — Created

- `**pickAndReadLevelJsonDirectory**`: Electron IPC, else `**showDirectoryPicker**`, else `**webkitdirectory**` input; top-level `**.json**` only.
- `**pickDirectoryAndWriteLevelFiles**`: Electron IPC, else File System Access write, else a `**custom-levels.zip**` JSZip download.

### `src/utils/levelFileFormat.js`

#### Revision 41 — Created

- Shared `**level-v1**` serialize/parse: `**LEVEL_FILE_FORMAT**`, `**serializeLevelFile**`, `**stringifyLevelFile**`, `**parseLevelFileText**`, `**normalizeImportedLevel**`, `**applyEditorAudioFields**`.
- `**levelExportFileName**` (single-file `**${title}-level.json**`); `**allocateLevelExportFileName**` disambiguates bulk names with order / id.
- `**sanitizeFileComponent**`: strips ASCII control characters by `**charCodeAt**`, then illegal filename characters.
- `**triggerBrowserDownload**` for single-file export.

### `src/components/LevelEditor/TaskBuilder.test.jsx`

#### Revision 42 — Created

- Collapsed bookends show the task number and type. Expanding one restores the locked type select and the **Level Start** heading.
- Bookends stay fixed while middle tasks are added, reordered, and deleted.
- A Get Ready or Finish added in the middle stays movable and deletable.
- An existing task list and an empty list are not given bookends.

#### Revision 43

- Covers grouped add-task bars (`**.task-add-bar**`, Training / Interim / Special / Clipboard).

### `src/components/LevelEditor/levelBookends.js`

#### Revision 42 — Created

- `**createLevelBookends()**` returns a Get Ready task followed by a Finish task. Each task gets a new `**getRandomInt()**` id.
- Get Ready: `**timeLimit: 15**`, `**desc: 'get ready'**`, `**suppressFeedback: false**`, `**showCustomVoiceLines: false**`, `**audio**` from `**GETREADY_AUDIO[0]**` (`**Level.BEGINT_1_START**`).
- Finish: `**timeLimit: 15**`, the same feedback flags, `**audio**` from `**FINISH_AUDIO[0]**` (`**Finish.CLEAN**`).

#### Revision 43

- Get Ready bookends no longer seed `**desc**`. Audio is still `**GETREADY_AUDIO[0]**`.

### `src/components/LevelEditor/levelBookends.test.js`

#### Revision 42 — Created

- Checks the seeded pair, default fields, audio refs, and distinct ids.

#### Revision 43

- Asserts `**tasks[0].desc**` is `**undefined**`.

### `src/services/customAudio.js`

#### Revision 42 — Created

- `**normalizeCustomCueName**` trims the name and strips one leading `**custom.**`.
- `**validateCustomCueName**` rejects an empty name, `**/**` or `**\**`, character codes below 32, and the exact keys `**__proto__**`, `**constructor**`, and `**prototype**`.
- `**listCustomCueKeys**` returns every valid key in `**audioFiles.Custom**`, including an empty placeholder, sorted with numeric `**localeCompare**`. It does not invent unused Custom1–Custom40 slots.
- `**getCustomAudioOptions**` lists playable cues only. The label is `**Custom.<key>**`.
- `**addCustomCue**` stores `**''**` for the new key. `**renameCustomCue**` moves the file and writes `**audioRefAliases**` from `**Custom.<old>**` to `**Custom.<new>**`, retargeting aliases that pointed at the old ref. `**deleteCustomCue**` removes the key and any alias that sources or targets it. All three drop `**customNames**`.

### `src/services/customAudio.test.js`

#### Revision 42 — Created

- Name validation, picker labels, audio modes, dotted-key resolution, empty Custom values, and primary-pack precedence.
- Legacy Custom1–Custom40 keys still resolve. Extra cues are listed. Empty unused slots are not invented.
- A rename of `**Custom7**` to `**hello**`, then to `**phase.two**`, keeps `**Custom.Custom7**` playing through the alias chain.
- Migration turns `**Custom.CUSTOM1**` with display name `**PhaseTwo**` into key `**PhaseTwo**`, and `**Custom.CUSTOM1**` still resolves to that clip.

### `src/services/profileExport.js`

#### Revision 42 — Created

- Format `**player-profile-v1**`: `**{ format, exportedAt, profile }**`.
- `**validatePlayerProfile**` keeps `**id**`, `**name**`, flags, `**timeStats**`, `**diveStats**` (including `**HOLDANDCLAP**`), `**sessionStats**` (including `**levelScores**`), `**achievements**`, and `**performanceStats**`. Other keys are dropped. Bad numbers and bad types throw, and the message says saved data was not changed.
- `**exportPlayerProfile**` / `**parsePlayerProfile**` run that result through `**normalizePlayerProfilesState**`, so Default cannot be hidden or capture-enabled and `**customLevelFolderNames**` cannot come back.
- `**profileExportFileName**` is `**{name}-profile.json**`, with spaces turned into hyphens.

### `src/services/profileExport.test.js`

#### Revision 42 — Created

- Round-trip, stripped secrets (ElevenLabs keys, pack blobs, level bodies, calibration, device ids), Default flag guards, and rejected formats.

### `src/atoms/themeAtom.js`

#### Revision 43 — Created

- `**themeIdAtom**` and `**savedThemesAtom**` are `**atomWithStorage**` (`**getOnInit: true**`) on `**trainer.theme**` and `**trainer.theme.saved**`.
- `**themeDraftAtom**` and `**themeDraftActiveAtom**` hold unsaved color edits while a preset is selected. They are not persisted.

### `src/components/Calibration/calibrationExportService.js`

#### Revision 43

- `**exportCalibration(sections)**` forwards `**sections**` to `**calibrationService.exportCalibration**`. Omitting `**sections**` still exports every section.

### `src/components/SetupFileMenu.jsx`

#### Revision 43 — Created

- Setup opens Export settings and Import settings. Export opens a dialog, portaled to `**document.body**`, with Camera, Grids, Audio, Voice Pack, Background Track, Theme, and Misc. All start checked. Export is disabled when none are checked. Cancel and Escape write nothing.
- Each option has a `**?**` button. Hover or keyboard focus shows what that section includes. Import is one click, then the file picker, and applies every key present.
- Disabled while playing, which also closes the menu and the dialog.

### `src/components/Theme/Themes.jsx`

#### Revision 43 — Created

- Route `**THEMES**`. One `**#theme-select**`: Built-in (Modern Blue, Modern Red, Dark, Classic) and Saved.
- `**<h3 className="theme-create-heading">**` “Create Theme” sits between the select and the color swatches.
- While a built-in theme is selected and the draft is inactive, the color fields show `**PRESET_THEME_COLORS**` for that theme. The first edit starts the draft from that palette. Color edits on a saved theme write back into that theme. The single name field renames the selected saved theme, or names the theme created by Save as new. Delete removes the selected saved theme and selects Modern Blue.

### `src/components/Webcam/CameraCardHeader.js`

#### Revision 43 — Created

- `**.camera-card-header**`: an `**h2**` reading “Camera Preview”, and `**.camera-status**` with the FPS when `**fps**` is passed. The camera-off card omits the pill.

### `src/css/themes.css`

#### Revision 43 — Created

- Token names match v22: `**--ink**`, `**--muted**`, `**--line**`, `**--surface**`, `**--surface-soft**`, `**--page**`, `**--text-secondary**`, `**--accent**`, `**--accent-rgb**`, `**--accent-light**`, `**--accent-border**`, `**--accent-dark**`, `**--accent-soft**`, `**--success**`, `**--danger**`, and the two shadows.
- `**:root**` is Modern Blue. `**[data-theme="modern-red"]**` is the v22 palette (page `**#fffafb**`, accent `**#b83e59**`), directly under that block. `**[data-theme="dark"]**` and `**[data-theme="classic"]**` follow. A saved theme writes its colors inline on top of Modern Blue.
- `**html body**` paints `**var(--page)**` plus the accent radial gradient, and sets `**color: var(--ink)**`.
- `**.theme-color-grid**` is three content columns, `**width: max-content**`, centered. `**.theme-picker**` is the labeled theme select. `**.theme-create-heading**` is the centered “Create Theme” subheading between the select and the swatches. `**.theme-save-row**` is the name field with Save as new and Delete.

### `src/theme/theme.js`

#### Revision 43 — Created

- Preset ids are `**default**` (Modern Blue), `**modern-red**` (Modern Red, directly under Blue), `**dark**`, and `**classic**`. `**normalizeThemeId('custom')**` is still `**custom**`, so `**applyTheme('custom', colors)**` keeps `**data-theme="custom"**` and the inline variables. Any other unknown id falls back to `**default**`.
- `**PRESET_THEME_COLORS**` is accent, page, ink, and danger for each built-in palette, matching `**themes.css**`.
- `**trainer.theme**` stores a preset id or a saved theme id. `**trainer.theme.saved**` stores `**{ id, name, colors }**`. The first read with no saved list migrates `**trainer.theme.custom**` into one theme named Custom, and rewrites a stored id of `**custom**` to that saved id.
- `**resolveStoredThemeId**` keeps a preset or a saved id and otherwise returns `**default**`. `**applyStoredTheme()**` overlays a saved theme’s colors; a preset clears the inline variables.
- A saved theme still starts from Modern Blue, then `**derivedThemeColors**` fills the tokens that palette would otherwise leave blue: `**--accent-light**`, `**--accent-border**`, `**--accent-dark**`, `**--accent-soft**`, `**--muted**`, `**--text-secondary**`, `**--line**`, `**--surface-soft**`, `**--shadow-sm**`, and `**--shadow-lg**`. Accent steps come from the custom accent. Muted text, secondary text, and borders mix ink toward the page. A light ink uses a black shadow instead of the blue-slate one.
- `**themeCustomStorage**` remains so that migration can read the old slot.

### `src/theme/theme.test.js`

#### Revision 43 — Created

- Covers id and hex normalization, RGB channels, and the inline variables written for `**applyTheme('custom', colors)**`, including the derived accent steps and `**--muted**`.
- `**modern-red**` is a kept preset id. A legacy `**custom**` id plus `**trainer.theme.custom**` becomes one saved theme named Custom and stays active. An unknown id falls back to Modern Blue. A saved id is kept.

### `src/theme/useApplyTheme.js`

#### Revision 43 — Created

- `**useApplyTheme()**` overlays the selected saved theme, or the unsaved draft while a preset is selected and `**themeDraftActiveAtom**` is set. Otherwise it applies the preset and clears the inline variables.

### `src/workers/sherpaPreloadWorker.js`

#### Revision 43 — Created

- Loads `**sherpa-onnx-asr.js**` and `**sherpa-onnx-wasm-main-asr.js**` with `**importScripts**`, using `**Module.locateFile**` for the wasm and data URLs. Builds the recognizer and the warm stream on this thread.
- Protocol: `**init**`, `**acquire**`, `**feed**`, `**reset**`, `**release**` → `**ready**`, `**failed**`, `**acquired**`, `**acquireFailed**`, `**result**`.
- `**feed**` accepts 16 kHz PCM, decodes, and posts `**text**` and `**isEndpoint**`. On an endpoint it reads the text, then `**recognizer.reset**`, before the next chunk, so each phrase is reported once.
