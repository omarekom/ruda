// Mockup helpers: a dark "night floor" world on a canvas and pixel thumbnails.
function rng(seed) {
  return () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

const COLORS = {
  stone: '#5b5f66',
  wire: '#7a1c1c',
  wireOn: '#ff3b2f',
  lamp: '#4a3d1c',
  lampOn: '#ffd34d',
  power: '#c4211a',
  torch: '#ff7a2f',
  delayer: '#8a8f97',
};

function paintWorld(canvas, cell = 32, seed = 7) {
  const ctx = canvas.getContext('2d');
  const w = (canvas.width = canvas.clientWidth);
  const h = (canvas.height = canvas.clientHeight);
  ctx.fillStyle = '#16181c';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#1f2227';
  for (let x = 0; x < w; x += cell) ctx.strokeRect(x, 0, cell, h);
  for (let y = 0; y < h; y += cell) ctx.strokeRect(0, y, w, cell);
  const r = rng(seed);
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  const glows = [];
  for (let n = 0; n < (cols * rows) / 9; n++) {
    const cx = Math.floor(r() * cols);
    const cy = Math.floor(r() * rows);
    const len = 2 + Math.floor(r() * 6);
    const horizontal = r() > 0.5;
    const on = r() > 0.5;
    for (let i = 0; i < len; i++) {
      const x = (horizontal ? cx + i : cx) * cell;
      const y = (horizontal ? cy : cy + i) * cell;
      ctx.fillStyle = on ? COLORS.wireOn : COLORS.wire;
      if (horizontal) ctx.fillRect(x, y + cell * 0.42, cell, cell * 0.16);
      else ctx.fillRect(x + cell * 0.42, y, cell * 0.16, cell);
    }
    const ex = (horizontal ? cx + len : cx) * cell;
    const ey = (horizontal ? cy : cy + len) * cell;
    ctx.fillStyle = on ? COLORS.lampOn : COLORS.lamp;
    ctx.fillRect(ex + 2, ey + 2, cell - 4, cell - 4);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(ex + 2, ey + 2, cell - 4, cell - 4);
    ctx.lineWidth = 1;
    if (on) glows.push([ex + cell / 2, ey + cell / 2]);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y] of glows) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, cell * 3);
    g.addColorStop(0, 'rgba(255,200,80,0.35)');
    g.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - cell * 3, y - cell * 3, cell * 6, cell * 6);
  }
  ctx.globalCompositeOperation = 'source-over';
}

function paintAllWorlds() {
  document.querySelectorAll('canvas[data-world]').forEach((c, i) => {
    paintWorld(c, Number(c.dataset.cell || 32), Number(c.dataset.world || i + 3));
  });
}

function variantSwitcher() {
  const buttons = document.querySelectorAll('[data-show]');
  const show = (id) => {
    document.querySelectorAll('.variant').forEach((v) => (v.hidden = v.id !== id));
    buttons.forEach((b) => b.classList.toggle('on', b.dataset.show === id));
    requestAnimationFrame(paintAllWorlds);
  };
  buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.show)));
  show(buttons[0].dataset.show);
  addEventListener('resize', paintAllWorlds);
}
