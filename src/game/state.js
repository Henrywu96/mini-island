// Mutable game state shared between engine modules. Anything the React UI shows is mirrored into the store.
export const S = {
  started: false,
  photo: false,
  quick: false,
  panelId: /** @type {string|null} */ (null),
  tour: false,
  overview: false,
  story: false,      // the story tour is playing (in the map view)
  storyStop: /** @type {string|null} */ (null),
  ovK: 0,          // 0 → 1 as the map view opens (the fog thins out)
  dialogue: /** @type {any} */ (null),
  // player navigation
  path: /** @type {{x:number,z:number}[]} */ ([]),
  pendingOpen: /** @type {any} */ (null),
  pendingAct: /** @type {any} */ (null),
  near: /** @type {any} */ (null),
  jumpY: 0,
  vy: 0,
  heading: Math.PI,
  speedNow: 0,
  idleT: 0,
  // camera
  camYaw: 0,
  camPitch: .62,
  camDist: 36,
  camDistTarget: 34,
  // hamster, sky, pointer
  hamState: 'follow',
  hamT: 0,
  tod: 'day',
  todMode: 'auto',  // 'auto' follows the local clock, 'manual' is a time picked on the slider
  hour: 12,         // the clock shown in town (0-24) and the hour it is easing towards
  hourT: 12,
  lapse: false,     // a day running as a time-lapse
  wxUmbrella: false,
  hoverObj: /** @type {any} */ (null),
  drag: /** @type {any} */ (null),
  // short power-ups, in seconds left
  buffs: { coffee: 0, boba: 0, jog: 0 },
};
