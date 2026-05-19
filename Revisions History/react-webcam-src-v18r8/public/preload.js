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
    
    // CLI Integration APIs
    getCLIConfig: () => 
        ipcRenderer.invoke('get-cli-config'),
    writeSessionResults: (filePath, data) => 
        ipcRenderer.invoke('write-session-results', filePath, data),
    showCalibrationSaveDialog: (options) => 
        ipcRenderer.invoke('show-save-dialog', options),
    requestExit: (exitCode, reason) => 
        ipcRenderer.invoke('request-exit', exitCode, reason),
    sendValidationResults: (results) => 
        ipcRenderer.invoke('send-validation-results', results),
    readCalibrationFile: (filePath) => 
        ipcRenderer.invoke('read-calibration-file', filePath),
}); 