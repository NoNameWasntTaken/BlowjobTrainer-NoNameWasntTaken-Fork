import JSZip from 'jszip'

const isElectronDirectoryApi = () =>
    typeof window !== 'undefined' &&
    window.electronAPI &&
    typeof window.electronAPI.showDirectoryPicker === 'function' &&
    typeof window.electronAPI.readJsonFilesFromDirectory === 'function' &&
    typeof window.electronAPI.writeTextFilesToDirectory === 'function'

function isAbortError(error) {
    return error && (error.name === 'AbortError' || error.code === 20)
}

function isTopLevelJsonFile(file) {
    if (!file?.name || !String(file.name).toLowerCase().endsWith('.json')) return false
    const rel = file.webkitRelativePath || file.name
    const parts = String(rel).split(/[/\\]/).filter(Boolean)
    return parts.length <= 2
}

function pickFilesViaDirectoryInput() {
    return new Promise((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true
        input.accept = '.json,application/json'
        input.setAttribute('webkitdirectory', '')
        input.setAttribute('directory', '')
        const cleanup = () => {
            input.onchange = null
            input.oncancel = null
        }
        input.onchange = () => {
            const files = Array.from(input.files || []).filter(isTopLevelJsonFile)
            cleanup()
            resolve({ canceled: false, files })
        }
        input.addEventListener('cancel', () => {
            cleanup()
            resolve({ canceled: true, files: [] })
        })
        input.click()
    })
}

async function readFileAsText(file) {
    return file.text()
}

/**
 * Pick a directory and read top-level *.json files (non-recursive).
 * @param {{ title?: string }} [options]
 * @returns {Promise<{ canceled: true } | { canceled?: false, files: { name: string, text: string }[], errors: { name: string, error: string }[] }>}
 */
export async function pickAndReadLevelJsonDirectory(options = {}) {
    const title = options.title || 'Import custom levels'

    if (isElectronDirectoryApi()) {
        const dirPath = await window.electronAPI.showDirectoryPicker({ title })
        if (!dirPath) return { canceled: true }
        const result = await window.electronAPI.readJsonFilesFromDirectory(dirPath)
        if (!result?.success) {
            throw new Error(result?.error || 'Failed to read directory')
        }
        return {
            files: result.files || [],
            errors: result.errors || [],
        }
    }

    if (typeof window.showDirectoryPicker === 'function') {
        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'read' })
            const files = []
            const errors = []
            for await (const [name, handle] of dirHandle.entries()) {
                if (handle.kind !== 'file' || !name.toLowerCase().endsWith('.json')) continue
                try {
                    const file = await handle.getFile()
                    files.push({ name, text: await file.text() })
                } catch (error) {
                    errors.push({ name, error: error.message || 'Failed to read file' })
                }
            }
            return { files, errors }
        } catch (error) {
            if (isAbortError(error)) return { canceled: true }
            throw error
        }
    }

    const picked = await pickFilesViaDirectoryInput()
    if (picked.canceled) return { canceled: true }
    const files = []
    const errors = []
    for (const file of picked.files) {
        try {
            files.push({ name: file.name, text: await readFileAsText(file) })
        } catch (error) {
            errors.push({ name: file.name, error: error.message || 'Failed to read file' })
        }
    }
    return { files, errors }
}

/**
 * Pick a target directory and write text files into it.
 * Browser fallback: File System Access API, else a ZIP download of the same files.
 * @param {{ filename: string, contents: string }[]} files
 * @param {{ title?: string, zipName?: string }} [options]
 * @returns {Promise<{ canceled: true } | { success: boolean, written: string[], errors: { filename: string, error: string }[], directory?: string, zipDownloaded?: boolean }>}
 */
export async function pickDirectoryAndWriteLevelFiles(files, options = {}) {
    const title = options.title || 'Export custom levels'
    const zipName = options.zipName || 'custom-levels.zip'

    if (isElectronDirectoryApi()) {
        const dirPath = await window.electronAPI.showDirectoryPicker({ title })
        if (!dirPath) return { canceled: true }
        const result = await window.electronAPI.writeTextFilesToDirectory(dirPath, files)
        if (!result?.success) {
            throw new Error(result?.error || 'Failed to write files')
        }
        return {
            success: true,
            written: result.written || [],
            errors: result.errors || [],
            directory: dirPath,
        }
    }

    if (typeof window.showDirectoryPicker === 'function') {
        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
            const written = []
            const errors = []
            for (const file of files) {
                try {
                    const fh = await dirHandle.getFileHandle(file.filename, { create: true })
                    const writable = await fh.createWritable()
                    await writable.write(file.contents ?? '')
                    await writable.close()
                    written.push(file.filename)
                } catch (error) {
                    errors.push({
                        filename: file.filename,
                        error: error.message || 'Failed to write file',
                    })
                }
            }
            return { success: true, written, errors, directory: dirHandle.name }
        } catch (error) {
            if (isAbortError(error)) return { canceled: true }
            throw error
        }
    }

    const zip = new JSZip()
    for (const file of files) {
        zip.file(file.filename, file.contents ?? '')
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = zipName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return {
        success: true,
        written: files.map((f) => f.filename),
        errors: [],
        zipDownloaded: true,
    }
}
