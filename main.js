/* Fortune Wheel with 100% drop (rigged winner), sounds, and modal */
(function () {
  'use strict';

  /** DOM refs */
  const canvas = document.getElementById('wheelCanvas');
  const container = document.getElementById('wheelContainer');
  const ctx = canvas.getContext('2d');
  const entriesInput = document.getElementById('entriesInput');
  const riggedInput = document.getElementById('riggedInput');
  const riggedHint = document.getElementById('riggedHint');
  const removeWinnerOnce = document.getElementById('removeWinnerOnce');
  const resultsList = document.getElementById('resultsList');
  const resultsCount = document.getElementById('resultsCount');
  const winnerDialog = document.getElementById('winnerDialog');
  const winnerNameEl = document.getElementById('winnerName');
  const removeOneBtn = document.getElementById('removeOneBtn');
  const removeAllBtn = document.getElementById('removeAllBtn');
  const spinBtn = document.getElementById('spinBtn');
  const sortBtn = document.getElementById('sortBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const clearResultsBtn = document.getElementById('clearResultsBtn');

  /** State */
  const state = {
    rotation: 0, // radians; positive is CCW
    isSpinning: false,
    entries: [],
    lastTickIndex: -1,
    anim: null,
  };

  /** Slice colors */
  const SLICE_COLORS = [
    '#f43f5e', // rose
    '#3b82f6', // blue
    '#f59e0b', // amber
    '#10b981', // emerald
  ];

  /** Text style */
  const FONT = '600 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu';

  /** WebAudio for tick + win sounds */
  const audio = createAudio();

  function createAudio() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const context = new AudioCtx();
    // Start suspended on some browsers; resume on first user gesture
    const resume = () => context.resume();
    document.addEventListener('pointerdown', resume, { once: true });
    document.addEventListener('keydown', resume, { once: true });

    function playTick() {
      const o = context.createOscillator();
      const g = context.createGain();
      o.type = 'square';
      o.frequency.value = 1000;
      g.gain.value = 0.05;
      o.connect(g).connect(context.destination);
      const t = context.currentTime;
      o.start(t);
      o.stop(t + 0.04);
      // quick decay
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    }

    function playWin() {
      const o = context.createOscillator();
      const g = context.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(880, context.currentTime);
      g.gain.value = 0.0001;
      o.connect(g).connect(context.destination);
      const t = context.currentTime;
      o.start(t);
      g.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      o.frequency.exponentialRampToValueAtTime(523.25, t + 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.stop(t + 0.72);
    }

    return { context, playTick, playWin };
  }

  /** Helpers */
  function parseEntries() {
    return entriesInput.value
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  function setEntries(list) {
    entriesInput.value = list.join('\n');
    state.entries = list.slice();
    draw();
    updateRiggedHint();
  }

  function updateRiggedHint() {
    const rigged = normalizeName(riggedInput.value);
    if (!rigged) { riggedHint.textContent = ''; return; }
    const matches = indicesOfName(state.entries, rigged);
    if (matches.length === 0) {
      riggedHint.textContent = 'Name not found in entries';
      riggedHint.style.color = '#ef4444';
    } else {
      riggedHint.textContent = `Will land on: ${state.entries[matches[0]]}`;
      riggedHint.style.color = '#16a34a';
    }
  }

  function normalizeName(s) { return s.trim().toLowerCase(); }
  function indicesOfName(list, normalized) {
    const idx = [];
    for (let i = 0; i < list.length; i++) {
      if (normalizeName(list[i]) === normalized) idx.push(i);
    }
    return idx;
  }

  function shuffle(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** Canvas sizing */
  function resizeCanvasToContainer() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    // keep it square
    const size = Math.min(w, h) * 0.96; // leave some padding for shadow
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    canvas.style.width = `${Math.floor(size)}px`;
    canvas.style.height = `${Math.floor(size)}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    draw();
  }

  /** Drawing */
  function draw() {
    const entries = state.entries.length > 0 ? state.entries : ['—'];
    const N = entries.length;
    const slice = (Math.PI * 2) / N;

    const size = parseFloat(canvas.style.width || '0');
    const cx = size / 2;
    const cy = size / 2;
    const r = (size / 2) * 0.94; // radius inside container

    const colorFor = (i) => SLICE_COLORS[i % SLICE_COLORS.length];

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer rim
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(state.rotation);

    // draw slices
    for (let i = 0; i < N; i++) {
      const start = i * slice;
      const end = start + slice;

      // sector
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, end);
      ctx.closePath();
      const grad = ctx.createLinearGradient(-r, -r, r, r);
      grad.addColorStop(0, shade(colorFor(i), -6));
      grad.addColorStop(1, shade(colorFor(i), 8));
      ctx.fillStyle = grad;
      ctx.fill();

      // separator line
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, start, start + 0.005);
      ctx.stroke();

      // text
      const label = String(entries[i]);
      ctx.save();
      ctx.fillStyle = '#111827';
      ctx.font = FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const angle = start + slice / 2;
      ctx.rotate(angle);
      const textRadius = r * 0.65;
      ctx.translate(textRadius, 0);
      ctx.rotate(Math.PI / 2);
      const truncated = truncateLabel(label, Math.floor(r / 8));
      // white outline for contrast
      strokeText(ctx, truncated, 0, 0, '#ffffff', 4);
      ctx.fillText(truncated, 0, 0);
      ctx.restore();
    }

    // inner circle
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }

  function strokeText(context, text, x, y, color, width) {
    context.save();
    context.lineJoin = 'round';
    context.miterLimit = 2;
    context.strokeStyle = color;
    context.lineWidth = width;
    context.strokeText(text, x, y);
    context.restore();
  }

  function shade(hex, percent) {
    // simple lighten/darken for hex #rrggbb
    const f = parseInt(hex.slice(1), 16);
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent) / 100;
    const R = f >> 16;
    const G = (f >> 8) & 0x00ff;
    const B = f & 0x0000ff;
    const newR = Math.round((t - R) * p) + R;
    const newG = Math.round((t - G) * p) + G;
    const newB = Math.round((t - B) * p) + B;
    return `#${(0x1000000 + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`;
  }

  function truncateLabel(s, maxChars) {
    if (s.length <= maxChars) return s;
    return s.slice(0, Math.max(0, maxChars - 1)) + '…';
  }

  /** Animation */
  function getIndexAtPointer(rotation, N) {
    const slice = (Math.PI * 2) / N;
    const norm = ((-rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return Math.floor(norm / slice) % N;
  }

  function spin() {
    const entries = parseEntries();
    if (entries.length === 0) return;
    setEntries(entries); // sync state

    if (state.isSpinning) return;
    state.isSpinning = true;

    const N = state.entries.length;
    const slice = (Math.PI * 2) / N;

    const rigged = normalizeName(riggedInput.value);
    let targetIndex = null;
    if (rigged) {
      const matches = indicesOfName(state.entries, rigged);
      if (matches.length > 0) {
        targetIndex = matches[(Math.random() * matches.length) | 0];
      }
    }

    // choose a random target angle within a slice
    let targetNormalizedAngle;
    if (targetIndex != null) {
      const jitter = (Math.random() * 0.6 - 0.3) * (slice * 0.6); // avoid borders
      targetNormalizedAngle = targetIndex * slice + slice / 2 + jitter;
    } else {
      targetNormalizedAngle = Math.random() * Math.PI * 2;
    }

    const spins = 6 + Math.floor(Math.random() * 4); // 6..9 spins
    const startRotation = state.rotation;
    const targetRotation = -targetNormalizedAngle - spins * Math.PI * 2;
    const duration = 5500 + Math.random() * 1200; // ms

    state.anim = {
      start: performance.now(),
      duration,
      from: startRotation,
      to: targetRotation,
      N,
      onDone: () => onSpinEnd(N),
    };
    state.lastTickIndex = getIndexAtPointer(startRotation, N);

    requestAnimationFrame(step);
  }

  function step(now) {
    if (!state.anim) return;
    const { start, duration, from, to, N, onDone } = state.anim;
    const t = Math.min(1, (now - start) / duration);
    const eased = easeOutCubic(t);
    const angle = from + (to - from) * eased;
    state.rotation = angle;

    // tick on slice boundary crossing
    const idx = getIndexAtPointer(angle, N);
    if (idx !== state.lastTickIndex) {
      audio.playTick();
      state.lastTickIndex = idx;
    }

    draw();
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      state.anim = null;
      onDone();
    }
  }

  function onSpinEnd(N) {
    const winnerIdx = getIndexAtPointer(state.rotation, N);
    const winner = state.entries[winnerIdx];

    audio.playWin();

    // Result log
    const li = document.createElement('li');
    li.textContent = winner;
    resultsList.prepend(li);
    resultsCount.textContent = String(resultsList.children.length);

    // Modal
    winnerNameEl.textContent = winner;
    if (typeof winnerDialog.showModal === 'function') {
      winnerDialog.showModal();
    } else {
      // Fallback: simple alert
      setTimeout(() => alert('Winner: ' + winner), 0);
    }

    // Optionally remove once
    if (removeWinnerOnce.checked) {
      removeOneOccurrence(winner);
    }

    state.isSpinning = false;
  }

  function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }

  function removeOneOccurrence(name) {
    const list = state.entries.slice();
    const idx = list.findIndex((v) => v === name);
    if (idx >= 0) {
      list.splice(idx, 1);
      setEntries(list);
    }
  }

  function removeAllOccurrences(name) {
    const list = state.entries.filter((v) => v !== name);
    setEntries(list);
  }

  /** UI events */
  window.addEventListener('resize', resizeCanvasToContainer);
  container.addEventListener('click', () => spin());
  spinBtn.addEventListener('click', () => spin());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      spin();
    }
  });

  sortBtn.addEventListener('click', () => {
    const list = parseEntries().sort((a, b) => a.localeCompare(b));
    setEntries(list);
  });

  shuffleBtn.addEventListener('click', () => {
    setEntries(shuffle(parseEntries()));
  });

  clearResultsBtn.addEventListener('click', () => {
    resultsList.innerHTML = '';
    resultsCount.textContent = '0';
  });

  entriesInput.addEventListener('input', () => {
    state.entries = parseEntries();
    draw();
    updateRiggedHint();
  });

  riggedInput.addEventListener('input', updateRiggedHint);

  removeOneBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const name = winnerNameEl.textContent || '';
    removeOneOccurrence(name);
    winnerDialog.close();
  });

  removeAllBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const name = winnerNameEl.textContent || '';
    removeAllOccurrences(name);
    winnerDialog.close();
  });

  // Initial content example (similar to screenshot)
  setEntries([
    'CS', 'CS', 'CS', 'Rakashu', 'KAJINKA', 'NEPORAZITELNY', 'CS', 'NIKOLKA', 'CS', 'Rakashu', 'SKULL'
  ]);

  resizeCanvasToContainer();
})();
