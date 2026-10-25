// The start screen and the quick view (the whole portfolio as a plain page, for anyone in a hurry).
import { useRef } from 'react';
import { useStore } from '../state/store.js';
import { useGame, useGameReady } from '../game-context.js';
import { SBY, CASE_IDS } from '../data/world.js';
import { QUEST, SIDE, SIDE_ORDER, ABOUT, SITE, LINKEDIN, asset } from '../data/content.js';
import { Tldr, SkillGrid } from './Panel.jsx';
import { useFocusOnMount } from './Hud.jsx';

export function StartScreen() {
  const game = useGame(), ready = useGameReady(), started = useStore(s => s.started);
  if (started) return null;
  return (
    <div className="start">
      <div className="start-card card">
        <div className="crest" aria-hidden="true">H</div>
        <h1>HENRY WU</h1>
        <p className="kicker">UI/UX Designer · Portfolio</p>
        <p className="tag">Crafting simple, engaging, and code-ready digital experiences. Stroll around a little storybook town, open each quest, chat with the townsfolk and play with what you find. The sky follows your local time and weather.</p>
        <div className="start-actions">
          <button className="btn primary" disabled={!ready} onClick={() => game.beginGame()}>{ready ? 'Start exploring' : 'Building the town…'}</button>
          <button className="btn" onClick={() => game.startTour()} disabled={!ready}>Take the story tour</button>
        </div>
        <div className="start-links">
          <button className="start-quick" onClick={() => game.enterOverview()} disabled={!ready}>See the town map</button>
          <span aria-hidden="true">·</span>
          <button className="start-quick" onClick={() => game.openQuick()} disabled={!ready}>Read everything on one page</button>
        </div>
        <ul className="controls">
          <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or tap to walk</li>
          <li>Drag to look around</li>
          <li><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> emotes</li>
          <li><kbd>E</kbd> open quest or chat</li>
          <li><kbd>O</kbd> town map</li>
        </ul>
      </div>
    </div>
  );
}

function Quick() {
  const game = useGame(), back = useRef(null);
  useFocusOnMount(back, game);
  const ext = { target: '_blank', rel: 'noopener' };
  return (
    <div className="quick">
      <div className="q-wrap">
        <div className="q-bar"><span className="eyebrow" style={{ margin: 0 }}>Quick view</span><button className="btn" ref={back} onClick={() => game.closeQuick()}>← Back to town</button></div>
        <section className="q-hero card"><img src={asset('img/henry.webp')} alt="Illustrated Henry Wu" />
          <div>
            <h1>HENRY WU</h1><div className="pc-role">UI/UX Designer</div>
            <p>UI/UX Design · Web Design · Web Development. Crafting simple, engaging, and code-ready digital experiences.</p>
            <div className="p-actions"><a className="btn primary" href={LINKEDIN} {...ext}>LinkedIn ↗</a><a className="btn" href={SITE} {...ext}>henrywu.link ↗</a></div>
          </div>
        </section>
        <section className="q-sec card"><h2>Case study</h2>
          <div className="q-cards">
            {CASE_IDS.map(id => {
              const q = QUEST[id], st = SBY[id];
              return (
                <article className="q-case" key={id}><img className="p-icon" src={st.icon} alt="" width="56" height="56" />
                  <div>
                    <div className="p-eyebrow"><span className={`rar r-${q.rarity.toLowerCase()}`}>{q.rarity}</span>{q.timeline}</div>
                    <h3>{st.name}</h3><p>{q.lede}</p><Tldr q={q} />
                    <div className="p-actions"><a className="btn primary" href={SITE} {...ext}>Full case study ↗</a><button className="btn" onClick={() => game.quickGo(id)}>Show in town</button></div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <section className="q-sec card"><h2>Live projects</h2>
          <div className="q-side">{SIDE_ORDER.map(id => { const s = SIDE[id]; return <a key={id} href={s.url} {...ext}><span className="rar r-live">Live site ↗</span><h3>{s.title}</h3><p>{s.desc}</p></a>; })}</div>
        </section>
        <div className="q-two">
          <section className="q-sec card"><h2>Skills</h2><SkillGrid /><div className="eyebrow">Tools</div><p style={{ margin: 0, color: 'var(--slate)' }}>Figma, Framer, FigJam, Notion, Maze, Lottie, Spline</p></section>
          <section className="q-sec card"><h2>About</h2><p className="headline">{ABOUT.headline}</p><p style={{ margin: 0, color: 'var(--slate)' }}>{ABOUT.bio}</p></section>
        </div>
      </div>
    </div>
  );
}
export function QuickView() {
  const quick = useStore(s => s.quick);
  return quick ? <Quick /> : null;
}
