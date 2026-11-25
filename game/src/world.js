// Moonlit Ramen's rules and state, with no drawing and no browser in it: the noodle
// pot and its perfect window, the bowl being assembled, the customers' tickets and
// patience, scoring with tips and combos, and the shift timer. step() advances one
// fixed step from one player command and returns what happened as bit flags, so the
// caller can react (sounds, announcements) without the world knowing about screens.
// Nothing here allocates after createRamenWorld returns.

import {
  FIELD,
  INGREDIENTS,
  LEVEL,
  MAX_TICKETS,
  PATIENCE,
  POT,
  RECIPES,
  SCORE,
  SHIFT_SECONDS,
  SPAWN,
  STEP,
} from './config.js';
import { pick } from './random.js';

export const EVENT_ADD = 1;
export const EVENT_SERVE = 2;
export const EVENT_LOST = 4;
export const EVENT_PERFECT = 8;
export const EVENT_ERROR = 16;
export const EVENT_OVER = 32;
export const EVENT_LEVELUP = 64;
export const EVENT_POT = 128;

const FLOAT_TTL = 1.4;
const MESSAGE_TTL = 1.8;
const SERVED_FLASH = 0.9;

function sameToppings(a, b) {
  if (a.length !== b.length) return false;
  const counts = new Map();
  for (const item of a) counts.set(item, (counts.get(item) ?? 0) + 1);
  for (const item of b) {
    const left = counts.get(item) ?? 0;
    if (left === 0) return false;
    counts.set(item, left - 1);
  }
  return true;
}

function comboMultiplier(combo) {
  if (combo >= SCORE.comboHighAt) return 1.5;
  if (combo >= SCORE.comboAt) return 1.25;
  return 1;
}

export function createRamenWorld(random) {
  const state = {
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    score: 0,
    served: 0,
    lost: 0,
    combo: 0,
    bestCombo: 0,
    level: 1,
    pot: { mode: 'empty', t: 0, scrub: 0 },
    bowl: { noodles: null, toppings: [] },
    tickets: [],
    spawnTimer: SPAWN.first,
    nextTicketId: 1,
    floats: [],
    message: '',
    messageTtl: 0,
    over: false,
  };

  function reset() {
    state.timeLeft = SHIFT_SECONDS;
    state.elapsed = 0;
    state.score = 0;
    state.served = 0;
    state.lost = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.level = 1;
    state.pot.mode = 'empty';
    state.pot.t = 0;
    state.pot.scrub = 0;
    state.bowl.noodles = null;
    state.bowl.toppings.length = 0;
    state.tickets.length = 0;
    state.spawnTimer = SPAWN.first;
    state.nextTicketId = 1;
    state.floats.length = 0;
    state.message = '';
    state.messageTtl = 0;
    state.over = false;
  }

  function addFloat(slot, text, color) {
    if (state.floats.length > 12) state.floats.shift();
    state.floats.push({ slot, text, color, ttl: FLOAT_TTL, maxTtl: FLOAT_TTL });
  }

  function say(text) {
    state.message = text;
    state.messageTtl = MESSAGE_TTL;
  }

  function freeSeat() {
    const taken = new Set(state.tickets.map((ticket) => ticket.seat));
    for (let seat = 0; seat < MAX_TICKETS; seat += 1) {
      if (!taken.has(seat)) return seat;
    }
    return -1;
  }

  function spawnTicket() {
    const seat = freeSeat();
    if (seat < 0) return;
    const pool = RECIPES.filter((recipe) => recipe.minLevel <= state.level);
    const recipe = pick(random, pool);
    const maxPatience = Math.max(
      PATIENCE.min,
      PATIENCE.base + PATIENCE.perLevel * (state.level - 1),
    );
    state.tickets.push({
      id: state.nextTicketId,
      seat,
      recipe,
      patience: 1,
      maxPatience,
      state: 'waiting',
      flash: 0,
    });
    state.nextTicketId += 1;
  }

  /** The first waiting ticket this bowl would satisfy, or null. */
  function matchingTicket() {
    if (state.bowl.noodles === null) return null;
    for (const ticket of state.tickets) {
      if (ticket.state === 'waiting' && sameToppings(ticket.recipe.toppings, state.bowl.toppings)) {
        return ticket;
      }
    }
    return null;
  }

  function serveBowl() {
    const ticket = matchingTicket();
    if (ticket === null) {
      if (state.bowl.noodles === null && state.bowl.toppings.length === 0) say('The bowl is empty — cook some noodles first!');
      else if (state.bowl.noodles === null) say('Drop noodles in the pot first (key 8)!');
      else say('No ticket wants this bowl — check the recipes!');
      return EVENT_ERROR;
    }
    const quality = state.bowl.noodles;
    let pay = SCORE.serveBase + Math.round(SCORE.tipMax * ticket.patience);
    if (quality === 'perfect') pay += SCORE.perfectBonus;
    if (quality === 'under') pay -= SCORE.underPenalty;
    if (quality === 'over') pay -= SCORE.underPenalty;
    pay = Math.max(20, Math.round(pay * comboMultiplier(state.combo)));
    state.score += pay;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    ticket.state = 'served';
    ticket.flash = SERVED_FLASH;
    addFloat(ticket.seat, `+${pay}`, quality === 'perfect' ? '#7ec850' : '#f2c94c');
    if (quality === 'perfect') addFloat('bowl', 'PERFECT NOODLES!', '#7ec850');
    state.bowl.noodles = null;
    state.bowl.toppings.length = 0;
    const nextLevel = Math.min(LEVEL.max, 1 + Math.floor(state.served / LEVEL.servesPerLevel));
    let events = EVENT_SERVE;
    if (quality === 'perfect') events |= EVENT_PERFECT;
    if (nextLevel > state.level) {
      state.level = nextLevel;
      addFloat('bowl', `LEVEL ${nextLevel} — RUSH HOUR!`, '#ffb020');
      events |= EVENT_LEVELUP;
    }
    return events;
  }

  function liftNoodles() {
    const pot = state.pot;
    if (pot.mode === 'empty') {
      pot.mode = 'boiling';
      pot.t = 0;
      return EVENT_POT;
    }
    if (pot.mode === 'scrubbing') {
      say('Scrubbing the pot — one moment!');
      return EVENT_ERROR;
    }
    if (pot.mode === 'burnt') {
      pot.mode = 'scrubbing';
      pot.scrub = POT.scrubSeconds;
      say('Burnt noodles dumped — scrubbing the pot.');
      return EVENT_POT;
    }
    // Boiling: lift the noodles out.
    if (pot.t < POT.edibleStart) {
      say('Too raw! Let them boil a little longer.');
      return EVENT_ERROR;
    }
    if (state.bowl.noodles !== null) {
      say('The bowl already has noodles — serve or trash it first.');
      return EVENT_ERROR;
    }
    if (pot.t <= POT.perfectEnd && pot.t >= POT.perfectStart) state.bowl.noodles = 'perfect';
    else if (pot.t < POT.perfectStart) state.bowl.noodles = 'under';
    else state.bowl.noodles = 'over';
    pot.mode = 'empty';
    pot.t = 0;
    addFloat('pot', state.bowl.noodles === 'perfect' ? 'PERFECT!' : 'Noodles in!', '#f2c94c');
    return EVENT_POT | (state.bowl.noodles === 'perfect' ? EVENT_PERFECT : 0);
  }

  /**
   * One fixed step. `cmd` is the player's command this step: { pot, add, remove,
   * serve, trash }. With `harmless` set (the title screen's backdrop) tickets
   * arrive and wait but nobody's patience runs out and the clock never moves.
   */
  function step(dt, cmd, harmless) {
    let events = 0;
    if (!harmless) {
      state.elapsed += dt;
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        state.over = true;
        return EVENT_OVER;
      }
    }

    // The pot keeps boiling on its own clock.
    const pot = state.pot;
    if (pot.mode === 'boiling') {
      pot.t += dt;
      if (pot.t > POT.burntAt) {
        pot.mode = 'burnt';
        say('The noodles burnt! Click the pot to dump them.');
      }
    } else if (pot.mode === 'scrubbing') {
      pot.scrub -= dt;
      if (pot.scrub <= 0) {
        pot.mode = 'empty';
        pot.scrub = 0;
      }
    }

    // New customers, on a timer that quickens with the level.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnTicket();
      const interval = Math.max(
        SPAWN.minInterval,
        SPAWN.interval - SPAWN.perLevel * (state.level - 1),
      );
      state.spawnTimer += interval;
    }

    // Patience runs out (never on the title screen).
    if (!harmless) {
      for (const ticket of state.tickets) {
        if (ticket.state !== 'waiting') continue;
        ticket.patience -= dt / ticket.maxPatience;
        if (ticket.patience <= 0) {
          ticket.patience = 0;
          ticket.state = 'left';
          ticket.flash = SERVED_FLASH;
          state.lost += 1;
          state.combo = 0;
          state.score = Math.max(0, state.score - SCORE.walkoutPenalty);
          addFloat(ticket.seat, 'WALKED OUT!', '#e5534b');
          events |= EVENT_LOST;
        }
      }
    }

    // Served and walk-out tickets linger a moment, then their seat frees up.
    for (let index = state.tickets.length - 1; index >= 0; index -= 1) {
      const ticket = state.tickets[index];
      if (ticket.state === 'waiting') continue;
      ticket.flash -= dt;
      if (ticket.flash <= 0) state.tickets.splice(index, 1);
    }

    // Floating score texts rise and fade.
    for (let index = state.floats.length - 1; index >= 0; index -= 1) {
      const float = state.floats[index];
      float.ttl -= dt;
      if (float.ttl <= 0) state.floats.splice(index, 1);
    }
    if (state.messageTtl > 0) {
      state.messageTtl -= dt;
      if (state.messageTtl <= 0) state.message = '';
    }

    // One player command per step, in a fixed order.
    if (cmd) {
      if (cmd.pot) events |= liftNoodles();
      if (cmd.add && INGREDIENTS[cmd.add]) {
        if (state.bowl.toppings.length >= 6) {
          say('The bowl is full!');
          events |= EVENT_ERROR;
        } else {
          state.bowl.toppings.push(cmd.add);
          events |= EVENT_ADD;
        }
      }
      if (cmd.remove) {
        const at = state.bowl.toppings.lastIndexOf(cmd.remove);
        if (at >= 0) {
          state.bowl.toppings.splice(at, 1);
          events |= EVENT_ADD;
        }
      }
      if (cmd.trash) {
        state.bowl.noodles = null;
        state.bowl.toppings.length = 0;
        say('Bowl cleared.');
      }
      if (cmd.serve) events |= serveBowl();
    }
    return events;
  }

  reset();
  return { state, reset, step, matchingTicket };
}

export { FIELD, STEP };
