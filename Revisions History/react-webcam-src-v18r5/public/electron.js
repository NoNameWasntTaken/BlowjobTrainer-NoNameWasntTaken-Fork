const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
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

function parseCLIArguments() {
    const args = process.argv.slice(2);
    const config = {
        level: null,
        calibrationData: null,
        skipCalibration: false,
        calibrateOnly: false,
        calibrationTime: -1,
        pauseTime: -1,
        audioPack: null,
        headless: false,
        output: null,
        validateLevel: null
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
            case '--headless':
                config.headless = true;
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
        }
    }

    return config;
}

function validateCLIArguments(config) {
    const errors = [];

    // --level and --calibrate-only are mutually exclusive
    if (config.level && config.calibrateOnly) {
        errors.push('--level and --calibrate-only cannot be used together');
    }

    // --skip-calibration requires --calibration-data
    if (config.skipCalibration && !config.calibrationData) {
        errors.push('--skip-calibration requires --calibration-data parameter');
    }

    // --validate-level cannot be combined with other run modes
    if (config.validateLevel) {
        if (config.level || config.calibrateOnly) {
            errors.push('--validate-level cannot be combined with other run modes');
        }
    }

    // --headless requires --skip-calibration
    if (config.headless && !config.skipCalibration) {
        errors.push('--headless requires --skip-calibration');
    }

    // Time values must be integers >= -1
    if (config.calibrationTime < -1 || !Number.isInteger(config.calibrationTime)) {
        errors.push('--calibration-time must be an integer >= -1');
    }
    if (config.pauseTime < -1 || !Number.isInteger(config.pauseTime)) {
        errors.push('--pause-time must be an integer >= -1');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function getCLIConfig() {
    return cliConfig;
}

// Parse CLI arguments at module load time (before app.whenReady())
const parsedConfig = parseCLIArguments();
const validation = validateCLIArguments(parsedConfig);
if (validation.valid) {
    cliConfig = parsedConfig;
} else {
    console.error('CLI argument validation failed:', validation.errors);
    // Still set config but mark as invalid - will be handled by renderer
    cliConfig = { ...parsedConfig, _validationErrors: validation.errors };
}

function createWindow() {
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

    // Load the app
    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../build/index.html')}`;

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
    app.exit(0);
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

// CLI Integration IPC Handlers
ipcMain.handle('get-cli-config', () => {
    return cliConfig;
});

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

ipcMain.handle('request-exit', async (event, code, reason) => {
    programmaticExit = true;
    exitCode = code;
    exitReason = reason;
    
    // Perform cleanup
    await killAllProcesses();
    
    // Exit with code
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