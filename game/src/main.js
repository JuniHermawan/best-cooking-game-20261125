// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer paints
// what is there. The game moves between four screens: title, play, paused and
// shift over. Sounds answer the world's events; the best shift is kept in the
// browser between visits.
//
// ?seed=N fixes the customers and recipes. ?shot=start|play|serve|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, INGREDIENTS, POT_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createRamenWorld, EVENT_ERROR, EVENT_OVER, EVENT_PERFECT, EVENT_POT, EVENT_SERVE } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRamenRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createRamenWorld(createRandom(seed));
// A handle for automated play-tests (and nothing else): the world, live.
window.__ramen = world;
const renderer = createRamenRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastTick = 0;
  let wasBoiling = false;
  // Commands live here, not in one frame: a frame shorter than a step must not
  // swallow a key pressed in it — the next step still runs it, in order.
  const commandQueue = [];

  function announce(message) {
    status.textContent = message;
  }

  function startShift() {
    world.reset();
    accumulator = 0;
    lastTick = 0;
    wasBoiling = false;
    screen = SCREEN_PLAY;
    announce('Playing. Serve every ticket before patience runs out.');
  }

  function endShift() {
    screen = SCREEN_OVER;
    audio.stopSizzle();
    audio.jingle();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift over. Score ${world.state.score}. Best ${best}.`);
  }

  function handleEvents(events) {
    if (events & EVENT_SERVE) audio.serve();
    if (events & EVENT_PERFECT) audio.perfect();
    if (events & EVENT_ERROR) audio.error();
    if (events & EVENT_OVER) endShift();
  }

  function stepGame(cmd) {
    const boilingBefore = world.state.pot.mode === 'boiling';
    const events = world.step(STEP, cmd, false);
    const boilingAfter = world.state.pot.mode === 'boiling';
    if (boilingAfter && !boilingBefore) audio.startSizzle();
    if (!boilingAfter && boilingBefore) audio.stopSizzle();
    if (events & EVENT_POT) {
      if (world.state.pot.mode === 'boiling') audio.startSizzle();
      else audio.stopSizzle();
    }
    // A low-patience ticket ticks once a second.
    const urgent = world.state.tickets.some((t) => t.state === 'waiting' && t.patience < 0.25);
    if (urgent && world.state.elapsed - lastTick > 1) {
      lastTick = world.state.elapsed;
      audio.tick();
    }
    handleEvents(events);
    void wasBoiling;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    const actions = input.takeActions();
    const keys = input.takeKeys();
    const clicks = input.takeClicks();
    if (actions & ACTION_MUTE) audio.setMuted(!audio.isMuted());
    if (actions & ACTION_CONFIRM) audio.unlock();

    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      // The title's kitchen runs itself behind the panel.
      while (accumulator >= STEP) {
        world.step(STEP, {}, true);
        accumulator -= STEP;
      }
      if (actions & ACTION_CONFIRM) startShift();
    } else if (screen === SCREEN_PAUSED) {
      accumulator = 0;
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        audio.stopSizzle();
        announce('Paused.');
        accumulator = 0;
      } else {
        // Commands queue up, one per step: several keys pressed in one frame
        // must each land (egg, then chashu, then nori), never collapse into one.
        for (const click of clicks) {
          const hit = renderer.hitTest(click.x, click.y, world.state, screen);
          if (!hit) continue;
          if (hit.pause) {
            screen = SCREEN_PAUSED;
            audio.stopSizzle();
            announce('Paused.');
            accumulator = 0;
            break;
          }
          if (hit.mute) {
            audio.setMuted(!audio.isMuted());
            continue;
          }
          commandQueue.push(hit);
        }
        for (const key of keys) {
          if (key === 'confirm') commandQueue.push({ serve: true });
          else if (key === 'trash') commandQueue.push({ trash: true });
          else if (key === POT_KEY) commandQueue.push({ pot: true });
          else if (key >= '1' && key <= '7') {
            const id = Object.keys(INGREDIENTS).find((item) => INGREDIENTS[item].key === key);
            if (id) commandQueue.push({ add: id });
          }
        }
        while (accumulator >= STEP && screen === SCREEN_PLAY) {
          stepGame(commandQueue.shift() ?? {});
          accumulator -= STEP;
        }
      }
    }
    renderer.draw(world.state, screen, best, audio.isMuted());
  }

  // Leaving the tab pauses a running game rather than letting tickets walk out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.stopSizzle();
      announce('Paused.');
    }
  });

  announce('Moonlit Ramen. Press Space or click to start the shift.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
