// Moonlit Ramen's look: every pixel the player sees, drawn on one canvas. The
// kitchen (wall, lanterns, menu board, counter), the order board with its tickets,
// the noodle pot with its timing bar, the bowl being assembled, the ingredient bins,
// the HUD, the floating score texts, and the title, pause and shift-end screens.
// It also owns the hit test: given a click in logical coordinates it says which
// command that click means, so the loop never guesses at layout.

import { FIELD, FONT, INGREDIENTS, PALETTE, POT, RECIPES, SCORE } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

/** Where everything sits in the 1280x720 playfield. */
export const LAYOUT = {
  hud: { h: 64 },
  board: { x: 24, y: 80, w: 368, h: 296 },
  ticket: { h: 88, gap: 10 },
  menu: { x: 1032, y: 80, w: 224, h: 296 },
  pot: { x: 436, y: 196, w: 252, h: 216 },
  bowl: { x: 736, y: 252, w: 268, h: 168 },
  serve: { x: 748, y: 436, w: 244, h: 52 },
  trash: { x: 1004, y: 436, w: 44, h: 44 },
  bins: { y: 576, h: 124, gap: 8, w: 148 },
  message: { x: 640, y: 548 },
  pauseBtn: { x: 1224, y: 14, w: 40, h: 36 },
  muteBtn: { x: 1176, y: 14, w: 40, h: 36 },
};

const BIN_ORDER = ['egg', 'chashu', 'nori', 'naruto', 'chili', 'scallion', 'corn', 'noodle'];

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = '600') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function circle(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** One ingredient's face, drawn as vector food so the game needs no image files. */
export function drawIngredient(ctx, id, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  if (id === 'egg') {
    ctx.fillStyle = '#fffdf5';
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
    circle(ctx, 0, 0, r * 0.48, '#f2b705');
    circle(ctx, -r * 0.14, -r * 0.14, r * 0.16, '#ffd94d');
  } else if (id === 'chashu') {
    circle(ctx, -r * 0.28, r * 0.14, r * 0.62, '#e89090');
    circle(ctx, r * 0.3, -r * 0.12, r * 0.62, '#f6c6c6');
    ctx.strokeStyle = '#c94f4f';
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.12, r * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === 'nori') {
    ctx.fillStyle = '#2f6b3a';
    rr(ctx, -r * 0.85, -r * 0.6, r * 1.7, r * 1.2, r * 0.18);
    ctx.fill();
    ctx.strokeStyle = '#7ec850';
    ctx.lineWidth = r * 0.09;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, i * r * 0.32);
      ctx.lineTo(r * 0.6, i * r * 0.32);
      ctx.stroke();
    }
  } else if (id === 'naruto') {
    circle(ctx, 0, 0, r * 0.92, '#fdfdfd');
    ctx.strokeStyle = '#ef6a9e';
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0.6, Math.PI * 2 + 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
    ctx.stroke();
  } else if (id === 'chili') {
    ctx.strokeStyle = '#e23b2e';
    ctx.lineWidth = r * 0.55;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r * 0.72, Math.PI * 0.15, Math.PI * 1.15);
    ctx.stroke();
    ctx.strokeStyle = '#2f7a1e';
    ctx.lineWidth = r * 0.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.62, -r * 0.72);
    ctx.lineTo(-r * 0.85, -r * 0.95);
    ctx.stroke();
  } else if (id === 'scallion') {
    for (let i = -1; i <= 1; i += 1) {
      ctx.strokeStyle = '#2f7a1e';
      ctx.lineWidth = r * 0.22;
      ctx.beginPath();
      ctx.arc(i * r * 0.55, (i % 2) * r * 0.2, r * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#7ec850';
      ctx.lineWidth = r * 0.1;
      ctx.beginPath();
      ctx.arc(i * r * 0.55, (i % 2) * r * 0.2, r * 0.34, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (id === 'corn') {
    circle(ctx, 0, 0, r * 0.95, '#ffd94d');
    ctx.fillStyle = '#c98f0a';
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      circle(ctx, Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.13, '#c98f0a');
    }
  } else if (id === 'noodle') {
    ctx.strokeStyle = '#e8c37a';
    ctx.lineWidth = r * 0.24;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, i * r * 0.45);
      ctx.quadraticCurveTo(0, i * r * 0.45 - r * 0.5, r * 0.8, i * r * 0.45);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFace(ctx, x, y, r, seed, mood) {
  // mood: 0 happy, 1 neutral, 2 worried. seed varies hair and skin.
  const skins = ['#f2c89b', '#e8b07e', '#c98d5f', '#f6d7b0'];
  const hairs = ['#2b2b33', '#6b3f22', '#8a8f96', '#3d2c1e'];
  const skin = skins[seed % skins.length];
  const hair = hairs[(seed >> 2) % hairs.length];
  circle(ctx, x, y, r, skin);
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.15, r, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#1d1d22';
  circle(ctx, x - r * 0.36, y - r * 0.05, r * 0.11, '#1d1d22');
  circle(ctx, x + r * 0.36, y - r * 0.05, r * 0.11, '#1d1d22');
  ctx.strokeStyle = '#1d1d22';
  ctx.lineWidth = r * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 0) ctx.arc(x, y + r * 0.28, r * 0.42, Math.PI * 0.15, Math.PI * 0.85);
  else if (mood === 1) {
    ctx.moveTo(x - r * 0.3, y + r * 0.42);
    ctx.lineTo(x + r * 0.3, y + r * 0.42);
  } else ctx.arc(x, y + r * 0.72, r * 0.38, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
}

function formatTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function starsFor(score) {
  if (score >= 3200) return 3;
  if (score >= 2000) return 2;
  if (score >= 1000) return 1;
  return 0;
}

export function createRamenRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  let lastRegions = null;

  function drawBackground(elapsed) {
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.wallTop);
    grad.addColorStop(0.62, PALETTE.wallBottom);
    grad.addColorStop(0.62, PALETTE.floor);
    grad.addColorStop(1, '#2c1f14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Moon in the window, top centre-right.
    circle(ctx, 876, 118, 34, '#f5efc8');
    circle(ctx, 864, 110, 7, '#e0d49a');
    circle(ctx, 888, 128, 5, '#e0d49a');
    ctx.strokeStyle = '#0c0f1e';
    ctx.lineWidth = 10;
    ctx.strokeRect(828, 70, 96, 96);

    // Paper lanterns swaying gently, hung between the score and the timer.
    for (let i = 0; i < 3; i += 1) {
      const lx = 430 + i * 52;
      const sway = Math.sin(elapsed * 0.7 + i * 1.7) * 4;
      ctx.strokeStyle = '#0c0f1e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx + sway, 0);
      ctx.lineTo(lx + sway, 34);
      ctx.stroke();
      const glow = ctx.createRadialGradient(lx + sway, 62, 4, lx + sway, 62, 44);
      glow.addColorStop(0, 'rgba(255,90,90,0.55)');
      glow.addColorStop(1, 'rgba(255,90,90,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(lx + sway - 44, 18, 88, 88);
      ctx.fillStyle = '#ff5a5a';
      ctx.beginPath();
      ctx.ellipse(lx + sway, 62, 17, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd94d';
      ctx.fillRect(lx + sway - 17, 56, 34, 3);
      ctx.fillRect(lx + sway - 17, 66, 34, 3);
    }

    // Wooden counter across the kitchen.
    ctx.fillStyle = PALETTE.counter;
    ctx.fillRect(0, 470, FIELD.width, 106);
    ctx.fillStyle = PALETTE.counterTop;
    ctx.fillRect(0, 470, FIELD.width, 14);
    ctx.fillStyle = PALETTE.counterEdge;
    ctx.fillRect(0, 566, FIELD.width, 10);
  }

  function drawMenuBoard() {
    const { x, y, w, h } = LAYOUT.menu;
    ctx.fillStyle = PALETTE.board;
    rr(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.boardEdge;
    ctx.lineWidth = 3;
    rr(ctx, x, y, w, h, 12);
    ctx.stroke();
    text(ctx, "TONIGHT'S MENU", x + w / 2, y + 30, 17, PALETTE.gold, 'center', '800');
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 42);
    ctx.lineTo(x + w - 16, y + 42);
    ctx.stroke();
    let rowY = y + 62;
    for (const recipe of RECIPES) {
      text(ctx, recipe.name, x + 14, rowY, 14, PALETTE.text);
      let iconX = x + 14;
      for (const topping of recipe.toppings) {
        drawIngredient(ctx, topping, iconX + 9, rowY + 16, 9);
        iconX += 22;
      }
      rowY += 36;
    }
    text(ctx, 'Every bowl: noodles + toppings', x + 14, y + h - 12, 11, PALETTE.muted);
  }

  function drawTicket(ticket, index) {
    const { x, y } = LAYOUT.board;
    const ty = y + 44 + index * (LAYOUT.ticket.h + LAYOUT.ticket.gap);
    const w = LAYOUT.board.w;
    const h = LAYOUT.ticket.h;
    ctx.fillStyle = PALETTE.ticket;
    rr(ctx, x, ty, w, h, 10);
    ctx.fill();
    const mood = ticket.patience > 0.5 ? 0 : ticket.patience > 0.25 ? 1 : 2;
    drawFace(ctx, x + 34, ty + 34, 22, ticket.id, mood);
    text(ctx, `Seat ${ticket.seat + 1}`, x + 64, ty + 22, 12, '#8a7a5a', 'left', '700');
    text(ctx, ticket.recipe.name, x + 64, ty + 42, 16, '#2b2118', 'left', '800');
    let iconX = x + 64;
    for (const topping of ticket.recipe.toppings) {
      drawIngredient(ctx, topping, iconX + 10, ty + 64, 10);
      iconX += 24;
    }
    // Patience bar: green to red as the customer waits.
    const barX = x + 10;
    const barY = ty + h - 12;
    const barW = w - 20;
    ctx.fillStyle = '#e3d5b3';
    rr(ctx, barX, barY, barW, 7, 3);
    ctx.fill();
    const pct = Math.max(0, ticket.patience);
    ctx.fillStyle = pct > 0.5 ? '#7ec850' : pct > 0.25 ? '#ffb020' : '#e5534b';
    if (pct > 0.01) {
      rr(ctx, barX, barY, barW * pct, 7, 3);
      ctx.fill();
    }
    if (ticket.state === 'served') {
      ctx.fillStyle = 'rgba(126,200,80,0.25)';
      rr(ctx, x, ty, w, h, 10);
      ctx.fill();
      text(ctx, 'SERVED ✓', x + w - 14, ty + 26, 14, '#2f7a1e', 'right', '800');
    } else if (ticket.state === 'left') {
      ctx.fillStyle = 'rgba(229,83,75,0.25)';
      rr(ctx, x, ty, w, h, 10);
      ctx.fill();
      text(ctx, 'LEFT ✗', x + w - 14, ty + 26, 14, '#a32c22', 'right', '800');
    }
  }

  function drawOrderBoard(state) {
    const { x, y, w } = LAYOUT.board;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rr(ctx, x - 6, y - 6, w + 12, LAYOUT.board.h + 12, 14);
    ctx.fill();
    text(ctx, 'ORDER BOARD', x + 4, y + 22, 18, PALETTE.text, 'left', '800');
    text(ctx, `${state.tickets.filter((t) => t.state === 'waiting').length} waiting`, x + w - 4, y + 22, 13, PALETTE.muted, 'right');
    const waiting = state.tickets.filter((t) => t.state !== 'waiting');
    const ordered = [...state.tickets].sort((a, b) => a.seat - b.seat);
    ordered.forEach((ticket, i) => drawTicket(ticket, i));
    void waiting;
  }

  function drawPot(state) {
    const { x, y, w, h } = LAYOUT.pot;
    const pot = state.pot;
    text(ctx, 'NOODLE POT', x + w / 2, y - 8, 15, PALETTE.text, 'center', '800');
    // Timing bar: the green perfect zone, the marker, the burnt edge.
    const barX = x + 8;
    const barY = y + 12;
    const barW = w - 16;
    ctx.fillStyle = '#10131d';
    rr(ctx, barX, barY, barW, 14, 7);
    ctx.fill();
    const toX = (t) => barX + (Math.min(t, POT.burntAt) / POT.burntAt) * barW;
    ctx.fillStyle = '#7ec850';
    ctx.fillRect(toX(POT.perfectStart), barY, toX(POT.perfectEnd) - toX(POT.perfectStart), 14);
    ctx.fillStyle = '#e5534b';
    ctx.fillRect(toX(POT.burntAt - 0.4), barY, barW - (toX(POT.burntAt - 0.4) - barX), 14);
    if (pot.mode === 'boiling' || pot.mode === 'burnt') {
      const mx = toX(pot.t);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx - 2, barY - 4, 4, 22);
    }
    text(ctx, 'PERFECT', toX((POT.perfectStart + POT.perfectEnd) / 2), barY + 30, 10, '#7ec850', 'center', '800');

    // The pot itself.
    const cx = x + w / 2;
    const cy = y + 92;
    // Steam wisps, animated from the clock.
    if (pot.mode === 'boiling') {
      ctx.strokeStyle = PALETTE.steam;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i += 1) {
        const phase = (state.elapsed * 0.9 + i * 0.33) % 1;
        const sx = cx - 44 + i * 44 + Math.sin(phase * 9 + i) * 6;
        const sy = cy - 52 - phase * 46;
        ctx.globalAlpha = 0.55 * (1 - phase);
        ctx.beginPath();
        ctx.moveTo(sx, sy + 18);
        ctx.quadraticCurveTo(sx + 8, sy + 6, sx - 4, sy - 10);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // Bubbling water.
    ctx.fillStyle = pot.mode === 'burnt' ? '#4a3421' : PALETTE.broth;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 18, 96, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    if (pot.mode === 'boiling') {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 5; i += 1) {
        const bx = cx - 70 + ((i * 37 + Math.floor(state.elapsed * 7) * 13) % 140);
        const by = cy - 18 + Math.sin(i * 2.4 + state.elapsed * 3) * 8;
        circle(ctx, bx, by, 3 + (i % 3), 'rgba(255,255,255,0.5)');
      }
      // Noodle nest riding the boil.
      ctx.strokeStyle = '#f7e3b0';
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(cx - 52, cy - 22 + i * 9);
        ctx.quadraticCurveTo(cx, cy - 30 + i * 9, cx + 52, cy - 22 + i * 9);
        ctx.stroke();
      }
    }
    // Pot body.
    ctx.fillStyle = PALETTE.pot;
    ctx.beginPath();
    ctx.moveTo(cx - 104, cy - 18);
    ctx.lineTo(cx - 88, cy + 62);
    ctx.quadraticCurveTo(cx, cy + 78, cx + 88, cy + 62);
    ctx.lineTo(cx + 104, cy - 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.potRim;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 18, 104, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pot.mode === 'burnt' ? '#4a3421' : PALETTE.broth;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 18, 92, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Handles.
    ctx.fillStyle = PALETTE.potRim;
    rr(ctx, cx - 128, cy - 6, 26, 12, 6);
    ctx.fill();
    rr(ctx, cx + 102, cy - 6, 26, 12, 6);
    ctx.fill();

    const label =
      pot.mode === 'empty'
        ? 'Empty — click or press 8 to drop noodles'
        : pot.mode === 'boiling'
          ? 'Boiling… lift in the green zone!'
          : pot.mode === 'burnt'
            ? 'BURNT! Click to dump it'
            : 'Scrubbing…';
    text(ctx, label, cx, y + h - 6, 13, pot.mode === 'burnt' ? '#ff8a7a' : PALETTE.muted, 'center');
  }

  function drawBowl(state) {
    const { x, y, w, h } = LAYOUT.bowl;
    const bowl = state.bowl;
    text(ctx, 'YOUR BOWL', x + w / 2, y - 8, 15, PALETTE.text, 'center', '800');
    const cx = x + w / 2;
    const cy = y + 78;
    // Plate shadow and bowl.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 52, 108, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.bowl;
    ctx.beginPath();
    ctx.moveTo(cx - 104, cy - 22);
    ctx.lineTo(cx - 84, cy + 44);
    ctx.quadraticCurveTo(cx, cy + 62, cx + 84, cy + 44);
    ctx.lineTo(cx + 104, cy - 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.bowlEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#e8dcc4';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 22, 104, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    if (bowl.noodles) {
      // Broth and noodles.
      ctx.fillStyle = PALETTE.broth;
      ctx.beginPath();
      ctx.ellipse(cx, cy - 22, 92, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f7e3b0';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(cx - 66, cy - 26 + i * 7);
        ctx.quadraticCurveTo(cx - 20 + i * 12, cy - 34 + i * 7, cx + 66, cy - 26 + i * 7);
        ctx.stroke();
      }
      if (bowl.noodles === 'perfect') {
        text(ctx, 'PERFECT NOODLES', cx, cy - 44, 12, '#7ec850', 'center', '800');
      } else if (bowl.noodles === 'under') {
        text(ctx, 'a little underdone', cx, cy - 44, 11, '#ffb020', 'center', '700');
      } else {
        text(ctx, 'overcooked…', cx, cy - 44, 11, '#ff8a7a', 'center', '700');
      }
      // Toppings arranged in the bowl.
      const spots = [
        [-52, -6], [0, -12], [52, -6], [-26, 12], [26, 12], [0, 2],
      ];
      bowl.toppings.forEach((topping, i) => {
        const spot = spots[i % spots.length];
        drawIngredient(ctx, topping, cx + spot[0], cy + spot[1], 15);
      });
    } else {
      text(ctx, 'empty — add noodles', cx, cy - 8, 13, '#8a7a5a', 'center', '600');
    }
    // Topping chips under the bowl: click one to take it back out.
    let chipX = x + 12;
    const chipY = y + h - 26;
    ctx.font = `600 11px ${FONT}`;
    for (const topping of bowl.toppings) {
      const label = INGREDIENTS[topping].label;
      const chipW = ctx.measureText(label).width + 30;
      ctx.fillStyle = '#fff8e7';
      rr(ctx, chipX, chipY, chipW, 20, 10);
      ctx.fill();
      drawIngredient(ctx, topping, chipX + 12, chipY + 10, 7);
      text(ctx, label, chipX + 24, chipY + 14, 11, '#2b2118', 'left', '700');
      chipX += chipW + 6;
    }
    // Trash button.
    const t = LAYOUT.trash;
    ctx.fillStyle = '#3a2a1c';
    rr(ctx, t.x, t.y, t.w, t.h, 10);
    ctx.fill();
    // Trash can, drawn: a bin with a lid and two slats.
    ctx.fillStyle = '#f5efe2';
    ctx.fillRect(t.x + 14, t.y + 12, 16, 3);
    rr(ctx, t.x + 12, t.y + 17, 20, 20, 3);
    ctx.fill();
    ctx.fillStyle = '#3a2a1c';
    ctx.fillRect(t.x + 18, t.y + 22, 2, 10);
    ctx.fillRect(t.x + 24, t.y + 22, 2, 10);
  }

  function drawBins(state) {
    const { y, h, gap, w } = LAYOUT.bins;
    let bx = 24;
    const regions = [];
    BIN_ORDER.forEach((id, i) => {
      const isNoodle = id === 'noodle';
      const label = isNoodle ? 'Noodles' : INGREDIENTS[id].label;
      const key = isNoodle ? '8' : INGREDIENTS[id].key;
      ctx.fillStyle = '#2c2417';
      rr(ctx, bx, y, w, h, 12);
      ctx.fill();
      ctx.strokeStyle = '#5e4a2e';
      ctx.lineWidth = 2;
      rr(ctx, bx, y, w, h, 12);
      ctx.stroke();
      drawIngredient(ctx, id, bx + w / 2, y + 44, 26);
      text(ctx, label, bx + w / 2, y + 88, 14, PALETTE.text, 'center', '700');
      text(ctx, isNoodle ? 'to the pot' : 'to the bowl', bx + w / 2, y + 106, 11, PALETTE.muted, 'center');
      // Key cap.
      ctx.fillStyle = '#f5efe2';
      rr(ctx, bx + w - 30, y + 8, 22, 22, 5);
      ctx.fill();
      text(ctx, key, bx + w - 19, y + 24, 13, '#1d1d22', 'center', '800');
      regions.push({ id, x: bx, y, w, h });
      bx += w + gap;
      void i;
    });
    return regions;
  }

  function drawHud(state, muted) {
    ctx.fillStyle = 'rgba(10,12,24,0.72)';
    ctx.fillRect(0, 0, FIELD.width, LAYOUT.hud.h);
    text(ctx, 'MOONLIT RAMEN', 24, 26, 20, PALETTE.text, 'left', '800');
    text(ctx, 'midnight noodle bar', 24, 48, 12, PALETTE.muted, 'left');
    text(ctx, `SCORE ${state.score.toLocaleString('en-US')}`, 250, 30, 18, PALETTE.gold, 'left', '800');
    text(ctx, `served ${state.served} · lost ${state.lost}`, 250, 50, 12, PALETTE.muted, 'left');
    // Shift timer, big in the middle.
    const timeColor = state.timeLeft <= 30 ? '#ff8a7a' : PALETTE.text;
    text(ctx, formatTime(state.timeLeft), 640, 38, 34, timeColor, 'center', '800');
    text(ctx, 'SHIFT', 640, 56, 11, PALETTE.muted, 'center', '700');
    const frac = Math.max(0, state.timeLeft / 150);
    ctx.fillStyle = '#2a3040';
    rr(ctx, 540, 60, 200, 4, 2);
    ctx.fill();
    ctx.fillStyle = timeColor;
    rr(ctx, 540, 60, 200 * frac, 4, 2);
    ctx.fill();
    // Level and combo.
    text(ctx, `LEVEL ${state.level}`, 900, 30, 16, PALETTE.text, 'left', '800');
    const mult = state.combo >= SCORE.comboHighAt ? 'x1.5' : state.combo >= SCORE.comboAt ? 'x1.25' : 'x1.0';
    text(
      ctx,
      state.combo > 1 ? `COMBO ${state.combo} · ${mult}` : 'no combo yet',
      900,
      50,
      12,
      state.combo > 1 ? '#7ec850' : PALETTE.muted,
      'left',
      '700',
    );
    // Mute and pause buttons.
    const m = LAYOUT.muteBtn;
    ctx.fillStyle = '#2a3040';
    rr(ctx, m.x, m.y, m.w, m.h, 8);
    ctx.fill();
    text(ctx, muted ? 'MUTE' : 'SOUND', m.x + m.w / 2, m.y + 24, 11, muted ? PALETTE.muted : PALETTE.text, 'center', '800');
    const p = LAYOUT.pauseBtn;
    ctx.fillStyle = '#2a3040';
    rr(ctx, p.x, p.y, p.w, p.h, 8);
    ctx.fill();
    text(ctx, 'II', p.x + p.w / 2, p.y + 25, 16, PALETTE.text, 'center', '800');
  }

  function drawServeButton(state) {
    const s = LAYOUT.serve;
    const match = state.bowl.noodles !== null && state.tickets.some(
      (t) => t.state === 'waiting',
    );
    const ready = match && state.tickets.some((t) => t.state === 'waiting' && t.recipe.toppings.length === state.bowl.toppings.length);
    const pulse = ready ? 0.85 + Math.sin(state.elapsed * 6) * 0.15 : 1;
    ctx.save();
    ctx.globalAlpha = ready ? 1 : 0.55;
    ctx.fillStyle = ready ? '#7ec850' : '#3a4256';
    ctx.scale(1, 1);
    rr(ctx, s.x, s.y, s.w, s.h, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
    text(ctx, 'SERVE  (Space)', s.x + s.w / 2, s.y + 33, 18, ready ? '#12240a' : PALETTE.muted, 'center', '800');
    ctx.restore();
    void pulse;
  }

  function drawFloats(state) {
    for (const float of state.floats) {
      const alpha = Math.max(0, float.ttl / float.maxTtl);
      let fx = 640;
      let fy = 420;
      if (typeof float.slot === 'number') {
        fx = LAYOUT.board.x + LAYOUT.board.w / 2;
        fy = LAYOUT.board.y + 60 + float.slot * 60;
      } else if (float.slot === 'pot') {
        fx = LAYOUT.pot.x + LAYOUT.pot.w / 2;
        fy = LAYOUT.pot.y + 60;
      } else if (float.slot === 'bowl') {
        fx = LAYOUT.bowl.x + LAYOUT.bowl.w / 2;
        fy = LAYOUT.bowl.y + 20;
      }
      const rise = (1 - alpha) * 36;
      ctx.globalAlpha = alpha;
      text(ctx, float.text, fx, fy - rise, 20, float.color, 'center', '800');
      ctx.globalAlpha = 1;
    }
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(8,10,22,0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'MOONLIT RAMEN', 640, 170, 54, PALETTE.text, 'center', '800');
    text(ctx, 'a midnight noodle-bar rush', 640, 208, 20, PALETTE.gold, 'center', '600');
    text(ctx, 'Orders pile up on the board. Boil the noodles, lift them in the', 640, 268, 17, PALETTE.text, 'center');
    text(ctx, 'green zone, pile on the toppings each ticket asks for — and serve', 640, 294, 17, PALETTE.text, 'center');
    text(ctx, 'before patience runs out. Perfect noodles, big tips, hot combos.', 640, 320, 17, PALETTE.text, 'center');
    text(ctx, 'Click the bins or press 1–8 · 8 drops the noodles · Space serves · P pauses', 640, 372, 15, PALETTE.muted, 'center');
    ctx.fillStyle = PALETTE.gold;
    rr(ctx, 490, 410, 300, 56, 14);
    ctx.fill();
    text(ctx, 'START SHIFT  (Space)', 640, 446, 20, '#241a05', 'center', '800');
    if (best > 0) text(ctx, `Best shift: ${best.toLocaleString('en-US')} pts`, 640, 500, 15, PALETTE.muted, 'center');
    void state;
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(8,10,22,0.66)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'PAUSED', 640, 330, 48, PALETTE.text, 'center', '800');
    text(ctx, 'Press P or click to keep cooking', 640, 372, 17, PALETTE.muted, 'center');
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(8,10,22,0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.board;
    rr(ctx, 390, 130, 500, 440, 18);
    ctx.fill();
    ctx.strokeStyle = PALETTE.boardEdge;
    ctx.lineWidth = 3;
    rr(ctx, 390, 130, 500, 440, 18);
    ctx.stroke();
    text(ctx, 'SHIFT OVER', 640, 190, 40, PALETTE.text, 'center', '800');
    const stars = starsFor(state.score);
    for (let i = 0; i < 3; i += 1) {
      text(ctx, i < stars ? '★' : '☆', 560 + i * 80, 250, 52, i < stars ? PALETTE.gold : '#4a5060', 'center');
    }
    text(ctx, `Score  ${state.score.toLocaleString('en-US')}`, 640, 310, 22, PALETTE.gold, 'center', '800');
    text(ctx, `Bowls served  ${state.served}      Walked out  ${state.lost}`, 640, 348, 16, PALETTE.text, 'center');
    text(ctx, `Best combo  x${state.bestCombo}      Best shift  ${best.toLocaleString('en-US')}`, 640, 378, 16, PALETTE.text, 'center');
    text(
      ctx,
      stars === 3 ? 'A legendary night at the bar!' : stars === 2 ? 'The regulars are impressed.' : stars === 1 ? 'A decent shift — the pot stayed hot.' : 'Rough night. The noodles forgive you.',
      640, 420, 15,
      PALETTE.muted,
      'center',
    );
    ctx.fillStyle = PALETTE.gold;
    rr(ctx, 490, 460, 300, 56, 14);
    ctx.fill();
    text(ctx, 'COOK AGAIN  (Space)', 640, 496, 20, '#241a05', 'center', '800');
  }

  function draw(state, screen, best, muted) {
    drawBackground(state.elapsed);
    drawMenuBoard();
    drawOrderBoard(state);
    drawPot(state);
    drawBowl(state);
    const binRegions = drawBins(state);
    drawServeButton(state);
    if (state.message) {
      text(ctx, state.message, LAYOUT.message.x, LAYOUT.message.y, 15, '#ffd94d', 'center', '700');
    }
    drawHud(state, muted);
    drawFloats(state);
    lastRegions = { bins: binRegions };
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best);
  }

  /** Translate a click into the command it means, or null when it hit nothing. */
  function hitTest(x, y, state, screen) {
    if (screen !== SCREEN_PLAY) return null;
    const inRect = (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    if (inRect(LAYOUT.pauseBtn)) return { pause: true };
    if (inRect(LAYOUT.muteBtn)) return { mute: true };
    if (inRect(LAYOUT.pot)) return { pot: true };
    if (inRect(LAYOUT.serve)) return { serve: true };
    if (inRect(LAYOUT.trash)) return { trash: true };
    // A ticket card: try to serve that customer.
    const board = LAYOUT.board;
    const ordered = [...state.tickets].sort((a, b) => a.seat - b.seat);
    for (let i = 0; i < ordered.length; i += 1) {
      const ty = board.y + 44 + i * (LAYOUT.ticket.h + LAYOUT.ticket.gap);
      if (x >= board.x && x <= board.x + board.w && y >= ty && y <= ty + LAYOUT.ticket.h) {
        return { serve: true };
      }
    }
    // A topping chip under the bowl: take that topping back out.
    if (state.bowl.toppings.length > 0) {
      const chipY = LAYOUT.bowl.y + LAYOUT.bowl.h - 26;
      if (y >= chipY && y <= chipY + 20) {
        let chipX = LAYOUT.bowl.x + 12;
        ctx.font = `600 11px ${FONT}`;
        for (const topping of state.bowl.toppings) {
          const chipW = ctx.measureText(INGREDIENTS[topping].label).width + 30;
          if (x >= chipX && x <= chipX + chipW) return { remove: topping };
          chipX += chipW + 6;
        }
      }
    }
    if (lastRegions) {
      for (const bin of lastRegions.bins) {
        if (inRect(bin)) {
          if (bin.id === 'noodle') return { pot: true };
          return { add: bin.id };
        }
      }
    }
    return null;
  }

  return { draw, hitTest };
}
