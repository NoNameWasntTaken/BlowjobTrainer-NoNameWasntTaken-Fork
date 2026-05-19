// import Webcam from 'react-webcam';
import React, { useEffect } from 'react';
import './App.css';
// components
import WebcamComponent from './components/Webcam/WebcamComponent';
import CameraToggle from './components/Webcam/CameraToggle';
import MirrorToggle from './components/MirrorToggle';
import AudioPlayer from './components/AudioPlayer';
import Navigation from './components/Navigation';
import Calibration from './components/Calibration/Calibration';
import Training from './components/Training/Training';
import Playing from './components/Playing/Playing';
import Cylinder from './components/Cylinder/Cylinder';
import Gameover from './components/Gameover/Gameover';
import Achievements from './components/Achievements/Achievements';
import Instructions from './components/Instructions/Instructions';
import DebugStateSlider from './components/Debug/DebugStateSlider';
import AudioTest from './components/AudioTest';
import Version from './components/Version';
import Mic from './components/Mic/Mic';
import ButtplugComponent from './components/Buttplug/ButtplugComponent';
import LevelEditor from './components/LevelEditor/LevelEditor';
import AudioPackEditor from './components/AudioPackEditor/AudioPackEditor';
import ContentLibrary from './components/ContentLibrary/ContentLibrary';

// atoms
import { useAtomValue, useSetAtom } from 'jotai';
import { navAtom } from './atoms/navAtom';
import { cameraEnabledAtom } from './atoms/cameraAtom';
import { mirrorModeAtom } from './atoms/mirrorModeAtom';
import { effectiveMirrorAtom } from './atoms/mirrorModeAtom';
import * as NAV from './atoms/navAtom';
import { audioManager } from './services/audioManager';
import { externalIntegrationService } from './services/externalIntegrationService';
import { externalModeAtom } from './atoms/externalModeAtom';
import { currentLevelAtom, playStateAtom, PlayState } from './atoms/taskAtom';
import { levelManager } from './services/levelManager';
import { calibrationService } from './services/calibrationService';
import { preflightService } from './services/preflightService';
import { validationService } from './services/validationService';
import { getRandomInt } from './components/randomInt';
import CalibrationTimer from './components/ExternalMode/CalibrationTimer';
import PauseTimer from './components/ExternalMode/PauseTimer';
import HeadlessWrapper from './components/ExternalMode/HeadlessWrapper';
import { initializeGrids } from './utils/gridMigration';
import { store } from './store';
import { selectedGridIdAtom, gridsAtom } from './atoms/gridAtoms';

export const DEBUG = false

function App() {
  // this is our navigation state
  const nav = useAtomValue(navAtom);
  const cameraEnabled = useAtomValue(cameraEnabledAtom);
  const effectiveMirror = useAtomValue(effectiveMirrorAtom);
  const setNav = useSetAtom(navAtom);
  const setMirrorEnabled = useSetAtom(mirrorModeAtom);
  const setExternalMode = useSetAtom(externalModeAtom);
  const setCameraEnabled = useSetAtom(cameraEnabledAtom);
  const setCurrentLevel = useSetAtom(currentLevelAtom);
  const setPlayState = useSetAtom(playStateAtom);
  const [loadingState, setLoadingState] = React.useState('initializing');
  const [preflightError, setPreflightError] = React.useState(null);

  // Initialize grid system (must run before other effects)
  useEffect(() => {
    initializeGrids()
  }, [])

  // Switch to "All Grids" when entering Play so all grids are counted (multi-grid levels)
  useEffect(() => {
    if (nav !== NAV.PLAYING) return
    const grids = store.get(gridsAtom)
    if (Array.isArray(grids) && grids.length > 1) {
      store.set(selectedGridIdAtom, null)
    }
  }, [nav])

  // Validate active pack exists on app load
  useEffect(() => {
    audioManager.validateActivePack()
  }, [])

  // Initialize external mode on mount
  useEffect(() => {
    async function initializeExternalMode() {
      try {
        // Get CLI config using hybrid approach
        const config = await externalIntegrationService.getCLIConfig();
        
        // Initialize mirror mode from CLI (user can still toggle in UI)
        if (config?.mirror === true) {
          setMirrorEnabled(true);
        }
        
        if (!config || !externalIntegrationService.isExternalMode()) {
          // Not in external mode - normal operation
          setLoadingState('ready');
          return;
        }

        // Set external mode atom
        setExternalMode(config);

        // In headless mode, always enable camera (needed for tracking without visible UI)
        if (externalIntegrationService.isHeadlessMode()) {
          setCameraEnabled(true);
        }

        // Handle validation mode
        if (externalIntegrationService.isValidationMode()) {
          setLoadingState('validating');
          const levelId = externalIntegrationService.getValidationLevelId();
          const validationResult = await validationService.validateLevelWithPack(levelId);
          
          // Send results via IPC
          if (window.electronAPI && window.electronAPI.sendValidationResults) {
            await window.electronAPI.sendValidationResults({
              valid: validationResult.valid,
              levelId: levelId,
              errors: validationResult.errors,
              warnings: validationResult.warnings,
              packExists: validationResult.packExists || false
            });
          }
          return;
        }

        // Handle calibration-only mode
        if (externalIntegrationService.isCalibrationOnlyMode()) {
          setLoadingState('ready');
          
          // Load calibration data if provided
          const calibrationPath = externalIntegrationService.getCalibrationDataPath();
          if (calibrationPath && window.electronAPI && window.electronAPI.readCalibrationFile) {
            const result = await window.electronAPI.readCalibrationFile(calibrationPath);
            if (result.success && result.data) {
              const importResult = calibrationService.importCalibration(result.data);
              if (!importResult.success) {
                console.error('Failed to import calibration data:', importResult.errors);
              }
            }
          }
          
          // Navigate to calibration
          setNav(NAV.CALIBRATE);
          return;
        }

        // Handle single level mode
        const levelId = externalIntegrationService.getLevelId();
        if (levelId) {
          setLoadingState('checking');
          
          // Run pre-flight checks
          const level = levelManager.getLevel(levelId);
          if (!level) {
            setPreflightError(`Level "${levelId}" not found`);
            setLoadingState('error');
            // Show error and exit
            setTimeout(() => {
              if (window.electronAPI && window.electronAPI.requestExit) {
                window.electronAPI.requestExit(4, 'level_not_found');
              }
            }, 3000);
            return;
          }

          const checks = await preflightService.runAllChecks({
            level: level,
            calibrationData: null // Will be loaded separately
          });

          if (!checks.passed) {
            const errors = [];
            if (checks.results.levelStructure && !checks.results.levelStructure.valid) {
              errors.push(...checks.results.levelStructure.errors);
            }
            setPreflightError(errors.join(', '));
            setLoadingState('error');
            setTimeout(() => {
              if (window.electronAPI && window.electronAPI.requestExit) {
                window.electronAPI.requestExit(5, 'preflight_check_failed');
              }
            }, 3000);
            return;
          }

          // Add a small delay to ensure webcam stream is fully released after pre-flight check
          await new Promise(resolve => setTimeout(resolve, 100));

          setLoadingState('loading');

          // Load calibration data if provided
          const calibrationPath = externalIntegrationService.getCalibrationDataPath();
          let calibrationData = null;
          if (calibrationPath && window.electronAPI && window.electronAPI.readCalibrationFile) {
            const result = await window.electronAPI.readCalibrationFile(calibrationPath);
            if (result.success && result.data) {
              calibrationData = result.data;
              
              // Apply immediately if skip-calibration
              if (externalIntegrationService.shouldSkipCalibration()) {
                calibrationService.applyCalibration(calibrationData);
              }
            }
          }

          // Initialize level with proper structure (matching handleBeginLevel)
          const initializedLevel = {
            id: level.id,
            status: 'idle',
            startTime: null,
            totalTime: 0,
            soft: level.soft ?? false,
            currentScore: 0,
            tasks: (level.tasks || []).map(task => ({
              ...task,
              id: task.id || getRandomInt()
            })),
            currentTask: null,
            completedTasks: [],
            milestones: {},
            taskScores: {},
            metrics: {}
          };
          setCurrentLevel(initializedLevel);

          // Configure audio pack according to priority logic
          let audioPackId = null;
          
          // Priority 1: Level's audioPackId (if exists and pack found)
          if (level.audioPackId) {
            const pack = audioManager.loadPack(level.audioPackId);
            if (pack) {
              audioPackId = level.audioPackId;
            }
          }
          
          // Priority 2: CLI --audio-pack (if provided)
          if (!audioPackId) {
            audioPackId = externalIntegrationService.getAudioPackId();
          }
          
          // Priority 3: Default pack (fallback - handled by audioManager)
          
          // Set audio pack (await async operation)
          if (audioPackId) {
            await audioManager.setActiveCustomPack(audioPackId);
          } else {
            await audioManager.setActiveCustomPack(null);
          }

          // Apply calibration data if not already applied and calibration is required
          if (calibrationData && !externalIntegrationService.shouldSkipCalibration()) {
            // Apply the preloaded calibration data so it's available when navigating to CALIBRATE
            calibrationService.applyCalibration(calibrationData);
          }

          setLoadingState('ready');

          // Set navigation state based on skip-calibration and headless
          const skipCalibration = externalIntegrationService.shouldSkipCalibration();
          const isHeadless = externalIntegrationService.isHeadlessMode();

          if (skipCalibration) {
            // Navigate to PLAYING immediately - level is already initialized
            // In headless mode, also set playState to PLAYING to trigger auto-start
            if (isHeadless) {
              setPlayState(PlayState.PLAYING);
            }
            setNav(NAV.PLAYING);
          } else {
            // Navigate to CALIBRATE (immediately start calibration)
            setNav(NAV.CALIBRATE);
          }
        }
      } catch (error) {
        console.error('Error initializing external mode:', error);
        setPreflightError(error.message);
        setLoadingState('error');
      }
    }

    initializeExternalMode();
  }, [setExternalMode, setNav, setCurrentLevel, setPlayState, setCameraEnabled, setMirrorEnabled])

  function renderControls() {
    switch (nav) {
      case NAV.CALIBRATE:
        return <Calibration />
      case NAV.TRAINING:
        return <Training />
      case NAV.PLAYING:
        return <Playing />
      case NAV.GAMEOVER:
        return <Gameover />
      case NAV.ACHIEVEMENTS:
        return <Achievements />
      case NAV.INSTRUCTIONS:
        return <Instructions />
      case NAV.MIC:
        return <Mic />
      case NAV.BUTTPLUG:
        return <ButtplugComponent />
      case NAV.LEVEL_EDITOR:
        return <LevelEditor />
      case NAV.AUDIO_PACK_EDITOR:
        return <AudioPackEditor />
      case NAV.CONTENT_LIBRARY:
        return <ContentLibrary />
      // Add more cases as needed for different states
      default:
        return null;
    }
  }

  console.log("app");

  // return <CircularCountdown duration={10000} />

  // Show loading state during initialization
  if (loadingState === 'initializing' || loadingState === 'checking' || loadingState === 'loading') {
    return (
      <div className="App">
        <div className="container">
          <div className="row-centered" style={{ marginTop: '50px' }}>
            <h2>Loading...</h2>
          </div>
          {loadingState === 'checking' && (
            <div className="row-centered">
              <p>Running pre-flight checks...</p>
            </div>
          )}
          {loadingState === 'loading' && (
            <div className="row-centered">
              <p>Loading level and configuration...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show error state
  if (loadingState === 'error' && preflightError) {
    return (
      <div className="App">
        <div className="container">
          <div className="row-centered" style={{ marginTop: '50px' }}>
            <h2 style={{ color: 'red' }}>Error</h2>
          </div>
          <div className="row-centered">
            <p>{preflightError}</p>
          </div>
        </div>
      </div>
    );
  }

  const isHeadless = externalIntegrationService.isHeadlessMode();
  const isExternalMode = externalIntegrationService.isExternalMode();

  // Camera always on during play flow: playing, paused, game over
  const showCamera = nav !== NAV.ACHIEVEMENTS && nav !== NAV.LEVEL_EDITOR &&
    (nav === NAV.PLAYING || nav === NAV.GAMEOVER || cameraEnabled);
  const showCameraArea = nav !== NAV.ACHIEVEMENTS && nav !== NAV.LEVEL_EDITOR;
  const showCameraToggle = nav !== NAV.PLAYING && nav !== NAV.GAMEOVER;

  return (
    <div className="App">
      {/* <div className="debug-state-display">
        <pre>{JSON.stringify(currentState, null, 2)}</pre>
      </div> */}
      <div className="container">
        {/* Hide navigation in headless mode */}
        {!isHeadless && <Navigation />}
        {/* Show timers in external mode */}
        {isExternalMode && <CalibrationTimer />}
        {isExternalMode && <PauseTimer />}
        {/* Debug state slider component */}
        {DEBUG && <DebugStateSlider />}
        {/* Camera area: feed or placeholder, with toggle underneath */}
        {!DEBUG && showCameraArea && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '8px',
            transform: effectiveMirror ? 'scaleX(-1)' : 'none',
            width: '100%'
          }}>
            {showCamera ? (
              <WebcamComponent />
            ) : (
              <>
                <div
                  style={{
                    padding: '40px 60px',
                    color: '#888',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    marginBottom: '8px'
                  }}
                >
                  Camera is off
                </div>
                {showCameraToggle && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <CameraToggle />
                    <MirrorToggle />
                  </div>
                )}
              </>
            )}
          </div>
        )}
        {/* {!DEBUG && nav !== NAV.ACHIEVEMENTS && <MarkerPreviews />} */}
        {nav !== NAV.ACHIEVEMENTS && (
          <div style={{
            transform: effectiveMirror ? 'scaleX(-1)' : 'none',
            width: '100%'
          }}>
            <Cylinder />
          </div>
        )}
        <AudioPlayer />

        <HeadlessWrapper>
          <div style={{
            transform: effectiveMirror ? 'scaleX(-1)' : 'none',
            width: '100%'
          }}>
            {renderControls()}
          </div>
        </HeadlessWrapper>

        {DEBUG && <AudioTest />}
      </div>
      <Version />
    </div>
  );
}

export default App;


// State system
// 0 - placing 4 markers
// 1 - calibration, waiting to lock in the base colors
// 2 - training