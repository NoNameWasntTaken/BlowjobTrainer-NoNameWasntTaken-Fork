# Custom Content System - Implementation Outline

## Overview
Enable players to create, share, and load custom levels and audio packs at runtime without rebuilding the application.

---

## 1. Data Structure Changes

### 1.1 Audio System Refactoring
**File: `src/components/Tasks/audio.js`**

- **Create Audio Manager Service**
  - `src/services/audioManager.js`
  - Manages multiple audio packs (default + custom)
  - Provides unified API: `getAudio(category, key)`, `getAudioFile(audioPath)`
  - Maintains active audio pack reference
  - Merges default `AUDIO` with loaded custom packs

- **Audio Pack Schema**
  ```json
  {
    "id": "pack-id",
    "name": "Pack Name",
    "author": "Author Name",
    "version": "1.0.0",
    "audioFiles": {
      "category": {
        "key": "path/to/file.mp3" | ["path1.mp3", "path2.mp3"]
      }
    },
    "metadata": {
      "description": "...",
      "createdAt": "2024-01-01",
      "tags": ["tag1", "tag2"]
    }
  }
  ```

- **Refactor Existing Code**
  - Keep `AUDIO` as default/fallback
  - Update `getAudioFile()` to check custom packs first, then default
  - Update `getAudioKey()` to search across all packs
  - Make `AudioPlayer.js` use audio manager instead of direct `AUDIO` import

### 1.2 Level System Refactoring
**File: `src/components/Training/levels.js`**

- **Create Level Manager Service**
  - `src/services/levelManager.js`
  - Manages multiple level collections (default + custom)
  - Provides unified API: `getAllLevels()`, `getLevel(id)`, `addLevel(level)`
  - Validates level structure
  - Handles audio reference resolution

- **Level Schema**
  ```json
  {
    "id": "level-id",
    "order": 100,
    "title": "Level Title",
    "image": "url or data-uri",
    "description": "...",
    "soft": false,
    "audioPackId": "pack-id", // optional, references audio pack
    "tasks": [
      {
        "type": "hold",
        "targetDepth": 2,
        "time": 10,
        "repeat": 3,
        "audio": "Category.KEY" // string reference instead of direct object
      }
    ],
    "metadata": {
      "author": "...",
      "createdAt": "...",
      "tags": []
    }
  }
  ```

- **Refactor Existing Code**
  - Keep `levels` array as default levels
  - Update `Training.jsx` to use level manager
  - Convert audio references in levels from objects to strings (e.g., `"Feedback.PERFECT"`)

---

## 2. Runtime Loading System

### 2.1 Storage Layer
**New Files:**
- `src/services/storageService.js`
- `src/services/fileService.js` (for Electron file system access)

**Storage Strategy:**
- **Browser (Web):**
  - localStorage for metadata (pack/level IDs, names)
  - IndexedDB for audio file blobs
  - Export/import via JSON + base64 encoded audio files

- **Electron:**
  - File system: `userData/custom-content/`
    - `audio-packs/` - directory for audio pack JSON + audio files
    - `levels/` - directory for level JSON files
  - Use Electron's `app.getPath('userData')` for path resolution

**Storage Service API:**
```javascript
// Audio Packs
saveAudioPack(packData, audioFiles) // packData + file blobs
loadAudioPack(packId)
getAllAudioPacks()
deleteAudioPack(packId)
exportAudioPack(packId) // creates shareable JSON + base64 files
importAudioPack(jsonData) // imports from shareable format

// Levels
saveLevel(levelData)
loadLevel(levelId)
getAllLevels()
deleteLevel(levelId)
exportLevel(levelId) // creates shareable JSON
importLevel(jsonData) // imports from shareable format
```

### 2.2 Audio File Management
**New File: `src/services/audioFileService.js`**

- **File Upload/Storage:**
  - Accept MP3/WAV files via file input
  - Store in appropriate location (IndexedDB for web, file system for Electron)
  - Generate unique filenames to avoid conflicts
  - Validate file format and size

- **Path Resolution:**
  - Custom audio files: `custom-content/audio-packs/{packId}/{filename}`
  - Default audio files: `audio/{category}/{filename}` (existing)
  - Handle both relative and absolute paths

- **Audio Validation:**
  - Check file exists before saving pack
  - Verify audio format on load
  - Provide error messages for missing files

---

## 3. UI Components for Content Creation

### 3.1 Navigation Updates
**File: `src/atoms/navAtom.js`**
- Add new navigation states:
  - `AUDIO_PACK_EDITOR = 10`
  - `LEVEL_EDITOR = 11`
  - `CONTENT_LIBRARY = 12`

**File: `src/App.js`**
- Add routes for new pages in `renderControls()`

### 3.2 Audio Pack Editor
**New File: `src/components/AudioPackEditor/AudioPackEditor.jsx`**

**Features:**
- **Pack Metadata Form:**
  - Name, Author, Description, Tags
  - Version number
  - Preview/thumbnail image

- **Audio Category Management:**
  - List all categories (Sfx, Calibration, Rank, Level, etc.)
  - For each category, list keys
  - For each key, allow:
    - Upload single file or multiple files (for array support)
    - Preview/play uploaded audio
    - Delete/replace files
    - Set as single file or array

- **Audio File Upload:**
  - Drag & drop or file picker
  - Show upload progress
  - Validate file type and size
  - Preview waveform or duration

- **Pack Management:**
  - Save pack (local)
  - Export pack (downloadable JSON)
  - Load existing pack for editing
  - Delete pack
  - Test pack (preview with audio player)

**UI Structure:**
```
┌─────────────────────────────────────┐
│ Audio Pack Editor                    │
├─────────────────────────────────────┤
│ [Pack Metadata]                      │
│   Name: [________]                   │
│   Author: [______]                   │
│   Description: [____]                │
├─────────────────────────────────────┤
│ [Audio Categories]                   │
│ ▼ Sfx                                │
│   TICK: [Upload] [Preview] [Delete]  │
│   TOCK: [Upload] [Preview] [Delete]  │
│ ▼ Calibration                        │
│   ZERO: [Upload] [Preview] [Delete]  │
│   ...                                │
├─────────────────────────────────────┤
│ [Actions]                            │
│ [Save] [Export] [Test] [Cancel]      │
└─────────────────────────────────────┘
```

### 3.3 Level Editor
**New File: `src/components/LevelEditor/LevelEditor.jsx`**

**Features:**
- **Level Metadata Form:**
  - Title, Description, Image URL
  - Order number
  - Soft mode toggle
  - Audio pack selection (dropdown of available packs)

- **Task Builder:**
  - Visual task list with add/remove/reorder
  - Task type selector (Hold, UpDown, Hit, Clap, Rest, Finish, etc.)
  - Task-specific forms:
    - **Hold:** targetDepth, time, repeat, audio selection
    - **UpDown:** minDepth, maxDepth, tempo, timeLimit, audio selection
    - **Hit:** targetDepth, repeat, audio selection
    - **Clap:** repeat, timeLimit, audio selection
    - **Rest:** timeLimit, audio selection
    - **Finish:** time, audio selection
    - **GetReady:** time, timeLimit, audio selection

- **Audio Selection:**
  - Dropdown showing available audio from selected pack
  - Format: "Category.KEY" (e.g., "Feedback.PERFECT")
  - Preview button to test audio

- **Level Preview:**
  - Show estimated duration
  - List all tasks with summaries
  - Validate level structure

- **Level Management:**
  - Save level
  - Export level (downloadable JSON)
  - Load existing level for editing
  - Delete level
  - Test level (launch in training mode)

**UI Structure:**
```
┌─────────────────────────────────────┐
│ Level Editor                         │
├─────────────────────────────────────┤
│ [Level Metadata]                    │
│   Title: [________]                  │
│   Description: [____]                │
│   Audio Pack: [Dropdown ▼]          │
├─────────────────────────────────────┤
│ [Tasks]                              │
│ 1. [Hold] Depth:2 Time:10 Repeat:3  │
│    Audio: [Feedback.PERFECT ▼] [X] │
│ 2. [UpDown] 1-3 Fast 30s            │
│    Audio: [UpDown.ONE_THREE_FAST ▼] │
│ [+ Add Task]                         │
├─────────────────────────────────────┤
│ [Actions]                            │
│ [Save] [Export] [Test] [Cancel]      │
└─────────────────────────────────────┘
```

### 3.4 Content Library
**New File: `src/components/ContentLibrary/ContentLibrary.jsx`**

**Features:**
- **Audio Pack Management:**
  - List all installed packs (default + custom)
  - Show pack metadata (name, author, version)
  - Set active pack (for level creation)
  - Import pack from file
  - Export pack
  - Delete custom pack
  - Preview pack (list all audio files)

- **Level Management:**
  - List all levels (default + custom)
  - Show level metadata
  - Import level from file
  - Export level
  - Delete custom level
  - Launch level (go to training)

- **Sharing:**
  - Generate shareable links (if web-based sharing)
  - Export as JSON files
  - Import from JSON files
  - Validate imported content

**UI Structure:**
```
┌─────────────────────────────────────┐
│ Content Library                     │
├─────────────────────────────────────┤
│ [Audio Packs]                       │
│ ┌─────────┐ ┌─────────┐            │
│ │ Default │ │ Custom  │            │
│ │ Pack    │ │ Pack 1  │            │
│ │ [Active]│ │ [Export]│            │
│ └─────────┘ └─────────┘            │
│ [+ Import Pack]                     │
├─────────────────────────────────────┤
│ [Levels]                            │
│ ┌─────────┐ ┌─────────┐            │
│ │ Level 1 │ │ Custom  │            │
│ │ [Play]  │ │ Level   │            │
│ └─────────┘ │ [Export]│            │
│             └─────────┘            │
│ [+ Import Level]                    │
└─────────────────────────────────────┘
```

---

## 4. Integration Points

### 4.1 Update AudioPlayer
**File: `src/components/AudioPlayer.js`**
- Import `audioManager` instead of direct `AUDIO`
- Use `audioManager.getAudioFile()` instead of `getAudioFile()`
- Handle missing audio gracefully (fallback to default)

### 4.2 Update Training Component
**File: `src/components/Training/Training.jsx`**
- Import `levelManager` instead of direct `levels`
- Use `levelManager.getAllLevels()` to get combined default + custom levels
- Filter/sort levels appropriately
- Show indicator for custom vs default levels

### 4.3 Update Task Creation Functions
**File: `src/components/Tasks/task.js`**
- Modify factory functions to accept audio pack context
- Resolve audio references from strings (e.g., `"Feedback.PERFECT"`) to actual audio paths
- Fallback to default AUDIO if custom pack doesn't have the key

### 4.4 Audio Reference Resolution
**New File: `src/services/audioResolver.js`**
- Function: `resolveAudioReference(audioString, audioPackId)`
  - Input: `"Feedback.PERFECT"` or `"Category.KEY"`
  - Output: audio path or array of paths
- Handles:
  - String references: `"Category.KEY"`
  - Direct paths (backward compatibility)
  - Array references
  - Missing audio (fallback to default)

---

## 5. Sharing Mechanism

### 5.1 Export Format (ZIP-based)

**Audio Pack Export Structure:**
```
my-audio-pack.zip
├── audio-pack.json          # Manifest file (required, at root)
└── audio/                    # Audio files directory
    ├── sfx/
    │   ├── tick.mp3
    │   └── tock.mp3
    ├── feedback/
    │   ├── perfect-0.mp3
    │   └── perfect-1.mp3
    └── ...
```

**audio-pack.json format:**
```json
{
  "format": "audio-pack-v1",
  "pack": {
    "id": "my-custom-pack",
    "name": "My Custom Audio Pack",
    "author": "Player Name",
    "version": "1.0.0",
    "description": "A custom audio pack with my voice",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "audioFiles": {
    "Sfx": {
      "TICK": "audio/sfx/tick.mp3",
      "TOCK": "audio/sfx/tock.mp3"
    },
    "Feedback": {
      "PERFECT": [
        "audio/feedback/perfect-0.mp3",
        "audio/feedback/perfect-1.mp3"
      ]
    }
  }
}
```

**Level Export Structure:**
```
my-custom-level.zip (optional, if including audio)
├── level.json               # Level manifest (required)
└── audio/                   # Optional: audio files if self-contained
    └── ...
```

**level.json format:**
```json
{
  "format": "level-v1",
  "level": {
    "id": "my-custom-level",
    "order": 100,
    "title": "My Custom Level",
    "description": "...",
    "soft": false,
    "tasks": [ ... ]
  },
  "audioPackId": "my-custom-pack"  // Optional: reference to pack
}
```

**Note:** Levels can be exported as simple JSON files (no zip needed) if they reference existing audio packs. ZIP is only needed if the level includes its own audio files.

### 5.2 ZIP File Handling (Web & Electron)

**For Web Browsers:**
- Use **JSZip** library (npm: `jszip`) to create and read ZIP files
- **Export:** Create ZIP in memory, download via blob URL
- **Import:** Read ZIP file via FileReader API, extract JSON and audio files
- Store audio files in IndexedDB after extraction

**For Electron:**
- Can use JSZip (same as web) OR native file system operations
- Store extracted files in `userData/custom-content/audio-packs/{packId}/`
- More efficient than web (direct file system access)

**Implementation:**
```javascript
// Export audio pack as ZIP
import JSZip from 'jszip';

async function exportAudioPack(packId) {
  const zip = new JSZip();
  const pack = await loadAudioPack(packId);
  
  // Add manifest
  zip.file('audio-pack.json', JSON.stringify(pack, null, 2));
  
  // Add all audio files
  for (const [category, keys] of Object.entries(pack.audioFiles)) {
    for (const [key, paths] of Object.entries(keys)) {
      const filePaths = Array.isArray(paths) ? paths : [paths];
      for (const filePath of filePaths) {
        const audioBlob = await getAudioFileBlob(filePath);
        zip.file(filePath, audioBlob);
      }
    }
  }
  
  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${pack.name.replace(/\s+/g, '-')}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import audio pack from ZIP
async function importAudioPack(zipFile) {
  const zip = await JSZip.loadAsync(zipFile);
  
  // Read manifest
  const manifestJson = await zip.file('audio-pack.json').async('string');
  const manifest = JSON.parse(manifestJson);
  
  // Extract and store audio files
  const audioFiles = {};
  for (const [category, keys] of Object.entries(manifest.audioFiles)) {
    audioFiles[category] = {};
    for (const [key, paths] of Object.entries(keys)) {
      const filePaths = Array.isArray(paths) ? paths : [paths];
      const extractedPaths = [];
      
      for (const filePath of filePaths) {
        const audioBlob = await zip.file(filePath).async('blob');
        const storedPath = await storeAudioFile(manifest.pack.id, filePath, audioBlob);
        extractedPaths.push(storedPath);
      }
      
      audioFiles[category][key] = filePaths.length === 1 
        ? extractedPaths[0] 
        : extractedPaths;
    }
  }
  
  // Save pack
  await saveAudioPack({
    ...manifest.pack,
    audioFiles
  });
}
```

### 5.3 Import Validation
- Validate ZIP structure (must contain `audio-pack.json` or `level.json` at root)
- Validate JSON structure and required fields
- Verify all referenced audio files exist in ZIP
- Check file formats (audio must be MP3/WAV)
- Sanitize IDs to avoid conflicts with existing packs/levels
- Show import preview with pack/level metadata before confirming
- Handle missing files gracefully (show warnings, allow partial import)

### 5.4 Sharing Options
- **ZIP File Export/Import:** Primary method - works offline, easy to share
  - Export: Download `.zip` file
  - Import: Drag & drop or file picker
  - Share via: Email, cloud storage, forums, etc.
- **Simple JSON (Levels only):** Levels can be shared as JSON if they reference existing packs
- **URL-based (optional):** If hosting service available, generate shareable URLs
- **QR Code (optional):** Generate QR codes linking to download URLs

---

## 6. Dependencies

### Required NPM Packages
```json
{
  "dependencies": {
    "jszip": "^3.10.1"  // For ZIP file creation/reading (web & Electron)
  }
}
```

**JSZip Usage:**
- Works in both web browsers and Electron
- No native dependencies
- Supports async operations
- Automatic compression
- Can handle large files (with proper chunking)

---

## 7. Implementation Phases

### Phase 1: Core Infrastructure
1. Create storage service (localStorage/IndexedDB for web, file system for Electron)
2. Create audio manager service
3. Create level manager service
4. Refactor AudioPlayer to use audio manager
5. Refactor Training to use level manager

### Phase 2: Audio Pack System
1. Create audio pack schema and validation
2. Implement audio file upload/storage
3. Create audio pack editor UI
4. Implement pack save/load/export/import
5. Test audio pack loading in game

### Phase 3: Level Editor
1. Create level schema and validation
2. Create level editor UI
3. Implement task builder with audio selection
4. Implement level save/load/export/import
5. Test custom levels in game

### Phase 4: Content Library
1. Create content library UI
2. Implement pack/level management (list, delete, activate)
3. Implement sharing (export/import)
4. Add validation and error handling

### Phase 5: Polish & Testing
1. Add error handling and user feedback
2. Add validation for all inputs
3. Test edge cases (missing files, invalid JSON, etc.)
4. Add documentation/tutorials
5. Performance optimization

---

## 8. File Structure

```
src/
├── services/
│   ├── audioManager.js          # Manages audio packs
│   ├── levelManager.js          # Manages levels
│   ├── storageService.js        # Storage abstraction
│   ├── fileService.js           # File I/O (Electron-specific)
│   ├── audioFileService.js      # Audio file handling
│   └── audioResolver.js         # Resolves audio references
│
├── components/
│   ├── AudioPackEditor/
│   │   ├── AudioPackEditor.jsx
│   │   ├── AudioCategoryEditor.jsx
│   │   ├── AudioFileUploader.jsx
│   │   └── AudioPackEditor.css
│   │
│   ├── LevelEditor/
│   │   ├── LevelEditor.jsx
│   │   ├── TaskBuilder.jsx
│   │   ├── TaskForm.jsx
│   │   ├── AudioSelector.jsx
│   │   └── LevelEditor.css
│   │
│   └── ContentLibrary/
│       ├── ContentLibrary.jsx
│       ├── AudioPackList.jsx
│       ├── LevelList.jsx
│       ├── ImportDialog.jsx
│       └── ContentLibrary.css
│
└── atoms/
    └── contentAtom.js           # Jotai atoms for active pack/levels
```

---

## 9. Technical Considerations

### 8.1 Electron-Specific
- Use `electron.remote` or IPC for file system access
- Store custom content in `app.getPath('userData')/custom-content/`
- Handle file permissions
- Support drag-and-drop file imports

### 8.2 Web-Specific
- Use IndexedDB for audio file storage (larger than localStorage)
- Use JSZip library for ZIP file creation/reading in browser
- Implement file size limits (warn if ZIP > 50MB, hard limit at 100MB)
- ZIP compression is automatic (JSZip compresses by default)
- Handle CORS for external audio files (if supported)
- Use FileReader API for reading uploaded ZIP files
- Consider showing progress for large ZIP imports

### 8.3 Backward Compatibility
- Keep default `AUDIO` and `levels` as fallbacks
- Support both old format (direct audio objects) and new format (string references)
- Migration path for existing levels if needed

### 8.4 Performance
- Lazy load audio files (only load when pack is active)
- Cache resolved audio paths
- Optimize IndexedDB queries
- Compress exported JSON files

### 8.5 Security
- Validate all imported JSON (prevent code injection)
- Sanitize file paths
- Limit file sizes
- Validate audio file formats

---

## 10. User Experience Enhancements

### 9.1 Audio Pack Editor
- Audio waveform visualization
- Audio preview with playback controls
- Drag-and-drop file organization
- Bulk upload for multiple files
- Search/filter categories and keys

### 9.2 Level Editor
- Visual timeline of tasks
- Drag-and-drop task reordering
- Task templates/presets
- Real-time duration calculation
- Preview mode (test level without saving)

### 9.3 Content Library
- Search and filter packs/levels
- Sort by name, author, date
- Thumbnail previews
- Usage statistics (how many times played)
- Favorites/bookmarks

---

## 11. Future Enhancements (Optional)

- **Community Features:**
  - Online sharing platform
  - Ratings and reviews
  - Featured content
  - Content discovery

- **Advanced Editor Features:**
  - Audio editing (trim, fade, normalize)
  - Level templates
  - Conditional tasks
  - Random task generation

- **Analytics:**
  - Track most popular packs/levels
  - Usage statistics
  - Performance metrics

