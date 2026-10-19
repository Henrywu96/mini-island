// The game overlay: weather card, player card, quest log, world controls, help, prompts, emote dock,
// minimap, toast and the photo-mode exit button. Everything reads from the store and calls the engine.
import { useEffect, useRef } from 'react';
import { useStore, store } from '../state/store.js';
import { useGame } from '../game-context.js';
import { STATIONS, INTERACTIONS } from '../data/world.js';
import { TOOLS, asset } from '../data/content.js';
import { NPCS } from '../data/npcs.js';
import { Icon } from './icons.jsx';

export function WeatherCard() {
  const game = useGame(), wx = useStore(s => s.wx), canGeo = useStore(s => s.canGeo);
  return (
    <div className="hud wx card">
      <button className="wx-btn" aria-live="polite" title={wx.title} onClick={() => game.wxCycle()}>
        <span className="wx-ic" aria-hidden="true">{Icon[wx.icon] || Icon.day}</span>
        <span className="wx-col"><b>{wx.time}</b><small>{wx.date}</small></span>
        <span className="wx-sep" aria-hidden="true" />
        <span className="wx-col"><b>{wx.temp}</b><small>{wx.desc}</small></span>
      </button>
      {canGeo && <button className="wx-pin" title="Use my precise location for the weather" aria-label="Use my precise location for the weather" onClick={() => game.usePreciseLocation()}>{Icon.pin}</button>}
    </div>
  );
}

export function PlayerCard() {
  const game = useGame(), level = useStore(s => s.level), xp = useStore(s => s.xp), buffs = useStore(s => s.buffs);
  return (
    <div className="hud pcard card" aria-label="Player">
      <div className="avatar" role="img" aria-label="Henry Wu" style={{ backgroundImage: `url(${asset('img/henry.webp')})` }} />
      <div className="pc-main">
        <div className="pc-name">Henry Wu <span className="lv">LV. {level}</span></div>
        <div className="pc-role">UI/UX Designer</div>
        <div className="xp"><span>XP</span><div className="bar"><i style={{ width: `${xp}%` }} /></div><b>{Math.round(xp)}</b></div>
        <div className="buffs" aria-live="polite">
          {buffs.map(b => b.tour
            ? <button key={b.id} className="buff tour" title="Stop the tour" onClick={() => game.stopTour()}>{b.label}</button>
            : <span key={b.id} className="buff">{b.label}</span>)}
        </div>
      </div>
    </div>
  );
}

const INT_KEYS = Object.keys(INTERACTIONS);
export function Tracker() {
  const game = useGame();
  const visited = useStore(s => s.visited), found = useStore(s => s.found), done = useStore(s => s.interactions), met = useStore(s => s.met);
  const collapsed = useStore(s => s.trackerCollapsed), open = useStore(s => s.trackerOpen), census = useStore(s => s.censusDone);
  return (
    <nav className={`hud tracker card${collapsed ? ' collapsed' : ''}${open ? ' open' : ''}`} aria-label="Quest log">
      <button className="tr-head" aria-expanded={!collapsed} aria-controls="trBody" title="Collapse or expand (Q)" onClick={() => game.setTrackerCollapsed(!collapsed)}>
        <span>Quest log</span><b>{visited.length} / {STATIONS.length}</b>{Icon.chev}
      </button>
      <div id="trBody">
        <ul>
          {STATIONS.map(st => {
            const v = visited.includes(st.id);
            return (
              <li key={st.id}>
                <button className={`tr-row${v ? ' done' : ''}`} onClick={() => game.goTo(st.id)}>
                  <span className="tr-dot" style={{ '--c': st.color }} /><span className="tr-name">{st.name}</span><span className="tr-tag">{st.tag}</span>
                  <span className="tr-check" aria-label={v ? 'visited' : 'not visited'} />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="tr-tools"><span>Tools found</span><b>{found.length} / {TOOLS.length}</b>
          <div className="tool-dots">{TOOLS.map(t => <i key={t.n} title={t.n} style={found.includes(t.n) ? { background: t.c } : null} />)}</div>
        </div>
        <div className="tr-tools"><span>Interactions</span><b>{done.length} / {INT_KEYS.length}</b>
          <div className="tool-dots">{INT_KEYS.map(k => <i key={k} title={INTERACTIONS[k]} style={done.includes(k) ? { background: 'var(--coral)' } : null} />)}</div>
        </div>
        <div className="tr-tools"><span>Townsfolk met</span><b>{met.length} / {NPCS.length}</b>
          <div className="tool-dots">{NPCS.map(n => <i key={n.id} title={met.includes(n.id) ? `${n.name} · ${n.role}` : 'Not met yet'} style={met.includes(n.id) ? { background: n.color } : null} />)}</div>
          <p className="tr-hint">{census ? 'Town census done · you hold the key to Quest Town' : met.length === NPCS.length ? 'Everyone met! Go see Mayor Maple.' : 'Walk up to someone and press E to chat'}</p>
        </div>
      </div>
    </nav>
  );
}

export function TopBar() {
  const game = useGame(), tod = useStore(s => s.tod), mode = useStore(s => s.todMode), sound = useStore(s => s.sound);
  const photo = useStore(s => s.photo), help = useStore(s => s.help), open = useStore(s => s.trackerOpen);
  const name = { day: 'Day', sunset: 'Sunset', night: 'Night' }[tod], auto = mode === 'auto', label = auto ? `Auto, now ${name}` : name;
  return (
    <div className="hud tr-btns">
      <button className="pill mobile-only" aria-pressed={open} aria-controls="tracker" onClick={() => store.set({ trackerOpen: !open })}>Quests</button>
      <div className="iconbar card" role="toolbar" aria-label="World controls">
        <button className="ib" title="Guided tour (T)" aria-label="Start the guided tour" onClick={() => game.startTour()}>{Icon.tour}</button>
        <button className="ib" title={`Time of day: ${label} (N)`} aria-label={`Time of day: ${label}`} onClick={() => game.cycleTod()}>{Icon[tod]}{auto && <span className="auto-badge">A</span>}</button>
        <button className="ib" title="Sound (M)" aria-label={sound ? 'Sound on' : 'Sound off'} aria-pressed={sound} onClick={() => game.toggleSound()}>{sound ? Icon.soundOn : Icon.soundOff}</button>
        <button className="ib" id="btnPhoto" title="Photo mode (P)" aria-label="Photo mode" aria-pressed={photo} onClick={() => game.setPhoto(!photo)}>{Icon.photo}</button>
        <button className="ib desktop-only" id="btnHelp" title="Controls" aria-label="Show controls" aria-pressed={help} aria-controls="help" onClick={() => store.set({ help: !help })}>{Icon.keys}</button>
      </div>
      <button className="pill" onClick={() => game.openQuick()}>Quick view</button>
    </div>
  );
}

const HELP = [
  ['Walk', ['W', 'A', 'S', 'D']], ['Run', ['Shift']], ['Hop', ['Space']], ['Open or use', ['E']], ['Second action', ['F']],
  ['Wave · Dance · Cheer', ['1', '2', '3']], ['Pet the hamster', ['H']], ['Dogs and cats', 'Walk up · E F'],
  ['Talk to townsfolk', 'Walk up · E'], ['Pick a reply', ['1', '2', '3']],
  ['Show or hide quest log', ['Q']], ['Auto · day · sunset · night', ['N']], ['Weather preview', 'Click the weather card'],
  ['Guided tour', ['T']], ['Photo mode', ['P']], ['Sound on or off', ['M']], ['Walk to a spot', 'Click the ground'], ['Turn the camera', 'Drag · scroll to zoom'],
];
export function Help() {
  const help = useStore(s => s.help);
  if (!help) return null;
  return (
    <div className="hud help card" id="help">
      {HELP.map(([label, k]) => <div key={label}>{label}<span>{Array.isArray(k) ? k.map(x => <kbd key={x}>{x}</kbd>) : k}</span></div>)}
    </div>
  );
}

export function Prompts() {
  const game = useGame(), p = useStore(s => s.prompt);
  if (!p) return null;
  return (
    <div className="hud prompts" key={p.key}>
      <button className="prompt" onClick={() => game.interact()}><kbd>E</kbd><span>{p.main} <small>· {p.sub}</small></span></button>
      {p.alt && <button className="prompt alt" onClick={() => game.interactAlt()}><kbd>F</kbd><span>{p.alt}</span></button>}
    </div>
  );
}

const EMOTES = [['wave', 'Wave', '1'], ['dance', 'Dance', '2'], ['cheer', 'Cheer', '3'], ['pet', 'Pet hamster', 'H']];
export function Dock() {
  const game = useGame(), emote = useStore(s => s.emote), hamPet = useStore(s => s.hamPet);
  return (
    <div className="hud dock card" role="toolbar" aria-label="Emotes">
      {EMOTES.map(([id, label, key]) => (
        <button key={id} className={(id === 'pet' ? hamPet : emote === id) ? 'on' : ''} onClick={() => id === 'pet' ? game.petHamster() : game.doEmote(id)}>
          {id === 'pet' ? Icon.heart : Icon[id]}{label}<kbd>{key}</kbd>
        </button>
      ))}
    </div>
  );
}

export function Minimap({ canvasRef }) {
  const game = useGame();
  const onClick = e => {
    const r = e.currentTarget.getBoundingClientRect();
    game.minimapClick((e.clientX - r.left) / r.width * 320, (e.clientY - r.top) / r.height * 320);
  };
  return (
    <div className="hud minimap card">
      <div className="mm-cap"><span>Map</span><span>click to travel</span></div>
      <canvas ref={canvasRef} width="320" height="320" aria-label="Town map" onClick={onClick} />
    </div>
  );
}

/** short messages from the game; their HTML is written by the game itself (dynamic parts escaped) */
export function Toast() {
  const t = useStore(s => s.toast);
  if (!t) return null;
  return <div className="hud toast" role="status" key={t.id} dangerouslySetInnerHTML={{ __html: t.html }} />;
}

export function PhotoExit() {
  const game = useGame();
  return <button className="hud photo-exit" onClick={() => game.setPhoto(false)}>Exit photo mode <kbd>P</kbd></button>;
}

/** keeps keyboard focus sensible when a card opens: moves it to `ref` and back to the town afterwards */
export function useFocusOnMount(ref, game) {
  useEffect(() => {
    const prev = document.activeElement;
    const id = setTimeout(() => ref.current && ref.current.focus({ preventScroll: true }), 50);
    return () => {
      clearTimeout(id);
      if (prev && prev !== document.body && document.contains(prev) && /** @type {any} */ (prev).focus) /** @type {any} */ (prev).focus({ preventScroll: true });
      else game.focusStage();
    };
  }, []);
}
export const useRefEl = () => useRef(null);
