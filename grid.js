
(() => {
  /* ---- tuning ---- */
  const PITCH = 18;            // distance between object centres (was 27)
  const MAX = 50;              // full size under the cursor
  let R = 150;                 // brush radius at the cursor (the avatar widens it during the intro)
  const LIFE = 700;            // ms a point of the cursor path keeps influencing (the flow tail)
  const PUSH = 14;             // how far objects are pushed away from the cursor
  const DRAG = 0.9;            // how much objects are carried along the cursor's motion
  const ATLAS_COLS = 16, ATLAS_CELL = 100, BLUR_CELL = 50;
  const FOCUS_AFTER = 150;     // ms the cursor has to rest before the blur clears
  const SLOW = 1, FAST = 1;   // size multiplier for a resting vs a fast cursor
  const SPEED_FULL = 45;           // px per frame that counts as "fast"
  

  const cv = document.getElementById('c'), ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H, dpr, n, cx, cy, kind, heat, amp, size, sv, ox, oy, ovx, ovy, rot;
  let kS, dS, decay, maxS, w1, ph, rr, lag;   // per-object personality

  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* 16 regions from the page scheme (normalised to a 1440\u00d71024 frame); each one shows only its own project's pieces */
  const REGIONS = ["Fun", "advertalyze", "resonance", "samolet", "tolk", "moremio", "TBC", "Payme", "VK", "zion", "non-commercial", "cheshu", "corrosion", "yandex", "karpov", "georank"];
  const RECTS = [[0.2039, 0.1648, 0.2871, 0.3408], [0.3745, 0.1872, 0.4989, 0.3042], [0.538, 0.235, 0.7043, 0.3408], [0.2871, 0.3052, 0.3695, 0.4802], [0.3702, 0.3052, 0.5365, 0.41], [0.2039, 0.3856, 0.2871, 0.5615], [0.3702, 0.411, 0.4526, 0.587], [0.4534, 0.411, 0.5365, 0.587], [0.538, 0.3418, 0.6204, 0.5178], [0.6204, 0.4232, 0.7028, 0.5982], [0.7035, 0.4191, 0.8272, 0.5351], [0.2871, 0.5005, 0.3695, 0.6755], [0.3702, 0.588, 0.5365, 0.6928], [0.538, 0.5178, 0.6204, 0.6907], [0.3254, 0.6958, 0.4497, 0.8118], [0.5423, 0.6907, 0.6667, 0.8077]];
  const MAP = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 14, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15];          // atlas cell \u2192 region
  const POOLS = REGIONS.map((_, r) => MAP.map((m, i) => m === r ? i : -1).filter(i => i >= 0));
  // the scheme only covers the middle of the screen, so it is stretched from its centre to fill the page
  const CL = [0.2039, 0.1648, 0.8272, 0.8118], CC = [(CL[0] + CL[2]) / 2, (CL[1] + CL[3]) / 2];
  const SX = 0.96 / (CL[2] - CL[0]), SY = 0.96 / (CL[3] - CL[1]);
  let region, usage, avoid = null, hidden;
  function regionOf(x, y) {
    let best = 0, bd = 1e9;
    for (let r = 0; r < RECTS.length; r++) {
      const q = RECTS[r];
      const x0 = (0.5 + (q[0] - CC[0]) * SX) * W, x1 = (0.5 + (q[2] - CC[0]) * SX) * W;
      const y0 = (0.5 + (q[1] - CC[1]) * SY) * H, y1 = (0.5 + (q[3] - CC[1]) * SY) * H;
      const dx = Math.max(x0 - x, 0, x - x1), dy = Math.max(y0 - y, 0, y - y1), d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = r; }
    }
    return best;
  }
  function pick(c, r, cols, reg) {
    const pool = POOLS[reg], reach = Math.min(8, Math.max(2, Math.floor(Math.sqrt(pool.length) * 1.4)));
    let best = pool[0], bs = 1e9;
    for (const k of pool) {
      let near = 1e9;
      for (let rr2 = Math.max(0, r - reach); rr2 <= r; rr2++)
        for (let cc = Math.max(0, c - reach); cc <= Math.min(cols - 1, c + reach); cc++) {
          if (rr2 === r && cc >= c) break;
          if (kind[rr2 * cols + cc] === k) { const d = Math.hypot(cc - c, rr2 - r); if (d < near) near = d; }
        }
      const sc = (near <= reach ? 40 / near : 0) + usage[k] * 0.3 + rnd() * 0.8;
      if (sc < bs) { bs = sc; best = k; }
    }
    usage[best]++;
    return best;
  }
  function markHidden() {
    if (!hidden) return;
    const list = !avoid ? [] : Array.isArray(avoid[0]) ? avoid : [avoid];   // one or several clear circles [x, y, r]
    for (let i = 0; i < n; i++) { let h = 0; for (const c of list) { const dx = cx[i] - c[0], dy = cy[i] - c[1]; if (dx * dx + dy * dy < c[2] * c[2]) { h = 1; break; } } hidden[i] = h; }
  }

  function build() {
    usage = new Float32Array(MAP.length);
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const cols = Math.ceil(W / PITCH) + 1, rows = Math.ceil(H / PITCH) + 1;
    const x0 = (W - (cols - 1) * PITCH) / 2, y0 = (H - (rows - 1) * PITCH) / 2;
    n = cols * rows;
    const F = () => new Float32Array(n);
    cx = F(); cy = F(); heat = F(); amp = F(); size = F(); sv = F(); ox = F(); oy = F(); ovx = F(); ovy = F(); rot = F();
    kS = F(); dS = F(); decay = F(); maxS = F(); w1 = F(); ph = F(); rr = F(); lag = F();
    kind = new Uint16Array(n).fill(65535); region = new Uint8Array(n); hidden = new Uint8Array(n);
    seed = 11;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      // slight jitter so the grid does not read as a strict lattice once objects grow
      cx[i] = x0 + c * PITCH + (rnd() - .5) * 4; cy[i] = y0 + r * PITCH + (rnd() - .5) * 4;
      region[i] = regionOf(cx[i], cy[i]); kind[i] = pick(c, r, cols, region[i]);
      kS[i] = 0.05 + rnd() * 0.12;          // spring stiffness: some snap, some lag behind
      dS[i] = 0.72 + rnd() * 0.16;          // damping: lower = more overshoot / wobble
      decay[i] = 0.93 + rnd() * 0.05;       // how long each object stays big after the cursor leaves
      maxS[i] = MAX * (0.6 + rnd() * 0.55); // not every object grows to the same size
      w1[i] = 1.2 + rnd() * 2.6;            // pulse speed
      ph[i] = rnd() * Math.PI * 2;          // pulse phase
      rr[i] = (rnd() - .5) * 0.5;           // resting tilt, applied in proportion to size
      lag[i] = rnd() * 0.35;                // delay: farther objects wake up a little later
    }
  }

  const atlas = new Image(); atlas.src = 'sharp.webp';
  const blurAtlas = new Image(); blurAtlas.src = 'blur.webp';
  let focus = 0;

  /* cursor path: recent points make a tapered stream */
  const path = [];
  let mx = -1e4, my = -1e4, vx = 0, vy = 0, inside = false, lastMove = 0, spd = 0, lastT = 0;
  const mulOf = v => { const q = Math.min(1, v / SPEED_FULL); const e = q * q * (3 - 2 * q); return SLOW + (FAST - SLOW) * e; };
  function point(x, y) {
    const now = performance.now();
    if (inside) {
      const fr = Math.max(0.5, (now - lastT) / 16.67);
      vx = vx * .6 + (x - mx) / fr * .4; vy = vy * .6 + (y - my) / fr * .4;
      spd = spd * .7 + Math.hypot(vx, vy) * .3;
    }
    mx = x; my = y; inside = true; lastMove = now; lastT = now;
    path.push({ x, y, t: now, vx, vy, m: mulOf(spd) });
  }
  // the avatar is the brush: it calls these instead of the mouse
  window.gridBrush = { move: point, stop() { inside = false; }, avoid(circle) { avoid = circle; markHidden(); },
    // what the cursor is resting on: used by the avatar to name the project
    regionAt(x, y) { return REGIONS[regionOf(x, y)]; },
    pause(v) { paused = v; },
    radius(r) { R = r; },
    info() { const still = inside && performance.now() - lastMove > FOCUS_AFTER; return { still, region: inside ? REGIONS[regionOf(mx, my)] : null }; } };

  const noHover = false;
  const t0 = performance.now();
  let last = t0;

  let paused = false;   // nothing animates under the folders / viewer layer, so skip drawing
  function frame(now) {
    if (paused) { last = now; requestAnimationFrame(frame); return; }
    const dt = Math.min(2.5, (now - last) / 16.67); last = now;
    const t = (now - t0) / 1000;

    // phones: a ghost cursor wanders until touched
    if (noHover && now - lastMove > 2500 && !reduce) {
      const gx = W * (0.5 + 0.34 * Math.sin(t * 0.55)), gy = H * (0.5 + 0.3 * Math.sin(t * 0.9 + 1));
      vx = gx - mx; vy = gy - my; mx = gx; my = gy; inside = true;
      spd = Math.hypot(vx, vy) * 3; path.push({ x: gx, y: gy, t: now, vx, vy, m: mulOf(spd) });
    }
    // while the mouse rests, keep a live point under it so the area keeps breathing
    if (inside && now - lastMove > 60) { vx *= .9; vy *= .9; spd *= .9; path.push({ x: mx, y: my, t: now, vx, vy, m: mulOf(spd) }); }
    while (path.length && now - path[0].t > LIFE) path.shift();
    if (path.length > 48) path.splice(0, path.length - 48);

    // bounding box of the active stream to skip far cells cheaply
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    for (const p of path) { if (p.x < bx0) bx0 = p.x; if (p.x > bx1) bx1 = p.x; if (p.y < by0) by0 = p.y; if (p.y > by1) by1 = p.y; }
    bx0 -= R; by0 -= R; bx1 += R; by1 += R;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const draw = [];
    const R2 = R * R;

    for (let i = 0; i < n; i++) {
      const x = cx[i], y = cy[i];
      if (hidden[i]) { heat[i] = 0; size[i] = 0; sv[i] = 0; continue; }
      let h = heat[i] * Math.pow(decay[i], dt), fx = 0, fy = 0, best = 0, am = -1;

      if (path.length && x > bx0 && x < bx1 && y > by0 && y < by1) {
        for (let j = path.length - 1; j >= 0; j--) {
          const p = path[j];
          const age = (now - p.t) / LIFE;                       // 0 = newest, 1 = oldest
          const rad = R * (1 - age * 0.75);                      // stream tapers toward its tail
          const dx = x - p.x, dy = y - p.y, d2 = dx * dx + dy * dy;
          if (d2 >= rad * rad) continue;
          const d = Math.sqrt(d2), f0 = 1 - d / rad;
          const f = f0 * f0 * (3 - 2 * f0) * (1 - age);
          if (f > best) {
            best = f;
            // flow: push outward (strongest mid-radius, zero at the centre) and carry along the motion
            const inv = d > 0.001 ? 1 / d : 0, ring = 4 * f0 * (1 - f0) * (1 - age);
            fx = dx * inv * ring * PUSH * 0.06 + p.vx * f * DRAG * 0.06;
            fy = dy * inv * ring * PUSH * 0.06 + p.vy * f * DRAG * 0.06;
          }
          if (f > h) { h = f; am = p.m; }
        }
      }
      if (h < 0.003) h = 0;
      heat[i] = h;
      // size multiplier follows the speed that last touched this object, easing so it doesn't jump
      if (am >= 0) amp[i] += (am - amp[i]) * Math.min(1, 0.18 * dt);

      // displacement spring (objects drift with the flow, then settle back)
      ovx[i] = (ovx[i] + (fx - ox[i] * 0.06) * dt) * Math.pow(0.86, dt);
      ovy[i] = (ovy[i] + (fy - oy[i] * 0.06) * dt) * Math.pow(0.86, dt);
      ox[i] += ovx[i] * dt; oy[i] += ovy[i] * dt;
      const om = Math.hypot(ox[i], oy[i]); if (om > 26) { ox[i] *= 26 / om; oy[i] *= 26 / om; }

      // size: delayed target with a per-object pulse, followed by a bouncy spring
      const e = Math.max(0, (h - lag[i] * (1 - h)) / (1 - lag[i] * (1 - h) || 1));
      const pulse = reduce ? 1 : 0.78 + 0.22 * Math.sin(t * w1[i] + ph[i]) + 0.06 * Math.sin(t * w1[i] * 2.3 + ph[i] * 1.7);
      const target = maxS[i] * e * pulse * amp[i];
      sv[i] = (sv[i] + (target - size[i]) * kS[i] * dt) * Math.pow(dS[i], dt);
      size[i] += sv[i] * dt;
      if (size[i] < 0.4 && target === 0 && Math.abs(sv[i]) < 0.05) { size[i] = 0; sv[i] = 0; }
      if (size[i] > 0.6) draw.push(i);
    }

    // blur clears after the cursor rests for a second, comes back as soon as it moves
    const still = inside && now - lastMove > FOCUS_AFTER;
    focus += ((still ? 1 : 0) - focus) * Math.min(1, (still ? 0.2 : 0.25) * dt);
    if (atlas.complete && atlas.naturalWidth && blurAtlas.complete && blurAtlas.naturalWidth) {
      draw.sort((a, b) => size[a] - size[b]);              // biggest on top
      for (const i of draw) {
        const s = size[i] * (1 + 0.3 * focus), k = kind[i];
        const a = rr[i] * Math.min(1, s / (MAX * FAST)) + sv[i] * 0.01; // tilt grows with size, wobbles with spring speed
        const c = Math.cos(a), sn = Math.sin(a);
        ctx.setTransform(c * dpr, sn * dpr, -sn * dpr, c * dpr, (cx[i] + ox[i]) * dpr, (cy[i] + oy[i]) * dpr);
        if (focus < 0.99) { ctx.globalAlpha = 1 - focus; const b = s * 1.25;
          ctx.drawImage(blurAtlas, (k % ATLAS_COLS) * BLUR_CELL, Math.floor(k / ATLAS_COLS) * BLUR_CELL, BLUR_CELL, BLUR_CELL, -b / 2, -b / 2, b, b); }
        if (focus > 0.01) { ctx.globalAlpha = focus;
          ctx.drawImage(atlas, (k % ATLAS_COLS) * ATLAS_CELL, Math.floor(k / ATLAS_COLS) * ATLAS_CELL, ATLAS_CELL, ATLAS_CELL, -s / 2, -s / 2, s, s); }
        ctx.globalAlpha = 1;
      }
    }
    requestAnimationFrame(frame);
  }

  build(); markHidden(); addEventListener('resize', () => { build(); markHidden(); });
  requestAnimationFrame(frame);
})();
