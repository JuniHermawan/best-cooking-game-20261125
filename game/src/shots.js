// The screenshot scenes behind ?shot=start|play|serve|end. Each one plays the real
// rules forward from a fresh world for a fixed script, steered by a small pilot that
// issues exactly the commands a player would (drop noodles, lift in the green zone,
// add the toppings a ticket asks for, serve), so every frame is what a real game
// looks like and the same seed always gives the same frame.

import { POT, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 12;
const PLAY_MIN_SECONDS = 18;
const PLAY_MAX_SECONDS = 60;
const SERVE_MAX_SECONDS = 70;
const END_LIMIT_SECONDS = 400;

/**
 * One pilot decision: what would a decent player do right now? Boil noodles when
 * the pot is free, lift them in the perfect window (only into an empty bowl), dump
 * a burnt pot, add the toppings the earliest waiting ticket still needs, and serve
 * a finished bowl — unless `holdServe` says to stop one step before serving, in
 * which case it starts the next batch in the pot instead, so the frame shows a
 * finished bowl and a pot already working.
 */
function pilot(state, world, holdServe) {
  const pot = state.pot;
  const bowl = state.bowl;
  if (pot.mode === 'burnt') return { pot: true };
  if (pot.mode === 'boiling' && pot.t >= (POT.perfectStart + POT.perfectEnd) / 2 && bowl.noodles === null) {
    return { pot: true };
  }
  const waiting = state.tickets.filter((ticket) => ticket.state === 'waiting');
  if (waiting.length === 0) {
    if (pot.mode === 'empty' && bowl.noodles === null) return { pot: true };
    return {};
  }
  const ticket = waiting[0];
  const match = world.matchingTicket();
  if (match) {
    if (holdServe) {
      if (pot.mode === 'empty') return { pot: true };
      return {};
    }
    return { serve: true };
  }
  if (bowl.noodles === null) {
    if (pot.mode === 'empty') return { pot: true };
    return {};
  }
  // The bowl has noodles: add a topping this ticket still needs.
  const counts = new Map();
  for (const topping of bowl.toppings) counts.set(topping, (counts.get(topping) ?? 0) + 1);
  for (const topping of ticket.recipe.toppings) {
    const have = counts.get(topping) ?? 0;
    const need = ticket.recipe.toppings.filter((item) => item === topping).length;
    if (have < need) return { add: topping };
  }
  // Nothing this ticket needs: the bowl went wrong somewhere — clear it.
  return { trash: true };
}

/** Step the world with the pilot until `stop(state)` says so, or the limit hits. */
function runPilot(world, stop, limitSeconds, holdServe) {
  const limit = Math.floor(limitSeconds / STEP);
  for (let index = 0; index < limit; index += 1) {
    const hold = typeof holdServe === 'function' ? holdServe(world.state) : holdServe;
    const events = world.step(STEP, pilot(world.state, world, hold), false);
    if (events & EVENT_OVER) return true;
    if (stop(world.state, world)) return false;
  }
  return false;
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    // Title screen: the kitchen runs itself, two tickets waiting.
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, {}, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    runPilot(world, () => false, END_LIMIT_SECONDS, false);
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  if (name === 'serve') {
    // A finished bowl, a second ticket waiting, the pot already on its next batch.
    runPilot(
      world,
      (state, w) =>
        w.matchingTicket() !== null &&
        state.tickets.filter((t) => t.state === 'waiting').length >= 2 &&
        state.pot.mode === 'boiling' &&
        state.pot.t > 1,
      SERVE_MAX_SECONDS,
      true,
    );
    clearMessage(world);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // play: after the first serve, a second bowl mid-assembly with the pot boiling.
  // The pilot serves the first bowl, then holds the second one back for the shot.
  runPilot(
    world,
    (state) =>
      state.elapsed >= PLAY_MIN_SECONDS &&
      state.served >= 1 &&
      state.bowl.noodles !== null &&
      state.bowl.toppings.length >= 2 &&
      state.tickets.filter((t) => t.state === 'waiting').length >= 2 &&
      state.pot.mode === 'boiling',
    PLAY_MAX_SECONDS,
    (state) => state.served >= 1,
  );
  clearMessage(world);
  return { screen: SCREEN_PLAY, best: world.state.score };
}

/** A staged frame shows no stale hint left over from an earlier stumble. */
function clearMessage(world) {
  world.state.message = '';
  world.state.messageTtl = 0;
}
