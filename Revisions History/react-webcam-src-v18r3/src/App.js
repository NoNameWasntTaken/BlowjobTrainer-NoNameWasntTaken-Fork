// import Webcam from 'react-webcam';
import React, { useEffect } from 'react';
import './App.css';
// components
import WebcamComponent from './components/Webcam/WebcamComponent';
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
import NumberControl from './components/NumberControl';
import ButtplugComponent from './components/Buttplug/ButtplugComponent';
import LevelEditor from './components/LevelEditor/LevelEditor';
import AudioPackEditor from './components/AudioPackEditor/AudioPackEditor';
import ContentLibrary from './components/ContentLibrary/ContentLibrary';

// atoms
import { useAtom, useAtomValue } from 'jotai';
import { navAtom } from './atoms/navAtom';
import * as NAV from './atoms/navAtom';
import RGBControl from './components/RGBControl';
import { audioManager } from './services/audioManager';

export const DEBUG = false

function App() {
  // this is our navigation state
  const nav = useAtomValue(navAtom);

  // Validate active pack exists on app load
  useEffect(() => {
    audioManager.validateActivePack()
  }, [])

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

  return (
    <div className="App">
      {/* <div className="debug-state-display">
        <pre>{JSON.stringify(currentState, null, 2)}</pre>
      </div> */}
      <div className="container">
        <Navigation />
        {/* Debug state slider component */}
        {DEBUG && <DebugStateSlider />}
        {/* Normal webam use */}
        {!DEBUG && nav !== NAV.ACHIEVEMENTS && nav !== NAV.LEVEL_EDITOR && <WebcamComponent />}
        {/* {!DEBUG && nav !== NAV.ACHIEVEMENTS && <MarkerPreviews />} */}
        {nav !== NAV.ACHIEVEMENTS && <Cylinder />}
        <AudioPlayer />

        {renderControls()}

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