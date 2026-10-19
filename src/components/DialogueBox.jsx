// The chat box that opens when Henry talks to someone in town.
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../state/store.js';
import { useGame } from '../game-context.js';
import { reduceMotion } from '../game/util.js';

function Line({ text }) {
  const [n, setN] = useState(reduceMotion ? text.length : 0);
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setN(v => { if (v >= text.length) { clearInterval(id); return v; } return v + 2; }), 22);
    return () => clearInterval(id);
  }, [text]);
  const done = n >= text.length;
  return (
    <p className="dl-text" aria-live="polite" onClick={() => setN(text.length)}>
      <span>{text.slice(0, n)}</span><span className="dl-rest" aria-hidden="true">{done ? '' : text.slice(n)}</span>
    </p>
  );
}

export function DialogueBox() {
  const game = useGame(), d = useStore(s => s.dialogue), first = useRef(null);
  useEffect(() => { if (d && first.current) first.current.focus({ preventScroll: true }); }, [d && d.n]);
  useEffect(() => { if (!d) game.focusStage(); }, [!d]);
  if (!d) return null;
  return (
    <div className="hud dialogue card" role="dialog" aria-label={`Talking with ${d.name}`} style={{ '--c': d.color }}>
      <div className="dl-head">
        <span className="dl-dot" aria-hidden="true" /><b>{d.name}</b><small>{d.role}</small>
        <button className="dl-x" aria-label="Close" title="Close (Esc)" onClick={() => game.dialogueClose()}>×</button>
      </div>
      <Line key={d.n} text={d.text} />
      <div className="dl-choices">
        {d.choices.map((c, i) => (
          <button key={`${d.n}-${i}`} ref={i === 0 ? first : null} onClick={() => game.dialogueChoose(i)}><kbd>{i + 1}</kbd>{c}</button>
        ))}
        {!d.choices.length && <button className="dl-next" ref={first} onClick={() => game.dialogueNext()}>{d.next ? 'Next' : 'Bye'}<kbd>E</kbd></button>}
      </div>
    </div>
  );
}
