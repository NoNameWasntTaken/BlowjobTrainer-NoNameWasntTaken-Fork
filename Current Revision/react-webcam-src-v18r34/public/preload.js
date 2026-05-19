const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Add any specific APIs you need here
    // For example, if you need to access file system or other Node.js APIs:

    // Example: Get app version
    getVersion: () => process.versions.electron,

    // Example: Platform info
    getPlatform: () => process.platform,

    // Example: IPC communication (if needed)
    sendMessage: (channel, data) => {
        // Whitelist channels
        const validChannels = ['toMain'];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },

    receive: (channel, func) => {
        const validChannels = ['fromMain'];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender` 
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        }
    },

    // Executable management APIs
    executeExternalProgram: (executablePath) => 
        ipcRenderer.invoke('execute-external-program', executablePath),
    checkFileExists: (filePath) => 
        ipcRenderer.invoke('check-file-exists', filePath),
    showExecutablePicker: (defaultPath) => 
        ipcRenderer.invoke('show-file-picker', defaultPath),  // defaultPath can be relative or absolute - main process will resolve
    /** Native folder picker; returns absolute path or null when canceled/unavailable */
    showDirectoryPicker: (defaultPath) =>
        ipcRenderer.invoke('show-directory-picker', defaultPath),

    // CLI Integration APIs
    getShowHiddenSync: () =>
        ipcRenderer.sendSync('get-show-hidden-sync'),
    isPackagedSync: () =>
        ipcRenderer.sendSync('is-packaged-sync'),
    getCLIConfig: () => 
        ipcRenderer.invoke('get-cli-config'),
    writeSessionResults: (filePath, data) => 
        ipcRenderer.invoke('write-session-results', filePath, data),
    showCalibrationSaveDialog: (options) => 
        ipcRenderer.invoke('show-save-dialog', options),
    showSaveDialog: (options) => 
        ipcRenderer.invoke('show-save-dialog', options),
    writeBinaryFile: (filePath, buffer) => 
        ipcRenderer.invoke('write-binary-file', filePath, buffer),
    requestExit: (exitCode, reason) => 
        ipcRenderer.invoke('request-exit', exitCode, reason),
    sendValidationResults: (results) => 
        ipcRenderer.invoke('send-validation-results', results),
    readCalibrationFile: (filePath) => 
        ipcRenderer.invoke('read-calibration-file', filePath),
    isCapturesCLIEnabled: () =>
        ipcRenderer.invoke('is-captures-cli-enabled'),
    getCaptureOutputPath: (levelCaptureOutput) =>
        ipcRenderer.invoke('get-capture-output-path', levelCaptureOutput),
    saveCapturePhoto: (uint8Array, filename, outputDir) =>
        ipcRenderer.invoke('save-capture-photo', uint8Array, filename, outputDir),
    saveCaptureVideo: (uint8Array, filename, outputDir) =>
        ipcRenderer.invoke('save-capture-video', uint8Array, filename, outputDir),
}); 