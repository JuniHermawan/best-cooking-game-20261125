// Keyboard and mouse, turned into plain data the loop consumes: clicks in logical
// playfield coordinates, one-shot key presses, and action flags for confirm/pause/mute.
// The loop, not this file, decides what a click means (the renderer owns the layout).

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

export function createInput(canvas) {
  const clicks = [];
  const keys = [];
  let actions = 0;

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
      y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  function onPointerDown(event) {
    event.preventDefault();
    clicks.push(toLogical(event));
    actions |= ACTION_CONFIRM;
  }

  function onKeyDown(event) {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === ' ' || key === 'enter') {
      event.preventDefault();
      actions |= ACTION_CONFIRM;
      keys.push('confirm');
    } else if (key === 'p' || key === 'escape') {
      actions |= ACTION_PAUSE;
      keys.push('pause');
    } else if (key === 'm') {
      actions |= ACTION_MUTE;
      keys.push('mute');
    } else if (key >= '1' && key <= '8') {
      keys.push(key);
    } else if (key === 'backspace' || key === 'delete') {
      keys.push('trash');
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('keydown', onKeyDown);

  function takeClicks() {
    return clicks.splice(0, clicks.length);
  }

  function takeKeys() {
    return keys.splice(0, keys.length);
  }

  function takeActions() {
    const taken = actions;
    actions = 0;
    return taken;
  }

  return { takeClicks, takeKeys, takeActions };
}
