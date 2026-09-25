const { app, BrowserWindow, Menu, ipcMain, dialog, protocol, systemPreferences, session } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;

// CLI Configuration (parsed at module load time)
let cliConfig = null;
let exitCode = null;
let exitReason = null;
let programmaticExit = false;

// Initialize process registry at top level (after imports, before IPC handlers)
const activeProcesses = new Map();

// Resolve scripts directory - handle both dev and production builds
const appPath = app.isPackaged 
    ? process.resourcesPath 
    : path.join(__dirname, '..');

const ALLOWED_DIRECTORIES = [
    path.join(appPath, 'scripts'),  // scripts/ in root
    path.join(app.getPath('userData'), 'scripts'),  // user data scripts
];

const ALLOWED_EXTENSIONS = {
    win32: ['.exe', '.bat', '.cmd'],
    darwin: ['.exe', '.sh', '.command'],  // .app removed, .exe allowed
    linux: ['.sh', '.bin', '.exe']  // .exe allowed on Linux too
};

// CLI Argument Parsing Functions (called at module load time)
function resolvePath(relativePath) {
    if (!relativePath) return null;
    if (path.isAbsolute(relativePath)) return relativePath;
    return path.resolve(process.cwd(), relativePath);
}

/**
 * Get the default directory for calibration/session exports.
 * Uses process.cwd() (directory app was run from) when valid.
 * Falls back to user Documents when cwd is / (e.g. packaged app launched from Finder).
 */
function getDefaultExportDirectory() {
    const cwd = process.cwd();
    if (cwd === '/' || cwd === '') {
        return app.getPath('documents');
    }
    try {
        if (!fs.existsSync(cwd)) {
            return app.getPath('documents');
        }
    } catch {
        return app.getPath('documents');
    }
    return cwd;
}

function parseCLIArguments() {
    // Packaged: [executable, ...userArgs]; Dev: [executable, scriptPath, ...userArgs]
    const args = app.isPackaged ? process.argv.slice(1) : process.argv.slice(2);
    const config = {
        level: null,
        levelList: null,
        calibrationData: null,
        skipCalibration: false,
        calibrateOnly: false,
        calibrationTime: -1,
        pauseTime: -1,
        audioPack: null,
        backgroundMusic: null,
        autoStart: false,
        output: null,
        validateLevel: null,
        mirror: false,
        profile: null,
        showHidden: false,
        enableCaptures: false,
        captureOutput: null,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
            case '--level':
                if (nextArg && !nextArg.startsWith('--')) {
                    config.level = nextArg;
                    i++;
                }
                break;
            case '--level-list':
                if (nextArg && !nextArg.startsWith('--')) {
                    config.levelList = nextArg
                        .split(',')
                        .map((id) => id.trim())
                        .filter(Boolean);
                    i++;
                }
                break;
            case '--calibration-data':
                if (nextArg && !nextArg.startsWith('--')) {
                    config.calibrationData = resolvePath(nextArg);
                    i++;
                }
                break;
            case '--skip-calibration':
                config.skipCalibration = true;
                break;
            case '--calibrate-only':
                config.calibrateOnly = true;
                break;
            case '--calibration-time':
                if (nextArg && !nextArg.startsWith('--')) {
                    const time = parseInt(nextArg, 10);
                    if (!isNaN(time)) config.calibrationTime = time;
                    i++;
                }
                break;
            case '--pause-time':
                if (nextArg && !nextArg.startsWith('--')) {
                    const time = parseInt(nextArg, 10);
                    if (!isNaN(time)) config.pauseTime = time;
                    i++;
                }
                break;
            case '--audio-pack':
                if (nextArg && !nextArg.startsWith('--')) {
                    config.audioPack = nextArg;
                    i++;
                }
                break;
            case '--background-music':
                if (nextArg && !nextArg.startsWith('--')) {
                    config.backgroundMusic = nextArg;
                    i++;
                }
                break;
            case '--auto-start':
                config.autoStart = true;
                break;
            case '--output':
                if (nextArg && !nextArg.startsWith('--')) {
                    config.output = resolvePath(nextArg);
                    i++;
                }
                break;
            case '--validate-level':
                if (nextArg && !nextArg.startsWith('--')) {
                    config.validateLevel = nextArg;
                    i++;
                }
                break;
            case '--mirror':
                config.mirror = true;
                break;
            case '--no-mirror':
                config.mirror = false;
                break;
            case '--profile':
                if (nextArg && !nextArg.startsWith('--')) {
                    config.profile = nextArg;
                    i++;
                }
                break;
            case '--show-hidden':
                config.showHidden = true;
                break;
            case '--enable-captures':
                config.enableCaptures = true;
                break;
            case '--capture-output':
                if (nextArg && !nextArg.startsWith('--')) {
                    config.captureOutput = resolvePath(nextArg);
                    i++;
                }
                break;
        }
    }

    return config;
}

function validateCLIArguments(config) {
    const errors = [];
    const hasLevelList = Array.isArray(config.levelList);
    const hasLevelSelection = !!(config.level || (hasLevelList && config.levelList.length > 0));

    // --level and --level-list are mutually exclusive
    if (config.level && hasLevelList) {
        errors.push('--level and --level-list cannot be used together');
    }

    // --level-list requires at least one level ID
    if (hasLevelList && config.levelList.length === 0) {
        errors.push('--level-list requires at least one level ID');
    }

    // --level / --level-list and --calibrate-only are mutually exclusive
    if (hasLevelSelection && config.calibrateOnly) {
        errors.push('--level / --level-list and --calibrate-only cannot be used together');
    }

    // --skip-calibration requires --calibration-data
    if (config.skipCalibration && !config.calibrationData) {
        errors.push('--skip-calibration requires --calibration-data parameter');
    }

    // --validate-level cannot be combined with other run modes
    if (config.validateLevel) {
        if (hasLevelSelection || config.calibrateOnly) {
            errors.push('--validate-level cannot be combined with other run modes');
        }
    }

    // --auto-start requires --skip-calibration
    if (config.autoStart && !config.skipCalibration) {
        errors.push('--auto-start requires --skip-calibration');
    }

    // --auto-start requires --level or --level-list (validated after mutual-exclusion rules above)
    if (config.autoStart && !hasLevelSelection) {
        errors.push('--auto-start requires --level or --level-list');
    }

    // Time values must be integers >= -1
    if (config.calibrationTime < -1 || !Number.isInteger(config.calibrationTime)) {
        errors.push('--calibration-time must be an integer >= -1');
    }
    if (config.pauseTime < -1 || !Number.isInteger(config.pauseTime)) {
        errors.push('--pause-time must be an integer >= -1');
    }

    if (config.enableCaptures && !hasLevelSelection) {
        errors.push('--enable-captures requires --level or --level-list');
    }

    if (config.captureOutput && !config.enableCaptures) {
        errors.push('--capture-output requires --enable-captures');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function getCLIConfig() {
    return cliConfig;
}

// Register custom protocol as privileged (must run before app.whenReady())
// So the renderer loads in a secure context and getUserMedia (webcam) works when packaged.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true } }
]);

// Parse CLI arguments at module load time (before app.whenReady())
const parsedConfig = parseCLIArguments();
const validation = validateCLIArguments(parsedConfig);
if (validation.valid) {
    // Resolve --level-list to a single --level equivalent before exposing config
    if (parsedConfig.levelList && parsedConfig.levelList.length > 0) {
        const idx = Math.floor(Math.random() * parsedConfig.levelList.length);
        parsedConfig.level = parsedConfig.levelList[idx];
        console.log(`CLI --level-list: selected level "${parsedConfig.level}" from [${parsedConfig.levelList.join(', ')}]`);
    }
    cliConfig = parsedConfig;
} else {
    console.error('CLI argument validation failed:', validation.errors);
    // Still set config but mark as invalid - will be handled by renderer
    cliConfig = { ...parsedConfig, _validationErrors: validation.errors };
}

// Synchronous showHidden for zero-flash renderer init (sendSync + event.returnValue; not invoke/handle)
ipcMain.on('get-show-hidden-sync', (event) => {
    event.returnValue = !!(cliConfig && cliConfig.showHidden === true);
});

ipcMain.on('is-packaged-sync', (event) => {
    event.returnValue = app.isPackaged;
});

function createWindow() {
    // Request camera and microphone permissions on macOS before creating window
    if (process.platform === 'darwin') {
        systemPreferences.askForMediaAccess('camera').then((granted) => {
            console.log('Camera permission:', granted ? 'granted' : 'denied');
        }).catch((err) => {
            console.error('Error requesting camera permission:', err);
        });

        systemPreferences.askForMediaAccess('microphone').then((granted) => {
            console.log('Microphone permission:', granted ? 'granted' : 'denied');
        }).catch((err) => {
            console.error('Error requesting microphone permission:', err);
        });
    }

    // Configure session permissions for media devices (required for getUserMedia in renderer)
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media' || permission === 'camera' || permission === 'microphone') {
            callback(true);
        } else {
            callback(false);
        }
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        if (permission === 'media' || permission === 'camera' || permission === 'microphone') {
            return true;
        }
        return false;
    });

    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true,
            preload: path.join(__dirname, 'preload.js')
        },
        show: false
    });

    // Load the app (production uses app:// so webcam/getUserMedia works in packaged app)
    const startUrl = isDev
        ? 'http://localhost:3000'
        : 'app://./index.html';

    mainWindow.loadURL(startUrl);

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Create window when Electron is ready
app.whenReady().then(() => {
    // Serve production build via app:// so the renderer runs in a secure context (webcam works)
    if (!isDev) {
        const buildDir = path.resolve(__dirname, '..', 'build');
        protocol.registerFileProtocol('app', (request, callback) => {
            let pathname = new URL(request.url).pathname;
            if (pathname === '/' || pathname === '') pathname = '/index.html';
            const segments = pathname.split('/').filter(Boolean).map(seg => {
                try {
                    return decodeURIComponent(seg);
                } catch {
                    return seg;
                }
            });
            const filePath = path.resolve(path.join(buildDir, ...segments));
            const resolvedBuild = path.resolve(buildDir);
            if (filePath !== resolvedBuild && !filePath.startsWith(resolvedBuild + path.sep)) {
                callback({ error: -6 });
                return;
            }
            if (!fs.existsSync(filePath)) {
                callback({ error: -6 });
                return;
            }
            callback({ path: filePath });
        });
    }
    createWindow();
    
    // Add Unix signal handlers (after app.whenReady, only on non-Windows platforms)
    if (process.platform !== 'win32') {
        process.on('SIGTERM', async () => {
            await killAllProcesses();
            process.exit(0);
        });
        
        process.on('SIGINT', async () => {
            await killAllProcesses();
            process.exit(0);
        });
    }
});

// Before app.quit() handlers, add before-quit handler
app.on('before-quit', async (event) => {
    event.preventDefault();
    await killAllProcesses();
    // Use stored exitCode; only fall back to 0 when it was never set (avoids race with request-exit)
    const code = exitCode !== null && exitCode !== undefined ? exitCode : 0;
    app.exit(code);
});

// Quit when all windows are closed
app.on('window-all-closed', async () => {
    await killAllProcesses();
    // If no programmatic exit was requested, set exit code to 1 (user closed)
    if (!programmaticExit) {
        exitCode = 1;
        exitReason = 'user_closed';
    }
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC handlers (register after imports but before app.whenReady())
ipcMain.handle('execute-external-program', async (event, executablePath) => {
    try {
        // Check for .. in original path (before resolving)
        if (executablePath.includes('..')) {
            return { success: false, error: 'Path contains directory traversal' };
        }
        
        // Check file extension before normalization (for shell option)
        const needsShell = process.platform === 'win32' && 
            (executablePath.toLowerCase().endsWith('.bat') || 
             executablePath.toLowerCase().endsWith('.cmd'));
        
        // Normalize path
        const normalizedPath = path.normalize(executablePath);
        
        // Resolve symlinks (with error handling)
        let resolvedPath;
        try {
            resolvedPath = fs.realpathSync(normalizedPath);
        } catch (error) {
            return { success: false, error: `Cannot resolve path: ${error.message}` };
        }
        
        // Check file exists
        if (!fs.existsSync(resolvedPath)) {
            return { success: false, error: 'File does not exist' };
        }
        
        // Check resolved path is within whitelisted directories
        const isWithinWhitelist = ALLOWED_DIRECTORIES.some(allowedDir => {
            const resolvedDir = path.resolve(allowedDir);
            return resolvedPath.startsWith(resolvedDir + path.sep) || resolvedPath === resolvedDir;
        });
        if (!isWithinWhitelist) {
            return { success: false, error: 'Path is not within whitelisted directories' };
        }
        
        // Validate file extension (case-insensitive)
        const fileExt = path.extname(resolvedPath).toLowerCase();
        const allowedExts = ALLOWED_EXTENSIONS[process.platform].map(ext => ext.toLowerCase());
        if (!allowedExts.includes(fileExt)) {
            return { success: false, error: `File extension ${fileExt} is not allowed. Allowed: ${allowedExts.join(', ')}` };
        }
        
        // Spawn process (use resolvedPath)
        const proc = spawn(resolvedPath, [], {
            detached: true,
            stdio: 'ignore',
            shell: needsShell,
            windowsVerbatimArguments: false
        });
        
        // Register exit and error handlers immediately (before unref) to prevent race condition
        proc.on('exit', (code, signal) => {
            if (signal) {
                console.log(`Executable process ${proc.pid} exited with signal: ${signal}`);
            } else if (code !== null && code !== undefined) {
                if (code === 0) {
                    console.log(`Executable process ${proc.pid} exited successfully (code: ${code})`);
                } else {
                    console.warn(`Executable process ${proc.pid} exited with error code: ${code}`);
                }
            } else {
                console.log(`Executable process ${proc.pid} exited`);
            }
            activeProcesses.delete(proc.pid);
        });
        
        proc.on('error', (error) => {
            console.error('Executable spawn error:', error);
            activeProcesses.delete(proc.pid);
        });
        
        // Track in registry
        activeProcesses.set(proc.pid, proc);
        
        // Unref to prevent blocking
        proc.unref();
        
        return { success: true, pid: proc.pid };
    } catch (error) {
        console.error('Failed to execute program:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('check-file-exists', (event, filePath) => {
    try {
        return fs.existsSync(filePath);
    } catch {
        return false;
    }
});

ipcMain.handle('show-file-picker', async (event, defaultPath) => {
    // Defensive check: ensure mainWindow exists
    const window = mainWindow || BrowserWindow.getFocusedWindow();
    if (!window) {
        return null;
    }
    
    // Resolve relative paths to absolute using same appPath logic
    let absoluteDefaultPath = defaultPath || path.join(appPath, 'scripts');
    if (!path.isAbsolute(absoluteDefaultPath)) {
        absoluteDefaultPath = path.join(appPath, absoluteDefaultPath);
    }
    
    const result = await dialog.showOpenDialog(window, {
        title: 'Select Executable',
        defaultPath: absoluteDefaultPath,
        filters: [{
            name: 'Executables',
            extensions: ALLOWED_EXTENSIONS[process.platform].map(ext => ext.replace('.', ''))
        }],
        properties: ['openFile']
    });
    
    // Handle cancellation - return null if user canceled
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return null;
    }
    
    return result.filePaths[0]; // Return absolute path of selected file
});

ipcMain.handle('show-directory-picker', async (event, defaultPathOrOptions) => {
    const window = mainWindow || BrowserWindow.getFocusedWindow();
    if (!window) return null;

    let defaultPath = '';
    let title = 'Select capture output folder';
    if (defaultPathOrOptions && typeof defaultPathOrOptions === 'object') {
        defaultPath = typeof defaultPathOrOptions.defaultPath === 'string'
            ? defaultPathOrOptions.defaultPath
            : '';
        if (typeof defaultPathOrOptions.title === 'string' && defaultPathOrOptions.title.trim()) {
            title = defaultPathOrOptions.title.trim();
        }
    } else if (typeof defaultPathOrOptions === 'string') {
        defaultPath = defaultPathOrOptions;
    }

    let absoluteDefaultPath =
        typeof defaultPath === 'string' && defaultPath.trim() !== ''
            ? defaultPath.trim()
            : getDefaultExportDirectory();
    if (!path.isAbsolute(absoluteDefaultPath)) {
        absoluteDefaultPath = path.join(appPath, absoluteDefaultPath);
    }
    try {
        if (
            !fs.existsSync(absoluteDefaultPath) ||
            !fs.statSync(absoluteDefaultPath).isDirectory()
        ) {
            const parent = path.dirname(absoluteDefaultPath);
            absoluteDefaultPath =
                fs.existsSync(parent) && fs.statSync(parent).isDirectory()
                    ? parent
                    : getDefaultExportDirectory();
        }
    } catch {
        absoluteDefaultPath = getDefaultExportDirectory();
    }

    const result = await dialog.showOpenDialog(window, {
        title,
        defaultPath: absoluteDefaultPath,
        properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        return null;
    }
    return result.filePaths[0];
});

ipcMain.handle('show-save-dialog', async (event, options) => {
    const window = mainWindow || BrowserWindow.getFocusedWindow();
    if (!window) return null;

    const {
        title = 'Save Calibration',
        defaultFileName = 'calibration_data.json',
        defaultDirectory = getDefaultExportDirectory(),
        filters = [{ name: 'JSON', extensions: ['json'] }]
    } = options || {};

    const defaultPath = path.join(defaultDirectory, defaultFileName);

    const result = await dialog.showSaveDialog(window, {
        title,
        defaultPath,
        filters,
        properties: ['showOverwriteConfirmation']
    });

    if (result.canceled || !result.filePath) return null;
    return result.filePath;
});

/** Capture output directory: CLI --capture-output > level path > dirname(--output) > default export dir. */
function resolveCaptureOutputDirectory(levelCaptureOutputArg) {
    const c = cliConfig || {}
    if (c.captureOutput) return c.captureOutput
    if (levelCaptureOutputArg != null && String(levelCaptureOutputArg).trim() !== '') {
        const p = String(levelCaptureOutputArg).trim()
        return path.isAbsolute(p) ? p : resolvePath(p)
    }
    if (c.output) return path.dirname(c.output)
    return getDefaultExportDirectory()
}

// CLI Integration IPC Handlers
ipcMain.handle('get-cli-config', () => {
    return cliConfig;
});

ipcMain.handle('is-captures-cli-enabled', () => {
    return !!(cliConfig && cliConfig.enableCaptures === true)
})

ipcMain.handle('get-capture-output-path', (event, levelCaptureOutput) => {
    try {
        return resolveCaptureOutputDirectory(levelCaptureOutput)
    } catch (e) {
        console.error('get-capture-output-path:', e)
        return getDefaultExportDirectory()
    }
})

ipcMain.handle('save-capture-photo', async (event, uint8Array, filename, outputDir) => {
    try {
        const dir = outputDir || resolveCaptureOutputDirectory('')
        if (!dir) return { success: false, error: 'No output directory' }
        fs.mkdirSync(dir, { recursive: true })
        const filePath = path.join(dir, filename)
        fs.writeFileSync(filePath, Buffer.from(uint8Array))
        return { success: true, filePath }
    } catch (error) {
        console.error('save-capture-photo:', error)
        return { success: false, error: error.message }
    }
})

ipcMain.handle('save-capture-video', async (event, uint8Array, filename, outputDir) => {
    try {
        const dir = outputDir || resolveCaptureOutputDirectory('')
        if (!dir) return { success: false, error: 'No output directory' }
        fs.mkdirSync(dir, { recursive: true })
        const filePath = path.join(dir, filename)
        fs.writeFileSync(filePath, Buffer.from(uint8Array))
        return { success: true, filePath }
    } catch (error) {
        console.error('save-capture-video:', error)
        return { success: false, error: error.message }
    }
})

ipcMain.handle('write-session-results', async (event, filePath, data) => {
    try {
        const resolvedPath = resolvePath(filePath);
        const dir = path.dirname(resolvedPath);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Write JSON file with 2-space indentation
        fs.writeFileSync(resolvedPath, JSON.stringify(data, null, 2), 'utf8');
        return { success: true };
    } catch (error) {
        console.error('Failed to write session results:', error);
        return { success: false, error: error.message };
    }
});

function isSafeDirectoryBasename(filename) {
    if (typeof filename !== 'string' || !filename.trim()) return false;
    if (path.isAbsolute(filename)) return false;
    if (filename.includes('\0')) return false;
    const parsed = path.parse(filename);
    if (parsed.dir && parsed.dir !== '') return false;
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return false;
    return true;
}

ipcMain.handle('read-json-files-from-directory', async (event, dirPath) => {
    try {
        if (!dirPath || typeof dirPath !== 'string') {
            return { success: false, error: 'No directory' };
        }
        const resolved = path.resolve(dirPath);
        if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
            return { success: false, error: 'Not a directory' };
        }
        const names = fs.readdirSync(resolved);
        const files = [];
        const errors = [];
        for (const name of names) {
            if (!name.toLowerCase().endsWith('.json')) continue;
            if (!isSafeDirectoryBasename(name)) continue;
            const full = path.join(resolved, name);
            const rel = path.relative(resolved, full);
            if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) continue;
            try {
                if (!fs.statSync(full).isFile()) continue;
                files.push({ name, text: fs.readFileSync(full, 'utf8') });
            } catch (error) {
                errors.push({ name, error: error.message });
            }
        }
        return { success: true, files, errors };
    } catch (error) {
        console.error('Failed to read JSON files from directory:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('write-text-files-to-directory', async (event, dirPath, files) => {
    try {
        if (!dirPath || typeof dirPath !== 'string') {
            return { success: false, error: 'No directory' };
        }
        const resolved = path.resolve(dirPath);
        if (!fs.existsSync(resolved)) {
            fs.mkdirSync(resolved, { recursive: true });
        }
        if (!fs.statSync(resolved).isDirectory()) {
            return { success: false, error: 'Not a directory' };
        }
        const written = [];
        const errors = [];
        for (const file of files || []) {
            const filename = file?.filename;
            if (!isSafeDirectoryBasename(filename)) {
                errors.push({ filename, error: 'Invalid filename' });
                continue;
            }
            try {
                const full = path.join(resolved, filename);
                const rel = path.relative(resolved, full);
                if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
                    errors.push({ filename, error: 'Invalid filename' });
                    continue;
                }
                fs.writeFileSync(full, file.contents ?? '', 'utf8');
                written.push(filename);
            } catch (error) {
                errors.push({ filename, error: error.message });
            }
        }
        return { success: true, written, errors };
    } catch (error) {
        console.error('Failed to write text files to directory:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('write-binary-file', async (event, filePath, buffer) => {
    try {
        const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
        const dir = path.dirname(resolvedPath);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const nodeBuffer = Buffer.from(buffer);
        fs.writeFileSync(resolvedPath, nodeBuffer);
        return { success: true };
    } catch (error) {
        console.error('Failed to write binary file:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('request-exit', async (event, code, reason) => {
    // Set immediately before any await to avoid race with before-quit handler
    programmaticExit = true;
    exitCode = code;
    exitReason = reason;
    
    await killAllProcesses();
    
    // Use parameter directly for the actual exit
    app.exit(code);
});

ipcMain.handle('send-validation-results', async (event, results) => {
    // Validation results received - exit with appropriate code
    const code = results.valid ? 0 : 5;
    programmaticExit = true;
    exitCode = code;
    exitReason = results.valid ? 'validation_passed' : 'validation_failed';
    
    await killAllProcesses();
    app.exit(code);
});

ipcMain.handle('read-calibration-file', async (event, filePath) => {
    try {
        const resolvedPath = resolvePath(filePath);
        
        if (!fs.existsSync(resolvedPath)) {
            return { success: false, error: 'File does not exist' };
        }
        
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
        const data = JSON.parse(fileContent);
        return { success: true, data };
    } catch (error) {
        console.error('Failed to read calibration file:', error);
        return { success: false, error: error.message };
    }
});

// Create async cleanup function (activeProcesses already initialized at top level)
async function killAllProcesses() {
    const killPromises = Array.from(activeProcesses.entries()).map(async ([pid, proc]) => {
        try {
            if (!proc.killed) {
                // Use platform-specific signal: SIGKILL on Unix, undefined on Windows
                const killSignal = process.platform === 'win32' ? undefined : 'SIGKILL';
                proc.kill(killSignal);
                // Wait a moment to ensure kill is processed
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (error) {
            console.error(`Error killing process ${pid}:`, error);
        }
    });
    await Promise.all(killPromises);
    activeProcesses.clear();
}

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
    });
});

// Set application menu
const template = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Quit',
                accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                click: () => {
                    app.quit();
                }
            }
        ]
    },
    {
        label: 'Edit',
        submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' }
        ]
    },
    {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
        ]
    }
];

if (process.platform === 'darwin') {
    template.unshift({
        label: app.getName(),
        submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
        ]
    });
}

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu); 