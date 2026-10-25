// The game overlay: weather card, player card, quest log, world controls, help, prompts, emote dock,
// minimap, toast and the photo-mode exit button. Everything reads from the store and calls the engine.
import { useEffect, useRef } from 'react';
import { useStore, store } from '../state/store.js';
import { useGame } from '../game-context.js';
import { STATIONS, INTERACTIONS, SBY, MAP_ORDER, MAP_GROUPS, MAP_NUM } from '../data/world.js';
import { TOOLS, BLURB, THREADS, STORY, LINKEDIN, asset } from '../data/content.js';
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
  const game = useGame(), tod = useStore(s => s.tod), mode = useStore(s => s.todMode), sound = useStore(s => s.sound), timeOpen = useStore(s => s.timeOpen);
  const photo = useStore(s => s.photo), help = useStore(s => s.help), open = useStore(s => s.trackerOpen), map = useStore(s => s.overview);
  const name = { day: 'Day', sunset: 'Sunset', night: 'Night' }[tod], auto = mode === 'auto', label = auto ? `Auto, now ${name}` : name;
  return (
    <div className="hud tr-btns">
      <button className="pill map-pill" title={map ? 'Back to Henry (O)' : 'See the whole town (O)'} onClick={() => game.toggleOverview()}>{map ? Icon.walk : Icon.map}{map ? 'Back to Henry' : 'Map view'}</button>
      {!map && <button className="pill mobile-only" aria-pressed={open} aria-controls="tracker" onClick={() => store.set({ trackerOpen: !open })}>Quests</button>}
      <div className="iconbar card" role="toolbar" aria-label="World controls">
        <button className="ib" title="Story tour (T)" aria-label="Start the story tour" onClick={() => game.startTour()}>{Icon.tour}</button>
        <button className="ib" id="btnTime" title={`Time of day: ${label} (N)`} aria-label={`Time of day: ${label}`} aria-expanded={timeOpen} aria-controls="timecard" onClick={() => store.set({ timeOpen: !timeOpen, help: false })}>{Icon[tod]}{auto && <span className="auto-badge">A</span>}</button>
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
  ['Show or hide quest log', ['Q']], ['Auto · day · sunset · night', ['N']], ['Time slider', 'Click the sun button'], ['Weather preview', 'Click the weather card'],
  ['Map view', ['O']], ['Project list', ['L']],
  ['Story tour', ['T']], ['Photo mode', ['P']], ['Sound on or off', ['M']], ['Walk to a spot', 'Click the ground'], ['Turn the camera', 'Drag · scroll to zoom'],
];
const MAP_HELP = [
  ['Move the map', ['W', 'A', 'S', 'D']], ['Turn', ['Q', 'E']], ['Zoom', ['+', '−']], ['Open a stop', 'Click its label'],
  ['Drag the map', 'Drag'], ['Turn or tilt', 'Right-drag'], ['Zoom', 'Scroll'], ['Project list', ['L']], ['Story tour', ['T']],
  ['Story: pause · back · next', ['Space', '←', '→']], ['Back to Henry', ['O']],
];
export function Help() {
  const help = useStore(s => s.help), map = useStore(s => s.overview);
  if (!help) return null;
  return (
    <div className="hud help card" id="help">
      {(map ? MAP_HELP : HELP).map(([label, k]) => <div key={label}>{label}<span>{Array.isArray(k) ? k.map(x => <kbd key={x}>{x}</kbd>) : k}</span></div>)}
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

const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
/** the map view's overlay: the project list (or the button that opens it) and the view controls */
export function MapHud() {
  const game = useGame(), on = useStore(s => s.overview), list = useStore(s => s.listOpen), panel = useStore(s => s.panelId);
  const focus = useStore(s => s.ovFocus), visited = useStore(s => s.visited), thread = useStore(s => s.threadFocus), story = useStore(s => s.story);
  if (!on) return null;
  const active = panel || focus;
  if (story) return <StoryCard story={story} game={game} />;
  return (
    <>
      <div className={`hud ov-threads${panel ? ' ov-panel' : ''}${list ? ' ov-list' : ''}`} role="group" aria-label="Connections between projects">
        <span className="ov-th-cap">Connections</span>
        {THREADS.map(th => (
          <button key={th.id} className={`th-chip${thread === th.id ? ' on' : ''}`} style={{ '--c': th.color }} aria-pressed={thread === th.id} title={th.desc} onClick={() => game.showThread(th.id)}>
            <i aria-hidden="true" />{th.name}<small>{th.stops.length}</small>
          </button>
        ))}
      </div>
      {list
        ? <ProjectList active={active} visited={visited} game={game} />
        : <button className="hud pill ov-listbtn" onClick={() => game.setList(true)} aria-expanded="false" aria-controls="plist">{Icon.list}Projects<kbd className="desktop-only">L</kbd></button>}
      <div className={`hud ov-ctrl card${panel ? ' ov-panel' : ''}${list ? ' ov-list' : ''}`} role="toolbar" aria-label="Map view controls">
        <span className="ov-hint">{coarse ? 'Drag to move · pinch to zoom or turn' : 'Drag to move · right-drag to turn · scroll to zoom'}</span>
        <button className="ib" title="Turn left (Q)" aria-label="Turn the map left" onClick={() => game.turnBy(Math.PI / 4)}>{Icon.turnL}</button>
        <button className="ib" title="Turn right (E)" aria-label="Turn the map right" onClick={() => game.turnBy(-Math.PI / 4)}>{Icon.turnR}</button>
        <button className="ib" title="Zoom out (−)" aria-label="Zoom out" onClick={() => game.zoomBy(1.3)}>{Icon.minus}</button>
        <button className="ib" title="Zoom in (+)" aria-label="Zoom in" onClick={() => game.zoomBy(1 / 1.3)}>{Icon.plus}</button>
        <button className="ib" title="Whole town" aria-label="Show the whole town" onClick={() => game.resetView()}>{Icon.home}</button>
      </div>
    </>
  );
}
function ProjectList({ active, visited, game }) {
  const close = useRef(null);
  useEffect(() => { if (innerWidth < 1100) { const id = setTimeout(() => close.current && close.current.focus({ preventScroll: true }), 50); return () => clearTimeout(id); } }, []);
  return (
    <nav className="hud plist card" id="plist" aria-label="Projects on the map">
      <header className="pl-head">
        <div><div className="p-eyebrow">Town map</div><h2>{MAP_ORDER.length} stops to explore</h2></div>
        <button className="p-close" ref={close} aria-label="Close the project list" onClick={() => game.setList(false)}>×</button>
      </header>
      <div className="pl-scroll">
        {MAP_GROUPS.map(g => (
          <section key={g.title}>
            <div className="eyebrow">{g.title}</div>
            <ul>
              {MAP_ORDER.filter(id => g.kinds.includes(SBY[id].kind)).map(id => {
                const st = SBY[id], v = visited.includes(id);
                return (
                  <li key={id}>
                    <button className={`pl-row${active === id ? ' on' : ''}${v ? ' done' : ''}`} aria-current={active === id ? 'true' : undefined} onClick={() => game.ovOpen(id)}>
                      <b className="pl-n" style={{ '--c': st.color }}>{MAP_NUM[id]}</b>
                      <span className="pl-main"><span className="pl-name">{st.name}<small>{st.tag}</small></span><span className="pl-blurb">{BLURB[id]}</span></span>
                      <span className="tr-check" aria-label={v ? 'visited' : 'not visited'} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}

/** the story tour's caption card: chapter, text, progress and the controls */
function StoryCard({ story, game }) {
  const c = STORY[story.i], last = story.i === story.n - 1, th = c.thread && THREADS.find(x => x.id === c.thread);
  return (
    <section className="hud story card" aria-label="Story tour" aria-live="polite">
      <div className="st-bar" aria-hidden="true">{STORY.map((_, i) => <i key={i} className={i < story.i ? 'done' : i === story.i ? 'now' : ''}>{i === story.i && <b style={{ width: `${story.t * 100}%` }} />}</i>)}</div>
      <div className="st-head">
        <span className="p-eyebrow">{String(story.i + 1).padStart(2, '0')} / {String(story.n).padStart(2, '0')} · {c.kicker}</span>
        <button className="st-x" aria-label="Leave the story tour" title="Leave the story (Esc)" onClick={() => game.stopStory()}>×</button>
      </div>
      <h2>{c.title}</h2>
      <p>{c.text}</p>
      {th && <p className="st-thread" style={{ '--c': th.color }}><i aria-hidden="true" />{th.name}</p>}
      <div className="st-ctrl">
        <button className="ib" aria-label="Previous chapter" title="Back (←)" disabled={story.i === 0} onClick={() => game.storyBack()}>{Icon.prev}</button>
        {!last && <button className="ib" aria-label={story.playing ? 'Pause' : 'Play'} title={story.playing ? 'Pause (Space)' : 'Play (Space)'} onClick={() => game.storyPlay()}>{story.playing ? Icon.pause : Icon.play}</button>}
        {!last && <button className="btn primary" onClick={() => game.storyNext()}>Next →</button>}
        {c.stop && !last && <button className="btn" onClick={() => game.ovOpen(c.stop)}>Open this stop</button>}
        {last && <>
          <a className="btn primary" href={LINKEDIN} target="_blank" rel="noopener">Connect on LinkedIn ↗</a>
          <button className="btn" onClick={() => game.storyReplay()}>Replay</button>
          <button className="btn" onClick={() => game.stopStory()}>Explore the map</button>
          <button className="btn" onClick={() => game.exitOverview()}>Walk with Henry</button>
        </>}
      </div>
    </section>
  );
}

const fmt = h => { const m = Math.round(h * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const PRESETS = [['Dawn', 6.4], ['Noon', 12], ['Sunset', 18.35], ['Night', 22]];
/** the clock popover: a 24-hour slider, a few presets, the local-time switch and a time-lapse */
export function TimeCard() {
  const game = useGame(), open = useStore(s => s.timeOpen), hour = useStore(s => s.hour), mode = useStore(s => s.todMode), lapse = useStore(s => s.lapse), tod = useStore(s => s.tod);
  const ref = useRef(null);
  useEffect(() => { if (open) { const id = setTimeout(() => ref.current && ref.current.focus({ preventScroll: true }), 50); return () => clearTimeout(id); } }, [open]);
  if (!open) return null;
  const auto = mode === 'auto';
  return (
    <div className="hud timecard card" id="timecard" role="dialog" aria-label="Time of day">
      <div className="tc-head">
        <div><div className="p-eyebrow">Town time</div><b className="tc-time">{fmt(hour)}</b><span className="tc-tod">{{ day: 'Day', sunset: hour < 12 ? 'Dawn' : 'Sunset', night: 'Night' }[tod]}</span></div>
        <button className="p-close" aria-label="Close" onClick={() => store.set({ timeOpen: false })}>×</button>
      </div>
      <input ref={ref} className="tc-range" type="range" min="0" max="23.99" step=".25" value={Math.min(23.99, hour)} aria-label="Time of day" aria-valuetext={fmt(hour)} onChange={e => game.setHour(+e.target.value)} />
      <div className="tc-ticks" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
      <div className="tc-presets">{PRESETS.map(([n, h]) => <button key={n} className="btn" onClick={() => game.setHour(h)}>{n}</button>)}</div>
      <div className="tc-row">
        <button className={`btn${auto ? ' on' : ''}`} aria-pressed={auto} onClick={() => game.setTodAuto()}>{Icon.pin}My local time</button>
        <button className={`btn${lapse ? ' on' : ''}`} aria-pressed={lapse} onClick={() => game.toggleLapse()}>{lapse ? Icon.pause : Icon.play}{lapse ? 'Stop the time-lapse' : 'Watch a day go by'}</button>
      </div>
      <p className="tc-note">People head to the LRT and the coffee booth in the morning, the food court at lunch and the square in the evening. Few are out at night.</p>
    </div>
  );
}
