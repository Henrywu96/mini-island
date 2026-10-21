// The quest card drawer: case study, live side project, skill tree, character sheet or contact.
import { useRef, useState } from 'react';
import { useStore } from '../state/store.js';
import { useGame } from '../game-context.js';
import { SBY, ORDER } from '../data/world.js';
import { QUEST, SIDE, SKILLS, TOOLS, GLYPH_SVG, ABOUT, SITE, LINKEDIN, asset } from '../data/content.js';
import { RawSvg } from './icons.jsx';
import { useFocusOnMount } from './Hud.jsx';

export function Tldr({ q }) {
  return (
    <section className="tldr"><div className="eyebrow">TL;DR</div>
      <dl>
        <div><dt>Problem</dt><dd>{q.problem}</dd></div>
        <div><dt>What I did</dt><dd>{q.did}</dd></div>
        <div><dt>Outcome</dt><dd>{q.outcome}</dd></div>
      </dl>
    </section>
  );
}
export const SkillGrid = () => <ul className="skills">{SKILLS.map(([n, svg]) => <li key={n}><RawSvg inner={svg} />{n}</li>)}</ul>;
const ext = { target: '_blank', rel: 'noopener' };

function CopyRow({ text }) {
  const [label, setLabel] = useState('Copy'), codeRef = useRef(null);
  const copy = () => {
    const done = () => { setLabel('Copied'); setTimeout(() => setLabel('Copy'), 1600); };
    const select = () => { const r = document.createRange(); r.selectNodeContents(codeRef.current); const s = getSelection(); s.removeAllRanges(); s.addRange(r); setLabel('Press Ctrl+C'); };
    try { navigator.clipboard.writeText(text).then(done, select); } catch (err) { select(); }
  };
  return <div className="copyrow"><code ref={codeRef}>{text}</code><button onClick={copy}>{label}</button></div>;
}

function Body({ id, close, closeRef, game }) {
  const st = SBY[id], found = useStore(s => s.found);
  const nextId = ORDER[(ORDER.indexOf(id) + 1) % ORDER.length], next = SBY[nextId];
  const head = (eyebrow, icon) => (
    <header className="p-head">{icon}<div><div className="p-eyebrow">{eyebrow}</div><h2 id="pTitle">{st.name}</h2></div>
      <button className="p-close" ref={closeRef} aria-label="Close" onClick={close}>×</button></header>
  );
  const glyph = <div className="p-glyph" aria-hidden="true"><RawSvg inner={GLYPH_SVG[st.glyph]} /></div>;
  const nextBtn = <button className="btn" onClick={() => game.goTo(nextId)}>Next: {next.name} →</button>;
  if (st.kind === 'quest') {
    const q = QUEST[id];
    return <>
      {head(<><span className={`rar r-${q.rarity.toLowerCase()}`}>{q.rarity}</span><span className="lvchip">LV.{q.lv}</span></>, <img className="p-icon" src={st.icon} alt="" width="56" height="56" />)}
      <p className="p-lede">{q.lede}</p>
      <div className="tags">{q.tags.map(t => <span key={t}>{t}</span>)}</div>
      <p className="p-pivot">{q.pivot}</p>
      <Tldr q={q} />
      <dl className="meta">
        <div><dt>Type</dt><dd>{q.type || 'Personal concept project'}</dd></div><div><dt>Role</dt><dd>UI/UX Designer (solo)</dd></div>
        <div><dt>Timeline</dt><dd>{q.timeline}</dd></div><div><dt>Tools</dt><dd>{q.tools || 'Figma'}</dd></div>
      </dl>
      <div className="p-actions"><a className="btn primary" href={SITE} {...ext}>Full case study on henrywu.link ↗</a>{nextBtn}</div>
      <p className="p-note">The full write-up covers {q.covers || 'research, design process, results and reflection'}.</p>
    </>;
  }
  if (st.kind === 'side') {
    const s = SIDE[id];
    return <>
      {head(<><span className="rar r-live">Live site</span>Side quest</>, glyph)}
      <p className="p-lede">{s.desc}</p>
      <div className="tags">{s.tags.map(t => <span key={t}>{t}</span>)}</div>
      <div className="p-actions"><a className="btn primary" href={s.url} {...ext}>Visit the live site ↗</a>{nextBtn}</div>
      <div className="copyrow"><code>{s.url}</code></div>
    </>;
  }
  if (st.kind === 'skills') {
    return <>
      {head('Abilities unlocked', glyph)}
      <SkillGrid />
      <div className="eyebrow">Toolbelt · {found.length} of {TOOLS.length} found around town</div>
      <ul className="toolchips">{TOOLS.map(t => <li key={t.n} className={found.includes(t.n) ? 'got' : ''} style={{ '--tc': t.c }}><i />{t.n}</li>)}</ul>
      <p className="p-note">Each tool is a spinning coin somewhere around town. One is hiding on a street.</p>
      <div className="p-actions" style={{ marginTop: 16 }}>{nextBtn}</div>
    </>;
  }
  if (st.kind === 'about') {
    return <>
      {head('Player profile', glyph)}
      <img className="about-img" src={asset('img/henry.webp')} alt="Illustrated Henry holding a stylus and tablet" />
      <p className="headline">{ABOUT.headline}</p>
      <p className="p-pivot">{ABOUT.bio}</p>
      <div className="eyebrow">Character stats</div>
      <div className="stats">
        {[['HP', '#ec6a4e', 95], ['MP', '#3b82f6', 88], ['XP', '#e6a400', 72]].map(([k, c, v]) => <div key={k} style={{ '--c': c }}><span>{k}</span><div className="bar"><i style={{ width: `${v}%` }} /></div><b>{v}</b></div>)}
      </div>
      <dl className="meta"><div><dt>Focus</dt><dd>UI/UX Design, Web Design</dd></div><div><dt>Tools</dt><dd>Figma, Framer, FigJam, Maze, Notion, Spline, Lottie</dd></div></dl>
      <div className="p-actions">{nextBtn}</div>
    </>;
  }
  return <>
    {head('Contact', glyph)}
    <p className="p-lede">Want to talk design, a role or a project? The quickest way to reach me is LinkedIn.</p>
    <div className="p-actions"><a className="btn primary" href={LINKEDIN} {...ext}>Connect on LinkedIn ↗</a><a className="btn" href={SITE} {...ext}>henrywu.link ↗</a></div>
    <CopyRow text={LINKEDIN} />
  </>;
}

function Open({ id }) {
  const game = useGame(), closeRef = useRef(null), scroll = useRef(null);
  useFocusOnMount(closeRef, game);
  return (
    <aside className="hud panel card" aria-labelledby="pTitle">
      <div className="p-scroll" ref={scroll}><Body id={id} close={() => game.closePanel()} closeRef={closeRef} game={game} /></div>
    </aside>
  );
}
export function Panel() {
  const id = useStore(s => s.panelId);
  return id ? <Open key={id} id={id} /> : null;
}
