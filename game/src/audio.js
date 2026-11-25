// All of Moonlit Ramen's sounds, synthesised live with WebAudio: no sound files,
// nothing to download. The context is created on the first player gesture (browsers
// refuse audio before one), and every call is safe when audio is off or muted.

export function createAudio() {
  let context = null;
  let muted = false;
  let sizzleNodes = null;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  /** Call from any player gesture: unlocks audio on browsers that need one. */
  function unlock() {
    const ctx = ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function tone(freq, seconds, type, gain, when = 0) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      const t0 = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      amp.gain.setValueAtTime(0.0001, t0);
      amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
      amp.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
      osc.connect(amp).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + seconds + 0.05);
    } catch {
      // Audio is decoration: never let it break the game.
    }
  }

  /** A soft pop when a topping lands in the bowl. */
  function add() {
    tone(520, 0.09, 'sine', 0.12);
    tone(780, 0.07, 'sine', 0.08, 0.04);
  }

  /** The pot's rolling boil: filtered noise while noodles are in. */
  function startSizzle() {
    if (muted || sizzleNodes) return;
    const ctx = ensure();
    if (!ctx) return;
    try {
      const length = ctx.sampleRate * 1;
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 900;
      filter.Q.value = 0.6;
      const amp = ctx.createGain();
      amp.gain.value = 0.035;
      source.connect(filter).connect(amp).connect(ctx.destination);
      source.start();
      sizzleNodes = { source, amp };
    } catch {
      sizzleNodes = null;
    }
  }

  function stopSizzle() {
    if (!sizzleNodes) return;
    try {
      sizzleNodes.amp.gain.setTargetAtTime(0.0001, sizzleNodes.source.context.currentTime, 0.05);
      sizzleNodes.source.stop(sizzleNodes.source.context.currentTime + 0.2);
    } catch {
      // Already stopped.
    }
    sizzleNodes = null;
  }

  /** A bright two-note ding when a bowl is served. */
  function serve() {
    tone(880, 0.14, 'triangle', 0.14);
    tone(1318, 0.22, 'triangle', 0.12, 0.09);
  }

  /** A warm chime for perfect noodles. */
  function perfect() {
    tone(1046, 0.12, 'sine', 0.12);
    tone(1318, 0.12, 'sine', 0.12, 0.07);
    tone(1568, 0.2, 'sine', 0.12, 0.14);
  }

  /** A low buzz for a mistake. */
  function error() {
    tone(160, 0.16, 'sawtooth', 0.07);
    tone(120, 0.18, 'sawtooth', 0.06, 0.08);
  }

  /** A short tick when a ticket's patience runs low. */
  function tick() {
    tone(1100, 0.05, 'square', 0.04);
  }

  /** The shift-end jingle: three rising notes. */
  function jingle() {
    tone(523, 0.16, 'triangle', 0.13);
    tone(659, 0.16, 'triangle', 0.13, 0.13);
    tone(784, 0.3, 'triangle', 0.13, 0.26);
  }

  function setMuted(value) {
    muted = value;
    if (muted) stopSizzle();
  }

  function isMuted() {
    return muted;
  }

  return { unlock, add, startSizzle, stopSizzle, serve, perfect, error, tick, jingle, setMuted, isMuted };
}
