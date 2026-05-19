const fs = require('fs')
const path = require('path')

// Path to the version file
const versionFilePath = path.join(__dirname, 'version.json')
const publicDirPath = path.join(__dirname, 'public')
const publicVersionFilePath = path.join(publicDirPath, 'version.json')

// Read the current version
let versionData
try {
    versionData = JSON.parse(fs.readFileSync(versionFilePath, 'utf8'))
} catch (error) {
    // Create default version if file doesn't exist
    versionData = { version: 1 }
}

// Increment revision if present, otherwise increment version
if (versionData.revision != null) {
    versionData.revision += 1
} else {
    versionData.version += 1
}

// Write back to the file
fs.writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2))

// Ensure public directory exists
if (!fs.existsSync(publicDirPath)) {
    fs.mkdirSync(publicDirPath, { recursive: true })
}

// Copy to public directory so it can be accessed by the app
fs.writeFileSync(publicVersionFilePath, JSON.stringify(versionData, null, 2))

const display = versionData.revision != null
    ? `${versionData.version}r${versionData.revision}`
    : versionData.version
console.log(`Version incremented to ${display}`) 