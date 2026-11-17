// Throwaway prototype helper: a fake world and a renderer. Styles live in styles.js.
// Not real simulation: signals are faked so the mockups look alive.
(() => {
  const TYPES = ['redstone_block', 'lever', 'wire', 'crossing', 'lamp', 'torch', 'stone', 'delayer', 'button', 'piston'];
  const NAMES = {
    redstone_block: 'Redstone block',
    lever: 'Lever',
    wire: 'Wire',
    crossing: 'Crossing',
    lamp: 'Lamp',
    torch: 'Torch',
    stone: 'Stone',
    delayer: 'Delayer',
    button: 'Button',
    piston: 'Piston',
    piston_head: 'Piston head',
  };
  const HINTS = {
    redstone_block: 'Always-on power source',
    lever: 'Toggle with right click',
    wire: 'Carries signal',
    crossing: 'Two wires pass without touching',
    lamp: 'Lights up when powered',
    torch: 'Inverter, 1 tick delay',
    stone: 'Inert building block',
    delayer: 'Delays the signal 1–4 ticks',
    button: 'Powers for 1 second',
    piston: 'Pushes blocks in front',
  };
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const key = (x, y) => x + ',' + y;
  const STYLES = {};

  // ---------- worlds ----------

  function makeWorld() {
    const cells = new Map();
    const put = (x, y, type, extra = {}) => {
      if (!cells.has(key(x, y))) cells.set(key(x, y), { x, y, type, facing: 1, sig: null, ...extra });
    };
    const row = (x0, x1, y, sig) => { for (let x = x0; x <= x1; x++) put(x, y, 'wire', { sig }); };
    const col = (x, y0, y1, sig) => { for (let y = y0; y <= y1; y++) put(x, y, 'wire', { sig }); };
    return { cells, levers: {}, buttonAt: -1e9, put, row, col };
  }

  function demoWorld() {
    const w = makeWorld();
    const { put, row, col } = w;
    // lever -> lamp
    put(-6, -4, 'lever', { sig: 'L1' }); row(-5, -1, -4, 'L1'); put(0, -4, 'lamp', { sig: 'L1' });
    // redstone block -> torch (NOT) -> crossing -> lamp
    put(-6, 0, 'redstone_block', { sig: 'ON' }); row(-5, -4, 0, 'ON');
    put(-3, 0, 'torch', { sig: 'T1' }); row(-2, -2, 0, 'T1');
    put(-1, 0, 'crossing', { sig: 'T1', sig2: 'CLK' }); row(0, 1, 0, 'T1'); put(2, 0, 'lamp', { sig: 'T1' });
    // torch clock feeding a vertical line through the crossing
    put(-1, -2, 'lamp', { sig: 'CLK' }); col(-1, -1, -1, 'CLK'); col(-1, 1, 3, 'CLK');
    put(-3, 3, 'torch', { sig: 'CLK' }); put(-2, 3, 'wire', { sig: 'CLK' });
    put(-2, 4, 'wire', { sig: 'CLK' }); row(-4, -3, 4, 'CLK'); put(-4, 3, 'wire', { sig: 'CLK' });
    put(0, 3, 'lamp', { sig: 'CLK' });
    // second lever with a NOT branch
    put(4, -2, 'lever', { sig: 'L2' }); row(5, 7, -2, 'L2'); put(8, -2, 'lamp', { sig: 'L2' });
    put(6, -1, 'torch', { facing: 2, sig: 'NL2' }); col(6, 0, 1, 'NL2'); put(6, 2, 'lamp', { sig: 'NL2' });
    // button -> delayer -> lamp
    put(-6, 6, 'button', { sig: 'BTN' }); row(-5, -4, 6, 'BTN');
    put(-3, 6, 'delayer', { sig: 'BTN_D', delay: 3 }); row(-2, -1, 6, 'BTN_D'); put(0, 6, 'lamp', { sig: 'BTN_D' });
    // lever -> piston pushing a stone
    put(3, 6, 'lever', { sig: 'L3' }); put(4, 6, 'wire', { sig: 'L3' }); put(5, 6, 'piston', { sig: 'L3' }); put(6, 6, 'stone');
    for (const [x, y] of [[3, -5], [4, -5], [5, -5], [9, 1], [9, 2], [-8, 2], [-8, 3], [-8, 4]]) put(x, y, 'stone');
    w.levers = { L1: true, L2: false, L3: true };
    return w;
  }

  function randomWorld(seed) {
    let a = seed >>> 0;
    const rnd = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const w = makeWorld();
    const n = 4 + Math.floor(rnd() * 6);
    for (let i = 0; i < n; i++) {
      let x = Math.floor(rnd() * 20) - 10, y = Math.floor(rnd() * 12) - 6;
      const sig = rnd() < 0.6 ? 'ON' : 'OFF';
      w.put(x, y, rnd() < 0.5 ? 'lever' : 'redstone_block', { sig });
      let dx = 1, dy = 0;
      const len = 4 + Math.floor(rnd() * 10);
      for (let j = 0; j < len; j++) {
        if (rnd() < 0.15) [dx, dy] = [dy, dx];
        x += dx; y += dy;
        w.put(x, y, 'wire', { sig });
      }
      w.put(x + dx, y + dy, 'lamp', { sig });
    }
    for (let i = 0; i < 10; i++) w.put(Math.floor(rnd() * 24) - 12, Math.floor(rnd() * 14) - 7, 'stone');
    return w;
  }

  const buttonOn = (world, t) => t >= world.buttonAt && t < world.buttonAt + 1000;

  function signals(world, t) {
    const S = { ON: true, OFF: false, ...world.levers };
    S.T1 = !S.ON;
    S.NL2 = !S.L2;
    S.CLK = Math.floor(t / 600) % 2 === 0;
    S.BTN = buttonOn(world, t);
    S.BTN_D = buttonOn(world, t - 300);
    return S;
  }

  // ---------- view ----------

  function connects(n, dir) {
    if (!n || n.type === 'stone' || n.type === 'piston_head') return false;
    if (n.type === 'torch' || n.type === 'delayer') return n.facing % 2 === dir % 2;
    if (n.type === 'piston') return (dir + 2) % 4 !== n.facing;
    return true;
  }

  // Shared offscreen canvas for pixelated styles.
  const off = document.createElement('canvas');

  /** Draws one block into the square (0,0)–(s,s) of g, honouring the style's pixelation. */
  function renderBlock(g, style, cell, s, k) {
    const draw = style.blocks[cell.type];
    if (!draw) return;
    if (!style.pixelate) {
      g.save();
      draw(g, cell, s, k);
      g.restore();
      return;
    }
    const p = style.pixelate;
    off.width = off.height = p;
    const og = off.getContext('2d');
    og.clearRect(0, 0, p, p);
    og.save();
    draw(og, cell, p, k);
    og.restore();
    g.save();
    g.imageSmoothingEnabled = false;
    g.drawImage(off, 0, 0, s, s);
    g.restore();
  }

  class WorldView {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.g = canvas.getContext('2d');
      this.style = STYLES[opts.style || 'pixel'];
      this.world = opts.world || demoWorld();
      this.zoom = opts.zoom || 36;
      this.cx = opts.cx ?? 0.5;
      this.cy = opts.cy ?? 1;
      this.tool = null;
      this.rotation = 1;
      this.hover = null;
      this.keys = new Set();
      this.onHover = opts.onHover || (() => {});
      this.onEdit = opts.onEdit || (() => {});
      this.start = performance.now();
      this.last = this.start;
      this.fps = 60;
      this.lighting = opts.lighting || 'off';
      this.interactive = opts.interactive !== false;
      if (this.interactive) this.bind();
      new ResizeObserver(() => this.resize()).observe(canvas);
      this.resize();
      const loop = (t) => {
        this.frame(performance.now());
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
    setStyle(name) {
      this.style = STYLES[name];
    }
    get tick() {
      return Math.floor((performance.now() - this.start) / 100);
    }
    resize() {
      const dpr = devicePixelRatio || 1;
      this.w = this.canvas.clientWidth;
      this.h = this.canvas.clientHeight;
      this.canvas.width = this.w * dpr;
      this.canvas.height = this.h * dpr;
      this.dpr = dpr;
      // Resizing clears the canvas; redraw now instead of waiting for the next frame.
      if (this.w && this.style) this.draw(performance.now());
    }
    cellAt(px, py) {
      return { x: Math.floor((px - this.w / 2) / this.zoom + this.cx), y: Math.floor((py - this.h / 2) / this.zoom + this.cy) };
    }
    cellAtF(px, py) {
      return [(px - this.w / 2) / this.zoom + this.cx, (py - this.h / 2) / this.zoom + this.cy];
    }
    get(x, y) {
      return this.world.cells.get(key(x, y));
    }
    bind() {
      const cv = this.canvas;
      let down = null;
      const pos = (e) => {
        const r = cv.getBoundingClientRect();
        return [e.clientX - r.left, e.clientY - r.top];
      };
      cv.addEventListener('contextmenu', (e) => e.preventDefault());
      cv.addEventListener('mousedown', (e) => {
        const [x, y] = pos(e);
        down = { x, y, button: e.button, moved: false, cell: this.cellAt(x, y) };
        if (e.button !== 2) return;
        const b = this.get(down.cell.x, down.cell.y);
        if (b && b.type === 'lever') {
          this.world.levers[b.sig] = !this.world.levers[b.sig];
          this.onEdit('toggle');
          down = null;
        } else if (b && b.type === 'button') {
          this.world.buttonAt = performance.now();
          down = null;
        } else if (b && b.type === 'delayer') {
          b.delay = (b.delay % 4) + 1;
          this.onEdit('delay');
          down = null;
        }
      });
      addEventListener('mousemove', (e) => {
        const [x, y] = pos(e);
        const inside = x >= 0 && y >= 0 && x < this.w && y < this.h;
        this.hover = inside ? this.cellAt(x, y) : null;
        this.onHover(this.hover, this.hover && this.get(this.hover.x, this.hover.y));
        if (!down) return;
        if (down.button === 2) {
          const c = this.cellAt(x, y), dx = c.x - down.cell.x, dy = c.y - down.cell.y;
          if (dx || dy) this.rotation = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
          return;
        }
        if (Math.hypot(x - down.x, y - down.y) > 4) down.moved = true;
        if (down.moved) {
          this.cx -= e.movementX / this.zoom;
          this.cy -= e.movementY / this.zoom;
        }
      });
      addEventListener('mouseup', () => {
        if (!down) return;
        const { x, y } = down.cell;
        if (down.button === 0 && !down.moved && this.get(x, y)) {
          this.world.cells.delete(key(x, y));
          this.onEdit('remove');
        }
        if (down.button === 2 && this.tool && !this.get(x, y)) {
          const sig = this.tool === 'lever' ? 'P' + Math.random() : null;
          this.world.cells.set(key(x, y), { x, y, type: this.tool, facing: this.rotation, sig, delay: 1 });
          this.onEdit('place');
        }
        down = null;
      });
      cv.addEventListener('wheel', (e) => {
        e.preventDefault();
        const [x, y] = pos(e);
        const before = this.cellAtF(x, y);
        this.zoom = Math.min(96, Math.max(6, this.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
        const after = this.cellAtF(x, y);
        this.cx += before[0] - after[0];
        this.cy += before[1] - after[1];
      }, { passive: false });
      addEventListener('keydown', (e) => {
        if (e.target.closest && e.target.closest('input,textarea')) return;
        const k = e.key.toLowerCase();
        if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k) && !e.ctrlKey) this.keys.add(k);
        if (k === 'r') this.rotation = (this.rotation + 1) % 4;
      });
      addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
      addEventListener('blur', () => this.keys.clear());
    }
    appearance(c, S, t) {
      const att = DIRS.map(([dx, dy], d) => connects(this.get(c.x + dx, c.y + dy), d));
      if (c.type === 'torch' || c.type === 'delayer') att.fill(false);
      const k = { att, on: !!S[c.sig], on2: !!S[c.sig2], t };
      if (c.type === 'delayer') {
        const d = c.delay || 1;
        // line[0] is the output, the last item the newest input sample.
        k.line = Array.from({ length: d }, (_, i) => (c.sig === 'BTN_D' ? buttonOn(this.world, t - (d - i) * 100) : false));
        k.on = k.line[0];
      }
      return k;
    }
    frame(t) {
      // Static thumbnails only need to follow the 10 ticks/s signal changes.
      if (!this.interactive) {
        if (t - this.last < 100) return;
        this.last = t;
        this.draw(t);
        return;
      }
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.fps = this.fps * 0.95 + (dt > 0 ? 1 / dt : 60) * 0.05;
      this.last = t;
      const sp = 14 * dt;
      const k = this.keys;
      if (k.has('w') || k.has('arrowup')) this.cy -= sp;
      if (k.has('s') || k.has('arrowdown')) this.cy += sp;
      if (k.has('a') || k.has('arrowleft')) this.cx -= sp;
      if (k.has('d') || k.has('arrowright')) this.cx += sp;
      this.draw(t);
    }
    sx(x) {
      return (x - this.cx) * this.zoom + this.w / 2;
    }
    sy(y) {
      return (y - this.cy) * this.zoom + this.h / 2;
    }
    draw(t) {
      const { g, style, zoom: z, w, h } = this;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.fillStyle = style.bg;
      g.fillRect(0, 0, w, h);
      if (style.texture) {
        const pattern = texturePattern(g, style);
        pattern.setTransform(new DOMMatrix().translate(w / 2 - this.cx * z, h / 2 - this.cy * z));
        g.fillStyle = pattern;
        g.fillRect(0, 0, w, h);
      }
      const x0 = Math.floor(this.cx - w / 2 / z) - 1, x1 = Math.ceil(this.cx + w / 2 / z) + 1;
      const y0 = Math.floor(this.cy - h / 2 / z) - 1, y1 = Math.ceil(this.cy + h / 2 / z) + 1;
      const grid = (step, color) => {
        g.strokeStyle = color;
        g.lineWidth = 1;
        g.beginPath();
        for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
          const p = Math.round(this.sx(x)) + 0.5;
          g.moveTo(p, 0);
          g.lineTo(p, h);
        }
        for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
          const p = Math.round(this.sy(y)) + 0.5;
          g.moveTo(0, p);
          g.lineTo(w, p);
        }
        g.stroke();
      };
      if (z >= 10 && style.grid) grid(1, style.grid);
      if (style.gridMajor) grid(8, style.gridMajor);
      const S = signals(this.world, t);

      // Extended pistons: a head appears in front and the block there moves one further.
      const moved = new Map();
      const heads = [];
      for (const c of this.world.cells.values()) {
        if (c.type !== 'piston' || !S[c.sig]) continue;
        const [dx, dy] = DIRS[c.facing];
        const front = this.get(c.x + dx, c.y + dy);
        if (front) moved.set(front, [front.x + dx, front.y + dy]);
        heads.push({ x: c.x + dx, y: c.y + dy, type: 'piston_head', facing: c.facing });
      }

      const visible = (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
      const put = (c, x, y, k) => {
        if (!visible(x, y)) return;
        g.save();
        g.translate(this.sx(x), this.sy(y));
        renderBlock(g, style, c, z, k);
        g.restore();
      };
      const drawn = [];
      for (const c of this.world.cells.values()) {
        const [x, y] = moved.get(c) || [c.x, c.y];
        drawn.push([c, x, y, this.appearance(c, S, t)]);
      }
      const lights = this.lighting === 'off' ? [] : collectLights(drawn, style);
      // Light pools on the floor, under the blocks.
      this.paintLights(lights, style.dark ? 'lighter' : 'source-over', style.dark ? 1 : 0.8);
      for (const [c, x, y, k] of drawn) put(c, x, y, k);
      for (const head of heads) put(head, head.x, head.y, { att: [false, false, false, false], on: false, t });
      if (this.lighting === 'night') this.paintNight(lights, style);
      // A softer bloom over the blocks, so lit things tint their neighbours too.
      else if (style.dark) this.paintLights(lights, 'lighter', 0.2);

      if (this.hover) {
        const { x, y } = this.hover;
        if (this.tool && !this.get(x, y)) {
          g.save();
          g.globalAlpha = 0.45;
          g.translate(this.sx(x), this.sy(y));
          const ghost = { x, y, type: this.tool, facing: this.rotation, delay: 1 };
          renderBlock(g, style, ghost, z, this.appearance(ghost, {}, t));
          g.restore();
        }
        g.strokeStyle = style.cursor;
        g.lineWidth = 1.5;
        g.strokeRect(this.sx(x) + 0.5, this.sy(y) + 0.5, z - 1, z - 1);
      }
      if (style.post) style.post(g, w, h, t);
    }
    paintLights(lights, mode, strength) {
      const { g, zoom: z } = this;
      g.save();
      g.globalCompositeOperation = mode;
      for (const l of lights) {
        const cx = this.sx(l.x + 0.5), cy = this.sy(l.y + 0.5), r = l.radius * z;
        const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        for (const [stop, f] of [[0, 1], [0.25, 0.66], [0.5, 0.33], [0.75, 0.1], [1, 0]]) grad.addColorStop(stop, rgba(l.color, l.alpha * strength * f));
        g.fillStyle = grad;
        g.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      g.restore();
    }
    /** Darkens the whole scene except around light sources. */
    paintNight(lights, style) {
      const { g, zoom: z, w, h } = this;
      const dark = this.nightCanvas || (this.nightCanvas = document.createElement('canvas'));
      dark.width = w;
      dark.height = h;
      const d = dark.getContext('2d');
      d.fillStyle = style.night || (style.dark ? 'rgba(4,6,16,0.55)' : 'rgba(30,30,60,0.28)');
      d.fillRect(0, 0, w, h);
      d.globalCompositeOperation = 'destination-out';
      for (const l of lights) {
        const cx = this.sx(l.x + 0.5), cy = this.sy(l.y + 0.5), r = l.radius * z * 1.3;
        const grad = d.createRadialGradient(cx, cy, 0, cx, cy, r);
        const a = Math.min(1, l.alpha * 2.6);
        for (const [stop, f] of [[0, 1], [0.3, 0.7], [0.6, 0.3], [1, 0]]) grad.addColorStop(stop, `rgba(0,0,0,${a * f})`);
        d.fillStyle = grad;
        d.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      g.drawImage(dark, 0, 0, w, h);
      this.paintLights(lights, style.dark ? 'lighter' : 'source-over', 0.3);
    }
  }

  // ---------- lighting and texture ----------

  /** Light radius (cells) and strength per lit block type. */
  const LIGHTS = {
    lamp: { radius: 4.8, alpha: 0.34, color: 'lamp' },
    torch: { radius: 2.2, alpha: 0.22, color: 'power' },
    redstone_block: { radius: 2, alpha: 0.18, color: 'power' },
    button: { radius: 1.6, alpha: 0.18, color: 'power' },
    wire: { radius: 1, alpha: 0.07, color: 'power' },
    crossing: { radius: 1, alpha: 0.07, color: 'power' },
  };
  function collectLights(drawn, style) {
    const out = [];
    for (const [c, x, y, k] of drawn) {
      const spec = LIGHTS[c.type];
      const lit = c.type === 'redstone_block' || k.on || (c.type === 'crossing' && k.on2);
      if (!spec || !lit) continue;
      const color = spec.color === 'lamp' ? style.lightColor.lamp : style.lightColor.power;
      out.push({ x, y, radius: spec.radius, alpha: spec.alpha, color });
    }
    return out;
  }
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  /** A tileable speckle texture (paper fibres, chalk dust), cached per style. */
  function texturePattern(g, style) {
    if (!style.textureTile) style.textureTile = makeTextureTile(style.texture);
    return g.createPattern(style.textureTile, 'repeat');
  }
  function makeTextureTile({ color, amount }) {
    const size = 160;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const t = cv.getContext('2d');
    let a = 12345;
    const rnd = () => ((a = (a * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < amount; i++) {
      t.fillStyle = rgba(color, 0.04 + rnd() * 0.08);
      const x = rnd() * size, y = rnd() * size;
      if (rnd() < 0.85) t.fillRect(x, y, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
      else {
        t.strokeStyle = t.fillStyle;
        t.beginPath();
        t.moveTo(x, y);
        t.lineTo(x + (rnd() - 0.5) * 14, y + (rnd() - 0.5) * 14);
        t.stroke();
      }
    }
    return cv;
  }

  /** Draws a block on its own (hotbar, palettes). Pistons and buttons default to their rest state. */
  function drawIcon(canvas, type, styleName = 'pixel', on) {
    const active = on ?? (type !== 'piston' && type !== 'button');
    const dpr = devicePixelRatio || 1;
    const s = canvas.clientWidth || canvas.width;
    canvas.width = s * dpr;
    canvas.height = s * dpr;
    const g = canvas.getContext('2d');
    g.scale(dpr, dpr);
    const k = { att: [false, true, false, true], on: active, on2: active, line: active ? [true, false, true] : [false, false, false], t: 0 };
    renderBlock(g, STYLES[styleName], { type, facing: 0, x: 0, y: 0, delay: 3 }, s, k);
  }

  function drawMinimap(canvas, view) {
    const dpr = devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const px = 3, ox = w / 2 - view.cx * px, oy = h / 2 - view.cy * px;
    for (const c of view.world.cells.values()) {
      g.fillStyle = view.style.mini[c.type] || '#888';
      g.fillRect(ox + c.x * px, oy + c.y * px, px, px);
    }
    g.strokeStyle = view.style.cursor;
    g.lineWidth = 1;
    const vw = (view.w / view.zoom) * px, vh = (view.h / view.zoom) * px;
    g.strokeRect(w / 2 - vw / 2, h / 2 - vh / 2, vw, vh);
  }

  /** Number keys select a slot: 1–9, then 0 for the tenth. */
  function bindSlots(onSelect) {
    addEventListener('keydown', (e) => {
      if (!/^[0-9]$/.test(e.key) || e.target.closest('input,textarea')) return;
      const i = e.key === '0' ? 9 : Number(e.key) - 1;
      if (i < TYPES.length) onSelect(i);
    });
  }
  const slotKey = (i) => String((i + 1) % 10);

  window.Ruda = { TYPES, NAMES, HINTS, DIRS, STYLES, WorldView, demoWorld, randomWorld, drawIcon, drawMinimap, bindSlots, slotKey };
})();
