// Tiny synthesized sound effects (no audio files). Off with M or the sound button.
import { S } from './state.js';
import { store } from '../state/store.js';

let actx = null, soundOn = true;
try { soundOn = localStorage.getItem('hq-sound') !== '0'; } catch (err) { }
store.set({ sound: soundOn });

function audio() {
  if (!actx) { try { actx = new (window.AudioContext || /** @type {any} */ (window).webkitAudioContext)(); } catch (err) { return null; } }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
export function tone(freq, dur = .12, type = 'sine', vol = .06, slide = 0, delay = 0) {
  if (!soundOn || !S.started) return; const a = audio(); if (!a) return;
  try {
    const t0 = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = /** @type {OscillatorType} */ (type); o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .012); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + .03);
  } catch (err) { }
}
export const SFX = {
  coin: () => { tone(988, .08, 'triangle', .06); tone(1319, .18, 'triangle', .06, 0, .07); },
  open: () => tone(523, .14, 'sine', .05, 260),
  close: () => tone(660, .1, 'sine', .04, -240),
  pop: () => tone(440, .1, 'triangle', .05, 320),
  jump: () => tone(320, .16, 'square', .02, 420),
  kick: () => tone(150, .12, 'triangle', .08, -70),
  level: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .2, 'triangle', .05, 0, i * .09)),
  squeak: () => { tone(1500, .07, 'sine', .035, 600); tone(1700, .07, 'sine', .03, 500, .09); },
  chime: () => [880, 1109, 1319].forEach((f, i) => tone(f, .3, 'sine', .04, 0, i * .07)),
  whoosh: () => tone(700, .45, 'sawtooth', .012, -480),
  click: () => tone(720, .05, 'sine', .025),
  woof: () => { tone(340, .09, 'sawtooth', .022, -150); tone(300, .14, 'sawtooth', .026, -160, .14); },
  yip: () => tone(720, .1, 'triangle', .04, 320),
  meow: () => { tone(560, .2, 'triangle', .035, 260); tone(820, .32, 'triangle', .03, -380, .17); },
  purr: () => { for (let i = 0; i < 12; i++) tone(52 + (i % 2) * 7, .075, 'sawtooth', .02, 0, i * .085); },
  hiss: () => tone(2600, .32, 'sawtooth', .01, -1100),
  thunder: () => { tone(62, 1.5, 'sawtooth', .045, -24); tone(44, 1.9, 'triangle', .06, -10, .12); },
  bell: () => { tone(1568, .5, 'sine', .05); tone(2093, .6, 'sine', .03, 0, .02); },
  talk: () => tone(520 + Math.random() * 160, .06, 'triangle', .02, 60),
  quack: () => { tone(420, .12, 'square', .015, -120); tone(380, .1, 'square', .012, -100, .14); },
  slurp: () => tone(300, .35, 'sine', .03, 500),
  sizzle: () => { for (let i = 0; i < 6; i++) tone(3000 + Math.random() * 1500, .05, 'sawtooth', .006, -800, i * .05); },
  // a short tune on the busker's guitar
  tune: () => [[392, 0], [494, .18], [587, .36], [784, .54], [659, .78], [587, .96], [494, 1.14], [523, 1.38], [587, 1.56]].forEach(([f, d]) => tone(f, .32, 'triangle', .045, 0, d)),
};
export const isSoundOn = () => soundOn;
export function setSound(on) {
  soundOn = on; try { localStorage.setItem('hq-sound', on ? '1' : '0'); } catch (err) { }
  store.set({ sound: on });
  if (on) SFX.click();
}
export function unlockAudio() { if (soundOn) audio(); }
