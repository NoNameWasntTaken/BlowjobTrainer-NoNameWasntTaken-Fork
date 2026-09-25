/**
 * Audio Pack Export Service
 * In Electron: shows save dialog, writes ZIP via IPC.
 * In browser: returns blob for component to trigger download.
 */

const isElectron = () =>
    typeof window !== 'undefined' &&
    window.electronAPI &&
    typeof window.electronAPI.showSaveDialog === 'function' &&
    typeof window.electronAPI.writeBinaryFile === 'function';

/**
 * Export audio pack ZIP to file.
 * In Electron: shows native save dialog and writes file via IPC.
 * In browser: returns blob for component to trigger download.
 *
 * @param {Blob} zipBlob - The ZIP blob from audioManager.exportPack()
 * @param {string} defaultFileName - e.g. "My Pack.zip"
 * @returns {Promise<{ success: boolean, canceled?: boolean, error?: string, blob?: Blob }>}
 */
export async function exportAudioPackToFile(zipBlob, defaultFileName) {
    if (isElectron()) {
        const outputPath = await window.electronAPI.showSaveDialog({
            title: 'Export Audio Pack',
            defaultFileName: defaultFileName || 'audio-pack.zip',
            filters: [{ name: 'ZIP', extensions: ['zip'] }]
        });

        if (!outputPath) {
            return { success: false, canceled: true };
        }

        const arrayBuffer = await zipBlob.arrayBuffer();
        const result = await window.electronAPI.writeBinaryFile(outputPath, arrayBuffer);

        if (result.success) {
            return { success: true };
        }
        return { success: false, error: result.error || 'Export failed' };
    }

    // Browser: return blob for component to handle
    return { success: true, blob: zipBlob };
}
