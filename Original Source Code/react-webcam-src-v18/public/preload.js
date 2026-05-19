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
    }
}); 