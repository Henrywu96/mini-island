// Small shared helpers with no dependencies.
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const angDiff = (a, b) => { const T = Math.PI * 2, d = a - b; if (!isFinite(d)) return 0; return ((d + Math.PI) % T + T) % T - Math.PI; };
export const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const FONT = 'Fredoka, Nunito, "Trebuchet MS", sans-serif';

// seeded random for the decoration layout, so the town looks the same on every visit
let seed = 11;
export const srand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

export function rrPath(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// analytics: sends an event only when the Google tag is on the page
export const track = (name, params = {}) => { try { const w = /** @type {any} */ (window); if (typeof w.gtag === 'function') w.gtag('event', name, params); } catch (err) { } };
