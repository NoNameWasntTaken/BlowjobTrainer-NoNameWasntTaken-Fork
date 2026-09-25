/**
 * Executable Service - Manages execution of external programs during gameplay
 * Works only in Electron environment
 */
class ExecutableService {
    constructor() {
        this.isElectron = typeof window !== 'undefined' && 
                         window.electronAPI && 
                         typeof window.electronAPI.executeExternalProgram === 'function';
    }

    get supportsDirectoryPicker() {
        return (
            typeof window !== 'undefined' &&
            !!window.electronAPI &&
            typeof window.electronAPI.showDirectoryPicker === 'function'
        );
    }
    
    /**
     * Execute an external program (non-blocking)
     * @param {string} executablePath - Path to executable file
     * @returns {Promise<{success: boolean, error?: string, pid?: number}>}
     */
    async execute(executablePath) {
        if (!executablePath || executablePath.trim() === '') {
            return { success: false, error: 'No executable path provided' };
        }
        
        if (!this.isElectron) {
            console.warn('Executable execution only available in Electron environment');
            return { success: false, error: 'Not available in browser' };
        }
        
        try {
            const result = await window.electronAPI.executeExternalProgram(executablePath);
            
            if (!result.success) {
                console.error('Failed to execute program:', result.error);
            }
            
            return result;
        } catch (error) {
            console.error('Executable execution error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Test if executable exists (for editor)
     * @param {string} executablePath - Path to executable file
     * @returns {Promise<boolean>}
     */
    async testExists(executablePath) {
        if (!this.isElectron) {
            return false;
        }
        
        try {
            return await window.electronAPI.checkFileExists(executablePath);
        } catch {
            return false;
        }
    }
    
    /**
     * Native folder picker (Electron). Returns absolute path or null if canceled/unavailable.
     * @param {string|{ defaultPath?: string, title?: string }} [defaultPathOrOptions]
     */
    async pickDirectory(defaultPathOrOptions) {
        if (!this.supportsDirectoryPicker) {
            return null;
        }
        try {
            const arg =
                defaultPathOrOptions && typeof defaultPathOrOptions === 'object'
                    ? defaultPathOrOptions
                    : (defaultPathOrOptions ?? '');
            return await window.electronAPI.showDirectoryPicker(arg);
        } catch (error) {
            console.error('Directory picker error:', error);
            return null;
        }
    }

    /**
     * Show file picker dialog to select executable
     * @param {string} defaultPath - Default path (can be relative or absolute)
     * @returns {Promise<string|null>} - Selected path or null if canceled
     */
    async pickExecutable(defaultPath) {
        if (!this.isElectron) {
            return null;
        }
        
        try {
            // Main process handles relative path resolution
            return await window.electronAPI.showExecutablePicker(defaultPath);
        } catch (error) {
            console.error('File picker error:', error);
            return null;
        }
    }
}

export const executableService = new ExecutableService();
