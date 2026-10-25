// The page: a full-bleed three.js stage with the React HUD floating on top.
import { useEffect, useRef, useState } from 'react';
import { useStore } from './state/store.js';
import { GameContext } from './game-context.js';
import { WeatherCard, PlayerCard, Tracker, TopBar, Help, Prompts, Dock, Minimap, Toast, PhotoExit, MapHud, TimeCard } from './components/Hud.jsx';
import { Panel } from './components/Panel.jsx';
import { DialogueBox } from './components/DialogueBox.jsx';
import { StartScreen, QuickView } from './components/Screens.jsx';

export default function App() {
  const stage = useRef(null), vignette = useRef(null), flash = useRef(null), hovertip = useRef(null), minimap = useRef(null);
  const [api, setApi] = useState(null);
  const photo = useStore(s => s.photo), panel = useStore(s => s.panelId), talking = useStore(s => !!s.dialogue), map = useStore(s => s.overview), story = useStore(s => !!s.story);
  useEffect(() => {
    let alive = true;
    // the engine (and three.js) load as their own chunk, so the start screen shows right away
    import('./game/engine.js')
      .then(m => m.createGame({ stage: stage.current, vignette: vignette.current, flash: flash.current, hovertip: hovertip.current, minimap: minimap.current }))
      .then(a => { if (alive) setApi(a); })
      .catch(err => console.error('Quest Town failed to start', err));
    return () => { alive = false; };
  }, []);
  const cls = [photo && 'photo', panel && 'app-panel-open', talking && 'app-dialogue', map && 'app-overview', story && 'app-story'].filter(Boolean).join(' ');
  return (
    <GameContext.Provider value={api}>
      <div id="app" className={cls}>
        <div id="stage" ref={stage} aria-label="3D town with Henry's portfolio" />
        <div id="vignette" ref={vignette} aria-hidden="true" />
        <div id="flash" ref={flash} aria-hidden="true" />
        <WeatherCard />
        <PlayerCard />
        <Tracker />
        <TopBar />
        <Help />
        <TimeCard />
        <Prompts />
        <Dock />
        <Minimap canvasRef={minimap} />
        <MapHud />
        <Panel />
        <DialogueBox />
        <div className="hovertip" ref={hovertip} hidden />
        <PhotoExit />
        <Toast />
        <StartScreen />
        <QuickView />
      </div>
    </GameContext.Provider>
  );
}
