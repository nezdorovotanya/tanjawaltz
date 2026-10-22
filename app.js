(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  const buddy = $('buddy'), cloud = $('cloud'), bubble = $('bubble'), anchor = $('anchor'), say = $('say');
  const folders = $('folders'), shelf = $('shelf'), viewer = $('viewer'), card = $('card'), gallery = $('gallery');
  const G = () => window.gridBrush;

  /* ---------- layout from the 1440\u00d71024 frames ---------- */
  let k, F, s, CF, cs;   // scale, avatar frame px, px per avatar unit, cloud frame px, px per cloud unit
  function measure() {
    k = Math.max(.72, Math.min(1, innerWidth / 1440, innerHeight / 1024));
    F = 198 * k; s = F / 540; CF = 155 * k; cs = CF / 540;
    const r = document.documentElement.style;
    r.setProperty('--av', F + 'px'); r.setProperty('--cl', CF + 'px'); r.setProperty('--k', k);
  }
  measure();
  const W = () => innerWidth, H = () => innerHeight;
  let cardRect = [0, 0, 1337, 915];
  // avatar group positions in the frames \u2192 avatar frame top-left (group sits 70 units inside the frame)
  const fromGroup = (gx, gy) => [gx - 25.7 * k, gy - 25.7 * k];
  const P = {
    center: () => [W() / 2 - 182.7 * k, H() / 2 - 119.7 * k],
    corner: () => [72.3 * k, H() - 242.7 * k],
    hop: i => { const g = [[239, 122], [533, 644], [978, 379]][i]; return fromGroup(g[0] / 1440 * W(), g[1] / 1024 * H()); },
    byCloud: () => [W() - (1440 - 1061.5) * k, 90 * k],
    cloud: () => [W() - (1440 - 1273) * k, -6 * k],
    folderAv: () => fromGroup(116 * k, H() - (1024 - 839) * k),
    cardBox: () => cardRect,
    // avatar and cloud sit in the info column, measured from the card's bottom-right corner (frame 6)
    cardAv: () => { const [x, y, w, h] = cardRect; return [x + w - 189.7 * k, y + h - 192.7 * k]; },
    cardCloud: () => { const [x, y, w, h] = cardRect; return [x + w - 78 * k, y + h - 322 * k]; }
  };

  /* ---------- speech bubble ---------- */
  let bubbleSide = 'r';
  function placeBubble() {
    const b = bubble.querySelector('.b'), h = b.offsetHeight, w = b.offsetWidth;
    const d1 = bubble.querySelector('.d1'), d2 = bubble.querySelector('.d2');
    if (bubbleSide === 'r') {
      anchor.style.transform = `translate(${ax + 192 * k}px, ${ay}px)`;
      b.style.left = '0'; b.style.top = (72 * k - h) + 'px';
      d1.style.left = (-9.3 * k) + 'px'; d1.style.top = (62 * k) + 'px'; d2.style.left = (-15.3 * k) + 'px'; d2.style.top = (73 * k) + 'px';
    } else {
      anchor.style.transform = `translate(${ax - 5.5 * k}px, ${ay}px)`;
      b.style.left = (-w) + 'px'; b.style.top = (72 * k - h) + 'px';
      d1.style.left = (4 * k) + 'px'; d1.style.top = (64 * k) + 'px'; d2.style.left = (12 * k) + 'px'; d2.style.top = (75 * k) + 'px';
    }
  }
  function talk(text, side = 'r') {
    bubbleSide = side; bubble.classList.toggle('left', side === 'l');
    say.textContent = text; bubble.classList.remove('in', 'out'); void bubble.offsetWidth; placeBubble(); bubble.classList.add('in');
  }
  function hush() { if (bubble.classList.contains('in')) { bubble.classList.remove('in'); bubble.classList.add('out'); } }

  /* ---------- springs ---------- */
  class S { constructor(x = 0, k = .12, d = .78) { this.x = x; this.v = 0; this.t = x; this.k = k; this.d = d; }
    step(dt) { this.v = (this.v + (this.t - this.x) * this.k * dt) * Math.pow(this.d, dt); this.x += this.v * dt; } }
  const sp = (k, d, x = 0) => new S(x, k, d);
  const chan = () => ({ x: sp(.12, .78), y: sp(.12, .78), r: sp(.1, .8), s: sp(.14, .74, 1), o: sp(.2, .68, 1) });
  const step = c => { c.x.step(dt); c.y.step(dt); c.r.step(dt); c.s.step(dt); c.o.step(dt); };
  const apply = (g, c, piv) => {
    g.setAttribute('transform', `translate(${c.x.x.toFixed(2)} ${c.y.x.toFixed(2)}) translate(${piv[0]} ${piv[1]}) rotate(${c.r.x.toFixed(2)}) scale(${Math.max(0, c.s.x).toFixed(3)}) translate(${-piv[0]} ${-piv[1]})`);
    g.style.opacity = Math.max(0, Math.min(1, c.o.x)).toFixed(3);
  };
  let dt = 1;

  /* ================= AVATAR ================= */
  const A = {}; buddy.querySelectorAll('[data-p]').forEach(g => A[g.dataset.p] = g);
  const ch = {}; const parts = Object.keys(A);
  parts.forEach(p => ch[p] = chan());
  const extras = ['eyes5', 'glasses5', 'glasses6', 'mouth2', 'mouth3', 'mouth5', 'tears', 'tears6', 's2back', 's2front', 's3back', 's3front', 's5back', 's5front'];
  extras.forEach(p => { ch[p].s.x = ch[p].s.t = 0; ch[p].o.x = ch[p].o.t = 0; });
  ['eyes', 'eyes5', 'glasses', 'glasses5', 'glasses6'].forEach(p => { ch[p].o.k = .35; ch[p].o.d = .6; ch[p].s.x = ch[p].s.t = 1; });
  ch.hairBack.r.k = .07; ch.hairBack.r.d = .86; ch.hairL.r.k = ch.hairR.r.k = .06; ch.hairL.r.d = ch.hairR.r.d = .88;
  ch.glasses.y.k = .08; ch.glasses.y.d = .8;
  ch.all.s.x = ch.all.s.t = 0; ch.all.s.k = .16; ch.all.s.d = .72;
  const PIV = { all: [262, 470], body: [262, 470], hairBack: [262, 82], hairL: [228, 86], hairR: [298, 86], eyes: [262, 253], eyes5: [264, 253],
    glasses: [261, 284], glasses5: [261, 270], glasses6: [247, 197], handL: [190.6, 431], handR: [336.6, 431], head: [262, 227],
    mouth2: [262, 311], mouth3: [262, 322], mouth5: [262, 311], tears: [278, 370], tears6: [280, 330],
    s2back: [270, 150], s2front: [300, 200], s3back: [270, 150], s3front: [300, 200], s5back: [270, 150], s5front: [397, 219] };
  const POSE = {
    1: { handL: [0, 0], handR: [0, 0], glasses: [0, 0] }, 2: { handL: [-121, -109.6], handR: [0, 0], glasses: [0, 0] },
    3: { handL: [12, 0], handR: [134, -109.6], glasses: [0, 0] }, 4: { handL: [-113, -243.6], handR: [110, -243.6], glasses: [0, -120] },
    5: { handL: [-81, -169], handR: [0, 0], glasses: [0, 0] }, 6: { handL: [-113, -243], handR: [118, -86], glasses: [0, 0] } };
  const VIS = st => ({ eyes: st !== 5, eyes5: st === 5, glasses: st <= 4, glasses5: st === 5, glasses6: st === 6,
    mouth2: st === 2, mouth3: st === 3, mouth5: st === 5, tears: st === 4, tears6: st === 6,
    s2back: st === 2, s2front: st === 2, s3back: st === 3, s3front: st === 3, s5back: st === 5, s5front: st === 5 });
  const twinkles = [];
  ['s2back', 's2front', 's3back', 's3front', 's5back', 's5front'].forEach(gk => [...A[gk].children].forEach((el, i) => {
    const b = el.getBBox(); twinkles.push({ el, gk, cx: b.x + b.width / 2, cy: b.y + b.height / 2, ph: Math.random() * 6.28, sp: 2 + Math.random() * 2.5, delay: i * 70, flower: gk === 's5back' });
  }));
  const drops = [...A.tears.children, ...A.tears6.children].map((el, i) => { const b = el.getBBox(); return { el, cx: b.x + b.width / 2, cy: b.y, off: i * .29, six: i >= A.tears.children.length }; });
  const eyeKids = [...A.eyes.children].map(el => { const b = el.getBBox(); return { el, cx: b.x + b.width / 2, cy: b.y + b.height / 2 }; });

  let state = 1, stateT = 0, clicks = 0, lastClick = 0, backTimer = 0, sobTimer = 0, happyIdx = 0;
  function setState(n) {
    state = n; stateT = performance.now(); const v = VIS(n);
    for (const kk in v) { ch[kk].o.t = v[kk] ? 1 : 0; if (extras.includes(kk) && !kk.startsWith('eyes') && !kk.startsWith('glasses')) { ch[kk].s.t = v[kk] ? 1 : .4; if (v[kk]) ch[kk].s.x = Math.min(ch[kk].s.x, .3); } }
    const pose = POSE[n]; for (const kk in pose) { ch[kk].x.t = pose[kk][0]; ch[kk].y.t = pose[kk][1]; }
    ch.glasses.r.t = n === 4 ? -6 : 0;
  }
  function cry() {
    clearTimeout(backTimer); clearInterval(sobTimer); setState(4); let alt = false;
    sobTimer = setInterval(() => { alt = !alt; setState(alt ? 6 : 4); ch.body.y.v -= 3; }, 1100);
    backTimer = setTimeout(() => { clearInterval(sobTimer); clicks = 0; setState(1); }, 4400);
  }
  function poke() {     // click on the avatar
    const now = performance.now();
    if (now - lastClick > 2500 && state !== 4 && state !== 6) clicks = 0;
    lastClick = now; clicks++;
    if (state === 4 || state === 6) return;
    clearTimeout(backTimer);
    if (clicks > 7) return cry();
    setState([2, 3, 5][happyIdx++ % 3]); ch.body.y.v -= 9; ch.all.s.v += .04;
    backTimer = setTimeout(() => setState(1), 1800);
  }

  /* ================= CLOUD ================= */
  const C = {}; cloud.querySelectorAll('[data-c]').forEach(g => C[g.dataset.c] = g);
  const cc = {}; Object.keys(C).forEach(p => cc[p] = chan());
  ['ringL', 'ringT', 'ringR', 'stars'].forEach(p => { cc[p].s.x = cc[p].s.t = 0; cc[p].o.x = cc[p].o.t = 0; cc[p].s.k = .1; cc[p].s.d = .76; });
  cc.all.s.x = cc.all.s.t = 0; cc.all.s.k = .16; cc.all.s.d = .72;
  const CPIV = { all: [270, 300], main: [270, 300], back1: [361, 142], back2: [452, 131], ringL: [115, 237], ringT: [325, 155], ringR: [440, 291], stars: [230, 100] };
  const rings = [...C.ringL.children, ...C.ringT.children, ...C.ringR.children].map(el => { const b = el.getBBox(); return { el, cx: b.x + b.width / 2, cy: b.y + b.height / 2, r: b.width / 2 }; });
  const cstars = [...C.stars.children].map((el, i) => { const b = el.getBBox(); return { el, cx: b.x + b.width / 2, cy: b.y + b.height / 2, ph: i * 1.7 }; });
  let cloudClickT = -1e9, cloudOn = false;
  function cloudClick() {
    cloudClickT = performance.now();
    ['ringL', 'ringT', 'ringR', 'stars'].forEach((p, i) => { cc[p].o.t = 1; cc[p].s.t = 1; cc[p].s.x = 0; cc[p].s.v = 0; });
    cc.main.s.v += .06; cc.main.y.v -= 6;
    clearTimeout(cloudTimer); cloudTimer = setTimeout(() => ['ringL', 'ringT', 'ringR', 'stars'].forEach(p => { cc[p].o.t = 0; cc[p].s.t = .6; }), 1700);
  }
  let cloudTimer = 0;

  /* ---------- positions and teleporting ---------- */
  let ax, ay, cx, cy; [ax, ay] = P.center(); [cx, cy] = P.cloud();
  function teleport(who, pos, then) {          // shrink to nothing, jump, grow back
    const c = who === 'avatar' ? ch.all : cc.all;
    c.s.t = 0; c.s.k = .3; c.s.d = .6;
    if (who === 'avatar') hush();
    setTimeout(() => {
      const [x, y] = typeof pos === 'function' ? pos() : pos;
      if (who === 'avatar') { ax = x; ay = y; } else { cx = x; cy = y; }
      c.s.x = 0; c.s.v = 0; c.s.t = 1; c.s.k = .16; c.s.d = .72;
      then && then();
    }, reduce ? 0 : 230);
  }

  /* ---------- the grid ---------- */
  const center = () => [ax + 262 * s, ay + 270 * s];
  // clear circles: 50px around the avatar, and a little room around the cloud
  function clearZone(margin = 110) {
    const z = [[...center(), 205 * s + margin]];
    if (cloudOn && screen === 'map') z.push([cx + 270 * cs, cy + 260 * cs, 210 * cs + 60]);
    G() && G().avoid(z);
  }
  let cursorOn = false, brushFly = false;

  /* ================= INTRO ================= */
  let live = false, timers = [], travel = null, vx = 0, vy = 0;
  const later = (ms, f) => timers.push(setTimeout(f, reduce ? Math.min(ms, 300) : ms));
  function flyTo(tx, ty, ms, done) {
    const fx = ax, fy = ay, t0 = performance.now(), lift = Math.min(160, Math.hypot(tx - fx, ty - fy) * .25);
    travel = now => {
      const q = Math.min(1, (now - t0) / ms), e = q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
      const nx = fx + (tx - fx) * e, ny = fy + (ty - fy) * e - Math.sin(e * Math.PI) * lift;
      vx = vx * .5 + (nx - ax) * .5; vy = vy * .5 + (ny - ay) * .5; ax = nx; ay = ny;
      if (brushFly && G()) G().move(...center());
      if (q >= 1) { travel = null; ch.body.y.v += 5; ch.all.s.v -= .05; done && done(); }
    };
  }
  function showOff(i, next) {     // the avatar hops to a spot and lights up the works around it
    G() && G().stop();
    teleport('avatar', P.hop(i), () => {
      clearZone(0); G() && G().radius(260); G() && G().move(...center());
      ch.body.y.v -= 6; next && later(1250, next);
    });
  }
  function start() {
    ch.all.s.t = 1;
    later(350, () => talk('Hello!'));
    later(1700, () => { setState(5); ch.body.y.v -= 7; talk('My name is Tanya Waltz'); });
    later(3200, () => { hush(); setState(1); brushFly = true; flyTo(...P.corner(), 950, () => {
      brushFly = false; clearZone(); talk('I will be navigating you\nthrough my web page');
      // the avatar stays in its corner, then pops up next to the cloud to introduce it
      later(2300, () => { talk('Click anywhere\nto see projects');
        later(2600, () => {
          hush(); showCloud(true);
          teleport('avatar', P.byCloud, () => { setState(2); talk('Click on the cloud to learn\nmore about me', 'l');
            later(3000, () => { hush(); setState(1); teleport('avatar', P.corner, finish); });
          });
        });
      });
    }); });
  }
  function showCloud(withClick) {
    if (cloudOn) return; cloudOn = true; [cx, cy] = P.cloud(); cc.all.s.t = 1;
    if (withClick) setTimeout(cloudClick, 250);
  }
  function finish() {
    timers.forEach(clearTimeout); timers = []; travel = null;
    live = true; cursorOn = true; brushFly = false; setState(1); showCloud(false); screen = 'map';
    G() && (G().stop(), G().radius(150)); clearZone();
  }
  let skipping = false;
  function skip() {
    if (live || skipping) return; skipping = true;
    timers.forEach(clearTimeout); timers = []; travel = null; hush(); setState(1); brushFly = false;
    teleport('avatar', P.corner, finish);
  }

  /* ================= PROJECTS ================= */
  let PROJECTS = [];
  fetch('cases.json').then(r => r.json()).then(d => { PROJECTS = d; });
  const LABEL = { Fun: 'Fun', advertalyze: 'Advertalyze', resonance: 'Resonance', samolet: 'Samolet', tolk: 'Tolk', moremio: 'Moremio', TBC: 'TBC',
    Payme: 'Payme', VK: 'VK', zion: 'Zion', 'non-commercial': 'Non-commercial', cheshu: 'Cheshu', corrosion: 'Corrosion', yandex: 'Yandex', karpov: 'karpov.courses', georank: 'Georank' };
  let screen = 'map', openRegion = null;   // map | folders | viewer
  const closeIcon = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };

  function openRegionAt(x, y) {
    const reg = G() && G().regionAt(x, y); if (!reg) return;
    const list = PROJECTS.filter(p => p.reg === reg); if (!list.length) return;
    openRegion = reg;
    if (list.length === 1) openViewer(list[0], false); else openFolders(list);
  }
  // card palettes: frame tint, picture gradient, dot colour, tag pill, tag text
  const PAL = [
    { fr: '#eef1f8', g1: '#fbfcff', g2: '#dfe4f0', dot: '#b3b8c3', pill: '#f3f5fa', pt: '#1d2433' },
    { fr: '#f6e4f6', g1: '#ece6fb', g2: '#c6b9f6', dot: '#ff80f0', pill: '#ff9df3', pt: '#1d2433' },
    { fr: '#eef3dc', g1: '#d3d3cc', g2: '#b6c49c', dot: '#e7ff70', pill: '#e7ff70', pt: '#1d2433' },
    { fr: '#fbe7d6', g1: '#ffc21a', g2: '#ff9000', dot: '#fdeafb', pill: '#ffa21a', pt: '#1d2433' },
    { fr: '#e1eaff', g1: '#e3ecff', g2: '#a7c0ff', dot: '#3a63ff', pill: '#bcd0ff', pt: '#1d2433' },
    { fr: '#e3e6f0', g1: '#353a52', g2: '#14161f', dot: '#8fffd8', pill: '#8fffd8', pt: '#1d2433' }
  ];
  const ICON = {
    go: '<svg class="go" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H4.5A1.5 1.5 0 0 0 3 4.5v9A1.5 1.5 0 0 0 4.5 15h9a1.5 1.5 0 0 0 1.5-1.5V9"/><path d="M11 3h4v4M15 3 8.5 9.5"/></svg>',
    lay: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="1.5" y="1.5" width="11" height="11" rx="2.5"/><path d="M1.5 6h11M6 6v6.5"/></svg>',
    obj: '<svg viewBox="0 0 14 14" fill="currentColor"><path d="M7 .8c.5 3.6 2.6 5.7 6.2 6.2-3.6.5-5.7 2.6-6.2 6.2C6.5 9.6 4.4 7.5.8 7 4.4 6.5 6.5 4.4 7 .8Z"/></svg>',
    yr: '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m2 3.5 3.5 3.5L2 10.5M7.5 3.5 11 7l-3.5 3.5"/></svg>'
  };
  const plural = (n, w) => `${String(n).padStart(2, '0')} ${w}${n === 1 ? '' : 's'}`;
  // pick palettes so that neighbours differ and the region's first card varies
  function palFor(i) { const off = (openRegion || '').length; return PAL[(i + off) % PAL.length]; }

  function openFolders(list) {
    screen = 'folders'; cursorOn = false; G() && G().stop(); hush();
    dotCards.forEach(d => dotObserver.unobserve(d.cv)); dotCards.length = 0;
    shelf.innerHTML = '';
    list.forEach((p, i) => {
      const pal = palFor(i);
      const f = document.createElement('button'); f.className = 'folder'; f.style.transitionDelay = (i * 60) + 'ms';
      for (const key of ['fr', 'g1', 'g2', 'pill', 'pt']) f.style.setProperty('--' + key, pal[key]);
      f.setAttribute('aria-label', p.name);
      const cover = [...p.items.filter(i => i.c === 'L'), ...p.items.filter(i => i.c !== 'L' && (!i.sheet || i.keep))][0];
      const nL = p.items.filter(i => i.c === 'L').length, nO = p.items.length - nL;
      const stats = [];
      if (nL && nO) stats.push(`<span title="${nL} layouts">${ICON.lay}${String(nL).padStart(2, '0')}</span>`, `<span title="${nO} objects">${ICON.obj}${String(nO).padStart(2, '0')}</span>`);
      else if (nL) stats.push(`<span>${ICON.lay}${plural(nL, 'layout')}</span>`);
      else if (nO) stats.push(`<span>${ICON.obj}${plural(nO, 'object')}</span>`);
      if (p.year) stats.push(`<span>${ICON.yr}${p.year}</span>`);
      f.innerHTML = `<div class="hd"><span class="dot"></span><b></b>${ICON.go}</div>
        <div class="pic"><canvas></canvas></div><div class="ft"><div class="st">${stats.join('')}</div>${p.tags[0] ? '<span class="pill"></span>' : ''}</div>`;
      f.querySelector('b').textContent = p.name;
      if (p.tags[0]) f.querySelector('.pill').textContent = p.tags[0];
      f.addEventListener('click', e => { e.stopPropagation(); openViewer(p, true); });
      shelf.appendChild(f);
      const d = { cv: f.querySelector('canvas'), pal, cells: null, mx: -1e4, my: -1e4, hot: 0 };
      dotCards.push(d); dotObserver.observe(d.cv);
      if (cover) sampleCover(cover, d); else d.cells = 'none';
      f.addEventListener('pointermove', e => { const r = d.cv.getBoundingClientRect(); d.mx = e.clientX - r.left; d.my = e.clientY - r.top; wakeDots(); });
      f.addEventListener('pointerleave', () => { d.mx = d.my = -1e4; wakeDots(); });
    });
    placeFoldersClose();
    folders.classList.add('open'); G() && G().pause(true);
    teleport('avatar', P.folderAv, () => talk(`Choose the ${LABEL[openRegion] || openRegion} project`));
  }

  /* ---------- the card pictures: the cover turned into a grid of dots, like the project map ---------- */
  const N = 22;                 // dots per side
  const dotCards = [];
  const dotObserver = new ResizeObserver(() => dotCards.forEach(d => drawDots(d)));
  // the cover, sampled into N x N values in 0..1 (0 = no dot)
  function sampleCover(it, d) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = c.height = N;
      const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high';
      const iw = img.naturalWidth, ih = img.naturalHeight;
      if (it.a) { const sc = Math.min(N * .86 / iw, N * .86 / ih); x.drawImage(img, (N - iw * sc) / 2, (N - ih * sc) / 2, iw * sc, ih * sc); }
      else { const sc = Math.max(N / iw, N / ih); x.drawImage(img, (N - iw * sc) / 2, (N - ih * sc) / 2, iw * sc, ih * sc); }
      const px = x.getImageData(0, 0, N, N).data, lum = [], al = [];
      for (let i = 0; i < N * N; i++) { lum.push((px[i * 4] * .3 + px[i * 4 + 1] * .59 + px[i * 4 + 2] * .11) / 255); al.push(px[i * 4 + 3] / 255); }
      let v;
      if (it.a) v = al.map((a, i) => a * (.55 + .45 * (1 - lum[i])));
      else {
        // the less common tone of the picture becomes the dots
        const mean = lum.reduce((s, l) => s + l, 0) / lum.length;
        v = lum.map(l => mean > .5 ? 1 - l : l);
        const sorted = [...v].sort((p, q) => p - q), lo = sorted[Math.floor(N * N * .3)], hi = sorted[Math.floor(N * N * .97)] || 1;
        v = v.map(t => Math.max(0, Math.min(1, (t - lo) / Math.max(.2, hi - lo))));
      }
      // grow shapes into soft blobs: every cell takes some of its strongest neighbours
      const g = (i, j) => (i < 0 || j < 0 || i >= N || j >= N) ? 0 : v[j * N + i];
      v = v.map((t, n) => { const i = n % N, j = (n / N) | 0; let mx = 0, sum = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const q = g(i + di, j + dj); sum += q; if (q > mx) mx = q; }
        return Math.max(t, mx * .78, sum / 9 * 1.25); });
      // levels follow the picture itself: the weakest ~40% of cells stay empty, the rest split into four sizes
      const q = [...v].sort((a, b) => a - b), at = f => q[Math.min(q.length - 1, Math.floor(q.length * f))];
      const t0 = Math.max(at(.4), .06), lv = [t0, at(.58), at(.74), at(.88)];
      d.cells = v.map(t => t <= t0 ? 0 : t <= lv[1] ? 1 : t <= lv[2] ? 2 : t <= lv[3] ? 3 : 4);
      d.star = d.cells.map((q, i) => q === 2 && ((i * 2654435761) >>> 0) % 9 === 0);
      wakeDots();
    };
    img.src = it.src;
  }
  const SIZE = [0, .42, .62, .8, .96];
  function drawDots(d) {
    const cv = d.cv, w = cv.clientWidth, h = cv.clientHeight; if (!w || !d.cells) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
    if (d.cells === 'none') return;
    const pad = w * .05, step = (w - pad * 2) / N; x.fillStyle = d.pal.dot;
    let moving = false;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const n = j * N + i, q = d.cells[n]; if (!q) continue;
      const cx = pad + (i + .5) * step, cy = pad + (j + .5) * step;
      // dots swell under the cursor
      const dist = Math.hypot(cx - d.mx, cy - d.my), boost = Math.max(0, 1 - dist / (w * .28));
      const target = Math.min(1.15, SIZE[q] + boost * .45);
      d.sz = d.sz || new Float32Array(N * N);
      d.sz[n] += (target - (d.sz[n] || 0)) * .22; if (Math.abs(target - d.sz[n]) > .005) moving = true;
      const r = d.sz[n] * step / 2;
      if (d.star[n] && boost < .2) { // four-pointed sparkle
        x.beginPath(); x.moveTo(cx, cy - r * 1.25); x.quadraticCurveTo(cx, cy, cx + r * 1.25, cy); x.quadraticCurveTo(cx, cy, cx, cy + r * 1.25);
        x.quadraticCurveTo(cx, cy, cx - r * 1.25, cy); x.quadraticCurveTo(cx, cy, cx, cy - r * 1.25); x.fill();
      } else { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
    }
    return moving;
  }
  // animate only while some dots are still easing
  let dotRaf = 0;
  function wakeDots() {
    if (dotRaf) return;
    const tick = () => { let any = false; dotCards.forEach(d => { if (drawDots(d)) any = true; }); dotRaf = any && screen === 'folders' ? requestAnimationFrame(tick) : 0; };
    dotRaf = requestAnimationFrame(tick);
  }
  // the x sits in the top-right corner, left of the cloud
  function placeFoldersClose() { closeIcon($('closeFolders'), W() - 230 * k, 48 * k); }
  function closeFolders() {
    folders.classList.remove('open'); screen = 'map'; cursorOn = true; hush(); G() && G().pause(false);
    teleport('avatar', P.corner, clearZone);
  }
  let fromFolders = false;
  /* ---------- the viewer is built around the content: a board of draggable objects and columns of layouts ---------- */
  let current = null;
  function buildViewer(p) {
    const Hc = H() - 48 * k, pad = 12 * k, gap = 12 * k, Hi = Hc - 2 * pad;
    const L = p.items.filter(i => i.c === 'L'), B = p.items.filter(i => i.c !== 'L');
    const tall = L.filter(i => i.h / i.w >= .95), wide = L.filter(i => i.h / i.w < .95);
    const panels = [];
    if (B.length) {
      let bw;
      if (p.native) { const area = B.reduce((s, i) => s + (i.w / 2 * k) * (i.h / 2 * k), 0); bw = Math.max(500 * k, Math.min(1100 * k, area * 2.1 / Hi)); }
      else bw = (B.length <= 2 ? 500 : B.length <= 8 ? 610 : B.length <= 20 ? 730 : 860) * k;
      panels.push({ type: 'board', items: B, w: bw });
    }
    if (wide.length) panels.push({ type: 'col', items: wide, w: (tall.length ? 720 : 820) * k });
    if (tall.length) panels.push({ type: 'col', items: tall, w: (B.length || wide.length ? 470 : 540) * k });
    const infoW = 295 * k;
    let sum = panels.reduce((s, q) => s + q.w, 0) + gap * Math.max(0, panels.length - 1);
    const room = W() - 48 * k - pad - infoW;
    if (sum > room) { const f = room / sum; panels.forEach(q => q.w *= f); sum = room; }
    const w = pad + sum + infoW, h = Hc;
    cardRect = [(W() - w) / 2, (H() - h) / 2, w, h];
    Object.assign(card.style, { left: cardRect[0] + 'px', top: cardRect[1] + 'px', width: w + 'px', height: h + 'px' });
    gallery.innerHTML = ''; Object.assign(gallery.style, { left: pad + 'px', top: pad + 'px', width: sum + 'px', height: Hi + 'px' });
    panels.forEach(q => {
      const el = document.createElement('div'); el.className = q.type; el.style.width = q.w + 'px'; el.style.height = Hi + 'px'; gallery.appendChild(el);
      if (q.type === 'col') q.items.forEach(it => { const img = document.createElement('img'); img.src = it.src; img.alt = ''; img.loading = 'lazy'; img.className = it.a ? 'cut' : 'rect';
        img.style.aspectRatio = it.w + ' / ' + it.h; el.appendChild(img); });
      else fillBoard(el, q.items, q.w, Hi, p.native);
    });
    const info = card.querySelector('.info'); Object.assign(info.style, { left: (w - infoW + 22 * k) + 'px', top: 17 * k + 'px', width: (infoW - 80 * k) + 'px' });
    closeIcon($('closeViewer'), w - 56 * k, 17 * k);
  }
  // shelf-pack the objects, shrinking until everything fits, then scatter them a little
  function fillBoard(el, items, bw, bh, native) {
    const m = 18 * k, g = 14 * k;
    const area = items.reduce((s, i) => s + i.w * i.h, 0);
    let sc = native ? k / 2 : Math.sqrt(.5 * (bw - 2 * m) * (bh - 2 * m) / area);
    const order = [...items].sort((a, b) => b.h - a.h);
    let rows;
    for (let tries = 0; tries < 40; tries++) {
      rows = []; let row = { items: [], w: 0, h: 0 }, y = m;
      for (const it of order) {
        const iw = it.w * sc, ih = it.h * sc;
        if (row.items.length && row.w + g + iw > bw - 2 * m) { rows.push(row); y += row.h + g; row = { items: [], w: 0, h: 0 }; }
        row.items.push([it, iw, ih]); row.w += (row.items.length > 1 ? g : 0) + iw; row.h = Math.max(row.h, ih);
      }
      rows.push(row);
      const total = rows.reduce((s, r) => s + r.h, 0) + g * (rows.length - 1);
      if (total <= bh - 2 * m && rows.every(r => r.w <= bw - 2 * m + .5)) break;
      sc *= .93;
    }
    const total = rows.reduce((s, r) => s + r.h, 0) + g * (rows.length - 1);
    let y = Math.max(m, (bh - total) / 2), z = 1;
    rows.forEach(r => {
      let x = (bw - r.w) / 2;
      r.items.forEach(([it, iw, ih]) => {
        let img;
        if (it.sheet) {     // objects come from one sprite sheet per case
          const f = iw / it.w; img = document.createElement('div');
          Object.assign(img.style, { backgroundImage: `url(${it.sheet})`, backgroundSize: `${current.sheet[0] * f}px ${current.sheet[1] * f}px`, backgroundPosition: `${-it.sx * f}px ${-it.sy * f}px` });
        } else { img = document.createElement('img'); img.src = it.src; img.alt = ''; img.draggable = false; }
        img.className = 'bi' + (it.a ? ' cut' : ' rect');
        const jx = (Math.random() - .5) * g, jy = (Math.random() - .5) * g + (r.h - ih) / 2, rot = (Math.random() - .5) * 8;
        Object.assign(img.style, { width: iw + 'px', height: ih + 'px', zIndex: z++ });
        img._x = x + jx; img._y = y + jy; img._r = rot; place(img);
        el.appendChild(img); x += iw + g;
      });
      y += r.h + g;
    });
    // drag
    let drag = null, top = 1000;
    el.onpointerdown = e => { const t = e.target.closest('.bi'); if (!t) return; e.preventDefault(); t.setPointerCapture(e.pointerId); t.style.zIndex = ++top; t.classList.add('drag');
      drag = { t, dx: e.clientX - t._x, dy: e.clientY - t._y, lx: e.clientX }; };
    el.onpointermove = e => { if (!drag) return; const t = drag.t;
      t._x = Math.max(-t.offsetWidth * .5, Math.min(bw - t.offsetWidth * .5, e.clientX - drag.dx)); t._y = Math.max(-t.offsetHeight * .5, Math.min(bh - t.offsetHeight * .5, e.clientY - drag.dy));
      t._r = Math.max(-14, Math.min(14, t._r + (e.clientX - drag.lx) * .15)); drag.lx = e.clientX; place(t); };
    el.onpointerup = el.onpointercancel = () => { if (drag) drag.t.classList.remove('drag'); drag = null; };
  }
  const place = t => { t.style.transform = `translate(${t._x}px, ${t._y}px) rotate(${t._r}deg)`; };

  function openViewer(p, viaFolders) {
    fromFolders = viaFolders; screen = 'viewer'; cursorOn = false; G() && G().stop(); hush(); current = p;
    if (viaFolders) folders.classList.remove('open');
    buildViewer(p);
    $('vName').textContent = p.name; $('vMeta').textContent = [p.company, p.year].filter(Boolean).join(', ');
    $('vTags').innerHTML = ''; p.tags.forEach(t => { const sp = document.createElement('span'); sp.textContent = t; $('vTags').appendChild(sp); });
    viewer.classList.add('open'); G() && G().pause(true);
    teleport('avatar', P.cardAv);
    teleport('cloud', P.cardCloud);
  }
  function closeViewer() {
    viewer.classList.remove('open'); hush();
    teleport('cloud', P.cloud);
    if (!fromFolders) G() && G().pause(false);
    if (fromFolders) { const list = PROJECTS.filter(q => q.reg === openRegion); openFolders(list); }
    else { screen = 'map'; cursorOn = true; teleport('avatar', P.corner, clearZone); }
  }
  $('closeFolders').addEventListener('click', e => { e.stopPropagation(); closeFolders(); });
  $('closeViewer').addEventListener('click', e => { e.stopPropagation(); closeViewer(); });
  viewer.addEventListener('click', e => { if (e.target === viewer) closeViewer(); });
  folders.addEventListener('click', e => { if (e.target === folders || e.target === shelf) closeFolders(); });
  addEventListener('keydown', e => { if (e.key === 'Escape') { if (screen === 'viewer') closeViewer(); else if (screen === 'folders') closeFolders(); } });

  /* ---------- pointer ---------- */
  let mx = innerWidth / 2, my = innerHeight / 2, downX = 0, downY = 0, moved = false;
  // on the folders and viewer screens the avatar can be picked up and moved
  let dragAv = null;
  buddy.addEventListener('pointerdown', e => {
    if (!live || screen === 'map') return;
    buddy.setPointerCapture(e.pointerId); dragAv = { dx: e.clientX - ax, dy: e.clientY - ay, px: e.clientX, py: e.clientY }; buddy.style.cursor = 'grabbing'; e.preventDefault();
  });
  addEventListener('pointerup', () => { if (dragAv) { dragAv = null; buddy.style.cursor = ''; } });
  addEventListener('pointerdown', e => { downX = e.clientX; downY = e.clientY; moved = false; if (cursorOn && screen === 'map') G() && G().move(e.clientX, e.clientY); });
  addEventListener('pointermove', e => {
    if (dragAv) {
      vx = vx * .5 + (e.clientX - dragAv.px) * .5; vy = vy * .5 + (e.clientY - dragAv.py) * .5; dragAv.px = e.clientX; dragAv.py = e.clientY;
      ax = Math.min(W() - F * .4, Math.max(-F * .6, e.clientX - dragAv.dx)); ay = Math.min(H() - F * .4, Math.max(-F * .6, e.clientY - dragAv.dy));
    }
    mx = e.clientX; my = e.clientY;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) moved = true;
    if (cursorOn && screen === 'map' && G()) G().move(e.clientX, e.clientY);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { if (cursorOn && G()) G().stop(); });
  buddy.addEventListener('click', e => { e.stopPropagation(); if (!live) return skip(); if (moved) return; quietUntil = performance.now() + 1800; poke(); });
  cloud.addEventListener('click', e => { e.stopPropagation(); if (!live) return skip(); cloudClick(); if (screen === 'map') { quietUntil = performance.now() + 2200; naming = null; talk('About me is coming soon'); } });
  cloud.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') cloud.click(); });
  addEventListener('click', e => {
    if (moved) return;
    if (!live) return skip();
    if (screen === 'map' && !e.target.closest('.layer')) openRegionAt(e.clientX, e.clientY);
  });

  /* ---------- the avatar names the project under a resting cursor ---------- */
  let naming = null, quietUntil = 0;
  function nameProject() {
    if (!cursorOn || screen !== 'map' || !G() || performance.now() < quietUntil) { naming = null; return; }
    const over = document.elementFromPoint(mx, my); if (over && (over.closest('#cloud') || over.closest('#buddy'))) { if (naming) { naming = null; hush(); } return; }
    const { still, region } = G().info();
    if (still && region) { if (naming !== region) { naming = region; talk(LABEL[region] || region); } }
    else if (naming) { naming = null; hush(); }
  }

  addEventListener('resize', () => {
    measure();
    if (screen === 'map' && live) { [ax, ay] = P.corner(); clearZone(); }
    if (!live && !travel) [ax, ay] = P.center();
    [cx, cy] = screen === 'viewer' ? P.cardCloud() : P.cloud();
    if (screen === 'viewer' && current) { buildViewer(current); [ax, ay] = P.cardAv(); [cx, cy] = P.cardCloud(); }
    if (screen === 'folders') { [ax, ay] = P.folderAv(); placeFoldersClose(); }
  });

  /* ================= FRAME ================= */
  let nextBlink = performance.now() + 1800, blinkUntil = 0, last = performance.now();
  const cl = (v, m) => Math.max(-m, Math.min(m, v));
  function frame(now) {
    dt = Math.min(2.5, (now - last) / 16.67); last = now; const t = now / 1000, a = reduce ? 0 : 1;
    if (travel) travel(now); else { vx *= .8; vy *= .8; }
    buddy.style.transform = `translate(${ax}px, ${ay}px)`;
    cloud.style.transform = `translate(${cx}px, ${cy}px)`;
    if (bubble.classList.contains('in')) placeBubble();
    nameProject();

    // --- avatar ---
    const ph = t * Math.PI * 2 / 2.4, crying = state === 4 || state === 6;
    ch.body.y.t = a * Math.sin(ph) * 5 + (crying ? Math.sin(t * 22) * 1.6 : 0);
    const svx = vx / s / 2.7, svy = vy / s / 2.7;
    ch.body.r.t = cl(svx * .35, 9);
    const pose = POSE[state], wave = (state === 2 || state === 3) ? Math.sin(t * 11) : 0;
    ch.handL.y.t = pose.handL[1] + a * Math.sin(ph - .7) * 6 - cl(svy * 1.1, 40);
    ch.handR.y.t = pose.handR[1] + a * Math.sin(ph - 1.1) * 6 - cl(svy * 1.1, 40);
    ch.handL.x.t = pose.handL[0] - cl(svx * 1.2, 45); ch.handR.x.t = pose.handR[0] - cl(svx * 1.2, 45);
    ch.handL.r.t = -cl(svx * .9, 25) + (state === 2 ? wave * 14 : state === 5 ? Math.sin(t * 6) * 5 : a * Math.sin(ph - .7) * 3);
    ch.handR.r.t = -cl(svx * .9, 25) + (state === 3 ? -wave * 14 : a * Math.sin(ph - 1.1) * -3);
    ch.hairBack.r.t = -cl(svx * .5, 14) + a * Math.sin(ph - 1.4) * .8; ch.hairBack.y.t = -cl(svy * .25, 10);
    ch.hairL.r.t = -cl(svx * .8, 22) + a * Math.sin(ph - 1.6) * 1.5; ch.hairR.r.t = -cl(svx * .8, 22) - a * Math.sin(ph - 1.8) * 1.5;
    ch.hairL.y.t = ch.hairR.y.t = -cl(svy * .4, 14);
    ch.glasses.y.t = pose.glasses[1] + a * Math.sin(ph - .4) * 1.5 + cl(svy * .2, 6);
    ['glasses5', 'glasses6'].forEach(g => ch[g].y.t = a * Math.sin(ph - .4) * 1.5);
    const ex = (mx - (ax + F / 2)) / innerWidth, ey = (my - (ay + F * .47)) / innerHeight;
    ch.eyes.x.t = cl(ex * 30, 7); ch.eyes.y.t = cl(ey * 24, 5) + a * Math.sin(ph - .2);
    parts.forEach(p => step(ch[p]));
    if (now > nextBlink && (state === 1 || state === 2 || state === 3)) { blinkUntil = now + 130; nextBlink = now + 2200 + Math.random() * 3200; if (Math.random() < .2) nextBlink = now + 260; }
    const bl = now < blinkUntil ? .08 : 1;
    eyeKids.forEach(e => e.el.setAttribute('transform', `translate(${e.cx} ${e.cy}) scale(1 ${bl}) translate(${-e.cx} ${-e.cy})`));
    parts.forEach(p => apply(A[p], ch[p], PIV[p] || [262, 270]));
    const since = now - stateT;
    twinkles.forEach(o => {
      const on = (o.gk.startsWith('s2') && state === 2) || (o.gk.startsWith('s3') && state === 3) || (o.gk.startsWith('s5') && state === 5);
      const q = on ? Math.min(1, Math.max(0, (since - o.delay) / 260)) : 0;
      const pop = on ? (1 - Math.pow(1 - q, 3)) * (1 + .25 * Math.sin(q * Math.PI)) : 1;
      const tw = 1 + .15 * Math.sin(t * o.sp + o.ph), rot = o.flower ? t * 40 + o.ph * 30 : Math.sin(t * o.sp * .5 + o.ph) * 12;
      o.el.setAttribute('transform', `translate(${o.cx} ${o.cy}) rotate(${rot.toFixed(1)}) scale(${(pop * tw).toFixed(3)}) translate(${-o.cx} ${-o.cy})`);
    });
    drops.forEach(d => { const q = ((t * (d.six ? 1.1 : .8) + d.off) % 1); const yy = q * (d.six ? 30 : 46), sc = .7 + .3 * Math.sin(q * Math.PI);
      d.el.setAttribute('transform', `translate(0 ${yy.toFixed(1)}) translate(${d.cx} ${d.cy}) scale(${sc.toFixed(3)}) translate(${-d.cx} ${-d.cy})`);
      d.el.style.opacity = (q < .8 ? 1 : (1 - q) * 5).toFixed(2); });

    // --- cloud: slow float; the two small clouds drift past behind it and fade, over and over ---
    const cph = t * Math.PI * 2 / 6.5;
    cc.main.y.t = a * Math.sin(cph) * 7; cc.main.x.t = a * Math.sin(cph * .5) * 4; cc.main.r.t = a * Math.sin(cph + .6) * 1.2;
    [['back1', 0, 9, 150], ['back2', .5, 7.5, 120]].forEach(([p, off, period, dist]) => {
      const q = ((t / period) + off) % 1;
      const env = Math.sin(q * Math.PI);             // fade in, then out
      cc[p].x.x = cc[p].x.t = a * (dist * .5 - q * dist);
      cc[p].y.x = cc[p].y.t = a * Math.sin(q * Math.PI * 2) * 6;
      cc[p].o.x = cc[p].o.t = reduce ? 1 : env * .95;
      cc[p].s.x = cc[p].s.t = .85 + env * .15;
    });
    Object.keys(cc).forEach(p => { if (p !== 'back1' && p !== 'back2') step(cc[p]); });
    Object.keys(C).forEach(p => apply(C[p], cc[p], CPIV[p] || [270, 300]));
    const ct = (now - cloudClickT) / 1000;
    rings.forEach((r, i) => { const w = 1 + .06 * Math.sin(t * 5 + i), sc = ct < 2 ? Math.min(1, ct * 3 + 0) * w : w;
      r.el.setAttribute('transform', `translate(${r.cx} ${r.cy}) scale(${sc.toFixed(3)}) translate(${-r.cx} ${-r.cy})`); });
    cstars.forEach(o => { const sc = 1 + .2 * Math.sin(t * 4 + o.ph), rot = Math.sin(t * 2 + o.ph) * 15;
      o.el.setAttribute('transform', `translate(${o.cx} ${o.cy}) rotate(${rot.toFixed(1)}) scale(${sc.toFixed(3)}) translate(${-o.cx} ${-o.cy})`); });

    requestAnimationFrame(frame);
  }
  setState(1);
  requestAnimationFrame(frame);
  setTimeout(start, 250);
})();
