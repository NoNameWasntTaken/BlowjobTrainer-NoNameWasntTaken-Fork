import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'jotai';
import { store } from './store';
import { playerProfilesAtom } from './atoms/playerAtom';
import { subscribePlayerProfilesCrossTab } from './storage/playerProfilesStorage';
// import './css/normalize.css';
// import './css/skeleton.css';
import './css/skeleton-light.css';
import './css/typography.css';
import './css/markers.css';
import './css/index.css';
import './css/score.css';
import './css/editor.css';
import App from './App';

subscribePlayerProfilesCrossTab(store, playerProfilesAtom);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider store={store}>
    {/* <React.StrictMode> */}
    <App />
    {/* </React.StrictMode> */}
  </Provider>
);

