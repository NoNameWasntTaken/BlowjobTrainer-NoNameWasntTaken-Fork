const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    name: 'React Webcam',
    executableName: 'react-webcam',
    asar: true,
    icon: './public/logo512', // Without extension - Forge will add .icns/.ico/.png
    appBundleId: 'com.reactwebcam.app',
    appCategoryType: 'public.app-category.utilities',
    osxSign: false, // Set to true if you have code signing certificates
    osxNotarize: false, // Set to true if you have notarization setup
    // Include scripts folder in the package
    extraResource: [
      './scripts'
    ],
    // macOS entitlements for camera and microphone
    osxEntitlements: './entitlements.plist',
    // macOS Info.plist entries for permission usage descriptions
    extendInfo: {
      NSCameraUsageDescription: 'This app needs access to your camera to display webcam feed for calibration and gameplay.',
      NSMicrophoneUsageDescription: 'This app needs access to your microphone for audio features and clap detection.',
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'react-webcam',
        iconUrl: './public/logo512.ico',
        setupIcon: './public/logo512.ico',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        name: 'React Webcam',
        format: 'UDZO', // Compressed DMG
      },
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Anonymous',
          homepage: 'https://example.com',
        },
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          maintainer: 'Anonymous',
          homepage: 'https://example.com',
        },
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
