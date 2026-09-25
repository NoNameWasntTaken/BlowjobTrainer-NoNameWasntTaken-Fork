# Feature Additions

This document describes major new features compared to the original v18 of the project, from a user or author perspective.   
  
Note that many new features were created with the assumption that the application would be packaged into a standalone application via Electron Forge, rather than hosted on a web browser. To build the application in this way, I opened the project root in a terminal and ran the following commands:

```npm install``` (if not done already)
```npm run build```

```npx electron-forge package --platform=darwin --arch=x64```

You will need Node.js installed on your system to run these commands. The parameters `--platform` and `--arch` will need to be changed depending on your machine's OS.


## 1: External Integration Points

- **Task Executables**: Optional external script path for all task types, ran automatically when the task begins. Utility options for browsing, testing, clearing scripts. Only available in the Electron-packaged application.
- **CLI External Launch**: Launch the application via command-line interface, primarily as an integration point with other applications. Options include limited navigation when specifying a level via CLI parameter, calibration-only runs for extracting calibration data, and auto-start functionality to immediately begin a level on startup. Refer to "ExternalDocumentation.txt" for more info on this specific feature.

---

## 2: Voice Pack Management

- **Content Library**: New tab for managing custom content; initially only voice packs, but future custom content would also use this tab. Import, export, activate, and delete custom voice packs through this menu.
- **Voice Pack Editor**: Separate implementation from the mainline fork, created prior to v19. Manage metadata, categories, and file assignments, with uploads tied to individual subcategories. "Play" buttons to test individual sound files. Categories grouped under section headings (baseline, session flow, feedback, etc).
- **Custom Voice Cues**: Originally added in Revision 14 with a fixed number of categories, then replaced by the superior dynamic cue generation added in v21 of the mainline fork.
- **Voice Resolution**: Default levels follow the pack selected in the library (with fallbacks to built-in audio). Custom levels can pin a specific pack in their own metadata or use the library selection, with sensible fallbacks.

---

## 3: Multi-Grid Support

- **Multiple Grids**: The grid calibration screen now supports multiple grids, each with its own painted squares, base color, and sensitivity values. In gameplay, the total coverage percentage is calculated as a combined total of all configured grids.
- **Balls Bonus**: As an extension of the multi-grid feature, any grid can be toggled into a 'balls' region, independent from the main shaft. Custom levels can then be configured to support bonus points during rest by covering a minimum percentage of the grids designated as 'balls'; this fulfills the role play of voice lines that tell the user to kiss the balls or rest them on their face.

---

## 4: Webcam And Display Improvements

- **Camera Toggle**: Turn the webcam off outside of gameplay, if you dont want to be watched until you're ready.
- **Rotation**: Cycle the webcam display in 90-degree steps to better fit custom webcam setups. Grid drawing and pointer mapping follow rotation.
- **Webcam Display Size**: A new slider was added to adjust the size of the webcam display. Increase the display size when drawing grids, or decrease it when switching to gameplay.
- **Mirror Mode**: Flip the play UI horizontally during gameplay. If your setup has you look into a mirror to read the UI, use this option to ensure text remains readable.

---

## 5: Audio Tab — Mixing, Inputs, and Tests

- **'Mic' --> 'Audio'**: The 'Mic' tab has been renamed 'Audio', as its scope has been expanded.
- **Microphone Selection**: Pick an audio input device (not only the OS default), and use it for all sound detection in gameplay.
- **Background Music**: Select a background music track from the Content Library to play during levels, with configurable fade-in and fade-out times. Custom levels can be configured to use a specific background track, use the current track from the content library, or no background track at all.
- **Channel Separation**: Independent playback channels for SFX, Voice Lines, and Background Music, allowing all audio to play simultaneously without cutting off. Volumes of each channel can be configured independently.
- **Audio Tests**: Run clap detection tests or speech detection tests, with or without background music, to calibrate before starting gameplay.

---

## 6: Settings Import/Export

- **Setup Menu**: A utility option available on all tabs. Export select application setup data, or import all data in a settings .json file.
- **Saved Data**: Settings export/import covers seven distinct areas. "Camera" covers the selected camera, rotation, and preview size. "Grids" covers painted squares, color, sensitivity, depth settings, and the balls toggle. "Audio" covers clap sensitivity, the three volumes, music fade, and the selected microphone. "Voice Pack" and "Background Track" save which item is selected, not the audio files. "Theme" saves the active theme, including custom colors (more on themes later). "Misc" saves mirror mode and whether the depth diagram is flipped.

---

## 7: Custom Level Organization and Editing

- **Dedicated Tab**: Custom levels are now separated from the default levels, under their own tab in the level select screen.
- **Subfolders**: Further organize custom levels into one of five subfolders within the custom levels tab. Rename subfolders at the bottom of the custom level editor menu. Unused subfolders are hidden in the level select screen to reduce clutter; if only one subfolder is used, the subfolders are hidden completely. Reduce visual clutter when loading custom levels for editing by filtering on a specific subfolder.
- **Prerequisites**: Levels may now require completion of a previous level(s), with a specific rank or better, in order to unlock and play. Default levels have had prerequisites assigned based on other default levels. Custom levels can have prerequisites customized to include default levels or other custom levels. Deleting a custom level will automatically remove it as a prerequsite for all relevant levels.
- **Difficulty Score**: Levels have a difficulty score assigned to them, between 1 - 10. This score is automatically calculated for all levels, but can be manually overwritten for custom levels.
- **Quality of Life Features**: The custom level editor gained many smaller QoL improvements, including; task numbering, a second task addition bar at the bottom of the task list, copy/paste function to save and load a task type with its configuration data, and a fast transition toggle for each task to skip feedback and immediately start the next task.
- **Bulk Import and Export**: Save all levels in a folder at once, and import all levels in a given directory.

---

## 8: New Task Types

- **Custom Level Exclusives**: Configure several new task types for custom levels only. Default levels do not use these tasks.
- **Hold and Clap**: A combination of the 'Hold Position' and 'Clap' tasks. Hold depth while slapping yourself. Going deeper will still count slaps, but at a reduced rate, so aim for the target depth.
- **Endless**: Completed/expanded implementation of the 'Endless' task, including independent scoring for holds, up/downs, slaps during holds, balls bonuses (if a balls grid is configured),and rhythm/depth consistency bonuses. Scoring earns rest time as indicated by the UI bar; staying off the shaft while rest time is expired incurs surface penalties. Trigger events at specific score thresholds, including playing a voice line, earning extra rest time, runing an external script, or adjusting buttplug.io device vibration. Unlike other tasks, progress is not reset when pausing and resuming this task, due to its long intended runtime.
- **Speak**: Using a sherpa-onyx speech recognition model, this task listens for the user's speech and progresses when the correct phrase is heard. Configure target phrases with alternatives in brackets, or optional ommision of a word with a hyphen; for example, '[suck, tuck, luck, muck, -]' can replace the word 'suck' with any alternative listed or skip the word entirely. Optional fuzzy matching on statement end for increased flexibility in phrase matching. Configure between short, single-sentence phrases in short mode, or longer, multi-sentence sequences in long mode.

---

## 9: Profiles and Progression

- **'Achievements' --> 'Profiles'**: The 'Achievements' tab has been renamed to 'Profiles', as its scope has been expanded.
- **Profile Management**: Create, copy, and delete profiles at the user's discression. Profiles track stats, achievements, and level progression independently of each other. Only the current profile is updated when a level is completed. Export and import profiles similar to custom levels.
- **Stats and Achievement Tracking**: Set a toggle to enable/disable stat tracking, achievement progress, and prerequisite credit for any profile.
- **Default Profile Bypass**: The default level has an additional toggle 'Bypass Level Requirements'; enable this option to skip level prerequisites at the cost of stat and achievement tracking.

---

## 10: Webcam Captures

- **Capture Behavior:** Optional .jpg photos and .mp4 videos captures during gameplay, intelligently timed around tasks, with HUD status and tallies in the level summary.
- **Consent Layers**: Multiple security/consent layers included to prevent unwanted captures, including restricted feature to Electron-packaged application only, and gates per profile, per level and per session via pre-play confirmation; all must pass before taking captures. Default profile and levels both force disable all captures; a custom profile and custom level are required.
- **Configuration**: Adjust capture percentage chances, capture type preferences, and bias towards visible or hidden notifications on capture.

---

## 11: ElevenLabs Voice Generation Tweaks

- **Tweaks and Improvements**: Borrowed the ElevenLabs voice generation code from v19, and made several improvements; generate multiple variants for the same lines, batch-generate for multiple categories, listen to and delete lines without switching tabs, and re-generate in place with one button.

---

## 12: Themes

- **Built-In Themes**: The default UI uses a blue version of the modern UI introduced in v21. Use the 'Themes' tab to switch between the original red UI, dark mode, or the classic React cyan colors.
- **Create Your Own**: Create any number of custom themes by changing the four color options to your preference. Save and load from the 'Themes' tab or on settings import.
