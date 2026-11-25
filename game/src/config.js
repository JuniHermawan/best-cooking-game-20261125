// Moonlit Ramen: every tuning number, colour, ingredient and recipe in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One shift lasts this long; the timer is the game's main pressure. */
export const SHIFT_SECONDS = 150;

/** How many customer tickets can wait on the order board at once. */
export const MAX_TICKETS = 3;

/** Seconds between new customers arriving (shrinks as the level rises). */
export const SPAWN = { first: 1.0, interval: 9.0, minInterval: 5.0, perLevel: 0.7 };

/** A customer's patience, in seconds, before they storm out. */
export const PATIENCE = { base: 42, perLevel: -2.5, min: 26 };

/** The noodle pot: seconds of boiling, and the perfect window inside it. */
export const POT = {
  perfectStart: 3.6,
  perfectEnd: 5.0,
  edibleStart: 2.5,
  burntAt: 6.2,
  /** Seconds a dumped pot stays unusable while it is scrubbed. */
  scrubSeconds: 1.2,
};

/** Scoring: base pay per served bowl, tip from patience left, perfect-noodle bonus. */
export const SCORE = {
  serveBase: 100,
  tipMax: 60,
  perfectBonus: 50,
  underPenalty: 10,
  walkoutPenalty: 25,
  /** Combo multiplier steps: 0-1 combo x1, 2-3 x1.25, 4+ x1.5. */
  comboAt: 2,
  comboHighAt: 4,
};

/** Serves per level-up, and the last level (pressure stops growing there). */
export const LEVEL = { servesPerLevel: 4, max: 6 };

/** The best shift is kept between visits (this browser only). */
export const BEST_KEY = 'moonlit-ramen.best';

/**
 * The seven toppings a ticket can ask for. `key` is the keyboard shortcut,
 * `color` is the food's main colour, `label` is what the bins and tickets show.
 * Noodles are not a topping: they go through the pot (see POT).
 */
export const INGREDIENTS = {
  egg: { key: '1', label: 'Egg', color: '#fff3c4', accent: '#f2b705' },
  chashu: { key: '2', label: 'Chashu', color: '#f6c6c6', accent: '#c94f4f' },
  nori: { key: '3', label: 'Nori', color: '#2f6b3a', accent: '#173d22' },
  naruto: { key: '4', label: 'Naruto', color: '#fdfdfd', accent: '#ef6a9e' },
  chili: { key: '5', label: 'Chili', color: '#e23b2e', accent: '#7d150c' },
  scallion: { key: '6', label: 'Scallion', color: '#7ec850', accent: '#2f7a1e' },
  corn: { key: '7', label: 'Corn', color: '#ffd94d', accent: '#c98f0a' },
};

/** The key that drops noodles into the pot (and lifts them out again). */
export const POT_KEY = '8';

/** Every recipe the kitchen serves: a name and the toppings it needs. */
export const RECIPES = [
  { name: 'Shoyu Classic', toppings: ['egg', 'chashu', 'nori'], minLevel: 1 },
  { name: 'Miso Corn', toppings: ['chashu', 'corn', 'scallion'], minLevel: 1 },
  { name: 'Veggie Nori', toppings: ['corn', 'nori', 'scallion'], minLevel: 1 },
  { name: 'Spicy Miso', toppings: ['chili', 'egg', 'scallion'], minLevel: 2 },
  { name: 'Naruto Special', toppings: ['naruto', 'egg', 'nori', 'chashu'], minLevel: 3 },
  { name: 'Volcano Deluxe', toppings: ['egg', 'chashu', 'naruto', 'chili'], minLevel: 4 },
];

export const PALETTE = {
  wallTop: '#1d2340',
  wallBottom: '#12162b',
  floor: '#3a2a1c',
  counter: '#8a5a33',
  counterTop: '#b07a45',
  counterEdge: '#5e3a1e',
  board: '#232a3d',
  boardEdge: '#3d4a6b',
  ticket: '#fff8e7',
  ticketEdge: '#d8c49a',
  pot: '#2b2f3a',
  potRim: '#4a5060',
  broth: '#e8a33d',
  brothDark: '#c47f1f',
  bowl: '#f4ede1',
  bowlEdge: '#b8a88f',
  text: '#f5efe2',
  muted: '#9aa3b8',
  good: '#7ec850',
  warn: '#ffb020',
  bad: '#e5534b',
  accent: '#ff5a5a',
  gold: '#f2c94c',
  steam: 'rgba(255,255,255,0.55)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
