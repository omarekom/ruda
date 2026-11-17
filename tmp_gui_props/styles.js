// Block visual styles for the prototypes. Most styles come from one parametric "kit"
// (palette + shape options); a few are drawn by hand (pixel, schematic, PCB, terminal).
(() => {
  const { STYLES, DIRS } = Ruda;

  // ---------- helpers ----------

  function wireSides(att) {
    const count = att.filter(Boolean).length;
    const sides = [0, 1, 2, 3].filter((d) => (count === 0 ? true : count === 1 ? att[d] || att[(d + 2) % 4] : att[d]));
    return { sides, arm: count === 0 ? 0.3 : 0.5, count };
  }
  const armsOf = (att) => {
    const { sides, arm, count } = wireSides(att);
    return { count, arms: sides.map((d) => [[0.5, 0.5], [0.5 + DIRS[d][0] * arm, 0.5 + DIRS[d][1] * arm]]) };
  };
  /** Rotates the drawing so that "north" in the drawer points to `facing`. */
  function face(g, s, facing) {
    g.translate(s / 2, s / 2);
    g.rotate(((facing ?? 0) * Math.PI) / 2);
    g.translate(-s / 2, -s / 2);
  }
  function mix(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (n, sh) => Math.round(((n >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
    const out = [16, 8, 0].map((sh) => ch(pa, sh));
    return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  const seedOf = (c) => ((c.x ?? 0) * 73856093) ^ ((c.y ?? 0) * 19349663);

  /** Primitive shapes in cell fractions (0..1), rendered according to the theme's options. */
  function prims(g, s, T, seed) {
    let n = 0;
    const rnd = () => {
      n++;
      let h = (seed * 374761393 + n * 668265263) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296 - 0.5;
    };
    const J = T.sketch ? (T.jitter ?? 0.035) : 0;
    const j = () => rnd() * J * 2 * s;
    const path = (pts, closed) => {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x * s + j(), y * s + j()) : g.moveTo(x * s + j(), y * s + j())));
      if (closed) g.closePath();
    };
    const lw = (f) => Math.max(1, s * f);

    function shape(build, o) {
      g.save();
      if (o.alpha !== undefined) g.globalAlpha = o.alpha;
      if (o.glow && T.glow) {
        g.shadowColor = o.fill;
        g.shadowBlur = s * 0.45;
      } else if (o.body && T.shadow) {
        g.shadowColor = T.shadowColor || 'rgba(0,0,0,0.28)';
        g.shadowBlur = s * 0.08;
        g.shadowOffsetY = s * 0.05;
      } else if (o.body && T.hardShadow) {
        g.shadowColor = T.shadowColor || 'rgba(0,0,0,0.2)';
        g.shadowBlur = s * 0.02;
        g.shadowOffsetX = s * 0.04;
        g.shadowOffsetY = s * 0.07;
      }
      if (T.outline && !o.solid) {
        build();
        g.strokeStyle = o.fill;
        g.lineWidth = lw(T.lw);
        g.stroke();
      } else if (T.sketch) {
        if (T.hatchFill && !o.solid) hatch(build, o.fill);
        else {
          build();
          if (!T.clean) g.globalAlpha *= 0.85;
          g.fillStyle = o.fill;
          g.fill();
          g.globalAlpha = 1;
        }
        g.shadowColor = 'transparent';
        if (!o.solid) {
          g.strokeStyle = T.ink;
          g.lineWidth = lw(0.03);
          build();
          g.stroke();
          if (!T.clean) {
            build();
            g.stroke();
          }
        }
      } else {
        build();
        g.fillStyle = o.paint || o.fill;
        g.fill();
        g.shadowColor = 'transparent';
        if (T.ink && !o.solid) {
          g.strokeStyle = T.ink;
          g.lineWidth = lw(T.inkW || 0.05);
          g.stroke();
        }
      }
      g.restore();
    }

    /** Coloured-pencil fill: a pale wash plus diagonal strokes clipped to the shape. */
    function hatch(build, color) {
      build();
      g.globalAlpha = 0.3;
      g.fillStyle = color;
      g.fill();
      g.globalAlpha = 1;
      g.save();
      build();
      g.clip();
      g.strokeStyle = color;
      g.lineWidth = lw(0.05);
      for (let i = -1; i < 1; i += 0.1) {
        path([[i, 1], [i + 1, 0]]);
        g.stroke();
      }
      g.restore();
    }

    return {
      rect(x, y, w, h, o) {
        if (T.relief && o.body && !T.outline && o.fill.startsWith('#')) {
          const grad = g.createLinearGradient(0, y * s, 0, (y + h) * s);
          grad.addColorStop(0, mix(o.fill, '#ffffff', 0.18));
          grad.addColorStop(1, mix(o.fill, '#000000', 0.12));
          o = { ...o, paint: grad };
        }
        const r = (o.r ?? T.radius ?? 0) * Math.min(w, h) * s;
        shape(() => {
          if (T.sketch) path([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true);
          else {
            g.beginPath();
            g.roundRect(x * s, y * s, w * s, h * s, r);
          }
        }, o);
        if (T.bevel && o.body && !T.outline) {
          const b = lw(0.06);
          g.fillStyle = 'rgba(255,255,255,0.32)';
          g.fillRect(x * s, y * s, w * s, b);
          g.fillRect(x * s, y * s, b, h * s);
          g.fillStyle = 'rgba(0,0,0,0.25)';
          g.fillRect(x * s, (y + h) * s - b, w * s, b);
          g.fillRect((x + w) * s - b, y * s, b, h * s);
        }
      },
      circle(cx, cy, r, o) {
        shape(() => {
          if (T.sketch) path(Array.from({ length: 10 }, (_, i) => [cx + Math.cos(i * 0.628) * r, cy + Math.sin(i * 0.628) * r]), true);
          else {
            g.beginPath();
            g.arc(cx * s, cy * s, r * s, 0, Math.PI * 2);
          }
        }, o);
      },
      poly(pts, o) {
        shape(() => path(pts, true), o);
      },
      line(pts, color, width, o = {}) {
        g.save();
        if (o.glow && T.glow) {
          g.shadowColor = color;
          g.shadowBlur = s * 0.45;
        }
        g.strokeStyle = color;
        g.lineCap = o.cap || T.cap || 'round';
        g.lineWidth = lw(width);
        if (o.dash) {
          g.setLineDash([s * 0.12, s * 0.14]);
          g.lineDashOffset = -(o.t || 0) / 30;
        }
        path(pts);
        g.stroke();
        if (T.sketch && !T.clean) {
          g.lineWidth = lw(width * 0.6);
          path(pts);
          g.stroke();
        }
        g.restore();
      },
    };
  }

  // ---------- the kit ----------

  function kit(T) {
    const C = T.c;
    const P = (g, s, c) => prims(g, s, T, seedOf(c));
    const w = T.wireW ?? 0.2;
    const pw = (on) => (on ? C.on : C.off);
    return {
      wire(g, c, s, k) {
        const p = P(g, s, c);
        const { arms, count } = armsOf(k.att);
        if (T.hollowOff && !k.on) {
          arms.forEach((a) => p.line(a, T.ink, w));
          arms.forEach((a) => p.line(a, C.bg, w - 2 * T.lw));
        } else arms.forEach((a) => p.line(a, pw(k.on), w, { glow: k.on }));
        if (count >= 3 && T.junction) p.circle(0.5, 0.5, w * 0.85, { fill: pw(k.on), solid: true });
        if (T.flow && k.on) arms.forEach((a) => p.line(a, T.flow, w * 0.38, { dash: true, t: k.t, cap: 'butt' }));
      },
      crossing(g, c, s, k) {
        const p = P(g, s, c);
        p.line([[0, 0.5], [1, 0.5]], pw(k.on), w, { glow: k.on, cap: 'butt' });
        p.rect(0.5 - w * 1.1, 0.5 - w * 1.1, w * 2.2, w * 2.2, { fill: C.bg, solid: true, r: 0 });
        p.line([[0.5, 0], [0.5, 1]], pw(k.on2), w, { glow: k.on2, cap: 'butt' });
      },
      redstone_block(g, c, s) {
        const p = P(g, s, c);
        p.rect(0.08, 0.08, 0.84, 0.84, { fill: C.source, body: true, glow: true });
        if (T.detail) {
          p.poly([[0.5, 0.22], [0.78, 0.5], [0.5, 0.78], [0.22, 0.5]], { fill: C.mark || '#ff8a80' });
          p.poly([[0.5, 0.22], [0.64, 0.36], [0.5, 0.5], [0.36, 0.36]], { fill: '#ffffff', alpha: 0.35, solid: true });
        } else p.rect(0.32, 0.32, 0.36, 0.36, { fill: T.outline ? C.source : C.mark || 'rgba(255,255,255,0.35)', solid: !T.outline, r: 0.3 });
      },
      stone(g, c, s) {
        const p = P(g, s, c);
        p.rect(0.06, 0.06, 0.88, 0.88, { fill: C.stone, body: true });
        if (T.stoneDots) for (const [x, y] of [[0.22, 0.28], [0.58, 0.2], [0.7, 0.62], [0.3, 0.7]]) p.rect(x, y, 0.12, 0.12, { fill: C.stoneDark, solid: true, r: 0 });
        if (T.hatch) {
          g.save();
          g.beginPath();
          g.rect(s * 0.06, s * 0.06, s * 0.88, s * 0.88);
          g.clip();
          for (let i = -1; i < 1; i += 0.2) p.line([[i, 1], [i + 1, 0]], C.stoneDark, 0.04, { cap: 'butt' });
          g.restore();
        }
        if (T.detail) p.line([[0.3, 0.18], [0.42, 0.42], [0.36, 0.58], [0.5, 0.82]], C.stoneDark || mix(C.stone, '#000000', 0.2), 0.035);
      },
      lamp(g, c, s, k) {
        const p = P(g, s, c);
        if (T.lampCore) {
          p.rect(0.06, 0.06, 0.88, 0.88, { fill: C.frame, body: true });
          if (k.on) {
            p.circle(0.5, 0.5, 0.33, { fill: C.light, glow: true });
            p.circle(0.5, 0.5, 0.16, { fill: C.core, solid: true });
          } else {
            p.circle(0.5, 0.5, 0.3, { fill: C.lightOff });
            p.circle(0.42, 0.42, 0.07, { fill: '#ffffff', alpha: 0.22, solid: true });
          }
          return;
        }
        p.rect(0.08, 0.08, 0.84, 0.84, { fill: C.frame, body: true });
        if (k.on && T.halo !== false) p.circle(0.5, 0.5, 0.42, { fill: C.light, alpha: 0.3, solid: true });
        p.circle(0.5, 0.5, 0.24, { fill: k.on ? C.light : C.lightOff, glow: k.on, solid: T.outline && k.on });
      },
      lever(g, c, s, k) {
        const p = P(g, s, c);
        p.rect(0.12, 0.3, 0.76, 0.4, { fill: C.plate, body: true, r: 0.5 });
        p.circle(k.on ? 0.68 : 0.32, 0.5, 0.15, { fill: k.on ? C.on : C.knob, glow: k.on, solid: T.outline && k.on });
      },
      torch(g, c, s, k) {
        face(g, s, c.facing);
        const p = P(g, s, c);
        p.rect(0.12, 0.58, 0.76, 0.3, { fill: C.plate, body: true });
        if (T.detail) {
          p.rect(0.44, 0.36, 0.12, 0.26, { fill: C.face, r: 0 });
          p.poly([[0.5, 0.04], [0.64, 0.27], [0.5, 0.42], [0.36, 0.27]], { fill: pw(k.on), glow: k.on });
          if (k.on) p.circle(0.5, 0.29, 0.06, { fill: C.core || '#ffffff', solid: true });
        } else p.poly([[0.5, 0.1], [0.76, 0.56], [0.24, 0.56]], { fill: pw(k.on), glow: k.on });
      },
      delayer(g, c, s, k) {
        face(g, s, c.facing);
        const p = P(g, s, c);
        const line = k.line || [false];
        p.rect(0.1, 0.06, 0.8, 0.88, { fill: C.plate, body: true });
        p.poly([[0.5, 0.1], [0.72, 0.28], [0.28, 0.28]], { fill: pw(line[0]), glow: line[0], solid: T.outline });
        for (let i = 0; i < 4; i++) {
          const v = line[i];
          p.rect(0.38, 0.36 + i * 0.14, 0.24, 0.1, { fill: v === undefined ? C.slot : pw(v), solid: true, r: 0.2 });
        }
      },
      button(g, c, s, k) {
        const p = P(g, s, c);
        p.rect(0.2, 0.2, 0.6, 0.6, { fill: C.frame, body: true });
        const i = k.on ? 0.32 : 0.27;
        p.rect(i, i, 1 - 2 * i, 1 - 2 * i, { fill: k.on ? C.on : C.knob, body: !k.on, glow: k.on, solid: T.outline && k.on });
      },
      piston(g, c, s, k) {
        face(g, s, c.facing);
        const p = P(g, s, c);
        p.rect(0.04, 0.04, 0.92, 0.92, { fill: C.plate, body: true });
        if (k.on) p.rect(0.42, 0, 0.16, 0.5, { fill: C.face, r: 0 });
        else p.rect(0.04, 0.04, 0.92, 0.24, { fill: C.face, body: true });
      },
      piston_head(g, c, s) {
        face(g, s, c.facing);
        const p = P(g, s, c);
        p.rect(0.42, 0.2, 0.16, 0.82, { fill: C.face, r: 0 });
        p.rect(0.04, 0.04, 0.92, 0.24, { fill: C.face, body: true });
      },
    };
  }

  function define(id, meta, T, overrides = {}) {
    const C = T.c;
    STYLES[id] = {
      id,
      ...meta,
      bg: C.bg,
      grid: C.grid,
      gridMajor: C.gridMajor,
      cursor: C.cursor,
      dark: meta.dark ?? true,
      lightColor: { lamp: C.light, power: C.on },
      texture: T.texture,
      night: T.night,
      pixelate: T.pixelate,
      post: T.post,
      mini: {
        wire: C.on, crossing: C.plate, lamp: C.light, stone: C.stone, redstone_block: C.source, lever: C.plate,
        torch: C.on, delayer: C.plate, button: C.knob, piston: C.face, piston_head: C.face,
      },
      blocks: { ...(T.kit === false ? {} : kit(T)), ...overrides },
    };
  }

  // ---------- kit styles ----------

  define('flat', { name: 'Paper', desc: 'Flat, rounded, warm light background. Calm and readable.', dark: false }, {
    radius: 0.2,
    c: { bg: '#efe9df', grid: 'rgba(60,40,20,0.06)', cursor: 'rgba(40,30,20,0.5)', on: '#e8433a', off: '#cdb2ab', light: '#ffc93c', lightOff: '#a79e8f',
      source: '#e8433a', stone: '#b9b3a8', plate: '#8d8578', frame: '#d8d0c2', knob: '#f7f3ec', face: '#6f675c', slot: '#b0a796' },
  });

  define('slate', { name: 'Slate', desc: 'The paper style on a dark background. Muted, low contrast when off.' }, {
    radius: 0.16,
    c: { bg: '#22252b', grid: 'rgba(255,255,255,0.04)', cursor: 'rgba(255,255,255,0.5)', on: '#ff5a4e', off: '#4f3333', light: '#ffd166', lightOff: '#3d3a33',
      source: '#e04438', stone: '#4b505a', plate: '#5b616d', frame: '#33373f', knob: '#c9ced6', face: '#9aa0ab', slot: '#2b2e35' },
  });

  define('tactile', { name: 'Tactile', desc: 'Physical toy blocks: bevels and drop shadows, as if they sit on a board.', dark: false }, {
    radius: 0.06, bevel: true, shadow: true,
    c: { bg: '#d9d4c7', grid: 'rgba(0,0,0,0.07)', cursor: 'rgba(0,0,0,0.5)', on: '#ff3b30', off: '#8a3530', light: '#ffe14d', lightOff: '#6b6247',
      source: '#d62c22', stone: '#9a9a96', plate: '#6e7076', frame: '#4a4c52', knob: '#e8e8e8', face: '#c08a4a', slot: '#3a3b40' },
  });

  define('clay', { name: 'Clay', desc: 'Soft pastel shapes with soft shadows. Friendly, toy-like, round.', dark: false }, {
    radius: 0.34, shadow: true, shadowColor: 'rgba(120,80,120,0.22)', wireW: 0.24,
    c: { bg: '#f6f0ea', grid: 'rgba(120,80,120,0.06)', cursor: 'rgba(120,80,120,0.5)', on: '#ff6f86', off: '#ecd2d8', light: '#ffd27a', lightOff: '#e6dccb',
      source: '#ff6f86', stone: '#cfc7e8', plate: '#a9c7e8', frame: '#ece3d4', knob: '#ffffff', face: '#8fbfa8', slot: '#d9d0c3' },
  });

  define('cartoon', { name: 'Cartoon', desc: 'Bright fills with thick dark outlines, like a comic or a sticker sheet.', dark: false }, {
    radius: 0.22, ink: '#1e1b2e', inkW: 0.07, wireW: 0.22,
    c: { bg: '#fff8e7', grid: 'rgba(30,27,46,0.06)', cursor: '#1e1b2e', on: '#ff3d3d', off: '#f2b8b0', light: '#ffde3b', lightOff: '#cfc6a8',
      source: '#ff3d3d', stone: '#a7b4c2', plate: '#5aa9e6', frame: '#ffffff', knob: '#ffffff', face: '#ff9f1c', slot: '#e6dcc4' },
  });

  define('neon', { name: 'Neon', desc: 'Glowing outlines on near black. Strong power indication through light.' }, {
    radius: 0.14, outline: true, lw: 0.07, glow: true, wireW: 0.12,
    c: { bg: '#0a0a12', grid: 'rgba(140,160,255,0.05)', cursor: '#7df9ff', on: '#ff3d7f', off: '#3a1a33', light: '#ffe066', lightOff: '#3d3a20',
      source: '#ff3d7f', stone: '#3a3f5c', plate: '#7df9ff', frame: '#2c3550', knob: '#2c3550', face: '#7df9ff', slot: '#1b2a3a' },
  });

  define('copper', { name: 'Copper', desc: 'Warm dark workshop. Copper wires that glow amber when powered.' }, {
    radius: 0.12, glow: true, junction: true, stoneDots: true,
    c: { bg: '#1a1410', grid: 'rgba(255,180,120,0.04)', cursor: 'rgba(255,200,150,0.6)', on: '#ffb347', off: '#6b3f22', light: '#fff1b8', lightOff: '#3a2c1c',
      source: '#ff7b2e', stone: '#3d342c', stoneDark: '#30281f', plate: '#5a4636', frame: '#2b211a', knob: '#c9a27a', face: '#b87333', slot: '#2a1f17' },
  });

  define('ocean', { name: 'Ocean', desc: 'Power is cyan, not red. Distances the look from redstone entirely.', dark: false }, {
    radius: 0.18, junction: true,
    c: { bg: '#eef6f5', grid: 'rgba(0,80,100,0.06)', cursor: 'rgba(0,60,80,0.5)', on: '#00a6d6', off: '#bcd9df', light: '#ffc233', lightOff: '#c9d6d8',
      source: '#0077b6', stone: '#c5d1d6', plate: '#7a8f99', frame: '#dce8ea', knob: '#ffffff', face: '#3d5a66', slot: '#c9d6d8' },
  });

  define('forest', { name: 'Forest', desc: 'Earthy greens and wood; power is a warm orange ember.' }, {
    radius: 0.1, bevel: true, stoneDots: true,
    c: { bg: '#1f2a1f', grid: 'rgba(200,255,200,0.04)', cursor: 'rgba(220,255,200,0.5)', on: '#ff8c2b', off: '#4a3a22', light: '#ffe08a', lightOff: '#3b3a2a',
      source: '#e0592a', stone: '#596357', stoneDark: '#4a5348', plate: '#7a5c3a', frame: '#2e3a2c', knob: '#d8c9a8', face: '#a77b4a', slot: '#273326' },
  });

  define('contrast', { name: 'High contrast', desc: 'Accessibility: yellow on black, and powered wires carry moving dashes so power never relies on colour alone.' }, {
    radius: 0.1, wireW: 0.24, flow: '#000000', ink: '#ffffff', inkW: 0.04,
    c: { bg: '#000000', grid: 'rgba(255,255,255,0.08)', cursor: '#00e5ff', on: '#ffe500', off: '#555555', light: '#ffffff', lightOff: '#222222',
      source: '#ffe500', mark: '#000000', stone: '#777777', plate: '#999999', frame: '#333333', knob: '#ffffff', face: '#00b7ff', slot: '#222222' },
  });

  define('mono', { name: '1-bit ink', desc: 'Black on paper only. Unpowered wires are hollow, powered ones solid: works in print and e-ink.', dark: false }, {
    radius: 0.12, ink: '#111111', inkW: 0.05, hollowOff: true, lw: 0.05, wireW: 0.24, hatch: true, halo: false,
    c: { bg: '#f2f0e6', grid: 'rgba(0,0,0,0.07)', cursor: '#111', on: '#111111', off: '#f2f0e6', light: '#111111', lightOff: '#f2f0e6',
      source: '#111111', mark: '#f2f0e6', stone: '#f2f0e6', stoneDark: '#111111', plate: '#f2f0e6', frame: '#f2f0e6', knob: '#f2f0e6', face: '#111111', slot: '#d6d3c6' },
  });

  define('sketch', { name: 'Sketch', desc: 'Hand drawn: wobbly pencil lines and coloured-pencil fills on notebook paper.', dark: false }, {
    sketch: true, ink: '#2d2d2d', wireW: 0.16,
    c: { bg: '#fbf8f1', grid: 'rgba(80,130,200,0.16)', cursor: '#2d2d2d', on: '#e63946', off: '#c9c3b8', light: '#ffd23f', lightOff: '#e8e1d2',
      source: '#e63946', stone: '#b8b2a7', plate: '#9fb7c9', frame: '#efe7d6', knob: '#ffffff', face: '#8d6e4c', slot: '#ddd5c4' },
  });

  define('pixelart', { name: 'Pixel art 12×12', desc: 'Every block drawn on a 12×12 pixel grid with a 16-colour palette. Retro, but not a Minecraft look.' }, {
    pixelate: 12, bevel: true, radius: 0, wireW: 0.25,
    c: { bg: '#1a1c2c', grid: 'rgba(255,255,255,0.05)', cursor: '#f4f4f4', on: '#ef7d57', off: '#5d275d', light: '#ffcd75', lightOff: '#333c57',
      source: '#b13e53', stone: '#566c86', plate: '#94b0c2', frame: '#29366f', knob: '#f4f4f4', face: '#257179', slot: '#333c57' },
  });

  define('chunky', { name: 'Pixel art 8×8', desc: 'Even chunkier: 8×8 pixels, Game Boy greens. Power shown by brightness only.', dark: false }, {
    pixelate: 8, radius: 0, wireW: 0.25,
    c: { bg: '#9bbc0f', grid: 'rgba(15,56,15,0.12)', cursor: '#0f380f', on: '#0f380f', off: '#8bac0f', light: '#e0f8d0', lightOff: '#306230',
      source: '#0f380f', mark: '#9bbc0f', stone: '#306230', plate: '#306230', frame: '#0f380f', knob: '#8bac0f', face: '#0f380f', slot: '#8bac0f' },
  });

  // ---------- pixel (the current app look) ----------

  const PX = { wireOff: '#5c1410', wireOn: '#ff3b2f', redstone: '#b3261e', redstoneDark: '#7d1712', stone: '#7a7a7a', stoneDark: '#666', lampOff: '#4a3a22',
    lampOn: '#ffd75e', lampFrame: '#2e2414', wood: '#6b4f2e', plate: '#6d6d6d', plateDark: '#4b4b4b', torchOff: '#4a1a15', torchOn: '#ff5a2a', crossing: '#2b2d33',
    slot: '#333', buttonUp: '#9a9a9a' };
  const pxWire = (on) => (on ? PX.wireOn : PX.wireOff);
  define('pixel', { name: 'Current', desc: 'What the app draws today.' }, {
    kit: false,
    c: { bg: '#1d1f24', grid: 'rgba(255,255,255,0.04)', cursor: 'rgba(255,255,255,0.6)', on: '#a3241c', light: '#ffd75e', stone: '#7a7a7a', source: '#b3261e',
      plate: '#555', knob: '#9a9a9a', face: '#6b4f2e' },
  }, {
    wire(g, c, s, k) {
      const w = Math.max(2, s * 0.22), m = s / 2;
      g.fillStyle = pxWire(k.on);
      const { sides, arm } = wireSides(k.att);
      g.fillRect(m - w / 2, m - w / 2, w, w);
      for (const d of sides) {
        if (d === 0) g.fillRect(m - w / 2, m - arm * s, w, arm * s);
        if (d === 2) g.fillRect(m - w / 2, m, w, arm * s);
        if (d === 3) g.fillRect(m - arm * s, m - w / 2, arm * s, w);
        if (d === 1) g.fillRect(m, m - w / 2, arm * s, w);
      }
    },
    crossing(g, c, s, k) {
      const w = Math.max(2, s * 0.22), m = s / 2;
      g.fillStyle = PX.crossing; g.fillRect(s * 0.15, s * 0.15, s * 0.7, s * 0.7);
      g.fillStyle = pxWire(k.on); g.fillRect(0, m - w / 2, s, w);
      g.fillStyle = PX.crossing; g.fillRect(m - w, m - w, w * 2, w * 2);
      g.fillStyle = pxWire(k.on2); g.fillRect(m - w / 2, 0, w, s);
    },
    redstone_block(g, c, s) {
      g.fillStyle = PX.redstone; g.fillRect(0, 0, s, s);
      g.fillStyle = PX.redstoneDark;
      for (const [x, y] of [[0.2, 0.2], [0.6, 0.3], [0.3, 0.65], [0.68, 0.7]]) g.fillRect(x * s, y * s, s * 0.18, s * 0.18);
    },
    stone(g, c, s) {
      g.fillStyle = PX.stone; g.fillRect(0, 0, s, s);
      g.fillStyle = PX.stoneDark;
      for (const [x, y] of [[0.15, 0.25], [0.55, 0.15], [0.7, 0.6], [0.25, 0.7]]) g.fillRect(x * s, y * s, s * 0.14, s * 0.14);
    },
    lamp(g, c, s, k) {
      const m = s * 0.1;
      g.fillStyle = PX.lampFrame; g.fillRect(0, 0, s, s);
      if (k.on) { g.shadowColor = PX.lampOn; g.shadowBlur = s * 0.5; }
      g.fillStyle = k.on ? PX.lampOn : PX.lampOff; g.fillRect(m, m, s - 2 * m, s - 2 * m);
      g.shadowBlur = 0;
      g.strokeStyle = PX.lampFrame; g.lineWidth = Math.max(1, s * 0.06);
      g.beginPath(); g.moveTo(s / 2, m); g.lineTo(s / 2, s - m); g.moveTo(m, s / 2); g.lineTo(s - m, s / 2); g.stroke();
    },
    lever(g, c, s, k) {
      g.fillStyle = PX.plateDark; g.fillRect(s * 0.2, s * 0.2, s * 0.6, s * 0.6);
      g.fillStyle = PX.plate; g.fillRect(s * 0.3, s * 0.3, s * 0.4, s * 0.4);
      const tx = k.on ? 0.78 : 0.22;
      g.strokeStyle = PX.wood; g.lineWidth = Math.max(2, s * 0.1); g.lineCap = 'round';
      g.beginPath(); g.moveTo(s / 2, s / 2); g.lineTo(tx * s, 0.22 * s); g.stroke();
      g.fillStyle = pxWire(k.on);
      g.beginPath(); g.arc(tx * s, 0.22 * s, s * 0.09, 0, Math.PI * 2); g.fill();
    },
    torch(g, c, s, k) {
      face(g, s, c.facing);
      g.fillStyle = PX.plateDark; g.fillRect(0, s / 2, s, s / 2);
      g.fillStyle = PX.wood; g.fillRect(s * 0.42, s * 0.2, s * 0.16, s * 0.42);
      if (k.on) { g.shadowColor = PX.torchOn; g.shadowBlur = s * 0.3; }
      g.fillStyle = k.on ? PX.torchOn : PX.torchOff;
      g.beginPath(); g.arc(s / 2, s * 0.2, s * 0.14, 0, Math.PI * 2); g.fill();
    },
    delayer(g, c, s, k) {
      face(g, s, c.facing);
      const line = k.line || [false];
      g.fillStyle = PX.plateDark; g.fillRect(s * 0.08, s * 0.04, s * 0.84, s * 0.92);
      g.fillStyle = pxWire(line[0]);
      g.beginPath(); g.moveTo(s / 2, s * 0.08); g.lineTo(s * 0.78, s * 0.3); g.lineTo(s * 0.22, s * 0.3); g.closePath(); g.fill();
      for (let i = 0; i < 4; i++) {
        g.fillStyle = line[i] === undefined ? PX.slot : pxWire(line[i]);
        g.fillRect(s * 0.38, s * (0.36 + i * 0.14), s * 0.24, s * 0.11);
      }
    },
    button(g, c, s, k) {
      g.fillStyle = PX.plateDark; g.fillRect(s * 0.2, s * 0.2, s * 0.6, s * 0.6);
      const i = k.on ? 0.34 : 0.28;
      g.fillStyle = k.on ? PX.wireOn : PX.buttonUp; g.fillRect(s * i, s * i, s * (1 - 2 * i), s * (1 - 2 * i));
    },
    piston(g, c, s, k) {
      face(g, s, c.facing);
      g.fillStyle = PX.plateDark; g.fillRect(0, 0, s, s);
      g.fillStyle = PX.stone; g.fillRect(s * 0.08, s * 0.08, s * 0.84, s * 0.84);
      g.fillStyle = PX.wood;
      if (k.on) g.fillRect(s * 0.4, 0, s * 0.2, s * 0.5);
      else g.fillRect(0, 0, s, s * 0.24);
    },
    piston_head(g, c, s) {
      face(g, s, c.facing);
      g.fillStyle = PX.wood; g.fillRect(0, 0, s, s * 0.24); g.fillRect(s * 0.4, s * 0.24, s * 0.2, s * 0.76);
    },
  });

  // ---------- schematic (logic symbols) ----------

  function schematic(C) {
    const L = (g, s, on) => {
      g.strokeStyle = on ? C.on : C.off;
      g.fillStyle = g.strokeStyle;
      g.lineWidth = Math.max(1.5, s * 0.07);
      g.lineCap = 'round';
      g.lineJoin = 'round';
    };
    const seg = (g, s, pts) => {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)));
      g.stroke();
    };
    const dot = (g, s, x, y, r, fill = true) => {
      g.beginPath();
      g.arc(x * s, y * s, r * s, 0, Math.PI * 2);
      fill ? g.fill() : g.stroke();
    };
    return {
      wire(g, c, s, k) {
        const { arms, count } = armsOf(k.att);
        L(g, s, k.on);
        arms.forEach((a) => seg(g, s, a));
        if (count >= 3) dot(g, s, 0.5, 0.5, 0.09);
      },
      crossing(g, c, s, k) {
        L(g, s, k.on);
        seg(g, s, [[0, 0.5], [1, 0.5]]);
        L(g, s, k.on2);
        g.beginPath();
        g.moveTo(s / 2, 0); g.lineTo(s / 2, s * 0.3);
        g.arc(s / 2, s / 2, s * 0.2, -Math.PI / 2, Math.PI / 2, true);
        g.lineTo(s / 2, s);
        g.stroke();
      },
      redstone_block(g, c, s) {
        L(g, s, true);
        g.strokeRect(s * 0.15, s * 0.15, s * 0.7, s * 0.7);
        seg(g, s, [[0.5, 0.3], [0.5, 0.7]]);
        seg(g, s, [[0.3, 0.5], [0.7, 0.5]]);
      },
      stone(g, c, s) {
        g.strokeStyle = C.dim; g.lineWidth = 1;
        g.strokeRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8);
        g.save(); g.beginPath(); g.rect(s * 0.1, s * 0.1, s * 0.8, s * 0.8); g.clip();
        g.beginPath(); for (let i = -1; i < 2; i += 0.25) { g.moveTo(i * s, s); g.lineTo((i + 1) * s, 0); } g.stroke();
        g.restore();
      },
      lamp(g, c, s, k) {
        L(g, s, k.on);
        if (k.on) { g.save(); g.globalAlpha = 0.25; dot(g, s, 0.5, 0.5, 0.32); g.restore(); }
        dot(g, s, 0.5, 0.5, 0.32, false);
        const d = 0.32 * Math.SQRT1_2;
        seg(g, s, [[0.5 - d, 0.5 - d], [0.5 + d, 0.5 + d]]);
        seg(g, s, [[0.5 + d, 0.5 - d], [0.5 - d, 0.5 + d]]);
      },
      lever(g, c, s, k) {
        L(g, s, k.on);
        dot(g, s, 0.22, 0.6, 0.07); dot(g, s, 0.78, 0.6, 0.07);
        seg(g, s, [[0.22, 0.6], k.on ? [0.78, 0.6] : [0.7, 0.25]]);
      },
      torch(g, c, s, k) {
        face(g, s, c.facing);
        L(g, s, k.on);
        seg(g, s, [[0.5, 1], [0.5, 0.78]]);
        g.beginPath(); g.moveTo(s * 0.22, s * 0.78); g.lineTo(s * 0.78, s * 0.78); g.lineTo(s / 2, s * 0.32); g.closePath(); g.stroke();
        dot(g, s, 0.5, 0.22, 0.1, false);
        seg(g, s, [[0.5, 0.12], [0.5, 0]]);
      },
      delayer(g, c, s, k) {
        face(g, s, c.facing);
        const line = k.line || [false];
        L(g, s, line[line.length - 1]);
        seg(g, s, [[0.5, 1], [0.5, 0.84]]);
        L(g, s, line[0]);
        seg(g, s, [[0.5, 0.16], [0.5, 0]]);
        L(g, s, false);
        g.strokeRect(s * 0.26, s * 0.16, s * 0.48, s * 0.68);
        for (let i = 0; i < line.length; i++) {
          L(g, s, line[i]);
          dot(g, s, 0.5, 0.28 + i * 0.15, 0.05, line[i]);
        }
      },
      button(g, c, s, k) {
        L(g, s, k.on);
        dot(g, s, 0.22, 0.7, 0.07); dot(g, s, 0.78, 0.7, 0.07);
        const y = k.on ? 0.62 : 0.45;
        seg(g, s, [[0.18, y], [0.82, y]]);
        seg(g, s, [[0.5, y], [0.5, y - 0.25]]);
        seg(g, s, [[0.38, y - 0.25], [0.62, y - 0.25]]);
      },
      piston(g, c, s, k) {
        face(g, s, c.facing);
        L(g, s, k.on);
        g.strokeRect(s * 0.18, s * 0.5, s * 0.64, s * 0.4);
        const top = k.on ? 0 : 0.22;
        seg(g, s, [[0.5, 0.5], [0.5, top + 0.04]]);
        if (!k.on) seg(g, s, [[0.25, 0.2], [0.75, 0.2]]);
        seg(g, s, [[0.3, 0.72], [0.7, 0.72]]);
      },
      piston_head(g, c, s) {
        face(g, s, c.facing);
        L(g, s, true);
        seg(g, s, [[0.5, 1], [0.5, 0.12]]);
        seg(g, s, [[0.2, 0.12], [0.8, 0.12]]);
      },
    };
  }
  define('blueprint', { name: 'Blueprint', desc: 'Logic-diagram symbols (the torch is a NOT gate) on blueprint blue.' }, {
    kit: false,
    c: { bg: '#123461', grid: 'rgba(255,255,255,0.06)', gridMajor: 'rgba(255,255,255,0.14)', cursor: '#ffd84a', on: '#ffd84a', light: '#ffd84a', stone: '#6f8db8',
      source: '#ffd84a', plate: '#cfe3ff', knob: '#cfe3ff', face: '#cfe3ff' },
  }, schematic({ on: '#ffd84a', off: '#cfe3ff', dim: 'rgba(207,227,255,0.55)' }));
  define('datasheet', { name: 'Datasheet', desc: 'The same symbols as a black-and-red print diagram on white.', dark: false }, {
    kit: false,
    c: { bg: '#ffffff', grid: 'rgba(0,0,0,0.05)', gridMajor: 'rgba(0,0,0,0.1)', cursor: '#d00', on: '#e0201b', light: '#e0201b', stone: '#999',
      source: '#e0201b', plate: '#222', knob: '#222', face: '#222' },
  }, schematic({ on: '#e0201b', off: '#222222', dim: 'rgba(0,0,0,0.4)' }));

  // ---------- PCB ----------

  const PCB = { board: '#0d4a2f', trace: '#b8863b', traceOn: '#ffd76a', pad: '#d9b45a', silk: '#e8f0e8', chip: '#1b1b1b', pin: '#c8c8c8', led: '#ff3355', ledOff: '#5a1a24' };
  const pcbT = {
    radius: 0.1, glow: true, wireW: 0.14,
    c: { bg: PCB.board, grid: 'rgba(255,255,255,0.035)', cursor: PCB.silk, on: PCB.traceOn, off: PCB.trace, light: PCB.led, lightOff: PCB.ledOff, source: '#c0392b',
      stone: '#cfd3d6', plate: '#2a2a2a', frame: '#1b1b1b', knob: '#e0e0e0', face: '#9aa0a6', slot: '#333' },
  };
  function chip(g, s, label, pins) {
    g.fillStyle = PCB.pin;
    for (let i = 0; i < pins; i++) {
      const y = 0.28 + (i * 0.44) / Math.max(1, pins - 1);
      g.fillRect(s * 0.1, s * (y - 0.03), s * 0.12, s * 0.06);
      g.fillRect(s * 0.78, s * (y - 0.03), s * 0.12, s * 0.06);
    }
    g.fillStyle = PCB.chip;
    g.beginPath(); g.roundRect(s * 0.22, s * 0.2, s * 0.56, s * 0.6, s * 0.06); g.fill();
    g.fillStyle = PCB.silk;
    g.beginPath(); g.arc(s * 0.31, s * 0.29, s * 0.035, 0, 7); g.fill();
    g.font = `600 ${s * 0.2}px ui-monospace, monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(s / 2, s * 0.54); g.rotate(Math.PI / 2); g.fillText(label, 0, 0); g.restore();
  }
  const pcbKit = kit(pcbT);
  define('pcb', { name: 'Circuit board', desc: 'A real PCB: copper traces, LEDs as lamps, little chips as torches and delayers.' }, pcbT, {
    wire(g, c, s, k) {
      pcbKit.wire(g, c, s, k);
      const { count } = wireSides(k.att);
      if (count !== 2) {
        g.fillStyle = k.on ? PCB.traceOn : PCB.pad;
        g.beginPath(); g.arc(s / 2, s / 2, s * 0.13, 0, 7); g.fill();
        g.fillStyle = PCB.board;
        g.beginPath(); g.arc(s / 2, s / 2, s * 0.05, 0, 7); g.fill();
      }
    },
    lamp(g, c, s, k) {
      g.fillStyle = '#d9d9d9'; g.beginPath(); g.arc(s / 2, s / 2, s * 0.32, 0, 7); g.fill();
      if (k.on) { g.shadowColor = PCB.led; g.shadowBlur = s * 0.6; }
      g.fillStyle = k.on ? PCB.led : PCB.ledOff; g.beginPath(); g.arc(s / 2, s / 2, s * 0.24, 0, 7); g.fill();
      g.shadowBlur = 0;
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(s * 0.42, s * 0.42, s * 0.07, 0, 7); g.fill();
    },
    torch(g, c, s, k) {
      face(g, s, c.facing);
      g.fillStyle = k.on ? PCB.traceOn : PCB.trace; g.fillRect(s * 0.44, 0, s * 0.12, s * 0.22);
      g.fillStyle = PCB.pin; g.fillRect(s * 0.44, s * 0.78, s * 0.12, s * 0.22);
      chip(g, s, 'NOT', 2);
    },
    delayer(g, c, s, k) {
      face(g, s, c.facing);
      const line = k.line || [false];
      g.fillStyle = line[0] ? PCB.traceOn : PCB.trace; g.fillRect(s * 0.44, 0, s * 0.12, s * 0.22);
      g.fillStyle = PCB.pin; g.fillRect(s * 0.44, s * 0.78, s * 0.12, s * 0.22);
      chip(g, s, '', 3);
      line.forEach((v, i) => {
        g.fillStyle = v ? PCB.led : PCB.ledOff;
        g.beginPath(); g.arc(s / 2, s * (0.3 + i * 0.13), s * 0.045, 0, 7); g.fill();
      });
    },
    redstone_block(g, c, s) {
      g.fillStyle = '#2b2b2b'; g.beginPath(); g.roundRect(s * 0.14, s * 0.22, s * 0.72, s * 0.56, s * 0.1); g.fill();
      g.fillStyle = '#d4a017'; g.fillRect(s * 0.14, s * 0.22, s * 0.18, s * 0.56);
      g.fillStyle = PCB.silk; g.font = `700 ${s * 0.32}px ui-monospace, monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('+', s * 0.6, s * 0.52);
    },
    stone(g, c, s) {
      g.fillStyle = '#cfd3d6'; g.beginPath(); g.arc(s / 2, s / 2, s * 0.34, 0, 7); g.fill();
      g.fillStyle = '#062b1a'; g.beginPath(); g.arc(s / 2, s / 2, s * 0.17, 0, 7); g.fill();
    },
  });

  // ---------- terminal ----------

  const TERM = { on: '#5dff3a', off: '#1f5a1a', dim: '#2f6f2a' };
  function glyph(g, s, ch, color, size = 0.8, glow = false) {
    g.fillStyle = color;
    if (glow) { g.shadowColor = color; g.shadowBlur = s * 0.4; }
    g.font = `700 ${s * size}px "JetBrains Mono", ui-monospace, monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ch, s / 2, s * 0.54);
    g.shadowBlur = 0;
  }
  const tc = (on) => (on ? TERM.on : TERM.off);
  const termLine = (g, s, pts, on) => {
    g.strokeStyle = tc(on);
    g.lineWidth = Math.max(1, s * 0.08);
    if (on) { g.shadowColor = TERM.on; g.shadowBlur = s * 0.3; }
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)));
    g.stroke();
    g.shadowBlur = 0;
  };
  define('terminal', { name: 'Terminal', desc: 'Green phosphor CRT: thin lines, glyphs for components, scanlines over everything.' }, {
    kit: false,
    c: { bg: '#020a02', grid: 'rgba(57,255,20,0.05)', cursor: TERM.on, on: TERM.on, light: TERM.on, stone: TERM.dim, source: TERM.on, plate: TERM.dim, knob: TERM.on, face: TERM.dim },
    post(g, w, h) {
      g.fillStyle = 'rgba(0,0,0,0.25)';
      for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
      const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(0,0,0,0.55)');
      g.fillStyle = v;
      g.fillRect(0, 0, w, h);
    },
  }, {
    wire(g, c, s, k) { armsOf(k.att).arms.forEach((a) => termLine(g, s, a, k.on)); },
    crossing(g, c, s, k) {
      termLine(g, s, [[0, 0.5], [0.32, 0.5]], k.on);
      termLine(g, s, [[0.68, 0.5], [1, 0.5]], k.on);
      termLine(g, s, [[0.5, 0], [0.5, 1]], k.on2);
    },
    redstone_block(g, c, s) { glyph(g, s, '█', TERM.on, 0.95, true); },
    stone(g, c, s) { glyph(g, s, '▒', TERM.dim, 1.05); },
    lamp(g, c, s, k) { glyph(g, s, k.on ? '◉' : '○', tc(k.on), 0.85, k.on); },
    lever(g, c, s, k) { glyph(g, s, k.on ? '[1]' : '[0]', tc(k.on) === TERM.off ? TERM.dim : TERM.on, 0.42, k.on); },
    torch(g, c, s, k) { face(g, s, c.facing); glyph(g, s, '▲', tc(k.on), 0.7, k.on); },
    delayer(g, c, s, k) {
      const line = k.line || [false];
      glyph(g, s, '^>v<'[c.facing ?? 0] + line.length, tc(line[0]) === TERM.off ? TERM.dim : TERM.on, 0.5, line[0]);
    },
    button(g, c, s, k) { glyph(g, s, k.on ? '■' : '□', k.on ? TERM.on : TERM.dim, 0.8, k.on); },
    piston(g, c, s, k) {
      face(g, s, c.facing);
      g.strokeStyle = TERM.dim; g.lineWidth = Math.max(1, s * 0.07);
      g.strokeRect(s * 0.12, s * 0.3, s * 0.76, s * 0.6);
      termLine(g, s, k.on ? [[0.5, 0.3], [0.5, 0]] : [[0.12, 0.14], [0.88, 0.14]], k.on);
    },
    piston_head(g, c, s) {
      face(g, s, c.facing);
      termLine(g, s, [[0.12, 0.14], [0.88, 0.14]], true);
      termLine(g, s, [[0.5, 0.14], [0.5, 1]], true);
    },
  });

  // ---------- round 2: families with a light and a dark variant ----------

  const PAPER_LIGHT = { bg: '#f1ebe0', grid: 'rgba(60,40,20,0.07)', cursor: 'rgba(40,30,20,0.55)', on: '#e5372c', off: '#d3bab2', light: '#ffc21a', lightOff: '#6f675c',
    core: '#fff7d1', source: '#e5372c', mark: '#ff8f84', stone: '#bcb5a9', stoneDark: '#a39c90', plate: '#8a8175', frame: '#3f3a33', knob: '#fbf8f2', face: '#5f574c', slot: '#b0a796' };
  const PAPER_DARK = { bg: '#1f2023', grid: 'rgba(255,255,255,0.045)', cursor: 'rgba(255,255,255,0.55)', on: '#ff4b3e', off: '#4d3432', light: '#ffcc33', lightOff: '#3a3631',
    core: '#fff8dc', source: '#e5372c', mark: '#ff8f84', stone: '#4a4d54', stoneDark: '#3c3f45', plate: '#646973', frame: '#121315', knob: '#d9dce2', face: '#9ca2ad', slot: '#2a2c31' };
  const SKETCH_LIGHT = { bg: '#fbf8f1', grid: 'rgba(80,130,200,0.16)', cursor: '#2d2d2d', on: '#e63946', off: '#cfc8bc', light: '#ffcc1a', lightOff: '#8b8577',
    core: '#fffbe0', source: '#e63946', mark: '#ff9aa2', stone: '#b8b2a7', stoneDark: '#8f897e', plate: '#9fb7c9', frame: '#4a4640', knob: '#ffffff', face: '#8d6e4c', slot: '#ddd5c4' };
  const CHALK = { bg: '#263530', grid: 'rgba(255,255,255,0.05)', cursor: '#ecebe4', on: '#ff6b6b', off: '#5d6b64', light: '#ffe066', lightOff: '#46534d',
    core: '#fffbe6', source: '#ff6b6b', mark: '#ffb3b3', stone: '#6c7a73', stoneDark: '#56635c', plate: '#8fa7b3', frame: '#1b2622', knob: '#ecebe4', face: '#c7a57a', slot: '#3a4842' };
  const WOOD_LIGHT = { bg: '#e6e5d3', grid: 'rgba(40,60,30,0.08)', cursor: 'rgba(30,40,20,0.55)', on: '#d8342a', off: '#c4ad9a', light: '#ffc93c', lightOff: '#5e5a46',
    core: '#fff6cf', source: '#c62f25', mark: '#ff8a7a', stone: '#8e9a86', stoneDark: '#76836e', plate: '#8a6a45', frame: '#3e4a35', knob: '#f2ead6', face: '#6b4f2e', slot: '#b5ae96' };
  const WOOD_DARK = { bg: '#17201a', grid: 'rgba(200,255,200,0.04)', cursor: 'rgba(220,255,200,0.5)', on: '#ff4a3a', off: '#4b3428', light: '#ffd46b', lightOff: '#2f3326',
    core: '#fff4d0', source: '#d4382c', mark: '#ff8a7a', stone: '#4e5a4b', stoneDark: '#3f4a3d', plate: '#7a5a3a', frame: '#0d120e', knob: '#d8c9a8', face: '#a77b4a', slot: '#26302a' };

  const BASE = { lampCore: true, detail: true, wireW: 0.2 };
  const FAMILIES = [];
  function family(id, name, desc, light, dark) {
    define(id + '-light', { name, desc, dark: false }, { ...BASE, ...light });
    define(id + '-dark', { name, desc, dark: true }, { ...BASE, ...dark });
    FAMILIES.push({ id, name, desc, light: id + '-light', dark: id + '-dark' });
  }

  family('paper2', 'Paper', 'The flat paper look, with dark lamp frames so lit lamps pop, and a bit more detail.',
    { radius: 0.2, c: PAPER_LIGHT },
    { radius: 0.2, c: PAPER_DARK });
  family('relief', 'Paper relief', 'Paper with a gentle top-lit gradient and soft contact shadows: tactile, not toy.',
    { radius: 0.18, relief: true, shadow: true, shadowColor: 'rgba(60,40,20,0.22)', c: PAPER_LIGHT },
    { radius: 0.18, relief: true, shadow: true, shadowColor: 'rgba(0,0,0,0.5)', c: PAPER_DARK });
  family('papercut', 'Paper cut', 'Layered cut paper: hard offset shadows and a fibrous paper texture.',
    { radius: 0.05, hardShadow: true, shadowColor: 'rgba(70,50,30,0.25)', texture: { color: '#5a4630', amount: 2600 }, c: PAPER_LIGHT },
    { radius: 0.05, hardShadow: true, shadowColor: 'rgba(0,0,0,0.6)', texture: { color: '#ffffff', amount: 1800 }, c: PAPER_DARK });
  family('sketch2', 'Sketch', 'Pencil on notebook paper; in dark mode, chalk on a blackboard.',
    { sketch: true, clean: true, jitter: 0.012, ink: '#2d2d2d', wireW: 0.17, c: SKETCH_LIGHT },
    { sketch: true, clean: true, jitter: 0.012, ink: '#ecebe4', wireW: 0.17, c: CHALK });
  family('crayon', 'Coloured pencil', 'Sketch, but filled with hatched coloured-pencil strokes.',
    { sketch: true, hatchFill: true, jitter: 0.025, ink: '#2d2d2d', wireW: 0.17, texture: { color: '#6b5a40', amount: 1000 }, c: SKETCH_LIGHT },
    { sketch: true, hatchFill: true, jitter: 0.025, ink: '#ecebe4', wireW: 0.17, texture: { color: '#ffffff', amount: 1700 }, c: CHALK });
  family('woodland', 'Woodland', 'Moss, stone and wood, with red power kept. At night only the lamps light the forest.',
    { radius: 0.12, relief: true, stoneDots: true, c: WOOD_LIGHT },
    { radius: 0.12, relief: true, stoneDots: true, c: WOOD_DARK });

  Ruda.FAMILIES = FAMILIES;
})();
