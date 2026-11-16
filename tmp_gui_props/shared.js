// Throwaway prototype helper: a fake world + renderer with several visual styles.
// Not real simulation — signals are faked so the mockups look alive.
(() => {
  const TYPES = ['redstone_block', 'lever', 'wire', 'crossing', 'lamp', 'torch', 'stone'];
  const NAMES = {
    redstone_block: 'Redstone block',
    lever: 'Lever',
    wire: 'Wire',
    crossing: 'Crossing',
    lamp: 'Lamp',
    torch: 'Torch',
    stone: 'Stone',
  };
  const HINTS = {
    redstone_block: 'Always-on power source',
    lever: 'Toggle with right click',
    wire: 'Carries signal',
    crossing: 'Two wires pass without touching',
    lamp: 'Lights up when powered',
    torch: 'Inverter, 1 tick delay',
    stone: 'Inert building block',
  };
  const DIRS = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  const key = (x, y) => x + ',' + y;

  // ---------- worlds ----------

  function demoWorld() {
    const m = new Map();
    const put = (x, y, type, extra = {}) =>
      m.set(key(x, y), { x, y, type, facing: 1, sig: null, ...extra });
    const row = (x0, x1, y, sig) => {
      for (let x = x0; x <= x1; x++) put(x, y, 'wire', { sig });
    };
    const col = (x, y0, y1, sig) => {
      for (let y = y0; y <= y1; y++) put(x, y, 'wire', { sig });
    };
    // lever -> lamp
    put(-6, -4, 'lever', { sig: 'L1' });
    row(-5, -1, -4, 'L1');
    put(0, -4, 'lamp', { sig: 'L1' });
    // redstone block -> torch (NOT) -> crossing -> lamp
    put(-6, 0, 'redstone_block', { sig: 'ON' });
    row(-5, -4, 0, 'ON');
    put(-3, 0, 'torch', { facing: 1, sig: 'T1' });
    row(-2, -2, 0, 'T1');
    put(-1, 0, 'crossing', { sig: 'T1', sig2: 'CLK' });
    row(0, 1, 0, 'T1');
    put(2, 0, 'lamp', { sig: 'T1' });
    // torch clock feeding a vertical line through the crossing
    put(-1, -2, 'lamp', { sig: 'CLK' });
    col(-1, -1, -1, 'CLK');
    col(-1, 1, 3, 'CLK');
    put(-3, 3, 'torch', { facing: 1, sig: 'CLK' });
    put(-2, 3, 'wire', { sig: 'CLK' });
    put(-2, 4, 'wire', { sig: 'CLK' });
    row(-4, -3, 4, 'CLK');
    put(-4, 3, 'wire', { sig: 'CLK' });
    put(0, 3, 'lamp', { sig: 'CLK' });
    // second lever with a NOT branch
    put(4, -2, 'lever', { sig: 'L2' });
    row(5, 7, -2, 'L2');
    put(8, -2, 'lamp', { sig: 'L2' });
    put(6, -1, 'torch', { facing: 2, sig: 'NL2' });
    col(6, 0, 1, 'NL2');
    put(6, 2, 'lamp', { sig: 'NL2' });
    for (const [x, y] of [
      [3, -5],
      [4, -5],
      [5, -5],
      [9, 1],
      [9, 2],
      [-8, 2],
      [-8, 3],
      [-8, 4],
    ])
      put(x, y, 'stone');
    return { cells: m, levers: { L1: true, L2: false } };
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
    const m = new Map();
    const put = (x, y, type, extra = {}) => {
      if (!m.has(key(x, y))) m.set(key(x, y), { x, y, type, facing: 1, sig: null, ...extra });
    };
    const n = 4 + Math.floor(rnd() * 6);
    for (let i = 0; i < n; i++) {
      let x = Math.floor(rnd() * 20) - 10,
        y = Math.floor(rnd() * 12) - 6;
      const sig = rnd() < 0.6 ? 'ON' : 'OFF';
      put(x, y, rnd() < 0.5 ? 'lever' : 'redstone_block', { sig });
      let dx = 1,
        dy = 0;
      const len = 4 + Math.floor(rnd() * 10);
      for (let j = 0; j < len; j++) {
        if (rnd() < 0.15) [dx, dy] = [dy, dx];
        x += dx;
        y += dy;
        put(x, y, 'wire', { sig });
      }
      put(x + dx, y + dy, 'lamp', { sig });
    }
    for (let i = 0; i < 10; i++)
      put(Math.floor(rnd() * 24) - 12, Math.floor(rnd() * 14) - 7, 'stone');
    return { cells: m, levers: {} };
  }

  function signals(world, t) {
    const S = { ON: true, OFF: false, ...world.levers };
    S.T1 = !S.ON;
    S.NL2 = !S.L2;
    S.CLK = Math.floor(t / 600) % 2 === 0;
    return S;
  }

  // ---------- drawing helpers ----------

  function rotate(g, s, facing) {
    g.translate(s / 2, s / 2);
    g.rotate((facing * Math.PI) / 2);
    g.translate(-s / 2, -s / 2);
  }
  function wireSides(att) {
    const count = att.filter(Boolean).length;
    const sides = [0, 1, 2, 3].filter((d) =>
      count === 0 ? true : count === 1 ? att[d] || att[(d + 2) % 4] : att[d],
    );
    return { sides, arm: count === 0 ? 0.3 : 0.5, count };
  }
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
  }
  function armLine(g, s, d, arm) {
    const c = s / 2;
    const [dx, dy] = DIRS[d];
    g.moveTo(c, c);
    g.lineTo(c + dx * arm * s, c + dy * arm * s);
  }

  // ---------- styles ----------

  const PIXEL = {
    bg: '#1d1f24',
    grid: 'rgba(255,255,255,0.04)',
    cursor: 'rgba(255,255,255,0.6)',
    mini: {
      wire: '#a3241c',
      lamp: '#ffd75e',
      stone: '#7a7a7a',
      redstone_block: '#b3261e',
      lever: '#8a6a44',
      torch: '#ff5a2a',
      crossing: '#555',
    },
    blocks: {
      wire(g, c, s, k) {
        const w = Math.max(2, s * 0.22),
          m = s / 2;
        g.fillStyle = k.on ? '#ff3b2f' : '#5c1410';
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
        const w = Math.max(2, s * 0.22),
          m = s / 2;
        g.fillStyle = '#2b2d33';
        g.fillRect(s * 0.15, s * 0.15, s * 0.7, s * 0.7);
        g.fillStyle = k.on ? '#ff3b2f' : '#5c1410';
        g.fillRect(0, m - w / 2, s, w);
        g.fillStyle = '#2b2d33';
        g.fillRect(m - w, m - w, w * 2, w * 2);
        g.fillStyle = k.on2 ? '#ff3b2f' : '#5c1410';
        g.fillRect(m - w / 2, 0, w, s);
      },
      redstone_block(g, c, s) {
        g.fillStyle = '#b3261e';
        g.fillRect(0, 0, s, s);
        g.fillStyle = '#7d1712';
        for (const [x, y] of [
          [0.2, 0.2],
          [0.6, 0.3],
          [0.3, 0.65],
          [0.68, 0.7],
        ])
          g.fillRect(x * s, y * s, s * 0.18, s * 0.18);
      },
      stone(g, c, s) {
        g.fillStyle = '#7a7a7a';
        g.fillRect(0, 0, s, s);
        g.fillStyle = '#666';
        for (const [x, y] of [
          [0.15, 0.25],
          [0.55, 0.15],
          [0.7, 0.6],
          [0.25, 0.7],
        ])
          g.fillRect(x * s, y * s, s * 0.14, s * 0.14);
      },
      lamp(g, c, s, k) {
        const m = s * 0.1;
        g.fillStyle = '#2e2414';
        g.fillRect(0, 0, s, s);
        if (k.on) {
          g.shadowColor = '#ffd75e';
          g.shadowBlur = s * 0.5;
        }
        g.fillStyle = k.on ? '#ffd75e' : '#4a3a22';
        g.fillRect(m, m, s - 2 * m, s - 2 * m);
        g.shadowBlur = 0;
        g.strokeStyle = '#2e2414';
        g.lineWidth = Math.max(1, s * 0.06);
        g.beginPath();
        g.moveTo(s / 2, m);
        g.lineTo(s / 2, s - m);
        g.moveTo(m, s / 2);
        g.lineTo(s - m, s / 2);
        g.stroke();
      },
      lever(g, c, s, k) {
        g.fillStyle = '#4b4b4b';
        g.fillRect(s * 0.2, s * 0.2, s * 0.6, s * 0.6);
        g.fillStyle = '#6d6d6d';
        g.fillRect(s * 0.3, s * 0.3, s * 0.4, s * 0.4);
        const tx = k.on ? 0.78 : 0.22;
        g.strokeStyle = '#6b4f2e';
        g.lineWidth = Math.max(2, s * 0.1);
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(s / 2, s / 2);
        g.lineTo(tx * s, 0.22 * s);
        g.stroke();
        g.fillStyle = k.on ? '#ff3b2f' : '#5c1410';
        g.beginPath();
        g.arc(tx * s, 0.22 * s, s * 0.09, 0, Math.PI * 2);
        g.fill();
      },
      torch(g, c, s, k) {
        rotate(g, s, c.facing);
        g.fillStyle = '#4b4b4b';
        g.fillRect(0, s / 2, s, s / 2);
        g.fillStyle = '#6b4f2e';
        g.fillRect(s * 0.42, s * 0.2, s * 0.16, s * 0.42);
        if (k.on) {
          g.shadowColor = '#ff5a2a';
          g.shadowBlur = s * 0.3;
        }
        g.fillStyle = k.on ? '#ff5a2a' : '#4a1a15';
        g.beginPath();
        g.arc(s / 2, s * 0.2, s * 0.14, 0, Math.PI * 2);
        g.fill();
      },
    },
  };

  const flatLine = (g, s, att, color, width) => {
    const { sides, arm } = wireSides(att);
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = 'round';
    g.beginPath();
    for (const d of sides) armLine(g, s, d, arm);
    g.stroke();
  };
  const FLAT = {
    bg: '#efe9df',
    grid: 'rgba(60,40,20,0.06)',
    cursor: 'rgba(40,30,20,0.5)',
    mini: {
      wire: '#e8433a',
      lamp: '#ffc93c',
      stone: '#b9b3a8',
      redstone_block: '#e8433a',
      lever: '#8d8578',
      torch: '#e8433a',
      crossing: '#8d8578',
    },
    blocks: {
      wire(g, c, s, k) {
        flatLine(g, s, k.att, k.on ? '#e8433a' : '#cdb2ab', s * 0.2);
      },
      crossing(g, c, s, k) {
        g.lineCap = 'butt';
        g.lineWidth = s * 0.2;
        g.strokeStyle = k.on ? '#e8433a' : '#cdb2ab';
        g.beginPath();
        g.moveTo(0, s / 2);
        g.lineTo(s, s / 2);
        g.stroke();
        g.strokeStyle = '#efe9df';
        g.lineWidth = s * 0.42;
        g.beginPath();
        g.moveTo(s / 2, s * 0.25);
        g.lineTo(s / 2, s * 0.75);
        g.stroke();
        g.strokeStyle = k.on2 ? '#e8433a' : '#cdb2ab';
        g.lineWidth = s * 0.2;
        g.beginPath();
        g.moveTo(s / 2, 0);
        g.lineTo(s / 2, s);
        g.stroke();
      },
      redstone_block(g, c, s) {
        g.fillStyle = '#e8433a';
        rr(g, s * 0.08, s * 0.08, s * 0.84, s * 0.84, s * 0.18);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.35)';
        rr(g, s * 0.25, s * 0.25, s * 0.5, s * 0.5, s * 0.1);
        g.fill();
      },
      stone(g, c, s) {
        g.fillStyle = '#b9b3a8';
        rr(g, s * 0.06, s * 0.06, s * 0.88, s * 0.88, s * 0.14);
        g.fill();
      },
      lamp(g, c, s, k) {
        g.fillStyle = '#d8d0c2';
        rr(g, s * 0.08, s * 0.08, s * 0.84, s * 0.84, s * 0.2);
        g.fill();
        if (k.on) {
          g.fillStyle = 'rgba(255,201,60,0.35)';
          g.beginPath();
          g.arc(s / 2, s / 2, s * 0.48, 0, 7);
          g.fill();
        }
        g.fillStyle = k.on ? '#ffc93c' : '#a79e8f';
        g.beginPath();
        g.arc(s / 2, s / 2, s * 0.24, 0, 7);
        g.fill();
      },
      lever(g, c, s, k) {
        g.fillStyle = '#8d8578';
        rr(g, s * 0.12, s * 0.3, s * 0.76, s * 0.4, s * 0.2);
        g.fill();
        g.fillStyle = k.on ? '#e8433a' : '#f7f3ec';
        g.beginPath();
        g.arc(k.on ? s * 0.68 : s * 0.32, s / 2, s * 0.16, 0, 7);
        g.fill();
      },
      torch(g, c, s, k) {
        rotate(g, s, c.facing);
        g.fillStyle = '#8d8578';
        rr(g, s * 0.12, s * 0.55, s * 0.76, s * 0.33, s * 0.1);
        g.fill();
        g.fillStyle = k.on ? '#e8433a' : '#cdb2ab';
        g.beginPath();
        g.moveTo(s / 2, s * 0.08);
        g.lineTo(s * 0.76, s * 0.55);
        g.lineTo(s * 0.24, s * 0.55);
        g.closePath();
        g.fill();
      },
    },
  };

  const BP_LINE = '#cfe3ff',
    BP_ON = '#ffd84a';
  const BLUEPRINT = {
    bg: '#123461',
    grid: 'rgba(255,255,255,0.06)',
    gridMajor: 'rgba(255,255,255,0.14)',
    cursor: '#ffd84a',
    mini: {
      wire: '#cfe3ff',
      lamp: '#ffd84a',
      stone: '#6f8db8',
      redstone_block: '#ffd84a',
      lever: '#cfe3ff',
      torch: '#cfe3ff',
      crossing: '#cfe3ff',
    },
    blocks: {
      wire(g, c, s, k) {
        const { sides, arm, count } = wireSides(k.att);
        g.strokeStyle = k.on ? BP_ON : BP_LINE;
        g.lineWidth = Math.max(1.5, s * 0.07);
        g.lineCap = 'round';
        g.beginPath();
        for (const d of sides) armLine(g, s, d, arm);
        g.stroke();
        if (count >= 3) {
          g.fillStyle = g.strokeStyle;
          g.beginPath();
          g.arc(s / 2, s / 2, s * 0.09, 0, 7);
          g.fill();
        }
      },
      crossing(g, c, s, k) {
        g.lineWidth = Math.max(1.5, s * 0.07);
        g.strokeStyle = k.on ? BP_ON : BP_LINE;
        g.beginPath();
        g.moveTo(0, s / 2);
        g.lineTo(s, s / 2);
        g.stroke();
        g.strokeStyle = k.on2 ? BP_ON : BP_LINE;
        g.beginPath();
        g.moveTo(s / 2, 0);
        g.lineTo(s / 2, s * 0.3);
        g.arc(s / 2, s / 2, s * 0.2, -Math.PI / 2, Math.PI / 2, true);
        g.lineTo(s / 2, s);
        g.stroke();
      },
      redstone_block(g, c, s) {
        g.strokeStyle = BP_ON;
        g.lineWidth = Math.max(1.5, s * 0.07);
        g.strokeRect(s * 0.15, s * 0.15, s * 0.7, s * 0.7);
        g.beginPath();
        g.moveTo(s * 0.5, s * 0.3);
        g.lineTo(s * 0.5, s * 0.7);
        g.moveTo(s * 0.3, s * 0.5);
        g.lineTo(s * 0.7, s * 0.5);
        g.stroke();
      },
      stone(g, c, s) {
        g.strokeStyle = 'rgba(207,227,255,0.55)';
        g.lineWidth = 1;
        g.strokeRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8);
        g.save();
        g.beginPath();
        g.rect(s * 0.1, s * 0.1, s * 0.8, s * 0.8);
        g.clip();
        g.beginPath();
        for (let i = -1; i < 2; i += 0.25) {
          g.moveTo(i * s, s);
          g.lineTo((i + 1) * s, 0);
        }
        g.stroke();
        g.restore();
      },
      lamp(g, c, s, k) {
        g.lineWidth = Math.max(1.5, s * 0.07);
        g.strokeStyle = k.on ? BP_ON : BP_LINE;
        if (k.on) {
          g.fillStyle = 'rgba(255,216,74,0.25)';
          g.beginPath();
          g.arc(s / 2, s / 2, s * 0.32, 0, 7);
          g.fill();
        }
        g.beginPath();
        g.arc(s / 2, s / 2, s * 0.32, 0, 7);
        g.stroke();
        const d = s * 0.32 * Math.SQRT1_2;
        g.beginPath();
        g.moveTo(s / 2 - d, s / 2 - d);
        g.lineTo(s / 2 + d, s / 2 + d);
        g.moveTo(s / 2 + d, s / 2 - d);
        g.lineTo(s / 2 - d, s / 2 + d);
        g.stroke();
      },
      lever(g, c, s, k) {
        g.lineWidth = Math.max(1.5, s * 0.07);
        g.strokeStyle = k.on ? BP_ON : BP_LINE;
        g.fillStyle = g.strokeStyle;
        g.beginPath();
        g.arc(s * 0.22, s * 0.6, s * 0.07, 0, 7);
        g.arc(s * 0.78, s * 0.6, s * 0.07, 0, 7);
        g.fill();
        g.beginPath();
        g.moveTo(s * 0.22, s * 0.6);
        g.lineTo(k.on ? s * 0.78 : s * 0.7, k.on ? s * 0.6 : s * 0.25);
        g.stroke();
      },
      torch(g, c, s, k) {
        rotate(g, s, c.facing);
        g.lineWidth = Math.max(1.5, s * 0.07);
        g.strokeStyle = k.on ? BP_ON : BP_LINE;
        g.beginPath();
        g.moveTo(s / 2, s);
        g.lineTo(s / 2, s * 0.78);
        g.moveTo(s * 0.22, s * 0.78);
        g.lineTo(s * 0.78, s * 0.78);
        g.lineTo(s / 2, s * 0.32);
        g.closePath();
        g.stroke();
        g.beginPath();
        g.arc(s / 2, s * 0.22, s * 0.1, 0, 7);
        g.stroke();
        g.beginPath();
        g.moveTo(s / 2, s * 0.12);
        g.lineTo(s / 2, 0);
        g.stroke();
      },
    },
  };

  const NEON_ON = '#ff3d7f',
    NEON_OFF = '#3a1a33',
    NEON_LAMP = '#ffe066';
  const glow = (g, on, color, s) => {
    if (on) {
      g.shadowColor = color;
      g.shadowBlur = s * 0.45;
    }
  };
  const NEON = {
    bg: '#0a0a12',
    grid: 'rgba(140,160,255,0.05)',
    cursor: '#7df9ff',
    mini: {
      wire: '#ff3d7f',
      lamp: '#ffe066',
      stone: '#3a3f5c',
      redstone_block: '#ff3d7f',
      lever: '#7df9ff',
      torch: '#ff3d7f',
      crossing: '#7df9ff',
    },
    blocks: {
      wire(g, c, s, k) {
        glow(g, k.on, NEON_ON, s);
        flatLine(g, s, k.att, k.on ? NEON_ON : NEON_OFF, s * 0.12);
      },
      crossing(g, c, s, k) {
        g.lineWidth = s * 0.12;
        glow(g, k.on, NEON_ON, s);
        g.strokeStyle = k.on ? NEON_ON : NEON_OFF;
        g.beginPath();
        g.moveTo(0, s / 2);
        g.lineTo(s * 0.32, s / 2);
        g.moveTo(s * 0.68, s / 2);
        g.lineTo(s, s / 2);
        g.stroke();
        g.shadowBlur = 0;
        glow(g, k.on2, '#7df9ff', s);
        g.strokeStyle = k.on2 ? '#7df9ff' : '#1b2a3a';
        g.beginPath();
        g.moveTo(s / 2, 0);
        g.lineTo(s / 2, s);
        g.stroke();
      },
      redstone_block(g, c, s) {
        glow(g, true, NEON_ON, s);
        g.strokeStyle = NEON_ON;
        g.lineWidth = s * 0.08;
        rr(g, s * 0.15, s * 0.15, s * 0.7, s * 0.7, s * 0.12);
        g.stroke();
        g.fillStyle = NEON_ON;
        g.beginPath();
        g.arc(s / 2, s / 2, s * 0.1, 0, 7);
        g.fill();
      },
      stone(g, c, s) {
        g.fillStyle = '#20233a';
        rr(g, s * 0.08, s * 0.08, s * 0.84, s * 0.84, s * 0.1);
        g.fill();
        g.strokeStyle = '#3a3f5c';
        g.lineWidth = 1;
        g.stroke();
      },
      lamp(g, c, s, k) {
        glow(g, k.on, NEON_LAMP, s * 1.6);
        g.strokeStyle = k.on ? NEON_LAMP : '#3d3a20';
        g.lineWidth = s * 0.08;
        g.beginPath();
        g.arc(s / 2, s / 2, s * 0.3, 0, 7);
        g.stroke();
        if (k.on) {
          g.fillStyle = NEON_LAMP;
          g.beginPath();
          g.arc(s / 2, s / 2, s * 0.16, 0, 7);
          g.fill();
        }
      },
      lever(g, c, s, k) {
        g.strokeStyle = '#7df9ff';
        g.lineWidth = s * 0.06;
        rr(g, s * 0.14, s * 0.32, s * 0.72, s * 0.36, s * 0.18);
        g.stroke();
        glow(g, k.on, NEON_ON, s);
        g.fillStyle = k.on ? NEON_ON : '#2c3550';
        g.beginPath();
        g.arc(k.on ? s * 0.66 : s * 0.34, s / 2, s * 0.12, 0, 7);
        g.fill();
      },
      torch(g, c, s, k) {
        rotate(g, s, c.facing);
        g.strokeStyle = '#7df9ff';
        g.lineWidth = s * 0.06;
        g.beginPath();
        g.moveTo(s * 0.15, s * 0.8);
        g.lineTo(s * 0.85, s * 0.8);
        g.stroke();
        glow(g, k.on, NEON_ON, s);
        g.strokeStyle = k.on ? NEON_ON : NEON_OFF;
        g.lineWidth = s * 0.1;
        g.beginPath();
        g.moveTo(s * 0.28, s * 0.68);
        g.lineTo(s / 2, s * 0.18);
        g.lineTo(s * 0.72, s * 0.68);
        g.stroke();
      },
    },
  };

  const STYLES = { pixel: PIXEL, flat: FLAT, blueprint: BLUEPRINT, neon: NEON };

  // ---------- view ----------

  function connects(n, dir) {
    if (!n || n.type === 'stone') return false;
    if (n.type === 'torch') return n.facing % 2 === dir % 2;
    return true;
  }

  class WorldView {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.g = canvas.getContext('2d');
      this.style = STYLES[opts.style || 'pixel'];
      this.world = opts.world || demoWorld();
      this.zoom = opts.zoom || 36;
      this.cx = opts.cx ?? 0.5;
      this.cy = opts.cy ?? 0;
      this.tool = null;
      this.rotation = 1;
      this.hover = null;
      this.keys = new Set();
      this.onHover = opts.onHover || (() => {});
      this.onEdit = opts.onEdit || (() => {});
      this.start = performance.now();
      this.last = this.start;
      this.fps = 60;
      if (opts.interactive !== false) this.bind();
      new ResizeObserver(() => this.resize()).observe(canvas);
      this.resize();
      const loop = (t) => {
        this.frame(t);
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
    }
    cellAt(px, py) {
      return {
        x: Math.floor((px - this.w / 2) / this.zoom + this.cx),
        y: Math.floor((py - this.h / 2) / this.zoom + this.cy),
      };
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
        if (e.button === 2) {
          const b = this.get(down.cell.x, down.cell.y);
          if (b && b.type === 'lever') {
            this.world.levers[b.sig] = !this.world.levers[b.sig];
            this.onEdit('toggle');
            down = null;
          }
        }
      });
      addEventListener('mousemove', (e) => {
        const [x, y] = pos(e);
        const inside = x >= 0 && y >= 0 && x < this.w && y < this.h;
        this.hover = inside ? this.cellAt(x, y) : null;
        this.onHover(this.hover, this.hover && this.get(this.hover.x, this.hover.y));
        if (!down) return;
        if (down.button === 2) {
          const c = this.cellAt(x, y),
            dx = c.x - down.cell.x,
            dy = c.y - down.cell.y;
          if (dx || dy)
            this.rotation = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
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
          this.world.cells.set(key(x, y), { x, y, type: this.tool, facing: this.rotation, sig });
          this.onEdit('place');
        }
        down = null;
      });
      cv.addEventListener(
        'wheel',
        (e) => {
          e.preventDefault();
          const [x, y] = pos(e);
          const before = this.cellAtF(x, y);
          this.zoom = Math.min(96, Math.max(6, this.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
          const after = this.cellAtF(x, y);
          this.cx += before[0] - after[0];
          this.cy += before[1] - after[1];
        },
        { passive: false },
      );
      addEventListener('keydown', (e) => {
        if (e.target.closest && e.target.closest('input,textarea')) return;
        const k = e.key.toLowerCase();
        if (
          ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k) &&
          !e.ctrlKey
        )
          this.keys.add(k);
        if (k === 'r') this.rotation = (this.rotation + 1) % 4;
      });
      addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
      addEventListener('blur', () => this.keys.clear());
    }
    cellAtF(px, py) {
      return [(px - this.w / 2) / this.zoom + this.cx, (py - this.h / 2) / this.zoom + this.cy];
    }
    appearance(c, S) {
      const att = DIRS.map(([dx, dy], d) => connects(this.get(c.x + dx, c.y + dy), d));
      if (c.type === 'torch') att.fill(false);
      return { att, on: !!S[c.sig], on2: !!S[c.sig2] };
    }
    frame(t) {
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
      const x0 = Math.floor(this.cx - w / 2 / z) - 1,
        x1 = Math.ceil(this.cx + w / 2 / z) + 1;
      const y0 = Math.floor(this.cy - h / 2 / z) - 1,
        y1 = Math.ceil(this.cy + h / 2 / z) + 1;
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
      if (z >= 10) grid(1, style.grid);
      if (style.gridMajor) grid(8, style.gridMajor);
      const S = signals(this.world, t);
      for (const c of this.world.cells.values()) {
        if (c.x < x0 || c.x > x1 || c.y < y0 || c.y > y1) continue;
        g.save();
        g.translate(this.sx(c.x), this.sy(c.y));
        style.blocks[c.type](g, c, z, this.appearance(c, S));
        g.restore();
      }
      if (this.hover) {
        const { x, y } = this.hover;
        if (this.tool && !this.get(x, y)) {
          g.save();
          g.globalAlpha = 0.45;
          g.translate(this.sx(x), this.sy(y));
          style.blocks[this.tool](
            g,
            { x, y, type: this.tool, facing: this.rotation },
            z,
            this.appearance({ x, y, type: this.tool }, {}),
          );
          g.restore();
        }
        g.strokeStyle = style.cursor;
        g.lineWidth = 1.5;
        g.strokeRect(this.sx(x) + 0.5, this.sy(y) + 0.5, z - 1, z - 1);
      }
      if (this.overlay) this.overlay(g, this);
    }
  }

  function drawIcon(canvas, type, styleName = 'pixel', on = true) {
    const dpr = devicePixelRatio || 1;
    const s = canvas.clientWidth || canvas.width;
    canvas.width = s * dpr;
    canvas.height = s * dpr;
    const g = canvas.getContext('2d');
    g.scale(dpr, dpr);
    STYLES[styleName].blocks[type](g, { type, facing: 0 }, s, {
      att: [false, true, false, true],
      on,
      on2: on,
    });
  }

  function drawMinimap(canvas, view) {
    const dpr = devicePixelRatio || 1;
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    if (canvas.width !== w * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    const px = 3,
      ox = w / 2 - view.cx * px,
      oy = h / 2 - view.cy * px;
    for (const c of view.world.cells.values()) {
      g.fillStyle = view.style.mini[c.type];
      g.fillRect(ox + c.x * px, oy + c.y * px, px, px);
    }
    g.strokeStyle = view.style.cursor;
    g.lineWidth = 1;
    const vw = (view.w / view.zoom) * px,
      vh = (view.h / view.zoom) * px;
    g.strokeRect(w / 2 - vw / 2, h / 2 - vh / 2, vw, vh);
  }

  /** Number keys 1–7 select a slot. */
  function bindSlots(onSelect) {
    addEventListener('keydown', (e) => {
      const n = Number(e.key);
      if (n >= 1 && n <= TYPES.length && !e.target.closest('input,textarea')) onSelect(n - 1);
    });
  }

  window.Ruda = {
    TYPES,
    NAMES,
    HINTS,
    STYLES,
    WorldView,
    demoWorld,
    randomWorld,
    drawIcon,
    drawMinimap,
    bindSlots,
  };
})();
