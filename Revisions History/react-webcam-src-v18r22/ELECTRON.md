# Electron Setup

This project has been configured to build desktop applications using Electron for Windows and macOS (ARM64).

## Development

### Prerequisites
- Node.js 18.x or higher
- npm

### Local Development
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server with Electron:
   ```bash
   npm run electron-dev
   ```
   This will start both the React development server and Electron app.

### Building Locally
- Build for all platforms: `npm run electron-pack`
- Build for Windows only: `npm run electron-pack-win`
- Build for macOS only: `npm run electron-pack-mac`

## GitHub Actions

The project uses GitHub Actions to automatically build Electron apps for Windows and macOS when:
- Code is pushed to `main` or `master` branch
- A pull request is created
- A release is published

### Build Artifacts
- Windows builds are uploaded as `react-webcam-windows` artifacts
- macOS builds are uploaded as `react-webcam-macos` artifacts
- When a release is published, the built apps are automatically attached to the release

### Build Configuration
- **Windows**: NSIS installer (.exe)
- **macOS**: DMG installer (ARM64 only)
- **Output directory**: `dist/`

## Security Features
- Context isolation enabled
- Node integration disabled
- Web security enabled
- Preload script for secure API access
- Menu with standard desktop app options

## File Structure
- `public/electron.js` - Main Electron process
- `public/preload.js` - Preload script for secure renderer communication
- `.github/workflows/electron-build.yml` - GitHub Actions workflow
- `package.json` - Electron configuration and build scripts

## Troubleshooting

### Common Issues
1. **Build fails on macOS**: Ensure you're building on an ARM64 Mac or using GitHub Actions
2. **Webcam not working**: Check that the app has camera permissions
3. **Audio issues**: Verify audio permissions and device access

### Development Tips
- Use `npm run electron-dev` for development with hot reload
- Check the Electron DevTools for debugging
- The app runs on `http://localhost:3000` in development mode 