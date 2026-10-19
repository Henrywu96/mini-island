// Town layout: squares and parks, the streets between them, and every quest stop.
import { asset } from './content.js';

export const ISLANDS = [
  { id: 'hub', x: 0, z: 0, r: 8.5, depth: 7.5 },
  { id: 'bridgly', x: 0, z: -23, r: 6.2, depth: 6.5 },
  { id: 'lookout', x: 9.2, z: -27.2, r: 2.4, depth: 3 },
  { id: 'transit', x: -21, z: -9, r: 6, depth: 6 },
  { id: 'yard', x: 21, z: -9, r: 6, depth: 6 },
  { id: 'grove', x: -17, z: 15, r: 5.6, depth: 5.5 },
  { id: 'workshop', x: 17, z: 15, r: 5.6, depth: 5.5 },
  { id: 'studio', x: 0, z: 31, r: 7, depth: 6.5 },
];
export const ISL = Object.fromEntries(ISLANDS.map(i => [i.id, i]));
export const LINKS = [['hub', 'bridgly'], ['hub', 'transit'], ['hub', 'yard'], ['hub', 'grove'], ['hub', 'workshop'], ['bridgly', 'lookout'], ['grove', 'studio'], ['workshop', 'studio']];
// each square is cobblestone (plaza) or grass (park)
export const DISTRICT = { hub: 'plaza', yard: 'plaza', workshop: 'plaza', studio: 'plaza', bridgly: 'park', transit: 'park', grove: 'park', lookout: 'park' };

// The duck pond and the food court around it, south of the town square.
export const POND = { x: 0, z: 16.2, r: 3.4 };
export const FOOD_COURT = { x: 0, z: 18.2, r: 8.2 };

const STATION_DEFS = [
  { id: 'bridgly', island: 'bridgly', x: 0, z: -23.4, kind: 'quest', name: 'Bridgly', tag: 'Legendary', color: '#e6a400', icon: asset('img/bridgly.webp'), verb: 'Accept quest', radius: 2.8, iy: 2.75, col: .95 },
  { id: 'greenpath', island: 'greenpath', x: -21.3, z: -9.3, kind: 'quest', name: 'GreenPath', tag: 'Epic', color: '#8b5cf6', icon: asset('img/greenpath.webp'), verb: 'Accept quest', radius: 2.8, iy: 2.75, col: .95 },
  { id: 'studyflow', island: 'studyflow', x: 21.3, z: -9.3, kind: 'quest', name: 'StudyFlow', tag: 'Rare', color: '#3b82f6', icon: asset('img/studyflow.webp'), verb: 'Accept quest', radius: 2.8, iy: 2.75, col: .95 },
  { id: 'edmontonlrt', island: 'transit', x: -21, z: -9, kind: 'side', name: 'Edmonton LRT Live', tag: 'Live site', color: '#2f6fdd', glyph: 'train', verb: 'Visit station', radius: 2.6, iy: 3.05, col: .6 },
  { id: 'skills', island: 'grove', x: -15.9, z: 13.9, kind: 'skills', name: 'Skill Tree', tag: 'Abilities', color: '#2fb67c', glyph: 'star', verb: 'Inspect the tree', radius: 2.8, iy: 2.1, col: 0 },
  { id: 'arcline', island: 'studio', x: 0, z: 31.2, kind: 'side', name: 'Arcline One', tag: 'Live site', color: '#57677d', glyph: 'car', verb: 'Explore showroom', radius: 3.7, iy: 4.85, col: 2.4 },
  { id: 'emberline', island: 'workshop', x: 15.1, z: 17.2, kind: 'side', name: 'Emberline Coffee', tag: 'Live site', color: '#ec6a4e', glyph: 'cup', verb: 'Visit booth', radius: 2.5, iy: 2.9, col: .95 },
  { id: 'jobtracker', island: 'workshop', x: 19.6, z: 13.4, kind: 'side', name: 'Job Tracker', tag: 'Live site', color: '#ec6a4e', glyph: 'board', verb: 'Visit booth', radius: 2.5, iy: 2.9, col: .85 },
  { id: 'stackyard', island: 'yard', x: 19.3, z: -9.5, kind: 'side', name: 'Stackyard Ops', tag: 'Live site', color: '#e99a34', glyph: 'warehouse', verb: 'Inspect warehouse', radius: 2.5, iy: 2.35, col: .5 },
  { id: 'about', island: 'hub', x: -3.6, z: -4.4, kind: 'about', name: 'Character Sheet', tag: 'About me', color: '#ec6a4e', glyph: 'person', verb: 'Read', radius: 2.5, iy: 2.4, col: 1.0 },
  { id: 'contact', island: 'hub', x: 3.6, z: -4.4, kind: 'contact', name: 'Get in Touch', tag: 'Contact', color: '#3b82f6', glyph: 'mail', verb: 'Open mailbox', radius: 2.3, iy: 2.4, col: .45 },
];
/* Hidden for now: GreenPath and StudyFlow case studies. Their old squares became the LRT park and the
   Stackyard yard, so bringing them back means giving each one a square again before removing it here. */
export const HIDDEN = new Set(['greenpath', 'studyflow']);
export const CASE_IDS = ['bridgly', 'greenpath', 'studyflow'].filter(id => !HIDDEN.has(id));

// The engine adds its own fields (marker sprites, label element, alt action) to these objects.
/** @type {any[]} */
export const STATIONS = STATION_DEFS.filter(s => !HIDDEN.has(s.id)).map(s => ({ ...s }));
/** @type {Record<string, any>} */
export const SBY = Object.fromEntries(STATIONS.map(s => [s.id, s]));
export const ORDER = STATIONS.map(s => s.id);

// Every small thing you can do in town, for the "Interactions" counter.
export const INTERACTIONS = {
  train: 'Dispatch an LRT train', order: 'Dispatch a Stackyard order', paint: 'Repaint the Arcline car', hug: 'Send a hug', wheel: 'Hamster wheel',
  coffee: 'Brew a coffee', card: 'Move a job card', shake: 'Shake the skill tree', pet: 'Pet the hamster', ball: 'Kick the beach ball',
  butterflies: 'Startle the butterflies', plane: 'Throw a paper plane', dog: 'Pet a dog', cat: 'Pet a cat', trick: 'Ask a dog for a trick',
  yarn: 'Toss yarn for a cat', fetch: 'Play fetch with a dog',
  handshake: 'Shake the mayor’s hand', busker: 'Tip the busker', boba: 'Order bubble tea', snack: 'Buy a scallion pancake', truck: 'Order poutine from the truck',
  ducks: 'Feed the ducks with Grandpa Wen', mail: 'Get a postcard from Noor', jog: 'Jog with Oskar', sketch: 'Get a sketch from Priya', kite: 'Help Theo fly his kite', lrtfacts: 'Hear an LRT fact from Sam',
};

export const TIPS = [
  'The golden totem opens my Bridgly case study.', 'Press 2 and I will dance.', 'One tool coin is hiding on a street.', 'Kick the beach ball. My hamster will chase it.',
  'Mochi and Bean love belly rubs. Walk up and press E.', 'Mayor Maple has a little job for you. Find her in the square.', 'The food court by the pond has boba, pancakes and a poutine truck.',
  'Kick the ball near a dog to play fetch.', 'Press N to see the island at night.', 'Press F at the LRT station to dispatch a train.', 'Press F at the coffee booth for a speed boost.',
  'The AGV at Stackyard fills an order when you press F.', 'Press T for a guided tour of my work.', 'Toss some yarn for the cats with F.', 'Everyone in town has something to say. Walk up and press E.',
];
